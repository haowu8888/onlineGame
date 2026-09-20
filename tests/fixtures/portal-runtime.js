const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { makeDom } = require('./dom');
const { createStorage } = require('./game-runtime');
const progression = require('../../js/cardcollect-progression.js');
const { createScheduler } = require('./shared-storage');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const VM_TIMEOUT_MS = 1000;
const PORTAL_SCRIPTS = [
  'portal-exchange-data.js', 'portal-exchange-model.js', 'portal-exchange.js',
  'portal-profile.js', 'portal-missions.js', 'portal-leaderboard.js', 'portal-library-location.js', 'portal-library.js', 'portal.js',
];

function createFrames() {
  const frames = new Map();
  let nextId = 0;
  return {
    request(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancel(id) { frames.delete(id); },
    flush() {
      const scheduled = [...frames.values()];
      frames.clear();
      scheduled.forEach(callback => callback());
    },
  };
}

function createEvents() {
  const callbacks = new Map();
  return {
    add(type, callback) { callbacks.set(type, [...(callbacks.get(type) ?? []), callback]); },
    dispatch(event) { (callbacks.get(event.type) ?? []).forEach(callback => callback(event)); },
  };
}

function createServices(storage) {
  const today = {
    missions: [{ name: '体验游戏', desc: '开始一局', icon: '🎮', target: 1, reward: 20 }],
    claimed: [],
  };
  return {
    achievements: { checkNew: () => [], getAll: () => [], getUnlockedCount: () => 0 },
    rewards: { getUnclaimedCount: () => 0 },
    missions: {
      getOrCreateToday: () => today,
      getProgress: () => 1,
      getClaimableCount: () => today.claimed.length ? 0 : 1,
      claim() {
        today.claimed.push(0);
        const stats = storage.get('cross_game_stats', {});
        const points = (stats.xianyuan_points ?? 0) + 20;
        storage.setImmediate('cross_game_stats', { ...stats, xianyuan_points: points });
        return { ok: true, reward: 20, points };
      },
    },
  };
}

function buildContext(runtime) {
  const { document, storage, frames, events, services, calls } = runtime;
  const context = vm.createContext({
    document, Storage: storage, CardCollectProgression: progression,
    URL, location: runtime.location, history: runtime.history,
    setTimeout: runtime.timers.schedule, clearTimeout: runtime.timers.cancel,
    CrossGameAchievements: services.achievements, CrossGameRewards: services.rewards,
    DailyMissions: services.missions,
    formatNumber: value => String(value ?? 0),
    escapeHtml: value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    getLeaderboard: game => storage.get('leaderboard_' + game, []),
    initNav() {}, openDailyMissionsModal() {},
    initParticles(selector, count) { calls.particles.push(count); },
    initScrollAnimations() { calls.scrollAnimations += 1; },
    showToast(message, kind) { calls.toasts.push({ message, kind }); },
    console: { ...console, error(...args) { calls.errors.push(args); } },
    requestAnimationFrame: frames.request, cancelAnimationFrame: frames.cancel,
    addEventListener: events.add, dispatchEvent: events.dispatch,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    scrollY: 0, innerHeight: 800,
    SettingsModal: class {
      constructor(schema, key, onChange) {
        calls.settings = { onChange, schema, key };
      }
    },
  });
  context.window = context;
  return context;
}

function createPortalRuntime(initialStorage = {}, href = 'https://example.test/app/') {
  const storage = createStorage(initialStorage);
  storage.setManyImmediate = updates => {
    Object.entries(updates).forEach(([key, value]) => storage.setImmediate(key, value));
    return true;
  };
  const runtime = {
    storage, document: makeDom(fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8')),
    frames: createFrames(), events: createEvents(), services: createServices(storage),
    calls: { particles: [], scrollAnimations: 0, toasts: [], errors: [], settings: null },
    timers: createScheduler(), location: { href },
  };
  runtime.history = {
    state: { scroll: 10 }, writes: [],
    replaceState(state, title, next) { this.state = state; this.writes.push(next); runtime.location.href = next; },
  };
  runtime.context = buildContext(runtime);
  for (const file of PORTAL_SCRIPTS) {
    const filename = path.join(PROJECT_ROOT, 'js', file);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), runtime.context, { filename, timeout: VM_TIMEOUT_MS });
  }
  return runtime;
}

module.exports = { createPortalRuntime };
