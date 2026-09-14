const assert = require('node:assert/strict');
const check = require('node:test');
const { loadGame } = require('./fixtures/game-runtime');

const battle = loadGame({
  file: 'cardbattle.js', html: 'games/cardbattle.html', entry: '  /* ===================== 初始化 ===================== */',
  exports: '{ newGame, showResult, getState() { return G; }, setState(value) { G = value; } }',
  globals: {
    CardBattleTactics: require('../js/cardbattle-tactics'),
    CardBattlePresentation: require('../js/cardbattle-presentation'),
    CardBattleDeckView: require('../js/cardbattle-deck-view'),
    CardBattleInput: require('../js/cardbattle-input'),
  },
});
function loseNormalMatch(difficulty) {
  battle.api.newGame(difficulty);
  battle.api.getState().winner = 'enemy';
  battle.api.getState().gameOver = true;
  battle.api.showResult();
}
function resultIds() { return battle.document.querySelector('.cb-result-actions').children.map(node => node.id).join(','); }
check('灵卡对决：竞技场失败后，普通模式结算恢复普通重试并保持原难度', () => {
  battle.storage.setImmediate('cardbattle_arena', { bestStreak: 0, currentRun: { streak: 1, hp: 20 } });
  battle.api.setState({ isArena: true, winner: 'enemy', playerHP: 0 });
  battle.api.showResult();
  assert.equal(resultIds(), 'btn-retry-a,btn-back-menu-a');
  battle.document.getElementById('btn-back-menu-a').click();
  loseNormalMatch(1);
  assert.equal(resultIds(), 'btn-retry,btn-back-menu');
  assert.equal(battle.document.getElementById('btn-retry-a'), null);
  battle.document.getElementById('btn-retry').click();
  assert.equal(battle.api.getState().diff, 1);
  assert.equal(battle.api.getState().isArena, undefined);
  assert.equal(battle.storage.get('cardbattle_arena').currentRun, null);
  assert.equal(battle.document.getElementById('cb-result').style.display, 'none');
});
check('灵卡对决：竞技场胜利可继续，退出后普通模式不会残留下一场按钮', () => {
  battle.storage.setImmediate('cardbattle_arena', { bestStreak: 0, currentRun: { streak: 0, hp: 30 } });
  battle.api.setState({ isArena: true, winner: 'player', playerHP: 24 });
  battle.api.showResult();
  assert.equal(resultIds(), 'arena-next,arena-quit');
  battle.document.getElementById('arena-next').click();
  assert.equal(battle.api.getState().isArena, true);
  assert.equal(battle.api.getState().playerHP, 24);
  battle.api.getState().winner = 'player';
  battle.api.showResult();
  battle.document.getElementById('arena-quit').click();
  assert.equal(battle.storage.get('cardbattle_arena').bestStreak, 2);
  assert.equal(battle.storage.get('cardbattle_arena').currentRun, null);
  loseNormalMatch(2);
  assert.equal(resultIds(), 'btn-retry,btn-back-menu');
  assert.equal(battle.document.getElementById('arena-next'), null);
  battle.document.getElementById('btn-retry').click();
  assert.equal(battle.api.getState().diff, 2);
  assert.equal(battle.api.getState().isArena, undefined);
});
