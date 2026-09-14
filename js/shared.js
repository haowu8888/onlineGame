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
<<<<<<< HEAD
  SAVE_VERSION: 1,
  PLAYER_NAME_MAX_LENGTH: 12,
});

function reportStorageError(error, operation) {
  console.error(`本地存储${operation}失败:`, error);
  if (typeof showToast === 'function') {
    showToast(`本地存储${operation}失败，数据尚未完整保存，请重试或导出存档。`, 'error', CONSTANTS.STORAGE_ERROR_DURATION);
=======
  SAVE_VERSION: 2,
};

const PHASE2_RESET_CONFIRM_KEY = 'phase2_reset_confirmations';
const PHASE2_SAVE_RESET_CONFIG = Object.freeze({
  cultivation: Object.freeze({
    version: 2,
    label: '修仙之路',
    patterns: [/^cultivation_save_/]
  }),
  cardtower: Object.freeze({
    version: 2,
    label: '斩仙塔',
    patterns: [/^cardtower_/, /^xianyuan_tower_bonuses$/]
  }),
  guigu: Object.freeze({
    version: 2,
    label: '鬼谷八荒',
    patterns: [/^guigu_save_/, /^xianyuan_guigu_bonuses$/]
  })
});

/* --- Storage工具 (带防抖写入) --- */
const Storage = (() => {
  const _pendingWrites = new Map();
  let _debounceTimer = null;

  function _flushWrites() {
    const failedKeys = [];
    for (const [key, value] of _pendingWrites) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        if (e.name === 'QuotaExceededError' || (e.message && e.message.indexOf('quota') !== -1)) {
          failedKeys.push(key);
          continue; // 保留在pending中稍后重试
        }
        console.warn(`Storage写入失败 [${key}]:`, e.message);
      }
    }
    if (failedKeys.length > 0) {
      // 仅清除成功写入的项，保留失败项
      for (const key of _pendingWrites.keys()) {
        if (!failedKeys.includes(key)) _pendingWrites.delete(key);
      }
      if (typeof showToast === 'function') {
        showToast('本地存储空间不足，部分数据未保存。建议导出存档后清理浏览器数据。', 'error', 6000);
      }
    } else {
      _pendingWrites.clear();
    }
    _debounceTimer = null;
>>>>>>> c9bbd8eb26f5d0172912965d532fd8c38cf17b25
  }
}

const Storage = new SharedStorage.GameStorage({
  backend: localStorage,
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: timer => clearTimeout(timer),
  reportError: reportStorageError,
  delay: CONSTANTS.STORAGE_DEBOUNCE_MS,
});

<<<<<<< HEAD
=======
function getPhase2ResetMarks() {
  const marks = Storage.get(PHASE2_RESET_CONFIRM_KEY, {});
  return marks && typeof marks === 'object' && !Array.isArray(marks) ? marks : {};
}

function getLocalStorageKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
  } catch {
    return keys;
  }
  return keys;
}

function matchesPhase2ResetPattern(key, patterns) {
  return patterns.some(pattern => pattern.test(key));
}

function ensurePhase2SaveReset(gameId) {
  const config = PHASE2_SAVE_RESET_CONFIG[gameId];
  if (!config) return { status: 'unsupported', cleared: 0, version: null };

  const marks = getPhase2ResetMarks();
  if (marks[gameId] === config.version) {
    return { status: 'already-confirmed', cleared: 0, version: config.version };
  }

  const message = `${config.label} 已升级到阶段2新版。\n确认后将清空该玩法旧档与相关联动数据，且本次变更不兼容旧进度。\n是否继续？`;
  if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm(message)) {
    return { status: 'cancelled', cleared: 0, version: config.version };
  }

  Storage.flush();
  let cleared = 0;
  getLocalStorageKeys().forEach((key) => {
    if (!matchesPhase2ResetPattern(key, config.patterns)) return;
    Storage.remove(key);
    cleared += 1;
  });

  const nextMarks = { ...marks, [gameId]: config.version };
  Storage.setImmediate(PHASE2_RESET_CONFIRM_KEY, nextMarks);
  return { status: 'reset', cleared, version: config.version };
}

window.Phase2SaveReset = Object.freeze({
  ensure: ensurePhase2SaveReset,
  getConfig(gameId) {
    return PHASE2_SAVE_RESET_CONFIG[gameId] || null;
  }
});

/* --- 数据导出/导入 --- */
 
