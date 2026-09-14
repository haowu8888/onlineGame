const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createKnifeRuntime } = require('./helpers/knife-runtime.js');

test('金币箱实际增加当局金币，不替换为经验且重复更新只领取一次', async () => {
  const { game } = await createKnifeRuntime();
  game.start();
  game.wave = 4;
  const chest = { x: 0, y: 0, radius: 14, type: 'gold', bobPhase: 0, alive: true };
  game.chests = [chest];
  game.updateChests();
  assert.equal(game.runGold, 16);
  assert.equal(game.player.xp, 0);
  assert.equal(game.pickups.length, 0);
  assert.equal(game.chests.length, 0);
  assert.ok(game.dmgTexts.some(item => item.text === '+16金币'));
  game.updateChests();
  assert.equal(game.runGold, 16);
});

test('回复瓶和经验晶体各自发放真实奖励，回复不会超过生命上限', async () => {
  const { game } = await createKnifeRuntime();
  game.start();
  game.player.hp = game.player.maxHp - 5;
  const chest = { x: 0, y: 0, radius: 14, bobPhase: 0, alive: true };
  game.chests = [{ ...chest, type: 'heal' }, { ...chest, type: 'exp' }];
  game.updateChests();
  assert.equal(game.player.hp, game.player.maxHp);
  assert.equal(game.player.xp, 7);
  assert.equal(game.runGold, 0);
  assert.equal(game.chests.length, 0);
});

test('随机宝箱命中障碍中心时纠正落点，保持在可拾取空间', async () => {
  const obstacle = { x: 60, y: 0, radius: 30 };
  const { game } = await createKnifeRuntime(undefined, { obstacles: [obstacle], random: () => 0 });
  game.start();
  game.spawnChest();
  const chest = game.chests[0];
  assert.equal(chest.type, 'gold');
  assert.ok(Number.isFinite(chest.x) && Number.isFinite(chest.y));
  assert.ok(Math.hypot(chest.x - obstacle.x, chest.y - obstacle.y) >= chest.radius + obstacle.radius);
  Object.assign(game.player, { x: chest.x + chest.radius + game.player.radius - 1, y: chest.y });
  game.updateChests();
  assert.equal(game.chests.length, 0);
  assert.equal(game.runGold, 10);
});
