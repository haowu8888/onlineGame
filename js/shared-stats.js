/* 始终从 Storage 的最新快照读取，避免旧成就缓存覆盖仙缘结算。 */
window.CrossGameAchievements = {
  ACHIEVEMENTS: SHARED_ACHIEVEMENTS,
  trackStat(key, value) {
    const stats = Storage.get('cross_game_stats', {});
    const nextValue = typeof value === 'number' ? Math.max(stats[key] ?? 0, value) : value;
    Storage.set('cross_game_stats', { ...stats, [key]: nextValue });
  },
  checkNew() {
    const stats = Storage.get('cross_game_stats', {});
    const unlocked = Storage.get('cross_game_achievements', []);
    const known = new Set(unlocked);
    const additions = SHARED_ACHIEVEMENTS.filter(item => !known.has(item.id) && item.check(stats));
    if (additions.length) {
      Storage.set('cross_game_achievements', [...unlocked, ...additions.map(item => item.id)]);
    }
    return additions;
  },
  getAll() {
    const unlocked = new Set(Storage.get('cross_game_achievements', []));
    return SHARED_ACHIEVEMENTS.map(item => ({ ...item, unlocked: unlocked.has(item.id) }));
  },
  getUnlockedCount() {
    return Storage.get('cross_game_achievements', []).length;
  },
};

window.CrossGameRewards = {
  REWARDS: SHARED_REWARDS,
  getRewardsForGame(gameKey) {
    const stats = Storage.get('cross_game_stats', {});
    const claimed = Storage.get('cross_game_rewards_claimed', []);
    return SHARED_REWARDS.filter(item => item.targetGame === gameKey).map(item => ({
      ...item, eligible: item.condition(stats), claimed: claimed.includes(item.id),
    }));
  },
  claimReward(id) {
    const claimed = Storage.get('cross_game_rewards_claimed', []);
    if (!claimed.includes(id)) Storage.set('cross_game_rewards_claimed', [...claimed, id]);
  },
  getActiveRewards(gameKey) {
    const stats = Storage.get('cross_game_stats', {});
    const claimed = Storage.get('cross_game_rewards_claimed', []);
    return SHARED_REWARDS.filter(item => item.targetGame === gameKey && item.condition(stats) && claimed.includes(item.id));
  },
  checkAndClaim(gameKey) {
    const additions = this.getRewardsForGame(gameKey).filter(item => item.eligible && !item.claimed);
    if (!additions.length) return additions;
    const claimed = Storage.get('cross_game_rewards_claimed', []);
    Storage.set('cross_game_rewards_claimed', [...claimed, ...additions.map(item => item.id)]);
    return additions;
  },
  revalidateClaimed(gameKey) {
    const stats = Storage.get('cross_game_stats', {});
    const claimed = Storage.get('cross_game_rewards_claimed', []);
    const revoked = SHARED_REWARDS.filter(item => item.targetGame === gameKey && claimed.includes(item.id) && !item.condition(stats));
    if (!revoked.length) return revoked;
    const removed = new Set(revoked.map(item => item.id));
    Storage.set('cross_game_rewards_claimed', claimed.filter(id => !removed.has(id)));
    return revoked;
  },
  getUnclaimedCount(gameKey) {
    return this.getRewardsForGame(gameKey).filter(item => item.eligible && !item.claimed).length;
  },
};
