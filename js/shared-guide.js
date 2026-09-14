const GUIDE_LAYOUT = Object.freeze({ width: 320, minimumHeight: 180, margin: 16, gap: 12, scrollDelay: 400, startDelay: 600 });

class GameGuide {
  constructor() {
    this.overlay = null;
    this.steps = [];
    this.currentStep = 0;
    this.gameKey = '';
    this.timer = null;
    this.returnFocus = null;
  }

  isCompleted(key) {
    return Boolean(Storage.get('guide_completed', {})[key]);
  }

  reset(key) {
    const completed = Storage.get('guide_completed', {});
    Storage.set('guide_completed', Object.fromEntries(Object.entries(completed).filter(([game]) => game !== key)));
  }

  createOverlay() {
    if (this.overlay) return;
    this.overlay = document.createElement('div');
    this.overlay.className = 'guide-overlay';
    this.overlay.innerHTML = `<div class="guide-backdrop"></div><div class="guide-tooltip" role="dialog" aria-label="游戏操作引导">
      <div class="guide-step-indicator"></div><div class="guide-text"></div>
      <div class="guide-actions"><button class="btn btn-sm guide-skip-btn">跳过引导</button><button class="btn btn-gold btn-sm guide-next-btn">下一步</button></div></div>`;
    document.body.appendChild(this.overlay);
    this.overlay.querySelector('.guide-skip-btn').addEventListener('click', () => this.finish());
    this.overlay.querySelector('.guide-next-btn').addEventListener('click', () => {
      this.currentStep++;
      if (this.currentStep >= this.steps.length) this.finish();
      else this.showStep(this.currentStep);
    });
  }

  clearTimer() {
    if (this.timer !== null) TimerManager.clearTimeout(this.timer);
    this.timer = null;
  }

  positionTooltip(tooltip, element) {
    const width = Math.min(GUIDE_LAYOUT.width, window.innerWidth - GUIDE_LAYOUT.margin * 2);
    const height = tooltip.offsetHeight || GUIDE_LAYOUT.minimumHeight;
    const rect = element.getBoundingClientRect();
    let top = rect.bottom + GUIDE_LAYOUT.gap;
    if (top + height > window.innerHeight - GUIDE_LAYOUT.margin) top = rect.top - height - GUIDE_LAYOUT.gap;
    if (top < GUIDE_LAYOUT.margin) top = Math.max(GUIDE_LAYOUT.margin, (window.innerHeight - height) / 2);
    const left = clamp(rect.left + (rect.width - width) / 2, GUIDE_LAYOUT.margin, window.innerWidth - width - GUIDE_LAYOUT.margin);
    tooltip.style.width = `${width}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.transform = '';
  }

  centerTooltip(tooltip) {
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
  }

  showStep(index) {
    this.clearTimer();
    const step = this.steps[index];
    const tooltip = this.overlay.querySelector('.guide-tooltip');
    this.overlay.querySelector('.guide-step-indicator').textContent = `${index + 1} / ${this.steps.length}`;
    this.overlay.querySelector('.guide-text').innerHTML = `<strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.desc)}</p>`;
    this.overlay.querySelector('.guide-next-btn').textContent = index === this.steps.length - 1 ? '完成' : '下一步';
    document.querySelector('.guide-highlight')?.classList.remove('guide-highlight');
    this.overlay.classList.add('active');
    this.centerTooltip(tooltip);
    const target = step.target ? document.querySelector(step.target) : null;
    if (!target) return;
    target.classList.add('guide-highlight');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
    this.timer = TimerManager.setTimeout(() => this.positionTooltip(tooltip, target), reducedMotion ? 0 : GUIDE_LAYOUT.scrollDelay);
    SoundManager.play('click');
  }

  start(key, steps) {
    if (this.isCompleted(key)) return false;
    if (!Array.isArray(steps) || steps.length === 0) throw new TypeError('游戏引导至少需要一个步骤');
    this.clearTimer();
    this.gameKey = key;
    this.steps = steps.map(step => ({ ...step }));
    this.currentStep = 0;
    this.returnFocus = document.activeElement;
    this.createOverlay();
    this.timer = TimerManager.setTimeout(() => this.showStep(0), GUIDE_LAYOUT.startDelay);
    return true;
  }

  finish() {
    this.clearTimer();
    this.overlay?.classList.remove('active');
    document.querySelector('.guide-highlight')?.classList.remove('guide-highlight');
    const completed = Storage.get('guide_completed', {});
    Storage.set('guide_completed', { ...completed, [this.gameKey]: true });
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
  }
}

window.GuideSystem = new GameGuide();
