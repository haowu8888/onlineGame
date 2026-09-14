const DAILY_MISSION_CONFIG = Object.freeze({
  count: 4,
  multiplier: 1103515245,
  increment: 12345,
  mask: 0x7fffffff,
  yearScale: 10000,
  monthScale: 100,
});

function dailySeed() {
  const today = new Date();
  return today.getFullYear() * DAILY_MISSION_CONFIG.yearScale
    + (today.getMonth() + 1) * DAILY_MISSION_CONFIG.monthScale + today.getDate();
}

function selectDailyMissions(seed) {
  let state = seed;
  const candidates = [...SHARED_MISSION_TEMPLATES];
  for (let index = candidates.length - 1; index > 0; index--) {
    state = (state * DAILY_MISSION_CONFIG.multiplier + DAILY_MISSION_CONFIG.increment) & DAILY_MISSION_CONFIG.mask;
    const swapIndex = Math.floor(state / DAILY_MISSION_CONFIG.mask * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  const unique = new Map();
  for (const mission of candidates) {
    if (!unique.has(mission.game)) unique.set(mission.game, { ...mission });
    if (unique.size === DAILY_MISSION_CONFIG.count) break;
  }
  return [...unique.values()];
}

function missionProgress(mission, daily, stats) {
  const baseline = daily.baselines?.[mission.statKey] ?? 0;
  const current = stats[mission.statKey] ?? 0;
  return DailyMissions.isMaxLikeStat(mission.statKey) ? current : current - baseline;
}

window.DailyMissions = {
  DAILY_KEY: 'daily_missions',
  isMaxLikeStat(statKey) {
    return statKey.includes('max_') || statKey.includes('_gold')
      || statKey.includes('_best') || statKey === 'lifesim_minigame_score';
  },
  getOrCreateToday() {
    const seed = dailySeed();
    const saved = Storage.get(this.DAILY_KEY, {});
    if (saved.seed === String(seed) && Array.isArray(saved.missions)) return saved;
    const missions = selectDailyMissions(seed);
    const stats = Storage.get('cross_game_stats', {});
    const baselines = Object.fromEntries(missions.map(item => [item.statKey, stats[item.statKey] ?? 0]));
    const daily = { seed: String(seed), missions, baselines, claimed: [] };
    Storage.set(this.DAILY_KEY, daily);
    return daily;
  },
  getProgress(mission, dailyData) {
    return missionProgress(mission, dailyData ?? this.getOrCreateToday(), Storage.get('cross_game_stats', {}));
  },
  claim(index) {
    const daily = this.getOrCreateToday();
    if (!Number.isInteger(index) || !daily.missions[index]) return { ok: false, reason: 'bad_index' };
    const claimed = daily.claimed ?? [];
    if (claimed.includes(index)) return { ok: false, reason: 'claimed' };
    const mission = daily.missions[index];
    const stats = Storage.get('cross_game_stats', {});
    if (missionProgress(mission, daily, stats) < mission.target) return { ok: false, reason: 'not_done' };
    const points = (stats.xianyuan_points ?? 0) + mission.reward;
    const nextDaily = { ...daily, claimed: [...claimed, index] };
    Storage.setManyImmediate({ [this.DAILY_KEY]: nextDaily, cross_game_stats: { ...stats, xianyuan_points: points } });
    window.dispatchEvent(new CustomEvent('daily-missions-updated'));
    return { ok: true, reward: mission.reward, points };
  },
  getClaimableCount(filterGame) {
    const daily = this.getOrCreateToday();
    const claimed = new Set(daily.claimed ?? []);
    const stats = Storage.get('cross_game_stats', {});
    return daily.missions.filter((mission, index) => (!filterGame || mission.game === filterGame)
      && !claimed.has(index) && missionProgress(mission, daily, stats) >= mission.target).length;
  },
};
