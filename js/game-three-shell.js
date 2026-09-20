const SCENE_LABELS = Object.freeze({ cultivation: '云海修行', lifesim: '浮生一卷', guigu: '山河行旅',
  cardtower: '浮屠仙途', cardbattle: '玉台论道', cardcollect: '星月仙庭' });

export class SceneShell {
  constructor(document) {
    this.document = document;
    this.home = document.getElementById('game-scene-mount');
    if (!this.home) throw new Error('页面缺少游戏场景容器');
    this.root = document.createElement('section');
    this.root.className = 'game-scene-shell';
    this.root.dataset.sceneStatus = 'loading';
    this.root.setAttribute('aria-label', '游戏实景');
    this.root.innerHTML = '<header class="scene-heading"><div><p class="scene-eyebrow">掌中仙境</p>' +
      '<h2 class="scene-title">正在展开场景</h2><p class="scene-caption"></p></div>' +
      '<div class="scene-tools" role="group" aria-label="调整视角">' +
      '<button type="button" data-view="left" aria-label="向左转动视角">↶</button>' +
      '<button type="button" data-view="right" aria-label="向右转动视角">↷</button>' +
      '<button type="button" data-view="in" aria-label="拉近视角">＋</button>' +
      '<button type="button" data-view="out" aria-label="拉远视角">−</button>' +
      '<button type="button" data-view="reset">复位</button></div></header>' +
      '<div class="scene-viewport"><canvas tabindex="0" role="application" ' +
      'aria-label="游戏场景。左右方向键选择目标，Home / End 跳到首尾，回车执行；鼠标点选，拖动转向。"></canvas>' +
      '<div class="scene-error" role="alert" hidden></div></div>' +
      '<p class="scene-hint" role="status" aria-live="polite">点选场景互动 · 拖动转向 · 方向键选取 / 回车确认</p>';
    this.canvas = this.root.querySelector('canvas');
    this.title = this.root.querySelector('.scene-title');
    this.eyebrow = this.root.querySelector('.scene-eyebrow');
    this.caption = this.root.querySelector('.scene-caption');
    this.hint = this.root.querySelector('.scene-hint');
    this.error = this.root.querySelector('.scene-error');
    this.home.append(this.root);
  }

  update(model) {
    const wasUnstarted = this.root.classList.contains('scene-unstarted');
    const unstarted = !model.units.length && !(model.tiles || []).length;
    const eyebrow = SCENE_LABELS[model.theme];
    if (this.title.textContent !== model.title) this.title.textContent = model.title;
    if (this.caption.textContent !== model.caption) this.caption.textContent = model.caption;
    if (this.eyebrow.textContent !== eyebrow) this.eyebrow.textContent = eyebrow;
    if (this.root.dataset.sceneKind !== model.kind) this.root.dataset.sceneKind = model.kind;
    if (this.root.dataset.sceneTheme !== model.theme) this.root.dataset.sceneTheme = model.theme;
    if (this.root.dataset.sceneStatus !== 'ready') this.root.dataset.sceneStatus = 'ready';
    this.root.classList.toggle('scene-unstarted', unstarted);
    this.document.body.classList.add('has-game-scene');
    if (wasUnstarted && !unstarted && model.theme !== 'cardcollect') this.reveal();
  }

  mount(target) {
    const parent = target || this.home;
    if (this.root.parentElement === parent) return;
    parent.prepend(this.root);
    this.reveal();
  }

  reveal() {
    this.root.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  announce(text) {
    if (text && this.hint.textContent !== text) this.hint.textContent = text;
  }

  fail(error) {
    this.root.dataset.sceneStatus = 'failed';
    this.error.hidden = false;
    this.error.textContent = '场景加载失败：' + error.message;
    this.announce('请保存进度后刷新页面。场景需要支持 WebGL 2 的浏览器。');
  }

  dispose() {
    this.root.remove();
  }
}
