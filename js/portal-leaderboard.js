'use strict';
{
  const REALMS = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘', '飞升'];
  const MEDALS = ['🥇', '🥈', '🥉'];
  const DATE_FORMAT = new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  function formatScore({ game, entry, formatNumber }) {
    if (game === 'cultivation') return REALMS[Number(entry.score) || 0] || REALMS[0];
    if (game === 'knife' && entry.wave) return '第' + entry.wave + '波 · ' + formatNumber(entry.score) + '杀';
    return formatNumber(entry.score);
  }

  function textNode(context, className, text) {
    const element = context.document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  }

  function createRow(context, entry, options) {
    const row = context.document.createElement('div');
    row.className = 'leaderboard-row';
    const rankClass = options.index < MEDALS.length ? ' top-' + (options.index + 1) : '';
    row.append(
      textNode(context, 'leaderboard-rank' + rankClass, MEDALS[options.index] || options.index + 1),
      textNode(context, 'leaderboard-name', entry.name || '无名修士'),
      textNode(context, 'leaderboard-score', formatScore({ ...context, entry, game: options.game })),
      textNode(context, 'leaderboard-date', DATE_FORMAT.format(new Date(entry.date))),
    );
    return row;
  }

  function renderBoard(context, game) {
    const container = context.document.getElementById('lb-table');
    const board = context.getLeaderboard(game);
    if (board.length === 0) {
      container.replaceChildren(textNode(context, 'leaderboard-empty', '暂无记录，快去挑战吧！'));
      return;
    }
    container.replaceChildren(...board.map((entry, index) => createRow(context, entry, { index, game })));
  }

  function bindTabs({ tabs, container, select }) {
    const moves = {
      ArrowLeft: index => (index + tabs.length - 1) % tabs.length,
      ArrowRight: index => (index + 1) % tabs.length,
      Home: () => 0,
      End: () => tabs.length - 1,
    };
    container.addEventListener('click', event => {
      const tab = event.target.closest('.leaderboard-tab');
      if (tab && container.contains(tab)) select(tab, false);
    });
    container.addEventListener('keydown', event => {
      const tab = event.target.closest('.leaderboard-tab');
      const move = moves[event.key];
      if (!tab || !move || !container.contains(tab)) return;
      event.preventDefault();
      select(tabs[move(tabs.indexOf(tab))], true);
    });
  }

  function init(context) {
    const container = context.document.getElementById('lb-tabs');
    const table = context.document.getElementById('lb-table');
    const tabs = [...container.querySelectorAll('.leaderboard-tab')];
    let currentGame;
    container.setAttribute('role', 'tablist');
    container.setAttribute('aria-label', '游戏排行榜');
    table.setAttribute('role', 'tabpanel');
    table.tabIndex = 0;
    table.setAttribute('aria-live', 'polite');
    tabs.forEach(tab => {
      tab.id = 'lb-tab-' + tab.dataset.game;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', table.id);
    });
    function select(selected, focus) {
      tabs.forEach(tab => {
        const active = tab === selected;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      currentGame = selected.dataset.game;
      table.setAttribute('aria-labelledby', selected.id);
      renderBoard(context, currentGame);
      if (focus) selected.focus();
    }
    bindTabs({ tabs, container, select });
    select(tabs.find(tab => tab.classList.contains('active')) || tabs[0], false);
    return Object.freeze({ refresh: () => renderBoard(context, currentGame) });
  }

  const api = Object.freeze({ init, formatScore });
  if (typeof module === 'object' && module.exports) module.exports = api;
  globalThis.PortalLeaderboard = api;
}
