/**
 * CutMark - Photoshop UXP Plugin
 * 
 * Copyright (c) 2025 stechdrive
 * Released under the MIT license
 */

/**
 * ps.js - Photoshop バインディング（UXP）
 * -----------------------------------------------------------------------------
 * 【整備版・DOM優先】
 * - ポイントテキスト生成：DOM（Document.createTextLayer）
 * - 段落の中央揃え：DOM（textItem.paragraphStyle.justification）
 * - 位置合わせ：DOM（boundsNoEffects を用いた “上端合わせ + 水平中央合わせ” or X/Y 中央合わせ → Layer.translate）
 * - レイヤースタイル（白フチ）/ 背景色：DOM 未対応のため AM (action.batchPlay)
 * - 選択境界取得／白矩形生成：AM
 * - ドキュメントの open / save / close：Open=DOM優先 / Save=DOM / Close=AM
 *
 * 方針（本モジュールの要点）：
 * - 背景色は **まず「生成されること」を最優先**（`make` 単発）。
 * - 重ね順は **DOM** で「テキスト直下」に移動（失敗は false 返却・処理継続）。
 *
 * 2025-11-09 追記（P0 互換層）：
 * - makePointTextTopAlignedInRectDOM / makePointTextCenteredInRectDOM：
 *   旧キー（`rect` / `label`）を受けても内部で `bounds` / `textKey` に正規化。
 * - applyWhiteStroke：
 *   旧シグネチャ（オブジェクト引数：{ targetLayerId, widthPx, colorRGB, opacity }）も受理し、
 *   新シグネチャ（位置引数）へ正規化。将来削除可能な軽い互換のみ。
 */
"use strict";

var appCore = require("photoshop");
var app = appCore.app;
var core = appCore.core;
var action = appCore.action;
var constants = appCore.constants;
const fsmod = require("uxp").storage.localFileSystem;

/* ============================================================================
 * ログ / 共通ユーティリティ
 * ==========================================================================*/


/** デバッグ判定（ui.js の window.CM_DEBUG を優先。無ければ localStorage を参照） */
function __cm_isDebug() {
  try {
    if (typeof window !== "undefined" && ("CM_DEBUG" in window)) return !!window.CM_DEBUG;
    var v = "";
    try {
      v = String(localStorage.getItem("cutmark_debug") || localStorage.getItem("cutmark.debug") || "").toLowerCase();
    } catch (_) { v = ""; }
    return (v === "1" || v === "true" || v === "on" || v === "yes");
  } catch (_) { return false; }
}

function debugLog(label, details) {
  try {
    if (!__cm_isDebug()) return;
    var msg = "[CutMark Debug]PS." + (label != null ? String(label) : "");
    if (details != null && details !== "") {
      try {
        if (typeof details === "string") msg += ": " + details;
        else msg += ": " + JSON.stringify(details);
      } catch (_) { /* ignore */ }
    }
    if (console && console.debug) console.debug(msg);
  } catch (_) { /* ignore */ }
}
function describeHandle(entry) {
  if (!entry) return "(null)";
  var parts = [];
  try { if (entry.isFolder) parts.push("folder"); } catch (_) { }
  try { if (entry.isFile) parts.push("file"); } catch (_) { }
  var path = "";
  try { path = entry.nativePath || entry.name || ""; } catch (err) { path = "(nativePath err: " + formatError(err) + ")"; }
  if (!path) path = "(no-path)"; parts.push(path);
  return parts.join(" ");
}
function formatError(e) {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (e && e.stack) return e.stack;
  if (e && e.message) return e.message;
  try { return JSON.stringify(e); }
  catch (_) { return String(e); }
}
function safeDocId() {
  try { return app.activeDocument && app.activeDocument._id; }
  catch (_) { return null; }
}

/** 1操作=1履歴のモーダルラッパ（opts 追加・後方互換） */
function withModal(name, fn, opts) {
  var o = Object.assign({ commandName: name }, opts || {});
  if (typeof o.timeOut !== "number" || o.timeOut <= 0) o.timeOut = 120000; // [MOD] ハング防止の既定タイムアウト
  return core.executeAsModal(fn, o);
}

/** 数値チェック（ActionDescriptor に undefined/NaN を混ぜない） */
function mustNumber(v, label) {
  var n = Number(v);
  if (!isFinite(n)) throw new Error((label || "value") + " is NaN");
  return n;
}

/** pt → px 変換（Photoshop: 1pt=1/72inch） */
function ptToPx(pt, dpi) {
  var n = Number(pt);
  var r = Number(dpi);
  if (!isFinite(n) || !isFinite(r) || r <= 0) return n;
  return Math.round((r / 72) * n);
}

/* ============================================================================
 * 互換層ユーティリティ（P0：軽い正規化）
 * ==========================================================================*/

