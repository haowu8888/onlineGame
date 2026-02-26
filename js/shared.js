/* ========== 共享逻辑 ========== */

/* --- HTML转义 --- */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* --- 常量 --- */
const CONSTANTS = {
  MAX_TOAST_COUNT: 5,
  TOAST_DEFAULT_DURATION: 3000,
  MAX_IMPORT_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  STORAGE_DEBOUNCE_MS: 300,
  LEADERBOARD_MAX_ENTRIES: 10,
  SAVE_VERSION: 1,
};

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
  }

  return {
    get(key, fallback = null) {
      // 优先从待写入缓存读取
      if (_pendingWrites.has(key)) return _pendingWrites.get(key);
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      _pendingWrites.set(key, value);
      if (!_debounceTimer) {
        _debounceTimer = setTimeout(_flushWrites, CONSTANTS.STORAGE_DEBOUNCE_MS);
      }
      return true;
    },
    setImmediate(key, value) {
      // 关键数据立即写入（如存档保存）
      try {
        localStorage.setItem(key, JSON.stringify(value));
        _pendingWrites.delete(key);
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError' || (e.message && e.message.indexOf('quota') !== -1)) {
          if (typeof showToast === 'function') {
            showToast('本地存储空间不足，存档未保存！建议导出存档后清理浏览器数据。', 'error', 6000);
          }
        }
        console.warn(`Storage写入失败 [${key}]:`, e.message);
        return false;
      }
    },
    remove(key) {
      _pendingWrites.delete(key);
      try {
        localStorage.removeItem(key);
      } catch { /* ignore */ }
    },
    flush() {
      if (_debounceTimer) {
        clearTimeout(_debounceTimer);
        _flushWrites();
      }
    },
    /** 获取 localStorage 已用大小估算 (KB) */
    getUsedSize() {
      let total = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          total += key.length + (localStorage.getItem(key) || '').length;
        }
      } catch { /* ignore */ }
      return Math.round(total / 1024);
    }
  };
})();

