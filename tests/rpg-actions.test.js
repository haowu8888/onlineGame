const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const check = require('node:test');
const { loadGame } = require('./fixtures/game-runtime');
const { makeDom } = require('./fixtures/dom');
const { createSharedRuntime } = require('./fixtures/shared-runtime');
const focus = require('../js/cultivation-focus');
const route = require('../js/guigu-route');
const shared = createSharedRuntime();

const cult = loadGame({
  file: 'cultivation.js', entry: '  // --- 初始化 ---',
  exports: '{ CultivationGame, CultivationUI, REALMS, INSIGHT_REQUIREMENTS }',
});
const guigu = loadGame({
  file: 'guigu.js', html: 'games/guigu.html', entry: '/* ==================== 启动 ==================== */',
  exports: '{ GuiguGame, GuiguUI, SPIRIT_ROOTS, SECTS, PERSONALITIES, MOUNTS }',
  globals: { GuiguRoute: route, elementBonus: shared.api.elementBonus, escapeHtml: shared.api.escapeHtml },
});

function newCultivationGame() {
  const game = new cult.api.CultivationGame();
  assert.equal(game.createCharacter('修炼测试', 'water', 'spirit', 1), true);
  return game;
}

function newGuiguGame() {
  const game = new guigu.api.GuiguGame();
  game.createCharacter({
    slotIndex: 0, name: '行路测试', spiritRoot: guigu.api.SPIRIT_ROOTS[0].id,
    sect: guigu.api.SECTS[0].id, personality: guigu.api.PERSONALITIES[0].id,
    talents: [], sex: 'male',
  });
  return game;
}

function workbenchFor(document) {
  const sandbox = { document, window: {} };
  const source = fs.readFileSync(path.join(__dirname, '../js/cultivation-workbench.js'), 'utf8');
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  return sandbox.window.CultivationWorkbench;
}

check('修仙：任务进度越过目标时立即生成领取按钮，后续 tick 保留焦点与按钮', () => {
  const document = makeDom('<section id="panel"><div class="quest-card"><span class="quest-name">打坐入定</span></div></section>');
  const panel = document.getElementById('panel');
  const workbench = workbenchFor(document);
  const quest = { name: '打坐入定', progress: 9, target: 10, claimed: false };
  const update = () => workbench.updateQuests({ panel, quests: [quest], questStatus: focus.questStatus });
  update();
  assert.equal(panel.querySelector('.quest-claim-btn'), null);
  quest.progress = 10;
  update();
  const button = panel.querySelector('.quest-claim-btn');
  assert.ok(button);
  assert.equal(button.dataset.quest, '0');
  assert.equal(button.getAttribute('aria-label'), '领取打坐入定奖励');
  button.focus();
  quest.progress++;
  update();
  assert.equal(panel.querySelector('.quest-claim-btn'), button);
  assert.equal(document.activeElement, button);
  quest.claimed = true;
  update();
  assert.equal(panel.querySelector('.quest-claim-btn'), null);
  assert.equal(panel.querySelector('.quest-status').textContent, '已领取');
});

check('修仙：突破禁用原因随修为、悟道实时变化，满足条件时移除旧原因', () => {
  const game = newCultivationGame();
  const document = makeDom('<section id="panel"><div id="cult-info"></div><div id="cult-insight-label"></div><div id="cult-insight-fill"></div><button id="btn-breakthrough" data-disabled-reason="修为不足"></button></section>');
  const panel = document.getElementById('panel');
  const ui = Object.create(cult.api.CultivationUI.prototype);
  ui.game = game;
  ui._getPanel = () => panel;
  ui._updateCultivationWorkbench = () => {};
  const button = panel.querySelector('button');
  game.data.exp = cult.api.REALMS[1].expReq;
  game.data.insight = cult.api.INSIGHT_REQUIREMENTS[1] - 1;
  ui._updateCultivatePanelTick();
  assert.equal(button.dataset.disabledReason, '悟道不足');
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  game.data.insight = cult.api.INSIGHT_REQUIREMENTS[1];
  ui._updateCultivatePanelTick();
  assert.equal(button.getAttribute('aria-disabled'), 'false');
  assert.equal(button.dataset.disabledReason, undefined);
  assert.equal(button.textContent, '尝试突破');
});