/** applyWhiteStroke の旧シグネチャ互換（object or position args） */
function normalizeStrokeArgs(a, b, c, d) {
  // object-arg: { targetLayerId, widthPx, colorRGB, opacity }
  if (a && typeof a === "object" && !Array.isArray(a) && (a.targetLayerId != null || a.layerId != null)) {
    var layerId = a.targetLayerId != null ? a.targetLayerId : a.layerId;
    var widthPx = (typeof a.widthPx === "number") ? a.widthPx : (typeof a.sizePx === "number" ? a.sizePx : b);
    var color = Array.isArray(a.colorRGB) ? a.colorRGB : (Array.isArray(a.color) ? a.color : c);
    var op = (typeof a.opacity === "number") ? a.opacity : d;
    return [layerId, widthPx, color, op];
  }
  return [a, b, c, d];
}

/** makePointText* の旧キー互換 rect/label → bounds/textKey へ正規化 */
function normalizePlacementOptions(o) {
  if (!o || typeof o !== "object") return o;
  var out = Object.assign({}, o);
  if (!out.bounds && o.rect) {
    var r = o.rect;
    if (Array.isArray(r) && r.length >= 4) {
      out.bounds = { left: r[0], top: r[1], right: r[2], bottom: r[3] };
    } else if (typeof r === "object") {
      out.bounds = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }
  }
  if (!out.textKey && typeof o.label === "string") {
    out.textKey = o.label;
  }
  return out;
}

/** 再帰で ID 一致のレイヤーを検索 */
function _findLayerByIdIn(layers, id) {
  if (!layers) return null;
  for (var i = 0; i < layers.length; i++) {
    var ly = layers[i];
    try { if (ly && ly._id === id) return ly; } catch (_) { }
    if (ly && ly.layers && ly.layers.length) {
      var f = _findLayerByIdIn(ly.layers, id);
      if (f) return f;
    }
  }
  return null;
}
function findLayerById(id) {
  try {
    var d = app.activeDocument;
    if (!d) return null;
    return _findLayerByIdIn(d.layers, id);
  } catch (_) { return null; }
}

/* ============================================================================
 * レイヤースタイル：文字の「白フチ（Outside）」適用（AM）
 * ==========================================================================*/

async function applyWhiteStroke(layerId, sizePx, colorRGB, opacity) {
  // --- P0 互換：オブジェクト引数 → 位置引数へ正規化 ---
  var args = normalizeStrokeArgs(layerId, sizePx, colorRGB, opacity);
  layerId = args[0]; sizePx = args[1]; colorRGB = args[2]; opacity = args[3];

  // セーフガード（ID が無ければ何もしない）
  if (layerId == null) return;

  var sz = (typeof sizePx === "number") ? sizePx : 2;
  if (sz <= 0) return; // 0以下は付加しない
  var col = (colorRGB && colorRGB.length >= 3) ? colorRGB : [255, 255, 255];
  var op = (typeof opacity === "number") ? opacity : 100;

  await action.batchPlay([{
    _obj: "set",
    _target: [{ _ref: "layer", _id: layerId }],
    to: {
      _obj: "layer",
      layerEffects: {
        _obj: "layerEffects",
        frameFX: {
          _obj: "frameFX",
          enabled: true, present: true, showInDialog: true,
          style: { _enum: "frameStyle", _value: "outsetFrame" },   // Outside
          paintType: { _enum: "frameFill", _value: "solidColor" },
          color: { _obj: "RGBColor", red: col[0], green: col[1], blue: col[2] },
          opacity: { _unit: "percentUnit", _value: op },
          size: { _unit: "pixelsUnit", _value: sz },
          blendMode: { _enum: "blendMode", _value: "normal" }
        }
      }
    }
  }], { synchronousExecution: true });
}

/* ============================================================================
 * DOM：ポイントテキスト生成 → 段落中央揃え → “上端合わせ + 水平中央合わせ”
 * ==========================================================================*/

