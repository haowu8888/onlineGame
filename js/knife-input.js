const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);
const DIGIT = /^[1-8]$/;
const KNOB_TRAVEL = 0.3;
const SPACE_ACTIONS = Object.freeze({ paused: 'resume', playing: 'dash' });

function ignoreKey(event) {
  return event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
    || event.target.closest('input, textarea, select, [contenteditable="true"], .modal-overlay.active');
}

function controlAction(code, state) {
  if (code === 'Escape') return 'togglePause';
  return code === 'Space' ? SPACE_ACTIONS[state] : null;
}

function digitAction(key, state) {
  if (!DIGIT.test(key)) return null;
  if (state === 'upgrading' || state === 'blessing') return 'choose';
  return state === 'playing' ? 'activateSkill' : null;
}

export class KnifeInput {
  constructor({ game, actions }) {
    this.game = game;
    this.actions = actions;
    this.controller = new AbortController();
    this.joystick = document.getElementById('joystick-area');
    this.knob = document.getElementById('joystick-knob');
    this.pointer = null;
    this.listen(document, 'keydown', event => this.keydown(event));
    this.listen(document, 'keyup', event => { delete this.game.keys[event.key.toLowerCase()]; });
    this.listen(this.joystick, 'pointerdown', event => this.pointerStart(event));
    this.listen(this.joystick, 'pointermove', event => this.pointerMove(event));
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
      this.listen(this.joystick, type, () => this.clear());
    });
    this.listen(window, 'blur', () => { this.clear(); this.actions.pause(); });
    this.listen(document, 'focusin', event => {
      if (event.target.closest('.modal-overlay, .guide-overlay, .nav')) this.actions.pause();
    });
  }

  listen(target, type, listener) {
    target.addEventListener(type, listener, { signal: this.controller.signal });
  }

  keydown(event) {
    if (ignoreKey(event)) return;
    const key = event.key.toLowerCase();
    if (MOVE_KEYS.has(key) && this.game.state === 'playing') {
      event.preventDefault();
      this.game.keys[key] = true;
      return;
    }
    if (event.repeat) return;
    // 保留按钮、链接的空格激活，避免焦点在技能上时误触闪避。
    if (event.code === 'Space' && event.target.closest('button, a, summary, [role="button"]')) return;
    const control = controlAction(event.code, this.game.state);
    if (control) {
      event.preventDefault();
      this.actions[control]();
      return;
    }
    const action = digitAction(key, this.game.state);
    if (!action) return;
    event.preventDefault();
    this.actions[action](Number(key) - 1);
  }

  pointerStart(event) {
    if (this.game.state !== 'playing' || this.pointer !== null) return;
    event.preventDefault();
    this.pointer = event.pointerId;
    this.joystick.setPointerCapture(event.pointerId);
    this.pointerMove(event);
  }

  pointerMove(event) {
    if (this.pointer !== event.pointerId) return;
    const rect = this.joystick.getBoundingClientRect();
    const travel = rect.width * KNOB_TRAVEL;
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y);
    const ratio = length > travel ? travel / length : 1;
    this.game.joyDir = { x: x * ratio / travel, y: y * ratio / travel };
    this.knob.style.transform = `translate(${x * ratio}px, ${y * ratio}px)`;
  }

  clear() {
    const pointer = this.pointer;
    this.pointer = null;
    this.game.keys = {};
    this.game.joyDir = null;
    this.knob.style.transform = '';
    if (pointer !== null && this.joystick.hasPointerCapture(pointer)) this.joystick.releasePointerCapture(pointer);
  }

  dispose() {
    this.clear();
    this.controller.abort();
  }
}
