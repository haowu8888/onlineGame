const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../js/game-scene-bridge');

test('游戏与渲染器可按任意顺序启动，注册仅交付一次且保留真实入口', () => {
  const bridge = create();
  const received = [];
  const port = { id: 'game', read: () => ({ hp: 15 }), act: () => 'controller' };
  bridge.subscribe(source => received.push(source));
  bridge.register(port);
  bridge.subscribe(source => received.push(source));
  assert.equal(received.length, 2);
  assert.equal(received[0], received[1]);
  assert.ok(Object.isFrozen(received[0]));
  assert.equal(received[0].read, port.read);
  assert.equal(received[0].act, port.act);
  assert.throws(() => bridge.register(port), /已注册/);
});

test('解除订阅后不会创建场景，缺失的游戏入口显式报错', () => {
  const bridge = create();
  let called = false;
  const remove = bridge.subscribe(() => { called = true; });
  remove();
  assert.throws(() => bridge.register({ id: 'invalid', read() {} }), /操作入口/);
  bridge.register({ id: 'valid', read() {}, act() {} });
  assert.equal(called, false);
});