async function makePointTextTopAlignedInRectDOM(o) {
  // --- P0 互換：rect/label → bounds/textKey に正規化 ---
  o = normalizePlacementOptions(o);

  const doc = app.activeDocument;
  if (!doc) throw new Error("アクティブなドキュメントが見つかりません。");

  const cx = Math.round((mustNumber(o.bounds.left, "bounds.left") + mustNumber(o.bounds.right, "bounds.right")) / 2);
  const ty = Math.round(mustNumber(o.bounds.top, "bounds.top"));

  const sizePx = Math.max(1, Math.round(ptToPx((typeof o.sizePt === "number" ? o.sizePt : 12), doc.resolution)));

  const layer = await doc.createTextLayer({
    name: String(o.textKey || "CUT_TEXT"),
    contents: String(o.textKey || ""),
    fontName: o.fontPSName || "ArialMT",
    fontSize: sizePx,
    position: { x: cx, y: ty }
  });

  const ti = layer.textItem;
  try { ti.paragraphStyle.justification = constants.Justification.CENTER; } catch (_) { }

  try {
    if (o.fontPSName) ti.characterStyle.font = o.fontPSName;
    ti.characterStyle.size = sizePx;

    if (Array.isArray(o.colorRGB) && o.colorRGB.length >= 3) {
      try {
        const SolidColor = app.SolidColor, RGBColor = app.RGBColor;
        const sc = new SolidColor();
        const col = new RGBColor();
        col.red = o.colorRGB[0]; col.green = o.colorRGB[1]; col.blue = o.colorRGB[2];
        sc.rgb = col;
        ti.characterStyle.color = sc;
      } catch (_) { }
    }
    if (typeof o.tracking === "number") ti.characterStyle.tracking = o.tracking;
    if (o.noBreak) ti.characterStyle.noBreak = true;

    if (typeof o.leadingPercent === "number" && o.leadingPercent > 0) {
      ti.characterStyle.useAutoLeading = false;
      ti.characterStyle.leading = Math.round(sizePx * (o.leadingPercent / 100));
    } else {
      ti.characterStyle.useAutoLeading = true;
    }
    if (typeof o.hyphenate === "boolean") {
      try { ti.paragraphStyle.hyphenation = !!o.hyphenate; } catch (_) { }
    }
  } catch (_) { }

  // 幾何を取得して “上端合わせ + 水平中央合わせ”
  let b = null;
  try {
    const bb = layer.boundsNoEffects || layer.bounds;
    b = { left: Math.round(bb.left), top: Math.round(bb.top), right: Math.round(bb.right), bottom: Math.round(bb.bottom) };
  } catch (_) {
    b = await getLayerBoundsNoFX(layer._id);
  }

  const lx = Math.round((b.left + b.right) / 2);
  const dx = cx - lx;
  const dy = ty - Math.round(b.top);

  if (dx || dy) { try { await layer.translate(dx, dy); } catch (e) { debugLog("translate-failed", formatError(e)); } }

  // 白フチ適用（AM）— 互換のためオプションに stroke* があれば尊重（UI 側からは別呼び出しが基本）
  const strokeSize = (typeof o.strokePx === "number") ? o.strokePx : 2;
  const strokeCol = (o.strokeRGB && o.strokeRGB.length >= 3) ? o.strokeRGB : [255, 255, 255];
  if (strokeSize > 0) { await applyWhiteStroke(layer._id, strokeSize, strokeCol, 100); }

  return layer._id;
}

/* ============================================================================
 * DOM：ポイントテキスト生成 → 段落中央 → “矩形中心に X/Y センタリング”
 *   （選択範囲の中心に配置するための API）
 * ==========================================================================*/

async function makePointTextCenteredInRectDOM(o) {
  // --- P0 互換：rect/label → bounds/textKey に正規化 ---
  o = normalizePlacementOptions(o);

  const doc = app.activeDocument;
  if (!doc) throw new Error("アクティブなドキュメントが見つかりません。");

  const cx = Math.round((mustNumber(o.bounds.left, "bounds.left") + mustNumber(o.bounds.right, "bounds.right")) / 2);
  const cy = Math.round((mustNumber(o.bounds.top, "bounds.top") + mustNumber(o.bounds.bottom, "bounds.bottom")) / 2);

  const sizePx = Math.max(1, Math.round(ptToPx((typeof o.sizePt === "number" ? o.sizePt : 12), doc.resolution)));

  // 生成位置は概ね中心に置き、後段で boundsNoEffects 実測で厳密に合わせる
  const layer = await doc.createTextLayer({
    name: String(o.textKey || "CUT_TEXT"),
    contents: String(o.textKey || ""),
    fontName: o.fontPSName || "ArialMT",
    fontSize: sizePx,
    position: { x: cx, y: cy }
  });

  const ti = layer.textItem;
  try { ti.paragraphStyle.justification = constants.Justification.CENTER; } catch (_) { }

  try {
    if (o.fontPSName) ti.characterStyle.font = o.fontPSName;
    ti.characterStyle.size = sizePx;

    if (Array.isArray(o.colorRGB) && o.colorRGB.length >= 3) {
      try {
        const SolidColor = app.SolidColor, RGBColor = app.RGBColor;
        const sc = new SolidColor();
        const col = new RGBColor();
        col.red = o.colorRGB[0]; col.green = o.colorRGB[1]; col.blue = o.colorRGB[2];
        sc.rgb = col;
        ti.characterStyle.color = sc;
      } catch (_) { }
    }
    if (typeof o.tracking === "number") ti.characterStyle.tracking = o.tracking;
    if (o.noBreak) ti.characterStyle.noBreak = true;

    if (typeof o.leadingPercent === "number" && o.leadingPercent > 0) {
      ti.characterStyle.useAutoLeading = false;
      ti.characterStyle.leading = Math.round(sizePx * (o.leadingPercent / 100));
    } else {
      ti.characterStyle.useAutoLeading = true;
    }
    if (typeof o.hyphenate === "boolean") {
      try { ti.paragraphStyle.hyphenation = !!o.hyphenate; } catch (_) { }
    }
  } catch (_) { }

  // 幾何を取得して “矩形中心(X/Y)合わせ”
  let b = null;
  try {
    const bb = layer.boundsNoEffects || layer.bounds;
    b = { left: Math.round(bb.left), top: Math.round(bb.top), right: Math.round(bb.right), bottom: Math.round(bb.bottom) };
  } catch (_) {
    b = await getLayerBoundsNoFX(layer._id);
  }

  const lcx = Math.round((b.left + b.right) / 2);
  const lcy = Math.round((b.top + b.bottom) / 2);
  const dx = cx - lcx;
  const dy = cy - lcy;

  if (dx || dy) { try { await layer.translate(dx, dy); } catch (e) { debugLog("translate-failed", formatError(e)); } }

  // 白フチ適用（AM）
  const strokeSize = (typeof o.strokePx === "number") ? o.strokePx : 2;
  const strokeCol = (o.strokeRGB && o.strokeRGB.length >= 3) ? o.strokeRGB : [255, 255, 255];
  if (strokeSize > 0) { await applyWhiteStroke(layer._id, strokeSize, strokeCol, 100); }

  return layer._id;
}

