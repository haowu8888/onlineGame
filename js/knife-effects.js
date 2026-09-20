import { TAU } from './knife-data.js?v=38';
import { Entity } from './knife-entities.js?v=38';

/* ---- 弹幕 ---- */
export class Projectile extends Entity {
  constructor({ x, y, angle, speed, dmg, fromEnemy, type }) {
    super(x, y, type === 'poison' ? 30 : 4);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.dmg = dmg;
    this.fromEnemy = fromEnemy;
    this.type = type || 'normal';
    this.life = type === 'poison' ? 300 : type === 'slam' ? 20 : 180;
    this.maxLife = this.life;
  }
  update() {
    if (this.type !== 'slam' && this.type !== 'poison') {
      this.x += this.vx;
      this.y += this.vy;
    }
    this.life--;
    if (this.life <= 0) this.alive = false;
  }
}

/* ---- 掉落物 ---- */
export class Pickup extends Entity {
  constructor({ x, y, xp, random }) {
    super(x, y, 6);
    this.xp = xp;
    this.life = 600;
    this.bobPhase = random() * TAU;
  }
  update() {
    this.life--;
    if (this.life <= 0) this.alive = false;
    this.bobPhase += 0.08;
  }
}

/* ---- 伤害数字 ---- */
export class DmgText {
  constructor({ x, y, text, color, isCrit }) {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.isCrit = isCrit;
    this.life = 45; this.maxLife = 45;
    this.vy = -1.2;
  }
  update() { this.y += this.vy; this.vy *= 0.96; this.life--; }
  get alive() { return this.life > 0; }
}
