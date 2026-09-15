import './knife-clock.js?v=34';
import { KnifeMenu } from './knife-menu.js?v=34';
import { KnifeChoices } from './knife-choices.js?v=34';
import { KnifeHUD } from './knife-hud.js?v=34';
import { KnifeInput } from './knife-input.js?v=34';

const HUD_INTERVAL_MS = 100;
const CHOICE_STATES = new Set(['upgrading', 'blessing']);

export class KnifeUI {
  constructor({ game, renderer, ...menuOptions }) {
    this.game = game;
    this.renderer = renderer;
    this.container = document.getElementById('knife-arena');
    this.canvas = document.getElementById('knife-canvas');
    this.stage = document.getElementById('knife-stage');
    this.status = document.getElementById('arena-status');
    this.pauseButton = document.getElementById('knife-pause');
    this.dashButton = document.getElementById('knife-dash');
    this.fullscreenButton = document.getElementById('knife-fullscreen');
    this.settings = this.createSettings();
    this.menu = new KnifeMenu({ game, ...menuOptions });
    this.clock = KnifeClock.createFixedStepper({ update: () => game.update() });
    this.choices = new KnifeChoices({ game, onChoose: () => this.afterChoice() });
    this.hud = new KnifeHUD({ game, activateSkill: index => this.activateSkill(index) });
    this.input = new KnifeInput({ game, actions: this.inputActions() });
    this.controller = new AbortController();
    this.lastState = null;
    this.lastHudTime = -HUD_INTERVAL_MS;
    this.running = false;
    this.failed = false;
    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stage);
    this.resize();
    this.syncState();
    this.renderer.render(this.game);
    this.menu.startButton.disabled = false;
    this.startLoop();
  }

  createSettings() {
    const schema = [
      { key: 'difficulty', label: '下一局难度', type: 'select', default: 'normal',
        options: [{ value: 'easy', label: '简单' }, { value: 'normal', label: '普通' }, { value: 'hard', label: '困难' }] },
      { key: 'showDmg', label: '战斗反馈', type: 'checkbox', default: true, checkLabel: '显示伤害数字' },
    ];
    return new SettingsModal(schema, 'knife_settings');
  }

  inputActions() {
    return {
      pause: () => this.pause(), resume: () => this.resume(), togglePause: () => this.togglePause(),
      choose: index => this.choices.choose(index), activateSkill: index => this.activateSkill(index),
      dash: () => this.activateDash(),
    };
  }

  bindEvents() {
    const options = { signal: this.controller.signal };
    this.menu.startButton.addEventListener('click', () => this.primaryAction(), options);
    this.pauseButton.addEventListener('click', () => this.togglePause(), options);
    this.dashButton.addEventListener('click', () => this.activateDash(), options);
    this.fullscreenButton.addEventListener('click', () => this.toggleFullscreen(), options);
    this.fullscreenButton.hidden = !document.fullscreenEnabled;
    document.addEventListener('fullscreenchange', () => this.resize(), options);
    this.canvas.addEventListener('arena-render-error', event => this.fail(event.detail), options);
    document.addEventListener('visibilitychange', () => this.visibilityChanged(), options);
    window.addEventListener('pagehide', event => {
      this.pause();
      this.stopLoop();
      if (!event.persisted) this.dispose();
    }, options);
    window.addEventListener('pageshow', event => { if (event.persisted) this.startLoop(); }, options);
  }

  primaryAction() {
    if (this.failed) return;
    if (this.game.state === 'paused') { this.resume(); return; }
    if (!['menu', 'over'].includes(this.game.state)) return;
    try {
      this.input.clear();
      this.game.activeModifiers = this.menu.getSelectedModifiers();
      this.game.setDifficulty(this.settings.get('difficulty'));
      this.game.start();
      this.menu.result = null;
      this.clock.reset();
      this.syncState();
      this.hud.render();
      this.canvas.focus({ preventScroll: true });
    } catch (error) { this.fail(error); }
  }

  pause() {
    this.input?.clear();
    this.clock.reset();
    if (this.game.state !== 'playing') return;
    this.game.state = 'paused';
    this.syncState();
    this.hud.render();
  }

  resume() {
    if (this.failed || this.game.state !== 'paused') return;
    this.input.clear();
    this.clock.reset();
    this.game.state = 'playing';
    this.syncState();
    this.canvas.focus({ preventScroll: true });
  }

  togglePause() {
    if (this.game.state === 'paused') this.resume();
    else this.pause();
  }

  activateSkill(index) {
    if (this.game.state !== 'playing') return;
    const skill = this.game.skills[index];
    if (!skill?.unlocked || skill.currentCooldown > 0) return;
    try { this.game.activateSkill(index); }
    catch (error) { this.fail(error); }
  }

  activateDash() {
    try {
      if (this.game.activateDash()) this.hud.render();
    } catch (error) { this.fail(error); }
  }

  afterChoice() {
    this.clock.reset();
    this.input.clear();
    this.syncState(true);
    if (this.game.state === 'playing') this.canvas.focus({ preventScroll: true });
  }

  syncState(force = false) {
    const state = this.game.state;
    if (!force && state === this.lastState) return;
    this.lastState = state;
    this.needsRender = true;
    this.container.dataset.state = state;
    this.pauseButton.disabled = !['playing', 'paused'].includes(state);
    this.pauseButton.textContent = state === 'paused' ? '继续' : '暂停';
    this.pauseButton.setAttribute('aria-pressed', String(state === 'paused'));
    this.choices.close();
    if (CHOICE_STATES.has(state)) {
      this.input.clear();
      this.menu.hide();
      this.choices.show();
      return;
    }
    if (state === 'over') this.menu.recordResult();
    if (state === 'playing') this.menu.hide();
    else this.menu.show(state);
  }

  resize() {
    if (this.failed) return;
    this.renderer.resize({ width: this.stage.clientWidth, height: this.stage.clientHeight });
    this.needsRender = true;
    const fullscreen = Boolean(document.fullscreenElement);
    this.fullscreenButton.textContent = fullscreen ? '退出全屏' : '全屏';
    this.fullscreenButton.setAttribute('aria-pressed', String(fullscreen));
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.container.requestFullscreen();
    } catch (error) {
      console.error('[KnifeGame] fullscreen failed:', error);
      showToast(`无法进入全屏：${error.message}`, 'error');
    }
  }

  visibilityChanged() {
    if (document.hidden) { this.pause(); this.stopLoop(); }
    else this.startLoop();
  }

  startLoop() {
    if (this.running || this.failed || document.hidden) return;
    this.running = true;
    this.clock.reset();
    this.raf = requestAnimationFrame(timestamp => this.frame(timestamp));
  }

  stopLoop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.clock.reset();
  }

  frame(timestamp) {
    if (!this.running) return;
    try {
      if (this.game.state === 'playing') this.clock.tick(timestamp);
      else this.clock.reset();
      this.syncState();
      const animating = this.game.state === 'playing'
        || (this.game.state === 'menu' && this.renderer.isMotionEnabled());
      if (animating || this.needsRender) {
        this.renderer.render(this.game, { timestamp, showDamage: this.settings.get('showDmg') });
        this.needsRender = false;
      }
      if (timestamp - this.lastHudTime >= HUD_INTERVAL_MS) {
        this.hud.render();
        this.lastHudTime = timestamp;
      }
      this.raf = requestAnimationFrame(next => this.frame(next));
    } catch (error) { this.fail(error); }
  }

  fail(error) {
    this.failed = true;
    this.stopLoop();
    this.input.clear();
    this.status.hidden = false;
    this.status.classList.add('arena-error');
    this.status.textContent = `战场中断：${error.message}。请刷新页面重试。`;
    this.menu.startButton.disabled = true;
    this.pauseButton.disabled = true;
    console.error('[KnifeGame] stopped:', error);
  }

  snapshot() {
    const { player, state, skills, pendingUpgrades, pendingBlessings } = this.game;
    return Object.freeze({
      state, frames: this.game.totalFrames || 0, wave: this.game.wave || 0,
      enemies: this.game.enemies?.filter(enemy => enemy.alive).length || 0,
      player: player ? Object.freeze({ x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp,
        level: player.level, kills: player.kills, blades: player.bladeCount,
        dash: Object.freeze({ ...player.dash, direction: Object.freeze({ ...player.dash.direction }) }) }) : null,
      skills: (skills || []).map(({ id, name, unlocked, active, currentCooldown }) => ({ id, name, unlocked, active, currentCooldown })),
      choices: (state === 'blessing' ? pendingBlessings : pendingUpgrades || []).map(({ name }) => name),
      renderer: this.renderer.getDiagnostics(), failed: this.failed,
    });
  }

  dispose() {
    this.stopLoop();
    this.resizeObserver.disconnect();
    this.input.dispose();
    this.controller.abort();
    this.settings.destroy();
    this.renderer.dispose();
  }
}
