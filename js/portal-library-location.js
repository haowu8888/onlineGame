(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortalLibraryLocation = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const UPDATE_DELAY_MS = 250;

  function create({ location, history, events, schedule, cancel }) {
    let timer = null;
    let pending = null;
    function read() {
      const params = new URL(location.href).searchParams;
      return { query: params.get('q') ?? '', category: params.get('category') ?? 'all' };
    }
    function discard() {
      if (timer !== null) cancel(timer);
      timer = null;
      pending = null;
    }
    function flush() {
      if (!pending) return;
      const url = new URL(location.href);
      const { query, category } = pending;
      discard();
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
      if (category !== 'all') url.searchParams.set('category', category); else url.searchParams.delete('category');
      if (url.href !== location.href) history.replaceState(history.state, '', url.href);
    }
    function write(criteria) {
      discard();
      pending = { ...criteria };
      timer = schedule(flush, UPDATE_DELAY_MS);
    }
    function subscribe(restore) {
      events.addEventListener('popstate', () => { discard(); restore(read()); });
      events.addEventListener('pageshow', event => { if (event.persisted) restore(read()); });
      events.addEventListener('pagehide', flush);
      // 点击游戏前提交地址，浏览器返回才能恢复刚输入的关键词。
      events.addEventListener('click', event => {
        if (event.target.closest?.('a[href]')) flush();
      }, true);
    }
    return Object.freeze({ read, write, flush, subscribe });
  }

  return Object.freeze({ create });
});
