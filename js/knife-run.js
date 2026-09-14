import { CFG, TERRAINS, PLAYER_SKILLS, PERM_UPGRADES } from './knife-data.js?v=33';

export const RunMethods = {
  resetRun() {
    Object.assign(this, {
      player: this.entities.player({ x: 0, y: 0 }), enemies: [], projectiles: [], pickups: [],
      dmgTexts: [], particles: [], bladeTrails: [], dashTrails: [], swordQiProjectiles: [], chests: [], hazards: [],
      skills: PLAYER_SKILLS.map(skill => ({ ...skill, currentCooldown: 0, active: false, activeTimer: 0 })),
      shadowClone: null, chestTimer: 0, wave: 0, waveTimer: 0, waveTransition: 0, spawnTimer: 0,
      upgradeQueue: 0, pendingUpgrades: [], pendingBlessings: [], _blessingsTaken: {}, totalFrames: 0,
      spawnInterval: CFG.enemySpawnInterval, bossFlash: 0, killCombo: 0, killComboTimer: 0,
      cameraX: -CFG.canvasW / 2, cameraY: -CFG.canvasH / 2, shakeX: 0, shakeY: 0,
      goldPickups: [], runGold: 0, _enemySpeedMul: 1, _noUpgrade: false, _bossRush: false,
      terrain: TERRAINS[0], _terrainDotTimer: 0, _bladeBurstExtra: 0, _timeSlowActive: false,
    });
  },

  start() {
    this.resetRun();
    this.applyMetaBonuses();
    this.applyLinkedBonuses();
    this.applyExchangeBonuses();
    for (const modifier of this.activeModifiers) modifier.apply(this);
    this.state = 'playing';
    this.nextWave();
    this.achievements.trackStat('games_played_knife', true);
    this.achievements.trackStat('knife_games_played', this.metaProgress.load().gamesPlayed + 1);
  },

  applyMetaBonuses() {
    const bonus = this.metaProgress.getStartBonuses();
    const player = this.player;
    player.hp += bonus.startHp;
    player.maxHp += bonus.startHp;
    player.bladeDmg += bonus.startDmg;
    player.speed *= bonus.speedMult;
    player.pickupRange += bonus.pickupRange;
    const skill = this.skills.find(item => item.id === bonus.startSkill);
    if (skill) skill.unlocked = true;
    const levels = this.metaProgress.load().permLevels;
    for (const upgrade of PERM_UPGRADES) {
      for (let level = 0; level < (levels[upgrade.id] ?? 0); level++) upgrade.apply(player);
    }
  },

  applyLinkedBonuses() {
    this.rewards.checkAndClaim('knife');
    for (const reward of this.rewards.getActiveRewards('knife')) {
      if (reward.reward.type === 'extra_blade') this.player.bladeCount += reward.reward.value;
    }
  },

  applyExchangeBonuses() {
    const bonuses = this.storage.get('xianyuan_knife_bonuses', { hp: 0, heal_next: 0, goldMul: 1 });
    const temporaryHp = bonuses.heal_next ?? 0;
    if (temporaryHp > 0) {
      this.storage.setManyImmediate({ xianyuan_knife_bonuses: { ...bonuses, heal_next: 0 } });
    }
    // 旧存档字段沿用 heal_next；满血开局时同时增加上限，确保回春符有实际收益。
    const extraHp = (bonuses.hp ?? 0) + temporaryHp;
    this.player.maxHp += extraHp;
    this.player.hp += extraHp;
    this._xianyuanGoldMul = bonuses.goldMul ?? 1;
  },

  resolveDeath() {
    if (this.player.alive) return;
    if (this.player.reviveCharges > 0) {
      this.player.reviveCharges--;
      this.player.alive = true;
      this.player.hp = Math.max(1, Math.floor(this.player.maxHp * 0.35));
      this.player.invincible = Math.max(this.player.invincible, 90);
      this.addShake(10);
      this.sound.play('heal');
      this.notify('涅槃复生！', 'success', 1200);
      return;
    }
    const multiplier = this.activeModifiers.reduce((value, modifier) => value * (modifier.goldMul ?? 1), this._xianyuanGoldMul);
    const gold = Math.floor(this.runGold * multiplier);
    if (gold > 0) this.metaProgress.addGold(gold);
    this.player.goldEarned = gold;
    this.state = 'over';
    this.sound.play('defeat');
  },

  getTimeStr() {
    const FRAMES_PER_SECOND = 60;
    const SECONDS_PER_MINUTE = 60;
    const seconds = Math.floor(this.totalFrames / FRAMES_PER_SECOND);
    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}`;
  },
};
