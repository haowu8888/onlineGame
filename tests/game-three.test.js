const test = require('node:test');
const assert = require('node:assert/strict');
const { loadESModule } = require('./helpers/esm-loader');

// 场景文字标签需要 2D 画布；这里只记录调用，不依赖真实浏览器。
function fakeDocument() {
  const context = {
    fillStyle: '', font: '', textAlign: '', textBaseline: '',
    clearRect() {}, beginPath() {}, moveTo() {}, arcTo() {}, closePath() {}, fill() {}, fillText() {},
  };
  return { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
}

const modules = Promise.all([
  loadESModule('js/vendor/three.module.js'),
  loadESModule('js/game-three-input.js'),
  loadESModule('js/game-three-resources.js'),
  loadESModule('js/game-three-runtime.js', { AbortController, structuredClone, document: fakeDocument() }),
]).then(results => results.map(result => result.namespace));

function mapModel(step) {
  const tiles = [0, 1, 2].map(index => ({
    key: (index + step) + ',0', name: index === 1 ? '青木镇' : '林地', type: 'forest', known: true,
    x: (index - 1) * 1.7, z: 0, location: index === 1, selected: false, onRoute: false,
    action: { type: 'map-select', x: index + step, y: 0 },
  }));
  tiles.push({ key: (3 + step) + ',0', name: '未探索', type: 'fog', known: false, x: 3.4, z: 0,
    location: false, selected: false, onRoute: false, action: null });
  return { kind: 'map', theme: 'guigu', title: '八荒行旅', caption: '', units: [], cards: [], markers: [], tiles };
}

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

test('地图每走一步只重建地块层，山川布景与共享材质保留，旧布局几何精确释放', async () => {
  const [, , , { ThreeGameScene }] = await modules;
  const scene = new ThreeGameScene({ shell: { canvas: new EventTarget() }, source: { id: 'guigu' },
    document: new EventTarget(), window: new EventTarget() });
  const scenery = scene.scenery;
  assert.equal(scenery.sync(mapModel(0)), true);
  const backdrop = scenery.backdrop;
  const layout = scenery.layout;
  const released = [];
  const watch = (layer, name) => layer.owned.forEach(resource => resource.addEventListener('dispose', () => released.push(name)));
  watch(backdrop, 'backdrop');
  watch(layout, 'layout');
  assert.ok(backdrop.owned.size > 0 && layout.owned.size > 0);
  assert.deepEqual(Array.from(scenery.targets, target => target.userData.key), ['0,0', '1,0', '2,0']);
  assert.equal(scenery.sync(mapModel(0)), false);
  const materials = scene.resources.materials.size;
  assert.equal(scenery.sync(mapModel(1)), true);
  assert.equal(scenery.backdrop, backdrop);
  assert.notEqual(scenery.layout, layout);
  assert.equal(scene.resources.materials.size, materials);
  assert.ok(released.length > 0 && released.every(name => name === 'layout'));
  assert.deepEqual(Array.from(scenery.targets, target => target.userData.key), ['1,0', '2,0', '3,0']);
  assert.equal(scenery.root.children.length, 2);
  scene.dispose();
  assert.ok(released.includes('backdrop'));
  assert.equal(scenery.root.children.length, 0);
  assert.equal(scene.scene.children.includes(scenery.root), false);
});

function createFrameScene(ThreeGameScene, initial) {
  let model = initial;
  let parent = null;
  const stats = { renders: 0, updates: 0, mounts: 0, parent: null };
  const canvas = Object.assign(new EventTarget(), { clientWidth: 800, clientHeight: 450 });
  const shell = { canvas, update: () => stats.updates++, mount: value => { stats.mounts++; stats.parent = value; } };
  const document = Object.assign(new EventTarget(), { hidden: false });
  const source = { id: 'test', read: () => structuredClone(model), mount: () => parent };
  const scene = new ThreeGameScene({ shell, source, document, window: new EventTarget() });
  scene.renderer = { render: () => stats.renders++, setSize() {}, setAnimationLoop() {}, dispose() {} };
  scene.motion = { matches: false };
  return { scene, stats, setModel: value => { model = value; }, setParent: value => { parent = value; } };
}

const gardenModel = units => ({ kind: 'garden', theme: 'cultivation', title: '修行',
  caption: '', units, cards: [], markers: [] });

test('静止场景仅在状态、视角或尺寸变化时绘制，相同状态仍检查挂载位置', async () => {
  const [, , , { ThreeGameScene }] = await modules;
  const runtime = createFrameScene(ThreeGameScene, gardenModel([]));
  const { scene, stats } = runtime;
  scene.frame(0);
  for (let time = 16; time <= 1000; time += 16) scene.frame(time);
  assert.equal(stats.renders, 1);
  assert.equal(stats.updates, 1);
  assert.ok(stats.mounts > 1);
  const parent = {};
  runtime.setParent(parent);
  scene.frame(1200);
  assert.equal(stats.parent, parent);
  assert.equal(stats.renders, 1);
  runtime.setModel({ ...gardenModel([]), title: '下一境界' });
  scene.frame(1400);
  assert.equal(stats.renders, 2);
  assert.equal(stats.updates, 2);
  scene.orbit({ yaw: 0.2 });
  scene.frame(1416);
  assert.equal(stats.renders, 3);
  scene.resize();
  scene.frame(1432);
  assert.equal(stats.renders, 4);
  scene.dispose();
});

test('正常人物动画逐帧绘制，减少动态效果时按需更新，生命值变化仍立即呈现', async () => {
  const [, , , { ThreeGameScene }] = await modules;
  const unit = { key: 'player', name: '修士', role: 'sage', side: 'player', x: 0, z: 0, hp: 10, maxHp: 10 };
  const runtime = createFrameScene(ThreeGameScene, gardenModel([unit]));
  const { scene, stats } = runtime;
  scene.frame(0);
  scene.frame(16);
  scene.frame(32);
  assert.equal(stats.renders, 3);
  scene.motion.matches = true;
  scene.needsRender = true;
  scene.frame(48);
  scene.frame(64);
  scene.frame(120);
  assert.equal(stats.renders, 4);
  assert.equal(stats.updates, 1);
  runtime.setModel(gardenModel([{ ...unit, hp: 5, x: 2 }]));
  scene.frame(240);
  assert.equal(stats.renders, 5);
  const piece = scene.pieces.pieces.get('player');
  assert.equal(piece.root.position.x, 2);
  assert.equal(piece.lastHp, 5);
  scene.frame(360);
  assert.equal(stats.renders, 5);
  scene.motion.matches = false;
  scene.frame(376);
  scene.frame(392);
  assert.equal(stats.renders, 7);
  scene.dispose();
});

test('画布不可见时保留待绘制状态，恢复或从页面缓存返回后重绘', async () => {
  const [, , , { ThreeGameScene }] = await modules;
  const { scene, stats, setModel } = createFrameScene(ThreeGameScene, gardenModel([]));
  scene.frame(0);
  scene.inView = false;
  setModel({ ...gardenModel([]), title: '后台更新' });
  scene.frame(120);
  assert.equal(stats.renders, 1);
  assert.equal(scene.needsRender, true);
  scene.inView = true;
  scene.frame(136);
  assert.equal(stats.renders, 2);
  scene.pause();
  scene.resume();
  scene.frame(152);
  assert.equal(stats.renders, 3);
  scene.dispose();
});
