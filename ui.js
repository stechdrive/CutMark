/**
 * CutMark - Photoshop UXP Plugin
 * 
 * Copyright (c) 2025 stechdrive
 * Released under the MIT license
 */

/**
 * ui.js — パネルのアプリロジック（入出力・配置・保存・テンプレ作成）
 * ---------------------------------------------------------------------------
 * - 「フォルダ/ファイル追加 → 処理開始 → 次へ」フロー
 * - 出力先の永続トークン管理・自動復旧・現在値の可視化
 * - DOM優先：ポイントテキスト生成→段落中央→ “上端合わせ + 水平中央合わせ”
 *   （仕上げの白フチ／背景は AM、ps.js 側）
 *
 * ★この版の要点（SWC移行＋パフォーマンス改善＋履歴ナビ強化）：
 * - 新規テンプレ作成フォームを <sp-accordion-item id="tplCreateItem"> に移行（既存）
 * - フォント列挙は「ドロップダウン初回操作時」に**一度だけ**（既存）
 * - ★履歴ナビ（queue/historyモード）を追加：戻る/次への期待値に整合
 *   - viewMode/historyIndex/activePSDToken を ui.js 内で揮発管理（永続スキーマは不変）
 *   - 履歴PSDは Document.save() を優先、失敗時は token 経由で saveAs.psd
 */
"use strict";

/* ============================================================================
 * Debug Flag (release gate)
 * ========================================================================== */
function __cm_isDebug() {
  try {
    if (typeof window !== "undefined" && window && window.CM_DEBUG === true) return true;
  } catch (_) { }
  try {
    const v1 = (typeof localStorage !== "undefined") ? localStorage.getItem("cutmark_debug") : null;
    if (v1 === "1" || v1 === "true") return true;
  } catch (_) { }
  try {
    const v2 = (typeof localStorage !== "undefined") ? localStorage.getItem("cutmark.debug") : null;
    if (v2 === "1" || v2 === "true") return true;
  } catch (_) { }
  return false;
}
try {
  if (typeof window !== "undefined") {
    window.CM_DEBUG = __cm_isDebug();
    window.__cm_isDebug = __cm_isDebug; // デバッグ確認用に公開
  }
} catch (_) { }

// Debug gate（console.time などで再利用）
function isDebugLogEnabled() { return __cm_isDebug(); }

/* ============================================================================
 * Imports
 * ========================================================================== */
const { app, core, action } = require("photoshop");
const fsmod = require("uxp").storage.localFileSystem;

const PS3 = require("./ps.js");
const TPL = require("./template.js");
const {
  state, pad, labelOf, floorBase, validateBaseInput, beginSubMode, markSubPlacement, finalizeSubMode, persist, restore,
  loadTemplatesAndSelectActive, listAllPresets, getActiveTemplate, setActiveTemplate,
  // 互換（旧UI）：createTemplateFromSelection
  createTemplateFromSelection,
  // 新UI
  createTemplateFromInputs,
  ALLOWED_EXT, extOfName, tokenOf, entryFromToken, enqueueFileEntry, normalizeDstRel, nextPendingIndex,
  deleteTemplateById,
  getUsableOutputFolderFromToken,
  requestReadWriteIfNeeded: requestReadWriteIfNeededState,
  prepareOutputFolderUnder: prepareOutputFolderUnderState,
  resolveOutputFolderForCurrentJob: resolveOutputFolderForCurrentJobState
} = require("./state.js");

/* ============================================================================
 * Tpl Create form: per-field "dirty" guard
 *   - ユーザー編集済みの項目は applyActiveTemplateDefaultsToForm で上書きしない
 *   - アコーディオンを開くたびに clearTplDirty() でリセット
 * ========================================================================== */
const _TPL_DIRTY_IDS = new Set([
  "tplName", "tplRows", "tplDpi", "tplFontSel", "tplFontSizePreset", "tplFontSizePt",
  "tplX", "tplY", "tplW", "tplH",
  "tplPadTop", "tplPadRight", "tplPadBottom", "tplPadLeft"
]);
let _tplDirty = Object.create(null);
function markTplDirty(id) {
  if (_TPL_DIRTY_IDS.has(id)) {
    _tplDirty[id] = true;
    try { const el = document.getElementById(id); if (el) el.dataset.cmDirty = "1"; } catch (_) { }
  }
}
function isTplDirty(id) { return !!_tplDirty[id]; }
function clearTplDirty() {
  _tplDirty = Object.create(null);
  try {
    _TPL_DIRTY_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset) delete el.dataset.cmDirty;
    });
  } catch (_) { }
}

/* ============================================================================
 * 小ユーティリティ
 * ========================================================================== */
function $(s) { return document.querySelector(s); }
function toast(msg) {
  const el = $("#status");
  if (el) el.textContent = msg;
  try { console.log("[CutMark CenterBox]", msg); } catch (_) { }
}

/**
 * 実効フォントPS名を取得（未選択や未列挙でも既定 'Arial-Black' を返す）
 * - select に option が無い場合は、プレースホルダ option を 1 件だけ注入して選択状態にする
 * - Lazy populate / Detached の有無に依らず「値」を得られる
 */
function getTplFontPSNameOrDefault() {
  try {
    const sel = $("#tplFontSel");
    if (!sel) return "Arial-Black";
    const raw = (sel.value != null) ? String(sel.value) : "";
    if (raw && raw.trim().length > 0) return raw;
    const want = "Arial-Black";
    try {
      // option が空なら placeholder を生成
      const hasOptions = !!(sel.options && sel.options.length > 0);
      if (!hasOptions) {
        const o = document.createElement("option");
        o.value = want;
        let label = want;
        try {
          if (typeof _fontLabelByPSName !== "undefined" && _fontLabelByPSName && _fontLabelByPSName.get) {
            label = _fontLabelByPSName.get(want) || want;
          }
        } catch (_) { label = want; }
        o.textContent = label;
        sel.appendChild(o);
      }
      try { sel.value = want; } catch (_) { }
    } catch (_) { }
    return want;
  } catch (_) { return "Arial-Black"; }
}

/**
 * 単一プレビューを更新（選択フォントを視覚確認する）
 * - UXP の CSS は generic family 非対応のため、PostScript 名を第一候補に、フォールバックとしてホスト既定の継承に任せる
 */
function updateFontDisplayLabel(labelOverride, cssFamilyOverride) {
  try {
    const disp = document.getElementById("tplFontDisplay");
    const sel = document.getElementById("tplFontSel");
    if (!disp || !sel) return;
    const val = sel.value || "Arial-Black";
    let label = labelOverride || val;
    try {
      if (!labelOverride && _fontLabelByPSName && _fontLabelByPSName.get) {
        label = _fontLabelByPSName.get(val) || val;
      }
    } catch (_) { }
    disp.textContent = label;
  } catch (_) { }
}

function ensureTplFontOption(value, label) {
  try {
    const sel = document.getElementById("tplFontSel");
    if (!sel || !value) return;
    const opts = sel.options ? Array.from(sel.options) : [];
    const found = opts.find(o => o && o.value === value);
    if (found) return;
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label || value;
    sel.appendChild(o);
  } catch (_) { }
}

async function renderFontList() {
  const chooser = document.getElementById("fontChooserItem");
  const listEl = document.getElementById("fontList");
  if (!chooser || !listEl) return;
  listEl.innerHTML = "";
  const fonts = await listFonts();
  const frag = document.createDocumentFragment();
  for (let i = 0; i < fonts.length; i++) {
    const f = fonts[i];
    if (!f) continue;
    const li = document.createElement("li");
    li.dataset.value = f.value || "";
    li.dataset.family = f.family || f.label || f.value || "";
    li.appendChild(document.createTextNode(f.label || f.value || ""));
    if ($("#tplFontSel") && $("#tplFontSel").value === f.value) {
      li.classList.add("is-active");
    }
    frag.appendChild(li);
  }
  listEl.appendChild(frag);
}

function wireFontChooser() {
  const chooser = document.getElementById("fontChooserItem");
  const listEl = document.getElementById("fontList");
  if (!chooser || !listEl) return;

  const onToggle = function () {
    const op = isAccordionOpen(chooser);
    if (op) renderFontList();
  };
  chooser.addEventListener("sp-accordion-item-toggle", onToggle, { capture: false });
  chooser.addEventListener("toggle", onToggle, { capture: false });

  listEl.addEventListener("click", function (ev) {
    let li = ev.target;
    while (li && li.tagName !== "LI") { li = li.parentElement; }
    if (!li || !li.dataset || !li.dataset.value) return;
    const val = li.dataset.value;
    const sel = document.getElementById("tplFontSel");
    const labelText = String(li.textContent || val || "").trim();
    if (sel) {
      try {
        ensureTplFontOption(val, labelText);
        sel.value = val;
      } catch (_) { }
    }
    // update active state
    const actives = listEl.querySelectorAll(".is-active");
    actives.forEach(n => n.classList.remove("is-active"));
    li.classList.add("is-active");
    updateFontDisplayLabel(labelText);
    markTplDirty("tplFontSel");
    updateTplCreateEnabled();
  });
}


/** 内蔵テンプレ削除の可視状態（localStorage）を考慮して一覧をフィルタ */
function __getHiddenInternalIdSet() {
  try {
    const raw = localStorage.getItem("cutmark.template.hiddenInternalIds") || "[]";
    const arr = JSON.parse(raw);
    const s = new Set(Array.isArray(arr) ? arr : []);
    return s;
  } catch (_) { return new Set(); }
}
function __visiblePresets(all) {
  const hidden = __getHiddenInternalIdSet();
  const out = [];
  for (const p of (Array.isArray(all) ? all : [])) {
    if (p && p.source === "internal" && hidden.has(p.id)) continue;
    out.push(p);
  }
  return out;
}

/** 削除ボタンの活性状態を更新 */
function updateTemplateDeleteEnabled() {
  try {
    const btn = document.getElementById("tplDelete");
    if (!btn) return;
    const sel = document.getElementById("tplSelect");
    const all = __visiblePresets(listAllPresets());
    btn.disabled = !(sel && sel.value) || !all || all.length === 0;
  } catch (_) { }
}

/* ============================================================================
 * 診断用（一時）: クリック/フォーカス/伝搬ログ
 * ========================================================================== */
const DEBUG_DIAG = (function () {
  function __cmpPrefersDark() {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ||
        window.matchMedia('(prefers-color-scheme: darkest)').matches;
    } catch (_) { return true; }
  }
  // 現状は単純に true/false を返す
  try { return __cm_isDebug(); } catch (_) { return false; }
})();

function __cm_fmtNode(n) {
  try {
    if (!n) return "null";
    const t = (n.nodeType === 1) ? "E" : (n.nodeType === 3 ? "T" : ("N" + n.nodeType));
    const name = (n.nodeType === 1 && n.nodeName) ? n.nodeName.toLowerCase() : (n.nodeName || "");
    const id = n.id ? ("#" + n.id) : "";
    let cls = "";
    try { cls = (n.classList && n.classList.length) ? ("." + Array.from(n.classList).join(".")) : ""; } catch (_) { }
    let ds = "";
    try { if (n.dataset && n.dataset.row) ds = "[row=" + n.dataset.row + "]"; } catch (_) { }
    return t + ":" + name + id + cls + ds;
  } catch (_) { return String(n); }
}
function __cm_path(ev) {
  try {
    const p = ev && ev.composedPath ? ev.composedPath() : [];
    return Array.prototype.slice.call(p, 0, 6).map(__cm_fmtNode).join(" > ");
  } catch (_) { return "(no composedPath)"; }
}
function __cm_log(label, info) {
  try {
    if (!DEBUG_DIAG) return;
    console.debug("[CM:diag]", label, info);
  } catch (_) { }
}

/** stopPropagation/stopImmediatePropagation の呼出しを検知（DEBUG時のみ） */
(function () {
  if (!DEBUG_DIAG) return;
  try {
    const _sp = Event.prototype.stopPropagation;
    const _sip = Event.prototype.stopImmediatePropagation;
    Event.prototype.stopPropagation = function () {
      try { console.debug("[CM:diag] stopPropagation:", this.type, __cm_fmtNode(this.target)); } catch (_) { }
      return _sp.apply(this, arguments);
    };
    Event.prototype.stopImmediatePropagation = function () {
      try { console.debug("[CM:diag] stopImmediatePropagation:", this.type, __cm_fmtNode(this.target)); } catch (_) { }
      return _sip.apply(this, arguments);
    };
  } catch (_) { }
})();

function bindDiagnostics() {
  if (!DEBUG_DIAG) return;
  try {
    ["pointerdown", "click", "pointerup"].forEach(t => {
      document.addEventListener(t, function (ev) {
        let hits = null;
        if (t === "pointerdown" && document.elementsFromPoint) {
          try {
            const arr = document.elementsFromPoint(ev.clientX, ev.clientY) || [];
            hits = arr.slice(0, 6).map(__cm_fmtNode).join(", ");
          } catch (_) { }
        }
        __cm_log("document." + t, {
          type: ev.type,
          phase: ev.eventPhase,
          target: __cm_fmtNode(ev.target),
          currentTarget: __cm_fmtNode(ev.currentTarget),
          path: __cm_path(ev),
          active: (document.activeElement ? __cm_fmtNode(document.activeElement) : "none"),
          defaultPrevented: !!ev.defaultPrevented,
          bubbles: !!ev.bubbles,
          composed: !!ev.composed,
          hits
        });
      }, true);
    });
  } catch (e) {
    console.warn("[CM:diag] bindDiagnostics failed:", e && e.message ? e.message : e);
  }
}

/** 整数化＋範囲クリップ */
function toInt(v) { const n = Number(v); return (isFinite(n) ? Math.round(n) : null); }

/**
 * テンプレ余白のバリデーション
 * - 負値は 0 へ丸める
 * - 内側幅/高さが 1px 未満にならないよう余白を縮める
 * - W/H 自体が 1 以下なら余白はすべて 0 にする
 * @param {{silent?: boolean}=} opts silent=true のときトーストを出さない
 * @returns {boolean} 何らかの値を調整した場合 true
 */
function validateTplPadding(opts) {
  const silent = opts && opts.silent;
  const wEl = $("#tplW"), hEl = $("#tplH");
  const lEl = $("#tplPadLeft"), rEl = $("#tplPadRight"), tEl = $("#tplPadTop"), bEl = $("#tplPadBottom");
  if (!wEl || !hEl || !lEl || !rEl || !tEl || !bEl) return false;

  let w = toInt(wEl.value); if (w == null || w < 0) w = 0;
  let h = toInt(hEl.value); if (h == null || h < 0) h = 0;

  let left = toInt(lEl.value); if (left == null || left < 0) left = 0;
  let right = toInt(rEl.value); if (right == null || right < 0) right = 0;
  let top = toInt(tEl.value); if (top == null || top < 0) top = 0;
  let bottom = toInt(bEl.value); if (bottom == null || bottom < 0) bottom = 0;

  let changed = false;

  if (w <= 1) { left = 0; right = 0; changed = true; }
  if (h <= 1) { top = 0; bottom = 0; changed = true; }

  function clampWidth() {
    let innerW = w - (left + right);
    if (innerW >= 1) return;
    const deficit = 1 - innerW;
    let reduceLeft = Math.min(left, Math.floor(deficit / 2));
    let reduceRight = Math.min(right, deficit - reduceLeft);
    left -= reduceLeft;
    right -= reduceRight;
    innerW = w - (left + right);
    if (innerW < 1) {
      const need = 1 - innerW;
      const moreLeft = Math.min(left, need);
      left -= moreLeft;
      innerW = w - (left + right);
      if (innerW < 1) {
        const needR = 1 - innerW;
        right = Math.max(0, right - needR);
      }
    }
    if (w - (left + right) < 1) {
      if (w <= 1) { left = 0; right = 0; }
      else {
        const cap = w - 1;
        left = Math.min(left, cap);
        right = Math.min(right, cap - left);
      }
    }
    changed = true;
  }

  function clampHeight() {
    let innerH = h - (top + bottom);
    if (innerH >= 1) return;
    const deficit = 1 - innerH;
    let reduceTop = Math.min(top, Math.floor(deficit / 2));
    let reduceBottom = Math.min(bottom, deficit - reduceTop);
    top -= reduceTop;
    bottom -= reduceBottom;
    innerH = h - (top + bottom);
    if (innerH < 1) {
      const need = 1 - innerH;
      const moreTop = Math.min(top, need);
      top -= moreTop;
      innerH = h - (top + bottom);
      if (innerH < 1) {
        const needB = 1 - innerH;
        bottom = Math.max(0, bottom - needB);
      }
    }
    if (h - (top + bottom) < 1) {
      if (h <= 1) { top = 0; bottom = 0; }
      else {
        const cap = h - 1;
        top = Math.min(top, cap);
        bottom = Math.min(bottom, cap - top);
      }
    }
    changed = true;
  }

  if (w > 1) clampWidth();
  if (h > 1) clampHeight();

  function setIfDiff(el, val) {
    const cur = toInt(el.value);
    if (cur !== val) { el.value = String(val); changed = true; }
  }
  setIfDiff(lEl, left);
  setIfDiff(rEl, right);
  setIfDiff(tEl, top);
  setIfDiff(bEl, bottom);

  if (changed && !silent) toast("余白を調整しました。");
  return changed;
}
function clipInt(n, lo, hi) {
  const x = toInt(n); if (x == null) return null;
  if (typeof lo === "number" && x < lo) return lo;
  if (typeof hi === "number" && x > hi) return hi;
  return x;
}
/** フォントサイズ（pt）のクリップ */
function cmClampFontSizePt(n) { return clipInt(n, 8, 50); }

