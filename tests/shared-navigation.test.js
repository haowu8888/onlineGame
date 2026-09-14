const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSharedRuntime, plain } = require('./fixtures/shared-runtime.js');

function createNavigation(mobileMatches) {
  const runtime = createSharedRuntime();
  const { api, document, context } = runtime;
  const nav = document.createElement('nav');
  const toggle = document.createElement('button');
  const links = document.createElement('ul');
  const backdrop = document.createElement('div');
  const current = document.createElement('a');
  nav.appendChild(toggle);
  nav.appendChild(links);
  nav.appendChild(backdrop);
  links.appendChild(current);
  current.setAttribute('aria-current', 'page');
  nav.queries.set('.nav-toggle', [toggle]);
  nav.queries.set('.nav-links', [links]);
  nav.queries.set('.nav-backdrop', [backdrop]);
  links.queries.set('[aria-current="page"]', [current]);
  links.queries.set('a', [current]);
  const listeners = new Map();
  const media = { matches: mobileMatches, addEventListener(type, listener) { listeners.set(type, listener); } };
  context.matchMedia = query => { media.query = query; return media; };
  api.bindNavigationMenu(nav);
  return { ...runtime, nav, toggle, links, backdrop, current, media,
    resize(mobile) { media.matches = mobile; listeners.get('change')({ matches: mobile }); } };
}

test('所有游戏入口在页面加载时记录访问，包括使用独立导航的灵卡对决', () => {
  const games = ['cultivation', 'lifesim', 'guigu', 'knife', 'cardtower', 'cardbattle', 'cardcollect'];
  for (const game of games) {
    const { api, context, document } = createSharedRuntime();
    context.location.pathname = `/games/${game}.html`;
    document.dispatchEvent({ type: 'DOMContentLoaded' });
    const recent = plain(api.Storage.get('portal_recent_games'));
    assert.deepEqual(recent.map(item => item.key), [game]);
    assert.equal(Number.isFinite(recent[0].visitedAt), true);
    assert.equal(api.Storage.get('cross_game_stats'), null);
  }
});

test('入口支持部署子目录，首页、离线页及白名单外路径不会记为游玩', () => {
  const { api, context, document } = createSharedRuntime();
  context.location.pathname = '/onlineGame/games/cardbattle.html';
  document.dispatchEvent({ type: 'DOMContentLoaded' });
  const recent = plain(api.Storage.get('portal_recent_games'));
  for (const pathname of ['/', '/index.html', '/offline.html', '/cardbattle.html', '/games/unknown.html', '/games/knife.html/extra']) {
    context.location.pathname = pathname;
    document.dispatchEvent({ type: 'DOMContentLoaded' });
    assert.deepEqual(plain(api.Storage.get('portal_recent_games')), recent);
  }
});

test('手机导航初始收起并隔离链接，开关同时更新焦点可达性和辅助说明', () => {
  const { toggle, links, backdrop, media } = createNavigation(true);
  assert.equal(media.query, '(max-width: 768px)');
  assert.equal(links.inert, true);
  assert.equal(links.getAttribute('aria-hidden'), 'true');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  toggle.click();
  assert.equal(links.inert, false);
  assert.equal(links.getAttribute('aria-hidden'), 'false');
  assert.equal(links.classList.contains('open'), true);
  assert.equal(backdrop.classList.contains('visible'), true);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  toggle.click();
  assert.equal(links.inert, true);
  assert.equal(backdrop.classList.contains('visible'), false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
});

test('Escape 关闭手机菜单并恢复按钮焦点，阻止同次按键继续操作游戏', () => {
  const { nav, toggle, links, current, document } = createNavigation(true);
  toggle.click();
  current.focus();
  let prevented = false;
  let stopped = false;
  nav.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; } });
  assert.equal(links.inert, true);
  assert.equal(document.activeElement, toggle);
  assert.equal(prevented, true);
  assert.equal(stopped, true);
});

test('断点切换恢复桌面链接，缩回手机时将焦点移出隐藏菜单', () => {
  const { toggle, links, current, document, resize } = createNavigation(false);
  assert.equal(links.inert, false);
  assert.equal(links.getAttribute('aria-hidden'), 'false');
  current.focus();
  resize(true);
  assert.equal(links.inert, true);
  assert.equal(document.activeElement, toggle);
  toggle.click();
  resize(false);
  assert.equal(links.inert, false);
  assert.equal(links.getAttribute('aria-hidden'), 'false');
  assert.equal(links.classList.contains('open'), false);
  assert.equal(document.activeElement, current);
  resize(true);
  assert.equal(links.inert, true);
  assert.equal(document.activeElement, toggle);
});

test('点击遮罩关闭后回到菜单按钮，点击外部控件则保留该控件焦点', () => {
  const { toggle, links, backdrop, current, document } = createNavigation(true);
  toggle.click();
  current.focus();
  backdrop.click();
  assert.equal(document.activeElement, toggle);
  assert.equal(links.inert, true);
  toggle.click();
  const outside = document.createElement('button');
  outside.focus();
  document.dispatchEvent({ type: 'click', target: outside });
  assert.equal(links.inert, true);
  assert.equal(document.activeElement, outside);
});

test('点击导航链接关闭手机菜单且不会留下隐藏链接的焦点', () => {
  const { toggle, links, current, document } = createNavigation(true);
  toggle.click();
  current.focus();
  links.dispatchEvent({ type: 'click', target: current });
  assert.equal(links.inert, true);
  assert.equal(links.classList.contains('open'), false);
  assert.equal(document.activeElement, toggle);
});
