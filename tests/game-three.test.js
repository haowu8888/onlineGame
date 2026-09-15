const test = require('node:test');
const assert = require('node:assert/strict');
const { loadESModule } = require('./helpers/esm-loader');

const modules = Promise.all([
  loadESModule('js/vendor/three.module.js'),
  loadESModule('js/game-three-input.js'),
  loadESModule('js/game-three-resources.js'),
  loadESModule('js/game-three-runtime.js', { AbortController, structuredClone }),
]).then(results => results.map(result => result.namespace));

test('Three.js 拾取返回真实可操作父对象，并排除不合法目标', async () => {
  const [THREE, { pickSceneTarget }] = await modules;
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 50);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
  group.add(mesh);
  group.updateMatrixWorld(true);
  assert.equal(pickSceneTarget({ x: 0, y: 0, camera, targets: [group] }), group);
  assert.equal(pickSceneTarget({ x: 0.9, y: 0.9, camera, targets: [group] }), null);
  assert.equal(pickSceneTarget({ x: 0, y: 0, camera, targets: [] }), null);
  mesh.geometry.dispose();
  mesh.material.dispose();
});

test('重复创建单位复用几何与材质，场景退出恰好释放一次资源', async () => {
  const [, , { SceneResources }] = await modules;
  const resources = new SceneResources();
  const first = resources.mesh({ kind: 'sphere', color: 0x778899 });
  const second = resources.mesh({ kind: 'sphere', color: 0x778899 });
  assert.equal(first.geometry, second.geometry);
  assert.equal(first.material, second.material);
  let geometryDisposals = 0;
  let materialDisposals = 0;
  first.geometry.addEventListener('dispose', () => geometryDisposals++);
  first.material.addEventListener('dispose', () => materialDisposals++);
  resources.dispose();
  resources.dispose();
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
  assert.throws(() => new SceneResources().geometry('invented'), /未知/);
});

test('隐藏页面暂停绘制，恢复后重读状态，退出移除监听并释放渲染器', async () => {
  const [, , , { ThreeGameScene }] = await modules;
  const document = new EventTarget();
  const window = new EventTarget();
  document.hidden = false;
  const canvas = new EventTarget();
  const shell = { canvas };
  const scene = new ThreeGameScene({ shell, source: { id: 'test' }, document, window });
  let loop = null;
  let disposals = 0;
  scene.renderer = { setAnimationLoop: callback => { loop = callback; }, dispose: () => disposals++ };
  scene.events = new AbortController();
  scene.bindLifecycle();
  scene.resume();
  assert.equal(typeof loop, 'function');
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(loop, null);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(typeof loop, 'function');
  assert.equal(scene.lastRead, -Infinity);
  window.dispatchEvent(new Event('pagehide'));
  assert.equal(disposals, 1);
  assert.equal(loop, null);
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(loop, null);
  scene.dispose();
  assert.equal(disposals, 1);
});