/* ============================================================================
 * （互換ラッパー）段落テキスト（box）生成 API
 * ==========================================================================*/

async function makeParagraphTextInBounds(o) {
  const proxy = {
    bounds: {
      left: mustNumber(o.bounds.left, "bounds.left"),
      top: mustNumber(o.bounds.top, "bounds.top"),
      right: mustNumber(o.bounds.right, "bounds.right"),
      bottom: mustNumber(o.bounds.bottom, "bounds.bottom")
    },
    textKey: String(o.textKey || ""),
    fontPSName: o.fontPSName || "ArialMT",
    sizePt: (typeof o.sizePt === "number") ? o.sizePt : 12,
    colorRGB: (Array.isArray(o.colorRGB) && o.colorRGB.length >= 3) ? o.colorRGB.slice(0, 3) : [0, 0, 0],
    tracking: (typeof o.tracking === "number") ? o.tracking : 0,
    hyphenate: !!o.hyphenate,
    noBreak: !!o.noBreak,
    leadingPercent: (typeof o.leadingPercent === "number") ? o.leadingPercent : 100,
    strokePx: (typeof o.strokePx === "number") ? o.strokePx : 2,
    strokeRGB: (Array.isArray(o.strokeRGB) && o.strokeRGB.length >= 3) ? o.strokeRGB.slice(0, 3) : [255, 255, 255]
  };
  return await makePointTextTopAlignedInRectDOM(proxy);
}

/* ============================================================================
 * ジオメトリの取得（AM）
 * ==========================================================================*/

async function getLayerBoundsNoFX(layerId) {
  var r = await action.batchPlay([{
    _obj: "get",
    _target: [{ _ref: "layer", _id: layerId }],
    _options: { dialogOptions: "dontDisplay" }
  }], { synchronousExecution: true });

  var b = r[0] && (r[0].boundsNoEffects || r[0].bounds);
  if (!b) throw new Error("レイヤーの範囲情報を取得できませんでした");

  var out = {
    left: Math.round(b.left._value),
    top: Math.round(b.top._value),
    right: Math.round(b.right._value),
    bottom: Math.round(b.bottom._value),
    width: Math.round(b.right._value - b.left._value),
    height: Math.round(b.bottom._value - b.top._value)
  };
  if (out.width <= 0 || out.height <= 0) {
    throw new Error("テキストのサイズが無効(0px)です。フォントサイズや改行を確認してください。");
  }
  return out;
}

/* ============================================================================
 * 背景色（contentLayer）を生成（角丸なし／矩形のみ / AM）
 *   — 生成優先：`make` 単発。`in`/`at`/`select`/`set` は最小限 —
 * ==========================================================================*/