/* --- 数据导出/导入 --- */
function exportData() {
  try {
    Storage.flush(); // 确保待写入数据都已持久化
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    data.__save_version = CONSTANTS.SAVE_VERSION;
    data.__export_time = new Date().toISOString();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `仙界游坊_存档_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('存档导出成功 (' + Storage.getUsedSize() + 'KB)', 'success');
  } catch (e) {
    showToast('导出失败: ' + e.message, 'error');
  }
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > CONSTANTS.MAX_IMPORT_FILE_SIZE) {
      showToast('文件过大，请检查是否选择了正确的存档文件', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          showToast('存档格式无效：需要JSON对象', 'error');
          return;
        }
        // 版本兼容性检查
        if (data.__save_version && data.__save_version > CONSTANTS.SAVE_VERSION) {
          showToast('存档版本过新，请更新游戏后重试', 'error');
          return;
        }
        // 事务性导入：先备份当前数据，写入失败时回滚
        const backup = {};
        const keysToWrite = [];
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('__')) continue;
          if (typeof key === 'string' && typeof value === 'string') {
            backup[key] = localStorage.getItem(key); // null = 原本不存在
            keysToWrite.push([key, value]);
          }
        }
        if (keysToWrite.length === 0) {
          showToast('未发现有效数据', 'error');
          return;
        }
        let written = 0;
        try {
          for (const [key, value] of keysToWrite) {
            localStorage.setItem(key, value);
            written++;
          }
        } catch (writeErr) {
          // 写入失败，回滚已写入的数据
          for (const [key] of keysToWrite.slice(0, written)) {
            try {
              if (backup[key] === null) localStorage.removeItem(key);
              else localStorage.setItem(key, backup[key]);
            } catch { /* 回滚也失败则无法恢复 */ }
          }
          showToast('存储空间不足，导入已回滚。请清理浏览器数据后重试。', 'error', 6000);
          return;
        }
        showToast(`成功导入 ${written} 条数据，刷新页面生效`, 'success', 5000);
      } catch (err) {
        showToast('导入失败: ' + err.message, 'error');
      }
    };
    reader.onerror = () => {
      showToast('文件读取失败', 'error');
    };
    reader.readAsText(file);
  });
  input.click();
}

/* --- 导航栏 --- */
const NAV_GAMES = [
  { id: 'cultivation', name: '修仙之路', file: 'cultivation.html' },
  { id: 'lifesim', name: '仙途模拟器', file: 'lifesim.html' },
  { id: 'guigu', name: '鬼谷八荒', file: 'guigu.html' },
  { id: 'knife', name: '转转刀', file: 'knife.html' },
  { id: 'cardtower', name: '斩仙塔', file: 'cardtower.html' },
  { id: 'cardbattle', name: '灵卡对决', file: 'cardbattle.html' },
  { id: 'cardcollect', name: '仙卡录', file: 'cardcollect.html' },
];

function initNav(activePage) {
  const nav = document.createElement('nav');
  nav.className = 'nav';
  const isPortal = activePage === 'portal';
  const prefix = isPortal ? 'games/' : '';
  const homeHref = isPortal ? '#' : '../index.html';

  const gameLinks = NAV_GAMES.map(g =>
    `<li><a href="${prefix}${g.file}" class="${activePage === g.id ? 'active' : ''}">${g.name}</a></li>`
  ).join('');

  nav.innerHTML = `
    <a href="${homeHref}" class="nav-brand">仙界游坊</a>
    <button class="nav-toggle" aria-label="菜单">☰</button>
    <ul class="nav-links">
      <li><a href="${homeHref}" class="${isPortal ? 'active' : ''}">主页</a></li>
      ${gameLinks}
    </ul>
    <button class="nav-settings-btn" title="设置">⚙</button>
  `;
  document.body.prepend(nav);

  // 移动端菜单切换
  const toggle = nav.querySelector('.nav-toggle');
  const links = nav.querySelector('.nav-links');

  // 移动端背景遮罩
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  nav.appendChild(backdrop);

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    backdrop.classList.toggle('visible', isOpen);
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // 点击导航链接后关闭菜单
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      backdrop.classList.remove('visible');
    });
  });

  // 点击遮罩关闭
  backdrop.addEventListener('click', () => {
    links.classList.remove('open');
    backdrop.classList.remove('visible');
  });

  // 点击外部关闭（使用标记防止重复绑定）
  if (!document._navOutsideClickBound) {
    document._navOutsideClickBound = true;
    document.addEventListener('click', (e) => {
      const currentNav = document.querySelector('.nav');
      if (currentNav && !currentNav.contains(e.target)) {
        const navLinks = currentNav.querySelector('.nav-links');
        const navBackdrop = currentNav.querySelector('.nav-backdrop');
        if (navLinks) navLinks.classList.remove('open');
        if (navBackdrop) navBackdrop.classList.remove('visible');
      }
    });
  }

  // 设置按钮
  const settingsBtn = nav.querySelector('.nav-settings-btn');
  settingsBtn.addEventListener('click', () => {
    if (window._settingsModal) window._settingsModal.open();
  });
}

/* --- 粒子系统 --- */
function initParticles(container, count = 30) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  // 清理旧粒子，防止重复调用时累积
  el.innerHTML = '';

  // 尊重用户减少动画偏好
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 移动端减少粒子数量
  const isMobile = window.innerWidth < 768;
  const actualCount = isMobile ? Math.min(count, 12) : count;

  // 提升到循环外避免重复创建
  const colors = ['var(--gold)', 'var(--cyan)', 'var(--purple-light)'];
  // 使用 DocumentFragment 批量插入，只触发一次回流
  const frag = document.createDocumentFragment();
  for (let i = 0; i < actualCount; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * duration;
    const left = Math.random() * 100;

    // 移动端省略 box-shadow 以提升性能
    const shadow = isMobile ? '' : `box-shadow: 0 0 ${size * 2}px ${color};`;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      background: ${color};
      ${shadow}
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
    `;
    frag.appendChild(p);
  }
  el.appendChild(frag);
}

