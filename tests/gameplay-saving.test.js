const assert = require('node:assert/strict');
const check = require('node:test');
const { loadGame } = require('./fixtures/game-runtime');

const cult = loadGame({ file: 'cultivation.js', entry: '  // --- 初始化 ---', exports: '{ CultivationGame }' });
check('修仙之路：普通退出仍保存；模拟 isReloading=true 时卸载钩子跳过旧存档写回', () => {
  const game = new cult.api.CultivationGame();
  game.activeSlot = 1;
  game.data = { name: '页面中的旧角色' };
  game.startAutoSave();
  const unload = cult.callbacks.get('beforeunload')[0];
  unload();
  assert.equal(cult.storage.get('cultivation_save_1').name, '页面中的旧角色');
  cult.storage.setImmediate('cultivation_save_1', { name: '模拟导入的新角色' });
  cult.context.GameSaveTransfer = { isReloading: true };
  unload();
  assert.equal(cult.storage.get('cultivation_save_1').name, '模拟导入的新角色');
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
