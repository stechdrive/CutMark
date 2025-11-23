/**
 * CutMark - Photoshop UXP Plugin
 * 
 * Copyright (c) 2025 stechdrive
 * Released under the MIT license
 */

/**
 * main.js - パネルのエントリーポイント（DOM スクリプト）
 * -----------------------------------------------------------------------------
 * 実装は ui.js / ps.js / state.js / template.js に分離。
 * UXP ではインライン <script> は実行されないため、必ず外部ファイルを読み込む。
 * ここでは ui.js を読み込むだけに徹し、起動時のエラーをステータスへ表示する。
 */
"use strict";

// === Release log gate ================================================
// Quiet console output by default in production. To enable verbose debug
// logs for troubleshooting, run in the panel's DevTools console:
//   localStorage.setItem("cutmark_debug", "1"); location.reload();
// To disable: localStorage.removeItem("cutmark_debug"); location.reload();
(function setupCutMarkDebugGate(){
  try{
    var flag = null;
    try { flag = localStorage.getItem("cutmark_debug"); } catch(_){}
    var enabled = (flag === "1" || flag === "true");
    try { window.CM_DEBUG = enabled; } catch(_){ /* non-browser */ }
    if (!enabled){
      var noop = function(){};
      try { console.debug = noop; } catch(_){}
      try { console.log   = noop; } catch(_){}
      try { console.info  = noop; } catch(_){}
      // Keep console.warn/error visible for support
    }
  }catch(_){ /* ignore */ }
})();
// =====================================================================



// パネルの再表示（show）時に安全デフォルトへ戻すためのハンドラ
// 以前は document.visibilityState === "visible" のたびに window.location.reload() を呼び出していましたが、
// ドッキングしたパネルの表示・非表示だけで状態がリセットされてしまう問題があったため、ここでは何もしません。
// 状態の初期化は起動時の init() 内でのみ行います。
try {
  document.addEventListener("visibilitychange", function(){
    // no-op: 表示/非表示ではリセットを行わない
  });
} catch(_) {}

(function boot(){
  try {
    // UI ロジック読み込み（ここで例外が出た場合は下の catch でステータスに表示）
    require("./ui.js");
  } catch (e) {
    try {
      // ステータス欄が無い場合は動的に作ってエラーメッセージを表示
      var el = document.getElementById("status");
      if (!el) {
        var d = document.createElement("div");
        d.id = "status";
        d.style.color = "#f66";
        d.style.padding = "8px";
        document.body.appendChild(d);
        el = d;
      }
      el.textContent = "起動エラー: ui.js を読み込めません — " + (e && e.message ? e.message : e);
    } catch (_) { /* DOM が無い等の異常系は無視 */ }
    console.error("[CutMark CenterBox] Failed to load ui.js", e);
  }
})();
