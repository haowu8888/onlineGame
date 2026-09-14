const assert = require('node:assert/strict');
const test = require('node:test');
const roster = require('../js/cardcollect-roster');
const { loadGame } = require('./fixtures/game-runtime');

const cards = Object.freeze([
  Object.freeze({ id: 1, quality: '凡', level: 30, atk: 250, hp: 300, role: 'ATK' }),
  Object.freeze({ id: 2, quality: '圣', level: 1, atk: 100, hp: 600, role: 'SUP' }),
  Object.freeze({ id: 3, quality: '灵', level: 10, atk: 200, hp: 800, role: 'DEF' }),
]);

test('品质、攻击和生命排序各自遵循实际字段，不混用不透明战力分', () => {
  assert.deepEqual(roster.sortCards(cards, 'quality').map(card => card.id), [2, 3, 1]);
  assert.deepEqual(roster.sortCards(cards, 'atk').map(card => card.id), [1, 3, 2]);
  assert.deepEqual(roster.sortCards(cards, 'hp').map(card => card.id), [3, 2, 1]);
  assert.deepEqual(cards.map(card => card.id), [1, 2, 3]);
  assert.throws(() => roster.sortCards(cards, 'unknown'), RangeError);
});

test('自动上阵保留五阵位结构，少于五位时使用空位', () => {
  assert.deepEqual(roster.autoTeam(cards, 'atk'), [1, 3, 2, null, null]);
  assert.deepEqual(roster.autoTeam([], 'quality'), [null, null, null, null, null]);
});

test('满队换将直接替换指定阵位，移动已上阵角色会交换且不重复', () => {
  const team = Object.freeze([1, 2, 3, 4, 5]);
  assert.deepEqual(roster.replaceMember({ team, cardId: 6, slot: 2 }), [1, 2, 6, 4, 5]);
  assert.deepEqual(roster.replaceMember({ team, cardId: 5, slot: 1 }), [1, 5, 3, 4, 2]);
  assert.deepEqual(roster.replaceMember({ team, cardId: 1, slot: 0 }), team);
  assert.deepEqual(team, [1, 2, 3, 4, 5]);
  assert.throws(() => roster.replaceMember({ team, cardId: 6, slot: 5 }), RangeError);
});

test('汇总与比较使用有效基础属性，阵法不提前计入显示', () => {
  const total = roster.summarize({ cards, team: [1, null, 2, 3, null] });
  assert.deepEqual(total, { count: 3, atk: 550, hp: 1700, roles: { ATK: 1, SUP: 1, DEF: 1 } });
  assert.deepEqual(roster.compareCards(cards[0], cards[1]), { atk: 150, hp: -300 });
  assert.throws(() => roster.summarize({ cards, team: [99, null, null, null, null] }), /尚未拥有/);
});

test('角色名册沿用生产属性入口，展示突破品质和装备后的数值', () => {
  const { api } = loadGame({
    file: 'cardcollect.js', entry: "  if (document.readyState === 'loading')",
    exports: '{ getCharData, getEffectiveStats, EQUIPMENT_POOL, ROLE_LABELS, getState() { return state; } }',
  });
  const state = api.getState();
  state.owned[1] = { level: 10, exp: 0, dupes: 0, quality: '圣', baseAtk: 200, baseHp: 500 };
  const equipment = api.EQUIPMENT_POOL.find(item => item.atk > 0);
  assert.ok(equipment);
  state.equipment[1] = { [equipment.slot]: equipment.id };
  const result = roster.buildCards({
    ids: [1], getCharacter: api.getCharData, getStats: api.getEffectiveStats,
    roleLabels: api.ROLE_LABELS,
  });
  assert.equal(result[0].quality, '圣');
  assert.equal(api.getCharData(1).quality, '凡');
  assert.equal(result[0].atk, 300 + equipment.atk);
  assert.equal(result[0].hp, api.getEffectiveStats(1).hp);
  assert.equal(result[0].name, api.getCharData(1).name);
});