/* --- 设置弹窗 (Schema驱动) --- */
class SettingsModal {
  constructor(schema, storageKey, onChange) {
    this.schema = schema;
    this.storageKey = storageKey;
    this.onChange = onChange;
    this.values = { ...this._defaults(), ...Storage.get(storageKey, {}) };
    this._build();
    window._settingsModal = this;
  }

  _defaults() {
    const d = {};
    this.schema.forEach(f => { d[f.key] = f.default; });
    return d;
  }

  _build() {
    // 清理旧实例
    if (window._settingsModal && window._settingsModal.overlay && window._settingsModal.overlay.parentNode) {
      window._settingsModal.overlay.remove();
    }
    if (window._settingsModal && window._settingsModal._escHandler) {
      document.removeEventListener('keydown', window._settingsModal._escHandler);
    }
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';

    let fieldsHTML = '';
    this.schema.forEach(f => {
      let input = '';
      switch (f.type) {
        case 'select':
          const opts = f.options.map(o =>
            `<option value="${o.value}" ${this.values[f.key] === o.value ? 'selected' : ''}>${o.label}</option>`
          ).join('');
          input = `<select class="form-select" data-key="${f.key}">${opts}</select>`;
          break;
        case 'range':
          input = `<input type="range" class="form-range" data-key="${f.key}"
            min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${this.values[f.key]}">
            <span class="range-value">${this.values[f.key]}</span>`;
          break;
        case 'checkbox':
          input = `<label class="form-check">
            <input type="checkbox" data-key="${f.key}" ${this.values[f.key] ? 'checked' : ''}>
            <span>${f.checkLabel || ''}</span>
          </label>`;
          break;
        default:
          input = `<input type="text" class="form-input" data-key="${f.key}" value="${String(this.values[f.key] ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}">`;
      }
      fieldsHTML += `<div class="form-group"><label class="form-label">${f.label}</label>${input}</div>`;
    });

    this.overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">设置</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">${fieldsHTML}</div>
        <div style="border-top: 1px solid var(--border-color); margin: 16px 0; padding-top: 16px;">
          <label class="form-label">数据管理</label>
          <div style="display: flex; gap: 8px; margin-top: 6px;">
            <button class="btn btn-outline btn-sm modal-export">导出存档</button>
            <button class="btn btn-outline btn-sm modal-import">导入存档</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm modal-reset">重置</button>
          <button class="btn btn-gold btn-sm modal-save">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // ARIA无障碍属性
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    const modalTitle = this.overlay.querySelector('.modal-title');
    modalTitle.id = 'settings-title';
    this.overlay.querySelector('.modal').setAttribute('aria-labelledby', 'settings-title');

    // 事件绑定
    this.overlay.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.overlay.querySelector('.modal-save').addEventListener('click', () => this.save());
    this.overlay.querySelector('.modal-reset').addEventListener('click', () => this.reset());

    // 数据导出/导入按钮
    const exportBtn = this.overlay.querySelector('.modal-export');
    const importBtn = this.overlay.querySelector('.modal-import');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    if (importBtn) importBtn.addEventListener('click', importData);

    // range 实时显示
    this.overlay.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', () => {
        input.nextElementSibling.textContent = input.value;
      });
    });

    // Escape键关闭弹窗
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  open() {
    // 同步当前值到表单
    this.schema.forEach(f => {
      const el = this.overlay.querySelector(`[data-key="${f.key}"]`);
      if (!el) return;
      if (f.type === 'checkbox') el.checked = this.values[f.key];
      else el.value = this.values[f.key];
      if (f.type === 'range') el.nextElementSibling.textContent = this.values[f.key];
    });
    this.overlay.classList.add('active');
    // 焦点陷阱：打开后聚焦关闭按钮
    const closeBtn = this.overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  }

  close() {
    this.overlay.classList.remove('active');
  }

  save() {
    this.schema.forEach(f => {
      const el = this.overlay.querySelector(`[data-key="${f.key}"]`);
      if (!el) return;
      if (f.type === 'checkbox') this.values[f.key] = el.checked;
      else if (f.type === 'range') this.values[f.key] = Number(el.value);
      else if (f.type === 'select') {
        const v = el.value;
        this.values[f.key] = isNaN(v) ? v : Number(v);
      } else {
        this.values[f.key] = el.value;
      }
    });
    Storage.set(this.storageKey, this.values);
    showToast('设置已保存', 'success');
    this.close();
    if (this.onChange) this.onChange(this.values);
  }

  reset() {
    this.values = this._defaults();
    Storage.set(this.storageKey, this.values);
    this.open(); // 刷新表单
    showToast('已恢复默认设置', 'info');
    if (this.onChange) this.onChange(this.values);
  }

  get(key) {
    return this.values[key];
  }
}