async function makeWhiteUnderTextBounds(layerId, paddingPx, colorRGB) {
  const t0 = Date.now();

  // ドキュメント概況（ログ用）
  let docInfo = {};
  try {
    const d = app.activeDocument;
    docInfo = {
      id: (d && d._id) || safeDocId() || null,
      resolution: (d && d.resolution) || null
    };
  } catch (_) { }

  // 1) 幾何取得＆pad正規化
  var b = await getLayerBoundsNoFX(layerId);
  var pad = Number(paddingPx);
  if (isNaN(pad) || pad < 0) pad = 0;

  if (b.width <= 0 || b.height <= 0) {
    throw new Error("背景矩形を作成できません（テキストの範囲情報が無効）。");
  }

  var left = Math.floor(b.left - pad);
  var top = Math.floor(b.top - pad);
  var right = Math.ceil(b.right + pad);
  var bottom = Math.ceil(b.bottom + pad);

  var col = (colorRGB && colorRGB.length >= 3) ? colorRGB : [255, 255, 255];

  // デバッグ：投入パラメータ要約
  debugLog("bg-make/params", JSON.stringify({
    doc: docInfo,
    targetLayerId: layerId,
    textBounds: b,
    pad: pad,
    shape: { kind: "rectangle", top: top, left: left, right: right, bottom: bottom },
    colorRGB: col
  }));

  // 2) 生成：`make` 単発
  const descMake = {
    _obj: "make",
    _target: [{ _ref: "contentLayer" }],
    using: {
      _obj: "contentLayer",
      name: "CUT_BG",
      type: { _obj: "solidColorLayer", color: { _obj: "RGBColor", red: col[0], green: col[1], blue: col[2] } },
      shape: {
        _obj: "rectangle",
        top: { _unit: "pixelsUnit", _value: top },
        left: { _unit: "pixelsUnit", _value: left },
        bottom: { _unit: "pixelsUnit", _value: bottom },
        right: { _unit: "pixelsUnit", _value: right }
      }
    },
    _options: { dialogOptions: "dontDisplay" }
  };

  debugLog("bg-make/request", JSON.stringify({ keys: Object.keys(descMake.using), shape: "rectangle" }));

  const res = await action.batchPlay([descMake], { synchronousExecution: true });

  // 3) エラーレコード検出
  if (Array.isArray(res)) {
    const err = res.find(r => r && r._obj === "error");
    if (err) {
      debugLog("bg-make/error", JSON.stringify({ message: err.message || "Action Manager error", err: err }));
      throw new Error(err.message || "Action Manager error");
    }
  }

  // 4) 新規レイヤID（make の戻りから）
  let newId = null;
  try {
    const m0 = res && res[0] || {};
    newId = m0.resultLayerId || m0.layerID || m0.layerId || null;
    debugLog("bg-make/make-only", JSON.stringify({
      resultKeys: Object.keys(m0 || {}),
      resultLayerId: newId
    }));
  } catch (_) { }

  // 取得できない環境向けの保険（副作用最小化のため 1 回だけ）
  if (!newId) {
    try {
      const r2 = await action.batchPlay([{
        _obj: "get",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        _options: { dialogOptions: "dontDisplay" }
      }], { synchronousExecution: true });
      const g0 = r2 && r2[0] || {};
      const gid = g0.layerID || g0.layerId || null;
      debugLog("bg-make/get-target", JSON.stringify({ keys: Object.keys(g0 || {}), layerId: gid }));
      if (gid) newId = gid;
    } catch (_) { }
  }

  debugLog("bg-make/done", JSON.stringify({ newId: newId, ms: (Date.now() - t0) }));
  if (!newId) throw new Error("背景レイヤーの生成に失敗しました。");

  return newId; // ← ID を返す
}

/* ============================================================================
 * 重ね順（DOM）：背景レイヤーを対象テキストの「直下」に移動
 * ==========================================================================*/
async function moveLayerBelowDOM(layerId, belowId) {
  const t0 = Date.now();
  try {
    const moving = findLayerById(layerId);
    const below = findLayerById(belowId);
    if (!moving || !below) {
      debugLog("bg-reorder/missing", JSON.stringify({ moving: !!moving, below: !!below }));
      return false;
    }

    debugLog("bg-reorder/start", JSON.stringify({ moving: layerId, below: belowId }));
    if (typeof moving.moveBelow === "function") {
      await moving.moveBelow(below);
      debugLog("bg-reorder/done", JSON.stringify({ ms: (Date.now() - t0) }));
      return true;
    }

    try {
      if (typeof moving.move === "function" && constants && constants.ElementPlacement && constants.ElementPlacement.placeAfter) {
        await moving.move(below, constants.ElementPlacement.placeAfter);
        debugLog("bg-reorder/done-fallback", JSON.stringify({ ms: (Date.now() - t0) }));
        return true;
      }
    } catch (e) {
      debugLog("bg-reorder/fallback-error", formatError(e));
    }

    debugLog("bg-reorder/unsupported", "no moveBelow/move API");
    return false;

  } catch (e) {
    debugLog("bg-reorder/error", formatError(e));
    return false;
  }
}

/* ============================================================================
 * 選択境界の取得（DOM）／任意白塗り（AM）
 * ==========================================================================*/

/**
 * 選択範囲の bounds を {left,top,right,bottom} の number に正規化して返す。
 * - UXP DOM v2: Bounds オブジェクト {left,top,right,bottom}
 * - 旧来/一部環境: 配列 [left, top, right, bottom]
 * どちらにも対応し、単位オブジェクト（{_value} / {value}) も吸収する。
 */
async function getSelectionBounds() {
  const d = app.activeDocument;
  const sel = d && d.selection;
  if (!sel || sel.bounds == null) throw new Error("矩形選択がありません。");

  const b = sel.bounds;
  const toNum = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return Math.round(v);
    if (typeof v === "object") {
      if ("_value" in v) return Math.round(v._value);
      if ("value" in v) return Math.round(v.value);
      if (typeof v.as === "function") { try { return Math.round(v.as("px")); } catch (_) { } }
    }
    const n = Number(v);
    return (isFinite(n) ? Math.round(n) : null);
  };

  let left = null, top = null, right = null, bottom = null;

  if (Array.isArray(b) && b.length >= 4) {
    left = toNum(b[0]); top = toNum(b[1]);
    right = toNum(b[2]); bottom = toNum(b[3]);
  } else if (typeof b === "object" && "left" in b && "top" in b && "right" in b && "bottom" in b) {
    left = toNum(b.left); top = toNum(b.top);
    right = toNum(b.right); bottom = toNum(b.bottom);
  } else {
    throw new Error("選択範囲の情報を正しく読み取れませんでした。");
  }

  if ([left, top, right, bottom].some(v => v == null || !isFinite(v))) {
    throw new Error("選択範囲の情報が無効です。");
  }
  return { left, top, right, bottom };
}

