/* ========== 门户主页入口 ========== */
'use strict';
{
  const DEFAULT_SETTINGS = { particleCount: 25, enableAnimations: true, fontSize: 'normal' };
  const MAX_PARTICLES = 60;
  const PARTICLE_STEP = 5;
  const CARD_TILT_DEGREES = 4;
  const CARD_CENTER_RATIO = 0.5;
  const CARD_LIFT_PX = 4;
  const CARD_PERSPECTIVE_PX = 600;
  const PERCENT = 100;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  const tiltResets = [];
  let currentSettings = { ...DEFAULT_SETTINGS, ...Storage.get('portal_settings', {}) };
  let animationsEnabled = false;
  let scrollAnimationsInitialized = false;
  let refreshFrame = null;

  function applySettings(values) {
    currentSettings = { ...values };
    animationsEnabled = values.enableAnimations !== false && !REDUCED_MOTION.matches;
    document.documentElement.dataset.fontsize = values.fontSize ?? DEFAULT_SETTINGS.fontSize;
    document.documentElement.dataset.animations = animationsEnabled ? 'on' : 'off';
    initParticles('#particles', animationsEnabled ? (values.particleCount ?? DEFAULT_SETTINGS.particleCount) : 0);
    if (animationsEnabled && !scrollAnimationsInitialized) {
      initScrollAnimations();
      scrollAnimationsInitialized = true;
    }
    if (!animationsEnabled) {
      document.querySelectorAll('.fade-in').forEach(element => element.classList.add('visible'));
      tiltResets.forEach(reset => reset());
    }
  }

  function initSettings() {
    new SettingsModal([
      { key: 'particleCount', label: '粒子数量', type: 'range', min: 0, max: MAX_PARTICLES, step: PARTICLE_STEP, default: DEFAULT_SETTINGS.particleCount },
      { key: 'enableAnimations', label: '启用动画', type: 'checkbox', default: true, checkLabel: '开启页面动画效果' },
      {
        key: 'fontSize', label: '字体大小', type: 'select', default: DEFAULT_SETTINGS.fontSize,
        options: [{ value: 'small', label: '小' }, { value: 'normal', label: '正常' }, { value: 'large', label: '大' }],
      },
    ], 'portal_settings', applySettings);
    REDUCED_MOTION.addEventListener('change', () => applySettings(currentSettings));
    applySettings(currentSettings);
  }

  function bindCardTilt(card) {
    let frame = null;
    let pointer;
    const reset = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      card.style.transform = '';
    };
    tiltResets.push(reset);
    card.addEventListener('mousemove', event => {
      if (!animationsEnabled) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        const bounds = card.getBoundingClientRect();
        const x = (pointer.x - bounds.left) / bounds.width;
        const y = (pointer.y - bounds.top) / bounds.height;
        card.style.setProperty('--mx', x * PERCENT + '%');
        card.style.setProperty('--my', y * PERCENT + '%');
        card.style.transform = 'translateY(-' + CARD_LIFT_PX + 'px) perspective(' + CARD_PERSPECTIVE_PX +
          'px) rotateX(' + (y - CARD_CENTER_RATIO) * CARD_TILT_DEGREES + 'deg) rotateY(' + (CARD_CENTER_RATIO - x) * CARD_TILT_DEGREES + 'deg)';
        frame = null;
      });
    });
    card.addEventListener('mouseleave', reset);
  }

  function scheduleRefresh() {
    if (refreshFrame !== null) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = null;
      profile.refresh();
      missions.refresh();
      exchange.refresh();
      leaderboard.refresh();
      library.refresh();
    });
  }

  initNav('portal');
  const profile = PortalProfile.create({
    storage: Storage, achievements: CrossGameAchievements, rewards: CrossGameRewards,
    document, formatNumber, toast: showToast,
  });
  const model = PortalExchangeModel.create({
    storage: Storage, data: PortalExchangeData, progression: CardCollectProgression,
  });
  const exchange = PortalExchange.init({ model, onChange: scheduleRefresh });
  const missions = PortalMissions.init({
    document, storage: Storage, missions: DailyMissions, escapeHtml,
    openModal: openDailyMissionsModal, toast: showToast, onChange: scheduleRefresh,
  });
  const leaderboard = PortalLeaderboard.init({ document, getLeaderboard, formatNumber });
  const navigation = PortalLibraryLocation.create({
    location, history, events: window, schedule: setTimeout, cancel: clearTimeout,
  });
  const library = PortalLibrary.init({ document, storage: Storage, navigation });
  profile.refresh();
  initSettings();
  document.querySelectorAll('.game-card').forEach(bindCardTilt);

  window.addEventListener('storage', scheduleRefresh);
  window.addEventListener('focus', scheduleRefresh);
  window.addEventListener('daily-missions-updated', scheduleRefresh);
  window.addEventListener('pageshow', event => { if (event.persisted) scheduleRefresh(); });
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  if (typeof GuideSystem !== 'undefined') {
    GuideSystem.start('portal', [
      { title: '欢迎来到仙界游坊！', desc: '这里汇聚了七款精品修仙游戏，让我带你快速了解一下。' },
      { title: '游戏大厅', desc: '点击任意游戏卡片即可进入对应游戏，每款都有独特玩法。', target: '.game-cards' },
      { title: '仙榜', desc: '查看各游戏的排行榜，与自己的历史最佳一决高下。', target: '#leaderboard' },
      { title: '修仙档案', desc: '这里展示你的总体游戏数据统计。', target: '#stats-section' },
      { title: '每日仙令', desc: '每天更新的任务，完成可获得仙缘点奖励。', target: '#daily-section' },
      { title: '仙缘兑换', desc: '用仙缘点兑换各游戏道具加成，提升修炼效率。', target: '#exchange-section' },
      { title: '仙道成就', desc: '跨游戏的成就系统，畅玩各游戏解锁成就。', target: '#achievements-section' },
    ]);
  }
}
