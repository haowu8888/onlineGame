const assert = require('node:assert/strict');
const test = require('node:test');
const journal = require('../js/lifesim-journal');
const { loadGame } = require('./fixtures/game-runtime');

test('人生手札兼容旧 HTML 日志、普通纪事和大小写实体', () => {
  const logs = Object.freeze([
    '<span class="log-age">[18岁]</span> 问道: 智力+2 &amp; 灵根+1',
    '一段未标注年岁的纪事',
    { text: '<span>[7岁]</span> &#X4EBA;生 &AMP; &#x4e66;卷' },
  ]);
  const entries = journal.parseLogs(logs);
  assert.deepEqual(entries.map(entry => entry.age), [18, null, 7]);
  assert.equal(entries[0].text, '问道: 智力+2 & 灵根+1');
  assert.equal(entries[2].text, '人生 & 书卷');
  assert.equal(logs[0].includes('<span'), true);
});

test('手札按真实年龄阶段和关键词组合过滤，无年岁的纪事只在全部阶段展示', () => {
  const entries = journal.parseLogs(['[6岁] 初识师父', '[7岁] 随师父读书', '[15岁] 拜师', '[16岁] 辞别师父', '结识好友']);
  const stage = Object.freeze({ minAge: 7, maxAge: 15 });
  assert.deepEqual(journal.filterEntries(entries, { stage }).map(entry => entry.age), [7, 15]);
  assert.deepEqual(journal.filterEntries(entries, { stage, query: ' 师父 ' }).map(entry => entry.age), [7]);
  assert.equal(journal.filterEntries(entries, { query: '16岁' })[0].age, 16);
  assert.equal(journal.filterEntries(entries, { query: '好友' })[0].age, null);
  assert.equal(journal.filterEntries(entries, { query: '未发生的事件' }).length, 0);
});

test('属性变化来自前后实际数值，保持快照不变并暴露非法数值', () => {
  const before = Object.freeze({ str: 4, int: 8, gold: 100 });
  const after = Object.freeze({ str: 6, int: 8, gold: 70 });
  const labels = Object.freeze({ str: '体质', int: '智力', gold: '金币' });
  const changes = journal.getChanges({ before, after, labels });
  assert.deepEqual(changes.map(change => [change.label, change.delta, change.value]), [['体质', 2, 6], ['金币', -30, 70]]);
  assert.deepEqual(journal.getChanges({ before, after: before, labels }), []);
  assert.throws(() => journal.getChanges({ before, after: { str: NaN }, labels: { str: '体质' } }), TypeError);
});

test('年岁时间轴在阶段边界只标记一个当前阶段', () => {
  const stages = Object.freeze([
    Object.freeze({ name: '幼年', minAge: 0, maxAge: 6 }),
    Object.freeze({ name: '少年', minAge: 7, maxAge: 15 }),
  ]);
  const timeline = journal.getTimeline(7, stages);
  assert.equal(timeline[0].passed, true);
  assert.equal(timeline[0].current, false);
  assert.equal(timeline[1].current, true);
  assert.equal(Object.hasOwn(stages[0], 'current'), false);
});

function createLifeUi() {
  const runtime = loadGame({
    file: 'lifesim.js', html: 'games/lifesim.html', entry: '  // --- 初始化 ---',
    exports: '{ LifeSimGame, LifeSimUI, GAME_ITEMS }',
  });
  runtime.context.LifeJournal = journal;
  // 这些用例隔离存档和点击分派；可视化模块另由浏览器真实验证。
  runtime.context.LifeJournalView = { mount() {}, refreshStats() {}, renderRecent() {}, showChanges() {} };
  return { ...runtime, ui: new runtime.api.LifeSimUI() };
}

function dispatchClick(container, target) {
  const browserTarget = Object.create(target);
  browserTarget.closest = selector => selector.split(',').map(part => target.closest(part)).find(Boolean) || null;
  const event = { type: 'click', target: browserTarget, preventDefault() {}, stopPropagation() {} };
  container.onclick?.(event);
  container.dispatchEvent(event);
}

test('存档列表重复展示后，一次新建点击只触发一次创建流程', () => {
  const { ui } = createLifeUi();
  ui.renderSlotSelection();
  ui.renderSlotSelection();
  let calls = 0;
  ui.showStartScreen = () => { calls += 1; };
  dispatchClick(ui.startEl, ui.startEl.querySelector('[data-create="1"]'));
  assert.equal(calls, 1);
});

test('事件结算立即保存，重绘不重复消耗道具，使用道具也不恢复已结算选择', () => {
  const { ui, api, document, storage } = createLifeUi();
  ui.game.activeSlot = 1;
  ui.game.createCharacter('手札回归', { str: 4, int: 4, cha: 4, luk: 4, spr: 4 }, []);
  ui.showFloatingText = () => {};
  const item = api.GAME_ITEMS[0];
  ui.game.addItem(item.id, 3);
  const event = { title: '读书', desc: '读一卷书', icon: '📖', choices: [
    { text: '研读', effect: game => { game.data.attrs.int += 2; return '智力+2'; } },
  ] };
  ui.renderGameUI(event);
  ui.renderGameUI(event);
  ui.renderGameUI(event);
  const choices = document.getElementById('event-choices');
  const choice = choices.querySelector('.ls-choice-btn');
  dispatchClick(choices, choice);
  assert.equal(storage.get('game_lifesim_save_1').data.attrs.int, 6);
  dispatchClick(choices, choice);
  assert.equal(ui.game.data.attrs.int, 6);
  dispatchClick(ui.gameEl, ui.gameEl.querySelector('.ls-item-btn'));
  assert.equal(ui.game.data.items.find(entry => entry.id === item.id).count, 2);
  assert.ok(document.querySelector('.ls-event-result'));
  assert.equal(document.querySelectorAll('.ls-choice-btn').length, 0);
  assert.equal(storage.get('game_lifesim_save_1').data.items[0].count, 2);
});