/**
 * 任意 bounds の白矩形（contentLayer）を生成し、新規レイヤー ID を返す。
 * 既定は 100% 不透明。`name` は省略可。
 * 注意：過去に「resultLayerId が返らず targetEnum にフォールバックしないと既存レイヤーを誤操作する」
 *       という事例が発生した（NOTES 1.24）。ここで必ず ID を補足し、取れなければ明示エラーにする。
 *       背景生成は配置の根幹なので、レビューで削除しないよう [MOD] コメントを残す。
 */
async function makeWhiteRect(bounds, colorRGB, opacity, name) {
  var col = (colorRGB && colorRGB.length >= 3) ? colorRGB : [255, 255, 255];
  var op = (typeof opacity === "number") ? opacity : 100;
  var nm = name || "MASK_WHITE";

  // 1) make のみ先に発行して ID を確実に取得
  const res = await action.batchPlay([{
    _obj: "make",
    _target: [{ _ref: "contentLayer" }],
    at: { _ref: "layer", _enum: "ordinal", _value: "front" },
    using: {
      _obj: "contentLayer",
      name: nm,
      type: { _obj: "solidColorLayer", color: { _obj: "RGBColor", red: col[0], green: col[1], blue: col[2] } },
      shape: {
        _obj: "rectangle",
        top: { _unit: "pixelsUnit", _value: mustNumber(bounds.top, "top") },
        left: { _unit: "pixelsUnit", _value: mustNumber(bounds.left, "left") },
        bottom: { _unit: "pixelsUnit", _value: mustNumber(bounds.bottom, "bottom") },
        right: { _unit: "pixelsUnit", _value: mustNumber(bounds.right, "right") }
      }
    },
    _options: { dialogOptions: "dontDisplay" }
  }], { synchronousExecution: true });

  let newId = null;
  try {
    const r0 = res && res[0] || {};
    newId = r0.resultLayerId || r0.layerID || r0.layerId || null;
  } catch (_) { }

  // [MOD] フォールバック：targetEnum から取得（UXP 環境で resultLayerId が欠損する事例に対応）
  //       → ここを削ると過去に「背景が作られず既存レイヤーを動かす」デグレが再発したため、必須。
  if (!newId) {
    try {
      const r2 = await action.batchPlay([{
        _obj: "get",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        _options: { dialogOptions: "dontDisplay" }
      }], { synchronousExecution: true });
      const g0 = r2 && r2[0] || {};
      newId = g0.layerID || g0.layerId || null;
    } catch (_) { }
  }
  if (!newId) throw new Error("背景レイヤーの生成に失敗しました。");

  // 2) 不透明度の設定（必要な場合のみ）
  if (op !== 100) {
    await action.batchPlay([{
      _obj: "set",
      _target: [{ _ref: "layer", _id: newId }],
      to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: op } }
    }], { synchronousExecution: true });
  }

  return newId;
}

/* ============================================================================
 * ドキュメント I/O
 * ==========================================================================*/

/**
 * 追加出力（JPG/PNG）を保存するユーティリティ。
 * - 呼び出し元で withModal 内にいることを前提とし、ここではモーダルを張らない。
 * - JPG は品質 80 相当（quality=10）、PNG は圧縮 6 / 非インターレース。
 */
async function saveDocumentAsExtraRaster(outFileEntry, format, jpegQualityRaw) {
  const doc = app.activeDocument;
  if (!doc) throw new Error("追加出力の対象ドキュメントが見つかりません。");

  const fmt = (typeof format === "string") ? format.toLowerCase() : "";
  if (fmt !== "jpg" && fmt !== "jpeg" && fmt !== "png") {
    throw new Error("指定された形式(JPG/PNG)以外は保存できません。");
  }

  // JPEG の quality は 0..12 スケール。UI 要件「80」に合わせて既定値 10 を使用する。
  let jpegQuality = (typeof jpegQualityRaw === "number" && isFinite(jpegQualityRaw)) ? jpegQualityRaw : 10;
  if (jpegQuality < 0) jpegQuality = 0;
  if (jpegQuality > 12) jpegQuality = 12;
  jpegQuality = Math.round(jpegQuality);

  if (fmt === "png") {
    const pngOptions = { compression: 6, interlaced: false };
    await doc.saveAs.png(outFileEntry, pngOptions, true);
    debugLog("saveDocumentAsExtraRaster/png", describeHandle(outFileEntry));
  } else {
    const jpegOptions = { quality: jpegQuality, embedColorProfile: true };
    await doc.saveAs.jpg(outFileEntry, jpegOptions, true);
    debugLog("saveDocumentAsExtraRaster/jpg", describeHandle(outFileEntry));
  }
}

