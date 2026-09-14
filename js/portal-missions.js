'use strict';
{
  const PERCENT = 100;
  const BADGE_MAX = 99;

  function createHeader(document, grid, openModal) {
    const row = document.createElement('div');
    row.className = 'daily-header-row fade-in';
    const points = document.createElement('span');
    points.className = 'daily-points';
    points.id = 'daily-points';
    const button = document.createElement('button');
    button.id = 'daily-open-btn';
    button.className = 'btn btn-gold btn-sm';
    button.type = 'button';
    button.textContent = '查看/领取';
    button.addEventListener('click', () => openModal('portal'));
    row.append(points, button);
    grid.parentNode.querySelector('.daily-header-row')?.remove();
    grid.parentNode.insertBefore(row, grid);
    return points;
  }

  function renderMission({ context, mission, index, today }) {
    const { missions, escapeHtml } = context;
    const progress = Math.max(0, missions.getProgress(mission, today));
    const done = progress >= mission.target;
    const claimed = today.claimed.includes(index);
    const fill = Math.min(PERCENT, Math.floor(progress / mission.target * PERCENT));
    const status = claimed ? '已领取' : done ? '可领取' : '未完成';
    return '<div class="daily-mission-card' + (done ? ' completed' : '') + '" data-idx="' + index +
      '" role="button" tabindex="0" aria-disabled="' + String(!done || claimed) +
      '" aria-label="' + escapeHtml(mission.name + '，' + status) + '">' +
      '<div class="daily-mission-icon">' + escapeHtml(mission.icon) + '</div>' +
      '<div class="daily-mission-info"><div class="daily-mission-name">' + escapeHtml(mission.name) + '</div>' +
      '<div class="daily-mission-desc">' + escapeHtml(mission.desc) + '</div>' +
      '<div class="daily-mission-progress">' + (done ? '<span class="done">' + status + '</span>' : progress + '/' + mission.target) +
      ' · +' + mission.reward + '仙缘</div><div class="daily-mission-bar">' +
      '<div class="daily-mission-bar-fill" style="width:' + fill + '%"></div></div></div>' +
      '<div class="daily-mission-check">' + (claimed ? '✅' : done ? '🎁' : '⬜') + '</div></div>';
  }

  function refreshBadge(context) {
    const badge = context.document.querySelector('.nav .nav-badge');
    if (!badge) return;
    const count = context.missions.getClaimableCount();
    badge.textContent = count > BADGE_MAX ? BADGE_MAX + '+' : count;
    badge.classList.toggle('hidden', count === 0);
  }

  function claimMission(context, event, grid) {
    const card = event.target.closest('.daily-mission-card');
    if (!card || !grid.contains(card)) return;
    try {
      const result = context.missions.claim(Number(card.dataset.idx));
      if (!result.ok) return;
      context.onChange();
      context.toast('获得 ' + result.reward + ' 仙缘点！', 'success');
    } catch (error) {
      console.error('领取每日仙令失败：', error);
      context.toast(error.message, 'error');
    }
  }

  function init(context) {
    const grid = context.document.getElementById('daily-grid');
    const points = createHeader(context.document, grid, context.openModal);
    function refresh() {
      const today = context.missions.getOrCreateToday();
      points.textContent = '仙缘点: ' + (context.storage.get('cross_game_stats', {}).xianyuan_points ?? 0);
      grid.innerHTML = today.missions.map((mission, index) => renderMission({ context, mission, index, today })).join('');
      refreshBadge(context);
    }
    grid.addEventListener('click', event => claimMission(context, event, grid));
    grid.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      claimMission(context, event, grid);
    });
    refresh();
    return Object.freeze({ refresh });
  }

  const api = Object.freeze({ init });
  if (typeof module === 'object' && module.exports) module.exports = api;
  globalThis.PortalMissions = api;
}
