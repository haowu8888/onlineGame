(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CultivationRecovery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function normalizeNumber(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function useRecoverItem(options) {
    const count = normalizeNumber(options?.count);
    const current = normalizeNumber(options?.current);
    const max = normalizeNumber(options?.max);
    const ratio = normalizeNumber(options?.ratio);
    const baseGain = Math.floor(max * ratio);
    const missing = Math.max(0, max - current);
    const gain = Math.min(missing, Math.max(0, baseGain));

    if (count <= 0 || gain <= 0) {
      return { ok: false, count, gain: 0, value: current };
    }

    return {
      ok: true,
      count: count - 1,
      gain,
      value: current + gain,
    };
  }

  return { useRecoverItem };
});
