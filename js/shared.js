/* 基础工具。加载顺序：shared-storage.js → shared.js → 其余 shared 模块。 */
const _escapeMap = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => _escapeMap[character]);
}

const CONSTANTS = Object.freeze({
  MAX_TOAST_COUNT: 5,
  TOAST_DEFAULT_DURATION: 3000,
  TOAST_TRANSITION_MS: 300,
  STORAGE_ERROR_DURATION: 6000,
  MAX_IMPORT_FILE_SIZE: 10 * 1024 * 1024,
  STORAGE_DEBOUNCE_MS: 300,
  LEADERBOARD_MAX_ENTRIES: 10,
  SAVE_VERSION: 1,
  PLAYER_NAME_MAX_LENGTH: 12,
});

function reportStorageError(error, operation) {
  console.error(`本地存储${operation}失败:`, error);
  if (typeof showToast === 'function') {
    showToast(`本地存储${operation}失败，数据尚未完整保存，请重试或导出存档。`, 'error', CONSTANTS.STORAGE_ERROR_DURATION);
  }
}

const Storage = new SharedStorage.GameStorage({
  backend: localStorage,
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: timer => clearTimeout(timer),
  reportError: reportStorageError,
  delay: CONSTANTS.STORAGE_DEBOUNCE_MS,
});

const PLAYER_PROFILE_KEY = 'player_profile';
function loadPlayerProfile() {
  const profile = Storage.get(PLAYER_PROFILE_KEY, {});
  return profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
}
function savePlayerProfile(profile) {
  return Storage.set(PLAYER_PROFILE_KEY, profile);
}
function getPlayerName() {
  return String(loadPlayerProfile().name ?? '').trim();
}

/* --- 工具函数 --- */
function formatNumber(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e12) return (value / 1e12).toFixed(1) + '万亿';
  if (abs >= 1e8) return (value / 1e8).toFixed(1) + '亿';
  if (abs >= 1e4) return (value / 1e4).toFixed(1) + '万';
  return value.toLocaleString('zh-CN');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* --- 数学/游戏工具（从 knife.js 提取，供各游戏复用） --- */
function rnd(min, max) { return Math.random() * (max - min) + min; }
function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function lerp(a, b, t) { return a + (b - a) * t; }

class ObjectPool {
  constructor(factory, reset, initialSize = 0) {
    this._factory = factory;
    this._reset = reset;
    this._pool = [];
    for (let i = 0; i < initialSize; i++) this._pool.push(factory());
  }
  acquire(...args) {
    const obj = this._pool.length > 0 ? this._pool.pop() : this._factory();
    this._reset(obj, ...args);
    return obj;
  }
  release(obj) { this._pool.push(obj); }
  releaseAll(arr) {
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].alive) this._pool.push(arr[i]);
    }
  }
}

function filterAlive(arr) {
  let write = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].alive) arr[write++] = arr[i];
  }
  arr.length = write;
}

/* ========== 五行系统 ========== */
const FIVE_ELEMENTS = {
  metal: { name: '金', icon: '🗡️', strong: 'wood', weak: 'fire', color: '#FFD700' },
  wood:  { name: '木', icon: '🌿', strong: 'earth', weak: 'metal', color: '#228B22' },
  water: { name: '水', icon: '💧', strong: 'fire', weak: 'earth', color: '#1E90FF' },
  fire:  { name: '火', icon: '🔥', strong: 'metal', weak: 'water', color: '#FF4500' },
  earth: { name: '土', icon: '⛰️', strong: 'water', weak: 'wood', color: '#8B4513' }
};
function elementBonus(attackerElement, defenderElement) {
  if (!attackerElement || !defenderElement) return 1.0;
  const el = FIVE_ELEMENTS[attackerElement];
  if (!el) return 1.0;
  if (el.strong === defenderElement) return 1.3;
  if (el.weak === defenderElement) return 0.7;
  return 1.0;
}

/* 排行榜按成绩排列，所有条目由 Storage 返回独立副本。 */
function updateLeaderboard(gameKey, score, extra = {}) {
  if (!Number.isFinite(score)) return;
  const key = `leaderboard_${gameKey}`;
  const board = Storage.get(key, []);
  const entry = { ...extra, score, date: Date.now() };
  if (!entry.name && getPlayerName()) entry.name = getPlayerName();
  const next = [...board, entry].sort((left, right) => right.score - left.score);
  Storage.set(key, next.slice(0, CONSTANTS.LEADERBOARD_MAX_ENTRIES));
}
function getLeaderboard(gameKey) {
  return Storage.get(`leaderboard_${gameKey}`, []);
}


/* ========== 失败激励语 ========== */
const ENCOURAGEMENT_MESSAGES = [
  '大道三千，失败亦是修行',
  '跌倒不可怕，可怕的是不敢再站起来',
  '此战虽败，道心更坚！',
  '百折不挠，方成大道',
  '每一次失败，都是离成功更近一步',
  '前路漫漫，但修仙之心不灭',
  '天道酬勤，下次定能成功！',
  '输了不亏，经验已到手',
  '失败乃成功之母，加油！',
  '退一步海阔天空，进一步破浪前行',
  '修仙路上无坦途，再来一次又何妨？',
  '道友莫急，厚积薄发终有时',
  '磨刀不误砍柴工，回去提升实力吧',
  '心态稳住，胜利就在前方',
  '仙路坎坷，越挫越勇！',
];
function getEncouragement() {
  return ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
}