/** tplFontSizePreset が壊れている場合の再種付け */
function ensureTplFontPresetSeedOptions(preset) {
  try {
    if (!preset) return;
    const hasOption = preset.options && preset.options.length > 0;
    if (hasOption) return;
    const seeds = [12, 14, 16, 18, 24];
    for (let i = 0; i < seeds.length; i++) {
      const opt = document.createElement("option");
      opt.value = String(seeds[i]);
      opt.textContent = seeds[i] + "pt";
      preset.appendChild(opt);
    }
  } catch (_) { }
}

/** クリップ済みサイズをプリセットへ強制反映（動的一時 option を 1 件だけ upsert） */
function applyFontSizeToPreset(size) {
  try {
    const preset = $("#tplFontSizePreset");
    if (!preset) return;
    ensureTplFontPresetSeedOptions(preset);
    const v = toInt(size);
    if (v == null) return;
    const vStr = String(v);

    // 既存の動的一時項目は一度クリアしてから判定
    const optsArr = preset.options ? Array.from(preset.options) : [];
    for (let i = 0; i < optsArr.length; i++) {
      const opt = optsArr[i];
      if (opt && opt.dataset && opt.dataset.cmDynamic === "1") {
        try { opt.remove(); } catch (_) { }
      }
    }

    let dyn = null;
    let foundStatic = false;
    const opts = preset.options ? Array.from(preset.options) : [];
    for (let i = 0; i < opts.length; i++) {
      const opt = opts[i];
      if (!opt) continue;
      if (opt.value === vStr) { foundStatic = true; }
    }

    if (foundStatic) {
      try { preset.value = vStr; } catch (_) { }
    } else {
      // 動的 option を 1 件だけ生成
      if (!dyn) {
        dyn = document.createElement("option");
        dyn.dataset.cmDynamic = "1";
        try { preset.insertBefore(dyn, preset.firstChild || null); }
        catch (_) { try { preset.appendChild(dyn); } catch (__) { } }
      }
      dyn.value = vStr;
      dyn.textContent = vStr + "pt";
      try { preset.value = vStr; } catch (_) { }
      try { dyn.selected = true; } catch (_) { }
    }
  } catch (_) { }
}

/** ドロップダウン（プリセット）を指定サイズに同期 */
function cmSyncFontPresetToValue(size) {
  applyFontSizeToPreset(size);
}

/** 入力欄からの確定反映（blur 時に実行） */
function cmCommitFontSizeFromInput() {
  try {
    const sizePtEl = $("#tplFontSizePt");
    if (!sizePtEl) return;
    let v = cmClampFontSizePt(sizePtEl.value);
    if (v == null) { return; }
    sizePtEl.value = String(v);
    applyFontSizeToPreset(v);
    markTplDirty("tplFontSizePt");
    markTplDirty("tplFontSizePreset");
    updateTplCreateEnabled();
  } catch (_) { }
}

/** 操作中は主要操作をロックして連打を防止 */
let opLock = false;

/** BG pad inline-edit guard */
let _editingBgPad = false;

/** 行ボタン群の一括有効/無効 */
function setRowButtonsDisabled(disabled) {
  const box = $("#placeButtons");
  if (!box) return;
  const btns = box.querySelectorAll("button");
  btns.forEach(b => { b.disabled = !!disabled; });
}

/** 操作中の UI ロック（主要ボタン＋行ボタン群＋テンプレ作成フォーム） */
function setBusyUI(b) {
  const ids = [
    "openNext", "backBtn", "queueStart",
    "addFolder", "addFiles", "setOutFolder",
    "digitsSel", "base", "decBase", "incBase",
    "subMode", "subSelect", "bgEnabled", "bgPad",
    "placeAtSelection",
    // 新規テンプレ作成フォーム
    "tplCreate", "readBoundsFromSelection",
    "tplName", "tplRows", "tplDpi", "tplFontSel", "tplFontSizePreset", "tplFontSizePt",
    "tplX", "tplY", "tplW", "tplH",
    // テンプレ削除/リセット
    "tplDelete", "resetBtn", "extraOutputEnabled", "extraOutputFormat"
  ];
  for (let i = 0; i < ids.length; i++) {
    const el = document.getElementById(ids[i]);
    if (el) el.disabled = !!b || el.dataset.locked === "1";
  }
  setRowButtonsDisabled(!!b);
}

/** 操作逐次化のためのラッパー */
async function withOpLock(name, fn, timeoutMs) {
  if (opLock) { toast("処理中です…"); return; }
  opLock = true; setBusyUI(true);

  const to = (typeof timeoutMs === "number" && timeoutMs > 0) ? timeoutMs : 120000;
  let timer = null;
  const release = function () {
    if (!opLock) return;
    opLock = false;
    setBusyUI(false);
  };
  if (to && isFinite(to)) {
    timer = setTimeout(function () {
      console.warn("[CutMark] withOpLock timeout:", name);
      release();
      toast("処理がタイムアウトしました。もう一度お試しください。");
    }, to);
  }
  try { return await fn(); }
  finally {
    if (timer) clearTimeout(timer);
    release();
  }
}

/** 桁数に応じた上限値（3桁=999 / 4桁=9999） */
function maxForDigits(d) { return (d === 4) ? 9999 : 999; }

/** 次番号のクランプ */
function clampBase(n) {
  const min = 1, max = maxForDigits(state.digits);
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

/** アクティブドキュメントの有無 */
function isDocOpen() {
  try { return !!app.activeDocument; } catch (e) { return false; }
}

/** デバッグログ（なるべく落とさない） */
function debugLog(label, details) {
  if (!__cm_isDebug()) return;
  try {
    var msg = "[CutMark Debug]" + label;
    if (details != null && details !== "") msg += ": " + details;
    console.log(msg);
  } catch (_) { /* ignore */ }
}
// Expose debug helpers to console (debug mode only)
try {
  if (typeof window !== "undefined") {
    window.debugLog = debugLog;
    window.isDebugLogEnabled = isDebugLogEnabled;
  }
} catch (_) { /* ignore */ }

function perfNow() {
  if (!isDebugLogEnabled()) return 0;
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
  } catch (_) { }
  try { return Date.now(); } catch (_) { }
  return 0;
}
function perfLog(label, startMs) {
  if (!isDebugLogEnabled()) return;
  let dur = 0;
  try { if (startMs && startMs > 0) dur = perfNow() - startMs; } catch (_) { }
  try { debugLog(label, "dur=" + dur.toFixed(1) + "ms"); } catch (_) { }
}

/** Entry の概観（ログ用） */
function describeEntry(entry) {
  if (!entry) return "(null)";
  const flags = [];
  try { if (entry.isFolder || typeof entry.getEntries === 'function' || typeof entry.createFile === 'function') flags.push("folder"); } catch (_) { }
  try { if (entry.isFile || typeof entry.read === 'function') flags.push("file"); } catch (_) { }
  let path = "";
  try { path = entry.nativePath || entry.name || ""; } catch (_) { path = entry && entry.name ? entry.name : ""; }
  if (!path) path = "(no-path)";
  return "[" + (flags.length ? flags.join("+") : "unknown") + "]" + path;
}

/** キュー進捗の可視状態リセット（★ 履歴ナビの揮発フィールドも初期化） */
function resetQueueProgress() {
  state.session.started = false;
  state.session.cursor = 0;
  state.session.lastSavedIndex = -1;
  state.session.managedDocId = null;
  state.session.managedJobIndex = -1;
  ensureSessionNav(true);
}

/** キューが空のときだけ進行状態を初期化するセーフ版 */
function resetQueueProgressIfEmpty(prevPendingCount) {
  if (!state || !state.session) return;
  const n = (typeof prevPendingCount === "number" && prevPendingCount >= 0)
    ? prevPendingCount
    : countPendingJobs();
  if (n > 0) return;
  resetQueueProgress();
}

/** 出力先ラベル（存在する場合のみ）を更新 */
async function updateOutFolderLabel() {
  const el = $("#outFolderLabel");
  if (!el) return;
  try {
    const tok = state.session.outputFolderToken;
    if (!tok) { el.textContent = "出力先：（未設定）"; return; }
    const e = await getUsableOutputFolderFromToken(tok);
    if (e) {
      el.textContent = "出力先：" + (e.nativePath || e.name || "(不明)");
    } else {
      el.textContent = "出力先：（無効）";
    }
  } catch (_) { el.textContent = "出力先：（未設定）"; }
}


/* ============================================================================
 * 追加出力（JPG/PNG）設定
 * ========================================================================== */

/** 追加出力のセッション既定値を保証 */
function ensureExtraOutputStateDefaults() {
  if (!state || !state.session) return;
  if (typeof state.session.extraOutputEnabled !== "boolean") {
    state.session.extraOutputEnabled = false;
  }
  const fmt = (state.session.extraOutputFormat || "").toLowerCase();
  if (fmt !== "png" && fmt !== "jpg") {
    state.session.extraOutputFormat = "jpg";
  }
}

/** pending 状態のジョブ件数を数える（自動開始判定用） */
function countPendingJobs() {
  if (!state || !state.session || !Array.isArray(state.session.queue)) return 0;
  let n = 0;
  for (let i = 0; i < state.session.queue.length; i++) {
    if (state.session.queue[i] && state.session.queue[i].state === "pending") n++;
  }
  return n;
}

/** 追加出力設定を取得（UIロジック用） */
function getExtraOutputConfig() {
  if (!state || !state.session) {
    return { enabled: false, format: "jpg" };
  }
  const enabled = !!state.session.extraOutputEnabled;
  const raw = (state.session.extraOutputFormat || "").toLowerCase();
  const format = (raw === "png") ? "png" : "jpg";
  return { enabled, format };
}

/** PSD 用の dstRel から追加出力用ファイル名を算出 */
function deriveAdditionalOutputRel(dstRel, format) {
  const idx = dstRel.lastIndexOf(".");
  const base = (idx >= 0) ? dstRel.slice(0, idx) : dstRel;
  const ext = (format === "png") ? ".png" : ".jpg";
  return base + ext;
}

/** 追加出力 UI を state.session から同期 */
function syncExtraOutputControlsFromState() {
  try {
    ensureExtraOutputStateDefaults();
  } catch (_) { }
  const cfg = getExtraOutputConfig();
  const toggle = document.getElementById("extraOutputEnabled");
  const sel = document.getElementById("extraOutputFormat");

  if (toggle) {
    toggle.checked = !!cfg.enabled;
  }
  if (sel) {
    const fmt = (cfg.format === "png") ? "png" : "jpg";
    sel.value = fmt;
    const disabled = !cfg.enabled;
    sel.disabled = !!disabled;
    try {
      if (disabled) sel.setAttribute("disabled", "");
      else sel.removeAttribute("disabled");
    } catch (_) { }
  }
}

/** 追加出力トグル変更時のハンドラ */
function onExtraOutputToggle() {
  const toggle = document.getElementById("extraOutputEnabled");
  if (!toggle || !state || !state.session) return;
  ensureExtraOutputStateDefaults();
  const enabled = !!toggle.checked;
  state.session.extraOutputEnabled = enabled;

  const sel = document.getElementById("extraOutputFormat");
  let fmt = "jpg";
  try {
    if (sel) {
      const raw = (sel.value || "").toLowerCase();
      fmt = (raw === "png") ? "png" : "jpg";
    }
  } catch (_) { }
  state.session.extraOutputFormat = fmt;

  if (sel) {
    const disabled = !enabled;
    sel.disabled = !!disabled;
    try {
      if (disabled) sel.setAttribute("disabled", "");
      else sel.removeAttribute("disabled");
    } catch (_) { }
  }
  persist();
  try { renderStatus(); } catch (_) { }
  refocusPanelAfterUiToggle();
}

/** 形式ドロップダウン変更時のハンドラ */
function onExtraOutputFormatChange() {
  const sel = document.getElementById("extraOutputFormat");
  if (!sel || sel.disabled || !state || !state.session) return;
  const raw = (sel.value || "").toLowerCase();
  const fmt = (raw === "png") ? "png" : "jpg";
  state.session.extraOutputFormat = fmt;
  persist();
  try { renderStatus(); } catch (_) { }
  refocusPanelAfterUiToggle();
}

/* ============================================================================
 * 履歴ナビゲーション状態（queue/history）管理
 * ========================================================================== */
function ensureSessionNav(reset) {
  if (!state.session) return;
  if (reset) {
    state.session.viewMode = "queue";
    state.session.historyIndex = -1;
    state.session.activePSDToken = null;
    state.session.historyOutFolderTokens = [];
    return;
  }
  if (state.session.viewMode !== "queue" && state.session.viewMode !== "history") {
    state.session.viewMode = "queue";
  }
  if (typeof state.session.historyIndex !== "number") state.session.historyIndex = -1;
  if (!("activePSDToken" in state.session)) state.session.activePSDToken = null;
  if (!Array.isArray(state.session.historyOutFolderTokens)) state.session.historyOutFolderTokens = [];
}
function inHistoryView() {
  return state.session && state.session.viewMode === "history" && typeof state.session.historyIndex === "number" && state.session.historyIndex >= 0;
}
function enterHistoryView(index, token) {
  ensureSessionNav(false);
  state.session.viewMode = "history";
  state.session.historyIndex = Number(index);
  state.session.activePSDToken = token || null;
  state.session.managedDocId = null;
  state.session.managedJobIndex = -1;
  persist();
}
function exitHistoryView() {
  ensureSessionNav(false);
  state.session.viewMode = "queue";
  state.session.historyIndex = -1;
  state.session.activePSDToken = null;
  persist();
}

/** 履歴PSDの親フォルダトークンを記録（index に揃えて保持） */
function rememberHistoryOutFolderToken(index, folderToken) {
  if (!state || !state.session) return;
  const idx = Number(index);
  if (!isFinite(idx) || idx < 0) return;
  if (!folderToken) return;
  if (!Array.isArray(state.session.historyOutFolderTokens)) {
    state.session.historyOutFolderTokens = [];
  }
  while (state.session.historyOutFolderTokens.length <= idx) {
    state.session.historyOutFolderTokens.push(null);
  }
  state.session.historyOutFolderTokens[idx] = folderToken;
}

/**
 * 履歴PSDの親フォルダ Entry を取得し、得られた場合はトークンを記録する
 * - フォルダトークン優先で解決し、欠損時は PSD エントリから親フォルダを補完
 */
async function getHistoryFolderEntry(index, psdEntry) {
  if (!state || !state.session) return null;
  if (typeof index !== "number" || index < 0) return null;
  let folder = null;
  let tok = null;
  try {
    if (Array.isArray(state.session.historyOutFolderTokens)) {
      tok = state.session.historyOutFolderTokens[index] || null;
    }
  } catch (_) { tok = null; }

  if (tok) {
    try {
      const ent = await entryFromToken(tok);
      if (ent && ent.isFolder === true) {
        folder = ent;
      }
    } catch (eTok) {
      debugLog("history.folder/resolve-token-error", eTok && (eTok.message || String(eTok)));
    }
  }

  if (!folder) {
    try {
      const parent = psdEntry && (psdEntry.parent || (typeof psdEntry.getParent === "function" ? await psdEntry.getParent() : null));
      if (parent && parent.isFolder === true) {
        folder = parent;
        try {
          const ft = await fsmod.createPersistentToken(parent);
          rememberHistoryOutFolderToken(index, ft);
        } catch (eTokCreate) {
          debugLog("history.folder/tokenize-error", eTokCreate && (eTokCreate.message || String(eTokCreate)));
        }
      }
    } catch (eParent) {
      debugLog("history.folder/parent-error", eParent && (eParent.message || String(eParent)));
    }
  }
  return folder;
}

/**
 * 履歴保存用に PSD Entry と親フォルダ（追加出力先）を解決する
 * - トークン破損時でも getParent を試みてトークンを再生成する
 * - 呼び出し元で親フォルダが null の場合は追加出力をスキップするか再試行を判断
 */
async function resolveHistorySaveContext(index) {
  const result = { psdEntry: null, psdToken: null, parentFolder: null, folderToken: null };
  try {
    const hist = state.session.historyPSD || [];
    const token = (index >= 0 && index < hist.length) ? hist[index] : (state.session.activePSDToken || null);
    if (!token) return result;
    result.psdToken = token;
    result.psdEntry = await entryFromToken(token);
    result.parentFolder = await getHistoryFolderEntry(index, result.psdEntry);
    try {
      if (result.parentFolder) {
        result.folderToken = await fsmod.createPersistentToken(result.parentFolder);
        rememberHistoryOutFolderToken(index, result.folderToken);
      }
    } catch (_) { }
  } catch (e) {
    debugLog("history.ctx/resolve-error", e && (e.message || String(e)));
  }
  return result;
}

