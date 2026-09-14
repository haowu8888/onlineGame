const { loadESModule } = require('./esm-loader.js');
const { createSharedRuntime } = require('../fixtures/shared-runtime.js');

function seededRandom(seed = 17) {
  let state = seed;
  return () => {
    state = Math.imul(state, 1664525) + 1013904223 | 0;
    return (state >>> 0) / 0x100000000;
  };
}

async function createKnifeRuntime(initial, options = {}) {
  const runtime = createSharedRuntime(initial);
  const { api } = runtime;
  const module = await loadESModule('js/knife-game.js', {
    Storage: api.Storage, CrossGameAchievements: api.CrossGameAchievements,
    CrossGameRewards: api.CrossGameRewards, SoundManager: api.SoundManager,
    showToast: runtime.context.showToast,
  });
  const game = new module.namespace.Game({ random: seededRandom(), ...options });
  return { ...runtime, ...module.namespace, game };
}

module.exports = { createKnifeRuntime };
