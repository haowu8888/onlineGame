import { CFG } from './knife-data.js?v=35';

const SKILL_ACTIONS = Object.freeze({
  sword_qi: 'castSwordQi', shadow_clone: 'castShadowClone', golden_bell: 'castGoldenBell',
  whirlwind: 'castWhirlwind', thunder: 'castThunder', blade_burst: 'castBladeBurst',
});

export const SkillMethods = {
  activateDash() {
    if (this.state !== 'playing' || !this.player.startDash(this.keys, this.joyDir)) return false;
    this.sound.play('dash');
    this.emitParticleRing({ origin: this.player, count: 8, speed: 1.8, color: '#bce8db', size: 2 });
    return true;
  },

  activateSkill(index) {
    const skill = this.skills[index];
    if (this.state !== 'playing' || !skill?.unlocked || skill.currentCooldown > 0) return false;
    skill.currentCooldown = skill.cooldown;
    skill.active = true;
    skill.activeTimer = skill.duration;
    const action = SKILL_ACTIONS[skill.id];
    if (action) this[action]();
    return true;
  },

  updateSkillTimers() {
    for (const skill of this.skills) {
      if (skill.currentCooldown > 0) skill.currentCooldown--;
      if (skill.activeTimer > 0) skill.activeTimer--;
      if (skill.activeTimer > 0) continue;
      skill.active = false;
      if (skill.id === 'blade_burst' && this._bladeBurstExtra) {
        this.player.bladeCount = Math.max(1, this.player.bladeCount - this._bladeBurstExtra);
        this._bladeBurstExtra = 0;
      }
    }
    this._timeSlowActive = this.skills.some(skill => skill.id === 'time_slow' && skill.active);
    if (!this.shadowClone) return;
    this.shadowClone.life--;
    if (this.shadowClone.life <= 0 || this.shadowClone.hp <= 0) this.shadowClone = null;
  },

  castSwordQi() {
    for (let index = -2; index <= 2; index++) {
      const direction = this.player.facingAngle + index * 0.15;
      this.swordQiProjectiles.push({ x: this.player.x, y: this.player.y,
        vx: Math.cos(direction) * 8, vy: Math.sin(direction) * 8,
        life: 60, dmg: this.player.bladeDmg * 2 });
    }
  },

  castShadowClone() {
    this.shadowClone = { x: this.player.x, y: this.player.y, life: 180, hp: 1 };
  },

  castGoldenBell() {
    this.player.invincible = Math.max(this.player.invincible, 180);
  },

  castWhirlwind() {
    const RANGE = 120;
    for (const enemy of this.enemies) {
      if (!enemy.alive || (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2 >= RANGE ** 2) continue;
      this.damageEnemy({ enemy, damage: this.player.bladeDmg * 3, color: '#4ad4d4' });
    }
    this.emitParticleRing({ origin: this.player, count: 20, speed: 4, radius: 40, color: '#4ad4d4', size: 5 });
  },

  castThunder() {
    const targets = this.shuffle(this.enemies.filter(enemy => enemy.alive)).slice(0, 8);
    for (const enemy of targets) {
      this.damageEnemy({ enemy, damage: this.player.bladeDmg * 4, color: '#ffff44', isCrit: true });
      this.emitParticles({ origin: enemy, count: 8, spread: 5, speed: 2, color: '#ffff44', size: 3 });
    }
  },

  castBladeBurst() {
    this.player.bladeCount += 3;
    this._bladeBurstExtra = 3;
  },

  updateSwordQi() {
    for (const projectile of this.swordQiProjectiles) {
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      projectile.life--;
      const outside = projectile.x < this.cameraX - 100 || projectile.x > this.cameraX + CFG.canvasW + 100
        || projectile.y < this.cameraY - 100 || projectile.y > this.cameraY + CFG.canvasH + 100;
      if (projectile.life <= 0 || outside) { projectile.life = 0; continue; }
      this.checkSwordQiHits(projectile);
    }
    this.swordQiProjectiles = this.swordQiProjectiles.filter(projectile => projectile.life > 0);
  },

  checkSwordQiHits(projectile) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if ((enemy.x - projectile.x) ** 2 + (enemy.y - projectile.y) ** 2 >= (enemy.radius + 5) ** 2) continue;
      this.damageEnemy({ enemy, damage: projectile.dmg, color: '#4ad4ff' });
    }
  },
};