/**
 * 履歴 PSD の追加出力ファイルを生成する
 * - 親フォルダが無ければトークン再解決を試み、それでも不可なら null を返す
 */
async function prepareHistoryExtraOutput(index, psdEntry, format) {
  if (!psdEntry) return { extraFile: null, parentFolder: null };
  let fmt = (format === "png") ? "png" : "jpg";
  let parentFolder = await getHistoryFolderEntry(index, psdEntry);
  if (!parentFolder) {
    try {
      const parent = psdEntry.parent || (typeof psdEntry.getParent === "function" ? await psdEntry.getParent() : null);
      if (parent && parent.isFolder === true) {
        parentFolder = parent;
        try {
          const ft = await fsmod.createPersistentToken(parent);
          rememberHistoryOutFolderToken(index, ft);
        } catch (eTok) {
          debugLog("history.extra/tokenize-fallback-error", eTok && (eTok.message || String(eTok)));
        }
      }
    } catch (eParent) {
      debugLog("history.extra/parent-fallback-error", eParent && (eParent.message || String(eParent)));
    }
  }
  if (!parentFolder || typeof parentFolder.createFile !== "function") {
    return { extraFile: null, parentFolder: null };
  }
  try {
    const baseName = psdEntry.name || "history.psd";
    const extraRel = deriveAdditionalOutputRel(baseName, fmt);
    const extraFile = await parentFolder.createFile(extraRel, { overwrite: true });
    return { extraFile: extraFile, parentFolder: parentFolder };
  } catch (e) {
    debugLog("history.extra/create-error", e && (e.message || String(e)));
    return { extraFile: null, parentFolder: parentFolder };
  }
}

async function saveActiveHistoryPSDAndClose() {
  if (!inHistoryView()) return false;
  // [MOD] 追加出力用に履歴PSDと親フォルダを先に解決しておく
  const histIndex = state.session.historyIndex;
  const ctx = await resolveHistorySaveContext(histIndex);
  let psdEntry = ctx.psdEntry;
  let psdToken = ctx.psdToken;
  let parentFolder = ctx.parentFolder;

  // 追加出力準備（履歴PSDの保存先と同じフォルダに JPG/PNG を作成）
  let extraFile = null;
  let extraFormat = "jpg";
  let extraEnabled = false;
  try { ensureExtraOutputStateDefaults(); } catch (_) { }
  try {
    const extraCfg = getExtraOutputConfig();
    extraEnabled = !!extraCfg.enabled;
    extraFormat = (extraCfg.format === "png") ? "png" : "jpg";
    if (extraEnabled) {
      const prep = await prepareHistoryExtraOutput(histIndex, psdEntry, extraFormat);
      extraFile = prep.extraFile;
      parentFolder = prep.parentFolder || parentFolder;
      if (!extraFile) {
        console.warn("[CutMark] 履歴の追加出力ファイルを作成できませんでした（再試行前）");
      }
    }
  } catch (exPrep) {
    console.warn("[CutMark] 履歴の追加出力準備に失敗しました:", exPrep);
    extraFile = null;
  }

  let saved = false;
  try {
    await PS3.saveAndCloseActiveDoc({ extraOutFileEntry: extraFile, extraFormat: extraFormat });
    saved = true;
  } catch (e) {
    debugLog("history.save+close/dom-error", e && (e.message || String(e)));
  }
  if (!saved) {
    try {
      if (!psdEntry && psdToken) {
        psdEntry = await entryFromToken(psdToken);
      }
      if (!parentFolder) {
        parentFolder = await getHistoryFolderEntry(histIndex, psdEntry);
      }
      // 追加出力ファイルが未生成なら、フォルダ再解決後にもう一度生成を試行
      if (extraEnabled && !extraFile) {
        const retry = await prepareHistoryExtraOutput(histIndex, psdEntry, extraFormat);
        extraFile = retry.extraFile;
        parentFolder = retry.parentFolder || parentFolder;
        if (!extraFile) {
          console.warn("[CutMark] 履歴PSDのフォルダが取得できず追加出力をスキップします");
        }
      }
      if (psdEntry) {
        await PS3.saveAndCloseActiveDocAsPSDWithExtra({
          psdOutFileEntry: psdEntry,
          extraOutFileEntry: extraFile,
          extraFormat: extraFormat,
          jpegQuality: 10
        });
        saved = true;
      }
    } catch (e) {
      debugLog("history.save+close/fallback-error", e && (e.message || String(e)));
    }
  }
  return saved;
}
async function openHistoryAtIndex(index) {
  const hist = state.session.historyPSD || [];
  if (index < 0 || index >= hist.length) { toast("これ以上履歴がありません"); return; }
  const token = hist[index];
  const entry = await entryFromToken(token);
  if (!entry) { toast("履歴のPSDにアクセスできません"); return; }
  try {
    const parent = await getHistoryFolderEntry(index, entry);
    if (parent) {
      const ft = await fsmod.createPersistentToken(parent);
      rememberHistoryOutFolderToken(index, ft);
    }
  } catch (_) { }
  await PS3.openDocument(entry);
  try { state.session.managedDocId = null; } catch (_) { }
  state.session.managedJobIndex = -1;
  state.session.historyIndex = index;
  enterHistoryView(index, token);
  persist(); renderStatus(); await updateOutFolderLabel();
  toast("履歴を表示: " + (entry.name || String(index + 1)));
}

/* ============================================================================
 * フォント周り
 * ========================================================================== */
let _fontCache = null;
let _fontLabelByPSName = null;
let _fontOptionParking = null;
let _cmFontMenuOpen = false;

function getFontListElements() {
  return {
    chooser: document.getElementById("fontChooser"),
    listPanel: document.getElementById("fontListPanel"),
    list: document.getElementById("fontList")
  };
}

async function listFonts() {
  const t0 = perfNow();
  if (isDebugLogEnabled()) {
    try { console.time("[CutMark Debug] font:listFonts"); } catch (_) { }
    try { debugLog("font:listFonts/start", "cache=" + (!!_fontCache)); } catch (_) { }
  }
  if (_fontCache) return _fontCache;
  try {
    const fonts = (typeof app !== "undefined" && app && app.fonts) ? app.fonts : null;
    const items = [];
    const seen = new Set();
    const len = (fonts && typeof fonts.length === "number") ? fonts.length : 0;
    for (let i = 0; i < len; i++) {
      const f = fonts[i] || {};
      const ps = f.postScriptName || f.psName || f.name || "";
      if (!ps || seen.has(ps)) continue;
      seen.add(ps);
      const fam = f.family || f.name || "";
      const sty = f.style || f.fontStyleName || "";
      const nm = (fam && sty) ? (fam + " " + sty) : (fam || f.name || ps);
      items.push({ value: ps, label: nm, family: fam || ps });
    }
    // sort by label
    items.sort(function (a, b) {
      const x = String(a.label || "").toLowerCase();
      const y = String(b.label || "").toLowerCase();
      if (x < y) return -1; if (x > y) return 1; return 0;
    });
    _fontCache = items;
    _fontLabelByPSName = new Map();
    for (let i = 0; i < items.length; i++) { try { _fontLabelByPSName.set(items[i].value, items[i].label); } catch (_) { } };
    return items;
  } catch (e) {
    try { console.warn("[CutMark] listFonts failed:", e && (e.message || String(e))); } catch (_) { }
    _fontCache = [{ value: "Arial-Black", label: "Arial-Black" }];
    return _fontCache;
  }
  finally {
    if (isDebugLogEnabled()) {
      try { console.timeEnd("[CutMark Debug] font:listFonts"); } catch (_) { }
      try { debugLog("font:listFonts/end", "count=" + (_fontCache ? _fontCache.length : 0)); } catch (_) { }
      perfLog("font:listFonts/dur", t0);
    }
  }
}

async function populateFontSelectFromCache() {
  const select = $("#tplFontSel");
  if (!select) return;
  if (select._cmPopulating) return;
  const t0 = perfNow();
  if (isDebugLogEnabled()) {
    try { console.time("[CutMark Debug] font:populate"); } catch (_) { }
    try { debugLog("font:populate/start", "detached=" + !!(select && select._cmDetached)); } catch (_) { }
  }
  select._cmPopulating = true;
  try {
    if (select._cmDetached) {
      try { attachFontSelectFromCache(); } catch (_) { }
      if (!select._cmDetached) {
        select._cmPopulating = false;
        select.disabled = false;
        return;
      }
    }
    if (select._cmPopulated && !select._cmDetached) return;
    select.disabled = true;
    const list = await listFonts();
    const frag = document.createDocumentFragment();
    const added = new Set();
    function addOption(value, label) {
      if (!value || added.has(value)) return;
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      frag.appendChild(o);
      added.add(value);
    }
    const want = select.value || "Arial-Black";
    addOption("Arial-Black", "Arial-Black");
    if (Array.isArray(list) && list.length) {
      const batch = 20;
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (!f || typeof f !== "object") continue;
        const ps = f.value || f.psName || f.postScriptName || f.name || "";
        if (!ps) continue;
        const label = f.label || f.displayName || ps;
        addOption(ps, label);
        if (i % batch === 0) { await new Promise(res => setTimeout(res, 0)); }
      }
    }
    select.innerHTML = "";
    select.appendChild(frag);
    try {
      if (want && added.has(want)) select.value = want;
      else select.value = "Arial-Black";
      updateFontDisplayLabel();
    } catch (_) { }
    select._cmPopulated = true;
  } catch (e) {
    try { console.warn("[CutMark] fonts/populate error:", e && (e.message || String(e))); } catch (_) { }
    select.innerHTML = "";
    const o = document.createElement("option");
    o.value = "Arial-Black";
    o.textContent = "Arial-Black (default)";
    select.appendChild(o);
    try { select.value = "Arial-Black"; } catch (_) { }
  } finally {
    select.disabled = false;
    select._cmPopulating = false;
  }
  if (isDebugLogEnabled()) {
    try {
      console.timeEnd("[CutMark Debug] font:populate");
      console.debug("[CutMark Debug] font:populate options=", (select && select.options && select.options.length) ? select.options.length : 0, "detached=", !!(select && select._cmDetached));
      debugLog("font:populate/end", "options=" + ((select && select.options) ? select.options.length : 0));
      perfLog("font:populate/dur", t0);
      try { if (typeof select._cmLogUiPaint === "function") select._cmLogUiPaint(); } catch (_) { }
      updateFontDisplayLabel();
    } catch (_) { }
  }
}
function ensureFontParkingContainer() {
  if (_fontOptionParking && document.body && _fontOptionParking.parentNode === document.body) return _fontOptionParking;
  try {
    const park = document.createElement("div");
    park.id = "cmFontParking";
    park.style.display = "none";
    park.style.visibility = "hidden";
    park.style.position = "absolute";
    park.style.left = "-99999px";
    park.style.top = "-99999px";
    if (document.body) {
      document.body.appendChild(park);
      _fontOptionParking = park;
    }
  } catch (_) { }
  return _fontOptionParking;
}
function detachFontSelectToSelection() {
  const t0 = perfNow();
  if (isDebugLogEnabled()) {
    try { console.time("[CutMark Debug] font:detach"); } catch (_) { }
    try { debugLog("font:detach/start"); } catch (_) { }
  }
  try {
    const select = $("#tplFontSel");
    if (!select) return;
    if (select._cmDetached) return;
    const optsLen = (select.options && select.options.length) ? select.options.length : 0;
    if (optsLen <= 1) return;
    const parking = ensureFontParkingContainer();
    if (!parking) return;
    const options = Array.from(select.options || []);
    if (!options.length) return;
    const selectedIdx = select.selectedIndex >= 0 ? select.selectedIndex : 0;
    const selectedOpt = options[selectedIdx] || options[0];
    let selectedValue = "";
    try { selectedValue = selectedOpt.value || ""; } catch (_) { }
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt) continue;
      try { opt.dataset.cmParkOrder = String(i); } catch (_) { }
      if (opt === selectedOpt) continue;
      try {
        opt.dataset.cmParked = "1";
        opt.dataset.cmParkedFor = select.id || "tplFontSel";
        parking.appendChild(opt);
      } catch (_) { }
    }
    try { select.value = selectedValue; } catch (_) { }
    select._cmDetached = true;
  } catch (_) { }
  finally {
    if (isDebugLogEnabled()) {
      try {
        console.timeEnd("[CutMark Debug] font:detach");
        const select = $("#tplFontSel");
        const len = select && select.options ? select.options.length : 0;
        console.debug("[CutMark Debug] font:detach remaining options=", len);
        debugLog("font:detach/end", "remain=" + len);
        perfLog("font:detach/dur", t0);
      } catch (_) { }
    }
  }
}
function attachFontSelectFromCache() {
  const t0 = perfNow();
  if (isDebugLogEnabled()) {
    try { console.time("[CutMark Debug] font:attach"); } catch (_) { }
    try { debugLog("font:attach/start"); } catch (_) { }
  }
  try {
    const select = $("#tplFontSel");
    if (!select) return;
    if (!select._cmDetached) return;
    const parking = ensureFontParkingContainer();
    const parked = parking ? Array.from(parking.querySelectorAll('option[data-cm-parked="1"]')) : [];
    const mine = [];
    for (let i = 0; i < parked.length; i++) {
      const opt = parked[i];
      if (!opt) continue;
      const forId = opt.dataset ? (opt.dataset.cmParkedFor || "") : "";
      if (forId && select.id && forId !== select.id) continue;
      mine.push(opt);
    }
    if (!mine.length) {
      select._cmDetached = false;
      select._cmPopulated = select._cmPopulated || (select.options && select.options.length > 0);
      return;
    }
    let savedVal = "";
    try { savedVal = select.value || ""; } catch (_) { }
    const existing = Array.from(select.options || []);
    const all = existing.concat(mine);
    all.sort(function (a, b) {
      const ai = Number((a && a.dataset && a.dataset.cmParkOrder) || -1);
      const bi = Number((b && b.dataset && b.dataset.cmParkOrder) || -1);
      if (ai < bi) return -1; if (ai > bi) return 1; return 0;
    });
    while (select.firstChild) { select.removeChild(select.firstChild); }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < all.length; i++) {
      const opt = all[i];
      if (!opt) continue;
      try {
        if (opt.dataset) {
          delete opt.dataset.cmParked;
          delete opt.dataset.cmParkedFor;
        }
      } catch (_) { }
      frag.appendChild(opt);
    }
    select.appendChild(frag);
    try { if (savedVal) select.value = savedVal; } catch (_) { }
    select._cmDetached = false;
    select._cmPopulated = true;
    updateFontDisplayLabel();
  } catch (_) { }
  finally {
    if (isDebugLogEnabled()) {
      try {
        console.timeEnd("[CutMark Debug] font:attach");
        const select = $("#tplFontSel");
        const len = select && select.options ? select.options.length : 0;
        console.debug("[CutMark Debug] font:attach options=", len, "detached=", !!(select && select._cmDetached));
        debugLog("font:attach/end", "len=" + len + " detached=" + (!!(select && select._cmDetached)));
        perfLog("font:attach/dur", t0);
      } catch (_) { }
    }
  }
}
function ensureFontListPopulated() { return populateFontSelectFromCache(); }
function wireFontSelectLazy() {
  const select = $("#tplFontSel");
  if (!select) return;
  if (select._cmFontLazyWired) return;
  select._cmFontLazyWired = true;
  // [DEBUG] UI体感計測用（pointerdown 発火時刻を記録）
  let _cmFontUiStart = 0;
  function probeDropdown(startMs) {
    const tOpen = startMs || perfNow();
    if (isDebugLogEnabled()) {
      try { console.debug("[CutMark Debug] font:dropdown/probe start t=" + tOpen.toFixed(1)); } catch (_) { }
    }
    const delays = [0, 50, 100, 200, 500, 1000, 2000, 4000, 6000, 8000, 10000, 12000];
    for (let i = 0; i < delays.length; i++) {
      setTimeout(function () { try { perfLog("font:dropdown/open", tOpen); } catch (_) { } }, delays[i]);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              try { perfLog("font:dropdown/paint", tOpen); } catch (_) { }
            });
          });
        });
      });
    });
  }
  const onDown = function () {
    // フォントメニュー開きフラグをセット（12sで自動解除）
    _cmFontMenuOpen = true;
    setTimeout(function () { _cmFontMenuOpen = false; }, 12000);
    if (!isDebugLogEnabled()) return;
    _cmFontUiStart = perfNow();
    debugLog("font:ui/pointerdown", "start");
    probeDropdown(_cmFontUiStart);
  };
  // pointerdown / mousedown / click すべてで計測を開始（冪等）
  select.addEventListener("pointerdown", onDown, { capture: true });
  try { select.addEventListener("mousedown", onDown, { capture: true }); } catch (_) { }
  // hidden select はユーザー操作しないため click 計測は不要
  const ensure = () => {
    try {
      if (select._cmDetached) {
        attachFontSelectFromCache();
        if (!select._cmDetached) return;
      }
    } catch (_) { }
    populateFontSelectFromCache();
  };
  select.addEventListener("pointerdown", ensure, { capture: true });
  select.addEventListener("focus", ensure, { capture: true });
  select.addEventListener("keydown", (ev) => {
    const k = String(ev.key || "");
    if (k === "ArrowDown" || k === "Enter" || k === " ") { ensure(); }
  }, { capture: true });

  // [DEBUG] populate 完了後に UI 表示までの遅延を可視化
  select._cmLogUiPaint = function () {
    if (!isDebugLogEnabled()) return;
    const start = _cmFontUiStart || perfNow();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { perfLog("font:ui/paint", start); });
    });
  };
}