check('修仙：新领取入口调用原奖励逻辑，奖励仅到账一次', () => {
  const game = newCultivationGame();
  game.data.dailyQuests = [{ progress: 10, target: 10, claimed: false, rewardGold: 200, rewardExp: 150, rewardSectExp: 10 }];
  const ui = Object.create(cult.api.CultivationUI.prototype);
  ui.game = game;
  ui.renderCultivatePanel = () => {};
  ui.renderStatusBar = () => {};
  const gold = game.data.gold;
  const exp = game.data.exp;
  ui._claimCultivationQuest(0);
  ui._claimCultivationQuest(0);
  assert.equal(game.data.gold, gold + 200);
  assert.equal(game.data.exp, exp + 150);
  assert.equal(game.data.sectContribution, 10);
  assert.equal(game.data.dailyQuests[0].claimed, true);
});

check('鬼谷：实际移动一次只前进路线的一格，耗时与预览一致并返回原遭遇', () => {
  const game = newGuiguGame();
  const destination = { x: 9, y: 9 };
  const planned = route.getKnownRoute({ fog: game.state.fog, start: game.state.position, destination });
  assert.equal(planned.length, 2);
  const day = game.state.day;
  const stepDays = game.getTravelDays();
  const result = game.moveTo(planned[0].x, planned[0].y);
  assert.equal(game.state.position.x, planned[0].x);
  assert.equal(game.state.position.y, planned[0].y);
  assert.equal(game.state.day, day + stepDays);
  assert.ok(result.encounter);
  assert.equal(route.getKnownRoute({ fog: game.state.fog, start: game.state.position, destination }).length, 1);
});

check('鬼谷：骑乘时实际消耗坐骑折扣天数，并保留骑乘次数奖励记录', () => {
  const game = newGuiguGame();
  game.state.activeMount = guigu.api.MOUNTS[0].id;
  game.state.mountFeed = 100;
  const day = game.state.day;
  const expected = route.getStepDays({ baseDays: 7, mount: guigu.api.MOUNTS[0], feed: 100 });
  game.moveTo(8, 8);
  assert.equal(game.state.day, day + expected);
  assert.equal(game.state.mountRides, 1);
});

check('鬼谷：路线操作沿用原战斗入口，不吞掉移动错误或遭遇', () => {
  const game = newGuiguGame();
  const ui = Object.create(guigu.api.GuiguUI.prototype);
  ui.game = game;
  let battles = 0;
  let renders = 0;
  ui.showBattleModal = () => { battles++; };
  ui.refreshUI = () => { renders++; };
  ui._travelToCell({ x: 8, y: 8 });
  assert.equal(battles, 1);
  assert.ok(game.state.battleState);
  assert.equal(renders, 1);
  ui._travelToCell({ x: 14, y: 14 });
  assert.equal(game.state.position.x, 8);
  assert.equal(game.state.position.y, 8);
  assert.equal(battles, 1);
  assert.equal(renders, 1);
});

check('鬼谷：输入道号后切换性别保留输入，角色文本不会作为 HTML 渲染', () => {
  const ui = Object.create(guigu.api.GuiguUI.prototype);
  ui._domCache = {};
  ui.renderCharCreate(1);
  const input = guigu.document.getElementById('create-name');
  input.value = '青岚行者';
  input.dispatchEvent({ type: 'input', target: input });
  guigu.document.getElementById('sex-female').click();
  assert.equal(guigu.document.getElementById('create-name').value, '青岚行者');
  assert.equal(ui.createConfig.name, '青岚行者');
  assert.equal(ui.createConfig.sex, 'female');
  ui.createConfig.name = '<svg>';
  ui._renderCreateStep();
  assert.equal(guigu.document.getElementById('char-create').querySelector('svg'), null);
  assert.ok(guigu.document.getElementById('char-create').innerHTML.includes('&lt;svg&gt;'));
});

check('鬼谷：从其他页面回到地图时，标签与面板保持唯一且一致的选中状态', () => {
  const ui = Object.create(guigu.api.GuiguUI.prototype);
  ui._domCache = {};
  ui._selectGameTab('overview');
  ui._selectGameTab('map');
  assert.equal(ui.currentTab, 'map');
  assert.equal(guigu.document.querySelectorAll('.guigu-tab.active').length, 1);
  assert.equal(guigu.document.querySelector('.guigu-tab.active').dataset.tab, 'map');
  assert.equal(guigu.document.querySelectorAll('.guigu-panel.active').length, 1);
  assert.equal(guigu.document.querySelector('.guigu-panel.active').dataset.panel, 'map');
});
