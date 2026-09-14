const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadESModule } = require('./helpers/esm-loader.js');
const { createKnifeRuntime: setup } = require('./helpers/knife-runtime.js');

test('转转刀开局镜头直接对准角色，重开清理临时状态且不再生成旧2D地面', async () => {
  const { game, CFG } = await setup();
  game.start();
  assert.equal(game.state, 'playing');
  assert.equal(game.cameraX, -CFG.canvasW / 2);
  assert.equal(game.cameraY, -CFG.canvasH / 2);
  assert.equal(game.wave, 1);
  assert.equal(Object.hasOwn(game, 'groundDecor'), false);
  game._bladeBurstExtra = 3;
  game.start();
  assert.equal(game._bladeBurstExtra, 0);
  assert.equal(game.player.bladeCount, 1);
});

test('群魔乱舞从第一波生成Boss；残血与玻璃大炮组合仍有1点生命', async () => {
  const { game, CHALLENGE_MODIFIERS } = await setup();
  game.activeModifiers = CHALLENGE_MODIFIERS.filter(item => ['boss_rush', 'one_hp', 'glass_cannon'].includes(item.id));
  game.start();
  assert.equal(game.enemies.length, 1);
  assert.equal(game.enemies[0].isBoss, true);
  assert.equal(game.player.hp, 1);
  assert.equal(game.player.maxHp, 1);
});

test('跨游戏额外旋刃在每局生效，不会仅在首次领取那局生效', async () => {
  const { game } = await setup({ cross_game_stats: '{"cardcollect_cards":20}' });
  game.start();
  assert.equal(game.player.bladeCount, 2);
  game.start();
  assert.equal(game.player.bladeCount, 2);
});

test('祝福包含原入口追加的4项，效果抛错时保留选择并暴露错误', async () => {
  const { game } = await setup();
  const { namespace } = await loadESModule('js/knife-data.js');
  assert.equal(namespace.BLESSINGS.length, 10);
  assert.ok(namespace.BLESSINGS.some(item => item.id === 'bless_rebirth'));
  game.start();
  game.state = 'blessing';
  game.pendingBlessings = [{ id: 'broken', apply() { throw new Error('effect failure'); } }];
  assert.throws(() => game.applyBlessing(0), /effect failure/);
  assert.equal(game.state, 'blessing');
  assert.equal(game.pendingBlessings.length, 1);
  assert.equal(game._blessingsTaken.broken, undefined);
});

test('永久商店写入失败不扣金币、不升等级，重试才提交', async () => {
  const { MetaProgress, control } = await setup();
  MetaProgress.save({ ...MetaProgress.load(), gold: 100 });
  control.onWrite = key => { if (key === 'knife_meta_progress') throw new Error('quota'); };
  assert.throws(() => MetaProgress.buyPermUpgrade('perm_hp'), /已恢复/);
  assert.equal(MetaProgress.getGold(), 100);
  assert.equal(MetaProgress.getPermLevel('perm_hp'), 0);
  control.onWrite = null;
  assert.equal(MetaProgress.buyPermUpgrade('perm_hp'), true);
  assert.equal(MetaProgress.getGold(), 70);
  assert.equal(MetaProgress.getPermLevel('perm_hp'), 1);
});

test('回春符在满血开局增加当局气血上限，与永久加成叠加且只消费一次', async () => {
  const { game, api } = await setup({ xianyuan_knife_bonuses: '{"hp":10,"heal_next":30,"goldMul":1}' });
  game.start();
  assert.equal(game.player.hp, 140);
  assert.equal(game.player.maxHp, 140);
  assert.equal(api.Storage.get('xianyuan_knife_bonuses').heal_next, 0);
  game.start();
  assert.equal(game.player.hp, 110);
  assert.equal(game.player.maxHp, 110);
});