function warmupFontList() {
  try {
    if (isDebugLogEnabled()) { try { console.time("[CutMark Debug] font:warmup"); } catch (_) { } }
    if (_fontCache) return;
    listFonts().catch(function () { /* 初回列挙の遅延吸収用、エラーは握りつぶす */ });
  } catch (_) { }
  finally {
    if (isDebugLogEnabled()) { try { console.timeEnd("[CutMark Debug] font:warmup"); } catch (_) { } }
  }
}

/* ============================================================================
 * 採番：サブ改行（CR）を含むラベルの生成
 * ========================================================================== */
function currentLabelForTemplate() {
  const raw = labelOf();
  return TPL.labelWithOptionalBreak(raw);
}

/* ============================================================================
 * テンプレUI（行ボタン・新規テンプレ作成フォーム）
 * ========================================================================== */
function clampRows(n) {
  let r = Math.floor(Number(n) || 0);
  if (r < 1) r = 1;
  if (r > 9) r = 9;
  return r;
}
function ensureFixedRowButtons() {
  const box = document.getElementById("placeButtons");
  if (!box) return;
  if (box.__cm_fixed) return;
  box.__cm_fixed = true;
  try { box.style.pointerEvents = "auto"; } catch (_) { }
  for (let i = 1; i <= 9; i++) {
    let btn = document.getElementById("placeRow_" + i);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "placeRow_" + i;
      btn.dataset.row = String(i);
      btn.textContent = i + "コマ目";
      btn.title = "ショートカット: " + i + " / Numpad" + i;
      box.appendChild(btn);
    } else {
      btn.dataset.row = String(i);
      try { btn.title = "ショートカット: " + i + " / Numpad" + i; } catch (_) { }
      try { btn.textContent = i + "コマ目"; } catch (_) { }
    }
    if (!btn.__cm_wired) {
      btn.addEventListener("click", async function (ev) {
        try {
          try { console.log("[CM:test] rowButton.click", { id: ev.currentTarget && ev.currentTarget.id, row: ev.currentTarget && ev.currentTarget.dataset && ev.currentTarget.dataset.row }); } catch (_) { }
          ev.preventDefault();
          const n = parseInt(ev.currentTarget && ev.currentTarget.dataset ? ev.currentTarget.dataset.row : "0", 10);
          if (!Number.isFinite(n)) return;
          await placeAtRow(n);
        } catch (e) {
          console.error("[CutMark] row-button click error:", e);
          toast(e && (e.message || String(e)));
        }
      }, { capture: false });
      btn.__cm_wired = true;
    }
  }
}
function renderRowButtons() {
  const box = $("#placeButtons");
  if (!box) return;
  ensureFixedRowButtons();
  const t = getActiveTemplate();
  const rows = clampRows(t && t.cutBox && typeof t.cutBox.rows === "number" ? t.cutBox.rows : 1);
  for (let i = 1; i <= 9; i++) {
    const btn = document.getElementById("placeRow_" + i);
    if (!btn) continue;
    btn.hidden = (i > rows);
    try { btn.dataset.row = String(i); } catch (_) { }
    try { btn.title = "ショートカット: " + i + " / Numpad" + i; } catch (_) { }
    try { if (!btn.textContent || !/コマ目$/.test(btn.textContent)) btn.textContent = i + "コマ目"; } catch (_) { }
  }
}
function applyActiveTemplateDefaultsToForm(force) {
  try {
    const t = getActiveTemplate();
    const setIf = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (force || !isTplDirty(id)) el.value = String(val);
    };
    setIf("tplName", "");
    setIf("tplRows", (t.cutBox && typeof t.cutBox.rows === "number" ? t.cutBox.rows : 5));
    setIf("tplDpi", (typeof t.dpi === "number" ? t.dpi : 150));
    setIf("tplFontSizePt", (t.text && t.text.sizePt) || 12);
    if (t.cutBox) {
      setIf("tplX", t.cutBox.x);
      setIf("tplY", t.cutBox.y);
      setIf("tplW", t.cutBox.w);
      setIf("tplH", t.cutBox.h);
      if (t.boxPadding) {
        setIf("tplPadTop", t.boxPadding.top);
        setIf("tplPadRight", t.boxPadding.right);
        setIf("tplPadBottom", t.boxPadding.bottom);
        setIf("tplPadLeft", t.boxPadding.left);
      }
    }
    const sz = toInt($("#tplFontSizePt") && $("#tplFontSizePt").value);
    if (sz != null && (force || !isTplDirty("tplFontSizePt"))) {
      cmSyncFontPresetToValue(sz);
    }
    const sel = $("#tplFontSel");
    const want = (t.text && t.text.fontPSName) || "Arial-Black";
    if (sel && (force || !isTplDirty("tplFontSel"))) {
      try { sel.value = want; } catch (_) { }
      try {
        if (sel.options && sel.options.length <= 1) {
          const opt0 = sel.options[0] || document.createElement("option");
          if (!sel.options.length) sel.appendChild(opt0);
          opt0.value = want;
          let label = (opt0.textContent || want);
          try {
            if (typeof _fontLabelByPSName !== "undefined" && _fontLabelByPSName && _fontLabelByPSName.get) {
              const lbl = _fontLabelByPSName.get(want);
              if (lbl) label = lbl;
            }
          } catch (_) { }
          opt0.textContent = label;
        }
      } catch (_) { }
      updateFontDisplayLabel();
    }
  } catch (_) { }
}
function autoInitDpiFromActiveDocument(forceWhenDefault) {
  try {
    const inp = $("#tplDpi"); if (!inp) return;
    const cur = toInt(inp.value);
    const doc = app.activeDocument;
    if (!doc || typeof doc.resolution !== "number") return;
    const r = Math.round(doc.resolution);
    const dirty = isTplDirty("tplDpi");
    if (r > 0) {
      if (forceWhenDefault) {
        if (!dirty) { inp.value = String(r); updateTplCreateEnabled(); }
      } else if (cur == null || cur <= 1 || cur === 150) {
        inp.value = String(r); updateTplCreateEnabled();
      }
    }
  } catch (_) { }
}
function updateTplCreateEnabled() {
  try {
    const name = $("#tplName") ? String($("#tplName").value || "").trim() : "";
    const rows = toInt($("#tplRows") && $("#tplRows").value);
    const dpi = toInt($("#tplDpi") && $("#tplDpi").value);
    const psn = getTplFontPSNameOrDefault();
    const x = toInt($("#tplX") && $("#tplX").value);
    const y = toInt($("#tplY") && $("#tplY").value);
    const w = toInt($("#tplW") && $("#tplW").value);
    const h = toInt($("#tplH") && $("#tplH").value);
    const ok = !!name && rows && dpi && psn && x != null && y != null && w && h;
    const btn = $("#tplCreate"); if (btn) btn.disabled = !ok;
  } catch (_) { }
}
async function readBoundsFromSelectionIntoForm() {
  try {
    const b = await PS3.getSelectionBounds();
    $("#tplX").value = String(Math.round(b.left));
    $("#tplY").value = String(Math.round(b.top));
    $("#tplW").value = String(Math.round(b.right - b.left));
    $("#tplH").value = String(Math.round(b.bottom - b.top));
    try { markTplDirty("tplX"); markTplDirty("tplY"); markTplDirty("tplW"); markTplDirty("tplH"); } catch (_) { }
    try { validateTplPadding({ silent: true }); } catch (_) { }
    updateTplCreateEnabled();
  } catch (e) {
    toast("矩形選択がありません。キャンバス上で選択範囲を作成してから実行してください。");
  }
}
async function onTemplateCreate() {
  try {
    try { validateTplPadding({ silent: true }); } catch (_) { }
    const padVal = (el) => {
      const n = toInt(el && el.value);
      return (n != null && n >= 0) ? n : 0;
    };
    const data = {
      name: String($("#tplName").value || "").trim(),
      rows: toInt($("#tplRows").value),
      dpi: toInt($("#tplDpi").value),
      text: {
        fontPSName: getTplFontPSNameOrDefault(),
        sizePt: toInt($("#tplFontSizePt").value)
      },
      cutBox: {
        x: toInt($("#tplX").value),
        y: toInt($("#tplY").value),
        w: toInt($("#tplW").value),
        h: toInt($("#tplH").value)
      },
      boxPadding: {
        top: padVal($("#tplPadTop")),
        right: padVal($("#tplPadRight")),
        bottom: padVal($("#tplPadBottom")),
        left: padVal($("#tplPadLeft"))
      }
    };
    await withOpLock("CreateTemplateV2", async function () {
      await createTemplateFromInputs(data);
      renderTemplateUI(); renderStatus();
      toast("テンプレを作成・選択しました");
    });
  } catch (e) {
    toast(e.message || String(e));
  }
}
function getTplCreateAccordionEl() { return document.getElementById("tplCreateItem"); }
function isAccordionOpen(el) {
  if (!el) return false;
  try {
    if (typeof el.open === "boolean") return !!el.open;
    if (typeof el.hasAttribute === "function") return el.hasAttribute("open");
  } catch (_) { }
  return false;
}
function setAccordionOpen(el, on) {
  if (!el) return;
  try {
    if (typeof el.open === "boolean") { el.open = !!on; return; }
  } catch (_) { }
  if (on) el.setAttribute("open", "");
  else el.removeAttribute("open");
}
function wireTplCreateAccordion() {
  const acc = getTplCreateAccordionEl();
  if (!acc) return;
  setAccordionOpen(acc, false);
  function measureAccordionPaint(label, startMs) {
    if (!isDebugLogEnabled()) return;
    let lastH = -1;
    let stable = 0;
    const tick = () => {
      const h = (acc && acc.scrollHeight) ? acc.scrollHeight : 0;
      if (Math.abs(h - lastH) < 0.5) stable += 1; else stable = 0;
      lastH = h;
      if (stable >= 3) {
        perfLog(label + "/paint", startMs);
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }
  function onOpen(startMs) {
    const t0 = startMs || perfNow();
    clearTplDirty();
    applyActiveTemplateDefaultsToForm(true);
    autoInitDpiFromActiveDocument(false);
    updateTplCreateEnabled();
    // フォントセレクトの実体復元はユーザー操作時（pointerdown/focus）に遅延させる
    if (isDebugLogEnabled()) {
      requestAnimationFrame(() => { requestAnimationFrame(() => { perfLog("accordion/open", t0); measureAccordionPaint("accordion/open", t0); }); });
    }
  }
  function onClose(startMs) {
    const t0 = startMs || perfNow();
    try { detachFontSelectToSelection(); } catch (_) { }
    if (isDebugLogEnabled()) {
      requestAnimationFrame(() => { requestAnimationFrame(() => { perfLog("accordion/close", t0); measureAccordionPaint("accordion/close", t0); }); });
    }
  }
  if (isAccordionOpen(acc)) onOpen();
  if (typeof acc.addEventListener === "function") {
    const handler = function () {
      const tStart = perfNow();
      if (_cmFontMenuOpen) {
        if (isDebugLogEnabled()) debugLog("accordion/skip", "font menu open");
        return; // ドロップダウン開放中はトグルを無視
      }
      const op = isAccordionOpen(acc);
      const st = op ? "open" : "close";
      if (acc._cmLastToggleState === st) return;
      acc._cmLastToggleState = st;
      if (op) onOpen(tStart); else onClose(tStart);
    };
    acc.addEventListener("sp-accordion-item-toggle", handler, { capture: false });
    acc.addEventListener("toggle", handler, { capture: false });
  }
}

/** テンプレ選択や行ボタン再描画 */
function renderTemplateUI() {
  const select = $("#tplSelect");
  const all = __visiblePresets(listAllPresets());
  const active = getActiveTemplate();

  if (select) {
    select.innerHTML = "";
    if (all.length) {
      for (let i = 0; i < all.length; i++) {
        const p = all[i];
        const o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.label + (p.source === "internal" ? "（内蔵）" : "");
        if (active && p.id === active.id) o.selected = true;
        select.appendChild(o);
      }
      const enableIds = ["addFolder", "addFiles", "setOutFolder", "openNext", "backBtn", "placeAtSelection"];
      enableIds.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
      setRowButtonsDisabled(false);
      try { select.value = (active && active.id) ? active.id : ""; } catch (_) { }
    } else {
      const o2 = document.createElement("option");
      o2.value = ""; o2.textContent = "テンプレなし";
      select.appendChild(o2);
      const disableIds = ["addFolder", "addFiles", "setOutFolder", "openNext", "backBtn", "placeAtSelection"];
      disableIds.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
      setRowButtonsDisabled(true);
      try { select.value = ""; } catch (_) { }
    }
  }

  const ds = $("#digitsSel");
  if (ds) ds.value = String(state.digits);

  renderRowButtons();

  const acc = getTplCreateAccordionEl();
  if (acc && isAccordionOpen(acc)) {
    applyActiveTemplateDefaultsToForm();
    autoInitDpiFromActiveDocument(false);
    updateTplCreateEnabled();
  }

  try { updateTemplateDeleteEnabled(); } catch (_) { }
}

/** ステータス（次番号・進捗・背景色設定等） */
function renderStatus() {
  let s = "次番号: " + pad(state.nextBase, state.digits);
  if (state.sub) s += state.sub;
  const st = $("#status");
  if (st) st.textContent = s;

  const bgOn = $("#bgEnabled"); if (bgOn) bgOn.checked = !!state.bg.enabled;
  const bgPad = $("#bgPad"); if (bgPad && !_editingBgPad) bgPad.value = state.bg.padding;

  const total = state.session.queue.length;
  const rest = state.session.queue.filter(j => j.state === "pending").length;
  const pr = $("#progress");
  if (pr) pr.textContent = "残り " + rest + " / 全 " + total;

  const baseInp = $("#base");
  if (baseInp) {
    baseInp.min = "1";
    baseInp.max = String(maxForDigits(state.digits));
    baseInp.value = String(state.nextBase);
  }

  const subModeEl = $("#subMode");
  const subSelEl = $("#subSelect");
  if (subModeEl && subSelEl) {
    const hasSub = !!(state.sub && String(state.sub).trim().length === 1);
    subModeEl.checked = hasSub;
    subSelEl.disabled = !hasSub;
    if (hasSub) {
      subSelEl.value = String(state.sub).toUpperCase().slice(0, 1);
      try { subSelEl.removeAttribute("disabled"); } catch (_) { }
    } else {
      subSelEl.value = "";
      try { subSelEl.setAttribute("disabled", ""); } catch (_) { }
    }
  }

  const started = !!state.session.started;
  const nextBtn = $("#openNext"), bb = $("#backBtn");
  const canManualStart = (rest > 0); // [MOD] 未開始でも pending があれば手動開始を許容
  if (nextBtn) nextBtn.disabled = !(started || canManualStart);
  if (bb) bb.disabled = !started;
}

async function placeAtRow(row) {
  try {
    await withOpLock("Place_Row_" + row, async function () {
      try {
        const t = getActiveTemplate();
        const rows = clampRows(t && t.cutBox && typeof t.cutBox.rows === "number" ? t.cutBox.rows : 1);
        let r = Math.round(Number(row) || 1);
        if (r < 1) r = 1;
        if (r > rows) { toast("このテンプレートは " + rows + " 行までです"); return; }
        const inner = TPL.innerBoundsOfRow(r);

        const subModeEl = $("#subMode");
        const subSelEl = $("#subSelect");
        const subOn = subModeEl && subModeEl.checked && subSelEl && subSelEl.value;

        if (subOn) {
          state.sub = subSelEl.value;
          markSubPlacement();
        } else {
          state.sub = "";
        }

        const label = currentLabelForTemplate();
        const bgColor = (t.bg && t.bg.colorRGB && t.bg.colorRGB.length >= 3) ? t.bg.colorRGB : [255, 255, 255];

        let textLayerId = null;
        // [MOD] テキスト生成と背景生成はモーダルを分離する（NOTES 1.24）
        // 理由: contentLayer を同一 executeAsModal で生成すると、一部環境で parameterError/target not selectable が発生し
        //       配置全体がロールバックした事例がある。まずテキストを確実に作り、背景は別モーダルでベストエフォートにする。
        await PS3.withModal("Place_Text_Row_" + r, async function () {
          textLayerId = await PS3.makePointTextTopAlignedInRectDOM({
            textKey: label,
            bounds: inner,
            fontPSName: t.text.fontPSName,
            sizePt: t.text.sizePt,
            strokePx: (t.text && typeof t.text.strokePx === "number") ? t.text.strokePx : 2,
            strokeRGB: (t.text && t.text.strokeRGB && t.text.strokeRGB.length >= 3) ? t.text.strokeRGB : [255, 255, 255]
          });
        });

        try { await core.flush(); } catch (_) { }

        if (state.bg.enabled) {
          await PS3.withModal("Make_BG_ContentLayer", async function () {
            try {
              const bgId = await PS3.makeWhiteUnderTextBounds(textLayerId, state.bg.padding, bgColor);
              try {
                const moved = await PS3.moveLayerBelowDOM(bgId, textLayerId);
                if (!moved) {
                  debugLog("bg-reorder/warn", "moveLayerBelowDOM returned false");
                  toast("背景の重ね順を変更できませんでした（処理は継続）");
                }
              } catch (reErr) {
                console.warn("[CutMark] moveLayerBelowDOM failed:", reErr);
                toast("背景の重ね順変更で例外が発生しました（処理は継続）");
              }
            } catch (bgErr) {
              console.warn("[CutMark] makeWhiteUnderTextBounds failed:", bgErr);
              toast("背景レイヤーの生成に失敗しました: " + (bgErr && bgErr.message ? bgErr.message : bgErr));
            }
          });
        }

        const subModeEl2 = $("#subMode");
        const subSelEl2 = $("#subSelect");
        if (subModeEl2 && subModeEl2.checked) {
          const next = nextSubLetter(state.sub);
          if (next === null) {
            toast("サブは Z までです。サブ文字を編集してください。");
          } else {
            state.sub = next;
            if (subSelEl2) subSelEl2.value = state.sub;
          }
        } else {
          const max = maxForDigits(state.digits);
          if (state.nextBase >= max) {
            toast("桁数の最大値に達しました。次番号を編集してください。");
            state.nextBase = max;
          } else {
            state.nextBase += 1;
          }
        }

        persist();
        renderStatus();
        toast(r + "コマ目に上寄せで配置しました");
      } catch (e) {
        console.error(e);
        toast(e.message || String(e));
      }
    });
  } finally {
    // [MOD] 行ボタン操作後もショートカットを途切れさせないため、配置完了後にパネルへフォーカスを戻す
    try { refocusPanelAfterHostOps(); } catch (_) { }
  }
}
async function placeAtSelection() {
  await withOpLock("Place_Selection", async function () {
    try {
      let selBounds = null;
      try {
        selBounds = await PS3.getSelectionBounds();
      } catch (e) {
        toast("矩形選択がありません。キャンバス上で選択範囲を作成してから実行してください。");
        return;
      }
      const t = getActiveTemplate();
      const subModeEl = $("#subMode");
      const subSelEl = $("#subSelect");
      const subOn = subModeEl && subSelEl && subSelEl.value && subModeEl.checked;

      if (subOn) {
        state.sub = subSelEl.value;
        markSubPlacement();
      } else {
        state.sub = "";
      }
      const label = currentLabelForTemplate();
      const bgColor = (t.bg && t.bg.colorRGB && t.bg.colorRGB.length >= 3) ? t.bg.colorRGB : [255, 255, 255];

      let textLayerId = null;
      await PS3.withModal("Place_Text_Selection", async function () {
        textLayerId = await PS3.makePointTextCenteredInRectDOM({
          textKey: label,
          bounds: selBounds,
          fontPSName: t.text.fontPSName,
          sizePt: t.text.sizePt,
          strokePx: (t.text && typeof t.text.strokePx === "number") ? t.text.strokePx : 2,
          strokeRGB: (t.text && t.text.strokeRGB && t.text.strokeRGB.length >= 3) ? t.text.strokeRGB : [255, 255, 255]
        });
        try {
          const d = app.activeDocument;
          if (d && d.selection && typeof d.selection.deselect === "function") {
            await d.selection.deselect();
          }
        } catch (_) { }
      });

      if (state.bg.enabled) {
        await PS3.withModal("Make_BG_ContentLayer_FromSelection", async function () {
          try {
            const bgId = await PS3.makeWhiteRect(selBounds, bgColor, 100, "CUT_BG");
            try {
              const moved = await PS3.moveLayerBelowDOM(bgId, textLayerId);
              if (!moved) {
                debugLog("bg-reorder/warn", "moveLayerBelowDOM returned false");
                toast("背景の重ね順を変更できませんでした（処理は継続）");
              }
            } catch (reErr) {
              console.warn("[CutMark] moveLayerBelowDOM failed:", reErr);
              toast("背景の重ね順変更で例外が発生しました（処理は継続）");
            }
          } catch (bgErr) {
            console.warn("[CutMark] makeWhiteRect failed:", bgErr);
            toast("背景レイヤーの生成に失敗しました: " + (bgErr && bgErr.message ? bgErr.message : bgErr));
          }
        });
      }

      const subModeEl2 = $("#subMode");
      const subSelEl2 = $("#subSelect");
      if (subModeEl2 && subModeEl2.checked) {
        const next = nextSubLetter(state.sub);
        if (next === null) {
          toast("サブは Z までです。サブ文字を編集してください。");
        } else {
          state.sub = next;
          if (subSelEl2) subSelEl2.value = state.sub;
        }
      } else {
        const max = maxForDigits(state.digits);
        if (state.nextBase >= max) {
          toast("桁数の最大値に達しました。次番号を編集してください。");
          state.nextBase = max;
        } else {
          state.nextBase += 1;
        }
      }

      persist();
      renderStatus();
      toast("選択範囲の中心に配置しました");
      refocusPanelAfterHostOps();
    } catch (e) {
      console.error(e);
      toast(e.message || String(e));
    }
  });
}
function nextSubLetter(ch) {
  if (!ch || ch.length !== 1) return "A";
  const code = ch.charCodeAt(0);
  if (code < 65 || code > 90) return "A";
  if (code === 90) return null;
  return String.fromCharCode(code + 1);
}

/* ============================================================================
 * I/O：フォルダ/ファイル追加・保存・進捗
 * ========================================================================== */
/**
 * 出力先用フォルダへの書き込み権限を要求するヘルパー。
 * - requestPermission が無い場合（旧 Entry）でも動作を止めない。
 */
async function requestReadWriteIfNeeded(entry) {
  return await requestReadWriteIfNeededState(entry);
}

/**
 * 指定フォルダ直下に output フォルダを用意し、永続トークンを返す。
 * - 既に存在する場合は getEntry で再利用し、重複作成エラーを避ける。
 * - baseFolderEntry が無効な場合は null を返す。
 * - opts.requestWrite = true のときは書き込み権限を事前要求する。
 */
async function prepareOutputFolderUnder(baseFolderEntry, opts) {
  return await prepareOutputFolderUnderState(baseFolderEntry, opts);
}

async function addFolderToQueue() {
  let needAutoStart = false;
  await withOpLock("AddFolderToQueue", async function () {
    const pendingBefore = countPendingJobs();
    const folder = await fsmod.getFolder();
    if (!folder) return;
    const hasValidOutput = await getUsableOutputFolderFromToken(state.session.outputFolderToken);
    state.session.inputMode = "folder";
    const prevLen = state.session.queue.length;
    const baseDirToken = await tokenOf(folder);
    const entries = await folder.getEntries();
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.isFolder) continue;
      const ext = extOfName(e.name);
      if (!ALLOWED_EXT.has(ext)) continue;
      const tok = await tokenOf(e);
      enqueueFileEntry({ token: tok, name: e.name }, normalizeDstRel(e.name), baseDirToken);
      state.session.queue[state.session.queue.length - 1].token = tok;
    }
    if (pendingBefore === 0 && !inHistoryView() && !isManagedQueueDocOpen()) {
      needAutoStart = (state.session.queue.length > prevLen);
    }
    if (!hasValidOutput && state.session.queue.length > prevLen) {
      const prepared = await prepareOutputFolderUnder(folder, { requestWrite: true });
      if (prepared && prepared.token) {
        state.session.outputFolderToken = prepared.token;
      }
    }
    if (state.session.queue.length > prevLen) {
      resetQueueProgressIfEmpty(pendingBefore);
    }
    persist(); renderStatus();
    await updateOutFolderLabel();
    syncExtraOutputControlsFromState();
    toast("フォルダからキューに追加しました");
  });
  if (needAutoStart) {
    await autoStartQueueIfIdle("addFolderToQueue");
  }
}
async function addFilesToQueue() {
  let needAutoStart = false;
  await withOpLock("AddFilesToQueue", async function () {
    const pendingBefore = countPendingJobs();
    const files = await fsmod.getFileForOpening({ allowMultiple: true, types: ["jpg", "jpeg", "png", "psd"] });
    if (!files || !files.length) return;
    const hasValidOutput = await getUsableOutputFolderFromToken(state.session.outputFolderToken);
    let firstAcceptedParent = null;
    state.session.inputMode = "files";
    const prevLen = state.session.queue.length;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = extOfName(f.name);
      if (!ALLOWED_EXT.has(ext)) continue;
      const token = await tokenOf(f);
      let dirToken = null;
      let parent = null;
      try {
        if (typeof f.getParent === 'function') parent = await f.getParent();
        else if (f && f.parent) parent = f.parent;
        if (parent) dirToken = await tokenOf(parent);
      } catch (_) { }
      if (!firstAcceptedParent && parent) firstAcceptedParent = parent;
      enqueueFileEntry({ token: token, name: f.name }, normalizeDstRel(f.name), dirToken);
      state.session.queue[state.session.queue.length - 1].token = token;
    }
    if (pendingBefore === 0 && !inHistoryView() && !isManagedQueueDocOpen()) {
      needAutoStart = (state.session.queue.length > prevLen);
    }
    let ensuredByAddFiles = false;
    if (!hasValidOutput && state.session.queue.length > prevLen) {
      // [MOD] ファイル追加では既存の出力先選択ダイアログを利用して明示設定させる
      const ok = await ensureOutputFolderBeforeStart();
      if (!ok) {
        toast("出力先が未設定です。『出力先選択』で設定してください。");
        needAutoStart = false; // [MOD] ユーザーがキャンセルした場合は自動開始を抑止し二重ダイアログを防ぐ
      } else {
        ensuredByAddFiles = true;
      }
    }
    if (state.session.queue.length > prevLen) {
      resetQueueProgressIfEmpty(pendingBefore);
    }
    persist(); renderStatus();
    await updateOutFolderLabel();
    toast("ファイルをキューに追加しました");
  });
  if (needAutoStart) {
    await autoStartQueueIfIdle("addFilesToQueue");
  }
}

