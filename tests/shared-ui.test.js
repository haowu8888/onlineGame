const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSharedRuntime, plain } = require('./fixtures/shared-runtime.js');

test('设置保留数值 0 与布尔 false，select 返回 schema 声明的原始类型', () => {
  const { api } = createSharedRuntime();
  const numeric = { key: 'speed', type: 'select', default: 1, options: [{ value: 0 }, { value: 1 }] };
  const boolean = { key: 'animation', type: 'select', default: true, options: [{ value: false }, { value: true }] };
  const checkbox = { key: 'autoSave', type: 'checkbox', default: true };
  assert.equal(api.SettingsFields.initialValue(numeric, { speed: 0 }), 0);
  assert.equal(api.SettingsFields.initialValue(boolean, { animation: false }), false);
  assert.equal(api.SettingsFields.initialValue(checkbox, { autoSave: false }), false);
  assert.equal(api.SettingsFields.read(numeric, { value: '0' }), 0);
  assert.equal(api.SettingsFields.read(boolean, { value: 'false' }), false);
  assert.equal(api.SettingsFields.read(checkbox, { checked: false }), false);
});

test('设置写入失败不关闭弹窗、不修改已生效设置与昵称', () => {
  const runtime = createSharedRuntime({ settings: '{"speed":1}', player_profile: '{"name":"原昵称"}' });
  const { api, document, control } = runtime;
  const overlay = document.createElement('div');
  overlay.queries.set('[data-key="speed"]', [{ value: '0' }]);
  overlay.queries.set('[data-profile="name"]', [{ value: '新昵称' }]);
  let closed = false;
  let changed = false;
  const modal = Object.assign(Object.create(api.SettingsModal.prototype), {
    schema: [{ key: 'speed', type: 'select', default: 1, options: [{ value: 0 }, { value: 1 }] }],
    storageKey: 'settings', values: { speed: 1 }, overlay,
    close() { closed = true; }, onChange() { changed = true; },
  });
  control.onWrite = key => { if (key === 'player_profile') throw new Error('quota'); };
  assert.equal(modal.save(), false);
  assert.equal(closed, false);
  assert.equal(changed, false);
  assert.deepEqual(modal.values, { speed: 1 });
  assert.deepEqual(plain(api.Storage.get('settings')), { speed: 1 });
  assert.equal(api.getPlayerName(), '原昵称');
  control.onWrite = null;
  assert.equal(modal.save(), true);
  assert.equal(modal.get('speed'), 0);
  assert.equal(api.getPlayerName(), '新昵称');
});

test('弹窗 Tab 焦点循环，关闭后恢复触发按钮', () => {
  const { api, document } = createSharedRuntime();
  const opener = document.createElement('button');
  const overlay = document.createElement('div');
  const first = document.createElement('button');
  const last = document.createElement('button');
  overlay.appendChild(first);
  overlay.appendChild(last);
  overlay.querySelectorAll = () => [first, last];
  document.queries.set('.modal-overlay.active', [overlay]);
  opener.focus();
  const focus = new api.ModalFocus(overlay);
  assert.equal(overlay.inert, true);
  assert.equal(overlay.hidden, true);
  assert.equal(overlay.classList.contains('hidden'), true);
  assert.equal(overlay.getAttribute('aria-hidden'), 'true');
  focus.open();
  assert.equal(overlay.inert, false);
  assert.equal(overlay.hidden, false);
  assert.equal(overlay.classList.contains('hidden'), false);
  assert.equal(document.activeElement, first);
  let prevented = false;
  const event = { key: 'Tab', shiftKey: true, preventDefault() { prevented = true; } };
  focus.onKeyDown(event);
  assert.equal(prevented, true);
  assert.equal(document.activeElement, last);
  focus.onKeyDown({ ...event, shiftKey: false });
  assert.equal(document.activeElement, first);
  focus.close();
  assert.equal(overlay.inert, true);
  assert.equal(overlay.hidden, true);
  assert.equal(overlay.classList.contains('hidden'), true);
  assert.equal(overlay.getAttribute('aria-hidden'), 'true');
  assert.equal(document.activeElement, opener);
});

test('弹窗跳过隐藏分组、CSS 隐藏、禁用及负 tabIndex 控件', () => {
  const { api, document } = createSharedRuntime();
  const overlay = document.createElement('div');
  const controls = Array.from({ length: 9 }, () => document.createElement('button'));
  controls.forEach(control => overlay.appendChild(control));
  controls[0].hidden = true;
  controls[1].disabled = true;
  controls[2].tabIndex = -1;
  controls[3].style.display = 'none';
  controls[4].style.visibility = 'hidden';
  controls[5].setAttribute('aria-disabled', 'true');
  const group = document.createElement('div');
  group.hidden = true;
  overlay.appendChild(group);
  group.appendChild(controls[6]);
  const inertGroup = document.createElement('div');
  inertGroup.inert = true;
  overlay.appendChild(inertGroup);
  inertGroup.appendChild(controls[7]);
  overlay.querySelectorAll = () => controls;
  const focus = new api.ModalFocus(overlay);
  focus.open();
  assert.deepEqual([...focus.focusableElements()], [controls[8]]);
  assert.equal(document.activeElement, controls[8]);
});

