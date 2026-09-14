function getToastContainer() {
  const existing = document.querySelector('.toast-container');
  if (existing) return existing;
  const container = document.createElement('div');
  container.className = 'toast-container';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('role', 'status');
  document.body.appendChild(container);
  return container;
}

function dismissToast(toast) {
  toast.classList.add('toast-out');
  setTimeout(() => toast.remove(), CONSTANTS.TOAST_TRANSITION_MS);
}

function toastSound(message, type) {
  if (type === 'error') return 'error';
  if (type !== 'success') return null;
  if (/突破成功|晋升|升级成功|强化成功/.test(message)) return 'levelup';
  if (/成就|仙缘联动/.test(message)) return 'achievement';
  if (/获得|发现|兑换成功/.test(message)) return 'coin';
  return 'success';
}

function showToast(message, type = 'info', duration = CONSTANTS.TOAST_DEFAULT_DURATION) {
  const container = getToastContainer();
  const sound = toastSound(message, type);
  if (sound && window.SoundManager) SoundManager.play(sound);
  const existing = container.querySelectorAll('.toast:not(.toast-out)');
  if (existing.length >= CONSTANTS.MAX_TOAST_COUNT) dismissToast(existing[0]);
  const toast = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '!' };
  const resolvedType = Object.hasOwn(icons, type) ? type : 'info';
  toast.className = `toast toast-${resolvedType}`;
  toast.innerHTML = `<span class="toast-icon toast-icon-${resolvedType}">${icons[resolvedType]}</span><span class="toast-text">${escapeHtml(message)}</span>`;
  toast.style.setProperty('--toast-duration', `${duration}ms`);
  toast.addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);
  setTimeout(() => { if (toast.isConnected) dismissToast(toast); }, duration);
}

const PARTICLE_CONFIG = Object.freeze({
  mobileBreakpoint: 768, mobileCount: 12, minimumSize: 2, sizeSpread: 4,
  minimumDuration: 10, durationSpread: 15, colors: ['var(--gold)', 'var(--cyan)', 'var(--purple-light)'],
});

function initParticles(container, count = 30) {
  const element = typeof container === 'string' ? document.querySelector(container) : container;
  if (!element) return;
  element.replaceChildren();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const mobile = window.innerWidth < PARTICLE_CONFIG.mobileBreakpoint;
  const amount = mobile ? Math.min(count, PARTICLE_CONFIG.mobileCount) : count;
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < amount; index++) {
    const particle = document.createElement('div');
    const size = PARTICLE_CONFIG.minimumSize + Math.random() * PARTICLE_CONFIG.sizeSpread;
    const duration = PARTICLE_CONFIG.minimumDuration + Math.random() * PARTICLE_CONFIG.durationSpread;
    const color = pick(PARTICLE_CONFIG.colors);
    particle.className = 'particle';
    particle.style.cssText = `width:${size}px;height:${size}px;background:${color};left:${Math.random() * 100}%;animation-duration:${duration}s;animation-delay:-${Math.random() * duration}s;`;
    if (!mobile) particle.style.boxShadow = `0 0 ${size * 2}px ${color}`;
    fragment.appendChild(particle);
  }
  element.appendChild(fragment);
}

function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in').forEach(element => observer.observe(element));
}

function showDisabledReason(event) {
  const target = event.target.closest?.('[aria-disabled="true"], .disabled[data-disabled-reason]');
  if (!target || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  showToast(target.dataset.disabledReason || target.getAttribute('title') || '当前不可用', 'info');
}

function closeTopmostModal(event) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const overlays = [...document.querySelectorAll('.modal-overlay.active')];
  const top = overlays[overlays.length - 1];
  if (!top) return;
  const close = top.querySelector('.modal-close') || [...top.querySelectorAll('button')]
    .find(button => ['×', '关闭', '取消'].includes(button.textContent.trim()));
  if (close) { event.preventDefault(); close.click(); }
}

/* 原生 disabled 保持原样，观察器只补充明确提供的原因，不改写可用状态。 */
function normalizeDisabledButtons(root) {
  const buttons = [...root.querySelectorAll('button[disabled]')];
  if (root.matches?.('button[disabled]')) buttons.push(root);
  for (const button of buttons) {
    const reason = button.dataset.disabledReason || button.querySelector('.adventure-choice-req')?.textContent.trim();
    if (reason && !button.title) button.title = reason;
  }
}

function watchDisabledButtons() {
  normalizeDisabledButtons(document);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') normalizeDisabledButtons(record.target);
      else record.addedNodes.forEach(node => { if (node.nodeType === 1) normalizeDisabledButtons(node); });
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
  window.addEventListener('pagehide', event => { if (!event.persisted) observer.disconnect(); });
}

document.addEventListener('click', showDisabledReason, true);
document.addEventListener('keydown', closeTopmostModal);
document.addEventListener('DOMContentLoaded', watchDisabledButtons);