/* --- Player profile (global nickname) --- */
>>>>>>> c9bbd8eb26f5d0172912965d532fd8c38cf17b25
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


<<<<<<< HEAD
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
=======
  function playTone(freq, dur, type, vol, ramp) {
    if (!enabled) return;
    var c = getCtx(); if (!c) return;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (ramp) o.frequency.linearRampToValueAtTime(ramp, c.currentTime + dur);
    g.gain.setValueAtTime((vol || 1) * volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime); o.stop(c.currentTime + dur);
  }

  function getNoiseBuffer(dur) {
    var c = getCtx(); if (!c) return null;
    var bufSize = Math.floor(c.sampleRate * dur);
    // 复用已缓存的噪声buffer（长度相近即可）
    if (_noiseBufferCache && _noiseBufferCache.length >= bufSize) {
      return _noiseBufferCache;
    }
    var buf = c.createBuffer(1, bufSize, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    _noiseBufferCache = buf;
    return buf;
  }

  function playNoise(dur, vol) {
    if (!enabled) return;
    var c = getCtx(); if (!c) return;
    var buf = getNoiseBuffer(dur);
    if (!buf) return;
    var src = c.createBufferSource();
    var g = c.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime((vol || 0.3) * volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(g); g.connect(c.destination);
    src.start(c.currentTime);
  }

  var SOUNDS = {
    click:       function() { playTone(800, 0.08, 'square', 0.3); },
    hover:       function() { playTone(600, 0.05, 'sine', 0.15); },
    success:     function() { playTone(523, 0.12, 'sine', 0.4); setTimeout(function(){ playTone(659, 0.12, 'sine', 0.4); }, 100); setTimeout(function(){ playTone(784, 0.2, 'sine', 0.4); }, 200); },
    error:       function() { playTone(200, 0.15, 'square', 0.3); setTimeout(function(){ playTone(150, 0.2, 'square', 0.3); }, 120); },
    levelup:     function() { playTone(440, 0.1, 'sine', 0.5); setTimeout(function(){ playTone(554, 0.1, 'sine', 0.5); }, 80); setTimeout(function(){ playTone(659, 0.1, 'sine', 0.5); }, 160); setTimeout(function(){ playTone(880, 0.3, 'sine', 0.5); }, 240); },
    coin:        function() { playTone(988, 0.06, 'square', 0.25); setTimeout(function(){ playTone(1319, 0.1, 'square', 0.25); }, 60); },
    hit:         function() { playNoise(0.1, 0.4); playTone(150, 0.1, 'sawtooth', 0.3); },
    heal:        function() { playTone(440, 0.15, 'sine', 0.3, 880); },
    card:        function() { playNoise(0.06, 0.2); playTone(400, 0.06, 'sine', 0.2); },
    defeat:      function() { playTone(440, 0.2, 'sawtooth', 0.4); setTimeout(function(){ playTone(349, 0.2, 'sawtooth', 0.4); }, 180); setTimeout(function(){ playTone(262, 0.4, 'sawtooth', 0.4); }, 360); },
    achievement: function() { playTone(659, 0.1, 'sine', 0.5); setTimeout(function(){ playTone(784, 0.1, 'sine', 0.5); }, 100); setTimeout(function(){ playTone(988, 0.1, 'sine', 0.5); }, 200); setTimeout(function(){ playTone(1175, 0.3, 'triangle', 0.4); }, 300); },
    purchase:    function() { playTone(523, 0.08, 'triangle', 0.3); setTimeout(function(){ playTone(659, 0.08, 'triangle', 0.3); }, 70); setTimeout(function(){ playTone(784, 0.15, 'triangle', 0.35); }, 140); },
    wave:        function() { playTone(330, 0.1, 'square', 0.35); setTimeout(function(){ playTone(440, 0.15, 'square', 0.35); }, 80); }
  };

  return {
    play: function(name) { if (SOUNDS[name]) SOUNDS[name](); },
    setEnabled: function(val) { enabled = !!val; Storage.set('sound_enabled', enabled); },
    isEnabled: function() { return enabled; },
    setVolume: function(val) { volume = Math.max(0, Math.min(1, val)); Storage.set('sound_volume', volume); },
    getVolume: function() { return volume; }
  };
})();

