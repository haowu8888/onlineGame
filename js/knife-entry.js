const status = document.getElementById('arena-status');

import('./knife.js?v=35').then(() => {
  status.hidden = true;
}).catch(error => {
  status.hidden = false;
  status.classList.add('arena-error');
  status.textContent = '战场加载失败：' + error.message + '。请检查网络或浏览器的硬件加速设置后刷新。';
  document.getElementById('knife-overlay-btn').disabled = true;
  console.error('[KnifeGame] initialization failed:', error);
});