async function openDocument(fileEntry) {
  return withModal("Open", async function () {
    try {
      await app.open(fileEntry); // DOM
    } catch (err) {
      var np = fileEntry && fileEntry.nativePath;
      if (!np) throw err;
      await action.batchPlay([{
        _obj: "open",
        target: { _path: np, _kind: "local" },
        _options: { dialogOptions: "dontDisplay" }
      }], { synchronousExecution: true });
    }
  });
}

async function saveActiveDocAsPSD(outFileEntry) {
  const handleDesc = describeHandle(outFileEntry);
  debugLog("saveActiveDocAsPSD/start", handleDesc);

  const doc = app.activeDocument;
  if (!doc) throw new Error("保存するドキュメントが開かれていません。");

  const saveOptions = {
    layers: true,
    embedColorProfile: true,
    maximizeCompatibility: false
  };

  await withModal("Save as PSD", async function () {
    try {
      await doc.saveAs.psd(outFileEntry, saveOptions, true); // asCopy=true
      debugLog("saveActiveDocAsPSD/done", handleDesc);
    } catch (err) {
      debugLog("saveActiveDocAsPSD/error", formatError(err));
      throw err;
    }
  });
}


/** 新規：保存（PSD asCopy=true）＋クローズを単一モーダルで原子的に実行 */
async function saveAndCloseActiveDocAsPSD(outFileEntry) {
  const handleDesc = describeHandle(outFileEntry);
  debugLog("saveAndCloseActiveDocAsPSD/start", handleDesc);

  const doc = app.activeDocument;
  if (!doc) throw new Error("保存するドキュメントが開かれていません。");

  const saveOptions = {
    layers: true,
    embedColorProfile: true,
    maximizeCompatibility: false
  };

  await withModal("Save+Close PSD", async function () {
    try {
      await doc.saveAs.psd(outFileEntry, saveOptions, true); // asCopy=true
      debugLog("saveAndCloseActiveDocAsPSD/saved", handleDesc);
    } catch (err) {
      debugLog("saveAndCloseActiveDocAsPSD/save-error", formatError(err));
      throw err;
    }

    // Close without prompt (AM)
    await action.batchPlay([{
      _obj: "close",
      saving: { _enum: "yesNo", _value: "no" },
      _options: { dialogOptions: "dontDisplay" }
    }], { synchronousExecution: true });

    debugLog("saveAndCloseActiveDocAsPSD/closed", handleDesc);
  });
}

/** 新規：DOM の save() を優先しつつクローズまでを 1 モーダルで実行 */
async function saveAndCloseActiveDoc() {
  let extraOutFileEntry = null;
  let extraFormatRaw = "";
  let extraJpegQuality = null;

  // [MOD] 後方互換のため options を任意で受け取り、追加出力に流用する
  if (arguments && arguments.length && arguments[0] && typeof arguments[0] === "object") {
    const opt = arguments[0];
    extraOutFileEntry = opt.extraOutFileEntry || null;
    extraFormatRaw = opt.extraFormat || "";
    extraJpegQuality = opt.jpegQuality;
  }

  await withModal("Save+Close", async function () {
    const d = app.activeDocument;
    if (!d) throw new Error("アクティブなドキュメントが見つかりません。");

    const fmt = (typeof extraFormatRaw === "string") ? extraFormatRaw.toLowerCase() : "";
    const hasExtra = !!(extraOutFileEntry && (fmt === "jpg" || fmt === "jpeg" || fmt === "png"));

    if (typeof d.save === "function") {
      try {
        await d.save();
        debugLog("saveAndCloseActiveDoc/saved", safeDocId());
      } catch (err) {
        debugLog("saveAndCloseActiveDoc/save-error", formatError(err));
        throw err;
      }
    } else {
      throw new Error("このバージョンの Photoshop で DOM save() が利用できません。");
    }

    // 追加出力（任意）。PSD は既に保存済みのため失敗時は警告のみ。
    if (hasExtra) {
      try {
        await saveDocumentAsExtraRaster(extraOutFileEntry, fmt, extraJpegQuality);
      } catch (extraErr) {
        debugLog("saveAndCloseActiveDoc/extra-error", formatError(extraErr));
      }
    }

    await action.batchPlay([{
      _obj: "close",
      saving: { _enum: "yesNo", _value: "no" },
      _options: { dialogOptions: "dontDisplay" }
    }], { synchronousExecution: true });

    debugLog("saveAndCloseActiveDoc/closed", safeDocId());
  });
}

