const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./fixtures/game-runtime');

function createBattle() {
  const runtime = loadGame({
    file: 'cardbattle.js', html: 'games/cardbattle.html', entry: '  /* ===================== 初始化 ===================== */',
    exports: '{ newGame, showBattle, showCollection, render, getCardcollectCards, syncCardcollectToCollection, onHandCardClick, onEnemyMinionClick, onPlayerMinionClick, onEnemyMasterClick, useHeroPower, getState() { return G; } }',
    globals: {
      CardBattleTactics: require('../js/cardbattle-tactics'),
      CardBattlePresentation: require('../js/cardbattle-presentation'),
      CardBattleDeckView: require('../js/cardbattle-deck-view'),
      CardBattleInput: require('../js/cardbattle-input'),
      CardBattleCollection: require('../js/cardbattle-collection'),
    },
  });
  runtime.api.newGame(0);
  runtime.api.showBattle();
  return runtime;
}

function minion(overrides = {}) {
  return { name: '敌方随从', type: 'minion', atk: 2, hp: 3, maxHp: 3, canAttack: true, owner: 'enemy', ...overrides };
}

function prepareSpell(runtime, effect, enemies = []) {
  const state = runtime.api.getState();
  const spell = { name: '测试法术', type: 'spell', effect, cost: 4, desc: '按真实法术规则结算' };
  Object.assign(state, { playerEnergy: 4, playerMaxEnergy: 4, playerHand: [spell], enemyField: enemies, playerField: [] });
  runtime.api.render();
  return { state, spell };
}

test('灵魂收割：点击攻击过高的敌人不会消费卡牌，合法敌人才执行消灭', () => {
  const runtime = createBattle();
  const high = minion({ name: '强敌', atk: 4 });
  const low = minion({ name: '弱敌', atk: 3 });
  const { state, spell } = prepareSpell(runtime, 'killlow3', [high, low]);
  runtime.api.onHandCardClick(0);
  const targets = runtime.document.querySelectorAll('#enemy-field .cb-minion');
  assert.equal(targets[0].getAttribute('aria-disabled'), 'true');
  assert.equal(targets[1].getAttribute('aria-disabled'), 'false');
  runtime.api.onEnemyMinionClick(0);
  assert.equal(state.playerEnergy, 4);
  assert.equal(state.playerHand[0], spell);
  assert.equal(high.hp, 3);
  runtime.api.onEnemyMinionClick(1);
  assert.equal(state.playerEnergy, 0);
  assert.equal(state.playerHand.length, 0);
  assert.equal(state.enemyField.length, 1);
  assert.equal(state.enemyField[0], high);
});

test('灵魂收割：己方合法随从可选，并照常触发真实亡语抽牌', () => {
  const runtime = createBattle();
  const { state } = prepareSpell(runtime, 'killlow3');
  const draw = { name: '回春术', type: 'spell', cost: 2, effect: 'heal5' };
  state.playerField = [minion({ name: '己方亡语随从', owner: 'player', deathrattle: 'draw1' })];
  state.playerDeck = [draw];
  runtime.api.onHandCardClick(0);
  assert.equal(runtime.document.querySelector('#player-field .cb-minion').classList.contains('targetable'), true);
  runtime.api.onPlayerMinionClick(0);
  assert.equal(state.playerField.length, 0);
  assert.equal(state.playerEnergy, 0);
  assert.equal(state.playerHand.length, 1);
  assert.equal(state.playerHand[0], draw);
});

