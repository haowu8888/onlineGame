/* ========== 门户主页逻辑 ========== */

(function () {
  'use strict';

  // 应用已保存的全局设置
  const savedSettings = Storage.get('portal_settings', {});
  const enableAnimations = savedSettings.enableAnimations !== false;
  const fontSize = savedSettings.fontSize || 'normal';
  document.documentElement.dataset.fontsize = fontSize;

  // 初始化
  initNav('portal');
  if (enableAnimations) {
    initParticles('#particles', savedSettings.particleCount || 25);
    initScrollAnimations();
  } else {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }

  // 设置弹窗
  new SettingsModal([
    {
      key: 'particleCount', label: '粒子数量', type: 'range',
      min: 0, max: 60, step: 5, default: 25
    },
    {
      key: 'enableAnimations', label: '启用动画', type: 'checkbox',
      default: true, checkLabel: '开启页面动画效果'
    },
    {
      key: 'fontSize', label: '字体大小', type: 'select',
      default: 'normal',
      options: [
        { value: 'small', label: '小' },
        { value: 'normal', label: '正常' },
        { value: 'large', label: '大' }
      ]
    }
  ], 'portal_settings', (vals) => {
    // 重新生成粒子（initParticles 内部已处理清理）
    if (vals.enableAnimations) {
      initParticles('#particles', vals.particleCount);
    } else {
      const pc = document.getElementById('particles');
      if (pc) pc.innerHTML = '';
    }
    // 应用字体大小
    document.documentElement.dataset.fontsize = vals.fontSize;
  });

  // 游戏卡片3D倾斜效果 (requestAnimationFrame节流)
  document.querySelectorAll('.game-card').forEach(card => {
    let rafId = null;
    card.addEventListener('mousemove', (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        const tiltX = (y - 0.5) * 10;
        const tiltY = (x - 0.5) * -10;
        card.style.transform = `translateY(-8px) perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        rafId = null;
      });
    });

    card.addEventListener('mouseleave', () => {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      card.style.transform = '';
    });
  });

  // 游戏卡片进度显示
  (function renderCardProgress() {
    const REALMS = ['凡人','炼气期','筑基期','金丹期','元婴期','化神期','渡劫期','大乘期','飞升'];
    const GAME_PROGRESS = {
      cultivation: () => {
        for (let i = 1; i <= 3; i++) {
          const d = Storage.get('cultivation_save_' + i);
          if (d) return (d.name || '无名') + ' · ' + (REALMS[d.realm] || '凡人');
        }
        return null;
      },
      lifesim: () => {
        for (let i = 1; i <= 3; i++) {
          const saved = Storage.get('game_lifesim_save_' + i);
          if (saved && saved.data) return (saved.data.name || '无名') + ' · ' + (saved.data.age || 0) + '岁';
        }
        return null;
      },
      guigu: () => {
        for (let i = 0; i < 3; i++) {
          const d = Storage.get('guigu_save_' + i);
          if (d) return (d.name || '无名') + ' · 年龄' + (d.age || 16);
        }
        return null;
      },
      knife: () => {
        const d = Storage.get('knife_meta_progress');
        if (d && d.maxWave > 0) return '最高' + d.maxWave + '波 · ' + d.gamesPlayed + '局';
        return null;
      },
      cardtower: () => {
        const b = Storage.get('leaderboard_cardtower', []);
        if (b.length > 0) return '最高分: ' + formatNumber(b[0].score);
        return null;
      },
      cardbattle: () => {
        const u = Storage.get('cardbattle_unlocked', 0);
        const names = ['练气对手', '筑基对手', '金丹对手'];
        if (u > 0) return '已解锁: ' + (names[u] || names[names.length - 1]);
        return null;
      },
      cardcollect: () => {
        const d = Storage.get('cardcollect_save');
        if (d) {
          const owned = d.owned ? Object.keys(d.owned).length : 0;
          return owned + '张卡 · 第' + (d.highestChapter || 0) + '章';
        }
        return null;
      }
    };

    document.querySelectorAll('.game-card').forEach(card => {
      const href = card.getAttribute('href') || '';
      const match = href.match(/games\/(\w+)\.html/);
      if (!match) return;
      const gameKey = match[1];
      const progressFn = GAME_PROGRESS[gameKey];
      if (!progressFn) return;
      try {
        const text = progressFn();
        if (text) {
          const badge = document.createElement('div');
          badge.className = 'game-card-progress';
          badge.textContent = text;
          const btn = card.querySelector('.btn');
          if (btn) card.insertBefore(badge, btn);
          else card.appendChild(badge);
        }
        // 跨游戏奖励角标
        if (typeof CrossGameRewards !== 'undefined') {
          const unclaimed = CrossGameRewards.getUnclaimedCount(gameKey);
          if (unclaimed > 0) {
            const rb = document.createElement('span');
            rb.className = 'reward-badge';
            rb.textContent = unclaimed;
            rb.title = unclaimed + '个跨游戏奖励可领取';
            card.style.position = 'relative';
            card.appendChild(rb);
          }
        }
      } catch (e) { console.warn(`读取 ${gameKey} 进度失败:`, e.message); }
    });
  })();

  // 排行榜
  const tabsContainer = document.getElementById('lb-tabs');
  const tableContainer = document.getElementById('lb-table');
  let currentGame = 'cultivation';

  // ARIA: 排行榜标签组
  tabsContainer.setAttribute('role', 'tablist');
  tableContainer.setAttribute('role', 'tabpanel');
  tabsContainer.querySelectorAll('.leaderboard-tab').forEach(tab => {
    tab.setAttribute('role', 'tab');
    tab.id = `lb-tab-${tab.dataset.game}`;
    tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
  });
  const activeTab = tabsContainer.querySelector('.leaderboard-tab.active');
  tableContainer.setAttribute('aria-labelledby', activeTab ? activeTab.id : 'lb-tab-cultivation');

  const CULT_REALMS_NAMES = ['凡人','炼气','筑基','金丹','元婴','化神','渡劫','大乘','飞升'];
  function formatLeaderboardScore(gameKey, entry) {
    if (gameKey === 'cultivation') {
      const idx = Number(entry.score) || 0;
      return CULT_REALMS_NAMES[idx] || CULT_REALMS_NAMES[0];
    }
    if (gameKey === 'knife') {
      const wave = entry.wave || 0;
      const kills = entry.score || 0;
      if (wave) return `第${wave}波 · ${formatNumber(kills)}杀`;
      return formatNumber(kills);
    }
    return formatNumber(entry.score);
  }

  function renderLeaderboard(gameKey) {
    const board = getLeaderboard(gameKey);
    if (!Array.isArray(board) || board.length === 0) {
      tableContainer.innerHTML = '<div class="leaderboard-empty">暂无记录，快去挑战吧！</div>';
      return;
    }
    // 使用 DocumentFragment 减少回流
    const frag = document.createDocumentFragment();
    board.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      const rankClass = i < 3 ? `top-${i + 1}` : '';
      const rankSymbol = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
      const d = new Date(entry.date);
      const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      const rank = document.createElement('span');
      rank.className = `leaderboard-rank ${rankClass}`;
      rank.textContent = rankSymbol;

      const name = document.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = entry.name || '无名修士';

      const score = document.createElement('span');
      score.className = 'leaderboard-score';
      score.textContent = formatLeaderboardScore(gameKey, entry);

      const date = document.createElement('span');
      date.className = 'leaderboard-date';
      date.textContent = dateStr;

      row.append(rank, name, score, date);
      frag.appendChild(row);
    });
    tableContainer.innerHTML = '';
    tableContainer.appendChild(frag);
  }

  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.leaderboard-tab');
    if (!tab || tab.dataset.game === currentGame) return;
    tabsContainer.querySelectorAll('.leaderboard-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    tableContainer.setAttribute('aria-labelledby', tab.id);
    currentGame = tab.dataset.game;

    // 淡出 -> 渲染 -> 淡入
    tableContainer.classList.add('fading');
    setTimeout(() => {
      renderLeaderboard(currentGame);
      tableContainer.classList.remove('fading');
    }, 200);
  });

  renderLeaderboard(currentGame);

  // Hero区滚动视差
  const hero = document.getElementById('hero');
  const scrollHint = document.querySelector('.scroll-hint');

  // 页脚年份
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  let scrollRaf = null;
  window.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      if (scrollY < window.innerHeight) {
        hero.style.opacity = 1 - scrollY / window.innerHeight;
      }
      // 滚动后隐藏提示
      if (scrollHint) {
        if (scrollY > 100) scrollHint.classList.add('hidden');
        else scrollHint.classList.remove('hidden');
      }
      scrollRaf = null;
    });
  }, { passive: true });

  // 跨游戏成就渲染
  if (window.CrossGameAchievements) {
    // 检查新成就并提示
    const newlyUnlocked = CrossGameAchievements.checkNew();
    newlyUnlocked.forEach(a => {
      showToast(`成就解锁：${a.icon} ${a.name}`, 'success', 4000);
    });

    const grid = document.getElementById('achievement-grid');
    if (grid) {
      const all = CrossGameAchievements.getAll();
      const unlockedCount = CrossGameAchievements.getUnlockedCount();
      const totalCount = all.length;
      const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

      // 进度摘要
      const summary = document.createElement('div');
      summary.className = 'achievement-summary';
      summary.innerHTML = `
        <span class="achievement-summary-text">${unlockedCount}/${totalCount} 已解锁</span>
        <div class="progress-bar" style="max-width: 300px; margin: 8px auto 0;">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
      `;
      grid.parentNode.insertBefore(summary, grid);

      // 成就卡片
      grid.innerHTML = all.map((a, i) => `
        <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}" style="animation-delay: ${i * 0.05}s">
          <div class="achievement-icon">${a.unlocked ? a.icon : '&#10067;'}</div>
          <div class="achievement-info">
            <div class="achievement-name">${a.unlocked ? escapeHtml(a.name) : '???'}</div>
            <div class="achievement-desc">${escapeHtml(a.desc)}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // ========== 修仙档案（统计总览） ==========
  (function renderStatsPanel() {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    const stats = Storage.get('cross_game_stats', {});

    // 计算已游玩游戏数
    const gameKeys = ['cultivation', 'lifesim', 'guigu', 'knife', 'cardtower', 'cardbattle', 'cardcollect'];
    let gamesPlayed = 0;
    gameKeys.forEach(k => { if (stats['games_played_' + k]) gamesPlayed++; });

    // 累计击杀
    const totalKills = (stats.cultivation_kills || 0) + (stats.knife_kills || 0) + (stats.guigu_kills || 0);

    // 成就数
    const achieveCount = window.CrossGameAchievements ? CrossGameAchievements.getUnlockedCount() : 0;

    // 各游戏最佳
    const knifeMeta = Storage.get('knife_meta_progress', {});
    const towerBoard = Storage.get('leaderboard_cardtower', []);
    const cultSave = Storage.get('cultivation_save_1') || Storage.get('cultivation_save_2') || Storage.get('cultivation_save_3');
    const REALMS_NAMES = ['凡人','炼气','筑基','金丹','元婴','化神','渡劫','大乘','飞升'];

    // 修仙总力计算
    function calcTotalPower() {
      let power = 0;
      // 修仙之路: 境界×100 + 击杀×2
      power += (stats.cultivation_max_realm || 0) * 100;
      power += (stats.cultivation_kills || 0) * 2;
      // 仙途模拟器: 最高年龄×3
      power += (stats.lifesim_max_age || 0) * 3;
      // 鬼谷八荒: 击杀×3 + 探索×2
      power += (stats.guigu_kills || 0) * 3;
      power += (stats.guigu_explored || 0) * 2;
      // 转转刀: 最高波×10 + 局数×5
      power += (knifeMeta.maxWave || 0) * 10;
      power += (knifeMeta.gamesPlayed || 0) * 5;
      // 斩仙塔: 最高分/10
      if (towerBoard.length > 0) power += Math.floor(towerBoard[0].score / 10);
      // 灵卡对决: 解锁难度×50
      power += (Storage.get('cardbattle_unlocked', 0)) * 50;
      // 仙卡录: 卡牌数×5 + 章节×20
      power += (stats.cardcollect_cards || 0) * 5;
      const ccSave = Storage.get('cardcollect_save');
      if (ccSave) power += (ccSave.highestChapter || 0) * 20;
      // 成就加成
      power += achieveCount * 30;
      // 游玩数加成
      power += gamesPlayed * 20;
      return power;
    }

    const totalPower = calcTotalPower();

    const cards = [
      { icon: '🔮', value: formatNumber(totalPower), label: '修仙总力', cls: 'power-card' },
      { icon: '🎮', value: gamesPlayed + '/7', label: '已游玩游戏' },
      { icon: '⚔️', value: formatNumber(totalKills), label: '累计击杀' },
      { icon: '🏆', value: achieveCount, label: '成就解锁' },
      { icon: '🧘', value: REALMS_NAMES[stats.cultivation_max_realm || 0] || '凡人', label: '最高境界' },
      { icon: '🗡️', value: knifeMeta.maxWave || 0, label: '转转刀最高波' },
      { icon: '🃏', value: towerBoard.length > 0 ? formatNumber(towerBoard[0].score) : '0', label: '仙塔最高分' },
      { icon: '📖', value: stats.cardcollect_cards || 0, label: '仙卡收集' },
      { icon: '💰', value: formatNumber(cultSave ? (cultSave.gold || 0) : 0), label: '灵石(修仙)' }
    ];

    grid.innerHTML = cards.map(c => `
      <div class="stat-dashboard-card${c.cls ? ' ' + c.cls : ''}">
        <div class="stat-dashboard-icon">${c.icon}</div>
        <div class="stat-dashboard-value">${c.value}</div>
        <div class="stat-dashboard-label">${c.label}</div>
      </div>
    `).join('');
  })();

  // ========== 每日仙令系统 ==========
  (function renderDailyMissions() {
    const grid = document.getElementById('daily-grid');
    if (!grid) return;
    if (!window.DailyMissions) return;

    const existingHeader = grid.parentNode && grid.parentNode.querySelector('.daily-header-row');
    if (existingHeader) existingHeader.remove();

    const headerRow = document.createElement('div');
    headerRow.className = 'daily-header-row fade-in';
    headerRow.innerHTML =
      '<span class="daily-points" id="daily-points">仙缘点: ' + (Storage.get('cross_game_stats', {}).xianyuan_points || 0) + '</span>' +
      '<button class="btn btn-gold btn-sm" id="daily-open-btn" type="button">查看/领取</button>';
    grid.parentNode.insertBefore(headerRow, grid);

    function refreshNavBadge() {
      const badgeEl = document.querySelector('.nav .nav-badge');
      if (!badgeEl) return;
      const cnt = DailyMissions.getClaimableCount();
      badgeEl.textContent = cnt > 99 ? '99+' : String(cnt);
      badgeEl.classList.toggle('hidden', cnt <= 0);
    }

    function updateExchangePoints(points) {
      const exchangeEl = document.getElementById('exchange-pts');
      if (exchangeEl) exchangeEl.textContent = '仙缘点: ' + points;
    }

    function renderGrid() {
      const d = DailyMissions.getOrCreateToday();
      const missions = Array.isArray(d.missions) ? d.missions : [];
      const claimed = Array.isArray(d.claimed) ? d.claimed : [];
      const stats = Storage.get('cross_game_stats', {});

      const pointsEl = document.getElementById('daily-points');
      if (pointsEl) pointsEl.textContent = '仙缘点: ' + (stats.xianyuan_points || 0);

      grid.innerHTML = missions.map((m, i) => {
        const progress = Math.max(0, DailyMissions.getProgress(m, d));
        const done = progress >= m.target;
        const isClaimed = claimed.includes(i);
        const fill = Math.min(100, Math.floor((Math.min(progress, m.target) / m.target) * 100));
        const progressText = done ? '<span class="done">已完成</span>' : Math.min(progress, m.target) + '/' + m.target;

        return '<div class="daily-mission-card' + (done ? ' completed' : '') + '" data-idx="' + i + '">' +
          '<div class="daily-mission-icon">' + m.icon + '</div>' +
          '<div class="daily-mission-info">' +
            '<div class="daily-mission-name">' + escapeHtml(m.name) + '</div>' +
            '<div class="daily-mission-desc">' + escapeHtml(m.desc) + '</div>' +
            '<div class="daily-mission-progress">' +
              progressText +
              ' · +' + m.reward + '仙缘' +
            '</div>' +
            '<div class="daily-mission-bar"><div class="daily-mission-bar-fill" style="width:' + fill + '%"></div></div>' +
          '</div>' +
          '<div class="daily-mission-check">' + (isClaimed ? '✅' : (done ? '🎁' : '⬜')) + '</div>' +
        '</div>';
      }).join('');
    }

    renderGrid();
    refreshNavBadge();

    const openBtn = document.getElementById('daily-open-btn');
    if (openBtn) openBtn.addEventListener('click', () => openDailyMissionsModal('portal'));

    grid.addEventListener('click', function (e) {
      const card = e.target.closest('.daily-mission-card');
      if (!card) return;
      const idx = parseInt(card.dataset.idx, 10);
      if (Number.isNaN(idx)) return;

      const res = DailyMissions.claim(idx);
      if (!res.ok) return;

      renderGrid();
      refreshNavBadge();
      updateExchangePoints(res.points);
      showToast('获得 ' + res.reward + ' 仙缘点！', 'success');
    });
  })();

  // ========== 仙缘兑换商店 ==========
  (function renderExchangeShop() {
    var grid = document.getElementById('exchange-grid');
    var balanceEl = document.getElementById('exchange-balance');
    if (!grid || !balanceEl) return;

    var EXCHANGE_KEY = 'xianyuan_purchased';
    var ITEMS = [
      { id: 'cult_gold_500', icon: '💰', name: '灵石袋(小)', desc: '修仙之路+500灵石', cost: 30, game: 'cultivation', effect: { type: 'gold', value: 500 }, repeatable: true },
      { id: 'cult_gold_2000', icon: '💰', name: '灵石袋(大)', desc: '修仙之路+2000灵石', cost: 100, game: 'cultivation', effect: { type: 'gold', value: 2000 }, repeatable: true },
      { id: 'cult_insight_30', icon: '🧠', name: '悟道丹', desc: '修仙之路+30悟道值', cost: 40, game: 'cultivation', effect: { type: 'insight', value: 30 }, repeatable: true },
      { id: 'cult_exp_pill', icon: '✨', name: '经验丹', desc: '修仙之路+500修为', cost: 35, game: 'cultivation', effect: { type: 'exp', value: 500 }, repeatable: true },
      { id: 'collect_stones_500', icon: '💎', name: '灵石包(仙卡)', desc: '仙卡录+500灵石(5抽)', cost: 50, game: 'cardcollect', effect: { type: 'stones', value: 500 }, repeatable: true },
      { id: 'collect_exp_scroll', icon: '📜', name: '修炼卷轴', desc: '仙卡录全队经验+200', cost: 45, game: 'cardcollect', effect: { type: 'team_exp', value: 200 }, repeatable: true },
      { id: 'guigu_gold_1000', icon: '🪙', name: '鬼谷金囊', desc: '鬼谷八荒+1000灵石', cost: 60, game: 'guigu', effect: { type: 'gold', value: 1000 }, repeatable: true },
      { id: 'guigu_herb', icon: '🌿', name: '灵草包', desc: '鬼谷八荒+3灵药', cost: 40, game: 'guigu', effect: { type: 'herb', value: 3 }, repeatable: true },
      { id: 'knife_heal', icon: '💗', name: '回春符', desc: '转转刀下局开始回复30HP', cost: 25, game: 'knife', effect: { type: 'heal_next', value: 30 }, repeatable: true },
      { id: 'tower_potion', icon: '🧪', name: '仙塔灵药', desc: '斩仙塔下局开始+10HP', cost: 25, game: 'cardtower', effect: { type: 'heal_next', value: 10 }, repeatable: true },
      { id: 'knife_hp_boost', icon: '❤️', name: '护身符', desc: '转转刀初始HP+20(永久)', cost: 80, game: 'knife', effect: { type: 'hp', value: 20 }, repeatable: false },
      { id: 'tower_hp_boost', icon: '🛡️', name: '仙塔护甲', desc: '斩仙塔初始HP+15(永久)', cost: 80, game: 'cardtower', effect: { type: 'hp', value: 15 }, repeatable: false },
      { id: 'lifesim_luck', icon: '🍀', name: '转运符', desc: '仙途模拟器幸运+3(永久)', cost: 60, game: 'lifesim', effect: { type: 'luck', value: 3 }, repeatable: false },
      // Phase 6C 新增商品
      { id: 'guigu_mount_feed', icon: '🥕', name: '坐骑饲料', desc: '鬼谷八荒坐骑亲密度+10', cost: 20, game: 'guigu', effect: { type: 'mount_feed', value: 10 }, repeatable: true },
      { id: 'cardbattle_arena_life', icon: '💖', name: '竞技场复活', desc: '灵卡对决竞技场额外1命', cost: 35, game: 'cardbattle', effect: { type: 'arena_life', value: 1 }, repeatable: true },
      { id: 'cardcollect_equip_box', icon: '📦', name: '装备宝箱', desc: '仙卡录随机获得1件装备', cost: 45, game: 'cardcollect', effect: { type: 'equip_box', value: 1 }, repeatable: true },
      { id: 'knife_gold_boost', icon: '💰', name: '聚财符', desc: '转转刀下局金币×1.5', cost: 30, game: 'knife', effect: { type: 'gold_boost', value: 1.5 }, repeatable: true },
      { id: 'tower_relic_box', icon: '🎁', name: '圣物宝匣', desc: '斩仙塔下局起始额外1圣物选择', cost: 50, game: 'cardtower', effect: { type: 'relic_box', value: 1 }, repeatable: true }
    ];

    var stats = Storage.get('cross_game_stats', {});
    var points = stats.xianyuan_points || 0;
    // 兼容旧版数组格式 -> 新版对象格式
    var rawPurchased = Storage.get(EXCHANGE_KEY, {});
    var purchased;
    if (Array.isArray(rawPurchased)) {
      // 迁移: 数组 -> 对象 {id: count}
      purchased = {};
      rawPurchased.forEach(function(id) { purchased[id] = (purchased[id] || 0) + 1; });
      Storage.set(EXCHANGE_KEY, purchased);
    } else {
      purchased = rawPurchased;
    }

    // 阶梯价格: 每次购买后价格+20%
    function getItemCost(item) {
      if (!item.repeatable) return item.cost;
      var count = purchased[item.id] || 0;
      // 使用整数累乘避免浮点精度偏差
      var cost = item.cost;
      for (var i = 0; i < count; i++) cost = Math.floor(cost * 1.2);
      return cost;
    }

    balanceEl.innerHTML = '<span class="exchange-balance-text" id="exchange-pts">仙缘点: ' + points + '</span>';

    function renderGrid() {
      grid.innerHTML = ITEMS.map(function(item) {
        var soldOut = !item.repeatable && purchased[item.id];
        var cost = getItemCost(item);
        var count = purchased[item.id] || 0;
        var countLabel = item.repeatable && count > 0 ? ' (已买' + count + '次)' : '';
        return '<div class="exchange-item' + (soldOut ? ' sold-out' : '') + '" data-id="' + item.id + '">' +
          '<div class="exchange-item-icon">' + item.icon + '</div>' +
          '<div class="exchange-item-name">' + escapeHtml(item.name) + '</div>' +
          '<div class="exchange-item-desc">' + escapeHtml(item.desc) + countLabel + '</div>' +
          '<div class="exchange-item-cost">' + (soldOut ? '已兑换' : cost + ' 仙缘') + '</div>' +
        '</div>';
      }).join('');
    }

    renderGrid();

    grid.addEventListener('click', function(e) {
      var card = e.target.closest('.exchange-item');
      if (!card) return;
      var id = card.dataset.id;
      var item = null;
      for (var i = 0; i < ITEMS.length; i++) { if (ITEMS[i].id === id) { item = ITEMS[i]; break; } }
      if (!item) return;

      purchased = Storage.get(EXCHANGE_KEY, {});
      if (Array.isArray(purchased)) { var tmp = {}; purchased.forEach(function(pid) { tmp[pid] = (tmp[pid]||0)+1; }); purchased = tmp; }
      if (!item.repeatable && purchased[id]) return;

      stats = Storage.get('cross_game_stats', {});
      points = stats.xianyuan_points || 0;
      var cost = getItemCost(item);
      if (points < cost) {
        showToast('仙缘点不足！需要 ' + cost + ' 点', 'error');
        return;
      }

      // 扣除仙缘点（关键交易，立即写入防止数据丢失）
      stats.xianyuan_points = points - cost;
      Storage.setImmediate('cross_game_stats', stats);

      // 记录购买（关键交易）
      purchased[id] = (purchased[id] || 0) + 1;
      Storage.setImmediate(EXCHANGE_KEY, purchased);

      // 应用效果
      var eff = item.effect;
      if (item.game === 'cultivation') {
        for (var slot = 1; slot <= 3; slot++) {
          var save = Storage.get('cultivation_save_' + slot);
          if (save) {
            if (eff.type === 'gold') save.gold = (save.gold || 0) + eff.value;
            if (eff.type === 'insight') save.insight = (save.insight || 0) + eff.value;
            if (eff.type === 'exp') save.exp = (save.exp || 0) + eff.value;
            Storage.set('cultivation_save_' + slot, save);
            break;
          }
        }
      } else if (item.game === 'cardcollect') {
        var ccSave = Storage.get('cardcollect_save');
        if (ccSave) {
          if (eff.type === 'stones') ccSave.stones = (ccSave.stones || 0) + eff.value;
          if (eff.type === 'team_exp') {
            // 给所有已拥有角色加经验
            if (ccSave.owned) {
              Object.keys(ccSave.owned).forEach(function(cid) {
                ccSave.owned[cid].exp = (ccSave.owned[cid].exp || 0) + eff.value;
              });
            }
          }
          Storage.set('cardcollect_save', ccSave);
        }
        if (eff.type === 'equip_box') {
          var ccBonuses = Storage.get('xianyuan_cardcollect_bonuses', { equipBoxes: 0 });
          ccBonuses.equipBoxes = (ccBonuses.equipBoxes || 0) + eff.value;
          Storage.set('xianyuan_cardcollect_bonuses', ccBonuses);
        }
      } else if (item.game === 'guigu') {
        if (eff.type === 'mount_feed') {
          var ggBonuses = Storage.get('xianyuan_guigu_bonuses', { mountFeed: 0 });
          ggBonuses.mountFeed = (ggBonuses.mountFeed || 0) + eff.value;
          Storage.set('xianyuan_guigu_bonuses', ggBonuses);
        } else {
          for (var gs = 0; gs < 3; gs++) {
            var gSave = Storage.get('guigu_save_' + gs);
            if (gSave) {
              if (eff.type === 'gold') gSave.gold = (gSave.gold || 0) + eff.value;
              if (eff.type === 'herb') gSave.herbs = (gSave.herbs || 0) + eff.value;
              Storage.set('guigu_save_' + gs, gSave);
              break;
            }
          }
        }
      } else if (item.game === 'knife') {
        var knifeBonuses = Storage.get('xianyuan_knife_bonuses', { hp: 0, heal_next: 0, goldMul: 1 });
        if (eff.type === 'hp') knifeBonuses.hp += eff.value;
        if (eff.type === 'heal_next') knifeBonuses.heal_next = (knifeBonuses.heal_next || 0) + eff.value;
        if (eff.type === 'gold_boost') knifeBonuses.goldMul = Math.min(3, (knifeBonuses.goldMul || 1) * eff.value);
        Storage.set('xianyuan_knife_bonuses', knifeBonuses);
      } else if (item.game === 'cardtower') {
        var towerBonuses = Storage.get('xianyuan_tower_bonuses', { hp: 0, heal_next: 0, extraRelicChoices: 0 });
        if (eff.type === 'hp') towerBonuses.hp += eff.value;
        if (eff.type === 'heal_next') towerBonuses.heal_next = (towerBonuses.heal_next || 0) + eff.value;
        if (eff.type === 'relic_box') towerBonuses.extraRelicChoices = (towerBonuses.extraRelicChoices || 0) + eff.value;
        Storage.set('xianyuan_tower_bonuses', towerBonuses);
      } else if (item.game === 'cardbattle') {
        var cbBonuses = Storage.get('xianyuan_cardbattle_bonuses', { arenaRevives: 0 });
        if (eff.type === 'arena_life') cbBonuses.arenaRevives = (cbBonuses.arenaRevives || 0) + eff.value;
        Storage.set('xianyuan_cardbattle_bonuses', cbBonuses);
      } else if (item.game === 'lifesim') {
        var lsBonuses = Storage.get('xianyuan_lifesim_bonuses', { luck: 0 });
        if (eff.type === 'luck') lsBonuses.luck += eff.value;
        Storage.set('xianyuan_lifesim_bonuses', lsBonuses);
      }

      // 更新UI
      var ptsEl = document.getElementById('exchange-pts');
      if (ptsEl) ptsEl.textContent = '仙缘点: ' + stats.xianyuan_points;
      var dpEl = document.getElementById('daily-points');
      if (dpEl) dpEl.textContent = '仙缘点: ' + stats.xianyuan_points;
      renderGrid();
      if (typeof SoundManager !== 'undefined') SoundManager.play('purchase');
      showToast('兑换成功: ' + item.name, 'success');
    });
  })();

  // 新手引导 - 门户首页
  if (typeof GuideSystem !== 'undefined') {
    GuideSystem.start('portal', [
      { title: '欢迎来到仙界游坊！', desc: '这里汇聚了七款精品修仙游戏，让我带你快速了解一下。' },
      { title: '游戏大厅', desc: '点击任意游戏卡片即可进入对应游戏，每款都有独特玩法。', target: '.game-cards' },
      { title: '仙榜', desc: '查看各游戏的排行榜，与自己的历史最佳一决高下。', target: '#leaderboard' },
      { title: '修仙档案', desc: '这里展示你的总体游戏数据统计。', target: '#stats-section' },
      { title: '每日仙令', desc: '每天更新的任务，完成可获得仙缘点奖励。', target: '#daily-section' },
      { title: '仙缘兑换', desc: '用仙缘点兑换各游戏道具加成，提升修炼效率。', target: '#exchange-section' },
      { title: '仙道成就', desc: '跨游戏的成就系统，畅玩各游戏解锁成就。', target: '#achievements-section' }
    ]);
  }

})();
