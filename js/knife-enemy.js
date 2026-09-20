import { TAU, ENEMY_TYPES } from './knife-data.js?v=38';
import { angle } from './knife-math.js?v=38';
import { Entity } from './knife-entities.js?v=38';

/* ---- 敌人 ---- */
export class Enemy extends Entity {
  constructor({ x, y, type, waveScale, diff, random }) {
    const t = typeof type === 'string' ? ENEMY_TYPES[type] : type;
    super(x, y, t.radius);
    this.random = random;
    this.deathHandled = false;
    this.type = t;
    this.name = t.name;
    this.maxHp = Math.ceil(t.hp * waveScale * diff.hpMul);
    this.hp = this.maxHp;
    this.speed = t.speed * diff.spdMul;
    this.dmg = Math.max(1, Math.round(t.dmg * diff.dmgMul));
    this.xp = t.xp;
    this.color = t.color;
    this.isBoss = !!t.skills;
    this.skills = t.skills || [];
    this.hitFlash = 0;
    this.bladeHitCD = 0;       // 被刀刃命中的冷却
    this.shootCD = t.shootCD || 0;
    this.shootTimer = 0;
    this.skillCD = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.dashTimer = 0;
    this.moveAngle = 0;
    // 精英怪属性
    this.isElite = !!t.isElite;
    this.defense = t.defense || 0;
    this.teleportCD = t.teleportCD || 0;
    this.teleportTimer = 0;
  }

  update(player) {
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.bladeHitCD > 0) this.bladeHitCD--;

    if (this.dashTimer > 0) {
      this.x += this.dashVx;
      this.y += this.dashVy;
      this.dashTimer--;
      return false;
    }

    const a = angle(this, player);
    this.moveAngle = a;
    this.x += Math.cos(a) * this.speed;
    this.y += Math.sin(a) * this.speed;

    const teleported = this.updateTeleport(player);
    if (this.isBoss && this.skillCD <= 0) {
      this.useSkill(player);
    }
    if (this.skillCD > 0) this.skillCD--;
    return teleported;
  }

  updateTeleport(player) {
    if (this.teleportCD <= 0) return false;
    this.teleportTimer++;
    if (this.teleportTimer < this.teleportCD) return false;
    this.teleportTimer = 0;
    const direction = this.random() * TAU;
    const distance = 40 + this.random() * 30;
    this.x = player.x + Math.cos(direction) * distance;
    this.y = player.y + Math.sin(direction) * distance;
    return true;
  }

  useSkill(player) {
    const skill = this.skills[Math.floor(this.random() * this.skills.length)];
    const a = angle(this, player);
    this.lastSkill = skill;
    switch (skill) {
      case 'charge':
        this.dashTimer = 25;
        this.dashVx = Math.cos(a) * this.speed * 5;
        this.dashVy = Math.sin(a) * this.speed * 5;
        this.skillCD = 180;
        break;
      case 'dash':
        this.dashTimer = 12;
        this.dashVx = Math.cos(a) * this.speed * 7;
        this.dashVy = Math.sin(a) * this.speed * 7;
        this.skillCD = 120;
        break;
      case 'slam':
        // 震地：对近距离造成伤害
        this.skillCD = 200;
        return 'slam';
      case 'poison':
        // 毒雾：产生毒圈
        this.skillCD = 180;
        return 'poison';
    }
    return null;
  }

  takeDamage(dmg) {
    const actualDmg = Math.max(1, dmg - this.defense);
    this.hp -= actualDmg;
    this.hitFlash = 6;
    if (this.hp <= 0) this.alive = false;
    return actualDmg;
  }
}
