(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CultivationFocus = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const PERCENT = 100;
  const SECONDS_PER_MINUTE = 60;
  const MINUTES_PER_HOUR = 60;

  function progress(current, required) {
    if (required === 0) return PERCENT;
    return Math.min(PERCENT, Math.max(0, current / required * PERCENT));
  }

  function secondsFor(missing, rate) {
    if (missing === 0) return 0;
    return rate > 0 ? Math.ceil(missing / rate) : null;
  }

  function getGoal(options) {
    const { exp, insight, expRate, insightRate, nextRealm, insightRequired, meditating } = options;
    const expRequired = nextRealm ? nextRealm.expReq : 0;
    const expMissing = Math.max(0, expRequired - exp);
    const insightMissing = Math.max(0, insightRequired - insight);
    const expSeconds = secondsFor(expMissing, expRate);
    const insightSeconds = secondsFor(insightMissing, insightRate);
    const ready = nextRealm !== null && expMissing === 0 && insightMissing === 0;
    const estimable = expSeconds !== null && insightSeconds !== null;
    return {
      exp, expRequired, expMissing, insight, insightRequired, insightMissing,
      expProgress: progress(exp, expRequired),
      insightProgress: progress(insight, insightRequired),
      secondsToReady: estimable ? Math.max(expSeconds, insightSeconds) : null,
      nextRealmName: nextRealm ? nextRealm.name : '道行圆满',
      ready, complete: nextRealm === null, meditating,
    };
  }

  function formatDuration(seconds) {
    if (seconds === null) return '当前速度无法达成';
    if (seconds < SECONDS_PER_MINUTE) return `${seconds} 秒`;
    const minutes = Math.ceil(seconds / SECONDS_PER_MINUTE);
    if (minutes < MINUTES_PER_HOUR) return `${minutes} 分钟`;
    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    const remaining = minutes % MINUTES_PER_HOUR;
    return `${hours} 小时${remaining ? ` ${remaining} 分钟` : ''}`;
  }

  function questStatus(quest) {
    if (quest.claimed) return 'claimed';
    return quest.progress >= quest.target ? 'ready' : 'active';
  }

  return { getGoal, formatDuration, questStatus };
});
