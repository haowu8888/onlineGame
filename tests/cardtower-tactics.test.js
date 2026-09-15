const test = require('node:test');
const assert = require('node:assert/strict');
const tactics = require('../js/cardtower-tactics');
const input = require('../js/cardtower-input');
const { loadGame } = require('./fixtures/game-runtime');

test('仙塔手牌摘要使用折扣后的真实费用，并要求黄泉炼有另一张祭牌', () => {
  const cards = Object.freeze([
    Object.freeze({ uid: 'a', cost: 2 }), Object.freeze({ uid: 'b', cost: 3 }),
    Object.freeze({ uid: 'c', cost: 2, requiresExhaust: true }),
  ]);
  const summary = tactics.handSummary({ cards, costs: [0, 2, 1], energy: 1, canAct: true });
  assert.equal(summary.playableCount, 2);
  assert.equal(summary.items[0].cost, 0);
  assert.equal(summary.items[1].reason, '需要 2 灵力');
  assert.equal(tactics.cardStatus({ card: cards[2], cost: 1, energy: 1, handSize: 1, canAct: true }).reason, '还需一张祭牌');
  assert.equal(tactics.handSummary({ cards, costs: [0, 2, 1], energy: 1, canAct: false }).playableCount, 0);
});

test('仙塔路线使用真实分支，只标记走过的节点，弹窗期间不允许选择下一步', () => {
  const runtime = loadGame({ file: 'cardtower.js', entry: "document.addEventListener('DOMContentLoaded'", exports: '{ GameState, buildTowerRows }' });
  const state = new runtime.api.GameState();
  state.towerRows = runtime.api.buildTowerRows(() => 0);
  state.towerNodeMap = Object.fromEntries(state.towerRows.flatMap(row => row.nodes.map(node => [node.id, node])));
  const first = state.towerRows[0].nodes[0];
  state.currentNodeId = first.id;
  state.completedNodeIds = [first.id];
  state.availableNodeIds = [...first.nextIds];
  const before = JSON.stringify(state);
  const route = tactics.route({ state, canSelect: true });
  assert.equal(route.length, state.towerRows.length);
  assert.equal(route[0].nodes[0].completed, true);
  assert.equal(route[0].nodes[1].completed, false);
  assert.equal(route[1].current, true);
  const available = route.flatMap(row => row.nodes).filter(node => node.selectable).map(node => node.id);
  assert.deepEqual(Array.from(available), Array.from(first.nextIds));
  assert.equal(tactics.route({ state, canSelect: false }).flatMap(row => row.nodes).some(node => node.selectable), false);
  assert.equal(JSON.stringify(state), before);
});

test('仙塔纯文本牌面解析真实数值，牌组分析不更改原牌组', () => {
  const cards = Object.freeze([
    Object.freeze({ type: 'attack', desc: '造成{damage}点伤害', damage: 12 }),
    Object.freeze({ type: 'defense' }), Object.freeze({ type: 'spell' }),
  ]);
  assert.equal(tactics.describeCard(cards[0]), '造成12点伤害');
  assert.deepEqual(tactics.deckSummary(cards), { total: 3, attack: 1, defense: 1, spell: 1 });
});

test('仙塔结算空窗不再消费手牌或灵力，真正战斗中的合法手牌仍可用', () => {
  const runtime = loadGame({ file: 'cardtower.js', entry: "document.addEventListener('DOMContentLoaded'", exports: '{ BattleManager, GameState }' });
  const state = new runtime.api.GameState();
  state.chosenClass = 'sword';
  state.reset();
  const card = { uid: 99, type: 'attack', cost: 1 };
  state.hand = [card];
  state.energy = 3;
  const manager = new runtime.api.BattleManager({ state });
  manager.playerTurn = true;
  manager.inBattle = true;
  assert.equal(manager.canPlayCard(card), false);
  manager.playCard(card.uid);
  assert.equal(state.energy, 3);
  assert.equal(state.hand.length, 1);
  manager.enemies = [{ hp: 10 }];
  assert.equal(manager.canPlayCard(card), true);
  state.gameOver = true;
  assert.equal(manager.canPlayCard(card), false);
  state.gameOver = false;
  manager.inBattle = false;
  assert.equal(manager.canPlayCard(card), false);
});

test('仙塔数字键优先选择奖励，奖励面板开启时不会打出背后的手牌或结束回合', () => {
  const handCard = { id: 'hand' };
  const rewardCard = { id: 'reward' };
  const endTurn = { id: 'end' };
  const overlays = ['cardReward', 'relicReward', 'upgradeOverlay', 'eventOverlay', 'restShop', 'cardRemoval'];
  let opened = null;
  const elements = Object.fromEntries(overlays.map(key => [key, { classList: { contains: () => opened === key } }]));
  Object.assign(elements, {
    handArea: { querySelectorAll: () => [handCard] }, rewardCards: { querySelectorAll: () => [rewardCard] }, btnEndTurn: endTurn,
  });
  const game = { battle: { playerTurn: true, inBattle: true }, state: { gameOver: false } };
  assert.equal(input.action({ elements, game, key: '1' }), handCard);
  opened = 'cardReward';
  assert.equal(input.action({ elements, game, key: '1' }), rewardCard);
  assert.equal(input.action({ elements, game, key: 'e' }), undefined);
  opened = null;
  assert.equal(input.action({ elements, game, key: 'e' }), endTurn);
});