test('一次性符箓消费写入失败时保留道具，不提前开始游戏', async () => {
  const { game, api, control } = await setup({ xianyuan_knife_bonuses: '{"hp":0,"heal_next":30}' });
  control.onWrite = key => { if (key === 'xianyuan_knife_bonuses') throw new Error('quota'); };
  assert.throws(() => game.start(), /已恢复/);
  assert.equal(game.state, 'menu');
  assert.equal(api.Storage.get('xianyuan_knife_bonuses').heal_next, 30);
  control.onWrite = null;
  game.start();
  assert.equal(game.player.hp, 130);
  assert.equal(game.state, 'playing');
});

test('死亡结算存储失败保持可重试状态，成功后金币只结算一次', async () => {
  const { game, control, MetaProgress } = await setup();
  game.start();
  game.runGold = 12;
  game.player.alive = false;
  control.onWrite = key => { if (key === 'knife_meta_progress') throw new Error('quota'); };
  assert.throws(() => game.resolveDeath(), /已恢复/);
  assert.equal(game.state, 'playing');
  assert.equal(MetaProgress.getGold(), 0);
  control.onWrite = null;
  game.resolveDeath();
  assert.equal(game.state, 'over');
  assert.equal(MetaProgress.getGold(), 12);
  game.update();
  assert.equal(MetaProgress.getGold(), 12);
});

test('技能未解锁或冷却中无法重复释放，刃暴结束正确移除临时刀刃', async () => {
  const { game } = await setup();
  game.start();
  assert.equal(game.activateSkill(7), false);
  game.skills[7].unlocked = true;
  assert.equal(game.activateSkill(7), true);
  assert.equal(game.player.bladeCount, 4);
  assert.equal(game.activateSkill(7), false);
  for (let frame = 0; frame < game.skills[7].duration; frame++) game.updateSkillTimers();
  assert.equal(game.player.bladeCount, 1);
  assert.equal(game.skills[7].active, false);
});

test('AOE忽略已死亡敌人，一次死亡仅统计和掉落一次', async () => {
  const { game } = await setup();
  game.start();
  game.player.bladeDmg = 20;
  const enemy = game.entities.enemy({ x: 20, y: 0, type: 'pawn', waveScale: 1, diff: game.diff });
  game.enemies = [enemy];
  game.skills[3].unlocked = true;
  game.activateSkill(3);
  const drops = game.pickups.length;
  assert.equal(game.player.kills, 1);
  game.onEnemyDeath(enemy);
  game.castWhirlwind();
  assert.equal(game.player.kills, 1);
  assert.equal(game.pickups.length, drops);
});

test('冰窟实际降低行走速度，离开地形后恢复且不累乘永久移速', async () => {
  const { game } = await setup();
  const { namespace } = await loadESModule('js/knife-data.js');
  game.start();
  const speed = game.player.speed;
  game.keys.d = true;
  game.terrain = namespace.TERRAINS[2];
  game.updatePlayerMovement();
  assert.equal(game.player.x, speed * game.terrain.slowMul);
  assert.equal(game.player.speed, speed);
  const position = game.player.x;
  game.terrain = namespace.TERRAINS[0];
  game.updatePlayerMovement();
  assert.ok(Math.abs(game.player.x - position - speed) < 1e-10);
});

test('固定随机源也能生成合法宝箱和危害区域，不依赖重试循环', async () => {
  const { game } = await setup();
  game.start();
  game.random = () => 0.5;
  game.spawnChest();
  game.spawnHazard();
  assert.equal(game.chests.length, 1);
  assert.equal(game.hazards.length, 1);
  assert.ok(Math.hypot(game.chests[0].x, game.chests[0].y) >= 60);
  assert.ok(Math.hypot(game.hazards[0].x, game.hazards[0].y) >= 100);
});

test('连续模拟1200帧可刷怪、攻击、拾取和升级，没有2D渲染依赖', async () => {
  const { game } = await setup();
  game.start();
  game.player.maxHp = 1000;
  game.player.hp = 1000;
  for (let frame = 0; frame < 1200; frame++) {
    if (game.state === 'upgrading') game.applyUpgrade(0);
    if (game.state === 'blessing') game.applyBlessing(0);
    game.update();
  }
  assert.equal(game.totalFrames, 1200);
  assert.ok(game.player.kills > 0);
  assert.ok(game.player.level > 1);
  assert.ok(Number.isFinite(game.player.hp));
  assert.equal(game.getTimeStr(), '00:20');
});

