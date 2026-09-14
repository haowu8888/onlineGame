const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkerHarness } = require('./helpers/sw-harness.js');

const TEST_TIMEOUT_MS = 60000;

test('核心资源全部安装成功后仍等待用户确认，不抢占现有游戏', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness();
  const old = await worker.cacheStorage.open('xianjieyoufang-v29');
  await old.put(worker.request('index.html'), new Response('old version'));

  await worker.dispatch('install').completed;

  const cache = await worker.cacheStorage.open(worker.names.static);
  assert.equal(cache.entries.size, worker.assets.core.length);
  assert.equal(worker.state.skipped, 0);
  assert.equal(worker.state.claimed, 0);
  assert.equal(worker.cacheStorage.entries.has('xianjieyoufang-v29'), true);
  assert.ok(worker.state.requests.every((request) => request.cache === 'reload'));
  assert.ok(worker.state.requests.every((request) => request.url.startsWith('https://example.test/')));
});

test('核心资源请求失败会拒绝安装并保留旧缓存', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness({
    fetchResource(request) {
      if (new URL(request.url).pathname.endsWith('/cultivation-recovery.js')) throw new Error('network disconnected');
      return new Response('new version');
    },
  });
  const old = await worker.cacheStorage.open('xianjieyoufang-v29');
  await old.put(worker.request('index.html'), new Response('old version'));

  await assert.rejects(worker.dispatch('install').completed, /network disconnected/);

  assert.equal(await (await old.match(worker.request('index.html'))).text(), 'old version');
  assert.equal(worker.cacheStorage.entries.has(worker.names.static), false);
  assert.equal(worker.state.skipped, 0);
  assert.equal(worker.state.claimed, 0);
  assert.equal(worker.state.errors.length, 1);
});

test('核心资源 HTTP 错误不会提交半套缓存或删掉同名完整缓存', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness({
    fetchResource: async () => new Response('missing', { status: 404 }),
  });
  const current = await worker.cacheStorage.open(worker.names.static);
  await current.put(worker.request('index.html'), new Response('complete version'));

  await assert.rejects(worker.dispatch('install').completed, /Precache request failed/);

  assert.equal(current.entries.size, 1);
  assert.equal(await (await current.match(worker.request('index.html'))).text(), 'complete version');
});

test('只有明确更新消息触发 skipWaiting，激活只清除本站旧缓存', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness();
  await worker.cacheStorage.open('xianjieyoufang-v29');
  await worker.cacheStorage.open('xianjieyoufang-runtime-v29');
  await worker.cacheStorage.open('unrelated-cache');
  await worker.dispatch('install').completed;
  await worker.dispatch('message', { data: 'unrelated-message' }).completed;
  assert.equal(worker.state.skipped, 0);

  await worker.dispatch('message', { data: 'SKIP_WAITING' }).completed;
  assert.equal(worker.state.skipped, 1);
  await worker.dispatch('activate').completed;

  assert.equal(worker.state.claimed, 1);
  assert.deepEqual(
    (await worker.cacheStorage.keys()).sort(),
    [worker.names.static, 'unrelated-cache'].sort()
  );
});

test('字体 CDN 不属于安装事务，CDN 不可达不会破坏核心离线缓存', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness({
    fetchResource(request) {
      if (new URL(request.url).hostname === 'cdn.jsdelivr.net') throw new Error('CDN offline');
      return new Response('local asset');
    },
  });
  await worker.dispatch('install').completed;
  assert.equal(worker.state.requests.length, worker.assets.core.length);
  assert.equal(worker.state.errors.length, 0);
});
