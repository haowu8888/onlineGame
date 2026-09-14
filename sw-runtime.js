class PwaRuntime {
  constructor({ assets, baseUrl, cacheStorage, fetchResource, logger, scopeUrl, version }) {
    this.assets = assets;
    this.baseUrl = baseUrl;
    this.origin = new URL(baseUrl).origin;
    this.cacheStorage = cacheStorage;
    this.fetchResource = fetchResource;
    this.logger = logger;
    this.scopeUrl = scopeUrl;
    this.cachePrefix = 'xianjieyoufang-';
    this.cacheNames = Object.freeze({
      static: `${this.cachePrefix}${version}`,
      runtime: `${this.cachePrefix}runtime-${version}`,
      cdn: `${this.cachePrefix}cdn-${version}`,
    });
  }

  async install() {
    const existingNames = await this.cacheStorage.keys();
    const cache = await this.cacheStorage.open(this.cacheNames.static);
    const requests = this.assets.core.map((asset) => new Request(
      new URL(asset, this.baseUrl), { cache: 'reload' }
    ));
    try {
      // Cache.addAll 以一个事务写入全部核心资源，任何失败均使安装失败。
      await cache.addAll(requests);
    } catch (error) {
      if (!existingNames.includes(this.cacheNames.static)) {
        await this.cacheStorage.delete(this.cacheNames.static);
      }
      this.logger.error('[SW] 核心资源预缓存失败，新版本未安装。', error);
      throw error;
    }
  }

  async activate() {
    const validNames = new Set(Object.values(this.cacheNames));
    const existingNames = await this.cacheStorage.keys();
    const obsoleteNames = existingNames.filter((name) => (
      name.startsWith(this.cachePrefix) && !validNames.has(name)
    ));
    await Promise.all(obsoleteNames.map((name) => this.cacheStorage.delete(name)));
  }

  createFetchTask(request) {
    if (request.method !== 'GET') return null;
    const url = new URL(request.url);
    const sameOrigin = url.origin === this.origin;
    if (!sameOrigin && !this.assets.allowedCdnHosts.includes(url.hostname)) return null;
    const cacheName = sameOrigin ? this.cacheNames.runtime : this.cacheNames.cdn;
    const network = this.fetchResource(request);
    const isDocument = sameOrigin && (
      request.mode === 'navigate' || request.destination === 'document' ||
      url.pathname.endsWith('.html')
    );
    const response = isDocument
      ? this.navigationResponse({ request, network })
      : this.cachedResponse({ request, network, cacheName });
    const completed = this.persistResponse({ request, network, cacheName });
    return { response, completed };
  }

  async persistResponse({ request, network, cacheName }) {
    let response;
    try {
      response = await network;
    } catch (error) {
      this.logger.warn(`[SW] 网络请求失败：${request.url}`, error);
      return;
    }
    if (!(response.ok || response.type === 'opaque')) return;
    const cachedResponse = response.clone();
    const cache = await this.cacheStorage.open(cacheName);
    await cache.put(request, cachedResponse);
  }

  async matchCache(cacheName, request) {
    const cache = await this.cacheStorage.open(cacheName);
    return cache.match(request);
  }

  async latestCached(request) {
    const recent = await this.matchCache(this.cacheNames.runtime, request);
    return recent || this.matchCache(this.cacheNames.static, request);
  }

  async navigationResponse({ request, network }) {
    try {
      return await network;
    } catch (error) {
      const cached = await this.latestCached(request);
      if (cached) return cached;
      const offline = await this.buildOfflineResponse();
      if (offline) return offline;
      throw error;
    }
  }

  async buildOfflineResponse() {
    const offlineUrl = new URL(this.assets.offlineUrl, this.baseUrl).href;
    const offline = await this.matchCache(this.cacheNames.static, offlineUrl);
    if (!offline) return null;
    const html = await offline.text();
    const scope = this.scopeUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const withBase = html.replace(/<head\b[^>]*>/i, (tag) => `${tag}<base href="${scope}">`);
    if (withBase === html) throw new Error('离线页面缺少 head，无法设置资源根目录。');
    return new Response(withBase, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  async cachedResponse({ request, network, cacheName }) {
    const cached = cacheName === this.cacheNames.runtime
      ? await this.latestCached(request)
      : await this.matchCache(cacheName, request);
    return cached || network;
  }
}
