const test = require('node:test');
const assert = require('node:assert/strict');
const tactics = require('../js/cardbattle-tactics');

function minion(overrides = {}) {
  return Object.freeze({ name: '剑修弟子', type: 'minion', cost: 1, atk: 2, hp: 2, canAttack: false, ...overrides });
}

function state(overrides = {}) {
  return Object.freeze({
    gameOver: false, phase: 'player', playerEnergy: 4, turn: 3,
    playerHand: [], playerField: [], enemyField: [], ...overrides,
  });
}

test('灵卡可用性：足够灵力但没有敌方随从时，灵气弹不可用且给出原因', () => {
  const card = { name: '灵气弹', type: 'spell', cost: 1, effect: 'deal3minion' };
  const initial = state({ playerEnergy: 1 });
  assert.deepEqual(tactics.cardStatus({ card, state: initial, animating: false, maxField: 6 }), {
    playable: false, reason: '没有合法目标',
  });
  const withEnemy = state({ enemyField: [minion()] });
  assert.equal(tactics.cardStatus({ card, state: withEnemy, animating: false, maxField: 6 }).playable, true);
  assert.equal(initial.playerEnergy, 1);
});

test('灵魂收割只高亮双方攻击不高于 3 的活随从，攻击过高与死亡随从不算目标', () => {
  const targets = tactics.spellTargets({
    effect: 'killlow3', enemyField: [minion({ atk: 4 }), minion({ atk: 3 }), minion({ hp: 0 })],
    playerField: [minion({ atk: 2 }), minion({ atk: 5 })],
  });
  assert.deepEqual(targets, { kind: 'any_minion', enemy: [1], player: [0], master: false });
  const card = { type: 'spell', cost: 4, effect: 'killlow3' };
  assert.equal(tactics.cardStatus({ card, state: state({ enemyField: [minion({ atk: 4 })] }), maxField: 6 }).playable, false);
});

test('普通攻击必须先过嘲讽；伤害法术按其目标类型独立选择', () => {
  const enemyField = Object.freeze([minion(), minion({ taunt: true }), minion({ taunt: true, hp: 0 })]);
  assert.deepEqual(tactics.attackTargets(enemyField), { kind: 'attack', enemy: [1], player: [], master: false });
  assert.deepEqual(tactics.spellTargets({ effect: 'deal6any', enemyField, playerField: [minion()] }), {
    kind: 'any', enemy: [0, 1], player: [0], master: true,
  });
  assert.deepEqual(tactics.attackTargets([]), { kind: 'attack', enemy: [], player: [], master: true });
});

test('费用、阵位、回合和结束状态限制显示真实可用性，法术不受满阵位限制', () => {
  const card = minion({ cost: 5 });
  const unavailable = overrides => tactics.cardStatus({ card, state: state(overrides), animating: false, maxField: 6 });
  assert.equal(unavailable({}).reason, '需要 5 灵力');
  assert.equal(unavailable({ gameOver: true }).reason, '对局已结束');
  assert.equal(unavailable({ phase: 'enemy' }).reason, '等待回合');
  const full = state({ playerEnergy: 5, playerField: Array.from({ length: 6 }, () => minion()) });
  assert.equal(tactics.cardStatus({ card, state: full, maxField: 6 }).reason, '我方阵位已满');
  assert.equal(tactics.cardStatus({ card: { type: 'spell', cost: 2, effect: 'heal5' }, state: full, maxField: 6 }).playable, true);
});

test('目标提示区分法术和嘲讽攻击，回合摘要不把行动中的随从计作可攻击', () => {
  const current = state({ playerField: [minion({ canAttack: true })], enemyField: [minion({ taunt: true })] });
  assert.equal(tactics.selectionText({ state: current, minionIndex: 0 }).instruction, '必须先攻击带有嘲讽的随从');
  assert.equal(tactics.selectionText({ state: current, spell: { name: '灵气弹', effect: 'deal3minion' } }).instruction, '选择一个敌方随从');
  assert.equal(tactics.turnSummary({ state: current, animating: false, maxField: 6 }).ready, 1);
  assert.equal(tactics.turnSummary({ state: current, animating: true, maxField: 6 }).ready, 0);
});

test('套牌曲线按真实费用统计 7+、随从和法术，未知卡牌明确返回且不修改牌序', () => {
  const ids = Object.freeze(['m', 's', 'm', 'high', 'missing']);
  const summary = tactics.deckSummary({ ids, catalog: {
    m: minion(), s: { type: 'spell', cost: 4 }, high: minion({ cost: 9 }),
  } });
  assert.equal(summary.total, 5);
  assert.equal(summary.minions, 3);
  assert.equal(summary.spells, 1);
  assert.equal(summary.average, 3.75);
  assert.equal(summary.curve[1].count, 2);
  assert.deepEqual(summary.curve[7], { cost: 7, label: '7+', count: 1 });
  assert.deepEqual(summary.unknown, ['missing']);
  assert.deepEqual(ids, ['m', 's', 'm', 'high', 'missing']);
});