/**
 * 現在または次の pending ジョブから出力先を自動設定する
 * - outputFolderToken が未設定/無効のときだけ実行
 * - srcDirToken があればそれを優先し、無ければ元ファイルの親フォルダを使う
 */
async function tryAutoSetOutputFromCurrentJob() {
  const hasValid = await getUsableOutputFolderFromToken(state && state.session && state.session.outputFolderToken);
  if (hasValid) return true;
  if (!state || !state.session || !Array.isArray(state.session.queue)) return false;

  // [MOD] pending を前から順に走査し、書き込み可能な親フォルダで output/ を生成する
  for (let i = 0; i < state.session.queue.length; i++) {
    if (state.session.queue[i].state !== "pending") continue;
    const job = state.session.queue[i];
    let baseFolder = null;

    // 1) srcDirToken 優先（フォルダ追加経由で確実に存在する場合が多い）
    try {
      if (job && job.srcDirToken) {
        baseFolder = await entryFromToken(job.srcDirToken);
      }
    } catch (_) { baseFolder = null; }

    // 2) 入力ファイルの親フォルダをフォールバックとして利用
    if (!baseFolder && job && job.token) {
      try {
        const srcEntry = await entryFromToken(job.token);
        if (srcEntry && typeof srcEntry.getParent === "function") {
          baseFolder = await srcEntry.getParent();
        } else if (srcEntry && srcEntry.parent) {
          baseFolder = srcEntry.parent;
        }
      } catch (_) { baseFolder = null; }
    }
    if (!baseFolder) continue;

    const prepared = await prepareOutputFolderUnder(baseFolder, { requestWrite: true });
    if (prepared && prepared.token) {
      state.session.outputFolderToken = prepared.token;
      persist();
      await updateOutFolderLabel();
      return true;
    }
  }
  return false;
}
async function resolveOutputFolderForCurrentJob() {
  const folder = await resolveOutputFolderForCurrentJobState();
  // トークンが更新されている可能性があるため UI ラベルと追加出力 UI を同期
  await updateOutFolderLabel();
  syncExtraOutputControlsFromState();
  return folder;
}

// [MOD][OUTF-001/002/004] 出力先プリフライト共通ヘルパー
function isOutputFolderError(e) {
  const s = (e && (e.message || e.name || e.code || e.toString())) || "";
  return /output.+folder|未設定|No.+output.+folder|resolveOutputFolder|persistent.+token|getEntryForPersistentToken|invalid.+token/i.test(String(s));
}

async function ensureOutputFolderInteractive(reason) {
  if (typeof ensureOutputFolderBeforeStart === "function") {
    const ok = await ensureOutputFolderBeforeStart({ interactive: true, reason: reason || "save" });
    if (ok) return true;
    try { if (state && state.session && state.session.outputFolderToken) return true; } catch (_) { }
  }
  return false;
}

async function preflightOutputFolder(reason) {
  try {
    const f = await resolveOutputFolderForCurrentJob();
    if (f) return true;
  } catch (_) { /* 非致命：対話プリフライトへフォールバック */ }
  const ok = await ensureOutputFolderInteractive(reason);
  if (ok) return true;
  try { return !!(state && state.session && state.session.outputFolderToken); } catch (_) { return false; }
}

// [MOD] 管理外ドキュメント保存スキップ時の通知制御用フラグ（多重トースト抑止）
let _cmLastSaveSkippedUnmanaged = false;
let _cmLastUnmanagedNoticeTs = 0;
// [MOD] 管理ドキュメントが外部で閉じられた場合の通知抑止
let _cmLastManagedMissingNoticeTs = 0;

async function saveCurrentDocIfAny(retryCount) {
  const retried = (typeof retryCount === "number") ? retryCount >= 1 : !!retryCount;
  const nextRetryCount = (typeof retryCount === "number") ? (retryCount + 1) : 1;
  try {
    if (!isDocOpen()) return null;

    // 管理対象ドキュメントかを厳密に確認
    let curId = null;
    try { curId = app.activeDocument && app.activeDocument._id; } catch (_) { curId = null; }
    const __a = (curId != null) ? String(curId) : "";
    const __b = (state && state.session && state.session.managedDocId != null) ? String(state.session.managedDocId) : "";
    if (!__a || !__b || __a !== __b) {
      // [MOD] 管理外ドキュメント警告はトーストで十分のためデバッグ専用ログに抑制
      debugLog("save/skip-unmanaged", { activeId: __a, managedId: __b });
      _cmLastSaveSkippedUnmanaged = true;
      const now = Date.now();
      if (now - _cmLastUnmanagedNoticeTs > 500) {
        _cmLastUnmanagedNoticeTs = now;
        toast("管理外のドキュメントが開かれています。キューから開いたファイルを選択してから再実行してください。");
      }
      return null;
    }

    // 正常系へ入ったら管理外フラグをリセット
    _cmLastSaveSkippedUnmanaged = false;

    // 保存前に出力先をプリフライト（OUTF-001/002/004）
    const okPre = await preflightOutputFolder("save");
    if (!okPre) {
      toast("保存を中止しました。［出力先］を設定してください。");
      return null;
    }

    let outFolder = null;
    try {
      outFolder = await resolveOutputFolderForCurrentJob();
    } catch (outErr) {
      if (!retried && isOutputFolderError(outErr)) {
        const ok = await preflightOutputFolder("save");
        if (ok) return await saveCurrentDocIfAny(nextRetryCount);
      }
      throw outErr;
    }
    const idx = state.session.cursor;
    const job = state.session.queue[idx];
    const dstRel = job && job.dstRel ? job.dstRel : ("untitled_" + Date.now() + ".psd");

    // PSD 出力ファイル
    let outFile = null;
    try {
      outFile = await outFolder.createFile(dstRel, { overwrite: true });
    } catch (createErr) {
      console.warn("[CutMark] createFile 失敗 (PSD):", dstRel, createErr);
      throw createErr;
    }

    // 追加出力設定とファイル（任意）
    ensureExtraOutputStateDefaults();
    const extraCfg = getExtraOutputConfig();
    let extraFile = null;
    let extraFormat = extraCfg.format;
    if (extraCfg.enabled) {
      try {
        const extraRel = deriveAdditionalOutputRel(dstRel, extraFormat);
        extraFile = await outFolder.createFile(extraRel, { overwrite: true });
      } catch (exCreateErr) {
        console.warn("[CutMark] 追加出力ファイルの作成に失敗しました:", exCreateErr);
        // 追加出力はオプション扱い：PSD 保存は継続する
        extraFile = null;
      }
    }

    // PSD 保存＋（任意）追加出力＋クローズを 1 回のモーダルにまとめる
    await PS3.withModal("Save PSD (CutMark)", async function () {
      const d = app.activeDocument;
      if (!d) throw new Error("保存対象のアクティブなドキュメントが見つかりません。");

      // PSD 保存（ps.js と同じオプションを想定）
      const saveOptions = {
        layers: true,
        embedColorProfile: true,
        maximizeCompatibility: false
      };

      try {
        await d.saveAs.psd(outFile, saveOptions, true); // asCopy=true
      } catch (saveErr) {
        console.warn("[CutMark] saveAs.psd 失敗:", saveErr);
        throw saveErr;
      }

      // 追加出力（任意）
      if (extraFile) {
        try {
          if (extraFormat === "png") {
            // PNG: サイズと速度のバランスを考慮した圧縮（中程度）
            await d.saveAs.png(extraFile, { compression: 6 }, true);
          } else {
            // JPG: おおよそ「クオリティ80」に相当する品質（0..12 スケールで中〜高）
            await d.saveAs.jpg(extraFile, { quality: 10 }, true);
          }
        } catch (extraErr) {
          console.warn("[CutMark] 追加出力の保存に失敗しました:", extraErr);
          // 追加出力のみ失敗として扱い、PSD 保存とクローズは継続
        }
      }

      // ドキュメントをクローズ（保存済みとして）
      try {
        const managedId = state.session && state.session.managedDocId;
        const primaryTarget = managedId
          ? [{ _ref: "document", _id: managedId }]
          : [{ _ref: "document", _enum: "ordinal", _value: "targetEnum" }];
        await action.batchPlay([{
          _obj: "close",
          _target: primaryTarget,
          saving: { _enum: "yesNo", _value: "no" }
        }], { synchronousExecution: true });
      } catch (closeErr) {
        console.warn("[CutMark] close document failed after save:", closeErr);
        if (state.session && state.session.managedDocId) {
          await action.batchPlay([{
            _obj: "close",
            _target: [{ _ref: "document", _enum: "ordinal", _value: "targetEnum" }],
            saving: { _enum: "yesNo", _value: "no" }
          }], { synchronousExecution: true });
        } else {
          throw closeErr;
        }
      }
    });

    const psdToken = await fsmod.createPersistentToken(outFile);
    try {
      const folderToken = await fsmod.createPersistentToken(outFolder);
      const hidx = (state.session.historyPSD && Array.isArray(state.session.historyPSD)) ? state.session.historyPSD.length : 0;
      rememberHistoryOutFolderToken(hidx, folderToken);
    } catch (eTok) {
      debugLog("history.folder/save-tokenize-error", eTok && (eTok.message || String(eTok)));
    }
    if (!state.session.historyPSD) state.session.historyPSD = [];
    state.session.historyPSD.push(psdToken);

    if (job) {
      job.state = "done";
      state.session.lastSavedIndex = idx;
      persist();
    }
    state.session.managedDocId = null;
    state.session.managedJobIndex = -1;
    persist();
    await updateOutFolderLabel();
    syncExtraOutputControlsFromState();
    return psdToken;
  } catch (e) {
    const msg = (e && (e.message || e.toString())) || "";
    if (!retried && /invalid\s+file\s+token/i.test(String(msg))) {
      try {
        state.session.outputFolderToken = null;
        persist();
        return await saveCurrentDocIfAny(nextRetryCount);
      } catch (_) { }
    }
    if (!retried && isOutputFolderError(e)) {
      const ok = await preflightOutputFolder("save");
      if (!ok) {
        toast("保存を中止しました。［出力先］を設定してください。");
        return null;
      }
      return await saveCurrentDocIfAny(nextRetryCount);
    }
    console.warn("[CutMark] saveCurrentDocIfAny:", e);
    toast("出力先が無効でした。『出力先選択』で設定し直すか、もう一度お試しください。");
    throw e;
  }
}