test('线段与圆碰撞涵盖零长度和线段完全位于圆内', async () => {
  const { namespace } = await loadESModule('js/knife-math.js');
  const circle = { x: 0, y: 0, radius: 10 };
  assert.equal(namespace.lineCircleIntersect({ x1: 0, y1: 0, x2: 0, y2: 0 }, circle), true);
  assert.equal(namespace.lineCircleIntersect({ x1: -2, y1: 0, x2: 2, y2: 0 }, circle), true);
  assert.equal(namespace.lineCircleIntersect({ x1: 11, y1: 0, x2: 20, y2: 0 }, circle), false);
});

async function setupLantern() {
  const { game } = await setup();
  const { namespace } = await loadESModule('js/knife-scenery.js');
  game.obstacles = namespace.sceneryObstacles({ x: 0, y: 0 });
  game.start();
  return { game, obstacle: game.obstacles[12] };
}

test('真实敌人沿石灯挤开后，完整游戏帧结束仍在障碍之外', async () => {
  const { game, obstacle } = await setupLantern();
  const enemies = [0, 1].map(offset => game.entities.enemy({
    x: obstacle.x + obstacle.radius + 10 + offset, y: obstacle.y,
    type: 'pawn', waveScale: 1, diff: game.diff,
  }));
  game.enemies = enemies;
  game.update();
  assert.ok(enemies.every(enemy => Math.hypot(enemy.x - obstacle.x, enemy.y - obstacle.y)
    >= enemy.radius + obstacle.radius - 1e-6));
});

test('刀击与接触击退不会将敌人推过石灯；空地仍保留原本的击退距离', async () => {
  const { game, obstacle } = await setupLantern();
  const enemy = game.entities.enemy({ x: obstacle.x - obstacle.radius - 10, y: obstacle.y,
    type: 'pawn', waveScale: 10, diff: game.diff });
  game.enemies = [enemy];
  Object.assign(game.player, { x: enemy.x - 18, y: enemy.y });
  const boundary = enemy.x;
  game.applyBladeHit(enemy);
  assert.equal(enemy.x, boundary);
  game.checkEnemyPlayerCollision();
  assert.equal(enemy.x, boundary);
  game.updateEnemyPositions();
  assert.ok(enemy.x <= boundary);
  game.obstacles = [];
  game.player.invincible = 0;
  const beforeContact = enemy.x;
  game.checkEnemyPlayerCollision();
  assert.ok(Math.abs(enemy.x - beforeContact - 25) < 1e-6);
  const beforeBlade = enemy.x;
  game.applyBladeHit(enemy);
  assert.ok(Math.abs(enemy.x - beforeBlade - 6) < 1e-6);
});

test('影刺客与Boss传送仍可越过障碍，传送到障碍中时修正落点', async () => {
  const { game, obstacle } = await setupLantern();
  const enemy = game.entities.enemy({ x: obstacle.x - 100, y: obstacle.y,
    type: 'shadow_assassin', waveScale: 1, diff: game.diff });
  enemy.random = () => 0;
  enemy.teleportTimer = enemy.teleportCD - 1;
  game.enemies = [enemy];
  Object.assign(game.player, { x: obstacle.x + 30, y: obstacle.y });
  game.updateEnemyPositions();
  assert.equal(enemy.x, obstacle.x + 70);
  enemy.teleportTimer = enemy.teleportCD - 1;
  game.player.x = obstacle.x - 40;
  game.updateEnemyPositions();
  assert.ok(Math.hypot(enemy.x - obstacle.x, enemy.y - obstacle.y) >= enemy.radius + obstacle.radius - 1e-6);
  game.start();
  game._bossRush = true;
  game.spawnBoss();
  const boss = game.enemies[0];
  game.random = () => 0;
  Object.assign(game.player, { x: obstacle.x - 80, y: obstacle.y });
  game.bossTeleport(boss);
  assert.ok(Math.hypot(boss.x - obstacle.x, boss.y - obstacle.y) >= boss.radius + obstacle.radius - 1e-6);
});
