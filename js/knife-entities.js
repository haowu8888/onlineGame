import { CFG, TAU } from './knife-data.js?v=38';
import { dist } from './knife-math.js?v=38';
import { MOVEMENT, DASH, movementVector, idleDash, beginDash, advanceDash } from './knife-movement.js?v=38';

/* ---- 实体基类 ---- */
export class Entity {
  constructor(x, y, radius) {
    this.x = x; this.y = y; this.radius = radius;
    this.alive = true;
  }
  collides(other) { return dist(this, other) < this.radius + other.radius; }
}

/* ---- 玩家 ---- */
export class Player extends Entity {
  constructor(x, y, random = Math.random) {
    super(x, y, CFG.playerRadius);
    this.random = random;
    this.maxHp = 100;
    this.hp = 100;
    this.speed = CFG.playerSpeed;
    this.bladeCount = 1;
    this.bladeLen = CFG.baseBladeLen;
    this.bladeSpeed = CFG.baseBladeSpeed;
    this.bladeDmg = CFG.bladeDmg;
    this.bladeAngle = 0;
    this.xp = 0;
    this.level = 1;
    this.pickupRange = CFG.pickupRadius;
    this.thorns = 0;
    this.critChance = 0.05;
    this.dodgeChance = 0;
    this.vampireBlade = 0;
    this.xpMultiplier = 1.0;
    this.comboBonus = 0;
    this.invincible = 0;
    this.hurtFlash = 0;
    this.dash = idleDash();
    this.kills = 0;
    this.totalDmgDealt = 0;
    this.upgradeCounts = {};
    this.vx = 0;
    this.vy = 0;
    this.facingAngle = 0;
    this.goldEarned = 0;
    this.startShield = 0;
    this.reviveCharges = 0;
  }

  xpToNext() {
    const idx = Math.min(this.level - 1, CFG.xpPerLevel.length - 1);
    return CFG.xpPerLevel[idx] + (this.level > CFG.xpPerLevel.length ? (this.level - CFG.xpPerLevel.length) * 25 : 0);
  }

  addXp(amount, comboMult) {
    this.xp += Math.floor(amount * this.xpMultiplier * (comboMult || 1));
    let levelsGained = 0;
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level++;
      levelsGained++;
    }
    return levelsGained;
  }

  update(keys, joyDir) {
    const dashing = this.dash.frames > 0;
    const movement = dashing ? this.dash.direction : movementVector(keys, joyDir);
    if (movement.x || movement.y) {
      const speed = this.speed * (dashing ? DASH.speedMultiplier : 1);
      this.vx = movement.x * speed;
      this.vy = movement.y * speed;
      this.facingAngle = Math.atan2(movement.y, movement.x);
    } else {
      this.vx *= MOVEMENT.friction;
      this.vy *= MOVEMENT.friction;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.bladeAngle = (this.bladeAngle + this.bladeSpeed) % TAU;
    this.dash = advanceDash(this.dash);
    if (this.invincible > 0) this.invincible--;
    if (this.hurtFlash > 0) this.hurtFlash--;
  }

  startDash(keys, joyDir) {
    const next = beginDash({ dash: this.dash, movement: movementVector(keys, joyDir), facing: this.facingAngle });
    if (!next) return false;
    this.dash = next;
    this.invincible = Math.max(this.invincible, DASH.invincibleFrames);
    return true;
  }

  takeDamage(dmg) {
    if (this.invincible > 0) return false;
    // 闪避判定
    if (this.dodgeChance > 0 && this.random() < this.dodgeChance) return false;
    // 护盾判定
    if (this.startShield > 0) { this.startShield--; this.invincible = CFG.invincibleFrames; return false; }
    this.hp -= dmg;
    this.invincible = CFG.invincibleFrames;
    this.hurtFlash = MOVEMENT.hurtFlashFrames;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    return true;
  }

  getBladeEndpoints() {
    const pts = [];
    for (let i = 0; i < this.bladeCount; i++) {
      const a = this.bladeAngle + (TAU / this.bladeCount) * i;
      pts.push({
        x1: this.x, y1: this.y,
        x2: this.x + Math.cos(a) * this.bladeLen,
        y2: this.y + Math.sin(a) * this.bladeLen,
        angle: a,
      });
    }
    return pts;
  }
}
