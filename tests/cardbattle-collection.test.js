const assert = require('node:assert/strict');
const { test } = require('node:test');
const bridge = require('../js/cardbattle-collection');
const catalog = require('../js/cardcollect-catalog').byId;

test('真实 owned 存档只有成长字段时，联动卡仍使用角色册的姓名、定位与品质', () => {
  const owned = Object.freeze({
    23: Object.freeze({ level: 1, exp: 0, dupes: 0 }),
    26: Object.freeze({ level: 1, exp: 0, dupes: 0 }),
    28: Object.freeze({ level: 1, exp: 0, dupes: 0 }),
  });
  const cards = bridge.fromSave({ save: Object.freeze({ owned }), catalog });
  assert.deepEqual(cards.map(card => card.name), ['剑仙', '金刚尊者', '药王']);
  assert.equal(cards[0].charge, true);
  assert.equal(cards[1].taunt, true);
  assert.equal(cards[2].battlecry, 'aoe3');
  assert.deepEqual(cards.map(({ cost, atk, hp }) => [cost, atk, hp]), [[4, 4, 3], [4, 2, 7], [3, 2, 3]]);
});

test('突破品质和真实等级参与联动成长，沿用既有 10 费规则，不写回来源角色册', () => {
  const before = JSON.stringify(catalog);
  const save = { owned: { 23: { level: 100 }, 28: { level: 30, quality: '圣' } } };
  const cards = bridge.fromSave({ save, catalog });
  assert.equal(cards[0].cost, 10);
  assert.equal(cards[1].cost, 6);
  assert.equal(cards[1].battlecry, 'heal5aoe3');
  assert.equal(JSON.stringify(catalog), before);
  assert.deepEqual(save.owned[28], { level: 30, quality: '圣' });
});

test('未玩过仙卡录与空角色册可正常同步，损坏的角色记录明确报错', () => {
  assert.deepEqual(bridge.fromSave({ save: null, catalog }), []);
  assert.deepEqual(bridge.fromSave({ save: { owned: {} }, catalog }), []);
  assert.throws(() => bridge.fromSave({ save: {}, catalog }), /owned/);
  assert.throws(() => bridge.fromSave({ save: { owned: { 999: { level: 1 } } }, catalog }), /未知角色/);
  assert.throws(() => bridge.fromSave({ save: { owned: { 1: { level: 0 } } }, catalog }), /等级/);
  assert.throws(() => bridge.fromSave({ save: { owned: { 1: { level: 1, quality: '未知' } } }, catalog }), /品质/);
});
