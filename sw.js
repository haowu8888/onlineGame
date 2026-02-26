// 仙界游坊 Service Worker - 离线缓存
const CACHE_NAME = 'xianjieyoufang-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
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
];

// 安装：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：根据资源类型选择策略
self.addEventListener('fetch', (event) => {
  // 只处理同源 GET 请求
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML文档：网络优先，离线时回退缓存
  if (event.request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // JS/CSS等静态资源：缓存优先 + 后台更新
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 后台发起网络请求更新缓存（Stale While Revalidate）
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      // 有缓存则立即返回，同时后台更新
      if (cached) return cached;
      // 无缓存则等待网络响应
      return fetchPromise;
    })
  );
});
