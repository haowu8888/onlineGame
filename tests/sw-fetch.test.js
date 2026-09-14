const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkerHarness, SCOPE_URL } = require('./helpers/sw-harness.js');

const TEST_TIMEOUT_MS = 60000;

function offline() {
  return Promise.reject(new Error('network offline'));
}

async function putText(worker, options) {
  const cache = await worker.cacheStorage.open(options.cacheName);
  await cache.put(worker.request(options.path), new Response(options.text));
}

test('断网时读取最近成功访问的 HTML，而非安装时的旧页面', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness();
  await worker.dispatch('install').completed;
  worker.setFetch(async () => new Response('latest html'));
  const request = worker.request('games/cultivation.html', { document: true });
  const online = worker.dispatch('fetch', { request });
  assert.equal(await (await online.response).text(), 'latest html');
  await online.completed;
  worker.setFetch(offline);

  const cached = worker.dispatch('fetch', { request });

  assert.equal(await (await cached.response).text(), 'latest html');
  await cached.completed;
  assert.equal(worker.state.warnings.length, 1);
});

test('HTTP 错误原样返回，不覆盖之前成功缓存的 HTML', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness();
  const request = worker.request('index.html', { document: true });
  await putText(worker, { cacheName: worker.names.runtime, path: 'index.html', text: 'good html' });
  worker.setFetch(async () => new Response('server error', { status: 503 }));
  const failed = worker.dispatch('fetch', { request });
  assert.equal((await failed.response).status, 503);
  await failed.completed;
  worker.setFetch(offline);

  const cached = worker.dispatch('fetch', { request });

  assert.equal(await (await cached.response).text(), 'good html');
  await cached.completed;
});

test('嵌套路径的离线页注入站点作用域 base，资源和返回链接仍指向站点根', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness();
  await worker.dispatch('install').completed;
  worker.setFetch(offline);
  const event = worker.dispatch('fetch', {
    request: worker.request('games/not-cached/deep.html', { document: true }),
  });
  const response = await event.response;
  const html = await response.text();

  assert.ok(html.includes('<head><base href="' + SCOPE_URL + '">'));
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(new URL('./games/knife.html', SCOPE_URL).href, SCOPE_URL + 'games/knife.html');
  await event.completed;
});

test('缓存资源立即返回，后台更新由 waitUntil 持续到写入完成', { timeout: TEST_TIMEOUT_MS }, async () => {
  let finishFetch;
  const network = new Promise((resolve) => { finishFetch = resolve; });
  const worker = createWorkerHarness({ fetchResource: () => network });
  const request = worker.request('js/shared.js');
  await putText(worker, { cacheName: worker.names.static, path: 'js/shared.js', text: 'cached asset' });
  const event = worker.dispatch('fetch', { request });
  let completed = false;
  event.completed.then(() => { completed = true; });

  assert.equal(await (await event.response).text(), 'cached asset');
  assert.equal(completed, false);
  finishFetch(new Response('updated asset'));
  await event.completed;

  const cache = await worker.cacheStorage.open(worker.names.runtime);
  assert.equal(await (await cache.match(request)).text(), 'updated asset');
});

test('缓存写入错误明确拒绝后台任务，成功网络响应仍交付页面', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness({
    beforeWrite() { throw new Error('disk quota exceeded'); },
    fetchResource: async () => new Response('network html'),
  });
  const event = worker.dispatch('fetch', {
    request: worker.request('index.html', { document: true }),
  });
  const rejected = assert.rejects(event.completed, /disk quota exceeded/);

  assert.equal(await (await event.response).text(), 'network html');
  await rejected;
});

test('白名单 CDN 可以离线命中；无缓存的失败请求保留真实错误', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness();
  const request = worker.request('https://cdn.jsdelivr.net/font.woff2');
  const fetched = worker.dispatch('fetch', { request });
  await fetched.response;
  await fetched.completed;
  worker.setFetch(offline);
  const cached = worker.dispatch('fetch', { request });
  assert.equal(await (await cached.response).text(), request.url);
  await cached.completed;

  const missing = worker.dispatch('fetch', {
    request: worker.request('https://cdn.jsdelivr.net/missing.woff2'),
  });
  await assert.rejects(missing.response, /network offline/);
  await missing.completed;
});

test('非 GET 和白名单外跨域请求由浏览器处理', { timeout: TEST_TIMEOUT_MS }, async () => {
  const worker = createWorkerHarness();
  const requests = [
    worker.request('api/save', { method: 'POST' }),
    worker.request('https://other.example/asset.js'),
  ];
  for (const request of requests) {
    const event = worker.dispatch('fetch', { request });
    assert.equal(event.response, undefined);
    await event.completed;
  }
  assert.equal(worker.state.requests.length, 0);
});
