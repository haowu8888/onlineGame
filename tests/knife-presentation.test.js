const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadESModule } = require('./helpers/esm-loader.js');

const modules = Promise.all([
  loadESModule('js/vendor/three.module.js'), loadESModule('js/knife-three-dash.js'),
  loadESModule('js/knife-three-loot.js'), loadESModule('js/knife-three-actors.js'),
  loadESModule('js/knife-three-labels.js'),
]).then(results => results.map(result => result.namespace));
const CENTER = Object.freeze({ x: 0, y: 0 });

// 记录 2D 画布调用的桩，故意不提供 roundRect，模拟旧版 Safari。
function recordingContext(calls) {
  const record = name => (...args) => { calls.push([name, ...args]); };
  return {
    fillStyle: '', font: '', textAlign: '', textBaseline: '', strokeStyle: '', lineWidth: 0, globalAlpha: 1,
    setTransform: record('setTransform'), clearRect: record('clearRect'), fillRect: record('fillRect'),
    fillText: record('fillText'), strokeText: record('strokeText'), beginPath: record('beginPath'),
    moveTo: record('moveTo'), arcTo: record('arcTo'), closePath: record('closePath'), fill: record('fill'),
  };
}

test('浏览器缺少 roundRect 时连斩提示改用圆弧路径，精英名字照常投影绘制', async () => {
  const [THREE, , , , { ArenaLabels }] = await modules;
  const calls = [];
  const canvas = { width: 0, height: 0, style: {}, getContext: () => recordingContext(calls) };
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(0, 30, 27);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const labels = new ArenaLabels({ canvas, camera });
  labels.resize({ width: 400, height: 300, pixelRatio: 2 });
  assert.equal(canvas.width, 800);
  labels.render({
    game: { player: {}, killCombo: 5, dmgTexts: [], enemies: [{ alive: true, isElite: true, name: '游侠', x: 24, y: 24, radius: 16 }] },
    center: CENTER, showDamage: true, motion: false,
  });
  const names = calls.map(([name]) => name);
  assert.ok(names.includes('arcTo'));
  assert.ok(names.includes('fill'));
  assert.ok(calls.some(([name, text]) => name === 'fillText' && text === '5 连斩'));
  const label = calls.find(([name, text]) => name === 'fillText' && text === '游侠');
  assert.ok(label && Number.isFinite(label[2]) && Number.isFinite(label[3]));
});

test('闪避轨迹沿实际路径，零位移不产生虚假刀光，释放不遗留场景节点', async () => {
  const [THREE, { DashTrails }] = await modules;
  const scene = new THREE.Scene();
  const trails = new DashTrails(scene);
  trails.render({ center: CENTER, segments: [
    { x1: 0, y1: 0, x2: 24, y2: 24, life: 1 },
    { x1: 24, y1: 24, x2: 24, y2: 24, life: 1 },
  ] });
  assert.equal(trails.batch.mesh.count, 3);
  const matrix = new THREE.Matrix4();
  trails.batch.mesh.getMatrixAt(1, matrix);
  assert.ok(matrix.elements.every(Number.isFinite));
  assert.equal(matrix.elements[12], 0.5);
  assert.equal(matrix.elements[14], 0.5);
  assert.ok(Math.abs(matrix.elements[0] - matrix.elements[2]) < 1e-6);
  trails.render({ center: CENTER, segments: [] });
  assert.equal(trails.batch.mesh.count, 0);
  trails.dispose();
  assert.equal(scene.children.length, 0);
});

test('三种补给采用各自几何，批量扩容和拾取清空不留残影或无效坐标', async () => {
  const [THREE, , { ArenaLoot }] = await modules;
  const scene = new THREE.Scene();
  const loot = new ArenaLoot(scene);
  const chests = Array.from({ length: 60 }, (_, index) => ({
    x: index * 10, y: index * 5, type: ['gold', 'heal', 'exp'][index % 3],
    bobPhase: index * 0.1, alive: true,
  }));
  loot.render({ chests, center: CENTER, time: 1 });
  assert.equal(loot.wood.mesh.count, 40);
  assert.equal(loot.bottles.mesh.count, 20);
  assert.equal(loot.crystals.mesh.count, 20);
  assert.equal(loot.rings.mesh.count, 60);
  const matrix = new THREE.Matrix4();
  for (const batch of loot.batches) {
    for (let index = 0; index < batch.mesh.count; index++) {
      batch.mesh.getMatrixAt(index, matrix);
      assert.ok(matrix.elements.every(Number.isFinite));
    }
  }
  loot.render({ chests: [], center: CENTER, time: 2 });
  assert.ok(loot.batches.every(batch => batch.mesh.count === 0));
  loot.dispose();
  assert.equal(scene.children.length, 0);
});

function actorColors(actors) {
  return Object.fromEntries(['hat', 'head', 'cloth', 'torso'].map(name => {
    const batch = actors.parts[name];
    return [name, Array.from(batch.mesh.instanceColor.array.slice(0, batch.mesh.count * 3))];
  }));
}

test('金钟罩保持角色原色，真正受伤只闪衣服，不抹掉斗笠、脸和红巾', async () => {
  const [THREE, , , { ArenaActors }] = await modules;
  const actors = new ArenaActors(new THREE.Scene());
  const player = { x: 0, y: 0, radius: 16, facingAngle: 0, hp: 100, maxHp: 100,
    hurtFlash: 0, invincible: 0, dash: { frames: 0 } };
  const render = entity => actors.render({ game: { player: entity, enemies: [] }, center: CENTER, time: 1 });
  render(player);
  const normal = actorColors(actors);
  render({ ...player, invincible: 180 });
  assert.deepEqual(actorColors(actors), normal);
  render({ ...player, hurtFlash: 8 });
  const hurt = actorColors(actors);
  for (const name of ['hat', 'head', 'cloth']) assert.deepEqual(hurt[name], normal[name]);
  assert.notDeepEqual(hurt.torso, normal.torso);
  actors.dispose();
});