/* --- Toast通知 --- */
function getToastContainer() {
  let c = document.querySelector('.toast-container');
  if (!c) {
    c = document.createElement('div');
    c.className = 'toast-container';
    c.setAttribute('aria-live', 'polite');
    c.setAttribute('role', 'status');
    document.body.appendChild(c);
  }
  return c;
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

function showToast(msg, type = 'info', duration = CONSTANTS.TOAST_DEFAULT_DURATION) {
  const container = getToastContainer();

  // 自动音效
  if (typeof SoundManager !== 'undefined') {
    var snd = type === 'error' ? 'error' : type === 'success' ? 'success' : null;
    // 特殊关键词检测
    if (snd === 'success') {
      if (/突破成功|晋升|升级成功|强化成功/.test(msg)) snd = 'levelup';
      else if (/成就|仙缘联动/.test(msg)) snd = 'achievement';
      else if (/获得|发现|兑换成功/.test(msg)) snd = 'coin';
    }
    if (snd) SoundManager.play(snd);
  }

  // 堆叠限制
  const existing = container.querySelectorAll('.toast:not(.toast-out)');
  if (existing.length >= CONSTANTS.MAX_TOAST_COUNT) {
    existing[0].classList.add('toast-out');
    setTimeout(() => existing[0].remove(), 300);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // 类型图标
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const icon = icons[type] || icons.info;
  toast.innerHTML = `<span class="toast-icon toast-icon-${type}">${icon}</span><span class="toast-text">${escapeHtml(msg)}</span>`;

  // 进度条动画时长与JS duration同步
  toast.style.setProperty('--toast-duration', duration + 'ms');

  // 点击关闭
  toast.addEventListener('click', () => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/* --- 工具函数 --- */
function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + '万亿';
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return n.toLocaleString('zh-CN');
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

/* --- 页面加载状态 --- */
function hideLoading() {
  const loader = document.querySelector('.app-loading');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 300);
  }
}
document.addEventListener('DOMContentLoaded', hideLoading);

/* --- 页面卸载时刷新待写入数据 --- */
function _flushStorageSafe() {
  try { Storage.flush(); } catch { /* ignore */ }
}
window.addEventListener('beforeunload', _flushStorageSafe);
// 移动端/后台切换时更可靠（beforeunload 可能不触发）
window.addEventListener('pagehide', _flushStorageSafe);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') _flushStorageSafe();
});

/* --- 事件委托管理器 --- */
window.EventManager = {
  _handlers: [],
  on(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this._handlers.push({ element, event, handler, options });
  },
  cleanup() {
    this._handlers.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this._handlers = [];
  }
};

/* --- 音效开关按钮 (自动注入) --- */
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.createElement('button');
  btn.className = 'sound-toggle' + (SoundManager.isEnabled() ? '' : ' muted');
  btn.setAttribute('aria-label', '音效开关');
  btn.textContent = SoundManager.isEnabled() ? '🔊' : '🔇';
  btn.addEventListener('click', function() {
    var next = !SoundManager.isEnabled();
    SoundManager.setEnabled(next);
    btn.textContent = next ? '🔊' : '🔇';
    btn.classList.toggle('muted', !next);
    if (next) SoundManager.play('click');
  });
  document.body.appendChild(btn);
});

/* --- 排行榜工具 --- */
function updateLeaderboard(gameKey, score, extra = {}) {
  if (typeof score !== 'number' || isNaN(score)) return;
  const key = `leaderboard_${gameKey}`;
  const board = Storage.get(key, []);
  if (!Array.isArray(board)) return;
  board.push({ score, date: Date.now(), ...extra });
  board.sort((a, b) => b.score - a.score);
  Storage.set(key, board.slice(0, CONSTANTS.LEADERBOARD_MAX_ENTRIES));
}