/* ============================================================================
 * ナビゲーション：次へ／戻る（履歴モード対応）
 * ========================================================================== */
async function openNext() {
  await withOpLock("OpenNext", async function () {
    try {
      const inHistory = inHistoryView();
      if (state.session.started && !inHistory) {
        const ok = await preflightOutputFolder("openNext");
        if (!ok) { toast("保存を中止しました。［出力先］を設定してください。"); return; }
      }
      if (!state.session.started) {
        // [MOD] 出力先未設定キャンセル後も「次へ」から再開できるよう、ここで手動開始を許容する
        const pending = countPendingJobs();
        if (pending <= 0) { toast("処理対象がありません。ファイルを追加してください。"); return; }
        const ok = await ensureOutputFolderBeforeStart();
        if (!ok) { toast("開始をキャンセルしました。『出力先設定』で保存先を指定してください。"); return; }
        state.session.started = true;
        persist();
        renderStatus();
      }
      ensureSessionNav(false);
      if (inHistory) {
        await saveActiveHistoryPSDAndClose();
        const hist = state.session.historyPSD || [];
        const nextIdx = state.session.historyIndex + 1;
        if (nextIdx < hist.length) {
          await openHistoryAtIndex(nextIdx);

          try { refocusPanelAfterHostOps(); } catch (_) { }
          return;
        } else {
          exitHistoryView();
        }
      } else {
        const hadManaged = !!(state && state.session && state.session.managedDocId != null);
        const docOpen = isDocOpen();
        let savedToken = null;
        if (docOpen) {
          savedToken = await saveCurrentDocIfAny();
          if (hadManaged && savedToken == null) {
            if (_cmLastSaveSkippedUnmanaged) {
              _cmLastSaveSkippedUnmanaged = false;
              toast("管理外のドキュメントが開かれています。キューから開いたファイルを選択してから再実行してください。");
            } else {
              toast("保存に失敗したため次のファイルを開きません。［出力先］を確認してください。");
            }
            return;
          }
        } else if (hadManaged) {
          const now = Date.now ? Date.now() : 0;
          if (now - _cmLastManagedMissingNoticeTs > 800) {
            _cmLastManagedMissingNoticeTs = now;
            toast("管理ドキュメントが閉じられたため、キュー処理を続行します。");
          }
          state.session.managedDocId = null;
          state.session.managedJobIndex = -1;
          persist();
        }
      }
      const idx = nextPendingIndex(state.session.cursor);
      if (idx < 0) {
        toast("すべてのファイルの処理が完了しました。");
        renderStatus(); // 最後のドキュメントの処理後にステータスメッセージを更新
        try { refocusPanelAfterHostOps(); } catch (_) { }
        return;
      }
      state.session.cursor = idx;
      const job = state.session.queue[idx];
      const entry = await entryFromToken(job.token);
      if (!entry) throw new Error("ファイルにアクセスできません。移動/削除された可能性があります。");
      await resolveOutputFolderForCurrentJob();
      await PS3.openDocument(entry);
      try { state.session.managedDocId = app.activeDocument && app.activeDocument._id; } catch (_) { state.session.managedDocId = null; }
      state.session.managedJobIndex = idx;
      exitHistoryView();
      persist();
      renderStatus();
      await updateOutFolderLabel();
      syncExtraOutputControlsFromState();
      toast("開きました：" + job.name);
      const acc = getTplCreateAccordionEl();
      if (acc && isAccordionOpen(acc)) autoInitDpiFromActiveDocument(true);
      refocusPanelAfterHostOps();
    } catch (e) {
      console.error(e);
      toast(e.message || String(e));
      try { renderStatus(); } catch (_) { }
    }
  });
}

/**
 * 「戻る」操作。
 * 仕様変更：保存先チェックより前に「戻れる履歴があるか」を判定する。
 * - 履歴が 2 件未満のときは早期リターンし、誤って保存先選択ダイアログが出ないようにする。
 * - 履歴が十分にある場合のみ現在の管理ドキュメントを保存し、直前の履歴 PSD を開く。
 */
async function openPrevPSD() {
  await withOpLock("OpenPrevPSD", async function () {
    try {
      ensureSessionNav(false);
      if (inHistoryView()) {
        const hist = state.session.historyPSD || [];
        const curIdx = (state.session && typeof state.session.historyIndex === "number") ? state.session.historyIndex : -1;
        const prevIdx = curIdx - 1;
        if (prevIdx < 0 || prevIdx >= hist.length) {
          // [MOD] 履歴が 1 件のみ／先頭表示中はドキュメントを閉じずに中断（S-UI-045/049）
          toast("戻れる項目がありません");
          return;
        }
        await saveActiveHistoryPSDAndClose();
        await openHistoryAtIndex(prevIdx);

        try { refocusPanelAfterHostOps(); } catch (_) { }
        return;
      }
      // ★ 履歴の有無を先に確認
      const hist = state.session.historyPSD || [];
      if (hist.length < 1) {
        // [MOD] 1枚目の保存直後も戻れるよう、履歴ゼロのみブロック（S-UI-045/049）
        toast("戻れる項目がありません");
        return;
      }
      const hasManaged = isManagedQueueDocOpen();
      if (hasManaged) {
        const ok = await preflightOutputFolder("openPrev");
        if (!ok) { toast("保存を中止しました。［出力先］を設定してください。"); return; }
        // 現在編集中の管理ドキュメントを保存し、直前の履歴PSDへ戻る
        await saveCurrentDocIfAny();
        const updatedHist = state.session.historyPSD || [];
        let targetIndex = updatedHist.length - 2; // 今保存した分を除いた1つ前
        if (targetIndex < 0) targetIndex = updatedHist.length - 1; // 履歴が1件しかない場合は最新を開く
        await openHistoryAtIndex(targetIndex);
      } else {
        // 管理ドキュメントが無い（キュー完了直後など）は最新の履歴PSDを開く
        await openHistoryAtIndex(hist.length - 1);
      }

      try { refocusPanelAfterHostOps(); } catch (_) { }
    } catch (e) {
      console.error(e);
      toast(e.message || String(e));
    }
  });
}
/* ============================================================================
 * 入力検証・UI操作（採番・背景・ショートカット・フォーカス）
 * ========================================================================== */
function onDigitsChange() {
  const ds = $("#digitsSel"); if (!ds) return;
  let val = parseInt(ds.value, 10); if (val !== 3 && val !== 4) val = 3;
  state.digits = val;
  state.nextBase = clampBase(state.nextBase);
  persist(); renderStatus();
  // 桁数ドロップダウン操作後もショートカットをすぐ使えるよう、パネルにフォーカスを戻す
  refocusPanelAfterUiToggle();
}
function onBaseChange() {
  const inp = $("#base"); if (!inp) return;
  let v = parseInt(inp.value, 10);
  if (isNaN(v)) { toast("数値を入力してください"); inp.value = String(state.nextBase); return; }
  if (v < 1) { toast("1 以上を指定してください"); v = 1; }
  const max = maxForDigits(state.digits);
  if (v > max) { toast("桁数の最大値を超えています。編集してください"); v = max; }
  state.nextBase = v; persist(); renderStatus();
}
function onDecBase() { state.nextBase = clampBase(state.nextBase - 1); persist(); renderStatus(); }
function onIncBase() {
  const max = maxForDigits(state.digits);
  if (state.nextBase >= max) { toast("桁数の最大値に達しました。次番号を編集してください"); state.nextBase = max; }
  else { state.nextBase += 1; }
  persist(); renderStatus();
}
function onSubModeToggle() {
  const chk = $("#subMode"), sel = $("#subSelect");
  if (!chk || !sel) return;
  const on = !!chk.checked;

  if (!on) {
    const res = finalizeSubMode(false, state.nextBase, state.sub);
    if (res.advanced) {
      if (res.hitMax) {
        toast("桁数の最大値に達しました。次番号を編集してください。");
      }
      ensureExtraOutputStateDefaults();
    }
    state.nextBase = res.nextBase;
    state.sub = res.subChar;
    sel.disabled = true;
    try { sel.setAttribute("disabled", ""); } catch (_) { }
    sel.value = "";
  } else {
    beginSubMode();
    ensureExtraOutputStateDefaults();
    sel.disabled = false;
    try { sel.removeAttribute("disabled"); } catch (_) { }
    if (!sel.value) { sel.value = "A"; }
    state.sub = String(sel.value || "").trim().toUpperCase().slice(0, 1);
  }
  persist(); renderStatus();
  // A-B分けチェックボックス操作後もショートカットをすぐ使えるよう、パネルにフォーカスを戻す
  refocusPanelAfterUiToggle();
}
function onSubSelectChange() {
  const sel = $("#subSelect"); if (!sel) return;
  state.sub = String(sel.value || "").trim().toUpperCase().slice(0, 1);
  persist(); renderStatus();
  // サブ文字ドロップダウン操作後もショートカットをすぐ使えるよう、パネルにフォーカスを戻す
  refocusPanelAfterUiToggle();
}
function onBgEnabled() {
  const el = $("#bgEnabled"); if (!el) return;
  state.bg.enabled = !!el.checked; persist(); renderStatus();
  // 背景オン/オフ操作後もショートカットをすぐ使えるよう、パネルにフォーカスを戻す
  refocusPanelAfterUiToggle();
}
function onBgPad() {
  const el = $("#bgPad"); if (!el) return;
  let v = parseInt(el.value, 10);
  if (!Number.isFinite(v)) { v = state.bg.padding; }
  if (v < 0) v = 0; if (v > 64) v = 64;
  state.bg.padding = v;
  _editingBgPad = false;
  persist(); renderStatus();
}
function onBgPadInput() {
  const el = $("#bgPad"); if (!el) return;
  _editingBgPad = true;
}

/* === ショートカット & フォーカス補助 ============================= */
function getDigitFromEvent(ev) {
  const code = String(ev.code || "");
  const m = code.match(/^(?:Digit([1-9])|Numpad([1-9]))$/);
  if (m) return parseInt(m[1] || m[2], 10);
  const k = String(ev.key || "");
  if (/^[1-9]$/.test(k)) return parseInt(k, 10);
  return null;
}
function isEditingElement(el) {
  if (!el) return false;
  const t = (el.tagName || "").toLowerCase();
  return t === "input" || t === "textarea" || t === "select" || el.isContentEditable;
}
function isInteractiveOrSummary(el) {
  if (!el) return false;
  const t = (el.tagName || "").toLowerCase();
  return t === "button" || t === "select" || t === "summary" || isEditingElement(el);
}

/** SWC（Spectrum Web Components）由来のインタラクティブ要素かどうかを判定
 *  - sp-accordion / sp-accordion-item / sp-button / sp-dropdown / sp-picker / sp-dialog など
 *  - role="button|menu|listbox|combobox|dialog|textbox" を持つ要素も対象
 *  - Enter をグローバルショートカットに割り当てる際の誤発火防止に使用
 */
function isSWCInteractive(el) {
  try {
    if (!el) return false;
    // 直近の祖先3階層まで確認（過度なコストを避ける）
    let node = el;
    for (let i = 0; i < 3 && node; i++) {
      const tag = (node.tagName || "").toLowerCase();
      if (tag && tag.indexOf("sp-") === 0) return true;
      if (typeof node.getAttribute === "function") {
        const role = String(node.getAttribute("role") || "").toLowerCase();
        if (role === "button" || role === "menu" || role === "listbox" ||
          role === "combobox" || role === "dialog" || role === "textbox") return true;
      }
      node = node.parentElement;
    }
  } catch (_) { }
  try {
    if (typeof el.closest === "function") {
      if (el.closest("sp-accordion,sp-accordion-item,sp-button,sp-dialog,sp-dropdown,sp-picker")) return true;
    }
  } catch (_) { }
  return false;
}
function ensureBodyTabbable() {
  const b = document.body;
  if (!b) return;
  if (!b.hasAttribute("tabindex")) b.setAttribute("tabindex", "-1");
}
function focusPanelIfSuitable(fromEl) {
  try {
    if (isEditingElement(fromEl)) return;
    const b = document.body;
    if (b && typeof b.focus === "function") b.focus({ preventScroll: true });
  } catch (_) { }
}
function wireFocusHelpers() {
  ensureBodyTabbable();
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Tab") { setTimeout(() => { focusPanelIfSuitable(ev.target); }, 0); }
  }, true);
  const b = document.body;
  if (b) {
    b.addEventListener("click", function (ev) {
      if (isInteractiveOrSummary(ev.target)) return;
      setTimeout(() => { focusPanelIfSuitable(ev.target); }, 0);
    }, true);
    b.addEventListener("mouseenter", () => { focusPanelIfSuitable(document.activeElement); }, false);
  }
}
function refocusPanelAfterHostOps() {
  ensureBodyTabbable();
  const delays = [0, 120, 300];
  for (const ms of delays) {
    setTimeout(() => {
      try {
        const b = document.body;
        if (b && typeof b.focus === "function") b.focus({ preventScroll: true });
      } catch (_) { }
    }, ms);
  }
}
let _skipToggleRefocus = false;
function refocusPanelAfterUiToggle() {
  if (_skipToggleRefocus) { _skipToggleRefocus = false; return; }
  ensureBodyTabbable();
  const delays = [0, 120];
  for (const ms of delays) {
    setTimeout(() => {
      try {
        const b = document.body;
        if (b && typeof b.focus === "function") b.focus({ preventScroll: true });
      } catch (_) { }
    }, ms);
  }
}

