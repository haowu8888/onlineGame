'use strict';
{
  const REALMS = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘', '飞升'];
  const GAME_KEYS = ['cultivation', 'lifesim', 'guigu', 'knife', 'cardtower', 'cardbattle', 'cardcollect'];
  const STAT_WEIGHTS = {
    cultivation_max_realm: 100, cultivation_kills: 2, lifesim_max_age: 3,
    guigu_kills: 3, guigu_explored: 2, cardcollect_cards: 5,
  };
  const POWER_WEIGHTS = { knifeWave: 10, knifeGame: 5, towerScoreDivisor: 10, cardbattle: 50, chapter: 20, achievement: 30, game: 20 };
  const ACHIEVEMENT_TOAST_MS = 4000;
  const PERCENT = 100;

  function firstSave(storage, prefix, slots) {
    return slots.map(slot => storage.get(prefix + slot)).find(Boolean) ?? null;
  }

  function readSnapshot(context) {
    const { storage, achievements } = context;
    const stats = storage.get('cross_game_stats', {});
    return {
      stats,
      knife: storage.get('knife_meta_progress', {}),
      tower: storage.get('leaderboard_cardtower', []),
      cultivation: firstSave(storage, 'cultivation_save_', [1, 2, 3]),
      collection: storage.get('cardcollect_save'),
      cardbattle: storage.get('cardbattle_unlocked', 0),
      achieveCount: achievements.getUnlockedCount(),
      gamesPlayed: GAME_KEYS.filter(key => stats['games_played_' + key]).length,
    };
  }

  function calculatePower(snapshot) {
    const statsPower = Object.entries(STAT_WEIGHTS).reduce(
      (sum, [key, weight]) => sum + (snapshot.stats[key] ?? 0) * weight, 0,
    );
    return statsPower +
      (snapshot.knife.maxWave ?? 0) * POWER_WEIGHTS.knifeWave +
      (snapshot.knife.gamesPlayed ?? 0) * POWER_WEIGHTS.knifeGame +
      Math.floor((snapshot.tower[0]?.score ?? 0) / POWER_WEIGHTS.towerScoreDivisor) +
      snapshot.cardbattle * POWER_WEIGHTS.cardbattle +
      (snapshot.collection?.highestChapter ?? 0) * POWER_WEIGHTS.chapter +
      snapshot.achieveCount * POWER_WEIGHTS.achievement +
      snapshot.gamesPlayed * POWER_WEIGHTS.game;
  }

  // 总力可解锁成就，成就又贡献总力；按新增成就收敛，避免页面需要再次刷新。
  function synchronizePower(context) {
    let unlocked = context.achievements.checkNew();
    while (true) {
      const snapshot = readSnapshot(context);
      const power = calculatePower(snapshot);
      if (snapshot.stats.total_power !== power) {
        context.storage.set('cross_game_stats', { ...snapshot.stats, total_power: power });
      }
      const next = context.achievements.checkNew();
      unlocked = [...unlocked, ...next];
      if (next.length === 0) return { ...snapshot, power, unlocked };
    }
  }

  const PROGRESS_READERS = {
    cultivation({ storage }) {
      const save = firstSave(storage, 'cultivation_save_', [1, 2, 3]);
      return save ? (save.name || '无名') + ' · ' + (REALMS[save.realm] || '凡人') : null;
    },
    lifesim({ storage }) {
      const save = firstSave(storage, 'game_lifesim_save_', [1, 2, 3])?.data;
      return save ? (save.name || '无名') + ' · ' + (save.age ?? 0) + '岁' : null;
    },
    guigu({ storage }) {
      const save = firstSave(storage, 'guigu_save_', [0, 1, 2]);
      return save ? (save.name || '无名') + ' · 年龄' + (save.age ?? 16) : null;
    },
    knife({ storage }) {
      const save = storage.get('knife_meta_progress', {});
      return save.maxWave > 0 ? '最高' + save.maxWave + '波 · ' + (save.gamesPlayed ?? 0) + '局' : null;
    },
    cardtower({ storage, formatNumber }) {
      const best = storage.get('leaderboard_cardtower', [])[0];
      return best ? '最高分: ' + formatNumber(best.score) : null;
    },
    cardbattle({ storage }) {
      const unlocked = storage.get('cardbattle_unlocked', 0);
      return unlocked > 0 ? '已解锁: ' + ['练气对手', '筑基对手', '金丹对手'][unlocked] : null;
    },
    cardcollect({ storage }) {
      const save = storage.get('cardcollect_save');
      return save ? Object.keys(save.owned ?? {}).length + '张卡 · 第' + (save.highestChapter ?? 0) + '章' : null;
    },
  };

  function node(document, className, text) {
    const element = document.createElement('div');
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderProgress(context) {
    const { document, rewards } = context;
    for (const card of document.querySelectorAll('.game-card')) {
      const match = (card.getAttribute('href') || '').match(/games\/(\w+)\.html/);
      if (!match || !GAME_KEYS.includes(match[1])) continue;
      card.querySelectorAll('.game-card-progress, .reward-badge').forEach(badge => badge.remove());
      const progress = PROGRESS_READERS[match[1]](context);
      if (progress) {
        const badge = node(document, 'game-card-progress', progress);
        const button = card.querySelector('.btn');
        button ? card.insertBefore(badge, button) : card.appendChild(badge);
      }
      const count = rewards.getUnclaimedCount(match[1]);
      if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'reward-badge';
        badge.textContent = count;
        badge.title = count + '个跨游戏奖励可领取';
        card.appendChild(badge);
      }
    }
  }

  function getStatCards(snapshot, formatNumber) {
    const { stats, knife, tower, cultivation } = snapshot;
    const kills = (stats.cultivation_kills ?? 0) + (stats.knife_kills ?? 0) + (stats.guigu_kills ?? 0);
    return [
      { icon: '🔮', value: formatNumber(snapshot.power), label: '修仙总力', className: ' power-card' },
      { icon: '🎮', value: snapshot.gamesPlayed + '/' + GAME_KEYS.length, label: '已游玩游戏' },
      { icon: '⚔️', value: formatNumber(kills), label: '累计击杀' },
      { icon: '🏆', value: snapshot.achieveCount, label: '成就解锁' },
      { icon: '🧘', value: REALMS[stats.cultivation_max_realm ?? 0] || '凡人', label: '最高境界' },
      { icon: '🗡️', value: knife.maxWave ?? 0, label: '转转刀最高波' },
      { icon: '🃏', value: formatNumber(tower[0]?.score ?? 0), label: '仙塔最高分' },
      { icon: '📖', value: stats.cardcollect_cards ?? 0, label: '仙卡收集' },
      { icon: '💰', value: formatNumber(cultivation?.gold ?? 0), label: '灵石(修仙)' },
    ];
  }

  function renderStats(context, snapshot) {
    const grid = context.document.getElementById('stats-grid');
    const cards = getStatCards(snapshot, context.formatNumber).map(item => {
      const card = node(context.document, 'stat-dashboard-card' + (item.className || ''));
      card.append(
        node(context.document, 'stat-dashboard-icon', item.icon),
        node(context.document, 'stat-dashboard-value', item.value),
        node(context.document, 'stat-dashboard-label', item.label),
      );
      return card;
    });
    grid.replaceChildren(...cards);
  }

  function renderAchievementSummary(context, grid, count) {
    const { document } = context;
    const all = context.achievements.getAll();
    const summary = grid.parentNode.querySelector('.achievement-summary') || node(document, 'achievement-summary');
    const label = node(document, 'achievement-summary-text', count + '/' + all.length + ' 已解锁');
    const bar = node(document, 'progress-bar');
    const fill = node(document, 'progress-fill');
    fill.style.width = (all.length ? Math.round(count / all.length * PERCENT) : 0) + '%';
    bar.appendChild(fill);
    summary.replaceChildren(label, bar);
    grid.parentNode.insertBefore(summary, grid);
    return all;
  }

  function renderAchievements(context, snapshot) {
    const { document } = context;
    const grid = document.getElementById('achievement-grid');
    const all = renderAchievementSummary(context, grid, snapshot.achieveCount);
    grid.replaceChildren(...all.map(achievement => {
      const card = node(document, 'achievement-card ' + (achievement.unlocked ? 'unlocked' : 'locked'));
      const details = node(document, 'achievement-info');
      details.append(
        node(document, 'achievement-name', achievement.unlocked ? achievement.name : '???'),
        node(document, 'achievement-desc', achievement.desc),
      );
      card.append(node(document, 'achievement-icon', achievement.unlocked ? achievement.icon : '❓'), details);
      return card;
    }));
    snapshot.unlocked.forEach(achievement => context.toast(
      '成就解锁：' + achievement.icon + ' ' + achievement.name, 'success', ACHIEVEMENT_TOAST_MS,
    ));
  }

  function create(context) {
    function refresh() {
      const snapshot = synchronizePower(context);
      renderProgress(context);
      renderStats(context, snapshot);
      renderAchievements(context, snapshot);
    }
    return Object.freeze({ refresh });
  }

  const api = Object.freeze({ create, calculatePower });
  if (typeof module === 'object' && module.exports) module.exports = api;
  globalThis.PortalProfile = api;
}
