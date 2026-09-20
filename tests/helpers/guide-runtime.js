const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { makeDom } = require('../fixtures/dom');
const { createScheduler } = require('../fixtures/shared-storage');

function prepareElement(element, document) {
  element.tabIndex = element.tagName === 'BUTTON' ? 0 : -1;
  element.matches = selector => selector.split(',').some(rule =>
    rule.trim() === ':disabled' ? element.disabled : element.getAttribute('aria-disabled') === 'true');
  element.getClientRects = () => {
    for (let node = element; node; node = node.parentNode) {
      if (node.hidden || node.inert || node.style.display === 'none') return [];
    }
    return [{}];
  };
  element.scrollIntoView = () => {};
  Object.defineProperty(element, 'isConnected', { get: () => document.body.contains(element) });
  return element;
}

function createGuideRuntime(document = makeDom()) {
  const timers = createScheduler();
  const originalCreate = document.createElement;
  document.createElement = tag => prepareElement(originalCreate(tag), document);
  document.querySelectorAll('button, div').forEach(element => prepareElement(element, document));
  const window = makeDom();
  Object.assign(window, { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: true }) });
  const values = new Map();
  const context = vm.createContext({
    document, window,
    Storage: { get: (key, fallback) => values.get(key) ?? fallback, set: (key, value) => values.set(key, value) },
    TimerManager: { setTimeout: timers.schedule, clearTimeout: timers.cancel },
    getComputedStyle: () => ({ visibility: 'visible' }),
    escapeHtml: text => text, clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    SoundManager: { play() {} },
  });
  for (const name of ['shared-dialog.js', 'shared-guide.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../../js', name), 'utf8'), context);
  }
  // 测试 DOM 的 HTML 解析器直接创建子节点，在引导生成后补齐布局与焦点接口。
  const guide = window.GuideSystem;
  guide.createOverlay();
  guide.overlay.querySelectorAll('div, button').forEach(element => prepareElement(element, document));
  return { guide, document, window, timers, values };
}

function guideKey(key, options = {}) {
  return { key, defaultPrevented: false, stopped: false, ...options,
    preventDefault() { this.defaultPrevented = true; },
    stopImmediatePropagation() { this.stopped = true; },
  };
}

module.exports = { createGuideRuntime, guideKey };