function wireShortcuts() {
  document.addEventListener("keydown", async function (ev) {
    try {
      // モーダル/ダイアログが開いている場合はショートカット無効
      if (document.querySelector('dialog[open]#cm-reset-dialog') ||
        document.querySelector('dialog[open]#cm-out-dialog') ||
        document.querySelector('sp-dialog[open][modal]') ||
        document.getElementById('cm-reset-overlay')) return;
    } catch (_) { }
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? ev.metaKey : ev.ctrlKey;

    // 互換: Cmd/Ctrl+Enter でも実行可（既存ユーザー配慮）
    if (mod && ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      await openNext();
      return;
    }

    // 新仕様: Enter 単体で「次へ」
    if (!ev.shiftKey && !ev.altKey && !ev.metaKey && !ev.ctrlKey && ev.key === "Enter") {
      // 入力中やインタラクティブ要素上では作動させない（誤発火防止）
      const target = ev.target || document.activeElement;
      if (isEditingElement(target) || isInteractiveOrSummary(target) || isSWCInteractive(target)) {
        return;
      }
      ev.preventDefault();
      await openNext();
      return;
    }

    // 数字キー 1..9 で該当行へ配置（編集フィールド内では無効）
    if (isEditingElement(ev.target)) return;
    if (ev.repeat) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const n = getDigitFromEvent(ev);
    if (n == null) return;
    const t = getActiveTemplate();
    const rows = clampRows(t && t.cutBox && typeof t.cutBox.rows === "number" ? t.cutBox.rows : 1);
    if (n > rows) return;
    ev.preventDefault();
    await placeAtRow(n);
  }, true);
}

/* ============================================================================
 * 初期化 & 既存 UI イベント結線（重複排除・安定化）
 * ========================================================================== */
function renderStatusAndOutFolder() { renderStatus(); return updateOutFolderLabel(); }

function addSetOutFolderHandler(btn) {
  btn.addEventListener("click", async function () {
    await withOpLock("SetOutFolder", async function () {
      const folder = await fsmod.getFolder(); if (!folder) return;
      const token = await fsmod.createPersistentToken(folder);
      state.session.outputFolderToken = token;
      persist(); renderStatus(); await updateOutFolderLabel();
      toast("出力先を設定しました（以後は無ダイアログで保存）");
    });
  });
}

function wireTemplateCreateForm() {
  const preset = $("#tplFontSizePreset");
  const sizePt = $("#tplFontSizePt");
  if (sizePt) {
    sizePt.addEventListener("blur", function () { cmCommitFontSizeFromInput(); });
    sizePt.addEventListener("focus", function () {
      try {
        const v = toInt(sizePt.value);
        if (v != null) cmSyncFontPresetToValue(v);
      } catch (_) { }
    });
  }
  if (preset && sizePt) {
    preset.addEventListener("change", function () {
      sizePt.value = preset.value;
      markTplDirty("tplFontSizePreset");
      markTplDirty("tplFontSizePt");
      updateTplCreateEnabled();
    });
  }
  const fontSel = $("#tplFontSel");
  if (fontSel) {
    fontSel.addEventListener("change", function () {
      markTplDirty("tplFontSel");
      updateTplCreateEnabled();
      updateFontDisplayLabel();
    });
  }
  wireFontSelectLazy();
  const watchIds = ["tplName", "tplRows", "tplDpi", "tplFontSizePt", "tplX", "tplY", "tplW", "tplH"];
  const padIds = ["tplPadTop", "tplPadRight", "tplPadBottom", "tplPadLeft"];
  padIds.forEach(id => watchIds.push(id));
  for (let i = 0; i < watchIds.length; i++) {
    const el = document.getElementById(watchIds[i]);
    if (el) {
      el.addEventListener("input", function () { markTplDirty(watchIds[i]); updateTplCreateEnabled(); });
      el.addEventListener("change", function () { markTplDirty(watchIds[i]); updateTplCreateEnabled(); });
    }
  }
  for (let j = 0; j < padIds.length; j++) {
    const el = document.getElementById(padIds[j]);
    if (el) {
      el.addEventListener("blur", function () {
        markTplDirty(padIds[j]);
        validateTplPadding({ silent: false });
        updateTplCreateEnabled();
      });
    }
  }

  // ★ tplRows のバリデーション（blur時）
  const rowsInp = $("#tplRows");
  if (rowsInp) {
    rowsInp.addEventListener("blur", function () {
      let v = toInt(rowsInp.value);
      if (v == null) v = 5; // 不正値はデフォルトへ
      if (v < 1) v = 1;
      if (v > 9) v = 9;
      rowsInp.value = String(v);
      markTplDirty("tplRows");
      updateTplCreateEnabled();
    });
  }

  const readBtn = $("#readBoundsFromSelection");
  if (readBtn) {
    readBtn.addEventListener("click", function () { readBoundsFromSelectionIntoForm(); });
  }
  const createBtn = $("#tplCreate");
  if (createBtn) {
    createBtn.addEventListener("click", onTemplateCreate);
  }
}

function wireUI() {
  // テンプレ選択
  const tplSel = $("#tplSelect");
  if (tplSel) tplSel.addEventListener("change", function (e) {
    try { setActiveTemplate(e.target.value); renderTemplateUI(); renderStatus(); }
    catch (err) { toast(err.message); }
    updateTemplateDeleteEnabled();
    refocusPanelAfterUiToggle();
  });

  // テンプレ削除（内蔵/ユーザー問わず）
  const tplDel = $("#tplDelete");
  if (tplDel) tplDel.addEventListener("click", async function () {
    const sel = $("#tplSelect");
    const id = sel && sel.value;
    if (!id) { toast("テンプレートが選択されていません"); return; }
    try {
      await withOpLock("DeleteTemplate", async function () {
        const rep = await deleteTemplateById(id);
        if (rep && rep.removedFrom === "internal") {
          toast("内蔵テンプレートを非表示にしました");
        } else {
          toast("テンプレートを削除しました");
        }
        if (rep && rep.restoredDefault) {
          toast("すべてのテンプレートが削除されたため、内蔵既定テンプレートを復元しました");
        }
      });
    } catch (e) {
      toast(e && e.message ? e.message : String(e));
    } finally {
      renderTemplateUI();
      renderStatus();
      updateTemplateDeleteEnabled();
    }
  });
  try { updateTemplateDeleteEnabled(); } catch (_) { }

  wireTemplateCreateForm();

  // 採番
  const digitsSel = $("#digitsSel");
  if (digitsSel) digitsSel.addEventListener("change", onDigitsChange);
  const baseInp = $("#base");
  if (baseInp) baseInp.addEventListener("change", onBaseChange);
  const decBtn = $("#decBase");
  if (decBtn) decBtn.addEventListener("click", onDecBase);
  const incBtn = $("#incBase");
  if (incBtn) incBtn.addEventListener("click", onIncBase);

  // サブ
  const subMode = $("#subMode");
  if (subMode) {
    subMode.addEventListener("pointerdown", (ev) => { _skipToggleRefocus = !!ev.shiftKey; }, true);
    subMode.addEventListener("change", onSubModeToggle);
  }
  const subSel = $("#subSelect");
  if (subSel) subSel.addEventListener("change", onSubSelectChange);

  // 配置
  const selBtn = $("#placeAtSelection");
  if (selBtn) selBtn.addEventListener("click", function () { placeAtSelection(); });

  // 背景
  const bgEnabled = $("#bgEnabled");
  if (bgEnabled) {
    bgEnabled.addEventListener("pointerdown", (ev) => { _skipToggleRefocus = !!ev.shiftKey; }, true);
    bgEnabled.addEventListener("change", onBgEnabled);
  }
  const bgPad = $("#bgPad");
  if (bgPad) {
    bgPad.addEventListener("input", onBgPadInput);
    bgPad.addEventListener("change", onBgPad);
    bgPad.addEventListener("blur", onBgPad);
  }

  // 入出力
  const addFolderBtn = $("#addFolder");
  if (addFolderBtn) addFolderBtn.addEventListener("click", function () { addFolderToQueue(); });
  const addFilesBtn = $("#addFiles");
  if (addFilesBtn) addFilesBtn.addEventListener("click", function () { addFilesToQueue(); });

  const setOutBtn = $("#setOutFolder");
  if (setOutBtn) addSetOutFolderHandler(setOutBtn);

  // 追加出力
  const extraOutToggle = $("#extraOutputEnabled");
  if (extraOutToggle) {
    extraOutToggle.addEventListener("pointerdown", (ev) => { _skipToggleRefocus = !!ev.shiftKey; }, true);
    extraOutToggle.addEventListener("change", onExtraOutputToggle);
  }
  const extraOutFormat = $("#extraOutputFormat");
  if (extraOutFormat) {
    extraOutFormat.addEventListener("change", onExtraOutputFormatChange);
  }


  // ナビゲーション
  const openNextBtn = $("#openNext");
  if (openNextBtn) openNextBtn.addEventListener("click", function () { openNext(); });
  const backBtn = $("#backBtn");
  if (backBtn) backBtn.addEventListener("click", function () { openPrevPSD(); });
}

/**
 * 自動開始：pending 0 のアイドル状態から追加されたときだけ起動
 * - 履歴ビュー / 管理外ドキュメント編集中は起動しない
 * - 出力先未設定の場合は ensureOutputFolderBeforeStart() で確認し、キャンセルなら中止
 */
async function autoStartQueueIfIdle(reason) {
  try {
    if (!state || !state.session) return;
    if (state.session.started) return;
    if (inHistoryView()) return;
    if (isManagedQueueDocOpen()) return;
    const pending = countPendingJobs();
    if (pending <= 0) return;
    debugLog("autostart/check", "pending=" + pending + " reason=" + (reason || ""));
    const ok = await ensureOutputFolderBeforeStart();
    if (!ok) {
      toast("自動開始を中止しました。『出力先設定』で保存先を指定してください。");
      return;
    }
    state.session.started = true;
    persist();
    renderStatus();
    await openNext();
  } catch (e) {
    console.error("[CutMark] autoStartQueueIfIdle:", e);
    toast(e && (e.message || String(e)));
  }
}

/* ============================================================================
 * Dialog theming (host-theme aware)
 * ========================================================================== */
function ensureDialogThemeStyles() {
  // styles are defined in styles.css（S-AX-504/505/506）
}

/* ============================================================================
 * Reset Button (new)
 * ========================================================================== */
async function softResetLikeStartup() {
  restore();
  ensureSessionNav(true);
ensureExtraOutputStateDefaults();
  await loadTemplatesAndSelectActive();
  renderTemplateUI();
  renderStatus();
  await updateOutFolderLabel();
  syncExtraOutputControlsFromState();
  const acc = getTplCreateAccordionEl();
  if (acc && isAccordionOpen(acc)) {
    applyActiveTemplateDefaultsToForm();
    autoInitDpiFromActiveDocument(false);
    updateTplCreateEnabled();
  }
  try { enableAutoWidthOnOpenForPickers(); } catch (_) { }
  try { wireFontSelectLazy(); } catch (_) { }
  toast("パネル状態を初期化しました。");
}
function isManagedQueueDocOpen() {
  if (!isDocOpen()) return false;
  let curId = null;
  try { curId = app.activeDocument && app.activeDocument._id; } catch (_) { curId = null; }
  const a = (curId != null) ? String(curId) : "";
  const b = (state && state.session && state.session.managedDocId != null) ? String(state.session.managedDocId) : "";
  const equal = !!(a && b && a === b);
  try { console.debug("[CutMark Debug]isManagedQueueDocOpen", { activeId: a, managedId: b, equal }); } catch (_) { }
  return equal;
}

/**
 * 確認ダイアログ（リセット用）を生成して表示する。
 * - innerHTML を使わずに DOM を構築し textContent を設定することで XSS と改行欠落の問題を防止。
 * - .desc クラス + white-space: pre-wrap で \n を正しく改行表示。
 * - UXP のテーマ変数 (--uxp-host-*) に完全依存し、視認性の低い固定フォールバック色は使用しない。
 */