/* ========== 新手引导系统 ========== */
window.GuideSystem = (function() {
  var GUIDE_KEY = 'guide_completed';
  var overlay = null;
  var steps = [];
  var currentStep = 0;
  var gameKey = '';
  var pendingStartTimer = null;

  function isCompleted(key) {
    var done = Storage.get(GUIDE_KEY, {});
    return !!done[key];
  }

  function markCompleted(key) {
    var done = Storage.get(GUIDE_KEY, {});
    done[key] = true;
    Storage.set(GUIDE_KEY, done);
  }

  function clearPendingStartTimer() {
    if (pendingStartTimer !== null) {
      clearTimeout(pendingStartTimer);
      pendingStartTimer = null;
    }
  }

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'guide-overlay';
    overlay.innerHTML =
      '<div class="guide-backdrop"></div>' +
      '<div class="guide-tooltip">' +
        '<div class="guide-step-indicator"></div>' +
        '<div class="guide-text"></div>' +
        '<div class="guide-actions">' +
          '<button class="btn btn-sm guide-skip-btn">跳过引导</button>' +
          '<button class="btn btn-gold btn-sm guide-next-btn">下一步</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('.guide-skip-btn').addEventListener('click', function() {
      finish();
    });
    overlay.querySelector('.guide-next-btn').addEventListener('click', function() {
      currentStep++;
      if (currentStep >= steps.length) { finish(); return; }
      showStep(currentStep);
    });
  }

  function positionTooltip(tooltip, el) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var tooltipW = 320;
    var tooltipH = tooltip.offsetHeight || 180;
    var rect = el.getBoundingClientRect();

    // 优先放在目标元素下方
    var top = rect.bottom + 12;
    // 如果下方空间不够，放上方
    if (top + tooltipH > vh - 16) {
      top = rect.top - tooltipH - 12;
    }
    // 如果上方也不够，居中显示
    if (top < 16) {
      top = Math.max(16, (vh - tooltipH) / 2);
    }

    var left = rect.left + (rect.width / 2) - (tooltipW / 2);
    left = Math.max(16, Math.min(vw - tooltipW - 16, left));

    tooltip.style.top = Math.round(top) + 'px';
    tooltip.style.left = Math.round(left) + 'px';
    tooltip.style.transform = '';
  }

  function centerTooltip(tooltip) {
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
  }

  function showStep(idx) {
    if (!overlay) return;
    var step = steps[idx];
    if (!step) return;
    var tooltip = overlay.querySelector('.guide-tooltip');
    var indicator = overlay.querySelector('.guide-step-indicator');
    var text = overlay.querySelector('.guide-text');
    var nextBtn = overlay.querySelector('.guide-next-btn');

    indicator.textContent = (idx + 1) + ' / ' + steps.length;
    text.innerHTML = '<strong>' + escapeHtml(step.title) + '</strong><p>' + escapeHtml(step.desc) + '</p>';
    nextBtn.textContent = (idx === steps.length - 1) ? '完成' : '下一步';

    var prevHighlight = document.querySelector('.guide-highlight');
    if (prevHighlight) prevHighlight.classList.remove('guide-highlight');

    // 先让overlay可见以便计算tooltip尺寸
    overlay.classList.add('active');

    if (step.target) {
      var el = document.querySelector(step.target);
      if (el) {
        el.classList.add('guide-highlight');
        // 先居中放置，等滚动完成后再精确定位
        centerTooltip(tooltip);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 等待滚动完成后再定位（smooth scroll大约300-500ms）
        setTimeout(function() {
          positionTooltip(tooltip, el);
        }, 400);
      } else {
        centerTooltip(tooltip);
      }
    } else {
      centerTooltip(tooltip);
    }

    if (typeof SoundManager !== 'undefined') SoundManager.play('click');
  }

  function finish() {
    clearPendingStartTimer();
    if (overlay) {
      overlay.classList.remove('active');
      var hl = document.querySelector('.guide-highlight');
      if (hl) hl.classList.remove('guide-highlight');
    }
    markCompleted(gameKey);
  }

  return {
    start: function(key, guideSteps) {
      if (isCompleted(key)) return false;
      clearPendingStartTimer();
      gameKey = key;
      steps = guideSteps;
      currentStep = 0;
      createOverlay();
      pendingStartTimer = setTimeout(function() {
        pendingStartTimer = null;
        if (isCompleted(key)) return;
        showStep(0);
      }, 600);
      return true;
    },
    isCompleted: isCompleted,
    reset: function(key) {
      var done = Storage.get(GUIDE_KEY, {});
      delete done[key];
      Storage.set(GUIDE_KEY, done);
    }
  };
})();
>>>>>>> c9bbd8eb26f5d0172912965d532fd8c38cf17b25
