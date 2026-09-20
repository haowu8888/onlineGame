const test = require('node:test');
const assert = require('node:assert/strict');
const { loadESModule } = require('./helpers/esm-loader');

function drawingDocument() {
  const calls = [];
  return { calls, createElement() { return { getContext() { return {
    clearRect() {}, fillText: text => calls.push(text),
  }; } }; } };
}

test('三维伤害和治疗读真实生命差值，首次挂载不伪造受伤，结束与减少动态效果隐藏反馈', async () => {
  const document = drawingDocument();
  const { namespace: { SceneHitFeedback } } = await loadESModule('js/game-three-feedback.js', { document });
  const { namespace: { SceneResources } } = await loadESModule('js/game-three-resources.js');
  const resources = new SceneResources();
  const feedback = new SceneHitFeedback(resources);
  feedback.show({ before: undefined, after: 100, maximum: 100, time: 0 });
  feedback.animate(0, false);
  assert.equal(feedback.root.visible, false);
  feedback.show({ before: 100, after: 63, maximum: 100, time: 1 });
  feedback.animate(1.1, false);
  assert.equal(feedback.root.visible, true);
  assert.equal(feedback.ring.visible, true);
  assert.equal(document.calls.at(-1), '−37');
  feedback.show({ before: 63, after: 80, maximum: 100, time: 2 });
  feedback.animate(2.1, false);
  assert.equal(document.calls.at(-1), '+17');
  assert.equal(feedback.ring.visible, false);
  feedback.animate(2.2, true);
  assert.equal(feedback.root.visible, false);
  feedback.animate(3, false);
  assert.equal(feedback.root.visible, false);
  feedback.dispose();
  resources.dispose();
});

test('天幕主题相同时不更新顶点颜色，主题切换改变色彩且释放只影响自身节点', async () => {
  const { namespace: THREE } = await loadESModule('js/vendor/three.module.js');
  const { namespace: { SceneAtmosphere } } = await loadESModule('js/game-three-atmosphere.js');
  const scene = new THREE.Scene();
  const retained = new THREE.Group();
  scene.add(retained);
  const sky = new SceneAtmosphere(scene);
  const theme = { sky: 0x89bbcc, light: 0xffd8a0, ground: 0x4a6c5a };
  sky.update(theme);
  const version = sky.colors.version;
  const color = sky.colors.array.slice(0, 3);
  sky.update(theme);
  assert.equal(sky.colors.version, version);
  sky.update({ ...theme, sky: 0x435987 });
  assert.notDeepEqual(sky.colors.array.slice(0, 3), color);
  assert.ok(sky.colors.array.every(Number.isFinite));
  let released = 0;
  sky.geometry.addEventListener('dispose', () => released++);
  sky.material.addEventListener('dispose', () => released++);
  sky.dispose();
  assert.equal(released, 2);
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0], retained);
});
