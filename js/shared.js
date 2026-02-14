/* ========== 共享逻辑 ========== */

/* --- Storage工具 --- */
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  }
};

/* --- 导航栏 --- */
function initNav(activePage) {
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
    <a href="${activePage === 'portal' ? '#' : '../index.html'}" class="nav-brand">仙界游坊</a>
    <button class="nav-toggle" aria-label="菜单">☰</button>
    <ul class="nav-links">
      <li><a href="${activePage === 'portal' ? '#' : '../index.html'}" class="${activePage === 'portal' ? 'active' : ''}">主页</a></li>
      <li><a href="${activePage === 'portal' ? 'games/2048.html' : (activePage === '2048' ? '2048.html' : '2048.html')}" class="${activePage === '2048' ? 'active' : ''}">2048</a></li>
      <li><a href="${activePage === 'portal' ? 'games/tetris.html' : (activePage === 'tetris' ? 'tetris.html' : 'tetris.html')}" class="${activePage === 'tetris' ? 'active' : ''}">俄罗斯方块</a></li>
      <li><a href="${activePage === 'portal' ? 'games/cultivation.html' : (activePage === 'cultivation' ? 'cultivation.html' : 'cultivation.html')}" class="${activePage === 'cultivation' ? 'active' : ''}">凡人修仙传</a></li>
    </ul>
    <button class="nav-settings-btn" title="设置">⚙</button>
  `;
  document.body.prepend(nav);

  // 移动端菜单切换
  const toggle = nav.querySelector('.nav-toggle');
  const links = nav.querySelector('.nav-links');
  toggle.addEventListener('click', () => links.classList.toggle('open'));

  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) links.classList.remove('open');
  });

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

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    const colors = ['var(--gold)', 'var(--cyan)', 'var(--purple-light)'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * duration;
    const left = Math.random() * 100;

    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size * 2}px ${color};
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
    `;
    el.appendChild(p);
  }
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
          input = `<input type="text" class="form-input" data-key="${f.key}" value="${this.values[f.key]}">`;
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
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm modal-reset">重置</button>
          <button class="btn btn-gold btn-sm modal-save">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // 事件绑定
    this.overlay.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.overlay.querySelector('.modal-save').addEventListener('click', () => this.save());
    this.overlay.querySelector('.modal-reset').addEventListener('click', () => this.reset());

    // range 实时显示
    this.overlay.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', () => {
        input.nextElementSibling.textContent = input.value;
      });
    });
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
    document.body.appendChild(c);
  }
  return c;
}

function showToast(msg, type = 'info', duration = 2500) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
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

/* --- 排行榜工具 --- */
function updateLeaderboard(gameKey, score, extra = {}) {
  const key = `leaderboard_${gameKey}`;
  const board = Storage.get(key, []);
  board.push({ score, date: Date.now(), ...extra });
  board.sort((a, b) => b.score - a.score);
  Storage.set(key, board.slice(0, 10));
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
