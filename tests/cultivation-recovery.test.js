const assert = require('node:assert/strict');

const { useRecoverItem } = require('../js/cultivation-recovery.js');

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('满状态时不会消耗大还丹', () => {
  const result = useRecoverItem({
    count: 2,
    current: 120,
    max: 120,
    ratio: 0.7,
  });

  assert.equal(result.ok, false);
  assert.equal(result.count, 2);
  assert.equal(result.gain, 0);
});

run('未满状态时会恢复并消耗丹药', () => {
  const result = useRecoverItem({
    count: 3,
    current: 40,
    max: 100,
    ratio: 0.5,
  });

  assert.equal(result.ok, true);
  assert.equal(result.count, 2);
  assert.equal(result.gain, 50);
  assert.equal(result.value, 90);
});
