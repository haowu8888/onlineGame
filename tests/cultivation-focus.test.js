const assert = require('node:assert/strict');
const { getGoal, formatDuration, questStatus } = require('../js/cultivation-focus.js');

const base = Object.freeze({
  exp: 100, insight: 20, expRate: 2, insightRate: 0.1,
  nextRealm: Object.freeze({ name: '炼气期', expReq: 220 }),
  insightRequired: 30, meditating: true,
});

function run(name, test) {
  test();
  console.log(`PASS ${name}`);
}

run('突破预计时间同时考虑修为与悟道，采用较慢的一项', () => {
  const goal = getGoal(base);
  assert.equal(goal.expMissing, 120);
  assert.equal(goal.insightMissing, 10);
  assert.equal(goal.secondsToReady, 100);
  assert.equal(goal.ready, false);
});

run('只差修为时按真实修炼速率估算，超额悟道不会产生负进度', () => {
  const goal = getGoal({ ...base, insight: 35 });
  assert.equal(goal.secondsToReady, 60);
  assert.equal(goal.insightProgress, 100);
  assert.equal(goal.insightMissing, 0);
});

run('停止打坐不会标记正在修炼，估算仍可用于决定下一步', () => {
  const goal = getGoal({ ...base, meditating: false });
  assert.equal(goal.meditating, false);
  assert.equal(goal.secondsToReady, 100);
});

run('满条件及最高境界分别处理，不会生成不存在的突破', () => {
  assert.equal(getGoal({ ...base, exp: 300, insight: 40 }).ready, true);
  const complete = getGoal({ ...base, nextRealm: null, insightRequired: 0 });
  assert.equal(complete.complete, true);
  assert.equal(complete.ready, false);
  assert.equal(complete.secondsToReady, 0);
});

run('零速度且条件未满足时明确无法估算，已满足的零速度项不阻塞', () => {
  assert.equal(getGoal({ ...base, expRate: 0 }).secondsToReady, null);
  assert.equal(getGoal({ ...base, exp: 220, expRate: 0 }).secondsToReady, 100);
});

run('时间格式向上取整，任务状态在达标后立即可领取', () => {
  assert.equal(formatDuration(61), '2 分钟');
  assert.equal(formatDuration(3601), '1 小时 1 分钟');
  assert.equal(questStatus({ progress: 9, target: 10, claimed: false }), 'active');
  assert.equal(questStatus({ progress: 10, target: 10, claimed: false }), 'ready');
  assert.equal(questStatus({ progress: 15, target: 10, claimed: true }), 'claimed');
});
