const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadESModule } = require('./helpers/esm-loader');

const rendererModules = Promise.all([
  loadESModule('js/vendor/three.module.js'),
  loadESModule('js/knife-three-batch.js'),
  loadESModule('js/knife-three-effects.js'),
  loadESModule('js/knife-three-stage.js'),
]).then(results => results.map(result => result.namespace));

test('实例扩容保留本帧所有坐标，后续少量实体复用同一网格', async () => {
  const [THREE, { InstanceBatch }] = await rendererModules;
  const scene = new THREE.Scene();
  const batch = new InstanceBatch({ scene, geometry: new THREE.BoxGeometry(), material: new THREE.MeshBasicMaterial() });
  batch.begin(70);
  for (let index = 0; index < 70; index++) batch.put({ x: index, y: 1, z: -index });
  batch.end();
  assert.equal(batch.mesh.count, 70);
  const matrix = new THREE.Matrix4();
  batch.mesh.getMatrixAt(69, matrix);
  assert.equal(matrix.elements[12], 69);
  assert.equal(matrix.elements[14], -69);
  const mesh = batch.mesh;
  batch.begin(1);
  batch.put({ x: 9, y: 0, z: 0 });
  batch.end();
  assert.equal(batch.mesh, mesh);
  assert.equal(batch.mesh.count, 1);
  assert.equal(scene.children.length, 1);
  batch.dispose();
});

test('同时绘制大量危险区域与八个技能时，不会在扩容中丢失危险区域', async () => {
  const [THREE, , { ArenaEffects }] = await rendererModules;
  const effects = new ArenaEffects(new THREE.Scene());
  const hazards = Array.from({ length: 40 }, (_, index) => ({ x: 240 + index, y: 0, radius: 30, type: 'fire' }));
  const player = { x: 0, y: 0, radius: 16, getBladeEndpoints: () => [] };
  const game = { player, hazards, dashTrails: [], skills: Array.from({ length: 8 }, () => ({ active: true })) };
  effects.render({ game, center: { x: 0, y: 0 }, time: 1 });
  assert.equal(effects.zones.mesh.count, 40);
  assert.ok(effects.rings.mesh.count >= 48);
  const matrix = new THREE.Matrix4();
  effects.rings.mesh.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[12], 10);
  effects.dispose();
});

test('重复帧不积累场景节点；释放批次会释放几何和材质', async () => {
  const [THREE, { InstanceBatch }] = await rendererModules;
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial();
  let geometryDisposals = 0;
  let materialDisposals = 0;
  geometry.addEventListener('dispose', () => geometryDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  const batch = new InstanceBatch({ scene, geometry, material });
  for (let frame = 0; frame < 200; frame++) {
    batch.begin(2);
    batch.put({ x: 0, y: 0, z: 0 });
    batch.put({ x: 1, y: 0, z: 1 });
    batch.end();
  }
  assert.equal(scene.children.length, 1);
  batch.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
});

test('演武场释放仅处理自身资源，不销毁同场景中的角色几何', async () => {
  const [THREE, , , { ArenaStage }] = await rendererModules;
  const scene = new THREE.Scene();
  const actor = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  let actorDisposals = 0;
  actor.geometry.addEventListener('dispose', () => actorDisposals++);
  scene.add(actor);
  const stage = new ArenaStage(scene);
  stage.dispose();
  assert.equal(actorDisposals, 0);
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0], actor);
  actor.geometry.dispose();
  actor.material.dispose();
});
