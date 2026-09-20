import { TAU, ENEMY_TYPES } from './knife-data.js?v=38';
import { dist } from './knife-math.js?v=38';

export const BossMethods = {
  _handleBossSkills() {
    for (const enemy of [...this.enemies]) {
      if (!enemy.isBoss || !enemy.alive) continue;
      if (enemy.lastSkill === 'slam') this.bossSlam(enemy);
      if (enemy.lastSkill === 'poison') this.bossPoison(enemy);
      const skills = enemy._bossVariantSkills ?? [];
      if (skills.includes('teleport')) this.bossTeleport(enemy);
      if (skills.includes('split')) this.bossSplit(enemy);
      if (skills.includes('areaLock')) this.bossAreaLock(enemy);
    }
  },

  bossSlam(enemy) {
    if (dist(enemy, this.player) < 80) {
      this.player.takeDamage(enemy.dmg);
      this.addShake(12);
    }
    this.emitParticles({ origin: enemy, count: 20, spread: 40, speed: 3, color: '#b8860b' });
    this.projectiles.push(this.entities.projectile({ x: enemy.x, y: enemy.y, angle: 0, speed: 0, dmg: 0, fromEnemy: true, type: 'slam' }));
    enemy.lastSkill = null;
  },

  bossPoison(enemy) {
    this.projectiles.push(this.entities.projectile({ x: this.player.x + this.rnd(-60, 60), y: this.player.y + this.rnd(-60, 60),
      angle: 0, speed: 0, dmg: 1, fromEnemy: true, type: 'poison' }));
    this.emitParticles({ origin: enemy, count: 12, spread: 20, speed: 1, color: '#7b2d8e' });
    enemy.lastSkill = null;
  },

  bossTeleport(enemy) {
    enemy._teleportCD = (enemy._teleportCD ?? 0) - 1;
    if (enemy._teleportCD > 0) return;
    const direction = this.random() * TAU;
    const distance = this.rnd(80, 140);
    this.placeEntity(enemy, { x: this.player.x + Math.cos(direction) * distance,
      y: this.player.y + Math.sin(direction) * distance });
    enemy._teleportCD = Math.floor(this.rnd(180, 300));
    this.emitParticles({ origin: enemy, count: 15, spread: 15, speed: 2, color: '#a040ff' });
  },

  bossSplit(enemy) {
    if (enemy._hasSplit || enemy.hp >= enemy.maxHp * 0.4) return;
    enemy._hasSplit = true;
    const count = 3;
    for (let index = 0; index < count; index++) {
      const direction = TAU * index / count;
      const mini = this.entities.enemy({ x: enemy.x + Math.cos(direction) * 40, y: enemy.y + Math.sin(direction) * 40,
        type: { ...ENEMY_TYPES.brute, name: '分裂体', color: enemy.color, hp: Math.floor(enemy.maxHp * 0.15) },
        waveScale: 1 + this.wave * 0.1, diff: this.diff });
      mini.isElite = true;
      this.placeEntity(mini, mini);
      this.enemies.push(mini);
    }
    this.addShake(8);
  },

  bossAreaLock(enemy) {
    enemy._areaLockCD = (enemy._areaLockCD ?? 0) - 1;
    if (enemy._areaLockCD > 0) return;
    enemy._areaLockCD = Math.floor(this.rnd(240, 360));
    this.hazards.push({ x: this.player.x + this.rnd(-80, 80), y: this.player.y + this.rnd(-80, 80),
      radius: this.rnd(60, 90), type: 'fire', life: 360, maxLife: 360, dmgTimer: 0 });
  },
};
