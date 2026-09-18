const NAV_GAMES = Object.freeze([
  { id: 'cultivation', name: '修仙之路', file: 'cultivation.html' },
  { id: 'lifesim', name: '仙途模拟器', file: 'lifesim.html' },
  { id: 'guigu', name: '鬼谷八荒', file: 'guigu.html' },
  { id: 'knife', name: '转转刀', file: 'knife.html' },
  { id: 'cardtower', name: '斩仙塔', file: 'cardtower.html' },
  { id: 'cardbattle', name: '灵卡对决', file: 'cardbattle.html' },
  { id: 'cardcollect', name: '仙卡录', file: 'cardcollect.html' },
]);
const NAV_MOBILE_QUERY = '(max-width: 768px)';

function recordRecentGame(key) {
  if (!NAV_GAMES.some(game => game.id === key)) return;
  const recent = Storage.get('portal_recent_games', []);
  const known = new Set(NAV_GAMES.map(game => game.id));
  const others = recent.filter(item => item.key !== key && known.has(item.key));
  Storage.set('portal_recent_games', [{ key, visitedAt: Date.now() }, ...others]);
}

function refreshDailyBadge() {
  const badge = document.querySelector('.nav .nav-badge');
  if (!badge) return;
  const count = DailyMissions.getClaimableCount();
  badge.textContent = String(count);
  badge.classList.toggle('hidden', count === 0);
}

function navigationMarkup(activePage) {
  const portal = activePage === 'portal';
  const prefix = portal ? 'games/' : '';
  const home = portal ? '#main-content' : '../index.html';
  const links = NAV_GAMES.map(game => `<li><a href="${prefix}${game.file}" ${activePage === game.id ? 'class="active" aria-current="page"' : ''}>${game.name}</a></li>`).join('');
  return `<a href="${home}" class="nav-brand">仙界游坊</a>
    <button class="nav-toggle" aria-label="展开游戏菜单" aria-expanded="false" aria-controls="game-navigation">☰</button>
    <ul class="nav-links" id="game-navigation"><li><a href="${home}" ${portal ? 'class="active" aria-current="page"' : ''}>主页</a></li>${links}</ul>
    <button class="nav-daily-btn" title="每日仙令" aria-label="每日仙令">📜<span class="nav-badge hidden" aria-hidden="true"></span></button>
    <button class="nav-settings-btn" title="设置" aria-label="打开设置">⚙</button>
    <div class="nav-backdrop"></div>`;
}

function bindNavigationMenu(nav) {
  const toggle = nav.querySelector('.nav-toggle');
  const links = nav.querySelector('.nav-links');
  const backdrop = nav.querySelector('.nav-backdrop');
  const mobile = window.matchMedia(NAV_MOBILE_QUERY);
  const setOpen = open => {
    const expanded = mobile.matches && open;
    const hidden = mobile.matches && !expanded;
    if (hidden && links.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    links.inert = hidden;
    links.setAttribute('aria-hidden', String(hidden));
    links.classList.toggle('open', expanded);
    backdrop.classList.toggle('visible', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? '关闭游戏菜单' : '展开游戏菜单');
  };
  const syncViewport = () => {
    setOpen(false);
    if (mobile.matches || document.activeElement !== toggle) return;
    const current = links.querySelector('[aria-current="page"]') || links.querySelector('a');
    current.focus({ preventScroll: true });
  };
  syncViewport();
  mobile.addEventListener('change', syncViewport);
  toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  links.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  backdrop.addEventListener('click', () => { setOpen(false); toggle.focus({ preventScroll: true }); });
  document.addEventListener('click', event => { if (!nav.contains(event.target)) setOpen(false); });
  nav.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !links.classList.contains('open')) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    toggle.focus({ preventScroll: true });
  });
}

function initNav(activePage) {
  document.querySelector('.game-nav')?.remove();
  document.querySelector('.nav')?.remove();
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.setAttribute('aria-label', '游戏导航');
  nav.innerHTML = navigationMarkup(activePage);
  // 跳转链接必须是页面第一个可聚焦元素，导航栏排在它后面。
  const first = document.body.firstElementChild;
  if (first?.classList.contains('skip-link')) first.after(nav);
  else document.body.prepend(nav);
  bindNavigationMenu(nav);
  nav.querySelector('.nav-settings-btn').addEventListener('click', () => window._settingsModal?.open());
  nav.querySelector('.nav-daily-btn').addEventListener('click', () => openDailyMissionsModal(activePage));
  window.addEventListener('focus', refreshDailyBadge);
  window.addEventListener('storage', refreshDailyBadge);
  window.addEventListener('daily-missions-updated', refreshDailyBadge);
  refreshDailyBadge();
}
