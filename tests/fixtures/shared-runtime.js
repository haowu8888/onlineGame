const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createMemoryStorage, createScheduler } = require('./shared-storage.js');

const SHARED_FILES = [
  'shared-storage.js', 'shared.js', 'shared-data.js', 'shared-ui.js', 'shared-dialog.js',
  'shared-transfer.js', 'shared-save-preview.js', 'shared-stats.js', 'shared-missions.js', 'shared-daily-ui.js',
  'shared-nav.js', 'shared-settings.js', 'shared-sound.js', 'shared-lifecycle.js', 'shared-guide.js',
];

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      const callbacks = listeners.get(type) ?? [];
      listeners.set(type, [...callbacks, listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) ?? []).filter(callback => callback !== listener));
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return !event.defaultPrevented;
    },
  };
}

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name),
    toggle(name, force) {
      const next = force ?? !values.has(name);
      if (next) values.add(name); else values.delete(name);
      return next;
    },
  };
}

function elementMatches(element, selector) {
  return selector.split(',').some(part => {
    const rule = part.trim();
    if (rule === ':disabled') return element.disabled;
    if (rule === 'button[disabled]') return element.tagName === 'BUTTON' && element.disabled;
    if (/^[a-z]+$/i.test(rule)) return element.tagName === rule.toUpperCase();
    const attribute = rule.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
    if (!attribute) return false;
    const key = attribute[1];
    const value = ['hidden', 'inert'].includes(key) ? (element[key] ? '' : null) : element.getAttribute(key);
    return attribute[2] === undefined ? value !== null : value === attribute[2];
  });
}

function hasLayout(element) {
  for (let node = element; node; node = node.parentNode) {
    if (node.hidden || node.classList.contains('hidden') || node.style.display === 'none') return false;
  }
  return true;
}

function makeElement(tag, document) {
  const attributes = new Map();
  const queries = new Map();
  const element = {
    ...eventTarget(), tagName: tag.toUpperCase(), nodeType: 1, children: [], queries,
    dataset: {}, style: { setProperty() {} }, classList: createClassList(),
    textContent: '', innerHTML: '', disabled: false, hidden: false, title: '', isConnected: true,
    value: '', checked: false, tabIndex: ['button', 'input', 'select', 'textarea', 'summary'].includes(tag) ? 0 : -1,
    getAttribute: key => attributes.get(key) ?? null,
    hasAttribute: key => attributes.has(key),
    setAttribute(key, value) { attributes.set(key, String(value)); if (key === 'disabled') this.disabled = true; },
    removeAttribute(key) { attributes.delete(key); if (key === 'disabled') this.disabled = false; },
    querySelector: selector => queries.get(selector)?.[0] ?? null,
    querySelectorAll: selector => queries.get(selector) ?? [],
    matches(selector) { return elementMatches(this, selector); },
    closest(selector) {
      for (let node = this; node; node = node.parentNode) { if (node.matches(selector)) return node; }
      return null;
    },
    getClientRects() { return hasLayout(this) ? [{}] : []; },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    prepend(child) { this.children.unshift(child); child.parentNode = this; },
    replaceChildren() { this.children = []; },
    contains(child) { return child === this || this.children.some(item => item.contains(child)); },
    remove() { this.isConnected = false; },
    focus() { document.activeElement = this; },
    click() { this.dispatchEvent({ type: 'click', target: this }); },
  };
  return element;
}

class BrowserEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.cancelable = options.cancelable ?? false;
    this.defaultPrevented = false;
  }
  preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
}

function createSharedRuntime(initial = {}) {
  const storage = createMemoryStorage(initial);
  const timers = createScheduler();
  const errors = [];
  const observers = [];
  const document = { ...eventTarget(), visibilityState: 'visible', activeElement: null, queries: new Map() };
  document.createElement = tag => makeElement(tag, document);
  document.createDocumentFragment = () => makeElement('fragment', document);
  document.querySelector = selector => document.queries.get(selector)?.[0] ?? null;
  document.querySelectorAll = selector => document.queries.get(selector) ?? [];
  document.getElementById = id => document.querySelector(`#${id}`);
  document.body = document.createElement('body');
  document.documentElement = document.createElement('html');
  const environment = {
    ...eventTarget(), document, localStorage: storage.backend,
    console: { log() {}, warn: (...args) => errors.push(args), error: (...args) => errors.push(args) },
    navigator: { userActivation: { hasBeenActive: false } },
    location: { pathname: '/', reload() { environment.reloads++; } }, reloads: 0,
    setTimeout: timers.schedule, clearTimeout: timers.cancel,
    matchMedia: () => ({ matches: false }), innerWidth: 1280, innerHeight: 720,
    getComputedStyle: element => ({ visibility: element.style.visibility || 'visible' }),
    CustomEvent: BrowserEvent,
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {} disconnect() {}
    },
  };
  environment.window = environment;
  const context = vm.createContext(environment);
  for (const file of SHARED_FILES) {
    const source = fs.readFileSync(path.join(__dirname, '../../js', file), 'utf8');
    vm.runInContext(source, context, { filename: `js/${file}`, timeout: 1000 });
  }
  const api = vm.runInContext(`({ Storage, CONSTANTS, escapeHtml, formatNumber, clamp, randomInt, pick,
    FIVE_ELEMENTS, elementBonus, updateLeaderboard, getLeaderboard, getPlayerName,
    DailyMissions, CrossGameAchievements, CrossGameRewards, GameSaveTransfer, SaveTransfer,
    SettingsModal, SettingsFields, ModalFocus, SaveImportDialog, GameSaveCheckpoints, renderDailyMissions, SoundManager, SharedSoundController,
    recordRecentGame, bindNavigationMenu, normalizeDisabledButtons, watchDisabledButtons })`, context);
  return { ...storage, timers, errors, observers, document, context, api };
}

const plain = value => JSON.parse(JSON.stringify(value));
module.exports = { createSharedRuntime, plain, BrowserEvent, SHARED_FILES };
