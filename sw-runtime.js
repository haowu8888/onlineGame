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
    const isDocument = sameOrigin && (
      request.mode === 'navigate' || request.destination === 'document' ||
      url.pathname.endsWith('.html')
    );
    if (!isDocument && sameOrigin && url.searchParams.has('v')) return this.versionedTask({ request, cacheName });
    return this.revalidatingTask({ request, cacheName, isDocument });
  }

  revalidatingTask({ request, cacheName, isDocument }) {
    const network = this.fetchResource(request);
    const response = isDocument
      ? this.navigationResponse({ request, network })
      : this.cachedResponse({ request, network, cacheName });
    const completed = this.persistResponse({ request, network, cacheName });
    return { response, completed };
  }

  // 带版本号的本地资源在安装时整体预缓存，只随版本号更新；命中静态缓存就不再回源核对，
  // 打开一个页面省下上百次后台请求。尚未预缓存的版本资源仍按原策略取网络并写入运行缓存。
  versionedTask({ request, cacheName }) {
    const cached = this.matchCache(this.cacheNames.static, request);
    const fallback = cached.then((hit) => (hit ? null : this.revalidatingTask({ request, cacheName, isDocument: false })));
    return {
      response: fallback.then((task) => (task ? task.response : cached)),
      completed: fallback.then((task) => (task ? task.completed : undefined)),
    };
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
      const cached = await this.latestCached(request) || await this.cachedPortal(request);
      if (cached) return cached;
      const offline = await this.buildOfflineResponse();
      if (offline) return offline;
      throw error;
    }
  }

  // q/category 只控制首页的客户端筛选；离线分享链接复用首页，保留其他查询参数的缓存语义。
  async cachedPortal(request) {
    const url = new URL(request.url);
    const scope = new URL(this.scopeUrl);
    const isPortal = url.pathname === scope.pathname || url.pathname === new URL('index.html', scope).pathname;
    if (!isPortal || (!url.searchParams.has('q') && !url.searchParams.has('category'))) return null;
    url.searchParams.delete('q');
    url.searchParams.delete('category');
    return this.latestCached(url.href);
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
