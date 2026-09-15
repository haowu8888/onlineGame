const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./fixtures/game-runtime');
const data = require('../js/portal-exchange-data');
const { create } = require('../js/portal-exchange-model');

const SWORD_BASE_HP = 70;
const PERMANENT_HP = 15;
const POTION_HP = 10;

function createTower(initialStorage = {}) {
  const runtime = loadGame({
    file: 'cardtower.js',
    entry: "document.addEventListener('DOMContentLoaded'",
    exports: '{ Game, GameState, CLASSES }',
    initialStorage,
  });
  const commits = [];
  runtime.storage.setManyImmediate = updates => {
    commits.push(structuredClone(updates));
    Object.entries(updates).forEach(([key, value]) => runtime.storage.setImmediate(key, value));
    return true;
  };
  const state = new runtime.api.GameState();
  state.chosenClass = 'sword';
  state.reset();
  const screens = [];
  const game = Object.assign(Object.create(runtime.api.Game.prototype), {
    state,
    ui: { showScreen: screen => screens.push(screen), logMessage() {}, renderAll: () => screens.push('route') },
  });
  return { ...runtime, game, commits, screens };
}

test('仙塔灵药：商城真实兑换两次，满血开局仍获得上限与气血，兼容永久护甲', () => {
  const runtime = createTower({ cross_game_stats: { xianyuan_points: 1000 } });
  const exchange = create({ storage: runtime.storage, data });
  exchange.purchase('tower_potion');
  exchange.purchase('tower_potion');
  exchange.purchase('tower_hp_boost');
  const purchaseState = runtime.storage.get('xianyuan_tower_bonuses');
  assert.equal(purchaseState.heal_next, POTION_HP * 2);
  assert.equal(purchaseState.hp, PERMANENT_HP);
  runtime.commits.length = 0;
  runtime.game.startGame(false);
  const expectedHp = SWORD_BASE_HP + PERMANENT_HP + POTION_HP * 2;
  assert.equal(runtime.game.state.maxHp, expectedHp);
  assert.equal(runtime.game.state.hp, expectedHp);
  assert.equal(runtime.commits.length, 1);
  assert.deepEqual(runtime.storage.get('xianyuan_tower_bonuses'), {
    hp: PERMANENT_HP, heal_next: 0, extraRelicChoices: 0,
  });
  assert.deepEqual(runtime.screens, ['game', 'route']);
  assert.ok(runtime.game.state.availableNodeIds.length > 0);
  assert.equal(runtime.game.state.currentNodeId, null);
});

test('仙塔一次性气血只对下一局有效，永久加成保留，已消费的圣物选项不重复领取', () => {
  const runtime = createTower({
    xianyuan_tower_bonuses: { hp: PERMANENT_HP, heal_next: POTION_HP, extraRelicChoices: 1 },
  });
  runtime.game.startGame(false);
  assert.equal(runtime.game.state.maxHp, SWORD_BASE_HP + PERMANENT_HP + POTION_HP);
  assert.equal(runtime.game.state._xianyuanExtraRelicChoices, 1);
  runtime.game.startGame(false);
  assert.equal(runtime.game.state.maxHp, SWORD_BASE_HP + PERMANENT_HP);
  assert.equal(runtime.game.state.hp, SWORD_BASE_HP + PERMANENT_HP);
  assert.equal(runtime.game.state._xianyuanExtraRelicChoices, 0);
  assert.equal(runtime.commits.length, 1);
});

test('仙塔药剂可叠加跨游戏气血奖励，所有职业都从各自基础生命上限增加', () => {
  const runtime = createTower();
  runtime.context.CrossGameRewards = {
    checkAndClaim: () => [{ name: '跨界赠礼', reward: { type: 'hp_bonus', value: 7 } }],
  };
  for (const character of runtime.api.CLASSES) {
    runtime.storage.setImmediate('xianyuan_tower_bonuses', { heal_next: POTION_HP });
    runtime.game.state.chosenClass = character.id;
    runtime.game.startGame(false);
    assert.equal(runtime.game.state.maxHp, character.statMod.maxHp + POTION_HP + 7);
    assert.equal(runtime.game.state.hp, character.statMod.hp + POTION_HP + 7);
  }
});

test('仙塔消费提交失败时保留原道具和当前状态，不先开局或增加气血', () => {
  const pending = { hp: PERMANENT_HP, heal_next: POTION_HP, extraRelicChoices: 1 };
  const runtime = createTower({ xianyuan_tower_bonuses: pending });
  runtime.game.state.hp = 17;
  runtime.game.state.maxHp = 130;
  runtime.storage.setManyImmediate = () => { throw new Error('quota exceeded'); };
  assert.throws(() => runtime.game.startGame(false), /quota exceeded/);
  assert.deepEqual(runtime.storage.get('xianyuan_tower_bonuses'), pending);
  assert.equal(runtime.game.state.hp, 17);
  assert.equal(runtime.game.state.maxHp, 130);
  assert.deepEqual(runtime.screens, []);
});

test('仙塔开局对非法加成明确报错，消费前不把字符串拼接成生命值', () => {
  const runtime = createTower({ xianyuan_tower_bonuses: { heal_next: '10' } });
  assert.throws(() => runtime.game.startGame(false), /heal_next 无效/);
  assert.equal(runtime.game.state.hp, SWORD_BASE_HP);
  assert.equal(runtime.commits.length, 0);
});
