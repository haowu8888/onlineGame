import { CFG } from './knife-data.js?v=34';
import { compactAlive } from './knife-math.js?v=34';

export const FrameMethods = {
  update() {
    if (this.state !== 'playing') return;
    this.totalFrames++;
    this.updateRunTimers();
    if (this.state !== 'playing') return;
    this.updateSpawnTimers();
    this.updatePlayerMovement();
    this.updateSkillTimers();
    this.updateSwordQi();
    this.updateCamera();
    this.updateEnemyPositions();
    this._separateEnemies();
    for (const projectile of this.projectiles) projectile.update();
    this.updatePickups();
    this.updateHazards();
    this.applyTerrainEffects();
    this.updateChests();
    this.updateFeedback();
    this.checkBladeHits();
    this.checkEnemyPlayerCollision();
    this.checkProjectileHits();
    this.checkPickupCollection();
    this._checkGoldPickups();
    this._handleBossSkills();
    this.shootRangedEnemies();
    this.removeDeadEntities();
    this.resolveDeath();
  },

  updateRunTimers() {
    this.shakeX *= CFG.shakeDecay;
    this.shakeY *= CFG.shakeDecay;
    const SHAKE_EPSILON = 0.2;
    if (Math.abs(this.shakeX) < SHAKE_EPSILON) this.shakeX = 0;
    if (Math.abs(this.shakeY) < SHAKE_EPSILON) this.shakeY = 0;
    if (this.bossFlash > 0) this.bossFlash--;
    if (this.killComboTimer > 0) this.killComboTimer--;
    else this.killCombo = 0;
    if (this.waveTransition > 0) this.waveTransition--;
    this.waveTimer--;
    if (this.waveTimer <= 0) this.nextWave();
  },

  updateSpawnTimers() {
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const count = Math.min(1 + Math.floor(this.wave * 0.4), 4);
      for (let index = 0; index < count; index++) this.spawnEnemy();
    }
    const CHEST_INTERVAL = 900;
    this.chestTimer++;
    if (this.chestTimer >= CHEST_INTERVAL) {
      this.chestTimer = 0;
      this.spawnChest();
    }
  },

  removeDeadEntities() {
    this.enemies = compactAlive(this.enemies);
    this.projectiles = compactAlive(this.projectiles);
    this.pickups = compactAlive(this.pickups);
    this.dmgTexts = compactAlive(this.dmgTexts);
    this.goldPickups = compactAlive(this.goldPickups);
  },
};
