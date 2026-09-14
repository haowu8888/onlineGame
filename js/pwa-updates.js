class PwaUpdateManager {
  constructor({ serviceWorker, document, location, scriptUrl, logger }) {
    this.serviceWorker = serviceWorker;
    this.document = document;
    this.location = location;
    this.logger = logger;
    this.workerUrl = new URL('../sw.js', scriptUrl);
    this.notice = null;
    this.waitingWorker = null;
    this.reloadRequested = false;
  }

  async start() {
    this.serviceWorker.addEventListener('controllerchange', () => this.controllerChanged());
    this.registration = await this.serviceWorker.register(this.workerUrl, {
      updateViaCache: 'none',
    });
    if (this.registration.waiting) this.showUpdate(this.registration.waiting);
    this.registration.addEventListener('updatefound', () => {
      this.observeInstalling(this.registration.installing);
    });
    this.observeInstalling(this.registration.installing);
  }

  observeInstalling(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && this.serviceWorker.controller) {
        this.showUpdate(worker);
      }
    });
  }

  createButton({ label, className, onClick }) {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  showUpdate(worker) {
    this.waitingWorker = worker;
    if (this.notice) return;
    const notice = this.document.createElement('section');
    notice.className = 'pwa-update-notice';
    notice.setAttribute('aria-label', '应用更新');
    notice.setAttribute('role', 'status');
    const message = this.document.createElement('p');
    message.textContent = '新版本已准备好，请先保存游戏进度，再更新页面。';
    const actions = this.document.createElement('div');
    actions.className = 'pwa-update-actions';
    this.updateButton = this.createButton({
      label: '更新并刷新',
      className: 'btn btn-gold btn-sm',
      onClick: () => this.requestUpdate(),
    });
    const dismiss = this.createButton({
      label: '稍后',
      className: 'btn btn-outline btn-sm',
      onClick: () => this.dismiss(),
    });
    actions.append(this.updateButton, dismiss);
    notice.append(message, actions);
    this.document.body.append(notice);
    this.notice = notice;
  }

  requestUpdate() {
    // 共享存档层可在保存失败时取消该事件，防止刷新丢失进度。
    const beforeUpdate = new CustomEvent('pwa:before-update', { cancelable: true });
    if (!this.document.dispatchEvent(beforeUpdate)) return;
    if (!this.waitingWorker || this.waitingWorker.state === 'activated') {
      this.location.reload();
      return;
    }
    this.reloadRequested = true;
    this.updateButton.disabled = true;
    this.updateButton.textContent = '正在更新…';
    this.waitingWorker.postMessage('SKIP_WAITING');
  }

  controllerChanged() {
    if (this.reloadRequested) {
      this.reloadRequested = false;
      this.location.reload();
      return;
    }
    if (!this.notice) return;
    this.waitingWorker = null;
    this.updateButton.textContent = '刷新页面';
  }

  dismiss() {
    this.notice.remove();
    this.notice = null;
  }

  reportError(error) {
    this.logger.error('[PWA] 离线缓存注册失败。', error);
  }
}

if ('serviceWorker' in navigator) {
  const pwaUpdateManager = new PwaUpdateManager({
    serviceWorker: navigator.serviceWorker,
    document,
    location,
    scriptUrl: document.currentScript.src,
    logger: console,
  });
  pwaUpdateManager.start().catch((error) => pwaUpdateManager.reportError(error));
}
