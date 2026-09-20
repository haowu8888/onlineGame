const assert = require('node:assert/strict');
const check = require('node:test');
const { loadGame } = require('./fixtures/game-runtime');
const { createSharedRuntime, BrowserEvent } = require('./fixtures/shared-runtime');

function cultivationSession() {
  const shared = createSharedRuntime();
  const cult = loadGame({ file: 'cultivation.js', entry: '  // --- 初始化 ---', exports: '{ CultivationGame }',
    globals: { Storage: shared.api.Storage, GameSaveCheckpoints: shared.api.GameSaveCheckpoints,
      GameSaveTransfer: shared.api.GameSaveTransfer },
  });
  const game = new cult.api.CultivationGame();
  game.activeSlot = 1;
  game.data = { name: '页面中的旧角色' };
  game.startAutoSave();
  return { game, shared, cult };
}

check('修仙之路：普通退出保存，真正导入后卸载与定时保存都不会把旧角色写回', () => {
  const { shared, cult } = cultivationSession();
  shared.context.dispatchEvent(new BrowserEvent('beforeunload'));
  assert.equal(shared.api.Storage.get('cultivation_save_1').name, '页面中的旧角色');
  shared.api.GameSaveTransfer.applySnapshot({ cultivation_save_1: '{"name":"导入的新角色"}' });
  shared.context.dispatchEvent(new BrowserEvent('beforeunload'));
  shared.context.dispatchEvent(new BrowserEvent('pagehide'));
  cult.intervals.at(-1).callback();
  assert.equal(shared.api.Storage.get('cultivation_save_1').name, '导入的新角色');
});

check('修仙之路：反复进入存档只采集一次最新角色，停止后清除自动保存定时器', () => {
  const { game, shared } = cultivationSession();
  game.activeSlot = 2;
  game.data = { name: '反复进出的角色' };
  game.startAutoSave();
  game.startAutoSave();
  assert.ok(game.autoSaveInterval);
  game.stopAutoSave();
  assert.equal(game.autoSaveInterval, null);
  shared.api.GameSaveCheckpoints.capture();
  assert.equal(shared.control.writes.filter(([key]) => key === 'cultivation_save_2').length, 1);
  assert.equal(shared.api.Storage.get('cultivation_save_2').name, '反复进出的角色');
});

check('修仙之路：导出采集未到自动保存周期的修为，磁盘已满仍能备份最新值', () => {
  const { game, shared } = cultivationSession();
  game.save();
  game.data.exp = 123;
  shared.control.onWrite = () => { throw new Error('quota'); };
  const exported = shared.api.GameSaveTransfer.createSnapshot();
  assert.equal(JSON.parse(exported.cultivation_save_1).exp, 123);
  assert.equal(JSON.parse(shared.data.get('cultivation_save_1')).exp, undefined);
});

check('修仙之路：手机切后台先保存最新进度，PWA 更新遇到保存失败会取消并允许重试', () => {
  const { game, shared } = cultivationSession();
  game.data.exp = 21;
  shared.document.visibilityState = 'hidden';
  shared.document.dispatchEvent(new BrowserEvent('visibilitychange'));
  assert.equal(JSON.parse(shared.data.get('cultivation_save_1')).exp, 21);
  game.data.exp = 99;
  shared.control.onWrite = () => { throw new Error('quota'); };
  const update = new BrowserEvent('pwa:before-update', { cancelable: true });
  assert.equal(shared.document.dispatchEvent(update), false);
  shared.control.onWrite = null;
  assert.equal(shared.document.dispatchEvent(new BrowserEvent('pwa:before-update', { cancelable: true })), true);
  assert.equal(JSON.parse(shared.data.get('cultivation_save_1')).exp, 99);
});
const guigu = loadGame({
  file: 'guigu.js', entry: '/* ==================== 启动 ==================== */',
  exports: '{ GuiguGame, GuiguUI }', initialStorage: { guigu_settings: { autoSave: false } },
});
check('鬼谷八荒：持久化的自动保存开关、即时切换与死亡状态控制实际定时回调', () => {
  const ui = Object.create(guigu.api.GuiguUI.prototype);
  ui.game = new guigu.api.GuiguGame();
  ui.game.state = { name: '自动保存角色', dead: false };
  ui.renderSlotSelection = () => {};
  ui._bindHotkeys = () => {};
  ui.init();
  const interval = guigu.intervals.find(timer => timer.milliseconds === 60000);
  assert.ok(interval);
  interval.callback();
  assert.equal(guigu.storage.get('guigu_save_0'), null);
  ui.settings.values.autoSave = true;
  interval.callback();
  assert.equal(guigu.storage.get('guigu_save_0').name, '自动保存角色');
  ui.game.state.name = '尚未保存的改名';
  ui.settings.values.autoSave = false;
  interval.callback();
  assert.equal(guigu.storage.get('guigu_save_0').name, '自动保存角色');
  ui.settings.values.autoSave = true;
  ui.game.state.dead = true;
  interval.callback();
  assert.equal(guigu.storage.get('guigu_save_0').name, '自动保存角色');
  ui.game.state = null;
  interval.callback();
});