/** PSD 保存に加えて JPG/PNG の追加出力を 1 モーダル内で行い、その後クローズする */
async function saveAndCloseActiveDocAsPSDWithExtra(options) {
  const psdOutFileEntry = options && options.psdOutFileEntry;
  const extraOutFileEntry = options && options.extraOutFileEntry;
  const extraFormatRaw = options && options.extraFormat;
  const jpegQualityRaw = options && options.jpegQuality;

  const handleDescMain = describeHandle(psdOutFileEntry);
  const handleDescExtra = describeHandle(extraOutFileEntry);

  debugLog("saveAndCloseActiveDocAsPSDWithExtra/start", {
    psd: handleDescMain,
    extra: handleDescExtra,
    format: extraFormatRaw
  });

  const doc = app.activeDocument;
  if (!doc) throw new Error("保存するドキュメントが開かれていません。");

  const psdSaveOptions = {
    layers: true,
    embedColorProfile: true,
    maximizeCompatibility: false
  };

  const fmt = (typeof extraFormatRaw === "string") ? extraFormatRaw.toLowerCase() : "";
  const hasExtra = !!(extraOutFileEntry && (fmt === "jpg" || fmt === "jpeg" || fmt === "png"));

  // JPEG の quality は 0..12 スケール。UI 要件「80」に合わせて既定値 10 を使用する。
  let jpegQuality = (typeof jpegQualityRaw === "number" && isFinite(jpegQualityRaw)) ? jpegQualityRaw : 10;
  if (jpegQuality < 0) jpegQuality = 0;
  if (jpegQuality > 12) jpegQuality = 12;
  jpegQuality = Math.round(jpegQuality);

  await withModal("Save+Close PSD+Extra", async function () {
    // 1) 追加出力（JPG/PNG）? PSD 保存前に実行し、失敗時は PSD を継続。
    if (hasExtra) {
      try {
        await saveDocumentAsExtraRaster(extraOutFileEntry, fmt, jpegQuality);
      } catch (errExtra) {
        debugLog("saveAndCloseActiveDocAsPSDWithExtra/extra-error", formatError(errExtra));
        // [MOD] 履歴でも PSD 保存を優先するため、追加出力失敗は警告に留める
      }
    }

    // 2) PSD 保存
    try {
      await doc.saveAs.psd(psdOutFileEntry, psdSaveOptions, true); // asCopy=true
      debugLog("saveAndCloseActiveDocAsPSDWithExtra/saved-psd", handleDescMain);
    } catch (errPsd) {
      debugLog("saveAndCloseActiveDocAsPSDWithExtra/save-psd-error", formatError(errPsd));
      throw errPsd;
    }

    // 3) クローズ（AM）
    await action.batchPlay([{
      _obj: "close",
      saving: { _enum: "yesNo", _value: "no" },
      _options: { dialogOptions: "dontDisplay" }
    }], { synchronousExecution: true });

    debugLog("saveAndCloseActiveDocAsPSDWithExtra/closed", handleDescMain);
  });
}

async function closeActiveDocNoPrompt() {
  return withModal("Close", async function () {
    await action.batchPlay([{
      _obj: "close",
      saving: { _enum: "yesNo", _value: "no" }
    }], { synchronousExecution: true });
  });
}

/* ============================================================================
 * 既存番号の走査（現仕様では UI からは呼ばない）
 * ==========================================================================*/

async function scanUsedLabels() {
  var doc = app.activeDocument;
  var used = new Set();
  var bases = [];

  function walk(layers) {
    for (var i = 0; i < layers.length; i++) {
      var ly = layers[i];
      if (ly.layers && ly.layers.length) walk(ly.layers);
      var nm = ly.name || "";
      var m = nm.match(/^(\d{2,4})([A-Z]?)$/);
      if (m) {
        used.add(nm);
        bases.push(parseInt(m[1], 10));
      }
    }
  }
  walk(doc.layers);

  var maxBase = bases.length ? Math.max.apply(Math, bases) : 0;
  return { used: used, maxBase: maxBase };
}

/* ============================================================================
 * exports
 * ==========================================================================*/
module.exports = {
  withModal: withModal,
  mustNumber: mustNumber,

  // DOM 生成/配置（上寄せ + 水平中央）／矩形中心X/Y合わせ
  makePointTextTopAlignedInRectDOM: makePointTextTopAlignedInRectDOM,
  makePointTextCenteredInRectDOM: makePointTextCenteredInRectDOM,

  // 旧名互換（内部は DOM 実装）
  makeParagraphTextInBounds: makeParagraphTextInBounds,

  // レイヤースタイル/背景色
  applyWhiteStroke: applyWhiteStroke,
  getLayerBoundsNoFX: getLayerBoundsNoFX,
  makeWhiteUnderTextBounds: makeWhiteUnderTextBounds,

  // 重ね順（DOM）
  moveLayerBelowDOM: moveLayerBelowDOM,

  // 選択/塗り
  getSelectionBounds: getSelectionBounds,
  makeWhiteRect: makeWhiteRect,

  // I/O
  openDocument: openDocument,
  saveActiveDocAsPSD: saveActiveDocAsPSD,
  closeActiveDocNoPrompt: closeActiveDocNoPrompt,
  saveDocumentAsExtraRaster: saveDocumentAsExtraRaster,
  saveAndCloseActiveDocAsPSD: saveAndCloseActiveDocAsPSD,
  saveAndCloseActiveDoc: saveAndCloseActiveDoc,
  saveAndCloseActiveDocAsPSDWithExtra: saveAndCloseActiveDocAsPSDWithExtra,

  // 走査（現仕様では未使用）
  scanUsedLabels: scanUsedLabels
};
