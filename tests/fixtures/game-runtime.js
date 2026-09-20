const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { makeDom } = require('./dom');
const catalog = require('../../js/cardcollect-catalog.js');
const progression = require('../../js/cardcollect-progression.js');
const recovery = require('../../js/cultivation-recovery.js');
const battleView = require('../../js/cardcollect-battle-view.js');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const VM_TIMEOUT_MS = 1000;

function createStorage(initialStorage = {}) {
  const values = new Map(Object.entries(initialStorage));
  return {
    get(key, fallback = null) { return values.has(key) ? structuredClone(values.get(key)) : fallback; },
    set(key, value) { values.set(key, structuredClone(value)); },
    setImmediate(key, value) { values.set(key, structuredClone(value)); },
    remove(key) { values.delete(key); },
  };
}

function createContext({ storage, document, callbacks, intervals }) {
  const fixedMath = Object.create(Math);
  fixedMath.random = () => 0;
  const context = vm.createContext({
    console, Math: fixedMath, Storage: storage, document,
    CardCollectCatalog: catalog, CardCollectProgression: progression, CultivationRecovery: recovery,
    CardCollectBattleView: battleView,
    initNav() {}, initParticles() {}, showToast() {}, updateLeaderboard() {}, getLeaderboard: () => [],
    randomInt: min => min, pick: list => list[0],
    clamp: (number, min, max) => Math.min(max, Math.max(min, number)),
    formatNumber: String, escapeHtml: value => String(value ?? ''),
    setTimeout() { return 1; }, clearTimeout() {},
    setInterval(callback, milliseconds) { intervals.push({ callback, milliseconds }); return intervals.length; },
    clearInterval() {},
    addEventListener(name, callback) {
      callbacks.set(name, [...(callbacks.get(name) ?? []), callback]);
    },
    SettingsModal: class {
      constructor(schema, key) {
        this.values = { ...Object.fromEntries(schema.map(field => [field.key, field.default])), ...storage.get(key, {}) };
      }
      get(key) { return this.values[key]; }
    },
  });
  context.window = context;
  return context;
}

// 只截去页面启动入口并开放测试引用；被测角色、战斗与保存逻辑直接来自生产脚本。
function loadGame(options) {
  const storage = createStorage(options.initialStorage);
  const callbacks = new Map();
  const intervals = [];
  const html = options.html ? fs.readFileSync(path.join(PROJECT_ROOT, options.html), 'utf8') : '';
  const document = makeDom(html);
  const context = createContext({ storage, document, callbacks, intervals });
  Object.assign(context, options.globals);
  if (options.file === 'cardcollect.js') {
    const view = path.join(PROJECT_ROOT, 'js/cardcollect-roster-view.js');
    vm.runInContext(fs.readFileSync(view, 'utf8'), context, { filename: view, timeout: VM_TIMEOUT_MS });
  }
  const filename = path.join(PROJECT_ROOT, 'js', options.file);
  const source = fs.readFileSync(filename, 'utf8');
  const end = source.lastIndexOf(options.entry);
  assert.ok(end >= 0, '页面启动标记存在: ' + options.file);
  const instrumented = source.slice(0, end) + '\nglobalThis.testApi = (' + options.exports + ');\n})();';
  vm.runInContext(instrumented, context, { filename, timeout: VM_TIMEOUT_MS });
  return { api: context.testApi, context, storage, document, callbacks, intervals };
}

module.exports = { loadGame, createStorage };
