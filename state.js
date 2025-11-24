/**
 * CutMark - Photoshop UXP Plugin
 * 
 * Copyright (c) 2025 stechdrive
 * Released under the MIT license
 */

/**
 * state.js
 * ---------------------------------------------------------------------------
 * テンプレv2（内蔵=readOnly / ユーザー=readWrite）のロード＆前回選択復元、
 * 採番状態・背景色設定・ジョブ管理を行うモジュール。
 *
 * 【簡略化ポリシー】
 *  - 途中再開時のレイヤー走査（既存番号スキャン）は行わない
 *  - 次番号はユーザーが随時編集可（重複はユーザー責任）
 *  - 通常配置でのみ自動インクリメント／サブ付き配置はインクリメントしない
 *  - 「床に戻す」＝ 1 に戻す
 *
 * 重要：
 *  - JSON読み込みは formats.utf8 を使用
 *  - ActionDescriptorは本モジュールでは扱わない（PS操作は ps.js 側）
 */
"use strict";

const fsmod = require("uxp").storage.localFileSystem;
const formats = require("uxp").storage.formats;

/* ============================================================================
 * アプリ状態（採番・背景色・セッション）
 * ========================================================================== */
const state = {
  // 採番（ユーザー編集可）
  digits: 3,            // 3 or 4（UIのプルダウンで変更）
  nextBase: 1,          // 次に置くベース番号（1以上）
  sub: "",              // サブ文字（"" or A..Z）
  autoClearSub: true,   // （互換保持）
  subPlacedSinceSubOn: false, // [MOD] サブON中に配置が行われたか

  // 走査は行わないが、互換のため保持（未使用）
  usedLabels: new Set(),
  maxPlacedBase: 0,

  // 背景色 — 既定を **OFF**
  bg: { enabled: false, padding: 4, color: [255, 255, 255] },

  // セッション（ジョブ）
  session: {
    version: 1,
    inputMode: null,            // "folder" | "files"
    outputFolderToken: null,    // 永続トークン（※起動時はクリア）
    queue: [],                  // { token, name, dstRel, state: "pending|done|error", srcDirToken? }
    cursor: 0,
    lastSavedIndex: -1,
    autoAdvance: true,
    started: false,
    managedDocId: null,
    managedJobIndex: -1,
    historyPSD: [],             // 保存履歴（PSD の永続トークン）
    historyCursor: -1,          // （互換）履歴閲覧インデックス（-1 = 非履歴）
    historyOutFolderTokens: [], // [MOD] 履歴PSDごとの親フォルダ永続トークン（追加出力用）

    // 追加出力（絵コンテ）オプション
    extraOutputEnabled: false,  // true のとき PSD に加えて JPG/PNG も保存
    extraOutputFormat: "jpg"    // "jpg" | "png"
  }
};

/* 内部既定：起動時の安全デフォルトへ戻す（in-place 初期化） */
function _resetAllToDefaults() {
  // 採番・背景（安全値）
  state.digits = 3;
  state.nextBase = 1;
  state.sub = "";
  state.autoClearSub = true;
  state.subPlacedSinceSubOn = false;
  state.usedLabels = new Set();
  state.maxPlacedBase = 0;
  state.bg = { enabled: false, padding: 4, color: [255, 255, 255] };

  // セッション（ジョブ）…キューは必ず空、出力先は未設定、開始フラグは false
  state.session.inputMode = null;
  state.session.outputFolderToken = null;
  state.session.queue = [];
  state.session.cursor = 0;
  state.session.lastSavedIndex = -1;
  state.session.autoAdvance = true;
  state.session.started = false;
  state.session.managedDocId = null;
  state.session.managedJobIndex = -1;
  state.session.historyPSD = [];
  state.session.historyCursor = -1;
  state.session.historyOutFolderTokens = [];
  state.session.extraOutputEnabled = false;
  state.session.extraOutputFormat = "jpg";

  // 旧保存キーの掃除（移行/安全策）
  try { localStorage.removeItem("cutNumber.state"); } catch (_) { }
}

/* ============================================================================
 * テンプレ管理
 * ========================================================================== */