function getLeaderboard(gameKey) {
  return Storage.get(`leaderboard_${gameKey}`, []);
}

/* --- 滚动淡入 --- */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ========== 跨游戏成就系统 ==========
window.CrossGameAchievements = (function() {
  const ACHIEVEMENTS = [
    { id: 'traveler', name: '七界行者', desc: '游玩全部7款游戏', icon: '🌏', check: d => d.games_played_cultivation && d.games_played_knife && d.games_played_guigu && d.games_played_lifesim && d.games_played_cardtower && d.games_played_cardbattle && d.games_played_cardcollect },
    { id: 'golden_core', name: '金丹大道', desc: '修仙之路突破金丹期', icon: '💊', check: d => (d.cultivation_max_realm || d.cultivation_realm || 0) >= 3 },
    { id: 'ascension', name: '飞升成仙', desc: '修仙之路达到大乘期', icon: '🌟', check: d => (d.cultivation_max_realm || d.cultivation_realm || 0) >= 7 },
    { id: 'wave_10', name: '十波斩', desc: '转转刀存活10波', icon: '⚔️', check: d => (d.knife_max_wave || 0) >= 10 },
    { id: 'wave_30', name: '三十波无双', desc: '转转刀存活30波', icon: '🗡️', check: d => (d.knife_max_wave || 0) >= 30 },
    { id: 'guigu_sect', name: '宗门弟子', desc: '鬼谷八荒加入宗门', icon: '🏯', check: d => !!d.guigu_joined_sect },
    { id: 'lifesim_rebirth', name: '轮回修士', desc: '仙途模拟器完成一次轮回', icon: '🔄', check: d => (d.lifesim_rebirths || 0) >= 1 },
    { id: 'tower_clear', name: '仙塔登顶', desc: '斩仙塔通关全部五层', icon: '🗼', check: d => !!d.cardtower_cleared },
    { id: 'battle_master', name: '灵卡宗师', desc: '灵卡对决击败金丹对手', icon: '🏆', check: d => !!d.cardbattle_cleared },
    { id: 'card_collector', name: '万卡归宗', desc: '仙卡录收集20张角色卡', icon: '📖', check: d => (d.cardcollect_cards || 0) >= 20 },
    // Phase 6 新增成就
    { id: 'five_elements', name: '五行宗师', desc: '鬼谷八荒全部悟道达25', icon: '☯️', check: d => (d.guigu_min_enlighten || 0) >= 25 },
    { id: 'card_master', name: '卡牌大师', desc: '灵卡对决竞技场连胜9场', icon: '🃏', check: d => (d.cardbattle_arena_best || 0) >= 9 },
    { id: 'all_star', name: '全明星阵容', desc: '仙卡录集齐全部圣级角色', icon: '⭐', check: d => (d.cardcollect_holy_count || 0) >= 4 },
    { id: 'three_lives', name: '轮回三世', desc: '仙途模拟器完成3次轮回', icon: '🔄', check: d => (d.lifesim_rebirths || 0) >= 3 },
    { id: 'tower_ascend', name: '飞升之路', desc: '斩仙塔飞升难度3通关', icon: '🏔️', check: d => (d.cardtower_max_ascension || 0) >= 3 },
    { id: 'wave_50', name: '五十波无敌', desc: '转转刀存活50波', icon: '🌊', check: d => (d.knife_max_wave || 0) >= 50 },
    { id: 'mount_master', name: '灵兽御者', desc: '鬼谷八荒拥有5种以上坐骑', icon: '🐉', check: d => (d.guigu_mounts || 0) >= 5 },
    { id: 'total_power', name: '万仙之力', desc: '综合实力达到5000分', icon: '💪', check: d => (d.total_power || 0) >= 5000 },
  ];

  const STORAGE_KEY = 'cross_game_achievements';
  const STATS_KEY = 'cross_game_stats';

  // 内存缓存，避免高频 JSON.parse/stringify
  let _statsCache = null;
  let _unlockedCache = null;
  let _unlockedSet = null;

  function loadStats() {
    if (_statsCache) return _statsCache;
    _statsCache = Storage.get(STATS_KEY, {});
    return _statsCache;
  }

  function saveStats(d) {
    _statsCache = d;
    Storage.set(STATS_KEY, d);
  }

  function loadUnlocked() {
    if (_unlockedCache) return _unlockedCache;
    _unlockedCache = Storage.get(STORAGE_KEY, []);
    _unlockedSet = new Set(_unlockedCache);
    return _unlockedCache;
  }

  function saveUnlocked(arr) {
    _unlockedCache = arr;
    _unlockedSet = new Set(arr);
    Storage.set(STORAGE_KEY, arr);
  }

  return {
    ACHIEVEMENTS,
    trackStat(key, value) {
      const d = loadStats();
      if (typeof value === 'boolean') d[key] = value;
      else if (typeof value === 'number') d[key] = Math.max(d[key] || 0, value);
      else d[key] = value;
      saveStats(d);
      // 刷新缓存，确保跨游戏成就检查使用最新数据
      _unlockedCache = null;
      _unlockedSet = null;
    },
    checkNew() {
      const d = loadStats();
      const unlocked = loadUnlocked();
      if (!_unlockedSet) _unlockedSet = new Set(unlocked);
      const newlyUnlocked = [];
      ACHIEVEMENTS.forEach(a => {
        try {
          if (!_unlockedSet.has(a.id) && a.check(d)) {
            unlocked.push(a.id);
            _unlockedSet.add(a.id);
            newlyUnlocked.push(a);
          }
        } catch { /* skip malformed check */ }
      });
      if (newlyUnlocked.length) saveUnlocked(unlocked);
      return newlyUnlocked;
    },
    getAll() {
      const unlocked = loadUnlocked();
      if (!_unlockedSet) _unlockedSet = new Set(unlocked);
      return ACHIEVEMENTS.map(a => ({ ...a, unlocked: _unlockedSet.has(a.id) }));
    },
    getUnlockedCount() {
      return loadUnlocked().length;
    }
  };
})();

