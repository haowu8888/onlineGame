const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadESModule } = require('./helpers/esm-loader');
const { createScheduler } = require('./fixtures/shared-storage');

async function createInput() {
  const frames = createScheduler();
  const { namespace: { SceneInput } } = await loadESModule('js/game-three-input.js', {
    AbortController, requestAnimationFrame: frames.schedule, cancelAnimationFrame: frames.cancel,
  });
  const canvas = new EventTarget();
  const captured = new Set();
  Object.assign(canvas, { style: {}, setPointerCapture: id => captured.add(id),
    hasPointerCapture: id => captured.has(id), releasePointerCapture: id => captured.delete(id) });
  const targets = ['first', 'middle', 'last'].map(key => ({ userData: { key, label: key, action: { key } } }));
  const actions = [];
  const orbits = [];
  const input = new SceneInput({ canvas, root: { querySelectorAll: () => [] }, camera: {},
    targets: () => targets, action: action => actions.push(action), orbit: value => orbits.push(value), announce() {} });
  input.hit = () => targets[0];
  return { input, canvas, captured, frames, targets, actions, orbits };
}

const pointer = (options = {}) => ({ button: 0, isPrimary: true, pointerId: 1, clientX: 10, clientY: 10, ...options });
const keyboard = (key, options = {}) => ({ key, ...options, preventDefault() {} });

test('第二根手指不能替换拖动状态或提前触发场景动作，释放主指针后仅激活一次', async () => {
  const { input, captured, actions } = await createInput();
  input.pointerDown(pointer());
  input.pointerDown(pointer({ pointerId: 2, isPrimary: false }));
  input.pointerMove(pointer({ pointerId: 2, isPrimary: false, clientX: 100 }));
  input.pointerUp(pointer({ pointerId: 2, isPrimary: false }));
  assert.equal(input.down.pointerId, 1);
  assert.equal(actions.length, 0);
  assert.equal(captured.has(1), true);
  input.pointerUp(pointer());
  input.pointerUp(pointer());
  assert.equal(actions.length, 1);
  assert.equal(input.down, null);
  assert.equal(captured.size, 0);
  input.dispose();
});

test('拖动仅转向，不出牌；取消或失去捕获后，松手不再误触', async () => {
  const { input, canvas, actions, orbits, captured } = await createInput();
  input.pointerDown(pointer());
  input.pointerMove(pointer({ clientX: 40 }));
  input.pointerUp(pointer({ clientX: 40 }));
  assert.equal(orbits.length, 1);
  assert.equal(actions.length, 0);
  for (const type of ['pointercancel', 'lostpointercapture']) {
    input.pointerDown(pointer());
    const event = new Event(type);
    Object.defineProperty(event, 'pointerId', { value: 1 });
    canvas.dispatchEvent(event);
    assert.equal(input.down, null);
    input.pointerUp(pointer());
  }
  assert.equal(actions.length, 0);
  assert.equal(captured.size, 0);
  input.dispose();
});

test('首次向左选最后一个、向右选第一个，Home/End 跳首尾，目标消失后重新正确选取', async () => {
  const { input, targets } = await createInput();
  input.keyDown(keyboard('ArrowLeft'));
  assert.equal(input.selectedKey, 'last');
  input.keyDown(keyboard('ArrowRight'));
  assert.equal(input.selectedKey, 'first');
  input.keyDown(keyboard('End'));
  assert.equal(input.selectedKey, 'last');
  input.keyDown(keyboard('Home'));
  assert.equal(input.selectedKey, 'first');
  input.selectedKey = 'removed';
  input.keyDown(keyboard('ArrowLeft'));
  assert.equal(input.selectedKey, 'last');
  targets.splice(0);
  input.keyDown(keyboard('Enter'));
  input.dispose();
});

test('长按确认键不连打，已处理按键不触发动作，离开画布与退出取消悬停任务及捕获', async () => {
  const { input, canvas, actions, frames, captured } = await createInput();
  input.keyDown(keyboard('Enter'));
  input.keyDown(keyboard('Enter', { repeat: true }));
  input.keyDown(keyboard(' ', { defaultPrevented: true }));
  assert.equal(actions.length, 1);
  input.pointerMove(pointer());
  assert.equal(frames.pending.size, 1);
  canvas.dispatchEvent(new Event('pointerleave'));
  assert.equal(frames.pending.size, 0);
  input.pointerDown(pointer());
  input.dispose();
  assert.equal(captured.size, 0);
  assert.equal(input.down, null);
  assert.equal(frames.pending.size, 0);
});