let internalTemplates = { version: 2, presets: [], default: null };
let userTemplates = { version: 2, presets: [], default: null };
let activeTemplateId = null;

/** 内蔵テンプレ読み込み（プラグイン直下 templates.json） */
async function loadInternalTemplates() {
  try {
    const pf = await fsmod.getPluginFolder();
    const ent = await pf.getEntry("templates.json");
    const txt = await ent.read({ format: formats.utf8 });
    internalTemplates = normalizeTemplatesJson(JSON.parse(txt));
  } catch {
    internalTemplates = { version: 2, presets: [], default: null };
  }
}

/** ユーザーテンプレ file（データフォルダ user_templates.json） */
async function getUserTemplatesFile() {
  const df = await fsmod.getDataFolder();
  try {
    return await df.getEntry("user_templates.json");
  } catch {
    const f = await df.createFile("user_templates.json", { overwrite: true });
    await f.write(JSON.stringify({ version: 2, presets: [] }, null, 2), { format: formats.utf8 });
    return f;
  }
}

/** ユーザーテンプレ読み込み／保存 */
async function loadUserTemplates() {
  try {
    const f = await getUserTemplatesFile();
    const txt = await f.read({ format: formats.utf8 });
    userTemplates = normalizeTemplatesJson(JSON.parse(txt));
  } catch {
    userTemplates = { version: 2, presets: [], default: null };
  }
}
async function saveUserTemplates() {
  const f = await getUserTemplatesFile();
  await f.write(JSON.stringify(userTemplates, null, 2), { format: formats.utf8 });
}

/**
 * JSONの正規化（足りないキーを既定で補完）
 * - 背景色の `opacity` は仕様から削除：入力に含まれていても出力には含めない
 * - 行数（1..9）、フォントサイズpt（8..50）などのクランプを追加
 */
function normalizeTemplatesJson(json) {
  const v = Number(json && json.version) || 2;
  const list = Array.isArray(json && json.presets) ? json.presets : [];
  const out = { version: v, presets: [], default: (json && json.default) || null };

  function int(n, def) { n = Number(n); return (isFinite(n) ? Math.round(n) : def); }
  function clamp(n, lo, hi) { const x = int(n, lo); return (x < lo) ? lo : (x > hi ? hi : x); }
  function pos(n, def) { n = Number(n); return (isFinite(n) && n > 0) ? Math.round(n) : def; }

  for (let i = 0; i < list.length; i++) {
    const p = list[i] || {};
    const rows = clamp((p.cutBox && p.cutBox.rows), 1, 9);
    const sizePt = clamp(p.text && p.text.sizePt, 8, 50);
    const w = pos(p.cutBox && p.cutBox.w, 0);
    const h = pos(p.cutBox && p.cutBox.h, 0);

    let pad = {
      top: int(p.boxPadding && p.boxPadding.top, 12),
      right: int(p.boxPadding && p.boxPadding.right, 6),
      bottom: int(p.boxPadding && p.boxPadding.bottom, 8),
      left: int(p.boxPadding && p.boxPadding.left, 6)
    };

    pad = sanitizeBoxPadding({ w, h }, pad);

    out.presets.push({
      id: String(p.id || ""),
      label: String(p.label || p.id || "unnamed"),
      dpi: pos(p.dpi, 150),

      cutBox: {
        x: int(p.cutBox && p.cutBox.x, 0),
        y: int(p.cutBox && p.cutBox.y, 0),
        w, h, rows
      },

      boxPadding: pad,

      text: {
        fontPSName: (p.text && p.text.fontPSName) || "Arial-Black",
        sizePt,
        align: (p.text && p.text.align) || "center",
        colorRGB: Array.isArray(p.text && p.text.colorRGB) ? p.text.colorRGB.slice(0, 3) : [0, 0, 0],
        strokePx: int(p.text && p.text.strokePx, 2),
        strokeRGB: Array.isArray(p.text && p.text.strokeRGB) ? p.text.strokeRGB.slice(0, 3) : [255, 255, 255],
        tracking: int(p.text && p.text.tracking, 0),
        hyphenate: !!(p.text && p.text.hyphenate),
        compose: (p.text && p.text.compose) || "singleLine",
        noBreak: !!(p.text && p.text.noBreak),
        breakSubToNextLine: !!(p.text && (p.text.breakSubToNextLine != null ? p.text.breakSubToNextLine : true)),
        leadingMode: (p.text && p.text.leadingMode) || "auto",
        leadingPercent: int(p.text && p.text.leadingPercent, 100)
      },

      // 背景色（opacity は破棄）
      bg: {
        enabled: !!(p.bg && (p.bg.enabled != null ? p.bg.enabled : false)),
        mode: (p.bg && p.bg.mode) || "followText",
        paddingPx: int(p.bg && p.bg.paddingPx, 6),
        colorRGB: Array.isArray(p.bg && p.bg.colorRGB) ? p.bg.colorRGB.slice(0, 3) : [255, 255, 255]
      }
    });
  }
  return out;
}

