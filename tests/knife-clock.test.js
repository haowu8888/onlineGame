const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createFixedStepper } = require('../js/knife-clock.js');

test('30–240 Hz 刷新率下，10 秒均推进 600 个物理帧', () => {
  for (const hz of [30, 60, 90, 120, 144, 165, 240]) {
    let frames = 0;
    const clock = createFixedStepper({ update() { frames++; } });
    for (let frame = 0; frame <= hz * 10; frame++) clock.tick(frame * 1000 / hz);
    assert.equal(frames, 600, `${hz} Hz`);
  }
});

test('不均匀的渲染间隔保留不足一帧的时间，不丢失模拟步数', () => {
  let frames = 0;
  const clock = createFixedStepper({ update() { frames++; } });
  [0, 5, 20, 37, 85, 86, 231, 275, 498, 999, 1000].forEach(time => clock.tick(time));
  assert.equal(frames, 60);
});

test('暂停后重置时钟，恢复时不补算后台停留的时间', () => {
  let frames = 0;
  const clock = createFixedStepper({ update() { frames++; } });
  clock.tick(0);
  clock.tick(1000);
  clock.reset();
  clock.tick(60_000);
  assert.equal(frames, 60);
  clock.tick(61_000);
  assert.equal(frames, 120);
});

test('战斗更新失败必须抛出原始错误，不能继续报告成功', () => {
  const failure = new Error('combat failed');
  const clock = createFixedStepper({ update() { throw failure; } });
  clock.tick(0);
  assert.throws(() => clock.tick(20), error => error === failure);
});

test('无效模拟频率明确报错', () => {
  for (const fps of [0, -1, NaN, Infinity]) {
    assert.throws(() => createFixedStepper({ fps, update() {} }), RangeError);
  }
});
