import { TAU } from './knife-data.js?v=34';
import { dist, angle } from './knife-math.js?v=34';

const GOLD_CHEST_BASE = 8;
const GOLD_CHEST_PER_WAVE = 2;

export const DropMethods = {
  updatePickups() {
    for (const pickup of this.pickups) {
      pickup.update();
      const distance = dist(pickup, this.player);
      if (distance >= this.player.pickupRange * 2.5) continue;
      const direction = angle(pickup, this.player);
      const pull = Math.max(4, (this.player.pickupRange * 2.5 - distance) * 0.15);
      pickup.x += Math.cos(direction) * pull;
      pickup.y += Math.sin(direction) * pull;
    }
  },

  checkPickupCollection() {
    for (const pickup of this.pickups) {
      if (!pickup.alive || dist(pickup, this.player) >= this.player.pickupRange) continue;
      pickup.alive = false;
      const combo = 1 + Math.min(this.killCombo, 50) * 0.02;
      const levels = this.player.addXp(pickup.xp, combo);
      if (levels <= 0) continue;
      this.emitParticleRing({ origin: this.player, count: 20, speed: 3, color: '#ffd700', size: 4 });
      for (let level = 0; level < levels; level++) this.triggerUpgrade();
    }
  },

  _checkGoldPickups() {
    for (const gp of this.goldPickups) {
      if (!gp.alive) continue;
      gp.life--;
      gp.bobPhase += 0.08;
      if (gp.life <= 0) { gp.alive = false; continue; }
      const d = dist(gp, this.player);
      if (d < this.player.pickupRange * 2) {
        const a = angle(gp, this.player);
        const pull = Math.max(4, (this.player.pickupRange * 2 - d) * 0.15);
        gp.x += Math.cos(a) * pull;
        gp.y += Math.sin(a) * pull;
      }
      if (d < this.player.pickupRange) {
        gp.alive = false;
        this.runGold += gp.amount;
        this.dmgTexts.push(this.entities.text({ x: gp.x + this.rnd(-8, 8), y: gp.y - 10, text: '+' + gp.amount + '金', color: '#ffd700', isCrit: false }));
      }
    }
  },

  updateChests() {
    for (const chest of this.chests) {
      chest.bobPhase += 0.06;
      if (!chest.alive || dist(chest, this.player) >= chest.radius + this.player.radius) continue;
      this.collectChest(chest);
      chest.alive = false;
    }
    this.chests = this.chests.filter(chest => chest.alive);
  },

  collectChest(chest) {
    if (chest.type === 'gold') this.collectGoldChest(chest);
    else if (chest.type === 'heal') this.healPlayer(Math.floor(this.player.maxHp * 0.2), '#44ff44');
    else if (chest.type === 'exp') this.collectExperienceChest(chest);
    const colors = { gold: '#ffd700', heal: '#44ff44', exp: '#4adad4' };
    this.emitParticles({ origin: chest, count: 12, speed: 2, color: colors[chest.type] });
  },

  collectGoldChest(chest) {
    const amount = GOLD_CHEST_BASE + this.wave * GOLD_CHEST_PER_WAVE;
    this.runGold += amount;
    this.sound.play('coin');
    this.dmgTexts.push(this.entities.text({ x: chest.x, y: chest.y - 10,
      text: `+${amount}金币`, color: '#ffd700', isCrit: true }));
  },

  collectExperienceChest(chest) {
    const experience = 5 + this.wave * 2;
    const levels = this.player.addXp(experience);
    this.dmgTexts.push(this.entities.text({ x: chest.x, y: chest.y - 10, text: '+' + experience + 'XP', color: '#4adad4', isCrit: true }));
    for (let level = 0; level < levels; level++) this.triggerUpgrade();
  },

  onEnemyDeath(enemy) {
    if (enemy.alive || enemy.deathHandled) return;
    enemy.deathHandled = true;
    this.player.kills++;
    this.enemiesKilledThisWave++;
    this.killCombo++;
    this.killComboTimer = 90 + this.player.comboBonus;
    this.pickups.push(this.entities.pickup({ x: enemy.x, y: enemy.y, xp: enemy.xp }));
    this.dropEnemyGold(enemy);
    if (this.player.vampireBlade > 0) this.healPlayer(this.player.vampireBlade, '#ff6699');
    if (enemy.isElite) this.dropEliteRewards(enemy);
    if (enemy.isBoss) this.dropBossRewards(enemy);
    this.emitParticles({ origin: enemy, count: enemy.isBoss ? 25 : 18, speed: 3, color: enemy.color });
    this.emitParticles({ origin: enemy, count: 5, speed: 0.75, life: 1.5, color: enemy.color, size: 2 });
  },

  dropEnemyGold(enemy) {
    let amount = this.random() < 0.4 ? 1 : 0;
    if (enemy.isElite) amount = 3 + Math.floor(this.wave * 0.5);
    if (enemy.isBoss) amount = 10 + this.wave * 2;
    if (amount <= 0) return;
    this.goldPickups.push({ x: enemy.x + this.rnd(-8, 8), y: enemy.y + this.rnd(-8, 8),
      amount, life: 420, bobPhase: this.random() * TAU, alive: true });
  },

  dropEliteRewards(enemy) {
    for (let index = 0; index < 3; index++) {
      this.pickups.push(this.entities.pickup({ x: enemy.x + this.rnd(-20, 20), y: enemy.y + this.rnd(-20, 20), xp: Math.ceil(enemy.xp * 0.3) }));
    }
    this.healPlayer(Math.max(1, Math.floor(this.player.maxHp * 0.04)));
  },

  dropBossRewards(enemy) {
    this.addShake(15);
    this.bossFlash = 10;
    this.healPlayer(Math.max(2, Math.floor(this.player.maxHp * 0.08)));
    for (let index = 0; index < 5; index++) {
      this.pickups.push(this.entities.pickup({ x: enemy.x + this.rnd(-30, 30), y: enemy.y + this.rnd(-30, 30), xp: Math.ceil(enemy.xp * 0.2) }));
    }
  },
};
