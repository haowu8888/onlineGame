const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createKnifeRuntime } = require('./helpers/knife-runtime');
const { loadESModule } = require('./helpers/esm-loader');

const CENTER = Object.freeze({ x: 0, y: 0 });

function enemyFor(game) {
  return game.entities.enemy({ x: 48, y: 24, type: 'pawn', waveScale: 1, diff: game.diff });
}

test('实际命中产生方向、暴击与击败记录；同帧群攻只播放最强的一次命中声', async () => {
  const sounds = [];
  const { game } = await createKnifeRuntime({}, { sound: { play: name => sounds.push(name) } });
  game.start();
  sounds.length = 0;
  const enemy = enemyFor(game);
  game.damageEnemy({ enemy, damage: 1, color: '#ffaa44' });
  assert.equal(game.impacts.length, 1);
  assert.equal(game.impacts[0].critical, false);
  assert.equal(game.impacts[0].defeated, false);
  assert.equal(game.impacts[0].angle, Math.atan2(24, 48));
  game.damageEnemy({ enemy, damage: 999, color: '#ffddaa', isCrit: true });
  assert.equal(game.impacts[1].critical, true);
  assert.equal(game.impacts[1].defeated, true);
  const power = game.impactPower;
  game.damageEnemy({ enemy: enemyFor(game), damage: 1, color: '#ffaa44' });
  assert.equal(game.impactPower, power);
  game.updateImpacts();
  assert.deepEqual(sounds, ['critical']);
  game.updateImpacts();
  assert.deepEqual(sounds, ['critical']);
});

test('命中特效不消耗游戏随机序列、不更改伤害与掉落；重开清理镜头和特效状态', async () => {
  const normal = await createKnifeRuntime();
  const without = await createKnifeRuntime();
  normal.game.start();
  without.game.start();
  without.game.emitImpact = () => {};
  for (const { game } of [normal, without]) {
    game.damageEnemy({ enemy: enemyFor(game), damage: 999, color: '#fff', isCrit: true });
  }
  assert.equal(normal.game.player.totalDmgDealt, without.game.player.totalDmgDealt);
  assert.equal(normal.game.player.kills, without.game.player.kills);
  assert.equal(normal.game.random(), without.game.random());
  assert.equal(JSON.stringify(normal.game.pickups), JSON.stringify(without.game.pickups));
  normal.game.start();
  assert.equal(normal.game.impacts.length, 0);
  assert.equal(normal.game.impactPower, 0);
  assert.equal(normal.game.impactSound, 0);
});

test('暂停期间特效不衰减，正常更新后释放过期记录', async () => {
  const { game } = await createKnifeRuntime();
  game.start();
  game.damageEnemy({ enemy: enemyFor(game), damage: 1, color: '#fff' });
  const life = game.impacts[0].life;
  game.state = 'paused';
  game.update();
  assert.equal(game.impacts[0].life, life);
  for (let frame = 0; frame < life; frame++) game.updateImpacts();
  assert.equal(game.impacts.length, 0);
});

test('批量刀光复用三个网格，减少动态效果时清空，退出释放全部几何与材质', async () => {
  const { namespace: THREE } = await loadESModule('js/vendor/three.module.js');
  const { namespace: { ArenaImpacts } } = await loadESModule('js/knife-three-impact.js');
  const scene = new THREE.Scene();
  const impacts = new ArenaImpacts(scene);
  const events = Array.from({ length: 70 }, (_, index) => ({ x: index, y: index * 2, radius: 14,
    angle: index, critical: true, defeated: false, color: '#ffaa44', duration: 24, life: 24 }));
  impacts.render({ events, center: CENTER });
  assert.equal(scene.children.length, 3);
  assert.equal(impacts.rings.mesh.count, events.length);
  assert.equal(impacts.slashes.mesh.count, events.length * 11);
  const matrix = new THREE.Matrix4();
  impacts.slashes.mesh.getMatrixAt(impacts.slashes.mesh.count - 1, matrix);
  assert.ok(matrix.elements.every(Number.isFinite));
  const original = impacts.slashes.mesh;
  impacts.render({ events, center: CENTER });
  assert.equal(impacts.slashes.mesh, original);
  impacts.render({ events, center: CENTER, motion: false });
  assert.ok(impacts.batches.every(batch => batch.mesh.count === 0));
  let disposals = 0;
  impacts.batches.forEach(batch => {
    batch.geometry.addEventListener('dispose', () => disposals++);
    batch.material.addEventListener('dispose', () => disposals++);
  });
  impacts.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(disposals, 6);
});
