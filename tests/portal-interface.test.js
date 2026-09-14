const assert = require('node:assert/strict');
const test = require('node:test');
const { createPortalRuntime } = require('./fixtures/portal-runtime');

test('首页保留粒子数量 0，动画设置即时生效且只初始化一次滚动观察', () => {
  const runtime = createPortalRuntime({ portal_settings: { particleCount: 0 } });
  assert.equal(runtime.calls.particles[0], 0);
  runtime.calls.settings.onChange({ particleCount: 35, enableAnimations: false, fontSize: 'large' });
  assert.equal(runtime.calls.particles.at(-1), 0);
  assert.equal(runtime.document.documentElement.dataset.animations, 'off');
  assert.equal(runtime.document.documentElement.dataset.fontsize, 'large');
  assert.ok(runtime.document.querySelectorAll('.fade-in').every(node => node.classList.contains('visible')));
  runtime.calls.settings.onChange({ particleCount: 35, enableAnimations: true, fontSize: 'normal' });
  assert.equal(runtime.calls.particles.at(-1), 35);
  assert.equal(runtime.document.documentElement.dataset.animations, 'on');
  assert.equal(runtime.calls.scrollAnimations, 1);
});

test('排行榜方向键、Home、End 同步焦点、选中状态与对应面板', () => {
  const runtime = createPortalRuntime();
  const container = runtime.document.getElementById('lb-tabs');
  const table = runtime.document.getElementById('lb-table');
  const tabs = container.querySelectorAll('.leaderboard-tab');
  function press(target, key) {
    let prevented = false;
    container.dispatchEvent({ type: 'keydown', target, key, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
  }
  assert.equal(tabs[0].tabIndex, 0);
  press(tabs[0], 'ArrowRight');
  assert.equal(runtime.document.activeElement, tabs[1]);
  assert.equal(table.getAttribute('aria-labelledby'), tabs[1].id);
  assert.equal(tabs[0].getAttribute('aria-selected'), 'false');
  assert.equal(tabs[1].tabIndex, 0);
  press(tabs[1], 'End');
  assert.equal(runtime.document.activeElement, tabs.at(-1));
  press(tabs.at(-1), 'Home');
  assert.equal(runtime.document.activeElement, tabs[0]);
  press(tabs[0], 'ArrowLeft');
  assert.equal(runtime.document.activeElement, tabs.at(-1));
});

test('从其他入口领取每日任务后，事件刷新首页余额与商品可兑换状态', () => {
  const runtime = createPortalRuntime({
    cross_game_stats: { xianyuan_points: 0 },
    cultivation_save_1: { name: '道友', gold: 50 },
  });
  runtime.storage.setImmediate('cross_game_stats', { xianyuan_points: 100 });
  runtime.events.dispatch({ type: 'daily-missions-updated' });
  runtime.frames.flush();
  assert.equal(runtime.document.getElementById('exchange-pts').textContent, '仙缘点: 100');
  assert.equal(runtime.document.getElementById('daily-points').textContent, '仙缘点: 100');
  const item = runtime.document.getElementById('exchange-grid').querySelector('[data-id="cult_gold_500"]');
  assert.equal(item.getAttribute('aria-disabled'), 'false');
});

test('每日任务写入失败时显示错误，不先标记领取或增加余额', () => {
  const runtime = createPortalRuntime({ cross_game_stats: { xianyuan_points: 0 } });
  runtime.services.missions.claim = () => { throw new Error('模拟持久化失败'); };
  const grid = runtime.document.getElementById('daily-grid');
  const card = grid.querySelector('.daily-mission-card');
  grid.dispatchEvent({ type: 'click', target: card });
  runtime.frames.flush();
  assert.equal(runtime.storage.get('cross_game_stats').xianyuan_points, 0);
  assert.equal(runtime.document.getElementById('daily-points').textContent, '仙缘点: 0');
  assert.equal(runtime.calls.toasts.at(-1).message, '模拟持久化失败');
  assert.equal(runtime.calls.toasts.at(-1).kind, 'error');
  assert.equal(runtime.calls.errors.length, 1);
  assert.deepEqual(runtime.services.missions.getOrCreateToday().claimed, []);
});