test('没有可聚焦控件时焦点留在弹窗，关闭后再次打开使用新的触发按钮', () => {
  const { api, document } = createSharedRuntime();
  const overlay = document.createElement('div');
  const opener = document.createElement('button');
  const nextOpener = document.createElement('button');
  document.queries.set('.modal-overlay.active', [overlay]);
  opener.focus();
  const focus = new api.ModalFocus(overlay);
  focus.open();
  assert.equal(overlay.tabIndex, -1);
  assert.equal(document.activeElement, overlay);
  let prevented = false;
  focus.onKeyDown({ key: 'Tab', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(document.activeElement, overlay);
  focus.close();
  assert.equal(document.activeElement, opener);
  nextOpener.focus();
  focus.close();
  assert.equal(document.activeElement, nextOpener);
  focus.open();
  focus.close();
  assert.equal(document.activeElement, nextOpener);
});

test('只允许最上层弹窗循环焦点，关闭内层时恢复外层触发按钮', () => {
  const { api, document } = createSharedRuntime();
  const outer = document.createElement('div');
  const inner = document.createElement('div');
  const outerButton = document.createElement('button');
  const innerButton = document.createElement('button');
  outer.appendChild(outerButton);
  inner.appendChild(innerButton);
  outer.querySelectorAll = () => [outerButton];
  inner.querySelectorAll = () => [innerButton];
  const outerFocus = new api.ModalFocus(outer);
  const innerFocus = new api.ModalFocus(inner);
  outerFocus.open();
  innerFocus.open();
  document.queries.set('.modal-overlay.active', [outer, inner]);
  let prevented = false;
  outerFocus.onKeyDown({ key: 'Tab', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(document.activeElement, innerButton);
  innerFocus.destroy();
  assert.equal(inner.hidden, true);
  assert.equal(document.activeElement, outerButton);
  outerFocus.destroy();
});

test('每日仙令刷新后聚焦下一项可领取奖励，领完回到关闭按钮', () => {
  const { api, document } = createSharedRuntime();
  const overlay = document.createElement('div');
  const content = document.createElement('div');
  const claimed = document.createElement('button');
  const next = document.createElement('button');
  const close = document.createElement('button');
  const outside = document.createElement('button');
  overlay.appendChild(content);
  overlay.appendChild(close);
  content.appendChild(claimed);
  content.appendChild(next);
  overlay.queries.set('.daily-modal-content', [content]);
  overlay.queries.set('.modal-close', [close]);
  content.queries.set('.daily-claim-btn:not(:disabled)', [next]);
  claimed.focus();
  api.renderDailyMissions(overlay, 'knife');
  assert.equal(document.activeElement, next);
  content.queries.set('.daily-claim-btn:not(:disabled)', []);
  api.renderDailyMissions(overlay, 'knife');
  assert.equal(document.activeElement, close);
  outside.focus();
  api.renderDailyMissions(overlay, 'knife');
  assert.equal(document.activeElement, outside);
});

test('禁用按钮与直接插入的按钮始终保留原生 disabled，不会被观察器误启用', () => {
  const { api, document, observers } = createSharedRuntime();
  const button = document.createElement('button');
  button.setAttribute('disabled', '');
  button.dataset.disabledReason = '技能冷却中';
  api.watchDisabledButtons();
  observers[0].callback([{ type: 'childList', addedNodes: [button] }]);
  assert.equal(button.disabled, true);
  assert.equal(button.hasAttribute('disabled'), true);
  assert.equal(button.title, '技能冷却中');
  observers[0].callback([{ type: 'attributes', target: button }]);
  assert.equal(button.disabled, true);
  button.removeAttribute('disabled');
  observers[0].callback([{ type: 'attributes', target: button }]);
  assert.equal(button.disabled, false);
  assert.notEqual(button.getAttribute('aria-disabled'), 'true');
});

test('零音量与关闭音效不会初始化音频设备，开关状态仍然持久化', () => {
  const { api } = createSharedRuntime();
  let contexts = 0;
  const sound = new api.SharedSoundController({ storage: api.Storage,
    createContext() { contexts++; throw new Error('不应初始化'); }, schedule() {}, canStartAudio: () => true });
  sound.setVolume(0);
  sound.play('click');
  assert.equal(contexts, 0);
  sound.setVolume(1);
  sound.setEnabled(false);
  sound.play('click');
  assert.equal(contexts, 0);
  api.Storage.flush();
  assert.equal(api.Storage.get('sound_enabled'), false);
  assert.equal(api.Storage.get('sound_volume'), 1);
});
