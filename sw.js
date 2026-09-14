// 每次发布缓存资源时递增版本；新版本安装完成后等待用户确认或旧页面关闭。
importScripts('./sw-assets.js', './sw-runtime.js');

const CACHE_VERSION = 'v33';
const pwaRuntime = new PwaRuntime({
  assets: PWA_ASSETS,
  baseUrl: self.location.href,
  cacheStorage: caches,
  fetchResource: self.fetch.bind(self),
  logger: console,
  scopeUrl: self.registration.scope,
  version: CACHE_VERSION,
});

self.addEventListener('install', (event) => {
  event.waitUntil(pwaRuntime.install());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(pwaRuntime.activate().then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  const task = pwaRuntime.createFetchTask(event.request);
  if (!task) return;
  event.respondWith(task.response);
  event.waitUntil(task.completed);
});