/**
 * boxPadding を安全値へクランプする
 * - 負値を 0 に丸め、内側幅/高さが 1px 未満にならないよう縮める
 * - cutBox.w/h が 1 以下のときは余白をすべて 0 にする
 * @param {{w:number,h:number}} cutBox
 * @param {{top:number,right:number,bottom:number,left:number}} padding
 * @returns {{top:number,right:number,bottom:number,left:number}}
 */
function sanitizeBoxPadding(cutBox, padding) {
  function int(v, def) { v = Number(v); return (isFinite(v) ? Math.round(v) : def); }
  let w = int(cutBox && cutBox.w, 0);
  let h = int(cutBox && cutBox.h, 0);
  let top = Math.max(0, int(padding && padding.top, 0));
  let right = Math.max(0, int(padding && padding.right, 0));
  let bottom = Math.max(0, int(padding && padding.bottom, 0));
  let left = Math.max(0, int(padding && padding.left, 0));

  if (w <= 1) { left = 0; right = 0; }
  if (h <= 1) { top = 0; bottom = 0; }

  function clampW() {
    let innerW = w - (left + right);
    if (innerW >= 1) return;
    const deficit = 1 - innerW;
    let reduceL = Math.min(left, Math.floor(deficit / 2));
    let reduceR = Math.min(right, deficit - reduceL);
    left -= reduceL;
    right -= reduceR;
    innerW = w - (left + right);
    if (innerW < 1) {
      const need = 1 - innerW;
      const moreL = Math.min(left, need);
      left -= moreL;
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
  }

  function clampH() {
    let innerH = h - (top + bottom);
    if (innerH >= 1) return;
    const deficit = 1 - innerH;
    let reduceT = Math.min(top, Math.floor(deficit / 2));
    let reduceB = Math.min(bottom, deficit - reduceT);
    top -= reduceT;
    bottom -= reduceB;
    innerH = h - (top + bottom);
    if (innerH < 1) {
      const need = 1 - innerH;
      const moreT = Math.min(top, need);
      top -= moreT;
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
  }

  if (w > 1) clampW();
  if (h > 1) clampH();

  return { top, right, bottom, left };
}

/** 列挙・検索・アクティブ */
function listAllPresets() {
  const a = internalTemplates.presets.map(p => Object.assign({ source: "internal" }, p));
  const b = userTemplates.presets.map(p => Object.assign({ source: "user" }, p));
  return a.concat(b);
}


/** 可視テンプレ一覧（内蔵の「非表示ID」を除外したリスト） */
function listVisiblePresets() {
  const hidden = getHiddenInternalIdsSet();
  const a = internalTemplates.presets
    .filter(p => !hidden.has(p.id))
    .map(p => Object.assign({ source: "internal" }, p));
  const b = userTemplates.presets.map(p => Object.assign({ source: "user" }, p));
  return a.concat(b);
}
function findPresetById(id) {
  const all = listAllPresets();
  for (let i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}
function getActiveTemplate() {
  const p = findPresetById(activeTemplateId);
  if (p) return p;

  const d = internalTemplates.default && findPresetById(internalTemplates.default);
  if (d) return d;

  if (internalTemplates.presets.length) return internalTemplates.presets[0];
  if (userTemplates.presets.length) return userTemplates.presets[0];

  // ダミー（UI側で配置無効化）
  return {
    id: "dummy", label: "dummy", dpi: 150,
    cutBox: { x: 60, y: 152, w: 57, h: 290, rows: 5 },
    boxPadding: { top: 12, right: 6, bottom: 8, left: 6 },
    text: {
      fontPSName: "Arial-Black", sizePt: 12, align: "center", colorRGB: [0, 0, 0],
      strokePx: 2, strokeRGB: [255, 255, 255], tracking: 0, hyphenate: false, compose: "singleLine",
      noBreak: false, breakSubToNextLine: true, leadingMode: "auto", leadingPercent: 100
    },
    bg: { enabled: true, mode: "followText", paddingPx: 6, colorRGB: [255, 255, 255] }
  };
}
function setActiveTemplate(id) {
  const p = findPresetById(id);
  if (!p) throw new Error("指定IDのテンプレが見つかりません: " + id);
  activeTemplateId = id;
  // ★ 永続化対象は「最後に使用したテンプレート」のみ
  localStorage.setItem("cutmark.template.selectedId", id);
}

/** 起動時ロード＆前回選択復元（最後に使用したテンプレのみ永続） */

async function loadTemplatesAndSelectActive() {
  await loadInternalTemplates();
  await loadUserTemplates();

  // 起動直後に「可視テンプレ」が 0 件なら、内蔵デフォルトを復元しつつユーザーJSONにも複製する
  try {
    const visible = listVisiblePresets();
    if (visible.length === 0) {
      const fallback = (internalTemplates.default && internalTemplates.presets.find(p => p.id === internalTemplates.default))
        || internalTemplates.presets[0]
        || null;
      if (fallback) {
        // 内蔵デフォルトを必ず可視化（hidden set から当該IDを除去）
        const s = getHiddenInternalIdsSet();
        if (s.has(fallback.id)) {
          s.delete(fallback.id);
          setHiddenInternalIdsSet(s);
        }
        // ユーザー側 JSON にも 1 件復元しておく（将来の可視確保）
        const clone = Object.assign({}, fallback);
        clone.id = makeUniqueIdFromLabel(fallback.label || fallback.id || "preset");
        clone.label = String(fallback.label || fallback.id || "preset") + "（復元）";
        const normalized = normalizeTemplatesJson({ version: 2, presets: [clone] }).presets[0];
        userTemplates.presets.push(normalized);
        await saveUserTemplates();

        // 既定テンプレートとして内蔵デフォルトを選択
        setActiveTemplate(fallback.id);
        return;
      }
    }
  } catch (_) { /* ignore */ }

  // ここからは従来の復元手順
  const last = localStorage.getItem("cutmark.template.selectedId");
  if (last && findPresetById(last)) { activeTemplateId = last; return; }

  if (internalTemplates.default && findPresetById(internalTemplates.default)) {
    activeTemplateId = internalTemplates.default; return;
  }
  const first = (listVisiblePresets()[0]) || listAllPresets()[0];
  if (first) { activeTemplateId = first.id; return; }
  activeTemplateId = "dummy";
}


/** スラグ生成（重名回避） */
function makeUniqueIdFromLabel(label) {
  const base = String(label || "preset").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_\-]/g, "") || "preset";
  const set = new Set(listAllPresets().map(p => p.id));
  let id = base, i = 1;
  while (set.has(id)) id = base + "-" + (i++);
  return id;
}

/**
 * （互換）選択境界→テンプレ新規作成→ユーザー保存→アクティブ化
 * 旧UI「選択→テンプレ作成」向け。新UIでは createTemplateFromInputs を使用。
 */
async function createTemplateFromSelection(opts) {
  const name = opts && opts.name;
  const rows = (opts && typeof opts.rows === "number") ? opts.rows : 5;
  if (!name || !String(name).trim()) throw new Error("テンプレ名を入力してください");

  const active = getActiveTemplate();
  const preset = {
    id: makeUniqueIdFromLabel(name),
    label: String(name),
    dpi: active.dpi || 150,
    cutBox: { x: active.cutBox.x, y: active.cutBox.y, w: active.cutBox.w, h: active.cutBox.h, rows },
    boxPadding: Object.assign({}, active.boxPadding),
    text: Object.assign({}, active.text),
    bg: Object.assign({}, active.bg)
  };

  // 正規化を一度通してから保存
  const normalized = normalizeTemplatesJson({ version: 2, presets: [preset] }).presets[0];
  userTemplates.presets.push(normalized);
  await saveUserTemplates();
  setActiveTemplate(normalized.id);
}

/**
 * 新UI：フォーム入力からテンプレ新規作成→ユーザー保存→アクティブ化
 */
async function createTemplateFromInputs(o) {
  // クリップ＆検証
  function int(n, def) { n = Number(n); return (isFinite(n) ? Math.round(n) : def); }
  function clamp(n, lo, hi) { const x = int(n, lo); return (x < lo) ? lo : (x > hi ? hi : x); }
  function pos(n, def) { n = Number(n); return (isFinite(n) && n > 0) ? Math.round(n) : def; }

  const name = String(o && o.name || "").trim();
  if (!name) throw new Error("テンプレ名を入力してください");
  const rows = clamp(o.rows, 1, 9);
  const dpi = pos(o.dpi, 150);

  const cx = int(o.cutBox && o.cutBox.x, 0);
  const cy = int(o.cutBox && o.cutBox.y, 0);
  const cw = pos(o.cutBox && o.cutBox.w, 1);
  const ch = pos(o.cutBox && o.cutBox.h, 1);

  const fontPSName = String(o && o.text && o.text.fontPSName || "").trim();
  if (!fontPSName) throw new Error("フォント（PS名）を指定してください");
  let sizePt = clamp(o.text && o.text.sizePt, 8, 50);
  if (sizePt == null) sizePt = 12;

  // 継承（既定はアクティブテンプレ）＋オーバーライド
  const base = (o && o.inheritFromActive === false) ? null : getActiveTemplate();

  const basePad = base ? Object.assign({}, base.boxPadding) :
    { top: 12, right: 6, bottom: 8, left: 6 };
  const rawPad = {
    top: int(o.boxPadding && o.boxPadding.top, basePad.top),
    right: int(o.boxPadding && o.boxPadding.right, basePad.right),
    bottom: int(o.boxPadding && o.boxPadding.bottom, basePad.bottom),
    left: int(o.boxPadding && o.boxPadding.left, basePad.left)
  };

  const preset = {
    id: makeUniqueIdFromLabel(name),
    label: name,
    dpi: dpi,

    cutBox: { x: cx, y: cy, w: cw, h: ch, rows: rows },

    boxPadding: sanitizeBoxPadding({ w: cw, h: ch }, rawPad),

    text: (function () {
      const t = base ? Object.assign({}, base.text) : {
        fontPSName: "Arial-Black", sizePt: 12, align: "center", colorRGB: [0, 0, 0],
        strokePx: 2, strokeRGB: [255, 255, 255], tracking: 0, hyphenate: false, compose: "singleLine",
        noBreak: false, breakSubToNextLine: true, leadingMode: "auto", leadingPercent: 100
      };
      t.fontPSName = fontPSName;
      t.sizePt = sizePt;
      return t;
    })(),

    bg: base ? Object.assign({}, base.bg) :
      { enabled: true, mode: "followText", paddingPx: 6, colorRGB: [255, 255, 255] }
  };

  // 正規化を一度通してから保存
  const normalized = normalizeTemplatesJson({ version: 2, presets: [preset] }).presets[0];
  userTemplates.presets.push(normalized);
  await saveUserTemplates();
  setActiveTemplate(normalized.id);
}

/* ============================================================================
 * 採番ユーティリティ（重複はユーザー責任）
 * ==========================================================================*/

function maxForDigits(d) { return (d === 4) ? 9999 : 999; }
/** 0埋め */
function pad(n, d) { return String(n).padStart(d, "0"); }
/** ラベル生成（次番号+サブ） */
function labelOf() { const base = pad(state.nextBase, state.digits); return base + (state.sub || ""); }
/** 床の概念を廃止：常に 1 に戻す */
function floorBase() { return 1; }
/** 1以上のみ検証（重複や履歴には依存しない） */
function validateBaseInput(n) {
  if (n < 1) throw new Error("次番号は 1 以上を指定してください");
}

/** サブモード開始（フラグ初期化） */
function beginSubMode() {
  state.subPlacedSinceSubOn = false;
}

/** サブ付き配置完了時にフラグをセット */
function markSubPlacement() {
  state.subPlacedSinceSubOn = true;
}

/**
 * サブモード終了時の番号確定
 * - on=true: 状態を変えず返却
 * - on=false かつサブ配置済み: 次番号を +1（桁上限内）
 * - on=false: サブ文字はクリア
 */
function finalizeSubMode(on, currentNextBase, currentSub) {
  const res = { nextBase: currentNextBase, subChar: currentSub, advanced: false, hitMax: false };
  if (!on) {
    if (state.subPlacedSinceSubOn) {
      const max = maxForDigits(state.digits);
      res.advanced = true;
      if (currentNextBase >= max) {
        res.nextBase = max;
        res.hitMax = true;
      } else {
        res.nextBase = currentNextBase + 1;
      }
    }
    res.subChar = "";
    state.subPlacedSinceSubOn = false;
  }
  return res;
}

/** 途中再開時のスキャンは行わない（no-op） */
async function syncFromDocument() { /* intentionally no-op */ }

/* ============================================================================
 * 設定永続化
 * ==========================================================================*/

/**
 * ★新方針：永続化は「最後に使用したテンプレート」のみ（setActiveTemplate で保存）
 * 本関数は互換のため残すが、起動後の採番／出力先などは永続化しない（no-op）。
 */
function persist() {
  // intentionally no-op
}

/**
 * ★新方針：起動時（パネルロード/再表示）に安全なデフォルトへ強制リセット
 * 旧バージョンで保存された cutNumber.state は読み取らず、削除する。
 */
function restore() {
  _resetAllToDefaults();
}

/* ============================================================================
 * ジョブ I/O（フォルダ/ファイル追加・保存系）
 * ==========================================================================*/

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".psd"]);

