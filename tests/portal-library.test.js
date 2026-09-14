const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalRuntime } = require('./fixtures/portal-runtime');
const { selectRecent } = require('../js/portal-library');

const VISIT_TIME = Date.UTC(2026, 8, 10, 12);
const MINUTE_MS = 60_000;

function visibleGames(runtime) {
  return runtime.document.querySelectorAll('.game-card')
    .filter(card => !card.hidden).map(card => card.dataset.game);
}

function search(runtime, query) {
  const input = runtime.document.getElementById('game-search');
  input.value = query;
  input.dispatchEvent({ type: 'input', target: input });
  return input;
}

test('游戏目录搜索真实名称、描述和标签，支持全角英文及多个关键词', () => {
  const runtime = createPortalRuntime();
  assert.equal(visibleGames(runtime).length, 7);
  search(runtime, '  卡牌  ');
  assert.deepEqual(visibleGames(runtime), ['cardtower', 'cardbattle', 'cardcollect']);
  search(runtime, '肉鸽 卡牌');
  assert.deepEqual(visibleGames(runtime), ['cardtower']);
  search(runtime, 'ＲＰＧ');
  assert.deepEqual(visibleGames(runtime), ['cultivation', 'guigu']);
  search(runtime, '转转刀');
  assert.deepEqual(visibleGames(runtime), ['knife']);
  assert.equal(runtime.document.getElementById('game-result-count').textContent, '找到 1 款游戏');
});

test('玩法筛选与搜索取交集，空结果可恢复全部游戏并把焦点放回搜索框', () => {
  const runtime = createPortalRuntime();
  const growth = runtime.document.querySelector('[data-category="growth"]');
  growth.click();
  assert.equal(growth.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(visibleGames(runtime), ['cultivation', 'guigu', 'cardcollect']);
  search(runtime, '卡牌');
  assert.deepEqual(visibleGames(runtime), ['cardcollect']);
  search(runtime, '完全不存在的名字');
  assert.equal(visibleGames(runtime).length, 0);
  assert.equal(runtime.document.getElementById('game-search-empty').hidden, false);
  runtime.document.getElementById('game-filter-reset').click();
  assert.equal(visibleGames(runtime).length, 7);
  assert.equal(runtime.document.getElementById('game-search-empty').hidden, true);
  assert.equal(runtime.document.getElementById('game-search').value, '');
  assert.equal(runtime.document.activeElement.id, 'game-search');
  assert.equal(runtime.document.querySelector('[data-category="all"]').getAttribute('aria-pressed'), 'true');
});

test('搜索可用 Escape 清空，保留当前玩法筛选和键盘焦点', () => {
  const runtime = createPortalRuntime();
  runtime.document.querySelector('[data-category="roguelike"]').click();
  const input = search(runtime, '卡牌');
  assert.deepEqual(visibleGames(runtime), ['cardtower']);
  input.dispatchEvent({ type: 'keydown', key: 'Escape', target: input });
  assert.deepEqual(visibleGames(runtime), ['knife', 'cardtower']);
  assert.equal(input.value, '');
  assert.equal(runtime.document.activeElement, input);
  assert.equal(runtime.document.getElementById('game-search-clear').hidden, true);
});

test('首次访问不伪造最近游玩，回到页面后读取实际新增的访问记录', () => {
  const runtime = createPortalRuntime();
  assert.equal(runtime.document.getElementById('recent-section').hidden, true);
  assert.equal(runtime.storage.get('portal_recent_games'), null);
  const records = [{ key: 'knife', visitedAt: VISIT_TIME }];
  runtime.storage.setImmediate('portal_recent_games', records);
  runtime.events.dispatch({ type: 'focus' });
  runtime.frames.flush();
  const link = runtime.document.querySelector('.recent-game');
  assert.equal(runtime.document.getElementById('recent-section').hidden, false);
  assert.equal(link.getAttribute('href'), 'games/knife.html');
  assert.equal(link.querySelector('.recent-name').textContent, '转转刀');
  assert.equal(link.querySelector('time').getAttribute('datetime'), new Date(VISIT_TIME).toISOString());
  assert.deepEqual(runtime.storage.get('portal_recent_games'), records);
});

test('最近游玩按实际时间去重排序，排除未知入口与非法时间，不修改存储对象', () => {
  const games = [{ key: 'knife' }, { key: 'cardtower' }];
  const records = [
    { key: 'knife', visitedAt: VISIT_TIME },
    { key: 'cardtower', visitedAt: VISIT_TIME + MINUTE_MS },
    { key: 'knife', visitedAt: VISIT_TIME + MINUTE_MS * 2 },
    { key: '../../outside', visitedAt: VISIT_TIME },
    { key: 'knife', visitedAt: Infinity },
    { key: 'knife', visitedAt: 'yesterday' },
    { key: 'knife', visitedAt: -1 },
    { key: 'knife', visitedAt: Number.MAX_VALUE },
    null,
  ];
  const original = structuredClone(records);
  assert.deepEqual(selectRecent(games, records), [
    { key: 'knife', visitedAt: VISIT_TIME + MINUTE_MS * 2 },
    { key: 'cardtower', visitedAt: VISIT_TIME + MINUTE_MS },
  ]);
  assert.deepEqual(records, original);
  assert.throws(() => selectRecent(games, {}), /最近游玩记录格式错误/);
});