// ========== 跨游戏联动奖励系统 ==========
window.CrossGameRewards = (function() {
  const REWARDS = [
    { id: 'cult_to_battle', condition: d => (d.cultivation_max_realm || 0) >= 4, targetGame: 'cardbattle', reward: { type: 'hp_bonus', value: 5 }, name: '金丹之力', desc: '修仙之路突破金丹期 → 灵卡对决HP+5' },
    { id: 'knife_to_tower', condition: d => (d.knife_max_wave || 0) >= 20, targetGame: 'cardtower', reward: { type: 'hp_bonus', value: 10 }, name: '百战之躯', desc: '转转刀存活20波 → 斩仙塔HP+10' },
    { id: 'tower_to_cult', condition: d => !!d.cardtower_cleared, targetGame: 'cultivation', reward: { type: 'equipment', value: 'tower_relic' }, name: '仙塔之证', desc: '斩仙塔通关 → 修仙之路获赠仙塔灵器' },
    { id: 'battle_to_collect', condition: d => !!d.cardbattle_cleared, targetGame: 'cardcollect', reward: { type: 'free_pulls', value: 5 }, name: '对决之名', desc: '灵卡对决通关 → 仙卡录免费5连抽' },
    { id: 'lifesim_to_guigu', condition: d => (d.lifesim_max_age || 0) >= 80, targetGame: 'guigu', reward: { type: 'exp_mult', value: 0.1 }, name: '轮回之悟', desc: '仙途模拟器活过80岁 → 鬼谷八荒经验+10%' },
    { id: 'collect_to_knife', condition: d => (d.cardcollect_cards || 0) >= 15, targetGame: 'knife', reward: { type: 'extra_blade', value: 1 }, name: '百卡之缘', desc: '仙卡录收集15张 → 转转刀初始多1把刀' },
    { id: 'guigu_to_lifesim', condition: d => (d.guigu_max_realm || 0) >= 2, targetGame: 'lifesim', reward: { type: 'stat_bonus', value: 2 }, name: '入世之缘', desc: '鬼谷八荒筑基 → 仙途模拟器属性+2' }
  ];
  const CLAIMED_KEY = 'cross_game_rewards_claimed';
  return {
    REWARDS,
    getRewardsForGame(gameKey) {
      const stats = Storage.get('cross_game_stats', {});
      const claimed = Storage.get(CLAIMED_KEY, []);
      return REWARDS.filter(r => r.targetGame === gameKey).map(r => ({
        ...r, eligible: r.condition(stats), claimed: claimed.includes(r.id)
      }));
    },
    claimReward(id) {
      const claimed = Storage.get(CLAIMED_KEY, []);
      if (!claimed.includes(id)) { claimed.push(id); Storage.set(CLAIMED_KEY, claimed); }
    },
    getActiveRewards(gameKey) {
      const stats = Storage.get('cross_game_stats', {});
      const claimed = Storage.get(CLAIMED_KEY, []);
      return REWARDS.filter(r => r.targetGame === gameKey && r.condition(stats) && claimed.includes(r.id));
    },
    checkAndClaim(gameKey) {
      const rewards = this.getRewardsForGame(gameKey);
      const newRewards = [];
      rewards.forEach(r => {
        if (r.eligible && !r.claimed) {
          this.claimReward(r.id);
          newRewards.push(r);
        }
      });
      return newRewards;
    },
    /**
     * 检查已领取的奖励条件是否仍满足
     * 条件不再满足时从claimed列表移除（奖励在下次游戏开始时不再应用）
     */
    revalidateClaimed(gameKey) {
      const stats = Storage.get('cross_game_stats', {});
      const claimed = Storage.get(CLAIMED_KEY, []);
      const revoked = [];
      const stillValid = claimed.filter(id => {
        const reward = REWARDS.find(r => r.id === id);
        if (!reward || reward.targetGame !== gameKey) return true; // 不属于此游戏的保留
        try {
          if (!reward.condition(stats)) {
            revoked.push(reward);
            return false; // 条件不满足，移除
          }
        } catch { /* 条件检查出错则保留 */ }
        return true;
      });
      if (revoked.length > 0) {
        Storage.set(CLAIMED_KEY, stillValid);
      }
      return revoked;
    },
    getUnclaimedCount(gameKey) {
      const rewards = this.getRewardsForGame(gameKey);
      return rewards.filter(r => r.eligible && !r.claimed).length;
    }
  };
})();

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

