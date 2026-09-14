const assert = require('node:assert/strict');
const { getKnownRoute, getStepDays, getViewport } = require('../js/guigu-route.js');

function run(name, test) {
  test();
  console.log(`PASS ${name}`);
}

run('已知地图支持原游戏的八向移动，返回从下一格开始的最短路径', () => {
  const fog = Array.from({ length: 4 }, () => Object.freeze([true, true, true, true]));
  const path = getKnownRoute({ fog: Object.freeze(fog), start: { x: 0, y: 0 }, destination: { x: 3, y: 3 } });
  assert.deepEqual(path, [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]);
});

run('路线绕过未探索区域，不会穿过迷雾或泄露未知地块', () => {
  const fog = [[true, false, true], [true, false, true], [true, true, true]];
  const path = getKnownRoute({ fog, start: { x: 0, y: 0 }, destination: { x: 2, y: 0 } });
  assert.equal(path.length, 4);
  assert.ok(path.every(cell => fog[cell.y][cell.x]));
});

run('未知目标与不连通的已知区域均没有路线，原地路线为零步', () => {
  const fog = [[true, false, true], [false, false, false]];
  const start = { x: 0, y: 0 };
  assert.equal(getKnownRoute({ fog, start, destination: { x: 1, y: 0 } }), null);
  assert.equal(getKnownRoute({ fog, start, destination: { x: 2, y: 0 } }), null);
  assert.deepEqual(getKnownRoute({ fog, start, destination: start }), []);
});

run('越界与非整数坐标显式报错', () => {
  const options = { fog: [[true]], start: { x: 0, y: 0 }, destination: { x: -1, y: 0 } };
  assert.throws(() => getKnownRoute(options), RangeError);
  assert.throws(() => getKnownRoute({ ...options, destination: { x: 0.5, y: 0 } }), RangeError);
});

run('路线耗时沿用原坐骑与喂养公式，包括已有速度上限及四舍五入', () => {
  assert.equal(getStepDays({ baseDays: 7, mount: null, feed: 100 }), 7);
  assert.equal(getStepDays({ baseDays: 7, mount: { speedBonus: 0.2 }, feed: 0 }), 6);
  assert.equal(getStepDays({ baseDays: 7, mount: { speedBonus: 0.2 }, feed: 100 }), 5);
  assert.equal(getStepDays({ baseDays: 7, mount: { speedBonus: 0.6 }, feed: 1000 }), 2);
});

run('附近视野在地图边缘保持完整尺寸，全图视野包含所有格子', () => {
  const map = Array.from({ length: 15 }, () => Array(15).fill(null));
  assert.deepEqual(getViewport({ map, position: { x: 0, y: 0 }, overview: false }), { left: 0, top: 0, columns: 9, rows: 9 });
  assert.deepEqual(getViewport({ map, position: { x: 14, y: 14 }, overview: false }), { left: 6, top: 6, columns: 9, rows: 9 });
  assert.deepEqual(getViewport({ map, position: { x: 7, y: 7 }, overview: true }), { left: 0, top: 0, columns: 15, rows: 15 });
});
