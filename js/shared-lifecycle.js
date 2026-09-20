function hideLoading() {
  const loader = document.querySelector('.app-loading');
  if (!loader) return;
  loader.classList.add('hidden');
  setTimeout(() => loader.remove(), CONSTANTS.TOAST_TRANSITION_MS);
}

const saveCheckpoints = new Map();
window.GameSaveCheckpoints = Object.freeze({
  register(key, capture) { saveCheckpoints.set(key, capture); },
  capture() {
    if (window.GameSaveTransfer?.isReloading) return;
    saveCheckpoints.forEach(capture => capture());
  },
});

function flushPageStorage() {
  if (window.GameSaveTransfer?.isReloading) return true;
  try { GameSaveCheckpoints.capture(); }
  catch (error) { reportStorageError(error, '采集最新进度'); return false; }
  return Storage.flush();
}

function flushBeforeUpdate(event) {
  if (!flushPageStorage()) event.preventDefault();
}

function recordCurrentGameVisit() {
  const match = location.pathname.match(/\/games\/([^/]+)\.html$/);
  if (match) recordRecentGame(match[1]);
}

document.addEventListener('DOMContentLoaded', hideLoading);
document.addEventListener('DOMContentLoaded', recordCurrentGameVisit);
document.addEventListener('pwa:before-update', flushBeforeUpdate);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPageStorage();
});
window.addEventListener('beforeunload', flushPageStorage);
window.addEventListener('pagehide', flushPageStorage);

window.EventManager = {
  _handlers: [],
  on(...args) {
    const [element, event, handler, options] = args;
    element.addEventListener(event, handler, options);
    this._handlers.push({ element, event, handler, options });
  },
  cleanup() {
    this._handlers.forEach(({ element, event, handler, options }) => element.removeEventListener(event, handler, options));
    this._handlers = [];
  },
};

window.TimerManager = {
  _timers: new Set(),
  setTimeout(callback, delay) {
    const id = setTimeout(() => { this._timers.delete(id); callback(); }, delay);
    this._timers.add(id);
    return id;
  },
  clearTimeout(id) {
    clearTimeout(id);
    this._timers.delete(id);
  },
  clearAll() {
    this._timers.forEach(id => clearTimeout(id));
    this._timers.clear();
  },
};

window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  EventManager.cleanup();
  TimerManager.clearAll();
});