test('灵气弹：无目标时明确不可用；Escape 取消合法目标选择后手牌、灵力和目标生命均保留', () => {
  const runtime = createBattle();
  const { state, spell } = prepareSpell(runtime, 'deal3minion');
  runtime.api.onHandCardClick(0);
  assert.equal(runtime.document.querySelector('#player-hand .cb-card').getAttribute('aria-disabled'), 'true');
  assert.equal(state.playerHand[0], spell);
  state.enemyField = [minion()];
  runtime.api.onHandCardClick(0);
  assert.equal(runtime.document.getElementById('cb-target-instruction').textContent, '选择一个敌方随从');
  assert.equal(runtime.document.activeElement.tagName, 'BUTTON');
  let prevented = false;
  runtime.document.dispatchEvent({ type: 'keydown', key: 'Escape', target: runtime.document.body, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(runtime.document.getElementById('target-hint').style.display, 'none');
  assert.equal(state.playerEnergy, 4);
  assert.equal(state.playerHand[0], spell);
  assert.equal(state.enemyField[0].hp, 3);
  assert.equal(runtime.document.activeElement, runtime.document.querySelector('#player-hand .cb-card'));
});

test('攻击受嘲讽约束，天雷符仍可选对手仙师并按法术规则扣血', () => {
  const runtime = createBattle();
  const { state } = prepareSpell(runtime, 'deal6any', [minion({ taunt: true })]);
  state.playerField = [minion({ owner: 'player', atk: 5 })];
  runtime.api.onPlayerMinionClick(0);
  runtime.api.onEnemyMasterClick();
  assert.equal(state.enemyHP, 30);
  assert.equal(state.playerField[0].canAttack, true);
  runtime.api.onHandCardClick(0);
  assert.equal(runtime.document.getElementById('enemy-master').getAttribute('aria-disabled'), 'false');
  runtime.api.onEnemyMasterClick();
  assert.equal(state.enemyHP, 24);
  assert.equal(state.playerEnergy, 0);
  assert.equal(state.playerHand.length, 0);
});

test('灵技致命伤害：玩家与 AI 都会立即进入真正结算状态，后续使用不会重复扣费', () => {
  for (const owner of ['player', 'enemy']) {
    const runtime = createBattle();
    const state = runtime.api.getState();
    const opponent = owner === 'player' ? 'enemy' : 'player';
    Object.assign(state, { [owner + 'Energy']: 4, [opponent + 'HP']: 2, [opponent + 'Field']: [minion({ atk: 10 })] });
    assert.equal(runtime.api.useHeroPower(owner), true);
    assert.equal(state[opponent + 'HP'], 0);
    assert.equal(state[opponent + 'Field'][0].hp, 3);
    assert.equal(state.gameOver, true);
    assert.equal(state.phase, 'gameover');
    assert.equal(state.winner, owner);
    assert.equal(state[owner + 'Energy'], 2);
    assert.equal(runtime.api.useHeroPower(owner), false);
    assert.equal(state[owner + 'Energy'], 2);
  }
});

test('灵技保持原有自动目标规则：最高攻击优先，同攻击时优先低生命', () => {
  const runtime = createBattle();
  const state = runtime.api.getState();
  const strong = minion({ atk: 5, hp: 4, maxHp: 4 });
  const weak = minion({ atk: 5, hp: 2 });
  const low = minion({ atk: 2, hp: 1 });
  Object.assign(state, { playerEnergy: 2, enemyField: [strong, weak, low] });
  runtime.api.useHeroPower('player');
  assert.equal(state.enemyField.length, 2);
  assert.equal(state.enemyField[0], strong);
  assert.equal(state.enemyField[1], low);
  assert.equal(state.enemyHP, 30);
});

test('从仙卡录抽卡后进入灵卡可同步并展示真实角色，重复同步不会增加副本', () => {
  const runtime = createBattle();
  runtime.storage.setImmediate('cardcollect_save', { owned: {
    23: { level: 1, exp: 0, dupes: 2 }, 26: { level: 1, exp: 0, dupes: 0 },
    28: { level: 30, exp: 0, dupes: 0, quality: '圣' },
  } });
  runtime.api.syncCardcollectToCollection();
  const collection = runtime.storage.get('cardbattle_collection');
  for (const id of ['cc_23', 'cc_26', 'cc_28']) assert.equal(collection[id], 1);
  runtime.api.syncCardcollectToCollection();
  assert.deepEqual(runtime.storage.get('cardbattle_collection'), collection);
  runtime.api.showCollection();
  const card = runtime.document.querySelector('.cb-col-card[data-cid="cc_28"]');
  assert.ok(card.textContent.includes('药王'));
  assert.ok(card.querySelector('use').getAttribute('href').includes('assets/cardbattle/sigils.svg'));
  const state = runtime.api.getState();
  state.playerHand = runtime.api.getCardcollectCards();
  state.playerEnergy = 10;
  runtime.api.render();
  runtime.api.onHandCardClick(0);
  assert.equal(state.playerField[0].name, '剑仙');
  assert.equal(state.playerField[0].canAttack, true);
  assert.equal(state.playerEnergy, 6);
});
