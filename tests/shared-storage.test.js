const assert = require('node:assert/strict');
const { test } = require('node:test');
const { GameStorage } = require('../js/shared-storage.js');
const { createMemoryStorage, createScheduler } = require('./fixtures/shared-storage.js');

function setup(values) {
  const memory = createMemoryStorage(values);
  const timers = createScheduler();
  const errors = [];
  const storage = new GameStorage({ backend: memory.backend, schedule: timers.schedule,
    cancel: timers.cancel, delay: 300, reportError: (...args) => errors.push(args) });
  return { ...memory, timers, errors, storage };
}

test('待保存数据与读取结果均为快照，调用方修改对象不会绕过保存', () => {
  const { storage, data } = setup();
  const source = { values: [1], enabled: false };
  storage.set('save', source);
  source.values.push(2);
  const read = storage.get('save');
  read.values.push(3);
  assert.deepEqual(storage.get('save'), { values: [1], enabled: false });
  assert.equal(storage.flush(), true);
  assert.equal(data.get('save'), '{"values":[1],"enabled":false}');
  const fallback = { nested: {} };
  assert.notStrictEqual(storage.get('missing', fallback), fallback);
});

test('任意存储错误均保留 pending，防抖执行失败后仍可手动重试', () => {
  const { storage, timers, control, data, errors } = setup();
  storage.set('pending', { score: 4 });
  control.onWrite = () => { throw new Error('SecurityError'); };
  timers.runPending();
  assert.equal(data.has('pending'), false);
  assert.deepEqual(storage.get('pending'), { score: 4 });
  assert.equal(errors.length, 1);
  control.onWrite = null;
  assert.equal(storage.flush(), true);
  assert.equal(data.get('pending'), '{"score":4}');
});

test('立即保存失败也保留最新值，不会退回更早的待保存数据', () => {
  const { storage, control, data } = setup();
  storage.set('save', { score: 1 });
  control.onWrite = () => { throw new Error('QuotaExceededError'); };
  assert.equal(storage.setImmediate('save', { score: 9 }), false);
  assert.deepEqual(storage.get('save'), { score: 9 });
  control.onWrite = null;
  assert.equal(storage.flush(), true);
  assert.equal(data.get('save'), '{"score":9}');
});

test('事务写入失败恢复已写值，且原 pending 不受影响', () => {
  const { storage, control, data } = setup({ first: '{"score":1}', second: '0' });
  storage.set('first', { score: 2 });
  control.onWrite = key => { if (key === 'second') throw new Error('quota'); };
  assert.throws(() => storage.setManyImmediate({ first: { score: 8 }, second: 8 }), /已恢复/);
  assert.equal(data.get('first'), '{"score":1}');
  assert.equal(data.get('second'), '0');
  assert.deepEqual(storage.get('first'), { score: 2 });
  control.onWrite = null;
  storage.flush();
  assert.equal(data.get('first'), '{"score":2}');
});

test('事务回滚删除新建条目，序列化失败时不开始任何写入', () => {
  const { storage, control, data } = setup();
  control.onWrite = key => { if (key === 'second') throw new Error('quota'); };
  assert.throws(() => storage.setManyImmediate({ first: 1, second: 2 }), /已恢复/);
  assert.equal(data.size, 0);
  const circular = {};
  circular.self = circular;
  control.onWrite = null;
  const before = control.writes.length;
  assert.throws(() => storage.setManyImmediate({ first: 1, circular }), TypeError);
  assert.equal(control.writes.length, before);
});

test('回滚自身失败明确暴露 AggregateError，不声称已经恢复', () => {
  const { storage, control } = setup({ first: '0' });
  control.onWrite = (key, raw) => { if (key === 'second' || raw === '0') throw new Error('storage unavailable'); };
  assert.throws(() => storage.setManyImmediate({ first: 1, second: 2 }), error => {
    assert.ok(error instanceof AggregateError);
    assert.match(error.message, /回滚均失败/);
    assert.equal(error.errors.length, 2);
    return true;
  });
});

test('删除失败不会移除尚未落盘的数据', () => {
  const { storage, control } = setup();
  storage.set('save', 8);
  control.onRemove = () => { throw new Error('SecurityError'); };
  assert.throws(() => storage.remove('save'), /SecurityError/);
  assert.equal(storage.get('save'), 8);
});
