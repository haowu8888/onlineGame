(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GameScenes = factory().create();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function create() {
    let source = null;
    const listeners = new Set();

    function register(port) {
      if (source) throw new Error('游戏场景已注册：' + source.id);
      if (!port.id || typeof port.read !== 'function' || typeof port.act !== 'function') {
        throw new TypeError('场景需要游戏标识、状态读取和操作入口');
      }
      source = Object.freeze({ ...port });
      listeners.forEach(listener => listener(source));
    }

    function subscribe(listener) {
      listeners.add(listener);
      if (source) listener(source);
      return () => listeners.delete(listener);
    }

    return Object.freeze({ register, subscribe });
  }

  return Object.freeze({ create });
});
