const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSharedRuntime, plain } = require('./fixtures/shared-runtime.js');

test('共享脚本在独立 VM 中加载，不修改 Node 的只读 navigator', () => {
  const original = globalThis.navigator;
  const { api } = createSharedRuntime();
  assert.strictEqual(globalThis.navigator, original);
  assert.equal(api.escapeHtml('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  assert.equal(api.escapeHtml(null), '');
  assert.equal(api.escapeHtml(123), '123');
});

test('数字格式化、范围与五行倍率保持原有规则', () => {
  const { api } = createSharedRuntime();
  assert.equal(api.formatNumber(12345), '1.2万');
  assert.equal(api.formatNumber(1.5e8), '1.5亿');
  assert.equal(api.formatNumber(2e12), '2.0万亿');
  assert.equal(api.formatNumber(NaN), '0');
  assert.equal(api.clamp(15, 0, 10), 10);
  assert.equal(api.pick([7]), 7);
  assert.equal(api.elementBonus('metal', 'wood'), 1.3);
  assert.equal(api.elementBonus('metal', 'fire'), 0.7);
  assert.equal(api.elementBonus(null, 'wood'), 1);
  for (const [id, element] of Object.entries(api.FIVE_ELEMENTS)) {
    assert.equal(api.FIVE_ELEMENTS[element.strong].weak, id);
  }
});

test('成就更新读取最新仙缘，不用旧缓存覆盖交易后的余额', () => {
  const { api } = createSharedRuntime();
  api.CrossGameAchievements.trackStat('knife_max_wave', 10);
  api.Storage.setImmediate('cross_game_stats', { knife_max_wave: 10, xianyuan_points: 25 });
  api.CrossGameAchievements.trackStat('knife_max_wave', 12);
  assert.deepEqual(plain(api.Storage.get('cross_game_stats')), { knife_max_wave: 12, xianyuan_points: 25 });
  api.CrossGameAchievements.trackStat('knife_max_wave', 3);
  assert.equal(api.Storage.get('cross_game_stats').knife_max_wave, 12);
  assert.deepEqual(plain(api.CrossGameAchievements.checkNew().map(item => item.id)), ['wave_10']);
  assert.deepEqual(plain(api.CrossGameAchievements.checkNew()), []);
});

test('成就解锁记录在存档被替换后立即更新', () => {
  const { api } = createSharedRuntime();
  api.CrossGameAchievements.trackStat('knife_max_wave', 12);
  api.CrossGameAchievements.checkNew();
  assert.equal(api.CrossGameAchievements.getUnlockedCount(), 1);
  api.Storage.setImmediate('cross_game_achievements', ['guigu_sect']);
  assert.equal(api.CrossGameAchievements.getAll().find(item => item.id === 'wave_10').unlocked, false);
  assert.equal(api.CrossGameAchievements.getAll().find(item => item.id === 'guigu_sect').unlocked, true);
});

test('联动奖励仅领取一次，失去条件后移除对应游戏的奖励', () => {
  const { api } = createSharedRuntime();
  api.Storage.setImmediate('cross_game_stats', { knife_max_wave: 25 });
  assert.deepEqual(plain(api.CrossGameRewards.checkAndClaim('cardtower').map(item => item.id)), ['knife_to_tower']);
  assert.deepEqual(plain(api.CrossGameRewards.checkAndClaim('cardtower')), []);
  assert.equal(api.CrossGameRewards.getActiveRewards('cardtower').length, 1);
  api.Storage.setImmediate('cross_game_stats', { knife_max_wave: 5 });
  assert.equal(api.CrossGameRewards.revalidateClaimed('cardtower').length, 1);
  assert.equal(api.CrossGameRewards.getActiveRewards('cardtower').length, 0);
});

test('排行榜拒绝无限数，按成绩排序且保存昵称', () => {
  const { api } = createSharedRuntime();
  api.Storage.setImmediate('player_profile', { name: '  道友  ' });
  for (let score = 1; score <= 12; score++) api.updateLeaderboard('cardtower', score * 10);
  api.updateLeaderboard('cardtower', Infinity);
  api.updateLeaderboard('cardtower', NaN);
  const board = api.getLeaderboard('cardtower');
  assert.equal(board.length, api.CONSTANTS.LEADERBOARD_MAX_ENTRIES);
  assert.equal(board[0].score, 120);
  assert.equal(board[9].score, 30);
  assert.ok(board.every(item => item.name === '道友'));
  api.updateLeaderboard('knife', 9, { score: 999, date: 1, name: '刀客' });
  assert.equal(api.getLeaderboard('knife')[0].score, 9);
});

test('最近游玩记录真实访问，重复访问去重且不虚增游戏完成统计', () => {
  const { api } = createSharedRuntime();
  api.recordRecentGame('knife');
  api.recordRecentGame('cardtower');
  api.recordRecentGame('knife');
  api.recordRecentGame('portal');
  assert.deepEqual(plain(api.Storage.get('portal_recent_games').map(item => item.key)), ['knife', 'cardtower']);
  assert.equal(api.Storage.get('cross_game_stats'), null);
});
