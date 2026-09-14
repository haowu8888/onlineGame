import { CFG } from './knife-data.js?v=33';
import { angle, dist, lerp } from './knife-math.js?v=33';
import { resolveMovement, resolveObstacles } from './knife-scenery.js?v=33';

export const WorldMethods = {
  updatePlayerMovement() {
    const speed = this.player.speed;
    const previous = { x: this.player.x, y: this.player.y };
    const dashing = this.player.dash.frames > 0;
    if (this.terrain.id === 'ice') this.player.speed *= this.terrain.slowMul;
    this.player.update(this.keys, this.joyDir);
    Object.assign(this.player, resolveMovement(this.player, previous, this.obstacles));
    if (dashing) this.dashTrails.push({ x1: previous.x, y1: previous.y, x2: this.player.x, y2: this.player.y, life: 1 });
    this.player.speed = speed;
  },

  moveEntityBy(entity, movement) {
    const target = { x: entity.x + movement.x, y: entity.y + movement.y, radius: entity.radius };
    Object.assign(entity, resolveMovement(target, entity, this.obstacles));
  },

  placeEntity(entity, position) {
    Object.assign(entity, resolveObstacles({ x: position.x, y: position.y, radius: entity.radius }, this.obstacles));
  },

  updateCamera() {
    const FOLLOW_RATE = 0.1;
    this.cameraX = lerp(this.cameraX, this.player.x - CFG.canvasW / 2, FOLLOW_RATE);
    this.cameraY = lerp(this.cameraY, this.player.y - CFG.canvasH / 2, FOLLOW_RATE);
  },

  updateEnemyPositions() {
    const timeMultiplier = this._timeSlowActive ? 0.4 : 1;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const originalSpeed = enemy.speed;
      const previous = { x: enemy.x, y: enemy.y };
      enemy.speed *= timeMultiplier * this._enemySpeedMul;
      const teleported = enemy.update(this.enemyTarget(enemy));
      if (teleported) this.placeEntity(enemy, enemy);
      else Object.assign(enemy, resolveMovement(enemy, previous, this.obstacles));
      enemy.speed = originalSpeed;
    }
  },

  enemyTarget(enemy) {
    if (!this.shadowClone) { enemy._cloneTarget = null; return this.player; }
    if (!enemy._cloneTarget) enemy._cloneTarget = this.random() < 0.5 ? 'clone' : 'player';
    return enemy._cloneTarget === 'clone' ? this.shadowClone : this.player;
  },

  updateHazards() {
    let slowed = false;
    for (const hazard of this.hazards) {
      hazard.life--;
      if (hazard.life <= 0 || dist(hazard, this.player) >= hazard.radius) continue;
      hazard.dmgTimer++;
      if (hazard.type === 'ice') slowed = true;
      else this.applyHazardDamage(hazard);
    }
    this.hazards = this.hazards.filter(hazard => hazard.life > 0);
    if (!slowed) return;
    this.player.vx *= 0.5;
    this.player.vy *= 0.5;
    this.moveEntityBy(this.player, { x: -this.player.vx, y: -this.player.vy });
  },

  applyHazardDamage(hazard) {
    const interval = hazard.type === 'fire' ? 30 : 45;
    if (hazard.dmgTimer % interval !== 0 || !this.player.takeDamage(1)) return;
    const color = hazard.type === 'fire' ? '#ff6633' : '#44cc44';
    this.dmgTexts.push(this.entities.text({ x: this.player.x + this.rnd(-8, 8), y: this.player.y - 20, text: '1', color, isCrit: false }));
  },

  applyTerrainEffects() {
    if (this.terrain.id !== 'lava') return;
    this._terrainDotTimer++;
    if (this._terrainDotTimer < this.terrain.dotInterval) return;
    this._terrainDotTimer = 0;
    if (!this.player.takeDamage(this.terrain.dotDmg)) return;
    this.dmgTexts.push(this.entities.text({ x: this.player.x + this.rnd(-8, 8), y: this.player.y - 25,
      text: String(this.terrain.dotDmg), color: '#ff4400', isCrit: false }));
  },

  shootRangedEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.type.ranged || !enemy.shootCD) continue;
      enemy.shootTimer++;
      if (enemy.shootTimer < enemy.shootCD) continue;
      enemy.shootTimer = 0;
      this.projectiles.push(this.entities.projectile({ x: enemy.x, y: enemy.y,
        angle: angle(enemy, this.player), speed: 2.5, dmg: enemy.dmg, fromEnemy: true }));
    }
  },
};
