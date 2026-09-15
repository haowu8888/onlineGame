const test = require('node:test');
const assert = require('node:assert/strict');
const models = require('../js/game-scene-cards');
const battleTactics = require('../js/cardbattle-tactics');
const towerTactics = require('../js/cardtower-tactics');
const { loadGame } = require('./fixtures/game-runtime');

function battleState() {
  return {
    phase: 'player', gameOver: false, turn: 2, playerEnergy: 1,
    playerHP: 28, playerMaxHP: 30, enemyHP: 22, enemyMaxHP: 30, enemyName: '对手',
    playerHand: [{ name: '弟子', type: 'minion', cost: 1 }, { name: '昂贵法术', type: 'spell', cost: 8 }],
    playerField: [{ name: '剑修', hp: 3, maxHp: 4, atk: 2, canAttack: true }],
    enemyField: [{ name: '护卫', hp: 5, maxHp: 6, atk: 1, taunt: true }, { name: '弓手', hp: 2, maxHp: 2, atk: 3 }],
  };
}

test('灵卡场景沿用真实费用与嘲讽规则，等待期间取消所有操作目标', () => {
  const state = battleState();
  const before = JSON.stringify(state);
  const options = { state, tactics: battleTactics, selected: 0, spell: null, animating: false, maxField: 6 };
  const model = models.battle(options);
  assert.deepEqual(model.cards.map(card => Boolean(card.action)), [true, false]);
  const targets = model.units.filter(unit => unit.action).map(unit => unit.action);
  assert.ok(targets.some(action => action.type === 'enemy-unit' && action.index === 0));
  assert.ok(!targets.some(action => action.type === 'enemy-master' || action.type === 'enemy-unit' && action.index === 1));
  const waiting = models.battle({ ...options, animating: true });
  assert.equal([...waiting.units, ...waiting.cards].filter(item => item.action).length, 0);
  assert.equal(JSON.stringify(state), before);
});

test('法术目标由原战术模块决定，允许施法命中我方与敌方的合法单位', () => {
  const state = battleState();
  const model = models.battle({ state, tactics: battleTactics, selected: null,
    spell: { name: '雷击', effect: 'deal6any' }, animating: false, maxField: 6 });
  assert.equal(model.units.filter(unit => unit.action).length, 4);
  assert.ok(model.units.find(unit => unit.key === 'enemy-master').action);
});

test('仙卡录使用已装备后的真实属性和阵位，只为实际大招提示提供操作', () => {
  const state = { team: [1, null, 2, null, null] };
  const roster = [{ id: 1, name: '甲', role: 'DEF', hp: 200, atk: 25, level: 4 },
    { id: 2, name: '乙', role: 'SUP', hp: 160, atk: 16, level: 3 }];
  const options = { state, roster, selectedSlot: 2, readyUltimateIds: [], focusedEnemyId: null };
  const model = models.collection(options);
  assert.deepEqual(model.units.map(unit => unit.hp), [200, 160]);
  assert.deepEqual(model.units.map(unit => unit.action.index), [0, 2]);
  assert.equal(model.units[1].selected, true);
  assert.equal(model.markers.length, 3);
  const battleState = { chapter: 1, wave: 2, running: true,
    allies: [{ id: 'a_1', name: '甲', role: 'DEF', hp: 72, maxHp: 200, alive: true, ultReady: true }],
    enemies: [{ id: 'e_2_0', name: '妖兽', hp: 60, maxHp: 100, alive: true }] };
  assert.equal(models.collection({ ...options, battleState }).units[0].action, null);
  const ready = models.collection({ ...options, battleState, readyUltimateIds: ['a_1'], focusedEnemyId: 'e_2_0' });
  assert.equal(ready.units[0].action.type, 'ultimate');
  assert.equal(ready.units[1].action.type, 'focus-enemy');
  assert.equal(ready.units[1].selected, true);
  assert.equal(ready.units[0].hp, 72);
});

function towerState() {
  const { api } = loadGame({ file: 'cardtower.js', entry: "document.addEventListener('DOMContentLoaded'",
    exports: '{ GameState, buildTowerRows, TOWER_NODE_META }' });
  const state = new api.GameState();
  state.towerRows = api.buildTowerRows(() => 0);
  state.towerNodeMap = Object.fromEntries(state.towerRows.flatMap(row => row.nodes.map(node => [node.id, node])));
  state.availableNodeIds = state.towerRows[0].nodes.map(node => node.id);
  return { state, nodeMeta: api.TOWER_NODE_META, tactics: towerTactics, canSelect: true };
}

test('斩仙塔绘制真实路线与相连节点，守关结束后展示下一幕', () => {
  const options = towerState();
  const model = models.towerRoute(options);
  const firstAct = options.state.towerRows.filter(row => row.actIndex === 0);
  assert.equal(model.tiles.length, firstAct.flatMap(row => row.nodes).length);
  assert.deepEqual(Array.from(model.tiles.filter(tile => tile.action).map(tile => tile.key)), Array.from(options.state.availableNodeIds));
  assert.ok(model.tiles.every(tile => !/\?{2}/.test(tile.name + tile.detail)));
  assert.equal(models.towerRoute({ ...options, canSelect: false }).tiles.some(tile => tile.action), false);
  const last = firstAct.at(-1).nodes[0];
  options.state.currentNodeId = last.id;
  options.state.completedNodeIds = [last.id];
  options.state.availableNodeIds = [...last.nextIds];
  const next = models.towerRoute(options);
  assert.ok(next.tiles.every(tile => options.state.towerNodeMap[tile.key].actIndex === 1));
});

test('斩仙塔只在真实战斗可行动时开放出牌，使用原费用计算', () => {
  const options = towerState();
  Object.assign(options.state, { hp: 55, maxHp: 70, energy: 1, hand: [{ uid: 'card-1', name: '斩击', type: 'attack', cost: 2 }] });
  const battle = { inBattle: true, playerTurn: true, turn: 3,
    enemies: [{ name: '妖兽', hp: 33, maxHp: 80 }],
    getEffectiveCost: () => 1, getEnemyIntent: () => ({ label: '攻击 8' }) };
  const model = models.tower({ ...options, battle, started: true });
  assert.equal(model.cards[0].cost, 1);
  assert.equal(model.cards[0].action.id, 'card-1');
  assert.equal(model.units[0].detail, '攻击 8');
  assert.equal(models.tower({ ...options, battle: { ...battle, enemies: [] }, started: true }).cards[0].action, null);
});
