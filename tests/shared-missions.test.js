const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSharedRuntime, plain } = require('./fixtures/shared-runtime.js');

function readyMission(runtime) {
  const { api } = runtime;
  const daily = api.DailyMissions.getOrCreateToday();
  const mission = daily.missions[0];
  const baseline = daily.baselines[mission.statKey] ?? 0;
  api.Storage.setImmediate('cross_game_stats', { xianyuan_points: 30, [mission.statKey]: baseline + mission.target });
  api.Storage.flush();
  return { daily, mission };
}

test('同一天生成四个不同游戏的固定任务，累计任务保留起始基线', () => {
  const { api } = createSharedRuntime();
  api.Storage.setImmediate('cross_game_stats', { cultivation_kills: 10 });
  const first = api.DailyMissions.getOrCreateToday();
  assert.equal(first.missions.length, 4);
  assert.equal(new Set(first.missions.map(item => item.game)).size, 4);
  assert.deepEqual(plain(api.DailyMissions.getOrCreateToday()), plain(first));
  assert.equal(api.DailyMissions.getProgress({ statKey: 'cultivation_kills' }, { baselines: { cultivation_kills: 10 } }), 0);
  assert.equal(api.DailyMissions.claim(-1).reason, 'bad_index');
  assert.equal(api.DailyMissions.claim(0.5).reason, 'bad_index');
  assert.equal(api.DailyMissions.claim('0').reason, 'bad_index');
});

test('领取同时写入奖励与标记，成功后只通知一次', () => {
  const runtime = createSharedRuntime();
  const { api } = runtime;
  const { mission } = readyMission(runtime);
  let updates = 0;
  runtime.context.addEventListener('daily-missions-updated', () => updates++);
  const result = api.DailyMissions.claim(0);
  assert.equal(result.ok, true);
  assert.equal(api.Storage.get('cross_game_stats').xianyuan_points, 30 + mission.reward);
  assert.deepEqual(plain(api.Storage.get('daily_missions').claimed), [0]);
  assert.equal(api.DailyMissions.claim(0).reason, 'claimed');
  assert.equal(updates, 1);
});

test('领取时第二笔写入失败不消耗领取次数、不增加仙缘，可以重试', () => {
  const runtime = createSharedRuntime();
  const { api, control, data } = runtime;
  const { mission } = readyMission(runtime);
  const original = new Map(data);
  let updates = 0;
  runtime.context.addEventListener('daily-missions-updated', () => updates++);
  control.onWrite = key => { if (key === 'cross_game_stats') throw new Error('quota'); };
  assert.throws(() => api.DailyMissions.claim(0), /已恢复/);
  assert.deepEqual(data, original);
  assert.deepEqual(plain(api.Storage.get('daily_missions').claimed), []);
  assert.equal(api.Storage.get('cross_game_stats').xianyuan_points, 30);
  assert.equal(updates, 0);
  control.onWrite = null;
  assert.equal(api.DailyMissions.claim(0).reward, mission.reward);
  assert.equal(updates, 1);
});

test('每日奖励到账后继续累计成就统计不会吞掉仙缘', () => {
  const runtime = createSharedRuntime();
  const { api } = runtime;
  api.CrossGameAchievements.trackStat('knife_max_wave', 12);
  const { mission } = readyMission(runtime);
  api.DailyMissions.claim(0);
  api.CrossGameAchievements.trackStat('knife_max_wave', 13);
  assert.equal(api.Storage.get('cross_game_stats').xianyuan_points, 30 + mission.reward);
});
