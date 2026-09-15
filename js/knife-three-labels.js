import * as THREE from './vendor/three.module.js?v=34';
import { ARENA, worldPosition } from './knife-three-config.js?v=34';

const LABEL = Object.freeze({
  normalSize: 14, criticalSize: 19, comboSize: 19,
  lift: 2.1, fadeFraction: 0.3, comboThreshold: 2,
  comboRight: 24, comboTop: 108, mobileComboTop: 173, mobileWidth: 760,
});

export class ArenaLabels {
  constructor({ canvas, camera }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.camera = camera;
    this.vector = new THREE.Vector3();
  }

  resize({ width, height, pixelRatio }) {
    this.width = width;
    this.height = height;
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  project(entity, center, height = LABEL.lift) {
    const position = worldPosition(entity, center);
    this.vector.set(position.x, height, position.z).project(this.camera);
    return { x: (this.vector.x + 1) * this.width / 2, y: (1 - this.vector.y) * this.height / 2 };
  }

  render({ game, center, showDamage, motion }) {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);
    if (!game.player) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#102028';
    ctx.lineWidth = 3;
    if (showDamage) (game.dmgTexts || []).forEach(item => this.drawDamage(item, center));
    ctx.globalAlpha = 1;
    if (game.killCombo >= LABEL.comboThreshold) this.drawCombo(game);
    (game.enemies || []).filter(enemy => enemy.alive && (enemy.isBoss || enemy.isElite))
      .forEach(enemy => this.drawName(enemy, center));
    if (game._timeSlowActive) {
      ctx.fillStyle = 'rgba(100,160,255,0.06)';
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (motion && game.bossFlash > 0) {
      ctx.fillStyle = 'rgba(239,199,125,' + game.bossFlash * 0.025 + ')';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  drawDamage(item, center) {
    const ctx = this.context;
    const position = this.project(item, center);
    ctx.globalAlpha = Math.min(1, item.life / (item.maxLife * LABEL.fadeFraction));
    ctx.font = '700 ' + (item.isCrit ? LABEL.criticalSize : LABEL.normalSize) + 'px system-ui';
    ctx.fillStyle = item.color;
    ctx.strokeText(item.text, position.x, position.y);
    ctx.fillText(item.text, position.x, position.y);
  }

  drawCombo(game) {
    const ctx = this.context;
    const x = this.width - LABEL.comboRight;
    const y = this.width < LABEL.mobileWidth ? LABEL.mobileComboTop : LABEL.comboTop;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#29443cbd';
    ctx.beginPath();
    ctx.roundRect(x - 76, y - 21, 88, 42, 7);
    ctx.fill();
    ctx.font = '700 ' + LABEL.comboSize + 'px system-ui';
    ctx.fillStyle = '#f1d09a';
    ctx.fillText(game.killCombo + ' 连斩', x, y);
    ctx.textAlign = 'center';
  }

  drawName(enemy, center) {
    const ctx = this.context;
    const position = this.project(enemy, center, enemy.radius / 16 * 2.6);
    ctx.font = '600 12px "LXGW WenKai", serif';
    ctx.fillStyle = enemy.isBoss ? '#f3ad8d' : '#d6c8ef';
    ctx.strokeText(enemy.name, position.x, position.y);
    ctx.fillText(enemy.name, position.x, position.y);
  }
}
