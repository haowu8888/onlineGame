const assert = require('node:assert/strict');
const test = require('node:test');
const data = require('../js/portal-exchange-data.js');
const { create } = require('../js/portal-exchange-model.js');
const progression = require('../js/cardcollect-progression.js');
const { createPortalRuntime } = require('./fixtures/portal-runtime');

function freeze(value) {
  if (!value || typeof value !== 'object') return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function setup(initial, options = {}) {
  let values = freeze(structuredClone(initial));
  const commits = [];
  const storage = {
    get(key, fallback = null) { return Object.hasOwn(values, key) ? values[key] : fallback; },
    set() { throw new Error('交易禁止分步写入'); },
    setImmediate() { throw new Error('交易禁止分步写入'); },
    setManyImmediate(updates) {
      commits.push(updates);
      if (options.commitError) throw options.commitError;
      values = freeze({ ...values, ...structuredClone(updates) });
      return true;
    },
  };
  return { model: create({ storage, data, progression }), storage, commits };
}

for (const itemId of ['cult_gold_500', 'collect_stones_500', 'guigu_herb']) {
  test(itemId + '：没有目标存档时不扣点、不记录购买', () => {
    const state = setup({ cross_game_stats: { xianyuan_points: 1000 } });
    assert.throws(() => state.model.purchase(itemId), /创建角色/);
    assert.equal(state.storage.get('cross_game_stats').xianyuan_points, 1000);
    assert.equal(state.storage.get('xianyuan_purchased'), null);
    assert.equal(state.commits.length, 0);
  });
}

test('修仙奖励、扣款与购买次数通过一个事务提交，连续购买读取最新价格', () => {
  const state = setup({
    cross_game_stats: { xianyuan_points: 300, cultivation_kills: 12 },
    cultivation_save_2: { name: '青云', gold: 50 },
  });
  const first = state.model.purchase('cult_gold_500');
  const second = state.model.purchase('cult_gold_500');
  assert.equal(first.cost, 30);
  assert.equal(second.cost, 36);
  assert.equal(first.recipient, '青云');
  assert.equal(state.storage.get('cultivation_save_2').gold, 1050);
  assert.deepEqual(state.storage.get('cross_game_stats'), { xianyuan_points: 234, cultivation_kills: 12 });
  assert.equal(state.storage.get('xianyuan_purchased').cult_gold_500, 2);
  assert.equal(state.commits.length, 2);
  assert.deepEqual(Object.keys(state.commits[0]).sort(), [
    'cross_game_stats', 'cultivation_save_2', 'xianyuan_purchased',
  ]);
});

test('鬼谷灵草进入真实背包，合并现有堆叠并保留其他材料', () => {
  const inventory = [
    { id: 'mat001', name: '灵草', type: 'material', count: 2 },
    { id: 'mat002', name: '铁矿石', type: 'material', count: 5 },
  ];
  const state = setup({
    cross_game_stats: { xianyuan_points: 100 },
    guigu_save_0: { name: '道友', inventory },
  });
  state.model.purchase('guigu_herb');
  const saved = state.storage.get('guigu_save_0');
  assert.equal(saved.inventory[0].count, 5);
  assert.deepEqual(saved.inventory[1], inventory[1]);
  assert.equal(Object.hasOwn(saved, 'herbs'), false);
  assert.equal(inventory[0].count, 2);
});

test('自然修炼产生的小数修为与悟道值可查看兑换，发放奖励完整保留小数', () => {
  const original = { name: '青竹', gold: 50, exp: 38.75, insight: 3.800000000000002 };
  const state = setup({
    cross_game_stats: { xianyuan_points: 100 },
    cultivation_save_1: original,
  });
  assert.equal(state.model.list().length, data.ITEMS.length);
  assert.equal(state.commits.length, 0);
  state.model.purchase('cult_insight_30');
  state.model.purchase('cult_exp_pill');
  assert.deepEqual(state.storage.get('cultivation_save_1'), {
    ...original, exp: original.exp + 500, insight: original.insight + 30,
  });
  assert.equal(state.storage.get('cross_game_stats').xianyuan_points, 25);
  assert.equal(original.insight, 3.800000000000002);
});

test('修炼数值拒绝非数值、负数与非有限数，金币仍要求非负整数', () => {
  for (const value of ['3.8', -0.1, Infinity, NaN]) {
    const state = setup({
      cross_game_stats: { xianyuan_points: 100 },
      cultivation_save_1: { gold: 50, exp: value },
    });
    assert.throws(() => state.model.purchase('cult_exp_pill'), /非负数/);
    assert.equal(state.commits.length, 0);
  }
  const state = setup({
    cross_game_stats: { xianyuan_points: 100 },
    cultivation_save_1: { gold: 0.5 },
  });
  assert.throws(() => state.model.purchase('cult_gold_500'), /非负整数/);
  assert.equal(state.commits.length, 0);
});

test('带自然修炼小数的存档不会阻断首页初始化', () => {
  const runtime = createPortalRuntime({
    cultivation_save_1: { name: '青竹', gold: 50, exp: 38.75, insight: 3.800000000000002 },
  });
  assert.equal(runtime.document.getElementById('daily-points').textContent, '仙缘点: 0');
  assert.equal(runtime.document.querySelector('.game-card-progress').textContent, '青竹 · 凡人');
  assert.equal(runtime.document.querySelectorAll('.exchange-item').length, data.ITEMS.length);
});

test('鬼谷首次获得灵草时创建游戏可识别的 mat001 材料', () => {
  const state = setup({
    cross_game_stats: { xianyuan_points: 100 },
    guigu_save_0: { inventory: [] },
  });
  state.model.purchase('guigu_herb');
  assert.deepEqual(state.storage.get('guigu_save_0').inventory, [
    { id: 'mat001', name: '灵草', type: 'material', count: 3 },
  ]);
});

test('仙卡卷轴给当前队伍升级，满级经验归零且不改动未上阵角色', () => {
  const state = setup({
    cross_game_stats: { xianyuan_points: 100 },
    cardcollect_save: {
      team: [17, 20, 17, null, null],
      owned: { 17: { level: 1, exp: 40 }, 20: { level: 30, exp: 0 }, 1: { level: 2, exp: 7 } },
    },
  });
  state.model.purchase('collect_exp_scroll');
  const owned = state.storage.get('cardcollect_save').owned;
  assert.deepEqual(owned[17], { level: 3, exp: 90 });
  assert.deepEqual(owned[20], { level: 30, exp: 0 });
  assert.deepEqual(owned[1], { level: 2, exp: 7 });
});

test('未编队或全队满级时卷轴不扣款', () => {
  for (const team of [[], [1]]) {
    const state = setup({
      cross_game_stats: { xianyuan_points: 100 },
      cardcollect_save: { team, owned: { 1: { level: 30, exp: 0 } } },
    });
    assert.throws(() => state.model.purchase('collect_exp_scroll'), /编排队伍|满级/);
    assert.equal(state.commits.length, 0);
  }
});

test('待领取装备宝箱无需提前创建角色，奖励进入游戏实际消费的队列', () => {
  const state = setup({ cross_game_stats: { xianyuan_points: 100 } });
  state.model.purchase('cardcollect_equip_box');
  assert.deepEqual(state.storage.get('xianyuan_cardcollect_bonuses'), { equipBoxes: 1 });
  assert.equal(state.storage.get('cross_game_stats').xianyuan_points, 55);
});

test('永久道具只扣款一次，旧数组购买记录在成功交易中迁移', () => {
  const state = setup({
    cross_game_stats: { xianyuan_points: 300 },
    xianyuan_purchased: ['cult_gold_500', 'cult_gold_500'],
  });
  state.model.list();
  assert.equal(state.commits.length, 0);
  state.model.purchase('lifesim_luck');
  assert.equal(state.storage.get('xianyuan_lifesim_bonuses').luck, 3);
  assert.deepEqual(state.storage.get('xianyuan_purchased'), { cult_gold_500: 2, lifesim_luck: 1 });
  assert.throws(() => state.model.purchase('lifesim_luck'), /已兑换/);
  assert.equal(state.commits.length, 1);
});

test('事务失败向调用方抛错，业务层没有提前扣点或修改原存档', () => {
  const failure = new Error('磁盘写入失败');
  const state = setup({
    cross_game_stats: { xianyuan_points: 100 },
    cultivation_save_1: { gold: 50 },
  }, { commitError: failure });
  assert.throws(() => state.model.purchase('cult_gold_500'), error => error === failure);
  assert.equal(state.storage.get('cross_game_stats').xianyuan_points, 100);
  assert.equal(state.storage.get('cultivation_save_1').gold, 50);
  assert.equal(state.storage.get('xianyuan_purchased'), null);
});

test('非法价格计数和余额明确报错，读取视图不会写入状态', () => {
  assert.throws(() => data.getCost(data.ITEMS[0], -1), /非负整数/);
  const state = setup({ cross_game_stats: { xianyuan_points: '100' } });
  assert.throws(() => state.model.list(), /仙缘点/);
  assert.equal(state.commits.length, 0);
});
