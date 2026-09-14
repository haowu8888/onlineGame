'use strict';
{
  const RECENT_STORAGE_KEY = 'portal_recent_games';
  const DATE_FORMAT = new Intl.DateTimeFormat('zh-CN', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  function normalize(value) {
    return value.normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
  }

  function readGames(document) {
    return [...document.querySelectorAll('.game-card[data-game]')].map(card => ({
      key: card.dataset.game,
      name: card.querySelector('.game-card-title').textContent.trim(),
      cover: card.querySelector('.game-card-cover').getAttribute('src'),
      href: card.getAttribute('href'),
      categories: card.dataset.categories.split(' '),
      searchText: normalize([
        card.querySelector('.game-card-title').textContent,
        card.querySelector('.game-card-desc').textContent,
        card.querySelector('.game-card-tags').textContent,
      ].join(' ')),
      element: card,
    }));
  }

  function selectGames(games, criteria) {
    const words = normalize(criteria.query).split(/\s+/).filter(Boolean);
    return games.filter(game =>
      (criteria.category === 'all' || game.categories.includes(criteria.category)) &&
      words.every(word => game.searchText.includes(word)),
    );
  }

  function selectRecent(games, records) {
    if (!Array.isArray(records)) throw new TypeError('最近游玩记录格式错误，请检查导入的存档。');
    const known = new Map(games.map(game => [game.key, game]));
    const visits = new Map();
    for (const record of records) {
      if (!record || !known.has(record.key)) continue;
      if (!Number.isFinite(record.visitedAt) || record.visitedAt < 0) continue;
      if (!Number.isFinite(new Date(record.visitedAt).getTime())) continue;
      const previous = visits.get(record.key);
      if (!previous || previous.visitedAt < record.visitedAt) visits.set(record.key, record);
    }
    return [...visits.values()].sort((a, b) => b.visitedAt - a.visitedAt)
      .map(record => ({ ...known.get(record.key), visitedAt: record.visitedAt }));
  }

  function createText(document, tag, options) {
    const element = document.createElement(tag);
    element.className = options.className;
    element.textContent = options.text;
    return element;
  }

  function createRecentCard(document, game) {
    const link = document.createElement('a');
    link.className = 'recent-game';
    link.setAttribute('href', game.href);
    link.dataset.game = game.key;
    const cover = document.createElement('img');
    cover.className = 'recent-cover';
    cover.setAttribute('src', game.cover);
    cover.setAttribute('alt', '');
    cover.setAttribute('width', '146');
    cover.setAttribute('height', '94');
    cover.setAttribute('loading', 'lazy');
    const details = document.createElement('span');
    details.className = 'recent-details';
    const title = createText(document, 'strong', { className: 'recent-name', text: game.name });
    const time = createText(document, 'time', {
      className: 'recent-time', text: DATE_FORMAT.format(new Date(game.visitedAt)) + ' 游玩',
    });
    time.setAttribute('datetime', new Date(game.visitedAt).toISOString());
    details.append(title, time);
    const arrow = createText(document, 'span', { className: 'recent-arrow', text: '↗' });
    arrow.setAttribute('aria-hidden', 'true');
    link.append(cover, details, arrow);
    return link;
  }

  function refreshRecent(context) {
    const recent = selectRecent(context.games, context.storage.get(RECENT_STORAGE_KEY, []));
    context.document.getElementById('recent-section').hidden = recent.length === 0;
    context.document.getElementById('recent-games').replaceChildren(
      ...recent.map(game => createRecentCard(context.document, game)),
    );
  }

  function renderResults(context, criteria) {
    const selected = new Set(selectGames(context.games, criteria));
    context.games.forEach(game => { game.element.hidden = !selected.has(game); });
    context.filters.forEach(button => {
      const active = button.dataset.category === criteria.category;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('active', active);
    });
    context.document.getElementById('game-result-count').textContent =
      selected.size === context.games.length ? '全部 ' + selected.size + ' 款游戏' : '找到 ' + selected.size + ' 款游戏';
    context.document.getElementById('game-search-empty').hidden = selected.size > 0;
    context.clear.hidden = criteria.query === '';
  }

  function init({ document, storage }) {
    const search = document.getElementById('game-search');
    const context = {
      document, storage, games: readGames(document),
      filters: [...document.querySelectorAll('.game-filter')],
      clear: document.getElementById('game-search-clear'),
    };
    let category = 'all';
    const update = () => renderResults(context, { category, query: search.value });
    const clearSearch = () => {
      search.value = '';
      search.focus();
      update();
    };
    search.addEventListener('input', update);
    search.addEventListener('search', update);
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') clearSearch();
    });
    context.clear.addEventListener('click', clearSearch);
    context.filters.forEach(button => button.addEventListener('click', () => {
      category = button.dataset.category;
      update();
    }));
    document.getElementById('game-filter-reset').addEventListener('click', () => {
      category = 'all';
      clearSearch();
    });
    update();
    refreshRecent(context);
    return Object.freeze({ refresh: () => refreshRecent(context) });
  }

  const api = Object.freeze({ init, normalize, selectGames, selectRecent });
  if (typeof module === 'object' && module.exports) module.exports = api;
  globalThis.PortalLibrary = api;
}
