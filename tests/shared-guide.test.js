const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createGuideRuntime, guideKey } = require('./helpers/guide-runtime');

const STEPS = [{ title: '游戏大厅', desc: '选择游戏' }, { title: '完成', desc: '开始游玩' }];

function startGuide(runtime) {
  runtime.guide.start('portal', STEPS);
  runtime.timers.runPending();
}

test('引导开始前保持隐藏，显示时接管焦点，Tab 与 Shift+Tab 不进入背后页面', () => {
  const runtime = createGuideRuntime();
  const { guide, document } = runtime;
  assert.equal(guide.overlay.hidden, true);
  assert.equal(guide.overlay.inert, true);
  startGuide(runtime);
  const skip = guide.overlay.querySelector('.guide-skip-btn');
  const next = guide.overlay.querySelector('.guide-next-btn');
  assert.equal(document.activeElement, skip);
  assert.equal(guide.overlay.hidden, false);
  assert.equal(guide.overlay.querySelector('[role="dialog"]').getAttribute('aria-modal'), 'true');
  const backwards = guideKey('Tab', { shiftKey: true });
  guide.onKeyDown(backwards);
  assert.equal(backwards.defaultPrevented, true);
  assert.equal(document.activeElement, next);
  const forwards = guideKey('Tab');
  guide.onKeyDown(forwards);
  assert.equal(forwards.defaultPrevented, true);
  assert.equal(document.activeElement, skip);
});

test('Esc 关闭引导且不传给游戏，焦点恢复到引导实际显示时的控件', () => {
  const runtime = createGuideRuntime();
  const { guide, document, timers, values } = runtime;
  const opener = document.createElement('button');
  document.body.appendChild(opener);
  guide.start('portal', STEPS);
  opener.focus();
  timers.runPending();
  const event = guideKey('Escape');
  guide.onKeyDown(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(event.stopped, true);
  assert.equal(guide.overlay.hidden, true);
  assert.equal(guide.overlay.inert, true);
  assert.equal(document.activeElement, opener);
  assert.equal(values.get('guide_completed').portal, true);
  assert.equal(guide.start('portal', STEPS), false);
  const after = guideKey('1');
  guide.onKeyDown(after);
  assert.equal(after.stopped, false);
});

test('引导保留原生按钮激活，下一步不抢焦点，最后一步完成后无残留高亮或定时器', () => {
  const runtime = createGuideRuntime();
  startGuide(runtime);
  const { guide, document, timers } = runtime;
  const next = guide.overlay.querySelector('.guide-next-btn');
  next.focus();
  const enter = guideKey('Enter');
  guide.onKeyDown(enter);
  assert.equal(enter.defaultPrevented, false);
  assert.equal(enter.stopped, true);
  next.click();
  assert.equal(document.activeElement, next);
  assert.equal(next.textContent, '完成');
  next.click();
  assert.equal(guide.overlay.hidden, true);
  assert.equal(timers.pending.size, 0);
  assert.equal(document.querySelector('.guide-highlight'), null);
});

test('手机旋转与页面滚动重新定位引导，进入无目标步骤后清除固定宽度', () => {
  const runtime = createGuideRuntime();
  const { guide, document, window, timers } = runtime;
  const target = document.createElement('div');
  target.id = 'target';
  target.getBoundingClientRect = () => ({ left: 800, top: 100, bottom: 160, width: 200 });
  document.body.appendChild(target);
  guide.start('portal', [{ ...STEPS[0], target: '#target' }, STEPS[1]]);
  timers.runPending();
  timers.runPending();
  const tooltip = guide.overlay.querySelector('.guide-tooltip');
  assert.equal(tooltip.style.width, '320px');
  window.innerWidth = 360;
  window.innerHeight = 640;
  window.dispatchEvent({ type: 'resize' });
  assert.equal(tooltip.style.left, '24px');
  window.innerWidth = 300;
  window.dispatchEvent({ type: 'resize' });
  assert.equal(tooltip.style.width, '268px');
  assert.equal(tooltip.style.left, '16px');
  target.getBoundingClientRect = () => ({ left: 0, top: -100, bottom: -40, width: 100 });
  window.dispatchEvent({ type: 'scroll' });
  assert.equal(tooltip.style.top, '230px');
  guide.overlay.querySelector('.guide-next-btn').click();
  assert.equal(tooltip.style.width, '');
  assert.equal(tooltip.style.top, '50%');
});

test('引导在设置弹窗之上时，只有引导可以循环焦点', () => {
  const runtime = createGuideRuntime();
  const { guide, document } = runtime;
  startGuide(runtime);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  document.body.appendChild(overlay);
  const fakeOtherScope = Object.create(Object.getPrototypeOf(guide.focus));
  fakeOtherScope.overlay = overlay;
  const event = guideKey('Tab');
  fakeOtherScope.onKeyDown(event);
  assert.equal(event.defaultPrevented, false);
  const skip = guide.overlay.querySelector('.guide-skip-btn');
  skip.focus();
  guide.onKeyDown(guideKey('Tab', { shiftKey: true }));
  assert.equal(document.activeElement, guide.overlay.querySelector('.guide-next-btn'));
});
