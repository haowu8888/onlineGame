const assert = require('node:assert/strict');
const { test } = require('node:test');
const { create } = require('../js/portal-library-location');
const { createScheduler } = require('./fixtures/shared-storage');

test('地址同步保存调用时的快照，对特殊字符编码；相同地址不重复写历史', () => {
  const timers = createScheduler();
  const location = { href: 'https://example.test/app/#hall' };
  let writes = 0;
  const navigation = create({
    location, history: { state: null, replaceState(state, title, href) { location.href = href; writes++; } },
    events: { addEventListener() {} }, schedule: timers.schedule, cancel: timers.cancel,
  });
  const criteria = { query: '仙 & 卡+#?', category: 'cards' };
  navigation.write(criteria);
  criteria.query = '随后修改的对象';
  navigation.flush();
  assert.deepEqual(navigation.read(), { query: '仙 & 卡+#?', category: 'cards' });
  assert.equal(new URL(location.href).hash, '#hall');
  assert.equal(timers.pending.size, 0);
  navigation.write(navigation.read());
  timers.runPending();
  assert.equal(writes, 1);
});

test('从浏览器页面缓存恢复时重读当前地址，恢复回调不会产生新历史', () => {
  const callbacks = new Map();
  const timers = createScheduler();
  const location = { href: 'https://example.test/app/' };
  const navigation = create({
    location, history: { replaceState() { assert.fail('不应改写历史'); } },
    events: { addEventListener(type, callback) { callbacks.set(type, callback); } },
    schedule: timers.schedule, cancel: timers.cancel,
  });
  const restored = [];
  navigation.subscribe(value => restored.push(value));
  callbacks.get('pageshow')({ persisted: false });
  assert.equal(restored.length, 0);
  location.href = 'https://example.test/app/?q=仙卡&category=growth';
  callbacks.get('pageshow')({ persisted: true });
  assert.deepEqual(restored, [{ query: '仙卡', category: 'growth' }]);
});
