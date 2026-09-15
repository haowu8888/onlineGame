const test = require('node:test');
const assert = require('node:assert/strict');
const models = require('../js/game-scene-rpg');
const { loadGame } = require('./fixtures/game-runtime');

test('修仙场景读取真实境界进度，战斗显示实际血量并在结算后停止攻击', () => {
  const { api } = loadGame({ file: 'cultivation.js', entry: '  // --- 初始化 ---', exports: '{ REALMS }' });
  const state = Object.freeze({ name: '测试道友', realm: 0, exp: 110, hp: 60, maxHp: 100, atk: 12 });
  const before = JSON.stringify(state);
  const retreat = models.cultivation({ state, realms: api.REALMS, meditating: true, battle: null });
  assert.equal(retreat.progress, 0.5);
  assert.equal(retreat.units[0].meditating, true);
  assert.equal(retreat.units[0].action.type, 'meditate');
  const monster = Object.freeze({ id: 'wolf', name: '妖狼', currentHp: 22, maxHp: 80, atk: 9 });
  const combat = models.cultivation({ state, battle: { monster, done: false } });
  assert.equal(combat.kind, 'board');
  assert.equal(combat.units[1].hp, 22);
  assert.equal(combat.units[1].action.type, 'battle-attack');
  const finished = models.cultivation({ state, battle: { monster, done: true } });
  assert.equal(finished.units[1].action, null);
  assert.equal(finished.units[0].action.type, 'battle-back');
  assert.equal(JSON.stringify(state), before);
  assert.equal(models.cultivation({ state: null, battle: { monster } }).units.length, 0);
});

test('人生场景使用真实年龄、事件和按钮身份，不修改选择列表', () => {
  const choices = Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze({ key: 'event-' + index, text: '选择 ' + index })));
  const state = Object.freeze({ name: '知秋', age: 63, realm: 1 });
  const model = models.lifesim({ state, choices, realms: [{ name: '凡人' }, { name: '炼气' }], maxLife: 120, eventTitle: '山中故人' });
  assert.equal(model.age, 63);
  assert.equal(model.progress, 63 / 120);
  assert.equal(model.caption, '山中故人');
  assert.deepEqual(model.markers.map(marker => marker.action.key), choices.map(choice => choice.key));
  assert.ok(model.markers[3].z > model.markers[0].z);
  assert.equal(new Set(model.markers.map(marker => marker.x + ':' + marker.z)).size, choices.length);
});

function mapState() {
  return {
    name: '行者', position: { x: 1, y: 1 }, dead: false,
    map: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ terrain: 0, locName: '隐藏宝库' }))),
    fog: Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => x === 1 && y === 1)),
  };
}

test('八荒场景不泄露迷雾中的地点、危险和拾取入口，包含实际荒漠地形', () => {
  const state = mapState();
  const before = JSON.stringify(state);
  const terrain = [{ cls: 'desert', name: '荒漠', danger: 3 }];
  const model = models.guigu({ state, terrain, path: null, target: null, stepDays: 2 });
  const unknown = model.tiles.filter(tile => !tile.known);
  assert.ok(unknown.length > 0);
  assert.ok(unknown.every(tile => tile.type === 'fog' && tile.name === '未探索' && tile.danger === null && tile.action === null));
  assert.equal(model.tiles.find(tile => tile.key === '1,1').type, 'desert');
  assert.equal(JSON.stringify(state), before);
});

test('八荒仅在真实路线存在时允许前进，抵达与不可达状态分别提示', () => {
  const state = mapState();
  const options = { state, terrain: [{ cls: 'forest', name: '山林', danger: 1 }], stepDays: 4 };
  const unavailable = models.guigu({ ...options, target: { x: 4, y: 4 }, path: null });
  assert.equal(unavailable.units[0].action, null);
  assert.match(unavailable.caption, /无法到达/);
  const arrived = models.guigu({ ...options, target: state.position, path: [] });
  assert.match(arrived.caption, /已到达/);
  const moving = models.guigu({ ...options, target: { x: 2, y: 2 }, path: [{ x: 2, y: 1 }, { x: 2, y: 2 }] });
  assert.match(moving.caption, /2 步 · 预计 8 天/);
  assert.equal(moving.units[0].action.type, 'map-step');
  const dead = models.guigu({ ...options, state: { ...state, dead: true }, path: [{ x: 2, y: 1 }] });
  assert.equal(dead.units[0].action, null);
});
