import { CFG, TAU, TERRAINS, BOSS_TYPES, BOSS_VARIANTS } from './knife-data.js?v=35';

export const SpawningMethods = {
  nextWave() {
    this.wave++;
    this.waveTimer = CFG.waveDuration;
    this.waveTransition = 90;
    this.enemiesKilledThisWave = 0;
    this.sound.play('wave');
    if (this.player && this.wave > 1 && this.player.hp < this.player.maxHp * 0.45) {
      const heal = Math.max(1, Math.floor(this.player.maxHp * 0.06));
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.notify(`波次补给：回复${heal}生命`, 'success', 1200);
    }

    // 地形切换：每10波
    if (this.wave > 1 && (this.wave - 1) % 10 === 0) {
      const tIdx = Math.floor((this.wave - 1) / 10) % TERRAINS.length;
      this.terrain = TERRAINS[tIdx];
    }

    if (this._bossRush || this.wave % CFG.bossEvery === 0) {
      this.spawnBoss();
    } else {
      // 非Boss波有概率刷精英怪
    if (this.wave >= 3 && this.random() < Math.min(0.55, 0.25 + this.wave * 0.02)) {
        const eliteCount = this.random() < 0.3 ? 2 : 1;
        for (let i = 0; i < eliteCount; i++) this.spawnElite();
      }
    }

    // 第3波后生成环境危害
    if (this.wave > 3) {
      const hazardCount = this.random() < 0.3 ? 2 : 1;
      for (let i = 0; i < hazardCount; i++) this.spawnHazard();
    }

    // 仙缘祝福：每6波（非Boss波）触发一次选择
    if (!this._bossRush && this.wave % CFG.bossEvery !== 0 && this.wave > 1 && this.wave % 6 === 0) {
      this._triggerBlessingChoice();
    }

    this.spawnInterval = Math.max(
      CFG.enemySpawnMin,
      Math.floor((CFG.enemySpawnInterval - this.wave * 3) * this.diff.spawnMul)
    );
  },

  spawnBoss() {
    const bossWaveNum = this._bossRush ? this.wave : Math.floor(this.wave / CFG.bossEvery);
    const idx = (bossWaveNum - 1) % BOSS_TYPES.length;
    const bt = BOSS_TYPES[idx];
    const a = this.random() * TAU;
    const d = 380;

    // Boss进化: 循环次数决定变体
    const cycle = Math.floor((bossWaveNum - 1) / BOSS_TYPES.length); // 0=首轮
    let bossData = { ...bt, skills: [...bt.skills] };
    let namePrefix = '';
    let nameSuffix = '';

    if (cycle > 0) {
      // 每轮循环应用一个变体
      const variant = BOSS_VARIANTS[(cycle - 1) % BOSS_VARIANTS.length];
      bossData.hp = Math.floor(bossData.hp * variant.hpMul * (1 + cycle * 0.2));
      bossData.speed *= variant.spdMul;
      bossData.dmg = Math.floor(bossData.dmg * variant.dmgMul);
      bossData.xp = Math.floor(bossData.xp * (1 + cycle * 0.3));
      namePrefix = variant.prefix;
      if (variant.extraSkill) bossData.skills.push(variant.extraSkill);
      if (cycle >= 2) nameSuffix = ' ' + (cycle <= 5 ? ['II', 'III', 'IV', 'V'][cycle - 2] : 'Lv.' + cycle);
    }

    bossData.name = namePrefix + bossData.name + nameSuffix;

    const boss = this.entities.enemy({ x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d, type: bossData, waveScale: 1 + this.wave * 0.12, diff: this.diff });
    boss.isBoss = true;
    boss._bossVariantSkills = bossData.skills; // 记录变体技能
    this.placeEntity(boss, boss);
    this.enemies.push(boss);
  },

  spawnEnemy() {
    if (this.enemies.length >= CFG.maxEnemiesAlive) return;
    const a = this.random() * TAU;
    const d = 380 + this.random() * 120;
    const ex = this.player.x + Math.cos(a) * d;
    const ey = this.player.y + Math.sin(a) * d;

    const types = ['pawn', 'pawn'];  // 更多小兵 → 割草感
    if (this.wave >= 2) types.push('swordsman');
    if (this.wave >= 2) types.push('pawn');
    if (this.wave >= 3) types.push('archer');
    if (this.wave >= 4) types.push('brute');
    if (this.wave >= 5) types.push('ninja');
    if (this.wave >= 6) types.push('swordsman', 'ninja');

    const type = this.pick(types);
    const waveScale = 1 + this.wave * 0.1;
    const enemy = this.entities.enemy({ x: ex, y: ey, type, waveScale, diff: this.diff });
    this.placeEntity(enemy, enemy);
    this.enemies.push(enemy);
  },

  spawnElite() {
    const a = this.random() * TAU;
    const d = 350 + this.random() * 100;
    const ex = this.player.x + Math.cos(a) * d;
    const ey = this.player.y + Math.sin(a) * d;
    const type = this.random() < 0.5 ? 'shadow_assassin' : 'iron_shield';
    const waveScale = 1 + this.wave * 0.12;
    const elite = this.entities.enemy({ x: ex, y: ey, type: type, waveScale: waveScale, diff: this.diff });
    this.placeEntity(elite, elite);
    this.enemies.push(elite);
  },

  spawnHazard() {
    const position = this.spawnPosition({ minimum: 100, maximum: 420 });
    this.hazards.push({ ...position, type: this.pick(['fire', 'poison', 'ice']),
      radius: this.rnd(40, 60), life: 900, maxLife: 900, dmgTimer: 0 });
  },

  spawnChest() {
    const position = this.spawnPosition({ minimum: 60, maximum: 350 });
    const chest = { ...position, type: this.pick(['gold', 'heal', 'exp']),
      radius: 14, bobPhase: this.random() * TAU, alive: true };
    this.placeEntity(chest, chest);
    this.chests.push(chest);
  },

  spawnPosition({ minimum, maximum }) {
    const direction = this.random() * TAU;
    const distance = this.rnd(minimum, maximum);
    return { x: this.player.x + Math.cos(direction) * distance,
      y: this.player.y + Math.sin(direction) * distance };
  },
};