async function showResetConfirmDialog(message) {
  try { console.log("[CM] reset/confirm/open(<dialog>)"); } catch (_) { }
  try {
    const old = document.getElementById("cm-reset-dialog");
    if (old) old.remove();
  } catch (_) { }
  const dlg = document.createElement("dialog");
  dlg.id = "cm-reset-dialog";
  dlg.classList.add("cm-modal");
  try { ensureDialogThemeStyles(); } catch (_) { }
  dlg.setAttribute("role", "dialog");
  dlg.setAttribute("aria-modal", "true");
  dlg.setAttribute("aria-labelledby", "cm-reset-title");
  dlg.style.padding = "0";
  dlg.style.border = "1px solid var(--uxp-host-border-color, #555)";
  dlg.style.borderRadius = "8px";
  dlg.style.background = "var(--uxp-host-background-color)";
  dlg.style.color = "var(--uxp-host-text-color)";
  dlg.style.minWidth = "360px";
  dlg.style.maxWidth = "560px";
  dlg.style.boxShadow = "0 10px 24px rgba(0,0,0,.45)";

  // --- Build form DOM (no innerHTML; preserve line breaks) ---
  const form = document.createElement("form");
  form.method = "dialog";
  form.style.margin = "0";
  form.style.padding = "16px";
  form.style.display = "flex";
  form.style.flexDirection = "column";
  form.style.gap = "12px";

  const h2 = document.createElement("h2");
  h2.id = "cm-reset-title";
  h2.textContent = "確認";

  const desc = document.createElement("div");
  desc.className = "desc";
  desc.textContent = String(message || "");
  // white-space is handled in CSS (.desc { white-space: pre-wrap; })

  const buttonBar = document.createElement("div");
  buttonBar.className = "buttons";

  const cancelBtn = document.createElement("button");
  cancelBtn.id = "cm-reset-cancel";
  cancelBtn.value = "cancel";
  cancelBtn.textContent = "キャンセル";

  const okBtn = document.createElement("button");
  okBtn.id = "cm-reset-ok";
  okBtn.value = "ok";
  okBtn.textContent = "OK";
  okBtn.autofocus = true;
  okBtn.style.fontWeight = "600";

  buttonBar.appendChild(cancelBtn);
  buttonBar.appendChild(okBtn);

  form.appendChild(h2);
  form.appendChild(desc);
  form.appendChild(buttonBar);
  dlg.appendChild(form);

  dlg.addEventListener("cancel", (ev) => { try { ev.preventDefault(); dlg.close("cancel"); } catch (_) { } });

  document.body.appendChild(dlg);

  // wire events
  form.addEventListener("submit", (ev) => { try { ev.preventDefault(); ev.stopPropagation(); dlg.close("ok"); } catch (_) { } });
  okBtn.addEventListener("click", (ev) => { try { ev.preventDefault(); ev.stopPropagation(); dlg.close("ok"); } catch (_) { } });
  cancelBtn.addEventListener("click", (ev) => { try { ev.preventDefault(); ev.stopPropagation(); dlg.close("cancel"); } catch (_) { } });
  dlg.addEventListener("keydown", (ev) => {
    try {
      if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); dlg.close("ok"); }
      else if (ev.key === "Escape" || ev.key === "Esc") { ev.preventDefault(); ev.stopPropagation(); dlg.close("cancel"); }
    } catch (_) { }
  }, { capture: true });
  setTimeout(() => { try { okBtn && okBtn.focus({ preventScroll: true }); } catch (_) { } }, 0);

  let result = "cancel";
  try { result = await dlg.showModal(); }
  finally { try { dlg.remove(); } catch (_) { } }
  const ok = (String(result) === "ok");
  try { console.log("[CM] reset/confirm/decide", { ok }); } catch (_) { }
  return ok;
}
async function onResetRequest() {
  try {
    ensureSessionNav(false);
    const needConfirm = (isManagedQueueDocOpen() || inHistoryView()) || (isDocOpen() && !!(state && state.session && state.session.started));
    if (needConfirm) {
      const ok = await showResetConfirmDialog(
        "キュー管理中の画像、または履歴PSDを開いています。\n" +
        "保存して閉じてからリセットを実行します。よろしいですか？"
      );
      if (!ok) { toast("リセットを中止しました"); return; }
    }
    return await withOpLock("Reset", async function () {
      try {
        ensureSessionNav(false);
        let __prevId = null;
        try { __prevId = app && app.activeDocument ? app.activeDocument._id : null; } catch (_) { __prevId = null; }
        if (inHistoryView()) {
          await saveActiveHistoryPSDAndClose();
        } else if (isManagedQueueDocOpen()) {
          await saveCurrentDocIfAny();
        }
        try {
          if (typeof waitForDocClosedById === "function") {
            await waitForDocClosedById(__prevId, 2000);
          }
        } catch (_) { }
        await softResetLikeStartup();
        try { refocusPanelAfterHostOps(); } catch (_) { }
      } catch (e) {
        console.error(e);
        throw e;
      }
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
}
function ensureResetButton() {
  if (document.getElementById("resetBtn")) return;
  const acc = document.getElementById("io");
  const anchor = document.getElementById("setOutFolder");
  const btn = document.createElement("button");
  btn.id = "resetBtn";
  btn.textContent = "リセット";
  btn.title = "起動直後と同様に状態を初期化します";
  btn.addEventListener("click", onResetRequest);
  if (anchor && anchor.parentElement) {
    const row = anchor.closest(".pair") || anchor.parentElement;
    anchor.insertAdjacentElement("afterend", btn);
    return;
  }
  if (acc) {
    const section = acc.querySelector(".section") || acc;
    const row = document.createElement("div");
    row.className = "row";
    row.appendChild(btn);
    section.appendChild(row);
  }
}

/* ============================================================================
 * DOM 準備後にブート
 * ========================================================================== */
async function init() {
  try {
    restore();
    state.bg.enabled = false;
    ensureSessionNav(true);
ensureExtraOutputStateDefaults();
    await loadTemplatesAndSelectActive();
    wireUI(); wireShortcuts(); wireFocusHelpers(); wireFocusIndicator(); wireTplCreateAccordion(); ensureFixedRowButtons(); if (typeof DEBUG_DIAG !== "undefined" && DEBUG_DIAG) bindDiagnostics();
    wireFontChooser();
    try { setTimeout(function () { warmupFontList(); }, 0); } catch (_) { }
    renderTemplateUI(); renderStatus();
    updateFontDisplayLabel();
    await updateOutFolderLabel();
    syncExtraOutputControlsFromState();
    const acc = getTplCreateAccordionEl();
    if (acc && isAccordionOpen(acc)) {
      applyActiveTemplateDefaultsToForm();
      autoInitDpiFromActiveDocument(false);
      updateTplCreateEnabled();
    }
    ensureResetButton();
    try { enableAutoWidthOnOpenForPickers(); } catch (_) { }
    focusPanelIfSuitable(document.activeElement);
    toast("準備完了：『フォルダ追加』『ファイル追加』から読み込んで開始");
  } catch (e) {
    console.error(e);
    toast(e.message || String(e));
  }
}

/* ============================================================================
 * [CM-AW-PICKER] sp-picker のメニューを開いた時だけ幅を自動拡張
 * ========================================================================== */
function enableAutoWidthOnOpenForPickers() {
  const pairs = [
    ["#tplSelect", "#tplSelectMenu"],
  ];
  pairs.forEach(([pid, mid]) => {
    const p = document.querySelector(pid);
    const m = document.querySelector(mid);
    if (p && m) setupAutoWidthPicker(p, m, { maxPx: 680, margin: 24 });
  });
}
function setupAutoWidthPicker(picker, menu, opts) {
  if (!picker || !menu || picker._cmAwPicker) return;
  picker._cmAwPicker = true;
  const MAX_PX = (opts && opts.maxPx) || 680;
  const MARGIN = (opts && opts.margin) || 24;
  const apply = () => {
    try {
      const vw = document.documentElement ? document.documentElement.clientWidth : (window.innerWidth || 800);
      const cap = Math.max(320, Math.min(MAX_PX, vw - MARGIN));
      const triggerW = picker.getBoundingClientRect().width;
      const itemW = measureMenuItemsWidthPx(menu);
      const want = Math.min(cap, Math.max(triggerW, itemW));
      if (!menu._cmPrevMinWidth) menu._cmPrevMinWidth = menu.style.minWidth;
      menu.style.minWidth = Math.ceil(want) + "px";
      if (picker._cmPrevMinWidth === undefined) picker._cmPrevMinWidth = picker.style.minWidth;
      picker.style.minWidth = Math.ceil(want) + "px";
      menu.style.whiteSpace = "nowrap";
      menu.style.overflowX = "auto";
      menu.classList.add("cm-aw-open");
    } catch (_) { }
  };
  const reset = () => {
    try {
      menu.classList.remove("cm-aw-open");
      if (menu._cmPrevMinWidth !== undefined) {
        menu.style.minWidth = menu._cmPrevMinWidth;
        delete menu._cmPrevMinWidth;
      } else {
        menu.style.minWidth = "";
      }
      menu.style.whiteSpace = "";
      menu.style.overflowX = "";
    } catch (_) { }
  };
  picker.addEventListener("sp-opened", apply, { capture: true });
  picker.addEventListener("pointerdown", apply, { capture: true });
  picker.addEventListener("keydown", (ev) => {
    if (ev.key === "F4" || (ev.altKey && ev.key === "ArrowDown") || ev.key === " ") apply();
  }, { capture: true });
  picker.addEventListener("sp-closed", () => setTimeout(reset, 0), { capture: true });
  picker.addEventListener("change", () => setTimeout(reset, 0), { capture: true });
}
function measureMenuItemsWidthPx(menu) {
  const cs = getComputedStyle(menu);
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const border = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  const meas = document.createElement("span");
  meas.style.position = "absolute";
  meas.style.visibility = "hidden";
  meas.style.whiteSpace = "nowrap";
  meas.style.fontFamily = cs.fontFamily;
  meas.style.fontSize = cs.fontSize;
  meas.style.fontWeight = cs.fontWeight;
  meas.style.fontStyle = cs.fontStyle;
  meas.style.letterSpacing = cs.letterSpacing;
  document.body.appendChild(meas);
  let maxText = 0;
  const items = Array.from(menu.querySelectorAll("option"));
  for (const it of items) {
    const label = (it && (it.label || it.textContent || "")).trim();
    meas.textContent = label;
    const w = meas.getBoundingClientRect().width;
    if (w > maxText) maxText = w;
  }
  document.body.removeChild(meas);
  return Math.ceil(maxText + pad + border + 2);
}
(function bootstrap() {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else
    init();
})();

// === helper: wait for document close (UI fallback; ps.js override if available) ===
async function waitForDocClosedById(prevId, timeoutMs) {
  try {
    let PS3m = null; try { PS3m = require("./ps"); } catch (_) { }
    if (PS3m && typeof PS3m.waitForDocumentClosedById === "function") {
      return await PS3m.waitForDocumentClosedById(prevId, timeoutMs);
    }
  } catch (_) { }
  const deadline = Date.now() + ((typeof timeoutMs === "number" && timeoutMs > 0) ? timeoutMs : 2000);
  function currentId() { try { return app && app.activeDocument ? app.activeDocument._id : null; } catch (_) { return null; } }
  while (Date.now() < deadline) {
    const cid = currentId();
    if (!cid || cid !== prevId) return true;
    await new Promise(res => setTimeout(res, 50));
  }
  console.warn("[CM] waitForDocClosedById/timeout", { prevId });
  return false;
}

/* ============================================================================
 * 出力先未設定時の警告とフォルダ選択（<dialog>）
 * ========================================================================== */

/**
 * 出力先未設定時の警告ダイアログ。
 * - メッセージは textContent で設定し、\n による改行を pre-wrap で忠実に表示。
 * - 旧実装の #ddd フォールバック色がテーマと不整合だったため撤廃し、
 *   --uxp-host-text-color に統一してテーマ追従の視認性を担保。
 */
async function ensureOutputFolderBeforeStart() {
  try {
    if (state && state.session) {
      const valid = await getUsableOutputFolderFromToken(state.session.outputFolderToken);
      if (valid) return true;
      if (state.session.outputFolderToken && !valid) {
        // 無効トークンを検知したらクリアしてラベルを未設定に戻す
        state.session.outputFolderToken = null;
        persist(); await updateOutFolderLabel();
      }
    }
    // [MOD] 出力先未設定時は現在ジョブから自動決定を試みる
    const autoSet = await tryAutoSetOutputFromCurrentJob();
    if (autoSet) return true;
    try { const old = document.getElementById("cm-out-dialog"); if (old) old.remove(); } catch (_) { }
    const dlg = document.createElement("dialog");
    dlg.id = "cm-out-dialog";
    dlg.classList.add("cm-modal");
    try { ensureDialogThemeStyles(); } catch (_) { }
    dlg.style.margin = "0";
    dlg.style.padding = "0";
    dlg.style.border = "none";
    dlg.style.borderRadius = "8px";
    dlg.style.background = "var(--uxp-host-background-color)";
    dlg.style.color = "var(--uxp-host-text-color)";
    dlg.style.minWidth = "360px";
    dlg.style.maxWidth = "560px";
    dlg.style.boxShadow = "0 10px 24px rgba(0,0,0,.45)";

    // --- Build form DOM (no innerHTML; preserve line breaks) ---
    const form = document.createElement("form");
    form.method = "dialog";
    form.style.margin = "0";
    form.style.padding = "16px";
    form.style.display = "flex";
    form.style.flexDirection = "column";
    form.style.gap = "12px";

    const h2 = document.createElement("h2");
    h2.id = "cm-out-title";
    h2.textContent = "出力先フォルダが未設定です";

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = "保存先のフォルダを選択してください。\n以後はダイアログなしで自動保存されます。";

    const buttonBar = document.createElement("div");
    buttonBar.className = "buttons";

    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cm-out-cancel";
    cancelBtn.value = "cancel";
    cancelBtn.textContent = "キャンセル";

    const chooseBtn = document.createElement("button");
    chooseBtn.id = "cm-out-choose";
    chooseBtn.value = "ok";
    chooseBtn.textContent = "フォルダを選択…";
    chooseBtn.autofocus = true;
    chooseBtn.style.fontWeight = "600";

    buttonBar.appendChild(cancelBtn);
    buttonBar.appendChild(chooseBtn);

    form.appendChild(h2);
    form.appendChild(desc);
    form.appendChild(buttonBar);
    dlg.appendChild(form);

    dlg.addEventListener("cancel", (ev) => { try { ev.preventDefault(); dlg.close("cancel"); } catch (_) { } });
    document.body.appendChild(dlg);

    if (chooseBtn) {
      chooseBtn.addEventListener("click", async function (ev) {
        try {
          ev.preventDefault(); ev.stopPropagation();
          const folder = await fsmod.getFolder();
          if (!folder) { dlg.close("cancel"); return; }
          const token = await fsmod.createPersistentToken(folder);
          state.session.outputFolderToken = token;
          persist(); await updateOutFolderLabel();
          toast("出力先を設定しました");
          dlg.close("ok");
        } catch (err) {
          console.warn("[CutMark] outFolder/choose failed:", err);
          toast("出力先の設定に失敗しました: " + (err && (err.message || String(err))));
          try { dlg.close("cancel"); } catch (_) { }
        }
      }, { capture: true });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", (ev) => { try { ev.preventDefault(); ev.stopPropagation(); dlg.close("cancel"); } catch (_) { } }, { capture: true });
    }
    const result = await dlg.showModal().catch(() => "cancel");
    try { dlg.remove(); } catch (_) { }
    return (result === "ok") || (state && state.session && state.session.outputFolderToken);
  } catch (e) {
    console.warn("[CutMark] ensureOutputFolderBeforeStart error:", e);
    try {
      const folder = await fsmod.getFolder();
      if (folder) {
        const token = await fsmod.createPersistentToken(folder);
        state.session.outputFolderToken = token;
        persist(); await updateOutFolderLabel();
        return true;
      }
    } catch (_) { }
    return false;
  }
}
// =========================================================================
// フォーカスインジケータ（Top bar の小円）の配線と状態同期
//  - 目的: パネルがキーボードフォーカスを持つか（ショートカットが有効か）を可視化
//  - 仕様: 非フォーカス時のみクリック可能（クリックでパネル本体へ focus）
//  - 注意: 既存の wireFocusHelpers()（Tab/クリック/mouseenter でのフォーカス補助）とは独立
//          表示同期のみを担当し、既存ロジックを改変しない
// ============================================================================
function wireFocusIndicator() {
  try {
    var dot = document.getElementById("cmFocusDot");
    if (!dot) return; // index.html に含まれていない場合は無視

    // マウスがパネル外に出たことを「要注意状態」として扱うためのフラグ
    // - true の間は「フォーカスがあるか不確実なので安全側で非フォーカス扱い」にする
    // - パネル内へマウスが戻るか、ユーザーがインジケータをクリックしたらクリアする
    var pseudoBlurFromPointer = false;

    // --- 状態更新ロジック -------------------------------------------------
    function applyDot(has) {
      try {
        // クラス切替（CSS は .is-focused / .is-blurred で記述）
        var on = !!has;
        dot.classList.toggle("is-focused", on);
        dot.classList.toggle("is-blurred", !on);
        // アクセシビリティ（視覚ラベルは出さない要件のため title のみ補助）
        dot.title = on
          ? "ショートカット有効（パネルにフォーカスあり）"
          : "クリックでパネルにフォーカスを戻す";
      } catch (_) { }
    }

    function updateFocusDot(force) {
      var has = (typeof force === "boolean")
        ? force
        : (typeof document.hasFocus === "function" ? document.hasFocus() : true);
      applyDot(!!has);
    }

    // Photoshop ホスト側の状態も加味して（ツールがモーダル中なら非フォーカス扱い）
    async function updateFocusFromHost() {
      try {
        var has = (typeof document.hasFocus === "function" ? document.hasFocus() : true);

        // マウスがパネル外に出ている間は「安全側」で非フォーカス扱いにする
        if (pseudoBlurFromPointer) {
          has = false;
        }

        try {
          if (core && typeof core.getActiveTool === "function") {
            var info = await core.getActiveTool(); // {title, key, classID, isModal}
            if (info && info.isModal) has = false; // キャンバス上でドラッグ等のモーダル操作中
          }
        } catch (_) { /* getActiveTool 非対応/失敗時は DOM のみで判定 */ }
        applyDot(!!has);
      } catch (_) { }
    }

    // --- パネル外へのマウス移動をヒューリスティックとして扱う -----------------
    function onPanelPointerLeave() {
      try {
        // パネル外にマウスが出た = 誤操作が起こり得る状態なので、インジケータを消灯
        pseudoBlurFromPointer = true;
        applyDot(false);
      } catch (_) { }
    }

    function onPanelPointerEnter() {
      try {
        // パネル内にマウスが戻ったら、実際のフォーカス状態に基づいて再評価
        pseudoBlurFromPointer = false;
        updateFocusFromHost();
      } catch (_) { }
    }

    // --- クリック（インジケータが「非フォーカス」表示のときのみ有効） --------
    function onDotClick(ev) {
      try {
        // 見かけ上「非フォーカス」状態のときのみ、明示的にフォーカス復帰を試みる
        var isBlur = dot.classList.contains("is-blurred");
        if (isBlur) {
          // クリックを機に、ポインタ由来の擬似ブラー状態はクリアする
          pseudoBlurFromPointer = false;
          // 既存の補助に合わせて body へ安全にフォーカス
          focusPanelIfSuitable(document.activeElement);
          // 少し遅延して状態反映（UXP のイベント順序対策）
          setTimeout(function () { updateFocusFromHost(); }, 30);
        }
        // クリック時に余計な副作用を避ける（既存 body の click 捕捉は idempotent）
        ev.preventDefault();
        ev.stopPropagation();
      } catch (_) { }
    }

    // --- イベント購読（取りこぼし防止で複数のソースを監視） ---------------
    // パネル内の DOM フォーカス変化は従来通り維持（仕様 3.2）
    dot.addEventListener("click", onDotClick, false);
    try { dot.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); }, true); } catch (_) { }

    document.addEventListener("focusin", function () { updateFocusFromHost(); }, true);
    document.addEventListener("focusout", function () { setTimeout(function () { updateFocusFromHost(); }, 0); }, true);
    try {
      window.addEventListener("focus", function () { updateFocusFromHost(); }, false);
      window.addEventListener("blur", function () { updateFocusFromHost(); }, false);
    } catch (_) { /* UXP 環境によっては未実装 */ }
    try {
      document.addEventListener("visibilitychange", function () { updateFocusFromHost(); }, false);
    } catch (_) { }
    try {
      if (document.body) {
        // パネル内にマウスが入った/出たタイミングでヒューリスティックを更新
        document.body.addEventListener("mouseenter", function () { onPanelPointerEnter(); }, false);
        document.body.addEventListener("mouseleave", function () { onPanelPointerLeave(); }, false);
      }
    } catch (_) { }

    // === Photoshop ホストイベントの購読（完全イベントドリブン） ===
    if (!dot._cmHostEvtWired) {
      dot._cmHostEvtWired = true;

      // 1) ツールのモーダル状態変化（可能なら最優先で使用）
      try {
        if (action && typeof action.addNotificationListener === "function") {
          var onAnyAction = function (/*name, desc*/) { try { updateFocusFromHost(); } catch (_) { } };
          // UXP/PS のバージョン差を考慮しつつ、代表的な通知に登録
          // - 未対応のイベントは無視される／例外は握りつぶす
          try { action.addNotificationListener([{ event: 'toolModalStateChanged' }], onAnyAction); } catch (_) { }
          // 2) 代表的なツール／操作系イベント（ブラシ・移動・変形 等）
          try {
            action.addNotificationListener([
              { event: 'transform' }, { event: 'move' }, { event: 'draw' }, { event: 'paint' },
              { event: 'make' }, { event: 'set' }, { event: 'select' }, { event: 'translate' }
            ], onAnyAction);
          } catch (_) { }
        }
      } catch (_) { }

      // 3) コア UI/OS 系の変化もトリガとして補助（WS 切替など）
      try {
        if (core && typeof core.addNotificationListener === "function") {
          var onCoreUi = function (/*name, desc*/) { try { updateFocusFromHost(); } catch (_) { } };
          try {
            core.addNotificationListener('UI', [
              'activationChanged', 'panelVisibilityChanged',
              'workspaceDragStarted', 'workspaceDragCompleted',
              'interactiveResizeBegin', 'interactiveResizeEnd'
            ], onCoreUi);
          } catch (_) { }
        }
      } catch (_) { }
    }

    // 初期状態の反映
    updateFocusFromHost();
  } catch (e) {
    console.warn("[FocusIndicator] wiring failed:", e);
  }
}