function extOfName(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

async function tokenOf(entry) {
  return fsmod.createPersistentToken(entry);
}

async function entryFromToken(token) {
  return fsmod.getEntryForPersistentToken(token);
}

function enqueueFileEntry(entry, dstRel, srcDirToken) {
  state.session.queue.push({
    token: entry.token,
    name: entry.name,
    dstRel: dstRel,
    srcDirToken: srcDirToken || null,
    state: "pending"
  });
}

function normalizeDstRel(name) {
  const i = name.lastIndexOf(".");
  const base = i >= 0 ? name.slice(0, i) : name;
  return base + ".psd";
}

function nextPendingIndex(from) {
  const start = (typeof from === "number") ? from : 0;
  for (let i = start; i < state.session.queue.length; i++) {
    if (state.session.queue[i].state === "pending") return i;
  }
  return -1;
}

/**
 * 永続トークンが有効なフォルダを指すか検証して返す（無効なら null）
 */
async function getUsableOutputFolderFromToken(token) {
  if (!token) return null;
  try {
    const e = await entryFromToken(token);
    if (e && (e.isFolder || typeof e.getEntries === "function" || typeof e.createFile === "function")) {
      return e;
    }
  } catch (_) { }
  return null;
}

/**
 * 出力先用フォルダへの書き込み権限を要求するヘルパー。
 * - requestPermission が無い場合（旧 Entry）でも動作を止めない。
 */
async function requestReadWriteIfNeeded(entry) {
  if (!entry || typeof entry.requestPermission !== "function") return true;
  try {
    const res = await entry.requestPermission({ mode: "readwrite" });
    return res === "granted";
  } catch (e) {
    console.warn("[CutMark] requestPermission(readwrite) failed:", e);
    return false;
  }
}

/**
 * 指定フォルダ直下に output フォルダを用意し、永続トークンを返す。
 * - 既に存在する場合は getEntry で再利用し、重複作成エラーを避ける。
 * - baseFolderEntry が無効な場合は null を返す。
 * - opts.requestWrite = true のときは書き込み権限を事前要求する。
 */
async function prepareOutputFolderUnder(baseFolderEntry, opts) {
  if (!baseFolderEntry || typeof baseFolderEntry.getEntry !== "function") return null;
  const options = opts || {};
  if (options.requestWrite) {
    const granted = await requestReadWriteIfNeeded(baseFolderEntry);
    if (!granted) return null;
  }
  try {
    let outFolder = null;
    try { outFolder = await baseFolderEntry.getEntry("output"); } catch (_) { outFolder = null; }
    if (!outFolder) {
      // 既存の同名フォルダがあるときの例外を避けるため、事前に存在確認を行う
      outFolder = await baseFolderEntry.createFolder("output");
    }
    const token = await fsmod.createPersistentToken(outFolder);
    return { folder: outFolder, token: token };
  } catch (e) {
    console.warn("[CutMark] failed to prepare output folder:", e);
    return null;
  }
}

/**
 * 現在のキューのジョブから出力先を決定し、必要なら output/ を生成する。
 * - outputFolderToken が既に有効ならそれを再利用
 * - srcDirToken（フォルダ追加経由）があれば優先的に使用
 * - 無い場合は入力ファイルの親フォルダ直下に output/ を生成
 */
async function resolveOutputFolderForCurrentJob() {
  if (state.session.outputFolderToken) {
    const reusable = await getUsableOutputFolderFromToken(state.session.outputFolderToken);
    if (reusable) return reusable;
  }

  const idx = state.session.cursor;
  const job = state.session.queue[idx];
  if (!job || !job.token) throw new Error("出力先が未設定で、現在ジョブも特定できません。");

  // 1) フォルダ追加経由の srcDirToken を優先
  if (job.srcDirToken) {
    try {
      const dir = await entryFromToken(job.srcDirToken);
      if (dir && (dir.isFolder || typeof dir.getEntries === "function")) {
        const prepared = await prepareOutputFolderUnder(dir);
        if (prepared && prepared.folder && prepared.token) {
          state.session.outputFolderToken = prepared.token;
          persist();
          return prepared.folder;
        }
      }
    } catch (_) { /* fallthrough */ }
  }

  // 2) 入力ファイルの親フォルダを使う
  const srcEntry = await entryFromToken(job.token);
  let parent = null;
  try {
    if (srcEntry && typeof srcEntry.getParent === "function") parent = await srcEntry.getParent();
    else if (srcEntry && srcEntry.parent) parent = srcEntry.parent;
  } catch (_) { parent = null; }
  if (!parent || !(parent.isFolder || typeof parent.getEntries === "function")) {
    throw new Error("出力先フォルダが未設定です。『出力先選択』ボタンで指定してください。");
  }
  const prepared = await prepareOutputFolderUnder(parent);
  if (!prepared || !prepared.folder || !prepared.token) {
    throw new Error("出力先フォルダの作成に失敗しました。別のフォルダを選択してください。");
  }
  state.session.outputFolderToken = prepared.token;
  persist();
  return prepared.folder;
}

/* ============================================================================
 * exports
 * ==========================================================================*/
/* ============================================================================
 * Template deletion & internal hide overlay
 * ----------------------------------------------------------------------------
 * - User templates are physically removed from user_templates.json.
 * - Internal (bundled) templates are "soft-deleted" by recording their IDs
 *   into localStorage (cutmark.template.hiddenInternalIds). listAllPresets()
 *   filters using this set.
 * - If deletion results in no visible templates, the hidden set is cleared
 *   and the built-in default is re-selected to satisfy the "always operable"
 *   requirement.
 * ========================================================================== */

/** Load hidden internal template id set from localStorage. */
function getHiddenInternalIdsSet() {
  try {
    const raw = localStorage.getItem("cutmark.template.hiddenInternalIds");
    const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    const s = new Set();
    for (let i = 0; i < arr.length; i++) {
      const id = arr[i];
      if (typeof id === "string" && id) s.add(id);
    }
    return s;
  } catch (_) { return new Set(); }
}

/** Persist hidden internal template id set into localStorage. */
function setHiddenInternalIdsSet(set) {
  try {
    localStorage.setItem(
      "cutmark.template.hiddenInternalIds",
      JSON.stringify(Array.from(set))
    );
  } catch (_) {/* ignore */ }
}

/** Clear the hidden-internal set (restore all built-ins). */
function clearHiddenInternalIds() {
  try { localStorage.removeItem("cutmark.template.hiddenInternalIds"); } catch (_) { }
}

/**
 * Delete a template by its id. For internal templates we "soft-delete"
 * by hiding the id; for user templates we remove and rewrite the data file.
 * Returns a small report object for UI messaging.
 */
async function deleteTemplateById(id) {
  if (!id) throw new Error("テンプレートIDを指定してください");
  const report = { removedFrom: null, restoredDefault: false, activeChanged: false, newActiveId: null };

  // 1) Try remove from user templates
  const idx = userTemplates.presets.findIndex(p => p.id === id);
  if (idx >= 0) {
    userTemplates.presets.splice(idx, 1);
    await saveUserTemplates();
    report.removedFrom = "user";
  } else {
    // 2) Soft-delete from internal by hiding
    const existsInInternal = internalTemplates.presets.some(p => p.id === id);
    if (!existsInInternal) throw new Error("指定IDのテンプレが見つかりません: " + id);
    const s = getHiddenInternalIdsSet();
    s.add(id);
    setHiddenInternalIdsSet(s);
    report.removedFrom = "internal";
  }


  // 3) 可視テンプレが 0 件になっていないかを最優先で確認し、必要なら復元する
  const __visible = listVisiblePresets();
  if (__visible.length === 0) {
    // 内蔵の既定テンプレート（なければ最初）を復元対象にする
    const fallback = (internalTemplates.default && internalTemplates.presets.find(p => p.id === internalTemplates.default))
      || internalTemplates.presets[0]
      || null;
    if (fallback) {
      // 3-a) 内蔵デフォルトを「非表示セット」から除外（= 可視化）
      try {
        const _s = getHiddenInternalIdsSet();
        if (_s.has(fallback.id)) {
          _s.delete(fallback.id);
          setHiddenInternalIdsSet(_s);
        }
      } catch (_) { }

      // 3-b) 内蔵デフォルトを「既定（アクティブ）」として選択
      try { setActiveTemplate(fallback.id); } catch (_) { }

      report.activeChanged = true;
      report.restoredDefault = true;
      report.newActiveId = fallback.id;
    }
  } else if (!findPresetById(activeTemplateId)) {
    // アクティブが消えた場合は、可視の先頭を選択
    const next = __visible[0] || listAllPresets()[0] || null;
    if (next) {
      setActiveTemplate(next.id);
      report.activeChanged = true;
      report.newActiveId = next.id;
    }
  }
  return report;
}

module.exports = {
  // 状態
  state,

  // テンプレ
  loadTemplatesAndSelectActive,
  listAllPresets,
  listVisiblePresets,
  getActiveTemplate,
  setActiveTemplate,
  deleteTemplateById,
  createTemplateFromSelection,
  createTemplateFromInputs,   // 新UI

  // 設定
  restore,
  persist,
  syncFromDocument,

  // 採番
  pad,
  labelOf,
  floorBase,
  validateBaseInput,
  beginSubMode,
  markSubPlacement,
  finalizeSubMode,

  // ジョブ
  ALLOWED_EXT,
  extOfName,
  tokenOf,
  entryFromToken,
  enqueueFileEntry,
  normalizeDstRel,
  nextPendingIndex,

  // 出力先解決
  getUsableOutputFolderFromToken,
  requestReadWriteIfNeeded,
  prepareOutputFolderUnder,
  resolveOutputFolderForCurrentJob
};
