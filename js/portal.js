/* ========== 门户主页逻辑 ========== */

(function () {
  'use strict';

  // 初始化
  initNav('portal');
  initParticles('#particles', 25);
  initScrollAnimations();

  // 设置弹窗（门户页简单设置）
  new SettingsModal([
    {
      key: 'particleCount', label: '粒子数量', type: 'range',
      min: 0, max: 60, step: 5, default: 25
    }
  ], 'portal_settings', (vals) => {
    // 重新生成粒子
    const pc = document.getElementById('particles');
    pc.innerHTML = '';
    initParticles('#particles', vals.particleCount);
  });

  // 游戏卡片3D倾斜效果
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
      const tiltX = (y - 0.5) * 10;
      const tiltY = (x - 0.5) * -10;
      card.style.transform = `translateY(-8px) perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // 排行榜
  const tabsContainer = document.getElementById('lb-tabs');
  const tableContainer = document.getElementById('lb-table');
  let currentGame = '2048';

  function renderLeaderboard(gameKey) {
    const board = getLeaderboard(gameKey);
    if (board.length === 0) {
      tableContainer.innerHTML = '<div class="leaderboard-empty">暂无记录，快去挑战吧！</div>';
      return;
    }
    tableContainer.innerHTML = board.map((entry, i) => {
      const rankClass = i < 3 ? `top-${i + 1}` : '';
      const rankSymbol = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
      const d = new Date(entry.date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `
        <div class="leaderboard-row">
          <span class="leaderboard-rank ${rankClass}">${rankSymbol}</span>
          <span class="leaderboard-name">${entry.name || '无名修士'}</span>
          <span class="leaderboard-score">${formatNumber(entry.score)}</span>
          <span class="leaderboard-date">${dateStr}</span>
        </div>
      `;
    }).join('');
  }

  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.leaderboard-tab');
    if (!tab) return;
    tabsContainer.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentGame = tab.dataset.game;
    renderLeaderboard(currentGame);
  });

  renderLeaderboard(currentGame);

  // Hero区滚动视差
  const hero = document.getElementById('hero');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      hero.style.opacity = 1 - scrollY / window.innerHeight;
    }
  }, { passive: true });

})();