/* ========== 音效管理器 (Web Audio API 合成, 带缓存) ========== */
window.SoundManager = (function() {
  var ctx = null;
  var enabled = Storage.get('sound_enabled', true);
  var volume = Storage.get('sound_volume', 0.3);
  var _noiseBufferCache = null; // 缓存噪声buffer

  function getCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

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

  function isCompleted(key) {
    var done = Storage.get(GUIDE_KEY, {});
    return !!done[key];
  }

  function markCompleted(key) {
    var done = Storage.get(GUIDE_KEY, {});
    done[key] = true;
    Storage.set(GUIDE_KEY, done);
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
          '<button class="btn btn-sm guide-skip-btn">\u8df3\u8fc7\u5f15\u5bfc</button>' +
          '<button class="btn btn-gold btn-sm guide-next-btn">\u4e0b\u4e00\u6b65</button>' +
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
    var step = steps[idx];
    var tooltip = overlay.querySelector('.guide-tooltip');
    var indicator = overlay.querySelector('.guide-step-indicator');
    var text = overlay.querySelector('.guide-text');
    var nextBtn = overlay.querySelector('.guide-next-btn');

    indicator.textContent = (idx + 1) + ' / ' + steps.length;
    text.innerHTML = '<strong>' + step.title + '</strong><p>' + step.desc + '</p>';
    nextBtn.textContent = (idx === steps.length - 1) ? '\u5b8c\u6210' : '\u4e0b\u4e00\u6b65';

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
      gameKey = key;
      steps = guideSteps;
      currentStep = 0;
      createOverlay();
      setTimeout(function() { showStep(0); }, 600);
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
