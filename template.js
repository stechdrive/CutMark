/**
 * CutMark - Photoshop UXP Plugin
 * 
 * Copyright (c) 2025 stechdrive
 * Released under the MIT license
 */

/**
 * template.js
 * ---------------------------------------------------------------------------
 * - 行 r (1-based) の CUT欄「内側ボックス(bounds)」を算出（boxPadding を適用）
 * - ラベル文字列の「サブ改行」整形（例: 012A → "012\rA"：Photoshop は CR 改行）
 *
 * 設計方針（DOM優先・ポイントテキスト中心配置）：
 *  - 配置は「ポイントテキスト」を DOM で生成し、段落中央揃え（DOM）＋
 *    見た目中心（boundsNoEffects の幾何中心）を CUT 行の中心に合わせる。
 *  - CUT 行に対する「上寄せ／左右余白」は boxPadding で表現（px）。
 *  - サブ改行は CR（\r）。LF（\n）はトーフの原因になるため採用しない。
 */
"use strict";

var stateMod = require("./state.js");

/**
 * アクティブテンプレートを取得するユーティリティ。
 * state.js の getActiveTemplate() を直接参照。
 */
function getActiveTemplate() {
  return stateMod.getActiveTemplate();
}

/**
 * 行数などの生値をテンプレから取得（安全化）
 */
function _rowsOf(t) {
  return (t && t.cutBox && typeof t.cutBox.rows === "number") ? t.cutBox.rows : 5;
}
function _padOf(t) {
  var p = (t && t.boxPadding) || {};
  return {
    top:    Number(p.top    || 0),
    right:  Number(p.right  || 0),
    bottom: Number(p.bottom || 0),
    left:   Number(p.left   || 0)
  };
}

/**
 * 行 r (1..rows) の「外側の行ボックス」（CUT欄の素の行矩形）を返す。
 * @param {number} r 1 以上 rows 以下の行番号（小数は四捨五入、範囲外はクランプ）
 * @returns {{left:number, top:number, right:number, bottom:number}}
 */
function rowRectOfRow(r) {
  var t = getActiveTemplate();
  var rows = _rowsOf(t);
  var row  = Math.round(r);
  if (row < 1) row = 1;
  if (row > rows) row = rows;

  var top    = t.cutBox.y + (row - 1) * t.cutBox.h;
  var left   = t.cutBox.x;
  var right  = t.cutBox.x + t.cutBox.w;
  var bottom = top + t.cutBox.h;

  return {
    left:   Math.round(left),
    top:    Math.round(top),
    right:  Math.round(right),
    bottom: Math.round(bottom)
  };
}

/**
 * 行 r (1..rows) の「内側ボックス」（padding を適用した矩形）を返す。
 * DOM のポイントテキストはこの矩形の幾何中心に合わせる運用が基本。
 * @param {number} r 1 以上 rows 以下の行番号（小数は四捨五入、範囲外はクランプ）
 * @returns {{left:number, top:number, right:number, bottom:number}}
 */
function innerBoundsOfRow(r) {
  var t = getActiveTemplate();
  var pad = _padOf(t);
  var base = rowRectOfRow(r);

  return {
    left:   Math.round(base.left   + pad.left),
    top:    Math.round(base.top    + pad.top),
    right:  Math.round(base.right  - pad.right),
    bottom: Math.round(base.bottom - pad.bottom)
  };
}

/**
 * 任意の bounds から幾何中心を返す（見た目中心合わせの基準に使用）
 * @param {{left:number, top:number, right:number, bottom:number}} b
 * @returns {{x:number, y:number}}
 */
function centerOfBounds(b) {
  return {
    x: Math.round((Number(b.left) + Number(b.right)) / 2),
    y: Math.round((Number(b.top)  + Number(b.bottom)) / 2)
  };
}

/**
 * 行 r の内側ボックス中心（= CUT 行の配置ターゲット）
 * @param {number} r
 * @returns {{x:number, y:number}}
 */
function centerOfRow(r) {
  return centerOfBounds(innerBoundsOfRow(r));
}

/**
 * 数字+サブ（A-Z）なら "数字\rA" に変換（Photoshop は CR 改行）。
 * @param {string} label 例: "012A" / "0123" / "012"
 * @returns {string} ex) "012\rA" または 元の label
 */
function labelWithOptionalBreak(label) {
  var t = getActiveTemplate();
  var txt = String(label || "");
  var br  = !!(t.text && t.text.breakSubToNextLine);

  if (!br) return txt;

  // 2〜4桁の数字+1文字の A〜Z のときだけ「CR 改行」を挿入
  var m = txt.match(/^(\d{2,4})([A-Z])$/);
  if (m) return m[1] + "\r" + m[2];

  return txt;
}

/* exports */
module.exports = {
  // 既存互換
  innerBoundsOfRow: innerBoundsOfRow,
  labelWithOptionalBreak: labelWithOptionalBreak,

  // 追加ヘルパー（将来拡張・テスト用）
  rowRectOfRow: rowRectOfRow,
  centerOfRow: centerOfRow,
  centerOfBounds: centerOfBounds,
  getActiveTemplate: getActiveTemplate
};
