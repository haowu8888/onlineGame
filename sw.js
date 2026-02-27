// 仙界游坊 Service Worker - 离线缓存 / PWA 增强
// 注意：更新此文件时请同步更新 CACHE_VERSION，确保老缓存能被正确清理。
const CACHE_VERSION = 'v5';
const CACHE_NAME = `xianjieyoufang-${CACHE_VERSION}`;
const RUNTIME_CACHE = `xianjieyoufang-runtime-${CACHE_VERSION}`;
const CDN_CACHE = `xianjieyoufang-cdn-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';

const CDN_HOST_ALLOWLIST = new Set([
  'cdn.jsdelivr.net',
]);

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  OFFLINE_URL,
  './css/shared.css',
  './css/portal.css',
  './js/shared.js',
  './js/portal.js',
  './games/cultivation.html',
  './games/lifesim.html',
  './games/guigu.html',
  './games/knife.html',
  './games/cardtower.html',
  './games/cardbattle.html',
  './games/cardcollect.html',
  './css/cultivation.css',
  './css/lifesim.css',
  './css/guigu.css',
  './css/knife.css',
  './css/cardtower.css',
  './css/cardbattle.css',
  './css/cardcollect.css',
  './js/cultivation.js',
  './js/lifesim.js',
  './js/guigu.js',
  './js/knife.js',
  './js/cardtower.js',
  './js/cardbattle.js',
  './js/cardcollect.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  // 字体 CSS（CDN）：不强制，失败不影响安装；但首次在线访问后可离线复用
  'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css',
];

async function precacheAll(cache) {
  const results = await Promise.allSettled(
    STATIC_ASSETS.map(async (asset) => {
      try {
        const req = new Request(asset, { cache: 'reload' });
        const res = await fetch(req);
        if (!res || !(res.ok || res.type === 'opaque')) throw new Error('bad response');
        await cache.put(req, res);
        return true;
      } catch {
        return false;
      }
    })
  );
  const okCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  return okCount;
}

// 安装：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await precacheAll(cache);
    await self.skipWaiting();
  })());
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => !key.includes(CACHE_VERSION))
        .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// 允许页面主动触发更新（可选）
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 请求拦截：根据资源类型选择策略
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCdnAllowed = CDN_HOST_ALLOWLIST.has(url.hostname);
  const isHtml = event.request.destination === 'document' || url.pathname.endsWith('.html');

  // CDN（字体等）：缓存优先 + 后台更新（允许离线复用已访问过的资源）
  if (!isSameOrigin && isCdnAllowed) {
    event.respondWith((async () => {
      const cache = await caches.open(CDN_CACHE);
      // 允许命中预缓存（可能在其它 cache 中）
      const cached = await caches.match(event.request);
      const fetchPromise = fetch(event.request).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(event.request, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await fetchPromise) || cached;
    })());
    return;
  }

  // 非同源且不在白名单：放行
  if (!isSameOrigin) return;

  // HTML：网络优先，失败回退缓存/离线页
  if (isHtml) {
    event.respondWith((async () => {
      try {
        const res = await fetch(event.request);
        if (res && res.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(event.request, res.clone());
        }
        return res;
      } catch {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const offline = await caches.match(OFFLINE_URL);
        return offline || (await caches.match('./index.html')) || new Response('离线不可用', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
    return;
  }

  // 其它同源资源：缓存优先 + 后台更新
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    const fetchPromise = fetch(event.request).then(async (res) => {
      if (res && res.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(event.request, res.clone());
      }
      return res;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(fetchPromise);
      return cached;
    }
    return (await fetchPromise) || cached || new Response('', { status: 504 });
  })());
});
