function dailyMissionMarkup(options) {
  const { mission, index, daily, activeGame } = options;
  const progress = Math.max(0, DailyMissions.getProgress(mission, daily));
  const done = progress >= mission.target;
  const claimed = (daily.claimed ?? []).includes(index);
  const gameName = NAV_GAMES.find(game => game.id === mission.game)?.name ?? mission.game;
  const tag = activeGame && mission.game !== activeGame ? `<span class="daily-game-tag">${escapeHtml(gameName)}</span>` : '';
  const display = done ? '<span class="done">已完成</span>' : `${Math.min(progress, mission.target)}/${mission.target}`;
  const percent = Math.min(100, Math.floor(progress / mission.target * 100));
  return `<div class="daily-modal-item${done ? ' completed' : ''}">
    <div class="daily-modal-icon">${escapeHtml(mission.icon)}</div>
    <div class="daily-modal-main"><div class="daily-modal-title">${escapeHtml(mission.name)} ${tag}</div>
      <div class="daily-modal-desc">${escapeHtml(mission.desc)}</div>
      <div class="daily-modal-progress">${display} · +${escapeHtml(mission.reward)}仙缘</div>
      <div class="daily-mission-bar"><div class="daily-mission-bar-fill" style="width:${percent}%"></div></div></div>
    <button class="btn btn-gold btn-sm daily-claim-btn" data-idx="${index}" ${done && !claimed ? '' : 'disabled'}>${claimed ? '已领取' : done ? '领取' : '未完成'}</button></div>`;
}

function renderDailyMissions(overlay, activeGame) {
  const content = overlay.querySelector('.daily-modal-content');
  const restoreFocus = content.contains(document.activeElement);
  const daily = DailyMissions.getOrCreateToday();
  const indices = daily.missions.map((_, index) => index);
  if (activeGame) indices.sort((left, right) => Number(daily.missions[right].game === activeGame) - Number(daily.missions[left].game === activeGame));
  const points = Storage.get('cross_game_stats', {}).xianyuan_points ?? 0;
  const items = indices.map(index => dailyMissionMarkup({ mission: daily.missions[index], index, daily, activeGame })).join('');
  content.innerHTML = `<div class="daily-modal-points">仙缘点：<strong id="daily-modal-points">${escapeHtml(points)}</strong></div><div class="daily-modal-list">${items}</div>`;
  if (!restoreFocus) return;
  const next = content.querySelector('.daily-claim-btn:not(:disabled)') || overlay.querySelector('.modal-close');
  next.focus({ preventScroll: true });
}

function claimDailyMission(button, refresh) {
  try {
    const result = DailyMissions.claim(Number(button.dataset.idx));
    if (!result.ok) return;
    showToast(`获得 ${result.reward} 仙缘点！`, 'success');
    refresh();
  } catch (error) {
    console.error('每日仙令领取失败:', error);
    showToast(`领取失败：${error.message}`, 'error');
  }
}

function openDailyMissionsModal(activePage) {
  const existing = document.getElementById('daily-missions-modal');
  if (existing) return;
  const overlay = document.createElement('div');
  overlay.id = 'daily-missions-modal';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'daily-modal-title');
  overlay.innerHTML = `<div class="modal daily-modal"><div class="modal-header"><h3 class="modal-title" id="daily-modal-title">每日仙令</h3><button class="modal-close" aria-label="关闭每日仙令">&times;</button></div><div class="modal-body daily-modal-content"></div></div>`;
  const focus = new ModalFocus(overlay);
  const activeGame = activePage === 'portal' ? null : activePage;
  const render = () => renderDailyMissions(overlay, activeGame);
  const close = () => { focus.destroy(); overlay.remove(); };
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) { close(); return; }
    const button = event.target.closest('.daily-claim-btn');
    if (button && !button.disabled) claimDailyMission(button, render);
  });
  document.body.appendChild(overlay);
  render();
  focus.open();
}
