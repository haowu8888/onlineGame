const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadESModule } = require('./helpers/esm-loader');

const scenery = loadESModule('js/knife-scenery.js').then(module => module.namespace);

test('庭院碰撞与真实场景位置共用数据，移动原点不改变原始布置', async () => {
  const { SCENERY, sceneryObstacles } = await scenery;
  const initial = sceneryObstacles({ x: 0, y: 0 });
  const shifted = sceneryObstacles({ x: 80, y: -40 });
  assert.equal(initial.length, SCENERY.length);
  initial.forEach((item, index) => {
    assert.equal(shifted[index].x, item.x + 80);
    assert.equal(shifted[index].y, item.y - 40);
    assert.equal(item.radius, SCENERY[index].radius * 24);
    assert.ok(Object.isFrozen(SCENERY[index]));
  });
});

test('玩家和敌人无法穿入树干，沿切线移动正常且不修改传入实体', async () => {
  const { resolveObstacles } = await scenery;
  const entity = Object.freeze({ x: 8, y: 0, radius: 4 });
  const obstacles = Object.freeze([Object.freeze({ x: 0, y: 0, radius: 8 })]);
  const position = resolveObstacles(entity, obstacles);
  assert.equal(position.x, 12);
  assert.equal(position.y, 0);
  assert.equal(entity.x, 8);
  const tangent = resolveObstacles({ x: 12, y: 3, radius: 4 }, obstacles);
  assert.equal(tangent.x, 12);
  assert.equal(tangent.y, 3);
});

test('生成在障碍中心的实体仍得到有限坐标，开局留有自由走位空间', async () => {
  const { resolveObstacles, sceneryObstacles } = await scenery;
  const center = resolveObstacles({ x: 10, y: 20, radius: 5 }, [{ x: 10, y: 20, radius: 8 }]);
  assert.equal(center.x, 23);
  assert.equal(center.y, 20);
  const spawn = resolveObstacles({ x: 0, y: 0, radius: 16 }, sceneryObstacles({ x: 0, y: 0 }));
  assert.equal(spawn.x, 0);
  assert.equal(spawn.y, 0);
});

test('连续位移从障碍两侧撞入时停在接触面，整段穿越也不会穿心', async () => {
  const { resolveMovement } = await scenery;
  const obstacles = Object.freeze([Object.freeze({ x: 0, y: 0, radius: 8 })]);
  const start = Object.freeze({ x: -30, y: 0 });
  const target = Object.freeze({ x: 30, y: 0, radius: 4 });
  const left = resolveMovement(target, start, obstacles);
  assert.equal(left.x, -12);
  assert.equal(left.y, 0);
  const right = resolveMovement({ x: -30, y: 0, radius: 4 }, { x: 30, y: 0 }, obstacles);
  assert.equal(right.x, 12);
  assert.equal(right.y, 0);
  assert.equal(start.x, -30);
  assert.equal(target.x, 30);
});

test('撞墙保留切向滑动，沿墙离开或没有障碍时保留完整位移', async () => {
  const { resolveMovement } = await scenery;
  const obstacles = [{ x: 0, y: 0, radius: 8 }];
  const sliding = resolveMovement({ x: -8, y: 4, radius: 4 }, { x: -12, y: 0 }, obstacles);
  assert.equal(sliding.x, -12);
  assert.equal(sliding.y, 4);
  const leaving = resolveMovement({ x: -16, y: 4, radius: 4 }, { x: -12, y: 0 }, obstacles);
  assert.equal(leaving.x, -16);
  assert.equal(leaving.y, 4);
  const free = resolveMovement({ x: 17, y: -3, radius: 4 }, { x: -12, y: 0 }, []);
  assert.equal(free.x, 17);
  assert.equal(free.y, -3);
});

test('同时接触两个障碍时不会被后一个修正推回前一个，输入顺序不影响拐角', async () => {
  const { resolveMovement } = await scenery;
  const obstacles = [{ x: 0, y: 0, radius: 8 }, { x: 20, y: 0, radius: 8 }];
  const target = { x: 10, y: 20, radius: 4 };
  const previous = { x: 10, y: -20 };
  const position = resolveMovement(target, previous, obstacles);
  const reversed = resolveMovement(target, previous, [...obstacles].reverse());
  assert.ok(Math.abs(position.x - 10) < 1e-6);
  assert.ok(Math.abs(position.y + Math.sqrt(44)) < 1e-6);
  assert.ok(Math.hypot(position.x - reversed.x, position.y - reversed.y) < 1e-6);
  assert.ok(obstacles.every(obstacle => Math.hypot(position.x - obstacle.x, position.y - obstacle.y) >= 12 - 1e-6));
});

test('生成或传送到重叠的碰撞范围中时，落点同时离开两个障碍', async () => {
  const { resolveObstacles } = await scenery;
  const obstacles = [{ x: 0, y: 0, radius: 8 }, { x: 20, y: 0, radius: 8 }];
  const position = resolveObstacles({ x: 10, y: 0, radius: 4 }, obstacles);
  assert.ok(Math.abs(position.x - 10) < 1e-6);
  assert.ok(Math.abs(Math.abs(position.y) - Math.sqrt(44)) < 1e-6);
  assert.ok(obstacles.every(obstacle => Math.hypot(position.x - obstacle.x, position.y - obstacle.y) >= 12 - 1e-6));
});

test('真实庭院不同体型连续滑动时坐标有限，始终位于所有障碍之外', async () => {
  const { resolveMovement, sceneryObstacles } = await scenery;
  const obstacles = sceneryObstacles({ x: 0, y: 0 });
  for (const radius of [9, 16, 26, 40]) {
    let position = { x: 0, y: 0 };
    for (let frame = 0; frame < 200; frame++) {
      const direction = frame * 0.045;
      const target = { x: position.x + Math.cos(direction) * 15, y: position.y + Math.sin(direction) * 15, radius };
      position = resolveMovement(target, position, obstacles);
      assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
      assert.ok(obstacles.every(obstacle => Math.hypot(position.x - obstacle.x, position.y - obstacle.y) >= radius + obstacle.radius - 1e-6));
    }
  }
});
