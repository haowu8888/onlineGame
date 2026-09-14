const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadESModule } = require('./helpers/esm-loader.js');
const { createKnifeRuntime } = require('./helpers/knife-runtime.js');

const movementModule = loadESModule('js/knife-movement.js').then(result => result.namespace);
const EPSILON = 1e-8;

test('摇杆保留轻推幅度，键盘斜向及混合输入不加速且不修改输入', async () => {
  const { movementVector } = await movementModule;
  const keys = Object.freeze({});
  const joystick = Object.freeze({ x: 0.2, y: 0 });
  const light = movementVector(keys, joystick);
  assert.equal(light.x, 0.2);
  assert.equal(light.y, 0);
  const diagonal = movementVector(Object.freeze({ w: true, d: true }), null);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < EPSILON);
  const mixed = movementVector(Object.freeze({ d: true }), Object.freeze({ x: 1, y: 1 }));
  assert.ok(Math.abs(Math.hypot(mixed.x, mixed.y) - 1) < EPSILON);
  const { game } = await createKnifeRuntime();
  game.start();
  game.joyDir = joystick;
  game.updatePlayerMovement();
  assert.equal(game.player.x, game.player.speed * joystick.x);
});

test('闪避沿输入方向，静止时沿朝向，冷却中不重复启动', async () => {
  const { beginDash, advanceDash, idleDash, DASH } = await movementModule;
  const original = Object.freeze(idleDash());
  const dash = beginDash({ dash: original, movement: { x: 0.1, y: 0 }, facing: Math.PI });
  assert.equal(dash.direction.x, 1);
  assert.equal(dash.frames, DASH.duration);
  assert.equal(original.frames, 0);
  assert.equal(beginDash({ dash, movement: { x: 0, y: 1 }, facing: 0 }), null);
  const idle = beginDash({ dash: original, movement: { x: 0, y: 0 }, facing: Math.PI / 2 });
  assert.ok(Math.abs(idle.direction.x) < EPSILON);
  assert.equal(idle.direction.y, 1);
  let remaining = dash;
  for (let frame = 0; frame < DASH.cooldown; frame++) remaining = advanceDash(remaining);
  assert.equal(remaining.frames, 0);
  assert.equal(remaining.cooldown, 0);
  assert.ok(beginDash({ dash: remaining, movement: { x: 0, y: -1 }, facing: 0 }));
  assert.equal(dash.cooldown, DASH.cooldown);
});

test('只有战斗中可闪避，暂停或选升级冻结冷却，重开清除轨迹和冷却', async () => {
  const { game } = await createKnifeRuntime();
  const { DASH } = await movementModule;
  assert.equal(game.activateDash(), false);
  game.start();
  assert.equal(game.activateDash(), true);
  assert.equal(game.activateDash(), false);
  for (const state of ['paused', 'upgrading', 'blessing', 'over']) {
    game.state = state;
    game.update();
    assert.equal(game.activateDash(), false);
    assert.equal(game.player.dash.cooldown, DASH.cooldown);
  }
  game.state = 'playing';
  game.update();
  assert.equal(game.player.dash.cooldown, DASH.cooldown - 1);
  assert.equal(game.dashTrails.length, 1);
  game.start();
  assert.equal(game.player.dash.frames, 0);
  assert.equal(game.player.dash.cooldown, 0);
  assert.equal(game.dashTrails.length, 0);
});

test('闪避全程免伤，结束后恢复正常受伤反馈，不将护盾当受伤闪烁', async () => {
  const { game } = await createKnifeRuntime();
  const { DASH, MOVEMENT } = await movementModule;
  game.start();
  game.activateDash();
  const hp = game.player.hp;
  for (let frame = 0; frame < DASH.duration; frame++) {
    game.updatePlayerMovement();
    assert.equal(game.player.takeDamage(10), false);
    assert.equal(game.player.hurtFlash, 0);
  }
  assert.equal(game.player.hp, hp);
  game.updatePlayerMovement();
  assert.equal(game.player.takeDamage(10), true);
  assert.equal(game.player.hp, hp - 10);
  assert.equal(game.player.hurtFlash, MOVEMENT.hurtFlashFrames);
  for (let frame = 0; frame < MOVEMENT.hurtFlashFrames; frame++) game.updatePlayerMovement();
  assert.equal(game.player.hurtFlash, 0);
  game.player.invincible = 0;
  game.player.startShield = 1;
  assert.equal(game.player.takeDamage(10), false);
  assert.equal(game.player.hurtFlash, 0);
});

test('高速闪避也不会穿过石灯，轨迹终点遵守真实碰撞位置', async () => {
  const obstacle = { x: 50, y: 0, radius: 12 };
  const { game } = await createKnifeRuntime(undefined, { obstacles: [obstacle] });
  game.start();
  game.player.speed = 40;
  game.keys.d = true;
  game.activateDash();
  game.updatePlayerMovement();
  const boundary = obstacle.x - obstacle.radius - game.player.radius;
  assert.ok(Math.abs(game.player.x - boundary) < EPSILON);
  assert.equal(game.player.y, 0);
  assert.equal(game.dashTrails.length, 1);
  assert.equal(game.dashTrails[0].x1, 0);
  assert.equal(game.dashTrails[0].x2, game.player.x);
  assert.equal(game.dashTrails[0].y2, game.player.y);
});
