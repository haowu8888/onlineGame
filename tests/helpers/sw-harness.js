const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const SCOPE_URL = 'https://example.test/app/';

function cacheKey(request) {
  return typeof request === 'string' ? new URL(request, SCOPE_URL).href : request.url;
}

class MemoryCache {
  constructor({ fetchResource, beforeWrite }) {
    this.entries = new Map();
    this.fetchResource = fetchResource;
    this.beforeWrite = beforeWrite;
  }

  async match(request) {
    return this.entries.get(cacheKey(request))?.clone();
  }

  async put(request, response) {
    await this.beforeWrite(request);
    this.entries.set(cacheKey(request), response.clone());
  }

  async addAll(requests) {
    const batch = await Promise.all(requests.map(async (request) => {
      const response = await this.fetchResource(request);
      if (!response.ok) throw new Error('Precache request failed: ' + request.url);
      await this.beforeWrite(request);
      return [cacheKey(request), response.clone()];
    }));
    for (const [key, response] of batch) this.entries.set(key, response);
  }
}

function createCacheStorage(options) {
  const entries = new Map();
  return {
    entries,
    async keys() { return [...entries.keys()]; },
    async open(name) {
      if (!entries.has(name)) entries.set(name, new MemoryCache(options));
      return entries.get(name);
    },
    async delete(name) { return entries.delete(name); },
  };
}

function defaultResponse(request) {
  if (request.url.endsWith('/offline.html')) {
    return new Response('<html><head><title>Offline</title></head><body>offline</body></html>');
  }
  return new Response(request.url);
}

function createEnvironment({ callbacks, state, fetchResource }) {
  return {
    location: new URL('sw.js', SCOPE_URL),
    registration: { scope: SCOPE_URL },
    fetch: fetchResource,
    clients: { async claim() { state.claimed += 1; } },
    async skipWaiting() { state.skipped += 1; },
    addEventListener(type, callback) { callbacks.set(type, callback); },
  };
}

function dispatchEvent(callbacks, type, detail = {}) {
  const pending = [];
  let response;
  callbacks.get(type)({
    ...detail,
    waitUntil(promise) { pending.push(promise); },
    respondWith(promise) { response = promise; },
  });
  return { response, completed: Promise.all(pending) };
}

function createWorkerHarness(options = {}) {
  const state = { claimed: 0, skipped: 0, requests: [], warnings: [], errors: [] };
  const callbacks = new Map();
  let implementation = options.fetchResource || defaultResponse;
  const fetchResource = async (request) => {
    state.requests.push(request);
    return implementation(request);
  };
  const cacheStorage = createCacheStorage({
    fetchResource,
    beforeWrite: options.beforeWrite || (() => {}),
  });
  const self = createEnvironment({ callbacks, state, fetchResource });
  const context = vm.createContext({
    self, caches: cacheStorage, Request, Response, URL, Set,
    console: {
      warn(...args) { state.warnings.push(args); },
      error(...args) { state.errors.push(args); },
    },
    importScripts(...names) {
      for (const name of names) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, name), 'utf8'), context, { filename: name });
      }
    },
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), context, { filename: 'sw.js' });
  const config = vm.runInContext('({ names: pwaRuntime.cacheNames, assets: PWA_ASSETS })', context);
  return {
    ...config, state, cacheStorage,
    dispatch(type, detail) { return dispatchEvent(callbacks, type, detail); },
    setFetch(next) { implementation = next; },
    request(relative, options = {}) {
      const request = new Request(new URL(relative, SCOPE_URL), options);
      if (options.document) Object.defineProperty(request, 'destination', { value: 'document' });
      return request;
    },
  };
}

module.exports = { createWorkerHarness, SCOPE_URL };
