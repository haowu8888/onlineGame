import { CFG } from './knife-data.js?v=34';
import { angle, dist, lineCircleIntersect } from './knife-math.js?v=34';

export const CombatMethods = {
  checkBladeHits() {
    const blades = this.player.getBladeEndpoints();
    for (const blade of blades) this.bladeTrails.push({ ...blade, life: 1 });
    const TRAIL_LIMIT = 200;
    const TRAIL_RETAINED = 100;
    if (this.bladeTrails.length > TRAIL_LIMIT) this.bladeTrails = this.bladeTrails.slice(-TRAIL_RETAINED);
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.bladeHitCD > 0) continue;
      if (blades.some(blade => lineCircleIntersect(blade, enemy))) this.applyBladeHit(enemy);
    }
  },

  applyBladeHit(enemy) {
    const critical = this.random() < this.player.critChance;
    let damage = critical ? Math.floor(this.player.bladeDmg * 2.5) : this.player.bladeDmg;
    if (this.terrain.fragile) damage = Math.ceil(damage * this.terrain.fragile);
    const color = critical ? '#ff4444' : '#ffd700';
    const actual = this.damageEnemy({ enemy, damage, color, isCrit: critical });
    enemy.bladeHitCD = CFG.bladeHitCD;
    const direction = angle(this.player, enemy);
    const distance = enemy.isBoss ? 3 : 6;
    this.moveEntityBy(enemy, { x: Math.cos(direction) * distance, y: Math.sin(direction) * distance });
    this.emitParticles({ origin: enemy, count: critical ? 6 : 3, speed: 2, color });
    if (this.skills.some(skill => skill.id === 'lifesteal' && skill.active)) {
      this.healPlayer(Math.max(1, Math.floor(actual * 0.25)), '#ff6699');
    }
  },

  damageEnemy({ enemy, damage, color, isCrit = false }) {
    if (!enemy.alive) return 0;
    const actual = enemy.takeDamage(damage);
    this.player.totalDmgDealt += actual;
    this.dmgTexts.push(this.entities.text({ x: enemy.x + this.rnd(-8, 8), y: enemy.y - enemy.radius, text: String(actual), color, isCrit }));
    if (!enemy.alive) this.onEnemyDeath(enemy);
    return actual;
  },

  checkEnemyPlayerCollision() {
    for (const enemy of this.enemies) {
      if (!enemy.alive || !this.player.collides(enemy)) continue;
      if (!this.player.takeDamage(enemy.dmg)) continue;
      this.addShake(enemy.isBoss ? 10 : 5);
      if (this.player.thorns > 0) this.damageEnemy({ enemy, damage: this.player.thorns, color: '#ffd700' });
      const direction = angle(this.player, enemy);
      const knockback = 25;
      this.moveEntityBy(enemy, { x: Math.cos(direction) * knockback, y: Math.sin(direction) * knockback });
    }
  },

  checkProjectileHits() {
    for (const p of this.projectiles) {
      if (!p.alive || !p.fromEnemy) continue;
      if (p.type === 'slam') continue; // slam已在_handleBossSkills处理
      if (p.type === 'poison') {
        // 毒圈持续伤害（每60帧一次）
        if (p.life % 60 === 0 && dist(p, this.player) < p.radius) {
          this.player.takeDamage(p.dmg);
        }
        continue;
      }
      if (this.player.collides(p)) {
        this.player.takeDamage(p.dmg);
        p.alive = false;
        this.addShake(3);
      }
    }
  },

  _separateEnemies() {
    const enemies = this.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const minD = a.radius + b.radius;
        const dSq = dx * dx + dy * dy;
        if (dSq < minD * minD && dSq > 0.01) {
          const d = Math.sqrt(dSq);
          const overlap = (minD - d) * 0.3;
          const nx = dx / d, ny = dy / d;
          this.moveEntityBy(a, { x: nx * overlap, y: ny * overlap });
          this.moveEntityBy(b, { x: -nx * overlap, y: -ny * overlap });
        }
      }
    }
  },
};
