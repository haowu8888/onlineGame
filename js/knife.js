/* ========== 转转刀 - 武侠肉鸽割草 ========== */
;(function () {
  'use strict';

  const TAU = Math.PI * 2;

  /* ---- 配置 ---- */
  const CFG = {
    canvasW: 800,
    canvasH: 600,
    playerRadius: 16,
    playerSpeed: 2.6,
    baseBladeLen: 65,
    baseBladeSpeed: 0.05,
    bladeDmg: 1,
    bladeHitCD: 12,            // 刀刃对同一敌人的打击冷却（帧）
    xpPerLevel: [10, 16, 24, 36, 52, 72, 92, 115, 140, 170],
    enemySpawnInterval: 60,    // 帧（更快刷怪→割草感）
    enemySpawnMin: 20,
    waveEnemyBase: 10,
    waveDuration: 1800,
    bossEvery: 5,
    maxEnemiesAlive: 80,
    pickupRadius: 35,
    invincibleFrames: 45,
    separationDist: 4,         // 敌人互斥强度
    shakeDecay: 0.85,
  };

  /* ---- 难度倍率 ---- */
  const DIFF = {
    easy:   { hpMul: 0.7, spdMul: 0.8, spawnMul: 1.3, dmgMul: 0.7 },
    normal: { hpMul: 1.0, spdMul: 1.0, spawnMul: 1.0, dmgMul: 1.0 },
    hard:   { hpMul: 1.5, spdMul: 1.2, spawnMul: 0.7, dmgMul: 1.4 },
  };

  /* ---- 敌人类型 ---- */
  const ENEMY_TYPES = {
    pawn:      { name: '小喽啰', hp: 3,  speed: 1.0, radius: 10, dmg: 1, xp: 1, color: '#8B4513' },
    swordsman: { name: '剑客',   hp: 6,  speed: 1.3, radius: 12, dmg: 1, xp: 2, color: '#4a6fa5' },
    archer:    { name: '弓手',   hp: 4,  speed: 0.8, radius: 10, dmg: 1, xp: 2, color: '#6b8e23', ranged: true, shootCD: 120 },
    brute:     { name: '壮汉',   hp: 14, speed: 0.6, radius: 18, dmg: 2, xp: 3, color: '#8b0000' },
    ninja:     { name: '忍者',   hp: 5,  speed: 2.2, radius: 9,  dmg: 1, xp: 3, color: '#2c2c54' },
    // 精英怪
    shadow_assassin: { name: '影刺客', hp: 15, speed: 2.5, radius: 12, dmg: 3, xp: 8, color: '#1a0a2e', isElite: true, teleportCD: 150 },
    iron_shield:     { name: '铁盾兵', hp: 60, speed: 0.4, radius: 20, dmg: 2, xp: 10, color: '#6a6a6a', isElite: true, defense: 2 },
  };

  const BOSS_TYPES = [
    { name: '黑风寨主', hp: 80,  speed: 0.7, radius: 26, dmg: 3, xp: 25, color: '#1a1a2e', skills: ['charge'] },
    { name: '毒娘子',   hp: 100, speed: 0.9, radius: 22, dmg: 2, xp: 35, color: '#4a0e4e', skills: ['poison'] },
    { name: '铁臂金刚', hp: 150, speed: 0.5, radius: 30, dmg: 4, xp: 50, color: '#b8860b', skills: ['slam'] },
    { name: '幽冥剑仙', hp: 130, speed: 1.2, radius: 24, dmg: 3, xp: 60, color: '#0f3460', skills: ['dash'] },
    { name: '鸠摩天王', hp: 250, speed: 0.8, radius: 32, dmg: 5, xp: 100, color: '#c0392b', skills: ['charge', 'slam'] },
  ];

  /* ---- Boss进化变体 (25波后循环) ---- */
  const BOSS_VARIANTS = [
    { prefix: '狂暴', suffix: '', hpMul: 1.3, spdMul: 1.15, dmgMul: 1.2, extraSkill: null },
    { prefix: '幻影', suffix: '', hpMul: 1.1, spdMul: 1.4, dmgMul: 1.0, extraSkill: 'teleport' },
    { prefix: '裂魂', suffix: '', hpMul: 1.5, spdMul: 1.0, dmgMul: 1.3, extraSkill: 'split' },
    { prefix: '封域', suffix: '', hpMul: 1.2, spdMul: 0.9, dmgMul: 1.5, extraSkill: 'areaLock' },
  ];

  /* ---- 挑战修饰符 ---- */
  const CHALLENGE_MODIFIERS = [
    { id: 'one_hp',      name: '残血修罗', icon: '💀', desc: '仅1点生命', goldMul: 2.5, xpMul: 2.0, apply: (g) => { g.player.maxHp = 1; g.player.hp = 1; } },
    { id: 'no_upgrade',  name: '返璞归真', icon: '🚫', desc: '无法升级', goldMul: 2.0, xpMul: 1.0, apply: (g) => { g._noUpgrade = true; } },
    { id: 'fast_enemy',  name: '疾风迅雷', icon: '💨', desc: '敌人速度x1.6', goldMul: 1.8, xpMul: 1.5, apply: (g) => { g._enemySpeedMul = 1.6; } },
    { id: 'glass_cannon', name: '玻璃大炮', icon: '🔥', desc: '伤害x3 但生命-70%', goldMul: 1.5, xpMul: 1.5, apply: (g) => { g.player.bladeDmg *= 3; g.player.maxHp = Math.floor(g.player.maxHp * 0.3); g.player.hp = g.player.maxHp; } },
    { id: 'boss_rush',   name: '群魔乱舞', icon: '👹', desc: '每波都是Boss', goldMul: 3.0, xpMul: 2.5, apply: (g) => { g._bossRush = true; } },
  ];

  /* ---- 地形系统 ---- */
  const TERRAINS = [
    { id: 'plain', name: '草原', bgInner: '#1a2a15', bgOuter: '#0e1a0a', gridColor: 'rgba(212, 164, 74, 0.04)', decorColors: ['rgba(60,90,40,0.3)', 'rgba(80,70,50,0.2)'] },
    { id: 'lava',  name: '熔岩', bgInner: '#2a1510', bgOuter: '#1a0a05', gridColor: 'rgba(255, 100, 30, 0.06)', decorColors: ['rgba(180,60,20,0.25)', 'rgba(100,40,15,0.2)'], dotDmg: 1, dotInterval: 90, dotRange: 120, icon: '🌋' },
    { id: 'ice',   name: '冰窟', bgInner: '#101a2a', bgOuter: '#050a1a', gridColor: 'rgba(120, 180, 255, 0.06)', decorColors: ['rgba(100,150,220,0.25)', 'rgba(60,100,180,0.2)'], slowMul: 0.7, fragile: 1.15, icon: '❄️' },
  ];

  /* ---- 主动技能配置 ---- */
  const PLAYER_SKILLS = [
    { id: 'sword_qi', name: '剑气', key: '1', icon: '🗡️', cooldown: 300, duration: 30, desc: '释放穿透剑气弹幕', unlocked: false },
    { id: 'shadow_clone', name: '影分身', key: '2', icon: '👤', cooldown: 480, duration: 180, desc: '创建一个诱饵分身', unlocked: false },
    { id: 'golden_bell', name: '金钟罩', key: '3', icon: '🛡️', cooldown: 600, duration: 180, desc: '3秒无敌护盾', unlocked: false },
    { id: 'whirlwind', name: '旋风斩', key: '4', icon: '🌀', cooldown: 420, duration: 60, desc: 'AOE范围爆发伤害', unlocked: false },
    { id: 'thunder', name: '雷击', key: '5', icon: '⚡', cooldown: 360, duration: 15, desc: '全屏随机落雷轰击', unlocked: false },
    { id: 'lifesteal', name: '吸血', key: '6', icon: '🩸', cooldown: 480, duration: 300, desc: '5秒内命中回血', unlocked: false },
    { id: 'time_slow', name: '时缓', key: '7', icon: '⏳', cooldown: 540, duration: 240, desc: '4秒减速全部敌人', unlocked: false },
    { id: 'blade_burst', name: '刃暴', key: '8', icon: '💥', cooldown: 420, duration: 300, desc: '5秒临时+3刀刃', unlocked: false },
  ];

  /* ---- 升级选项池 ---- */
  const UPGRADES = [
    { id: 'blade_count', name: '追加刀刃', desc: '多一把旋转刀刃', icon: '🗡️', max: 5, effect: (p) => { p.bladeCount++; } },
    { id: 'blade_len',   name: '刀刃延伸', desc: '刀刃变长 +18',  icon: '📏', max: 8, effect: (p) => { p.bladeLen += 18; } },
    { id: 'blade_speed', name: '旋风加速', desc: '旋转速度 +25%', icon: '🌀', max: 6, effect: (p) => { p.bladeSpeed *= 1.25; } },
    { id: 'blade_dmg',   name: '锋利淬火', desc: '刀刃伤害 +1',  icon: '🔥', max: 10, effect: (p) => { p.bladeDmg++; } },
    { id: 'max_hp',      name: '铁布衫',   desc: '生命上限 +25',  icon: '💪', max: 8, effect: (p) => { p.maxHp += 25; p.hp += 25; } },
    { id: 'move_speed',  name: '凌波微步', desc: '移速 +12%',     icon: '👟', max: 5, effect: (p) => { p.speed *= 1.12; } },
    { id: 'heal',        name: '疗伤丹',   desc: '回复30%生命',   icon: '💊', max: 99, effect: (p) => { p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.3)); } },
    { id: 'magnet',      name: '吸星大法', desc: '拾取范围 +40%', icon: '🧲', max: 4, effect: (p) => { p.pickupRange *= 1.4; } },
    { id: 'thorns',      name: '铁布衫反伤', desc: '受击反伤 2',  icon: '🛡️', max: 5, effect: (p) => { p.thorns += 2; } },
    { id: 'crit',        name: '破绽洞察', desc: '暴击率 +8%',    icon: '🎯', max: 6, effect: (p) => { p.critChance = Math.min(0.6, p.critChance + 0.08); } },
    { id: 'skill_sword_qi',  name: '习得：剑气',   desc: '解锁剑气技能(按1)',   icon: '🗡️', max: 1, effect: (p, g) => { g.skills[0].unlocked = true; } },
    { id: 'skill_shadow',    name: '习得：影分身', desc: '解锁影分身技能(按2)', icon: '👤', max: 1, effect: (p, g) => { g.skills[1].unlocked = true; } },
    { id: 'skill_bell',      name: '习得：金钟罩', desc: '解锁金钟罩技能(按3)', icon: '🛡️', max: 1, effect: (p, g) => { g.skills[2].unlocked = true; } },
    { id: 'skill_whirlwind',  name: '习得：旋风斩', desc: '解锁旋风斩技能(按4)', icon: '🌀', max: 1, effect: (p, g) => { g.skills[3].unlocked = true; } },
    { id: 'skill_thunder',     name: '习得：雷击',   desc: '解锁雷击技能(按5)',   icon: '⚡', max: 1, effect: (p, g) => { g.skills[4].unlocked = true; } },
    { id: 'skill_lifesteal',   name: '习得：吸血',   desc: '解锁吸血技能(按6)',   icon: '🩸', max: 1, effect: (p, g) => { g.skills[5].unlocked = true; } },
    { id: 'skill_time_slow',   name: '习得：时缓',   desc: '解锁时缓技能(按7)',   icon: '⏳', max: 1, effect: (p, g) => { g.skills[6].unlocked = true; } },
    { id: 'skill_blade_burst', name: '习得：刃暴',   desc: '解锁刃暴技能(按8)',   icon: '💥', max: 1, effect: (p, g) => { g.skills[7].unlocked = true; } },
    { id: 'vampire_blade',   name: '吸血剑意', desc: '击杀回复1HP',      icon: '🩸', max: 5, effect: (p) => { p.vampireBlade++; } },
    { id: 'enlightenment',   name: '悟道加速', desc: '经验获取 +20%',    icon: '📖', max: 3, effect: (p) => { p.xpMultiplier += 0.2; } },
    { id: 'agile_move',      name: '灵巧身法', desc: '10%闪避几率',      icon: '💨', max: 3, effect: (p) => { p.dodgeChance = Math.min(0.3, p.dodgeChance + 0.1); } },
  ];

  /* ---- 仙缘祝福（波次事件）---- */
  const BLESSINGS = [
    { id: 'bless_heal',   name: '回气', desc: '立即回复25%生命', icon: '💚', unique: false, apply: (g) => { if (g.player) g.player.hp = Math.min(g.player.maxHp, g.player.hp + Math.floor(g.player.maxHp * 0.25)); } },
    { id: 'bless_dmg',    name: '磨刃', desc: '旋刃伤害 +2',     icon: '🗡️', unique: false, apply: (g) => { if (g.player) g.player.bladeDmg += 2; } },
    { id: 'bless_speed',  name: '身法', desc: '移动速度 +8%',     icon: '💨', unique: false, apply: (g) => { if (g.player) g.player.speed *= 1.08; } },
    { id: 'bless_magnet', name: '引灵', desc: '拾取范围 +20',     icon: '🧲', unique: false, apply: (g) => { if (g.player) g.player.pickupRange += 20; } },
    { id: 'bless_wisdom', name: '悟道', desc: '经验获取 +15%',    icon: '📖', unique: false, apply: (g) => { if (g.player) g.player.xpMultiplier += 0.15; } },
    { id: 'bless_blade',  name: '分刃', desc: '旋刃数量 +1',     icon: '🌀', unique: true,  apply: (g) => { if (g.player) g.player.bladeCount += 1; } },
  ];

  /* ---- 辅助函数 ---- */
  function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(min, max) { return Math.random() * (max - min) + min; }

  /* In-place compaction: removes dead entities without allocating a new array */
  function filterAlive(arr) {
    let write = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].alive) arr[write++] = arr[i];
    }
    arr.length = write;
  }

  /* ---- 对象池 (减少GC压力) ---- */
  class ObjectPool {
    constructor(factory, reset, initialSize = 0) {
      this._factory = factory;
      this._reset = reset;
      this._pool = [];
      for (let i = 0; i < initialSize; i++) {
        this._pool.push(factory());
      }
    }
    acquire(...args) {
      const obj = this._pool.length > 0 ? this._pool.pop() : this._factory();
      this._reset(obj, ...args);
      return obj;
    }
    release(obj) {
      this._pool.push(obj);
    }
    releaseAll(arr) {
      for (let i = 0; i < arr.length; i++) {
        if (!arr[i].alive) this._pool.push(arr[i]);
      }
    }
  }

  /* ---- Meta 进度系统 ---- */
  const META_MILESTONES = [
    { id: 'kill_50', label: '杀敌50', desc: '起始生命+10', stat: 'kills', target: 50, bonus: { startHp: 10 } },
    { id: 'kill_200', label: '杀敌200', desc: '起始生命+15', stat: 'kills', target: 200, bonus: { startHp: 15 } },
    { id: 'kill_500', label: '杀敌500', desc: '起始伤害+1', stat: 'kills', target: 500, bonus: { startDmg: 1 } },
    { id: 'wave_10', label: '到达第10波', desc: '初始解锁剑气', stat: 'maxWave', target: 10, bonus: { startSkill: 'sword_qi' } },
    { id: 'wave_20', label: '到达第20波', desc: '移速+8%', stat: 'maxWave', target: 20, bonus: { speedMult: 1.08 } },
    { id: 'play_10', label: '游玩10局', desc: '起始生命+25', stat: 'gamesPlayed', target: 10, bonus: { startHp: 25 } },
    { id: 'play_25', label: '游玩25局', desc: '拾取范围+10', stat: 'gamesPlayed', target: 25, bonus: { pickupRange: 10 } },
  ];

  /* ---- 永久升级商店 ---- */
  const PERM_UPGRADES = [
    { id: 'perm_hp',    name: '铁骨', desc: '起始生命 +20', icon: '❤️', maxLv: 10, baseCost: 30, costScale: 1.4, apply: (p) => { p.maxHp += 20; p.hp += 20; } },
    { id: 'perm_atk',   name: '锋刃', desc: '起始伤害 +1', icon: '⚔️', maxLv: 8, baseCost: 50, costScale: 1.5, apply: (p) => { p.bladeDmg += 1; } },
    { id: 'perm_crit',  name: '天眼', desc: '暴击率 +3%', icon: '🎯', maxLv: 6, baseCost: 60, costScale: 1.5, apply: (p) => { p.critChance = Math.min(0.6, p.critChance + 0.03); } },
    { id: 'perm_shield', name: '护体', desc: '开局获得护盾(抵消1次伤害)', icon: '🛡️', maxLv: 3, baseCost: 80, costScale: 2.0, apply: (p) => { p.startShield = (p.startShield || 0) + 1; } },
    { id: 'perm_speed', name: '轻功', desc: '移速 +5%', icon: '👟', maxLv: 5, baseCost: 40, costScale: 1.4, apply: (p) => { p.speed *= 1.05; } },
    { id: 'perm_pickup', name: '磁力', desc: '拾取范围 +8', icon: '🧲', maxLv: 5, baseCost: 35, costScale: 1.3, apply: (p) => { p.pickupRange += 8; } },
  ];

  function getPermUpgradeCost(upgrade, level) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, level));
  }

  const MetaProgress = {
    _key: 'knife_meta_progress',
    load() {
      return Storage.get(this._key, { kills: 0, maxWave: 0, gamesPlayed: 0, unlocked: [], gold: 0, permLevels: {} });
    },
    save(data) { Storage.setImmediate(this._key, data); },
    addGold(amount) {
      const d = this.load();
      d.gold = (d.gold || 0) + amount;
      this.save(d);
      return d.gold;
    },
    getGold() { return this.load().gold || 0; },
    getPermLevel(id) { const d = this.load(); return (d.permLevels && d.permLevels[id]) || 0; },
    buyPermUpgrade(id) {
      const d = this.load();
      if (!d.permLevels) d.permLevels = {};
      const upgrade = PERM_UPGRADES.find(u => u.id === id);
      if (!upgrade) return false;
      const lv = d.permLevels[id] || 0;
      if (lv >= upgrade.maxLv) return false;
      const cost = getPermUpgradeCost(upgrade, lv);
      if ((d.gold || 0) < cost) return false;
      d.gold -= cost;
      d.permLevels[id] = lv + 1;
      this.save(d);
      return true;
    },
    recordGame(kills, wave) {
      const d = this.load();
      d.kills += kills;
      d.maxWave = Math.max(d.maxWave, wave);
      d.gamesPlayed += 1;
      // Check for newly unlocked milestones
      const newlyUnlocked = [];
      META_MILESTONES.forEach(m => {
        if (!d.unlocked.includes(m.id) && d[m.stat] >= m.target) {
          d.unlocked.push(m.id);
          newlyUnlocked.push(m);
        }
      });
      this.save(d);
      return newlyUnlocked;
    },
    getStartBonuses() {
      const d = this.load();
      const bonuses = { startHp: 0, startDmg: 0, speedMult: 1, pickupRange: 0, startSkill: null };
      META_MILESTONES.forEach(m => {
        if (d.unlocked.includes(m.id)) {
          if (m.bonus.startHp) bonuses.startHp += m.bonus.startHp;
          if (m.bonus.startDmg) bonuses.startDmg += m.bonus.startDmg;
          if (m.bonus.speedMult) bonuses.speedMult *= m.bonus.speedMult;
          if (m.bonus.pickupRange) bonuses.pickupRange += m.bonus.pickupRange;
          if (m.bonus.startSkill) bonuses.startSkill = m.bonus.startSkill;
        }
      });
      return bonuses;
    }
  };

  /* ---- 实体基类 ---- */
  class Entity {
    constructor(x, y, radius) {
      this.x = x; this.y = y; this.radius = radius;
      this.alive = true;
    }
    collides(other) { return dist(this, other) < this.radius + other.radius; }
  }

  /* ---- 玩家 ---- */
  class Player extends Entity {
    constructor(x, y) {
      super(x, y, CFG.playerRadius);
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
      this.invincible = 0;
      this.kills = 0;
      this.totalDmgDealt = 0;
      this.upgradeCounts = {};
      this.vx = 0;
      this.vy = 0;
      this.facingAngle = 0;
      this.goldEarned = 0;
      this.startShield = 0;
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
      let dx = 0, dy = 0;
      if (keys.w || keys.arrowup) dy -= 1;
      if (keys.s || keys.arrowdown) dy += 1;
      if (keys.a || keys.arrowleft) dx -= 1;
      if (keys.d || keys.arrowright) dx += 1;

      if (joyDir) { dx += joyDir.x; dy += joyDir.y; }

      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        dx /= len; dy /= len;
        this.vx = dx * this.speed;
        this.vy = dy * this.speed;
        this.facingAngle = Math.atan2(dy, dx);
      } else {
        this.vx *= 0.7;
        this.vy *= 0.7;
      }

      this.x += this.vx;
      this.y += this.vy;
      this.bladeAngle = (this.bladeAngle + this.bladeSpeed) % TAU;
      if (this.invincible > 0) this.invincible--;
    }

    takeDamage(dmg) {
      if (this.invincible > 0) return false;
      // 闪避判定
      if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) return false;
      // 护盾判定
      if (this.startShield > 0) { this.startShield--; this.invincible = CFG.invincibleFrames; return false; }
      this.hp -= dmg;
      this.invincible = CFG.invincibleFrames;
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

  /* ---- 敌人 ---- */
  class Enemy extends Entity {
    constructor(x, y, type, waveScale, diff) {
      const t = typeof type === 'string' ? ENEMY_TYPES[type] : type;
      super(x, y, t.radius);
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
        return;
      }

      const a = angle(this, player);
      this.moveAngle = a;
      this.x += Math.cos(a) * this.speed;
      this.y += Math.sin(a) * this.speed;

      // 影刺客传送
      if (this.teleportCD > 0) {
        this.teleportTimer++;
        if (this.teleportTimer >= this.teleportCD) {
          this.teleportTimer = 0;
          const ta = Math.random() * TAU;
          const td = 40 + Math.random() * 30;
          this.x = player.x + Math.cos(ta) * td;
          this.y = player.y + Math.sin(ta) * td;
        }
      }

      if (this.isBoss && this.skillCD <= 0) {
        this.useSkill(player);
      }
      if (this.skillCD > 0) this.skillCD--;
    }

    useSkill(player) {
      const skill = pick(this.skills);
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
    }
  }

  /* ---- 弹幕 ---- */
  class Projectile extends Entity {
    constructor(x, y, angle, speed, dmg, fromEnemy, type) {
      super(x, y, type === 'poison' ? 30 : 4);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.dmg = dmg;
      this.fromEnemy = fromEnemy;
      this.type = type || 'normal';
      this.life = type === 'poison' ? 300 : type === 'slam' ? 20 : 180;
      this.maxLife = this.life;
    }
    update() {
      if (this.type !== 'slam' && this.type !== 'poison') {
        this.x += this.vx;
        this.y += this.vy;
      }
      this.life--;
      if (this.life <= 0) this.alive = false;
    }
  }

  /* ---- 掉落物 ---- */
  class Pickup extends Entity {
    constructor(x, y, xp) {
      super(x, y, 6);
      this.xp = xp;
      this.life = 600;
      this.bobPhase = Math.random() * TAU;
    }
    update() {
      this.life--;
      if (this.life <= 0) this.alive = false;
      this.bobPhase += 0.08;
    }
  }

  /* ---- 伤害数字 ---- */
  class DmgText {
    constructor(x, y, text, color, isCrit) {
      this.x = x; this.y = y; this.text = text; this.color = color;
      this.isCrit = isCrit;
      this.life = 45; this.maxLife = 45;
      this.vy = -1.2;
    }
    update() { this.y += this.vy; this.vy *= 0.96; this.life--; }
    get alive() { return this.life > 0; }
  }

  // 弹幕对象池
  const projectilePool = new ObjectPool(
    () => new Projectile(0, 0, 0, 0, 0, false),
    (p, x, y, angle, speed, dmg, fromEnemy, type) => {
      p.x = x; p.y = y;
      p.radius = type === 'poison' ? 30 : 4;
      p.alive = true;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.dmg = dmg;
      p.fromEnemy = fromEnemy;
      p.type = type || 'normal';
      p.life = type === 'poison' ? 300 : type === 'slam' ? 20 : 180;
      p.maxLife = p.life;
    },
    20
  );

  // 拾取物对象池
  const pickupPool = new ObjectPool(
    () => new Pickup(0, 0, 0),
    (p, x, y, xp) => {
      p.x = x; p.y = y; p.xp = xp;
      p.radius = 6;
      p.alive = true;
      p.life = 600;
      p.bobPhase = Math.random() * TAU;
    },
    30
  );

  // 伤害数字对象池
  const dmgTextPool = new ObjectPool(
    () => new DmgText(0, 0, '', '', false),
    (d, x, y, text, color, isCrit) => {
      d.x = x; d.y = y; d.text = text; d.color = color;
      d.isCrit = isCrit;
      d.life = 45; d.maxLife = 45;
      d.vy = -1.2;
    },
    20
  );

  /* ---- 地面装饰物（预生成） ---- */
  function generateGroundDecor(count, range) {
    const decor = [];
    for (let i = 0; i < count; i++) {
      decor.push({
        x: rnd(-range, range),
        y: rnd(-range, range),
        type: Math.random() < 0.6 ? 'grass' : 'stone',
        size: rnd(2, 6),
        angle: rnd(0, TAU),
        color: Math.random() < 0.5 ? 'rgba(60,90,40,0.3)' : 'rgba(80,70,50,0.2)',
      });
    }
    return decor;
  }

  /* ---- 主游戏类 ---- */
  class Game {
    constructor() {
      this.state = 'menu';
      this.player = null;
      // Input / difficulty (needed before start())
      this.keys = {};
      this.joyDir = null;
      this.diff = DIFF.normal;
      this.activeModifiers = [];  // 挑战修饰符
      this.terrain = TERRAINS[0]; // 当前地形
      this._enemySpeedMul = 1;    // 挑战：敌人速度倍率
      this._noUpgrade = false;    // 挑战：禁止升级
      this._bossRush = false;     // 挑战：每波Boss
    }

    setDifficulty(d) {
      this.diff = DIFF[d] || DIFF.normal;
    }

    start() {
      this.player = new Player(0, 0);
      this.enemies = [];
      this.projectiles = [];
      this.pickups = [];
      this.dmgTexts = [];
      this.particles = [];
      this.bladeTrails = [];
      this.skills = PLAYER_SKILLS.map(s => ({ ...s, currentCooldown: 0, active: false, activeTimer: 0 }));
      this.shadowClone = null;
      this.swordQiProjectiles = [];
      this.chests = [];
      this.chestTimer = 0;
      this.hazards = [];
      this.wave = 0;
      this.waveTimer = 0;
      this.waveTransition = 0;
      this.spawnTimer = 0;
      this.upgradeQueue = 0;
      this.pendingUpgrades = [];
      this.pendingBlessings = [];
      this._blessingsTaken = {};
      this.totalFrames = 0;
      this.spawnInterval = CFG.enemySpawnInterval;
      this.groundDecor = generateGroundDecor(200, 2000);
      this.bossFlash = 0;
      this.killCombo = 0;
      this.killComboTimer = 0;
      this.cameraX = 0;
      this.cameraY = 0;
      this.shakeX = 0;
      this.shakeY = 0;
      this.goldPickups = [];
      this.runGold = 0;
      this._enemySpeedMul = 1;
      this._noUpgrade = false;
      this._bossRush = false;
      this.terrain = TERRAINS[0];
      this._terrainDotTimer = 0;
      this.nextWave();

      // Apply meta bonuses
      const metaBonuses = MetaProgress.getStartBonuses();
      this.player.hp += metaBonuses.startHp;
      this.player.maxHp += metaBonuses.startHp;
      this.player.bladeDmg += metaBonuses.startDmg;
      this.player.speed *= metaBonuses.speedMult;
      this.player.pickupRange += metaBonuses.pickupRange;
      if (metaBonuses.startSkill) {
        const skillIdx = this.skills.findIndex(s => s.id === metaBonuses.startSkill);
        if (skillIdx !== -1 && !this.skills[skillIdx].unlocked) {
          this.skills[skillIdx].unlocked = true;
        }
      }

      // Apply permanent shop upgrades
      PERM_UPGRADES.forEach(u => {
        const lv = MetaProgress.getPermLevel(u.id);
        for (let i = 0; i < lv; i++) u.apply(this.player);
      });

      // 仙缘联动: 检查跨游戏奖励
      if (typeof CrossGameRewards !== 'undefined') {
        var knRewards = CrossGameRewards.checkAndClaim('knife');
        var self = this;
        knRewards.forEach(function(r) {
          if (r.reward.type === 'extra_blade') self.player.bladeCount += r.reward.value;
        });
      }

      // 仙缘兑换：永久加成 / 下局一次性加成
      var knifeBonuses = Storage.get('xianyuan_knife_bonuses', { hp: 0, heal_next: 0, goldMul: 1 });
      if (knifeBonuses.hp > 0) {
        this.player.hp += knifeBonuses.hp;
        this.player.maxHp += knifeBonuses.hp;
      }
      if (knifeBonuses.heal_next > 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + knifeBonuses.heal_next);
        knifeBonuses.heal_next = 0;
        Storage.set('xianyuan_knife_bonuses', knifeBonuses);
      }
      this._xianyuanGoldMul = knifeBonuses.goldMul || 1;

      this.state = 'playing';
      if (typeof CrossGameAchievements !== 'undefined') {
        CrossGameAchievements.trackStat('games_played_knife', true);
        CrossGameAchievements.trackStat('knife_games_played', (MetaProgress.load().gamesPlayed || 0) + 1);
      }

      // 应用挑战修饰符
      for (const mod of this.activeModifiers) {
        mod.apply(this);
      }
    }

    nextWave() {
      this.wave++;
      this.waveTimer = CFG.waveDuration;
      this.waveTransition = 90;
      this.enemiesKilledThisWave = 0;
      if (typeof SoundManager !== 'undefined') SoundManager.play('wave');

      // 地形切换：每10波
      if (this.wave > 1 && (this.wave - 1) % 10 === 0) {
        const tIdx = Math.floor((this.wave - 1) / 10) % TERRAINS.length;
        this.terrain = TERRAINS[tIdx];
      }

      if (this._bossRush || this.wave % CFG.bossEvery === 0) {
        this.spawnBoss();
      } else {
        // 非Boss波有概率刷精英怪
        if (this.wave >= 3 && Math.random() < 0.4 + this.wave * 0.03) {
          const eliteCount = Math.random() < 0.3 ? 2 : 1;
          for (let i = 0; i < eliteCount; i++) this.spawnElite();
        }
      }

      // 第3波后生成环境危害
      if (this.wave > 3) {
        const hazardCount = Math.random() < 0.4 ? 2 : 1;
        for (let i = 0; i < hazardCount; i++) this.spawnHazard();
      }

      // 仙缘祝福：每6波（非Boss波）触发一次选择
      if (!this._bossRush && this.wave % CFG.bossEvery !== 0 && this.wave > 1 && this.wave % 6 === 0) {
        this._triggerBlessingChoice();
      }

      this.spawnInterval = Math.max(
        CFG.enemySpawnMin,
        Math.floor((CFG.enemySpawnInterval - this.wave * 4) * this.diff.spawnMul)
      );
    }

    _triggerBlessingChoice() {
      const pool = BLESSINGS.filter(b => !b.unique || !(this._blessingsTaken && this._blessingsTaken[b.id]));
      if (pool.length === 0) return;
      const choices = [];
      const copy = [...pool];
      while (choices.length < 3 && copy.length > 0) {
        const idx = Math.floor(Math.random() * copy.length);
        choices.push(copy.splice(idx, 1)[0]);
      }
      this.pendingBlessings = choices;
      if (this.pendingBlessings.length > 0) {
        this.state = 'blessing';
      }
    }

    applyBlessing(idx) {
      const b = this.pendingBlessings && this.pendingBlessings[idx];
      if (!b) return;
      try {
        b.apply(this);
        this._blessingsTaken[b.id] = (this._blessingsTaken[b.id] || 0) + 1;
        this.pendingBlessings = [];
        this.state = 'playing';
      } catch (e) {
        console.error('[KnifeGame] applyBlessing error:', e);
        this.pendingBlessings = [];
        this.state = 'playing';
      }
    }

    spawnBoss() {
      const bossWaveNum = this._bossRush ? this.wave : Math.floor(this.wave / CFG.bossEvery);
      const idx = (bossWaveNum - 1) % BOSS_TYPES.length;
      const bt = BOSS_TYPES[idx];
      const a = Math.random() * TAU;
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

      const boss = new Enemy(
        this.player.x + Math.cos(a) * d,
        this.player.y + Math.sin(a) * d,
        bossData,
        1 + this.wave * 0.12,
        this.diff
      );
      boss.isBoss = true;
      boss._bossVariantSkills = bossData.skills; // 记录变体技能
      this.enemies.push(boss);
    }

    spawnEnemy() {
      if (this.enemies.length >= CFG.maxEnemiesAlive) return;
      const a = Math.random() * TAU;
      const d = 380 + Math.random() * 120;
      const ex = this.player.x + Math.cos(a) * d;
      const ey = this.player.y + Math.sin(a) * d;

      const types = ['pawn', 'pawn'];  // 更多小兵 → 割草感
      if (this.wave >= 2) types.push('swordsman');
      if (this.wave >= 2) types.push('pawn');
      if (this.wave >= 3) types.push('archer');
      if (this.wave >= 4) types.push('brute');
      if (this.wave >= 5) types.push('ninja');
      if (this.wave >= 6) types.push('swordsman', 'ninja');

      const type = pick(types);
      const waveScale = 1 + this.wave * 0.1;
      this.enemies.push(new Enemy(ex, ey, type, waveScale, this.diff));
    }

    spawnElite() {
      const a = Math.random() * TAU;
      const d = 350 + Math.random() * 100;
      const ex = this.player.x + Math.cos(a) * d;
      const ey = this.player.y + Math.sin(a) * d;
      const type = Math.random() < 0.5 ? 'shadow_assassin' : 'iron_shield';
      const waveScale = 1 + this.wave * 0.12;
      const elite = new Enemy(ex, ey, type, waveScale, this.diff);
      this.enemies.push(elite);
    }

    spawnHazard() {
      const types = ['fire', 'poison', 'ice'];
      const type = pick(types);
      // 随机位置，但避开玩家附近（至少100px）
      let hx, hy;
      do {
        hx = this.player.x + rnd(-300, 300);
        hy = this.player.y + rnd(-300, 300);
      } while (Math.hypot(hx - this.player.x, hy - this.player.y) < 100);

      const hazard = {
        x: hx, y: hy, type: type,
        radius: 40 + Math.random() * 20,
        life: 900, // 15 seconds at 60fps
        maxLife: 900,
        dmgTimer: 0,
      };
      this.hazards.push(hazard);
    }

    spawnChest() {
      const types = ['gold', 'heal', 'exp'];
      const type = pick(types);
      let cx, cy;
      do {
        cx = this.player.x + rnd(-250, 250);
        cy = this.player.y + rnd(-250, 250);
      } while (Math.hypot(cx - this.player.x, cy - this.player.y) < 60);

      this.chests.push({
        x: cx, y: cy, type: type,
        radius: 14,
        bobPhase: Math.random() * TAU,
        alive: true,
      });
    }

    addShake(amount) {
      this.shakeX += (Math.random() - 0.5) * amount;
      this.shakeY += (Math.random() - 0.5) * amount;
    }

    update() {
      if (this.state !== 'playing') return;
      this.totalFrames++;

      // 屏幕震动衰减
      this.shakeX *= CFG.shakeDecay;
      this.shakeY *= CFG.shakeDecay;
      if (Math.abs(this.shakeX) < 0.2) this.shakeX = 0;
      if (Math.abs(this.shakeY) < 0.2) this.shakeY = 0;

      // Boss闪光衰减
      if (this.bossFlash > 0) this.bossFlash--;

      // 连杀计时
      if (this.killComboTimer > 0) { this.killComboTimer--; } else { this.killCombo = 0; }

      // 波次计时
      if (this.waveTransition > 0) this.waveTransition--;
      this.waveTimer--;
      if (this.waveTimer <= 0) this.nextWave();

      // 生成敌人
      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const count = Math.min(1 + Math.floor(this.wave * 0.4), 4);
        for (let i = 0; i < count; i++) this.spawnEnemy();
      }

      // 宝箱生成（每15秒）
      this.chestTimer++;
      if (this.chestTimer >= 900) {
        this.chestTimer = 0;
        this.spawnChest();
      }

      // 更新玩家
      this.player.update(this.keys, this.joyDir);

      // 更新技能冷却
      for (const skill of this.skills) {
        if (skill.currentCooldown > 0) skill.currentCooldown--;
        if (skill.activeTimer > 0) {
          skill.activeTimer--;
          if (skill.activeTimer <= 0) {
            skill.active = false;
            // 刃暴结束时移除额外刀刃
            if (skill.id === 'blade_burst' && this._bladeBurstExtra) {
              this.player.bladeCount = Math.max(1, this.player.bladeCount - this._bladeBurstExtra);
              this._bladeBurstExtra = 0;
            }
          }
        } else { skill.active = false; }
      }

      // 时缓效果：减速所有敌人
      this._timeSlowActive = this.skills[6] && this.skills[6].active;

      // 更新剑气弹幕
      for (let i = this.swordQiProjectiles.length - 1; i >= 0; i--) {
        const proj = this.swordQiProjectiles[i];
        proj.x += proj.vx; proj.y += proj.vy; proj.life--;
        if (proj.life <= 0 || proj.x < this.cameraX - 100 || proj.x > this.cameraX + CFG.canvasW + 100 ||
            proj.y < this.cameraY - 100 || proj.y > this.cameraY + CFG.canvasH + 100) {
          this.swordQiProjectiles.splice(i, 1); continue;
        }
        // Check enemy hits (piercing)
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const dx = e.x - proj.x, dy = e.y - proj.y;
          if (dx*dx + dy*dy < (e.radius + 5) * (e.radius + 5)) {
            e.takeDamage(proj.dmg);
            this.player.totalDmgDealt += proj.dmg;
            this.dmgTexts.push(new DmgText(e.x + rnd(-8, 8), e.y - e.radius, String(proj.dmg), '#4ad4ff', false));
            if (!e.alive) this.onEnemyDeath(e);
          }
        }
      }

      // 更新影分身
      if (this.shadowClone) {
        this.shadowClone.life--;
        if (this.shadowClone.life <= 0 || this.shadowClone.hp <= 0) this.shadowClone = null;
      }

      // 摄像机跟随
      this.cameraX = lerp(this.cameraX, this.player.x - CFG.canvasW / 2, 0.1);
      this.cameraY = lerp(this.cameraY, this.player.y - CFG.canvasH / 2, 0.1);

      // 更新敌人（影分身诱饵：sticky target分配）
      const timeSlowMult = this._timeSlowActive ? 0.4 : 1;
      const challengeSpeedMul = this._enemySpeedMul || 1;
      for (const e of this.enemies) {
        // 时缓效果 + 挑战修饰符：临时降速/加速
        const origSpeed = e.speed;
        e.speed *= timeSlowMult * challengeSpeedMul;

        if (this.shadowClone) {
          // Sticky target: assign once, then keep
          if (!e._cloneTarget) {
            e._cloneTarget = Math.random() < 0.5 ? 'clone' : 'player';
          }
          if (e._cloneTarget === 'clone') {
            e.update({ x: this.shadowClone.x, y: this.shadowClone.y });
          } else {
            e.update(this.player);
          }
        } else {
          e._cloneTarget = null;
          e.update(this.player);
        }
        e.speed = origSpeed;
      }

      // 敌人互斥（防止堆叠）
      this._separateEnemies();

      // 更新弹幕
      for (const p of this.projectiles) p.update();

      // 更新掉落物
      for (const pk of this.pickups) {
        pk.update();
        const d = dist(pk, this.player);
        if (d < this.player.pickupRange * 2.5) {
          const a = angle(pk, this.player);
          const pull = Math.max(4, (this.player.pickupRange * 2.5 - d) * 0.15);
          pk.x += Math.cos(a) * pull;
          pk.y += Math.sin(a) * pull;
        }
      }

      // 更新宝箱
      for (const ch of this.chests) {
        ch.bobPhase += 0.06;
      }

      // 更新环境危害
      let playerSlowed = false;
      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const h = this.hazards[i];
        h.life--;
        if (h.life <= 0) { this.hazards.splice(i, 1); continue; }
        // 检测玩家是否在危害区域内
        const d = Math.hypot(this.player.x - h.x, this.player.y - h.y);
        if (d < h.radius) {
          h.dmgTimer++;
          if (h.type === 'fire' && h.dmgTimer % 30 === 0) {
            this.player.takeDamage(1);
            this.dmgTexts.push(new DmgText(this.player.x + rnd(-8, 8), this.player.y - 20, '1', '#ff6633', false));
          } else if (h.type === 'poison' && h.dmgTimer % 45 === 0) {
            this.player.takeDamage(1);
            this.dmgTexts.push(new DmgText(this.player.x + rnd(-8, 8), this.player.y - 20, '1', '#44cc44', false));
          } else if (h.type === 'ice') {
            playerSlowed = true;
          }
        }
      }
      // 冰霜减速效果（临时降速50%，每帧重置检测）
      if (playerSlowed) {
        this.player.vx *= 0.5;
        this.player.vy *= 0.5;
        this.player.x -= this.player.vx;
        this.player.y -= this.player.vy;
      }

      // 地形效果
      if (this.terrain.id === 'lava') {
        this._terrainDotTimer++;
        if (this._terrainDotTimer >= (this.terrain.dotInterval || 90)) {
          this._terrainDotTimer = 0;
          this.player.takeDamage(this.terrain.dotDmg || 1);
          this.dmgTexts.push(new DmgText(this.player.x + rnd(-8, 8), this.player.y - 25, '1', '#ff4400', false));
        }
      } else if (this.terrain.id === 'ice') {
        // 冰窟：玩家移速降低
        this.player.vx *= (this.terrain.slowMul || 0.7);
        this.player.vy *= (this.terrain.slowMul || 0.7);
      }

      // 宝箱拾取
      for (let i = this.chests.length - 1; i >= 0; i--) {
        const ch = this.chests[i];
        if (!ch.alive) continue;
        const d = Math.hypot(ch.x - this.player.x, ch.y - this.player.y);
        if (d < ch.radius + this.player.radius) {
          ch.alive = false;
          if (ch.type === 'gold') {
            // 金币宝箱：获得3-6个经验球
            const count = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < count; j++) {
              this.pickups.push(new Pickup(ch.x + rnd(-20, 20), ch.y + rnd(-20, 20), 2));
            }
            this.dmgTexts.push(new DmgText(ch.x, ch.y - 10, '金币宝箱！', '#ffd700', true));
          } else if (ch.type === 'heal') {
            // 回血宝箱：回复20%HP
            const heal = Math.floor(this.player.maxHp * 0.2);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
            this.dmgTexts.push(new DmgText(ch.x, ch.y - 10, '+' + heal + 'HP', '#44ff44', true));
          } else if (ch.type === 'exp') {
            // 经验宝箱：直接获得大量经验
            const xpGain = 5 + this.wave * 2;
            const chestLevels = this.player.addXp(xpGain);
            this.dmgTexts.push(new DmgText(ch.x, ch.y - 10, '+' + xpGain + 'XP', '#4adad4', true));
            if (chestLevels > 0) {
              for (let cl = 0; cl < chestLevels; cl++) {
                this.triggerUpgrade();
              }
            }
          }
          // 宝箱开启粒子
          for (let j = 0; j < 12; j++) {
            this.particles.push({
              x: ch.x, y: ch.y,
              vx: rnd(-2, 2), vy: rnd(-3, 0),
              life: 1, color: ch.type === 'gold' ? '#ffd700' : ch.type === 'heal' ? '#44ff44' : '#4adad4',
            });
          }
          this.chests.splice(i, 1);
        }
      }

      // 更新文字/粒子
      for (const dt of this.dmgTexts) dt.update();
      this.particles = this.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04;
        p.life -= 0.025;
        return p.life > 0;
      });
      if (this.particles.length > 300) this.particles = this.particles.slice(-150);
      this.bladeTrails = this.bladeTrails.filter(t => {
        t.life -= 0.08;
        return t.life > 0;
      });

      // --- 碰撞检测 ---
      this.checkBladeHits();
      this.checkEnemyPlayerCollision();
      this.checkProjectileHits();
      this.checkPickupCollection();
      this._checkGoldPickups();

      // Boss技能处理
      this._handleBossSkills();

      // 远程射击
      for (const e of this.enemies) {
        if (e.type.ranged && e.shootCD && e.alive) {
          e.shootTimer++;
          if (e.shootTimer >= e.shootCD) {
            e.shootTimer = 0;
            const a = angle(e, this.player);
            this.projectiles.push(new Projectile(e.x, e.y, a, 2.5, e.dmg, true));
          }
        }
      }

      // 清理（in-place compaction, no new array allocation）+ 回收到对象池
      projectilePool.releaseAll(this.projectiles);
      pickupPool.releaseAll(this.pickups);
      dmgTextPool.releaseAll(this.dmgTexts);
      filterAlive(this.enemies);
      filterAlive(this.projectiles);
      filterAlive(this.pickups);
      filterAlive(this.dmgTexts);
      filterAlive(this.goldPickups);

      if (!this.player.alive) {
        // 挑战修饰符金币加成 + 仙缘兑换加成
        let goldMul = 1;
        for (const mod of this.activeModifiers) goldMul *= (mod.goldMul || 1);
        const finalGold = Math.floor(this.runGold * goldMul * (this._xianyuanGoldMul || 1));
        // Save gold earned during this run
        if (finalGold > 0) {
          this.player.goldEarned = finalGold;
          MetaProgress.addGold(finalGold);
        }
        this.state = 'over';
        if (typeof SoundManager !== 'undefined') SoundManager.play('defeat');
      }
    }

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
            a.x += nx * overlap; a.y += ny * overlap;
            b.x -= nx * overlap; b.y -= ny * overlap;
          }
        }
      }
    }

    _handleBossSkills() {
      for (const e of this.enemies) {
        if (!e.isBoss || !e.alive) continue;
        // slam检测：范围伤害（当boss在slam冷却刚触发时）
        if (e.lastSkill === 'slam' && e.skillCD >= 195) {
          const d = dist(e, this.player);
          if (d < 80) {
            this.player.takeDamage(e.dmg);
            this.addShake(12);
          }
          // 震地粒子
          for (let i = 0; i < 20; i++) {
            this.particles.push({
              x: e.x + rnd(-40, 40), y: e.y + rnd(-40, 40),
              vx: rnd(-3, 3), vy: rnd(-4, -1),
              life: 1, color: '#b8860b',
            });
          }
          this.projectiles.push(new Projectile(e.x, e.y, 0, 0, 0, true, 'slam'));
          e.lastSkill = null;
        }
        // poison：产生毒圈
        if (e.lastSkill === 'poison' && e.skillCD >= 175) {
          this.projectiles.push(new Projectile(
            this.player.x + rnd(-60, 60),
            this.player.y + rnd(-60, 60),
            0, 0, 1, true, 'poison'
          ));
          for (let i = 0; i < 12; i++) {
            this.particles.push({
              x: e.x + rnd(-20, 20), y: e.y + rnd(-20, 20),
              vx: rnd(-1, 1), vy: rnd(-2, 0),
              life: 1, color: '#7b2d8e',
            });
          }
          e.lastSkill = null;
        }

        // ---- Boss进化变体技能 ----
        // 传送：瞬移到玩家附近
        if (e._bossVariantSkills && e._bossVariantSkills.includes('teleport')) {
          if (!e._teleportCD) e._teleportCD = 0;
          e._teleportCD--;
          if (e._teleportCD <= 0) {
            const tpAngle = Math.random() * TAU;
            const tpDist = 80 + Math.random() * 60;
            e.x = this.player.x + Math.cos(tpAngle) * tpDist;
            e.y = this.player.y + Math.sin(tpAngle) * tpDist;
            e._teleportCD = 180 + Math.floor(Math.random() * 120);
            // 传送粒子
            for (let i = 0; i < 15; i++) {
              this.particles.push({
                x: e.x + rnd(-15, 15), y: e.y + rnd(-15, 15),
                vx: rnd(-2, 2), vy: rnd(-2, 2),
                life: 1, color: '#a040ff',
              });
            }
          }
        }
        // 分裂：低血量时分裂小怪
        if (e._bossVariantSkills && e._bossVariantSkills.includes('split') && !e._hasSplit) {
          if (e.hp < e.maxHp * 0.4) {
            e._hasSplit = true;
            for (let i = 0; i < 3; i++) {
              const sa = (TAU / 3) * i;
              const mini = new Enemy(
                e.x + Math.cos(sa) * 40,
                e.y + Math.sin(sa) * 40,
                { ...ENEMY_TYPES.brute, name: '分裂体', color: e.color, hp: Math.floor(e.maxHp * 0.15) },
                1 + this.wave * 0.1,
                this.diff
              );
              mini.isElite = true;
              this.enemies.push(mini);
            }
            this.addShake(8);
          }
        }
        // 区域封锁：周期性放置禁区
        if (e._bossVariantSkills && e._bossVariantSkills.includes('areaLock')) {
          if (!e._areaLockCD) e._areaLockCD = 0;
          e._areaLockCD--;
          if (e._areaLockCD <= 0) {
            e._areaLockCD = 240 + Math.floor(Math.random() * 120);
            this.hazards.push({
              x: this.player.x + rnd(-80, 80),
              y: this.player.y + rnd(-80, 80),
              radius: 60 + Math.random() * 30,
              type: 'fire',
              life: 360,
              dmgTimer: 0,
            });
          }
        }
      }
    }

    checkBladeHits() {
      const blades = this.player.getBladeEndpoints();

      // 记录刀刃尾迹
      for (const b of blades) {
        this.bladeTrails.push({
          x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, life: 1,
        });
      }
      // 硬上限防止极端情况
      if (this.bladeTrails.length > 200) this.bladeTrails = this.bladeTrails.slice(-100);

      for (const e of this.enemies) {
        if (!e.alive || e.bladeHitCD > 0) continue;
        for (const b of blades) {
          if (lineCircleIntersect(b.x1, b.y1, b.x2, b.y2, e.x, e.y, e.radius)) {
            const isCrit = Math.random() < this.player.critChance;
            let dmg = this.player.bladeDmg;
            if (isCrit) dmg = Math.floor(dmg * 2.5);
            // 冰窟地形脆弱加成
            if (this.terrain.fragile) dmg = Math.ceil(dmg * this.terrain.fragile);
            e.takeDamage(dmg);
            e.bladeHitCD = CFG.bladeHitCD;
            this.player.totalDmgDealt += dmg;

            this.dmgTexts.push(new DmgText(
              e.x + rnd(-8, 8), e.y - e.radius,
              String(dmg), isCrit ? '#ff4444' : '#ffd700', isCrit
            ));

            // 击退
            const ka = angle(this.player, e);
            const kb = e.isBoss ? 3 : 6;
            e.x += Math.cos(ka) * kb;
            e.y += Math.sin(ka) * kb;

            // 击中粒子
            for (let i = 0; i < (isCrit ? 6 : 3); i++) {
              this.particles.push({
                x: e.x, y: e.y,
                vx: rnd(-2, 2), vy: rnd(-3, 0),
                life: 1, color: isCrit ? '#ff4444' : '#ffd700',
              });
            }

            // 吸血技能：命中回血
            if (this.skills[5] && this.skills[5].active) {
              const healAmt = Math.max(1, Math.floor(dmg * 0.25));
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
              this.dmgTexts.push(new DmgText(this.player.x + rnd(-5, 5), this.player.y - 25, '+' + healAmt, '#ff6699', false));
            }

            if (!e.alive) this.onEnemyDeath(e);
            break;
          }
        }
      }
    }

    checkEnemyPlayerCollision() {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (this.player.collides(e)) {
          if (this.player.takeDamage(e.dmg)) {
            this.addShake(e.isBoss ? 10 : 5);
            if (this.player.thorns > 0) {
              e.takeDamage(this.player.thorns);
              if (!e.alive) this.onEnemyDeath(e);
            }
            const ka = angle(this.player, e);
            e.x += Math.cos(ka) * 25;
            e.y += Math.sin(ka) * 25;
          }
        }
      }
    }

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
    }

    checkPickupCollection() {
      for (const pk of this.pickups) {
        if (!pk.alive) continue;
        if (dist(pk, this.player) < this.player.pickupRange) {
          pk.alive = false;
          const comboMult = 1 + Math.min(this.killCombo, 50) * 0.02;
          const levelsGained = this.player.addXp(pk.xp, comboMult);
          if (levelsGained > 0) {
            // 升级金色粒子环
            for (let i = 0; i < 20; i++) {
              const angle = (Math.PI * 2 * i) / 20;
              this.particles.push({
                x: this.player.x, y: this.player.y,
                vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                life: 1, color: '#ffd700', size: 4,
              });
            }
            for (let l = 0; l < levelsGained; l++) {
              this.triggerUpgrade();
            }
          }
        }
      }
    }

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
          this.dmgTexts.push(new DmgText(gp.x + rnd(-8, 8), gp.y - 10, '+' + gp.amount + '金', '#ffd700', false));
        }
      }
    }

    onEnemyDeath(enemy) {
      this.player.kills++;
      this.enemiesKilledThisWave++;

      // 连杀计数
      this.killCombo++;
      this.killComboTimer = 90; // 1.5 seconds at 60fps

      this.pickups.push(new Pickup(enemy.x, enemy.y, enemy.xp));

      // 金币掉落
      const goldAmt = enemy.isBoss ? (10 + this.wave * 2) : (enemy.isElite ? (3 + Math.floor(this.wave * 0.5)) : (Math.random() < 0.4 ? 1 : 0));
      if (goldAmt > 0) {
        this.goldPickups.push({ x: enemy.x + rnd(-8, 8), y: enemy.y + rnd(-8, 8), amount: goldAmt, life: 420, bobPhase: Math.random() * TAU, alive: true });
      }

      // 吸血剑意：击杀回血
      if (this.player.vampireBlade > 0) {
        const healAmt = this.player.vampireBlade;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        if (healAmt > 0) {
          this.dmgTexts.push(new DmgText(this.player.x + rnd(-8, 8), this.player.y - 25, '+' + healAmt, '#ff6699', false));
        }
      }

      // 精英怪额外经验球
      if (enemy.isElite) {
        for (let i = 0; i < 3; i++) {
          this.pickups.push(new Pickup(
            enemy.x + rnd(-20, 20),
            enemy.y + rnd(-20, 20),
            Math.ceil(enemy.xp * 0.3)
          ));
        }
      }

      // 增强死亡粒子（18个主粒子）
      const count = enemy.isBoss ? 25 : 18;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: enemy.x, y: enemy.y,
          vx: rnd(-3, 3), vy: rnd(-3, 3),
          life: 1, color: enemy.color,
        });
      }
      // 二次扩散粒子（5个慢速长寿命）
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: enemy.x, y: enemy.y,
          vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
          life: 1.5, color: enemy.color || '#888', size: 2,
        });
      }

      if (enemy.isBoss) {
        this.addShake(15);
        this.bossFlash = 10; // 10帧金色闪光
        // Boss掉落多个经验球
        for (let i = 0; i < 5; i++) {
          this.pickups.push(new Pickup(
            enemy.x + rnd(-30, 30),
            enemy.y + rnd(-30, 30),
            Math.ceil(enemy.xp * 0.2)
          ));
        }
      }
    }

    triggerUpgrade() {
      // 返璞归真修饰符：禁止升级
      if (this._noUpgrade) return;
      this.upgradeQueue++;
      if (this.state !== 'upgrading') {
        this._prepareNextUpgrade();
      }
    }

    _prepareNextUpgrade() {
      if (this.upgradeQueue <= 0) {
        this.state = 'playing';
        return;
      }
      this.upgradeQueue--;
      const available = UPGRADES.filter(u => {
        const count = this.player.upgradeCounts[u.id] || 0;
        return count < u.max;
      });
      if (available.length === 0) { this.upgradeQueue = 0; this.state = 'playing'; return; }
      const shuffled = [...available];
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      this.pendingUpgrades = shuffled.slice(0, 3);

      // Guarantee at least one skill option in first 3 levels
      if (this.player.level <= 3) {
        const hasSkillOption = this.pendingUpgrades.some(o => o.id.startsWith('skill_'));
        const hasAnySkill = this.skills.some(s => s.unlocked);
        if (!hasSkillOption && !hasAnySkill) {
          const skillUpgrades = UPGRADES.filter(u => u.id.startsWith('skill_') && (!this.player.upgradeCounts[u.id] || this.player.upgradeCounts[u.id] < u.max));
          if (skillUpgrades.length > 0) {
            this.pendingUpgrades[this.pendingUpgrades.length - 1] = skillUpgrades[Math.floor(Math.random() * skillUpgrades.length)];
          }
        }
      }

      this.state = 'upgrading';
    }

    applyUpgrade(idx) {
      const u = this.pendingUpgrades[idx];
      if (!u) return;
      u.effect(this.player, this);
      this.player.upgradeCounts[u.id] = (this.player.upgradeCounts[u.id] || 0) + 1;
      this.pendingUpgrades = [];
      this._prepareNextUpgrade();
    }

    activateSkill(idx) {
      const skill = this.skills[idx];
      skill.currentCooldown = skill.cooldown;
      skill.active = true;
      skill.activeTimer = skill.duration;

      const p = this.player;
      if (skill.id === 'sword_qi') {
        // Fire 5 projectiles in a spread
        for (let i = -2; i <= 2; i++) {
          const a = p.facingAngle + i * 0.15;
          this.swordQiProjectiles.push({
            x: p.x, y: p.y,
            vx: Math.cos(a) * 8, vy: Math.sin(a) * 8,
            life: 60, dmg: p.bladeDmg * 2
          });
        }
      } else if (skill.id === 'shadow_clone') {
        this.shadowClone = { x: p.x, y: p.y, life: 180, hp: 1 };
      } else if (skill.id === 'golden_bell') {
        p.invincible = Math.max(p.invincible || 0, 180);
      } else if (skill.id === 'whirlwind') {
        // AOE damage to all enemies within 120px
        const range = 120;
        for (const e of this.enemies) {
          const dx = e.x - p.x, dy = e.y - p.y;
          if (dx*dx + dy*dy < range*range) {
            const dmg = p.bladeDmg * 3;
            const actualDmg = Math.max(1, dmg - (e.defense || 0));
            e.takeDamage(dmg);
            p.totalDmgDealt += actualDmg;
            this.dmgTexts.push(new DmgText(e.x + rnd(-8, 8), e.y - e.radius, String(actualDmg), '#4ad4d4', false));
            if (!e.alive) this.onEnemyDeath(e);
          }
        }
        // Visual particles
        for (let i = 0; i < 20; i++) {
          const a = (Math.PI * 2 * i) / 20;
          this.particles.push({
            x: p.x + Math.cos(a) * 40,
            y: p.y + Math.sin(a) * 40,
            vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
            life: 1, color: '#4ad4d4', size: 5
          });
        }
      } else if (skill.id === 'thunder') {
        // 全屏随机落雷：对最多8个敌人造成高伤害
        const targets = this.enemies.filter(e => e.alive).sort(() => Math.random() - 0.5).slice(0, 8);
        for (const e of targets) {
          const dmg = p.bladeDmg * 4;
          e.takeDamage(dmg);
          p.totalDmgDealt += dmg;
          this.dmgTexts.push(new DmgText(e.x, e.y - e.radius, String(dmg), '#ffff44', true));
          if (!e.alive) this.onEnemyDeath(e);
          // 雷电粒子
          for (let i = 0; i < 8; i++) {
            this.particles.push({ x: e.x + rnd(-5, 5), y: e.y + rnd(-30, 0), vx: rnd(-2, 2), vy: rnd(-4, -1), life: 1, color: '#ffff44', size: 3 });
          }
        }
      } else if (skill.id === 'lifesteal') {
        // 标记：5秒内刀刃命中回血（在checkBladeHits中检查）
        // active + activeTimer 已经设置
      } else if (skill.id === 'time_slow') {
        // 标记：4秒减速全部敌人（在enemy update中检查）
        // active + activeTimer 已经设置
      } else if (skill.id === 'blade_burst') {
        // 临时+3刀刃，5秒后恢复
        p.bladeCount += 3;
        this._bladeBurstExtra = 3;
      }
    }

    getTimeStr() {
      const secs = Math.floor(this.totalFrames / 60);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  }

  /* ---- 线段-圆碰撞 ---- */
  function lineCircleIntersect(x1, y1, x2, y2, cx, cy, cr) {
    const dx = x2 - x1, dy = y2 - y1;
    const fx = x1 - cx, fy = y1 - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - cr * cr;
    let disc = b * b - 4 * a * c;
    if (disc < 0) return false;
    disc = Math.sqrt(disc);
    const t1 = (-b - disc) / (2 * a);
    const t2 = (-b + disc) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }

  /* ---- UI/渲染 ---- */
  class GameUI {
    constructor() {
      this.canvas = document.getElementById('knife-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.game = new Game();

      this._resize();
      window.addEventListener('resize', () => this._resize());

      this.hud = document.getElementById('knife-hud');
      this.hpFill = document.getElementById('hp-fill');
      this.hpText = document.getElementById('hp-text');
      this.xpFill = document.getElementById('xp-fill');
      this.levelEl = document.getElementById('hud-level');
      this.waveEl = document.getElementById('hud-wave');
      this.killsEl = document.getElementById('hud-kills');
      this.timeEl = document.getElementById('hud-time');
      this.upgradePanel = document.getElementById('upgrade-panel');
      this.upgradeCards = document.getElementById('upgrade-cards');
      this.upgradeTitle = this.upgradePanel ? this.upgradePanel.querySelector('.upgrade-title') : null;
      this.overlay = document.getElementById('knife-overlay');
      this.overlayTitle = document.getElementById('knife-overlay-title');
      this.overlayDesc = document.getElementById('knife-overlay-desc');
      this.overlayBtn = document.getElementById('knife-overlay-btn');
      this.waveAnnounce = document.getElementById('wave-announce');
      this.bossBar = document.getElementById('knife-boss-bar');
      this.bossName = document.getElementById('knife-boss-name');
      this.bossHpFill = document.getElementById('knife-boss-hp-fill');
      this.goldEl = document.getElementById('hud-gold');
      this._rafId = null;
      this._running = false;
      this._skillSlots = {};
      this._lastSkillState = '';
      this._mobileSkillBtns = document.querySelectorAll('.mobile-skill-btn');

      this._initSettings();
      this._bindInput();
      this._showMenu();
      this._startLoop();
    }

    _resize() {
      const maxW = CFG.canvasW;
      const maxH = CFG.canvasH;
      const scaleX = (window.innerWidth - 20) / maxW;
      const scaleY = (window.innerHeight - 160) / maxH;
      const scale = Math.min(1, scaleX, scaleY);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = maxW * dpr;
      this.canvas.height = maxH * dpr;
      this.canvas.style.width = Math.round(maxW * scale) + 'px';
      this.canvas.style.height = Math.round(maxH * scale) + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cw = maxW;
      this.ch = maxH;
    }

    _initSettings() {
      const schema = [
        {
          key: 'difficulty', label: '难度', type: 'select', default: 'normal',
          options: [
            { value: 'easy', label: '简单' },
            { value: 'normal', label: '普通' },
            { value: 'hard', label: '困难' },
          ],
        },
        {
          key: 'showDmg', label: '伤害数字', type: 'checkbox', default: true,
          checkLabel: '显示伤害数字',
        },
      ];
      this.settings = new SettingsModal(schema, 'knife_settings', () => {
        this.game.setDifficulty(this.settings.get('difficulty'));
      });
      this.game.setDifficulty(this.settings.get('difficulty'));
    }

    _bindInput() {
      document.addEventListener('keydown', (e) => {
        this.game.keys[e.key.toLowerCase()] = true;
        if (e.code === 'Space' && this.game.state === 'paused') {
          this.game.state = 'playing';
          this._hideOverlay();
        }
        if (e.code === 'Escape') {
          if (this.game.state === 'playing') {
            this.game.state = 'paused';
            this._showPause();
          } else if (this.game.state === 'paused') {
            this.game.state = 'playing';
            this._hideOverlay();
          }
        }
        // Keyboard upgrade selection
        if (this.game.state === 'upgrading' && ['1','2','3'].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          if (idx < this.game.pendingUpgrades.length) {
            const upgradeName = this.game.pendingUpgrades[idx]?.name;
            this.game.applyUpgrade(idx);
            this.upgradePanel.classList.remove('active');
            showToast(upgradeName + ' +1', 'success', 1500);
          }
        }
        // Skill activation keys
        if (this.game.state === 'playing' && ['1','2','3','4','5','6','7','8'].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          const skill = this.game.skills[idx];
          if (skill && skill.unlocked && skill.currentCooldown <= 0) {
            this.game.activateSkill(idx);
          }
        }
      });
      document.addEventListener('keyup', (e) => {
        this.game.keys[e.key.toLowerCase()] = false;
      });

      // 摇杆
      const joystick = document.getElementById('joystick-area');
      const knob = document.getElementById('joystick-knob');
      if (joystick && knob) {
        let touching = false, startX = 0, startY = 0;
        const maxDist = 40;
        const onStart = (e) => {
          touching = true;
          const t = e.touches ? e.touches[0] : e;
          const rect = joystick.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
        };
        const onMove = (e) => {
          if (!touching) return;
          e.preventDefault();
          const t = e.touches ? e.touches[0] : e;
          let dx = t.clientX - startX;
          let dy = t.clientY - startY;
          const d = Math.hypot(dx, dy);
          if (d > maxDist) { dx = dx / d * maxDist; dy = dy / d * maxDist; }
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          this.game.joyDir = { x: dx / maxDist, y: dy / maxDist };
        };
        const onEnd = () => {
          touching = false;
          knob.style.transform = 'translate(0, 0)';
          this.game.joyDir = null;
        };
        joystick.addEventListener('touchstart', onStart, { passive: true });
        joystick.addEventListener('touchmove', onMove, { passive: false });
        joystick.addEventListener('touchend', onEnd);
        joystick.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
      }

      // Mobile skill buttons
      document.querySelectorAll('.mobile-skill-btn').forEach(btn => {
        const tryActivate = (e) => {
          if (e && e.cancelable) e.preventDefault();
          if (this.game.state !== 'playing') {
            showToast('请先开始游戏', 'info', 1200);
            return;
          }
          const idx = parseInt(btn.dataset.skillIdx);
          const skill = this.game.skills[idx];
          if (!skill) {
            showToast('请先开始游戏', 'info', 1200);
            return;
          }
          if (skill && skill.unlocked && skill.currentCooldown <= 0) {
            this.game.activateSkill(idx);
          } else if (skill && !skill.unlocked) {
            showToast(`未解锁：${skill.name}（升级时选择“习得：${skill.name}”）`, 'info', 2500);
          } else if (skill && skill.currentCooldown > 0) {
            showToast(`${skill.name}冷却中`, 'info', 1200);
          }
        };
        btn.addEventListener('touchstart', tryActivate, { passive: false });
        btn.addEventListener('click', tryActivate);
      });

      this.overlayBtn.addEventListener('click', () => {
        if (this.game.state === 'menu' || this.game.state === 'over') {
          // Hide shop panel if open
          const shopPanel = this.overlay.querySelector('#knife-perm-shop');
          if (shopPanel) shopPanel.style.display = 'none';
          const modPanel = this.overlay.querySelector('#knife-mod-panel');
          if (modPanel) modPanel.style.display = 'none';
          this.overlayTitle.style.display = '';
          this.overlayDesc.style.display = '';
          this.overlayBtn.style.display = '';
          const shopBtn = this.overlay.querySelector('#knife-shop-btn');
          if (shopBtn) shopBtn.style.display = 'none';

          // 应用选中的挑战修饰符
          this.game.activeModifiers = CHALLENGE_MODIFIERS.filter(m => this._selectedModifiers && this._selectedModifiers.has(m.id));

          this.game.setDifficulty(this.settings.get('difficulty'));
          this.game.start();
          this._gameOverPending = false;
          this._hideOverlay();
        } else if (this.game.state === 'paused') {
          this.game.state = 'playing';
          this._hideOverlay();
        }
      });
    }

    _showMenu() {
      const metaData = MetaProgress.load();
      const unlockedCount = metaData.unlocked.length;
      const totalCount = META_MILESTONES.length;
      let desc = 'WASD移动，旋转刀刃自动攻击\n击败武林高手，升级强化，挑战无尽波次';
      desc += `\n\n\u{1FA99} 金币: ${metaData.gold || 0}`;
      desc += `\n\n\u2B50 修炼成就 (${unlockedCount}/${totalCount})`;
      META_MILESTONES.forEach(m => {
        const isUnlocked = metaData.unlocked.includes(m.id);
        if (isUnlocked) {
          desc += `\n\u2705 ${m.label} - ${m.desc}`;
        } else {
          desc += `\n\u{1F512} ${m.label} - ${m.desc}`;
        }
      });

      // Show perm upgrade levels if any purchased
      const permLvls = metaData.permLevels || {};
      const hasPerm = Object.values(permLvls).some(v => v > 0);
      if (hasPerm) {
        desc += '\n\n\u{1F3CB} 永久强化';
        PERM_UPGRADES.forEach(u => {
          const lv = permLvls[u.id] || 0;
          if (lv > 0) desc += `\n${u.icon} ${u.name} Lv.${lv}`;
        });
      }

      this.overlayTitle.textContent = '转转刀';
      this.overlayDesc.textContent = desc;
      this.overlayBtn.textContent = '拔刀出鞘';
      this.overlay.classList.add('active');
      this.game.state = 'menu';

      // Hide shop panel if present
      const shopPanel = this.overlay.querySelector('#knife-perm-shop');
      if (shopPanel) shopPanel.style.display = 'none';
      this.overlayTitle.style.display = '';
      this.overlayDesc.style.display = '';
      this.overlayBtn.style.display = '';

      // 挑战修饰符选择区
      this._selectedModifiers = new Set();
      let modPanel = this.overlay.querySelector('#knife-mod-panel');
      if (!modPanel) {
        modPanel = document.createElement('div');
        modPanel.id = 'knife-mod-panel';
        modPanel.style.cssText = 'text-align:center;margin-top:8px;';
        this.overlayBtn.parentNode.insertBefore(modPanel, this.overlayBtn);
      }
      let modHtml = '<div style="color:#d4a44a;font-size:13px;margin-bottom:6px;">挑战修饰符 (可叠加)</div>';
      modHtml += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:480px;margin:0 auto 10px;">';
      CHALLENGE_MODIFIERS.forEach(m => {
        modHtml += `<button class="btn btn-outline knife-mod-btn" data-mod-id="${m.id}" style="font-size:12px;padding:4px 10px;opacity:0.6;" title="${m.desc}\n金币x${m.goldMul}">${m.icon} ${m.name}</button>`;
      });
      modHtml += '</div>';
      modPanel.innerHTML = modHtml;
      modPanel.style.display = '';

      modPanel.querySelectorAll('.knife-mod-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.modId;
          if (this._selectedModifiers.has(id)) {
            this._selectedModifiers.delete(id);
            btn.style.opacity = '0.6';
            btn.style.borderColor = '';
            btn.style.boxShadow = '';
          } else {
            this._selectedModifiers.add(id);
            btn.style.opacity = '1';
            btn.style.borderColor = '#ffd700';
            btn.style.boxShadow = '0 0 8px rgba(255,215,0,0.4)';
          }
        });
      });
    }

    _showPause() {
      this.overlayTitle.textContent = '暂停';
      this.overlayDesc.textContent = '按 ESC 或点击继续';
      this.overlayBtn.textContent = '继续战斗';
      this.overlay.classList.add('active');
    }

    _showGameOver() {
      const p = this.game.player;
      const newMilestones = MetaProgress.recordGame(p.kills, this.game.wave);
      const goldEarned = p.goldEarned || 0;
      const totalGold = MetaProgress.getGold();
      let desc =
        `存活时间: ${this.game.getTimeStr()}\n` +
        `击败: ${p.kills} 人  |  到达第 ${this.game.wave} 波\n` +
        `最终等级: ${p.level}  |  总伤害: ${formatNumber(p.totalDmgDealt)}\n` +
        `本次金币: +${goldEarned}  |  总金币: ${totalGold}`;
      // 显示活跃修饰符
      if (this.game.activeModifiers.length > 0) {
        desc += '\n挑战: ' + this.game.activeModifiers.map(m => m.icon + m.name).join(' ');
      }
      // 显示最终地形
      if (this.game.terrain && this.game.terrain.id !== 'plain') {
        desc += `\n地形: ${this.game.terrain.icon || ''} ${this.game.terrain.name}`;
      }
      if (newMilestones.length > 0) {
        desc += '\n\n';
        newMilestones.forEach(m => {
          desc += `\u{1F3C6} 新成就解锁：${m.label} - ${m.desc}\n`;
        });
      }
      this.overlayTitle.textContent = '侠客陨落';
      this.overlayDesc.textContent = desc + (typeof getEncouragement === 'function' ? '\n\n' + getEncouragement() : '');
      this.overlayBtn.textContent = '重新出山';
      this.overlay.classList.add('active');

      // Add shop button dynamically
      let shopBtn = this.overlay.querySelector('#knife-shop-btn');
      if (!shopBtn) {
        shopBtn = document.createElement('button');
        shopBtn.id = 'knife-shop-btn';
        shopBtn.className = 'btn btn-outline';
        shopBtn.style.cssText = 'margin-top:10px;display:block;margin-left:auto;margin-right:auto;';
        shopBtn.textContent = '永久强化商店';
        this.overlayBtn.parentNode.insertBefore(shopBtn, this.overlayBtn.nextSibling);
        shopBtn.addEventListener('click', () => this._showPermShop());
      }
      shopBtn.style.display = '';

      updateLeaderboard('knife', p.kills, { wave: this.game.wave, level: p.level, time: this.game.getTimeStr() });
      // 修饰符专属排行
      if (this.game.activeModifiers.length > 0) {
        const modKey = 'knife_' + this.game.activeModifiers.map(m => m.id).sort().join('_');
        updateLeaderboard(modKey, p.kills, { wave: this.game.wave, level: p.level, time: this.game.getTimeStr(), mods: this.game.activeModifiers.map(m => m.name).join('+') });
      }
      if (typeof CrossGameAchievements !== 'undefined') {
        CrossGameAchievements.trackStat('knife_max_wave', this.game.wave);
        CrossGameAchievements.trackStat('knife_max_kills', this.game.player.kills);
        CrossGameAchievements.trackStat('knife_kills', this.game.player.kills);
        CrossGameAchievements.trackStat('knife_run_gold', this.game.player.goldEarned || 0);
      }
    }

    _showPermShop() {
      const gold = MetaProgress.getGold();
      let html = '<div style="text-align:center;padding:16px;">';
      html += '<h3 style="color:#ffd700;margin-bottom:4px;">永久强化商店</h3>';
      html += '<p style="color:#d4a44a;margin-bottom:12px;">金币: <strong>' + gold + '</strong></p>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:480px;margin:0 auto;">';
      PERM_UPGRADES.forEach(u => {
        const lv = MetaProgress.getPermLevel(u.id);
        const maxed = lv >= u.maxLv;
        const cost = maxed ? '-' : getPermUpgradeCost(u, lv);
        const canBuy = !maxed && gold >= cost;
        html += `<div class="upgrade-card perm-shop-item" data-perm-id="${u.id}" style="cursor:${canBuy ? 'pointer' : 'default'};opacity:${canBuy ? 1 : 0.5};padding:10px;">
          <div class="upgrade-icon">${u.icon}</div>
          <div class="upgrade-name">${u.name} Lv.${lv}/${u.maxLv}</div>
          <div class="upgrade-desc">${u.desc}</div>
          <div class="upgrade-count" style="color:${canBuy ? '#ffd700' : '#888'};">${maxed ? '已满级' : '费用: ' + cost}</div>
        </div>`;
      });
      html += '</div>';
      html += '<button class="btn btn-outline" id="perm-shop-close" style="margin-top:12px;">返回</button>';
      html += '</div>';

      this.overlayTitle.style.display = 'none';
      this.overlayDesc.style.display = 'none';
      this.overlayBtn.style.display = 'none';
      const shopBtn = this.overlay.querySelector('#knife-shop-btn');
      if (shopBtn) shopBtn.style.display = 'none';

      let shopPanel = this.overlay.querySelector('#knife-perm-shop');
      if (!shopPanel) {
        shopPanel = document.createElement('div');
        shopPanel.id = 'knife-perm-shop';
        this.overlay.appendChild(shopPanel);
      }
      shopPanel.innerHTML = html;
      shopPanel.style.display = '';

      shopPanel.querySelectorAll('.perm-shop-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.permId;
          if (MetaProgress.buyPermUpgrade(id)) {
            showToast('强化成功！', 'success', 1500);
            this._showPermShop(); // refresh
          }
        });
      });

      shopPanel.querySelector('#perm-shop-close').addEventListener('click', () => {
        shopPanel.style.display = 'none';
        this.overlayTitle.style.display = '';
        this.overlayDesc.style.display = '';
        this.overlayBtn.style.display = '';
        const sb = this.overlay.querySelector('#knife-shop-btn');
        if (sb) sb.style.display = '';
        // Update gold display in desc
        const p = this.game.player;
        const totalGold = MetaProgress.getGold();
        const goldEarned = p.goldEarned || 0;
        let desc =
          `存活时间: ${this.game.getTimeStr()}\n` +
          `击败: ${p.kills} 人  |  到达第 ${this.game.wave} 波\n` +
          `最终等级: ${p.level}  |  总伤害: ${formatNumber(p.totalDmgDealt)}\n` +
          `本次金币: +${goldEarned}  |  总金币: ${totalGold}`;
        this.overlayDesc.textContent = desc;
      });
    }

    _hideOverlay() { this.overlay.classList.remove('active'); }

    _showUpgradePanel() {
      if (this.upgradeTitle) this.upgradeTitle.textContent = '武功精进 - 选择一项强化';
      if (this.upgradePanel) this.upgradePanel.classList.remove('blessing');
      const cards = this.game.pendingUpgrades;
      let html = '';
      cards.forEach((u, i) => {
        const count = this.game.player.upgradeCounts[u.id] || 0;
        html += `<div class="upgrade-card" data-idx="${i}">
          <div class="upgrade-icon">${u.icon}</div>
          <div class="upgrade-name">${u.name}</div>
          <div class="upgrade-desc">${u.desc}</div>
          <div class="upgrade-count">${count}/${u.max}</div>
        </div>`;
      });
      this.upgradeCards.innerHTML = html;
      this.upgradePanel.classList.add('active');

      this.upgradeCards.querySelectorAll('.upgrade-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.dataset.idx);
          this.game.applyUpgrade(idx);
          this.upgradePanel.classList.remove('active');
          showToast(cards[idx].name + ' +1', 'success', 1500);
        });
      });
    }

    _showBlessingPanel() {
      if (this.upgradeTitle) this.upgradeTitle.textContent = '仙缘祝福 - 选择一项加持';
      if (this.upgradePanel) this.upgradePanel.classList.add('blessing');
      const cards = this.game.pendingBlessings || [];
      let html = '';
      cards.forEach((b, i) => {
        html += `<div class="upgrade-card" data-idx="${i}">
          <div class="upgrade-icon">${b.icon}</div>
          <div class="upgrade-name">${b.name}</div>
          <div class="upgrade-desc">${b.desc}</div>
          <div class="upgrade-count">波次祝福</div>
        </div>`;
      });
      this.upgradeCards.innerHTML = html;
      this.upgradePanel.classList.add('active');

      this.upgradeCards.querySelectorAll('.upgrade-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.dataset.idx);
          const picked = cards[idx];
          this.game.applyBlessing(idx);
          this.upgradePanel.classList.remove('active');
          if (picked) showToast(picked.name + ' 生效', 'success', 1500);
        });
      });
    }

    _updateHUD() {
      const p = this.game.player;
      if (!p) return;
      if (this.game.state === 'menu') return;

      this.hpFill.style.width = (p.hp / p.maxHp * 100) + '%';
      this.hpText.textContent = `${p.hp}/${p.maxHp}`;
      this.xpFill.style.width = (p.xp / p.xpToNext() * 100) + '%';
      this.levelEl.textContent = p.level;
      this.waveEl.textContent = this.game.wave;
      this.killsEl.textContent = p.kills;
      this.timeEl.textContent = this.game.getTimeStr();

      // Gold display
      if (this.goldEl) this.goldEl.textContent = this.game.runGold || 0;

      const boss = this.game.enemies.find(e => e.isBoss && e.alive);
      if (boss) {
        this.bossBar.classList.add('active');
        this.bossName.textContent = boss.name;
        this.bossHpFill.style.width = (boss.hp / boss.maxHp * 100) + '%';
      } else {
        this.bossBar.classList.remove('active');
      }

      if (this.game.waveTransition > 0 && this.game.waveTransition < 80) {
        const isBoss = this.game._bossRush || this.game.wave % CFG.bossEvery === 0;
        let announceText = isBoss ? `BOSS - 第${this.game.wave}波` : `第 ${this.game.wave} 波`;
        // 地形切换提示
        if (this.game.terrain && this.game.terrain.id !== 'plain') {
          announceText += ` | ${this.game.terrain.icon || ''} ${this.game.terrain.name}`;
        }
        this.waveAnnounce.textContent = announceText;
        this.waveAnnounce.className = 'wave-announce active' + (isBoss ? ' boss' : '');
      } else {
        this.waveAnnounce.classList.remove('active');
      }

      // 技能栏更新（缓存）
      const skillBar = document.getElementById('skill-bar');
      if (skillBar && this.game.skills) {
        if (!this._skillBarBound) {
          this._skillBarBound = true;
          skillBar.addEventListener('click', (e) => {
            const slot = e.target.closest('.skill-slot');
            if (!slot || this.game.state !== 'playing') return;
            const skillId = slot.dataset.skillId;
            const idx = this.game.skills.findIndex(s => s.id === skillId);
            const skill = this.game.skills[idx];
            if (skill && skill.unlocked && skill.currentCooldown <= 0) {
              this.game.activateSkill(idx);
            }
          });
        }
        const unlockedKey = this.game.skills.filter(s => s.unlocked).map(s => s.id).join(',');
        if (unlockedKey !== this._lastSkillState) {
          this._lastSkillState = unlockedKey;
          this._skillSlots = {};
          let sh = '';
          for (const skill of this.game.skills) {
            if (!skill.unlocked) continue;
            sh += `<div class="skill-slot" data-skill-id="${skill.id}">
              <span class="skill-icon">${skill.icon}</span>
              <span class="skill-key">${skill.key}</span>
              <div class="skill-cd-mask" style="height:0%"></div>
            </div>`;
          }
          skillBar.innerHTML = sh;
          for (const skill of this.game.skills) {
            if (!skill.unlocked) continue;
            this._skillSlots[skill.id] = skillBar.querySelector(`[data-skill-id="${skill.id}"]`);
          }
        }
        for (const skill of this.game.skills) {
          if (!skill.unlocked) continue;
          const slot = this._skillSlots[skill.id];
          if (!slot) continue;
          const cdPct = skill.currentCooldown > 0 ? (skill.currentCooldown / skill.cooldown * 100) : 0;
          const mask = slot.querySelector('.skill-cd-mask');
          if (mask) mask.style.height = cdPct + '%';
          if (skill.active) slot.classList.add('active');
          else slot.classList.remove('active');
        }
      }

      // Sync mobile skill buttons
      this._mobileSkillBtns.forEach(btn => {
        const idx = parseInt(btn.dataset.skillIdx);
        const skill = this.game.skills ? this.game.skills[idx] : null;
        if (!skill) return;
        btn.classList.toggle('locked', !skill.unlocked);
        btn.classList.toggle('cooldown', skill.unlocked && skill.currentCooldown > 0);
        btn.classList.toggle('active', skill.active);
      });
    }

    /* ---- 主循环 ---- */
    _startLoop() {
      if (this._running) return;
      this._running = true;
      this._rafId = requestAnimationFrame(() => this._loop());
    }

    _stopLoop() {
      this._running = false;
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
    }

    _loop() {
      if (!this._running) return;
      try {
        this.game.update();

        if (this.game.state === 'upgrading' && this.game.pendingUpgrades.length > 0) {
          if (!this.upgradePanel.classList.contains('active')) {
            this._showUpgradePanel();
          }
        }

        if (this.game.state === 'blessing' && this.game.pendingBlessings && this.game.pendingBlessings.length > 0) {
          if (!this.upgradePanel.classList.contains('active')) {
            this._showBlessingPanel();
          }
        }

        if (this.game.state === 'over' && !this.overlay.classList.contains('active') && !this._gameOverPending) {
          this._gameOverPending = true;
          setTimeout(() => this._showGameOver(), 500);
        }

        this._draw();
        this._updateHUD();
      } catch (err) {
        console.error('[KnifeGame] loop error:', err);
      }
      this._rafId = requestAnimationFrame(() => this._loop());
    }

    /* ---- 绘制 ---- */
    _draw() {
      const ctx = this.ctx;
      const g = this.game;
      ctx.clearRect(0, 0, this.cw, this.ch);

      if (!g.player) {
        this._drawMenuBg(ctx);
        return;
      }

      ctx.save();
      ctx.translate(-g.cameraX + g.shakeX, -g.cameraY + g.shakeY);

      this._drawGround(ctx);
      this._drawHazards(ctx);
      this._drawChests(ctx);
      this._drawPickups(ctx);
      this._drawGoldPickups(ctx);
      this._drawEnemies(ctx);
      this._drawProjectiles(ctx);
      this._drawBladeTrails(ctx);
      this._drawPlayer(ctx);
      this._drawParticles(ctx);
      this._drawDmgTexts(ctx);
      this._drawSkillEffects(ctx);

      // 连杀计数器（绘制在玩家头顶，跟随摄像机）
      if (g.killCombo >= 2) {
        ctx.save();
        const comboMult = 1 + Math.min(g.killCombo, 50) * 0.02;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = g.killCombo >= 10 ? '#ff4444' : g.killCombo >= 5 ? '#ffa500' : '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText(`${g.killCombo} 连杀！ x${comboMult.toFixed(2)}`, g.player.x, g.player.y - 35);
        ctx.restore();
      }

      ctx.restore();

      // Boss击杀金色闪光（屏幕空间）
      if (g.bossFlash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 215, 0, ${g.bossFlash * 0.04})`;
        ctx.fillRect(0, 0, this.cw, this.ch);
        ctx.restore();
      }

      // 时缓效果蓝色滤镜
      if (g._timeSlowActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(100, 150, 255, 0.08)';
        ctx.fillRect(0, 0, this.cw, this.ch);
        ctx.restore();
      }

      // 吸血效果红色边框
      if (g.skills && g.skills[5] && g.skills[5].active) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 50, 80, 0.3)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, this.cw - 4, this.ch - 4);
        ctx.restore();
      }
    }

    _drawMenuBg(ctx) {
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, this.cw, this.ch);
      const t = Date.now() * 0.001;
      ctx.save();
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 6; i++) {
        const x = this.cw / 2 + Math.cos(t + i * 1.05) * 120;
        const y = this.ch / 2 + Math.sin(t * 0.7 + i * 1.05) * 90;
        ctx.strokeStyle = '#d4a44a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 25 + i * 18, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawGround(ctx) {
      const camX = this.game.cameraX - this.game.shakeX;
      const camY = this.game.cameraY - this.game.shakeY;
      const terrain = this.game.terrain || TERRAINS[0];

      // 背景渐变
      const grad = ctx.createRadialGradient(
        this.game.player.x, this.game.player.y, 50,
        this.game.player.x, this.game.player.y, 500
      );
      grad.addColorStop(0, terrain.bgInner);
      grad.addColorStop(1, terrain.bgOuter);
      ctx.fillStyle = grad;
      ctx.fillRect(camX, camY, this.cw, this.ch);

      // 熔岩地形额外效果：脉动热浪
      if (terrain.id === 'lava') {
        const t = Date.now() * 0.002;
        ctx.save();
        ctx.fillStyle = `rgba(255, 60, 0, ${0.02 + Math.sin(t) * 0.01})`;
        ctx.fillRect(camX, camY, this.cw, this.ch);
        ctx.restore();
      }
      // 冰窟地形额外效果：蓝色冰霜
      if (terrain.id === 'ice') {
        ctx.save();
        ctx.fillStyle = 'rgba(100, 160, 255, 0.03)';
        ctx.fillRect(camX, camY, this.cw, this.ch);
        ctx.restore();
      }

      // 网格
      ctx.strokeStyle = terrain.gridColor;
      ctx.lineWidth = 1;
      const gs = 80;
      const sx = Math.floor(camX / gs) * gs;
      const sy = Math.floor(camY / gs) * gs;
      for (let x = sx; x < camX + this.cw + gs; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, camY); ctx.lineTo(x, camY + this.ch); ctx.stroke();
      }
      for (let y = sy; y < camY + this.ch + gs; y += gs) {
        ctx.beginPath(); ctx.moveTo(camX, y); ctx.lineTo(camX + this.cw, y); ctx.stroke();
      }

      // 地面装饰
      for (const d of this.game.groundDecor) {
        if (d.x < camX - 20 || d.x > camX + this.cw + 20 ||
            d.y < camY - 20 || d.y > camY + this.ch + 20) continue;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.angle);
        ctx.fillStyle = d.color;
        if (d.type === 'grass') {
          ctx.fillRect(-1, -d.size, 2, d.size);
          ctx.fillRect(-d.size * 0.3, -d.size * 0.7, 2, d.size * 0.5);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, d.size * 0.5, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    _drawPlayer(ctx) {
      const p = this.game.player;
      if (!p) return;

      const flicker = p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0;
      if (flicker) ctx.globalAlpha = 0.35;

      // 拾取范围
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.pickupRange, 0, TAU);
      ctx.strokeStyle = 'rgba(212, 164, 74, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 武侠角色
      ctx.save();
      ctx.translate(p.x, p.y);

      // --- 真气光环 ---
      const auraRadius = p.radius + 5 + Math.min(p.level * 0.5, 15);
      const auraPulse = 0.15 + 0.1 * Math.sin(Date.now() * 0.003);
      const auraHue = p.level < 10 ? 45 : p.level < 25 ? 180 : 280;
      const auraSat = p.level < 10 ? '80%' : '70%';
      const auraLight = p.level < 10 ? '55%' : '60%';
      const auraGrad = ctx.createRadialGradient(0, 0, p.radius * 0.5, 0, 0, auraRadius);
      auraGrad.addColorStop(0, `hsla(${auraHue}, ${auraSat}, ${auraLight}, ${auraPulse * 0.6})`);
      auraGrad.addColorStop(0.6, `hsla(${auraHue}, ${auraSat}, ${auraLight}, ${auraPulse * 0.3})`);
      auraGrad.addColorStop(1, `hsla(${auraHue}, ${auraSat}, ${auraLight}, 0)`);
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, auraRadius, 0, TAU);
      ctx.fill();

      // --- 角色朝向旋转 ---
      ctx.rotate(p.facingAngle + Math.PI / 2);

      // --- 长袍（梯形） ---
      const robeTopW = 8;
      const robeBotW = 14;
      const robeH = 32;
      const robeTopY = -6;
      const robeBotY = robeTopY + robeH;
      const robeGrad = ctx.createLinearGradient(0, robeTopY, 0, robeBotY);
      robeGrad.addColorStop(0, '#2a5a8c');
      robeGrad.addColorStop(1, '#1a3a5c');
      ctx.fillStyle = robeGrad;
      ctx.beginPath();
      ctx.moveTo(-robeTopW, robeTopY);
      ctx.lineTo(robeTopW, robeTopY);
      ctx.lineTo(robeBotW, robeBotY);
      ctx.lineTo(-robeBotW, robeBotY);
      ctx.closePath();
      ctx.fill();
      // 衣襟中线
      ctx.strokeStyle = '#d4a44a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, robeTopY + 2);
      ctx.lineTo(0, robeBotY - 2);
      ctx.stroke();
      // 腰带
      const beltY = robeTopY + robeH * 0.35;
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-robeTopW - 2, beltY);
      ctx.lineTo(robeTopW + 2, beltY);
      ctx.stroke();

      // --- 头部 ---
      const headR = 8;
      const headY = robeTopY - headR + 1;
      // 皮肤
      ctx.fillStyle = '#f5deb3';
      ctx.beginPath();
      ctx.arc(0, headY, headR, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#d2b48c';
      ctx.lineWidth = 1;
      ctx.stroke();

      // --- 头发发髻 ---
      const bunR = 4;
      const bunY = headY - headR + 1;
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(0, bunY, bunR, 0, TAU);
      ctx.fill();
      // 发簪
      ctx.strokeStyle = '#d4a44a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-bunR - 3, bunY);
      ctx.lineTo(bunR + 3, bunY);
      ctx.stroke();

      // --- 眼睛（朝前方向） ---
      ctx.fillStyle = '#2c1810';
      ctx.beginPath();
      ctx.arc(-3, headY - 1, 1.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3, headY - 1, 1.5, 0, TAU);
      ctx.fill();

      // --- 飘逸红色飘带 ---
      const t = Date.now() * 0.005;
      const ribbonColor = '#c0392b';
      ctx.strokeStyle = ribbonColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      // 左飘带
      const lsx = -robeTopW + 1;
      const lsy = beltY;
      ctx.beginPath();
      ctx.moveTo(lsx, lsy);
      ctx.quadraticCurveTo(
        lsx - 6 + Math.sin(t) * 4,
        lsy + 14 + Math.sin(t + 1) * 3,
        lsx - 10 + Math.sin(t + 0.5) * 6,
        lsy + 26 + Math.cos(t) * 3
      );
      ctx.stroke();
      // 右飘带
      const rsx = robeTopW - 1;
      const rsy = beltY;
      ctx.beginPath();
      ctx.moveTo(rsx, rsy);
      ctx.quadraticCurveTo(
        rsx + 6 + Math.sin(t + 2) * 4,
        rsy + 14 + Math.sin(t + 3) * 3,
        rsx + 10 + Math.sin(t + 2.5) * 6,
        rsy + 26 + Math.cos(t + 2) * 3
      );
      ctx.stroke();

      ctx.restore();

      ctx.globalAlpha = 1;

      // 旋转刀刃
      const blades = p.getBladeEndpoints();
      // 集中绘制所有刀刃，减少 save/restore 和 shadowBlur 切换次数
      // Pass 1: 光效层（无 shadow）
      ctx.save();
      ctx.lineCap = 'round';
      for (const b of blades) {
        ctx.strokeStyle = 'rgba(212, 164, 74, 0.12)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
      }
      // Pass 2: 刀身（统一设置 shadow 一次）
      ctx.strokeStyle = '#f0e0c0';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      for (const b of blades) {
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
      }
      // Pass 3: 刀尖发光点
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      for (const b of blades) {
        ctx.beginPath();
        ctx.arc(b.x2, b.y2, 4, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawBladeTrails(ctx) {
      if (this.game.bladeTrails.length === 0) return;
      ctx.save();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3 + Math.min(this.game.player.level * 0.2, 3);
      ctx.lineCap = 'round';
      for (const t of this.game.bladeTrails) {
        ctx.globalAlpha = t.life * 0.2;
        ctx.beginPath();
        ctx.moveTo(t.x1, t.y1);
        ctx.lineTo(t.x2, t.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawEnemies(ctx) {
      for (const e of this.game.enemies) {
        if (!e.alive) continue;
        ctx.save();
        ctx.translate(e.x, e.y);

        // Boss光环
        if (e.isBoss) {
          const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 10, 0, TAU);
          ctx.strokeStyle = `rgba(255, 50, 50, ${pulse * 0.4})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // 精英怪发光轮廓
        if (e.isElite) {
          const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
          const eliteColor = e.type.name === '影刺客' ? `rgba(160, 50, 255, ${pulse * 0.6})` : `rgba(180, 180, 220, ${pulse * 0.6})`;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 6, 0, TAU);
          ctx.strokeStyle = eliteColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = eliteColor;
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        const hitFlash = e.hitFlash > 0;

        // 根据类型分发绘制
        if (e.isBoss) {
          this._drawBossModel(ctx, e, hitFlash);
        } else {
          const typeName = e.type ? e.type.name : '';
          switch (typeName) {
            case '小喽啰': this._drawEnemy_pawn(ctx, e, hitFlash); break;
            case '剑客':   this._drawEnemy_swordsman(ctx, e, hitFlash); break;
            case '弓手':   this._drawEnemy_archer(ctx, e, hitFlash); break;
            case '壮汉':   this._drawEnemy_brute(ctx, e, hitFlash); break;
            case '忍者':   this._drawEnemy_ninja(ctx, e, hitFlash); break;
            case '影刺客': this._drawEnemy_shadow(ctx, e, hitFlash); break;
            case '铁盾兵': this._drawEnemy_shield(ctx, e, hitFlash); break;
            default:       this._drawEnemy_pawn(ctx, e, hitFlash); break;
          }
        }

        // HP条
        if (e.hp < e.maxHp) {
          const bw = Math.max(e.radius * 2, 20);
          const bh = e.isBoss ? 5 : 3;
          const by = -e.radius - 10;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-bw / 2, by, bw, bh);
          ctx.fillStyle = e.isBoss ? '#ff4444' : '#44ff44';
          ctx.fillRect(-bw / 2, by, bw * (e.hp / e.maxHp), bh);
        }

        // Boss名字
        if (e.isBoss) {
          ctx.font = 'bold 12px "LXGW WenKai", serif';
          ctx.fillStyle = '#ff8888';
          ctx.textAlign = 'center';
          ctx.fillText(e.name, 0, -e.radius - 16);
        }

        // 精英怪名字
        if (e.isElite) {
          ctx.font = 'bold 10px "LXGW WenKai", serif';
          ctx.fillStyle = e.type.name === '影刺客' ? '#bb77ff' : '#ccccee';
          ctx.textAlign = 'center';
          ctx.fillText(e.name, 0, -e.radius - 14);
        }

        ctx.restore();
      }
    }

    /* ===== 普通怪绘制方法 ===== */

    // 小喽啰：棕色短衣小人，圆头，手持木棍
    _drawEnemy_pawn(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;

      // 身体 - 棕色短衣
      const bodyH = r * 1.8;
      const bodyW = r * 0.9;
      ctx.fillStyle = white ? '#fff' : '#7a5c3a';
      ctx.beginPath();
      ctx.moveTo(-bodyW, -2);
      ctx.lineTo(bodyW, -2);
      ctx.lineTo(bodyW * 1.1, bodyH * 0.6);
      ctx.lineTo(-bodyW * 1.1, bodyH * 0.6);
      ctx.closePath();
      ctx.fill();

      // 腰带
      ctx.strokeStyle = white ? '#fff' : '#5a3a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-bodyW * 1.05, bodyH * 0.25);
      ctx.lineTo(bodyW * 1.05, bodyH * 0.25);
      ctx.stroke();

      // 头 - 圆头
      ctx.fillStyle = white ? '#fff' : '#d4a87a';
      ctx.beginPath();
      ctx.arc(0, -4, r * 0.55, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = white ? '#fff' : '#a07050';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 眼睛
      if (!white) {
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2.5, -5, 1.2, 0, TAU);
        ctx.arc(2.5, -5, 1.2, 0, TAU);
        ctx.fill();
      }

      // 木棍 - 右手
      ctx.strokeStyle = white ? '#fff' : '#8B6914';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bodyW + 1, 0);
      ctx.lineTo(bodyW + 2, -r * 1.2);
      ctx.stroke();

      ctx.restore();
    }

    // 剑客：蓝色长衫，头戴斗笠，腰悬长剑
    _drawEnemy_swordsman(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;

      // 长衫 - 蓝色梯形
      const robeH = r * 2.2;
      const topW = r * 0.65;
      const botW = r * 1.1;
      const grad = white ? null : ctx.createLinearGradient(0, -4, 0, robeH * 0.6);
      if (!white) { grad.addColorStop(0, '#3a6a9a'); grad.addColorStop(1, '#2a4a6a'); }
      ctx.fillStyle = white ? '#fff' : grad;
      ctx.beginPath();
      ctx.moveTo(-topW, -4);
      ctx.lineTo(topW, -4);
      ctx.lineTo(botW, robeH * 0.55);
      ctx.lineTo(-botW, robeH * 0.55);
      ctx.closePath();
      ctx.fill();

      // 衣襟中线
      ctx.strokeStyle = white ? '#fff' : '#8ab4d0';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(0, robeH * 0.5);
      ctx.stroke();

      // 腰带
      ctx.strokeStyle = white ? '#fff' : '#1a3050';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-topW * 1.2, robeH * 0.18);
      ctx.lineTo(topW * 1.2, robeH * 0.18);
      ctx.stroke();

      // 头
      ctx.fillStyle = white ? '#fff' : '#d4b89a';
      ctx.beginPath();
      ctx.arc(0, -6, r * 0.45, 0, TAU);
      ctx.fill();

      // 斗笠
      ctx.fillStyle = white ? '#fff' : '#6a5a40';
      ctx.beginPath();
      ctx.ellipse(0, -8, r * 0.8, r * 0.25, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = white ? '#fff' : '#5a4a30';
      ctx.beginPath();
      ctx.arc(0, -9, r * 0.3, 0, Math.PI, true);
      ctx.fill();

      // 长剑 - 前指
      ctx.strokeStyle = white ? '#fff' : '#c0c8d8';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(topW + 2, 2);
      ctx.lineTo(topW + 2, -r * 1.5);
      ctx.stroke();
      // 剑柄
      ctx.strokeStyle = white ? '#fff' : '#8a6a3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(topW + 2, 2);
      ctx.lineTo(topW + 2, 6);
      ctx.stroke();
      // 剑格
      ctx.strokeStyle = white ? '#fff' : '#d4a44a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(topW - 1, 2);
      ctx.lineTo(topW + 5, 2);
      ctx.stroke();

      ctx.restore();
    }

    // 弓手：绿色猎装，背挎箭壶，手持弓形
    _drawEnemy_archer(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;

      // 猎装
      const bodyH = r * 1.8;
      const topW = r * 0.6;
      const botW = r * 0.85;
      ctx.fillStyle = white ? '#fff' : '#4a6a2a';
      ctx.beginPath();
      ctx.moveTo(-topW, -2);
      ctx.lineTo(topW, -2);
      ctx.lineTo(botW, bodyH * 0.55);
      ctx.lineTo(-botW, bodyH * 0.55);
      ctx.closePath();
      ctx.fill();

      // 腰带
      ctx.strokeStyle = white ? '#fff' : '#2a4a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-topW * 1.1, bodyH * 0.2);
      ctx.lineTo(topW * 1.1, bodyH * 0.2);
      ctx.stroke();

      // 头
      ctx.fillStyle = white ? '#fff' : '#c8a878';
      ctx.beginPath();
      ctx.arc(0, -5, r * 0.45, 0, TAU);
      ctx.fill();

      // 头巾
      ctx.fillStyle = white ? '#fff' : '#3a5a1a';
      ctx.beginPath();
      ctx.arc(0, -6, r * 0.48, Math.PI, TAU);
      ctx.fill();

      // 眼睛
      if (!white) {
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-2, -5, 1, 0, TAU);
        ctx.arc(2, -5, 1, 0, TAU);
        ctx.fill();
      }

      // 箭壶 - 背后
      ctx.fillStyle = white ? '#fff' : '#6a4a2a';
      ctx.fillRect(-topW - 4, -2, 3, bodyH * 0.35);
      // 箭尾
      if (!white) {
        ctx.strokeStyle = '#8a7a5a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-topW - 2.5, -2 - i * 2);
          ctx.lineTo(-topW - 2.5, -5 - i * 2);
          ctx.stroke();
        }
      }

      // 弓
      ctx.strokeStyle = white ? '#fff' : '#8B6914';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(topW + 4, 0, r * 0.9, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
      // 弓弦
      ctx.strokeStyle = white ? '#fff' : '#ccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const bx = topW + 4;
      const by1 = -r * 0.9 * Math.sin(Math.PI * 0.4);
      const by2 = r * 0.9 * Math.sin(Math.PI * 0.4);
      ctx.moveTo(bx + r * 0.9 * Math.cos(Math.PI * 0.4), by1);
      ctx.lineTo(bx + r * 0.9 * Math.cos(Math.PI * 0.4), by2);
      ctx.stroke();

      ctx.restore();
    }

    // 壮汉：红棕色裸上身大块头，粗壮手臂，手持大锤
    _drawEnemy_brute(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;

      // 裸上身 - 宽梯形
      const bodyH = r * 1.6;
      const topW = r * 0.8;
      const botW = r * 0.95;
      ctx.fillStyle = white ? '#fff' : '#a06040';
      ctx.beginPath();
      ctx.moveTo(-topW, -2);
      ctx.lineTo(topW, -2);
      ctx.lineTo(botW, bodyH * 0.5);
      ctx.lineTo(-botW, bodyH * 0.5);
      ctx.closePath();
      ctx.fill();

      // 胸肌纹理
      if (!white) {
        ctx.strokeStyle = '#804830';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-3, 4, 4, 0.3, Math.PI - 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(3, 4, 4, 0.3, Math.PI - 0.3);
        ctx.stroke();
      }

      // 腰带/裤子
      ctx.fillStyle = white ? '#fff' : '#4a2a1a';
      ctx.fillRect(-botW, bodyH * 0.4, botW * 2, bodyH * 0.15);

      // 粗壮手臂 左
      ctx.fillStyle = white ? '#fff' : '#a06040';
      ctx.beginPath();
      ctx.ellipse(-topW - 4, 4, 5, 3, -0.3, 0, TAU);
      ctx.fill();

      // 粗壮手臂 右
      ctx.beginPath();
      ctx.ellipse(topW + 4, 4, 5, 3, 0.3, 0, TAU);
      ctx.fill();

      // 头 - 大
      ctx.fillStyle = white ? '#fff' : '#b87858';
      ctx.beginPath();
      ctx.arc(0, -6, r * 0.5, 0, TAU);
      ctx.fill();

      // 怒目
      if (!white) {
        ctx.fillStyle = '#600';
        ctx.beginPath();
        ctx.ellipse(-3, -7, 2, 1.5, 0, 0, TAU);
        ctx.ellipse(3, -7, 2, 1.5, 0, 0, TAU);
        ctx.fill();
        // 眉毛
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -9); ctx.lineTo(-1, -9.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, -9); ctx.lineTo(1, -9.5);
        ctx.stroke();
      }

      // 大锤
      ctx.strokeStyle = white ? '#fff' : '#666';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(topW + 6, 2);
      ctx.lineTo(topW + 6, -r * 1.3);
      ctx.stroke();
      // 锤头
      ctx.fillStyle = white ? '#fff' : '#888';
      ctx.fillRect(topW + 1, -r * 1.3 - 4, 10, 8);
      ctx.strokeStyle = white ? '#fff' : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(topW + 1, -r * 1.3 - 4, 10, 8);

      ctx.restore();
    }

    // 忍者：深紫黑装，蒙面只露眼睛，身形纤细，半透明残影
    _drawEnemy_ninja(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;

      // 残影效果
      if (!white) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#2c2c54';
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.ellipse(0, i * 5, r * 0.5, r * 0.8, 0, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // 纤细身体
      const bodyH = r * 2;
      const topW = r * 0.45;
      const botW = r * 0.6;
      ctx.fillStyle = white ? '#fff' : '#1a1a3a';
      ctx.beginPath();
      ctx.moveTo(-topW, -2);
      ctx.lineTo(topW, -2);
      ctx.lineTo(botW, bodyH * 0.5);
      ctx.lineTo(-botW, bodyH * 0.5);
      ctx.closePath();
      ctx.fill();

      // 交叉绑带
      if (!white) {
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-topW, 0); ctx.lineTo(topW, bodyH * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(topW, 0); ctx.lineTo(-topW, bodyH * 0.3);
        ctx.stroke();
      }

      // 头 - 蒙面
      ctx.fillStyle = white ? '#fff' : '#1a1a3a';
      ctx.beginPath();
      ctx.arc(0, -5, r * 0.45, 0, TAU);
      ctx.fill();

      // 只露眼睛
      if (!white) {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.ellipse(-2.5, -5, 1.5, 0.8, 0, 0, TAU);
        ctx.ellipse(2.5, -5, 1.5, 0.8, 0, 0, TAU);
        ctx.fill();
      }

      // 忍者刀 - 背后斜挂
      ctx.strokeStyle = white ? '#fff' : '#aaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, bodyH * 0.4);
      ctx.lineTo(5, -r * 1.4);
      ctx.stroke();

      ctx.restore();
    }

    // 影刺客：暗紫精英，双匕首，周身暗影粒子
    _drawEnemy_shadow(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;
      const t = Date.now() * 0.003;

      // 暗影粒子环绕
      if (!white) {
        for (let i = 0; i < 6; i++) {
          const angle = t + i * (TAU / 6);
          const px = Math.cos(angle) * (r + 5);
          const py = Math.sin(angle) * (r + 5);
          ctx.fillStyle = `rgba(100, 40, 160, ${0.3 + 0.2 * Math.sin(t + i)})`;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, TAU);
          ctx.fill();
        }
      }

      // 身体
      const bodyH = r * 2;
      const topW = r * 0.5;
      const botW = r * 0.7;
      const grad = white ? null : ctx.createLinearGradient(0, -4, 0, bodyH * 0.5);
      if (!white) { grad.addColorStop(0, '#2a0a4a'); grad.addColorStop(1, '#1a0a2e'); }
      ctx.fillStyle = white ? '#fff' : grad;
      ctx.beginPath();
      ctx.moveTo(-topW, -2);
      ctx.lineTo(topW, -2);
      ctx.lineTo(botW, bodyH * 0.5);
      ctx.lineTo(-botW, bodyH * 0.5);
      ctx.closePath();
      ctx.fill();

      // 头
      ctx.fillStyle = white ? '#fff' : '#1a0a2e';
      ctx.beginPath();
      ctx.arc(0, -5, r * 0.42, 0, TAU);
      ctx.fill();

      // 冷光眼睛
      if (!white) {
        ctx.fillStyle = '#cc44ff';
        ctx.shadowColor = '#cc44ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(-2.5, -5.5, 1.5, 0.8, 0, 0, TAU);
        ctx.ellipse(2.5, -5.5, 1.5, 0.8, 0, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 双匕首
      ctx.strokeStyle = white ? '#fff' : '#b080e0';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      // 左匕
      ctx.beginPath();
      ctx.moveTo(-topW - 2, 2);
      ctx.lineTo(-topW - 4, -r * 1);
      ctx.stroke();
      // 右匕
      ctx.beginPath();
      ctx.moveTo(topW + 2, 2);
      ctx.lineTo(topW + 4, -r * 1);
      ctx.stroke();

      ctx.restore();
    }

    // 铁盾兵：灰色重甲，正面大盾
    _drawEnemy_shield(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;

      // 重甲身体
      const bodyH = r * 1.6;
      const topW = r * 0.75;
      const botW = r * 0.85;
      const grad = white ? null : ctx.createLinearGradient(0, -4, 0, bodyH * 0.5);
      if (!white) { grad.addColorStop(0, '#7a7a8a'); grad.addColorStop(1, '#5a5a6a'); }
      ctx.fillStyle = white ? '#fff' : grad;
      ctx.beginPath();
      ctx.moveTo(-topW, -2);
      ctx.lineTo(topW, -2);
      ctx.lineTo(botW, bodyH * 0.5);
      ctx.lineTo(-botW, bodyH * 0.5);
      ctx.closePath();
      ctx.fill();

      // 铠甲纹理
      if (!white) {
        ctx.strokeStyle = '#9a9aaa';
        ctx.lineWidth = 0.8;
        for (let y = 2; y < bodyH * 0.45; y += 5) {
          ctx.beginPath();
          ctx.moveTo(-topW * 0.8, y);
          ctx.lineTo(topW * 0.8, y);
          ctx.stroke();
        }
      }

      // 头盔
      ctx.fillStyle = white ? '#fff' : '#6a6a7a';
      ctx.beginPath();
      ctx.arc(0, -5, r * 0.5, 0, TAU);
      ctx.fill();
      // 头盔面罩
      ctx.fillStyle = white ? '#fff' : '#4a4a5a';
      ctx.beginPath();
      ctx.arc(0, -4, r * 0.5, -0.4, Math.PI + 0.4);
      ctx.fill();
      // 眼缝
      if (!white) {
        ctx.fillStyle = '#222';
        ctx.fillRect(-4, -6, 8, 2);
      }

      // 大盾 - 正面弧形
      const shieldW = r * 0.85;
      const shieldH = r * 1.3;
      const grad2 = white ? null : ctx.createLinearGradient(-shieldW, 0, shieldW, 0);
      if (!white) { grad2.addColorStop(0, '#6a6a7a'); grad2.addColorStop(0.5, '#9a9aaa'); grad2.addColorStop(1, '#6a6a7a'); }
      ctx.fillStyle = white ? '#fff' : grad2;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.3, shieldW, shieldH, 0, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = white ? '#fff' : '#aaa';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 盾上金属纹
      if (!white) {
        ctx.strokeStyle = '#b0a080';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.9);
        ctx.lineTo(0, r * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-shieldW * 0.6, -r * 0.3);
        ctx.lineTo(shieldW * 0.6, -r * 0.3);
        ctx.stroke();
      }

      ctx.restore();
    }

    /* ===== Boss绘制方法 ===== */

    _drawBossModel(ctx, e, hitFlash) {
      const name = e.name;
      if (name === '黑风寨主')   this._drawBoss_heifeng(ctx, e, hitFlash);
      else if (name === '毒娘子') this._drawBoss_duniang(ctx, e, hitFlash);
      else if (name === '铁臂金刚') this._drawBoss_tiebi(ctx, e, hitFlash);
      else if (name === '幽冥剑仙') this._drawBoss_youming(ctx, e, hitFlash);
      else if (name === '鸠摩天王') this._drawBoss_jiumo(ctx, e, hitFlash);
      else this._drawEnemy_pawn(ctx, e, hitFlash); // fallback
    }

    // 黑风寨主：黑色大氅，双肩护甲，红色眼睛，脚下暗风旋转
    _drawBoss_heifeng(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;
      const t = Date.now() * 0.004;

      // 脚下暗风旋转
      if (!white) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 4; i++) {
          const a = t + i * (TAU / 4);
          const rx = Math.cos(a) * r * 0.8;
          const ry = r * 0.6 + Math.sin(a) * r * 0.3;
          ctx.fillStyle = '#1a1a3e';
          ctx.beginPath();
          ctx.arc(rx, ry, 4, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }

      // 大氅
      const cloakH = r * 2;
      const topW = r * 0.7;
      const botW = r * 1.2;
      const grad = white ? null : ctx.createLinearGradient(0, -6, 0, cloakH * 0.6);
      if (!white) { grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(1, '#0a0a1e'); }
      ctx.fillStyle = white ? '#fff' : grad;
      ctx.beginPath();
      ctx.moveTo(-topW, -4);
      ctx.lineTo(topW, -4);
      ctx.lineTo(botW, cloakH * 0.55);
      ctx.quadraticCurveTo(0, cloakH * 0.65, -botW, cloakH * 0.55);
      ctx.closePath();
      ctx.fill();

      // 双肩护甲
      ctx.fillStyle = white ? '#fff' : '#3a3a5a';
      ctx.beginPath();
      ctx.ellipse(-topW - 3, -2, 6, 4, -0.3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(topW + 3, -2, 6, 4, 0.3, 0, TAU);
      ctx.fill();
      // 护甲纹
      if (!white) {
        ctx.strokeStyle = '#5a5a7a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-topW - 3, -2, 4, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(topW + 3, -2, 4, 0, Math.PI);
        ctx.stroke();
      }

      // 头
      ctx.fillStyle = white ? '#fff' : '#2a2a3e';
      ctx.beginPath();
      ctx.arc(0, -8, r * 0.45, 0, TAU);
      ctx.fill();

      // 红色眼睛
      if (!white) {
        ctx.fillStyle = '#ff2020';
        ctx.shadowColor = '#ff2020';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(-3, -8, 2, 1.2, 0, 0, TAU);
        ctx.ellipse(3, -8, 2, 1.2, 0, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    // 毒娘子：紫色长裙，飘逸长发，手持毒扇，周围毒雾粒子
    _drawBoss_duniang(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;
      const t = Date.now() * 0.003;

      // 毒雾粒子
      if (!white) {
        for (let i = 0; i < 8; i++) {
          const a = t * 0.7 + i * (TAU / 8);
          const dist = r + 3 + Math.sin(t + i * 1.3) * 4;
          const px = Math.cos(a) * dist;
          const py = Math.sin(a) * dist;
          ctx.fillStyle = `rgba(120, 40, 160, ${0.2 + 0.15 * Math.sin(t + i)})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, TAU);
          ctx.fill();
        }
      }

      // 紫色长裙
      const dressH = r * 2.2;
      const topW = r * 0.55;
      const botW = r * 1.1;
      const grad = white ? null : ctx.createLinearGradient(0, -4, 0, dressH * 0.6);
      if (!white) { grad.addColorStop(0, '#6a1a7a'); grad.addColorStop(1, '#4a0e5e'); }
      ctx.fillStyle = white ? '#fff' : grad;
      ctx.beginPath();
      ctx.moveTo(-topW, -2);
      ctx.lineTo(topW, -2);
      ctx.quadraticCurveTo(botW * 1.2, dressH * 0.3, botW, dressH * 0.6);
      ctx.quadraticCurveTo(0, dressH * 0.7, -botW, dressH * 0.6);
      ctx.quadraticCurveTo(-botW * 1.2, dressH * 0.3, -topW, -2);
      ctx.closePath();
      ctx.fill();

      // 腰带
      ctx.strokeStyle = white ? '#fff' : '#c070e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-topW * 1.2, dressH * 0.12);
      ctx.lineTo(topW * 1.2, dressH * 0.12);
      ctx.stroke();

      // 头
      ctx.fillStyle = white ? '#fff' : '#e0c0a0';
      ctx.beginPath();
      ctx.arc(0, -6, r * 0.4, 0, TAU);
      ctx.fill();

      // 飘逸长发
      ctx.fillStyle = white ? '#fff' : '#1a0a2e';
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -8);
      ctx.quadraticCurveTo(-r * 0.7, -2, -r * 0.6, 8);
      ctx.lineTo(-r * 0.3, 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.35, -8);
      ctx.quadraticCurveTo(r * 0.7, -2, r * 0.6, 8);
      ctx.lineTo(r * 0.3, 6);
      ctx.closePath();
      ctx.fill();

      // 眼睛
      if (!white) {
        ctx.fillStyle = '#a040c0';
        ctx.beginPath();
        ctx.ellipse(-2, -6, 1.5, 1, 0, 0, TAU);
        ctx.ellipse(2, -6, 1.5, 1, 0, 0, TAU);
        ctx.fill();
      }

      // 毒扇 - 右手
      ctx.fillStyle = white ? '#fff' : '#7a2a9a';
      ctx.beginPath();
      ctx.moveTo(topW + 3, 0);
      const fanR = r * 0.7;
      for (let i = -3; i <= 3; i++) {
        const fa = -Math.PI * 0.3 + i * (Math.PI * 0.6 / 6);
        ctx.lineTo(topW + 3 + Math.cos(fa) * fanR, Math.sin(fa) * fanR);
      }
      ctx.closePath();
      ctx.fill();
      if (!white) {
        ctx.strokeStyle = '#c070e0';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();
    }

    // 铁臂金刚：金色铠甲壮汉，双拳，地面裂纹光效
    _drawBoss_tiebi(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;
      const t = Date.now() * 0.003;

      // 地面裂纹光效
      if (!white) {
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t);
        ctx.strokeStyle = '#d4a44a';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          const a = i * (TAU / 5) + t * 0.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.5, r * 0.5 + Math.sin(a) * r * 0.3);
          ctx.lineTo(Math.cos(a) * r * 1.2, r * 0.5 + Math.sin(a) * r * 0.6);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 金色铠甲身体
      const bodyH = r * 1.7;
      const topW = r * 0.85;
      const botW = r * 0.9;
      const grad = white ? null : ctx.createLinearGradient(0, -4, 0, bodyH * 0.5);
      if (!white) { grad.addColorStop(0, '#c8a020'); grad.addColorStop(0.5, '#e8c040'); grad.addColorStop(1, '#a08018'); }
      ctx.fillStyle = white ? '#fff' : grad;
      ctx.beginPath();
      ctx.moveTo(-topW, -2);
      ctx.lineTo(topW, -2);
      ctx.lineTo(botW, bodyH * 0.5);
      ctx.lineTo(-botW, bodyH * 0.5);
      ctx.closePath();
      ctx.fill();

      // 铠甲纹理
      if (!white) {
        ctx.strokeStyle = '#d4a44a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, bodyH * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-topW * 0.6, bodyH * 0.15);
        ctx.lineTo(topW * 0.6, bodyH * 0.15);
        ctx.stroke();
      }

      // 粗壮手臂+拳头
      ctx.fillStyle = white ? '#fff' : '#c8a020';
      ctx.beginPath();
      ctx.ellipse(-topW - 6, 2, 7, 5, -0.2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(topW + 6, 2, 7, 5, 0.2, 0, TAU);
      ctx.fill();
      // 拳头
      ctx.fillStyle = white ? '#fff' : '#d0a870';
      ctx.beginPath();
      ctx.arc(-topW - 10, 2, 5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(topW + 10, 2, 5, 0, TAU);
      ctx.fill();

      // 头
      ctx.fillStyle = white ? '#fff' : '#d0a870';
      ctx.beginPath();
      ctx.arc(0, -8, r * 0.48, 0, TAU);
      ctx.fill();

      // 金色头盔
      ctx.fillStyle = white ? '#fff' : '#c8a020';
      ctx.beginPath();
      ctx.arc(0, -9, r * 0.5, Math.PI, TAU);
      ctx.fill();

      // 怒目
      if (!white) {
        ctx.fillStyle = '#600';
        ctx.beginPath();
        ctx.ellipse(-3.5, -8, 2, 1.5, 0, 0, TAU);
        ctx.ellipse(3.5, -8, 2, 1.5, 0, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    }

    // 幽冥剑仙：冰蓝长袍，手持幽冥剑，剑光拖尾，冷冽气场
    _drawBoss_youming(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;
      const t = Date.now() * 0.004;

      // 冷冽气场粒子
      if (!white) {
        for (let i = 0; i < 6; i++) {
          const a = t + i * (TAU / 6);
          const dist = r + 4 + Math.sin(t * 1.5 + i) * 3;
          ctx.fillStyle = `rgba(100, 180, 255, ${0.2 + 0.15 * Math.sin(t + i)})`;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, 1.5, 0, TAU);
          ctx.fill();
        }
      }

      // 冰蓝长袍
      const robeH = r * 2.3;
      const topW = r * 0.6;
      const botW = r * 1;
      const grad = white ? null : ctx.createLinearGradient(0, -6, 0, robeH * 0.6);
      if (!white) { grad.addColorStop(0, '#1a4a7a'); grad.addColorStop(1, '#0a2a5a'); }
      ctx.fillStyle = white ? '#fff' : grad;
      ctx.beginPath();
      ctx.moveTo(-topW, -4);
      ctx.lineTo(topW, -4);
      ctx.lineTo(botW, robeH * 0.55);
      ctx.lineTo(-botW, robeH * 0.55);
      ctx.closePath();
      ctx.fill();

      // 衣纹
      if (!white) {
        ctx.strokeStyle = '#4080b0';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -2); ctx.lineTo(0, robeH * 0.5);
        ctx.stroke();
      }

      // 腰带
      ctx.strokeStyle = white ? '#fff' : '#80c0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-topW * 1.3, robeH * 0.15);
      ctx.lineTo(topW * 1.3, robeH * 0.15);
      ctx.stroke();

      // 头
      ctx.fillStyle = white ? '#fff' : '#c0d8e8';
      ctx.beginPath();
      ctx.arc(0, -8, r * 0.42, 0, TAU);
      ctx.fill();

      // 发髻
      ctx.fillStyle = white ? '#fff' : '#1a3050';
      ctx.beginPath();
      ctx.arc(0, -11, r * 0.22, 0, TAU);
      ctx.fill();

      // 冰蓝眼睛
      if (!white) {
        ctx.fillStyle = '#60c0ff';
        ctx.shadowColor = '#60c0ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(-2.5, -8, 1.5, 1, 0, 0, TAU);
        ctx.ellipse(2.5, -8, 1.5, 1, 0, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 幽冥剑 + 剑光拖尾
      const swordLen = r * 1.8;
      // 拖尾
      if (!white) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#60c0ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(topW + 3, 4);
        ctx.lineTo(topW + 3, -swordLen + 4);
        ctx.stroke();
        ctx.restore();
      }
      // 剑身
      ctx.strokeStyle = white ? '#fff' : '#a0d8ff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(topW + 3, 4);
      ctx.lineTo(topW + 3, -swordLen);
      ctx.stroke();
      // 剑柄
      ctx.strokeStyle = white ? '#fff' : '#4080b0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(topW + 3, 4);
      ctx.lineTo(topW + 3, 9);
      ctx.stroke();

      ctx.restore();
    }

    // 鸠摩天王：最大体型，红金战甲，肩扛巨斧，脚踏火焰
    _drawBoss_jiumo(ctx, e, hitFlash) {
      ctx.save();
      ctx.rotate(e.moveAngle + Math.PI / 2);
      const r = e.radius;
      const white = hitFlash;
      const t = Date.now() * 0.005;

      // 脚踏火焰
      if (!white) {
        for (let i = 0; i < 8; i++) {
          const a = t * 0.8 + i * (TAU / 8);
          const dist = r * 0.6 + Math.sin(t + i * 0.9) * 4;
          const fy = r * 0.5 + Math.abs(Math.sin(a)) * 4;
          const fx = Math.cos(a) * dist;
          const flameH = 4 + Math.sin(t * 2 + i) * 3;
          ctx.fillStyle = `rgba(255, ${80 + i * 15}, 20, ${0.3 + 0.2 * Math.sin(t + i)})`;
          ctx.beginPath();
          ctx.moveTo(fx - 2, fy);
          ctx.quadraticCurveTo(fx, fy - flameH, fx + 2, fy);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 红金战甲
      const bodyH = r * 1.8;
      const topW = r * 0.85;
      const botW = r * 0.95;
      const grad = white ? null : ctx.createLinearGradient(0, -6, 0, bodyH * 0.5);
      if (!white) { grad.addColorStop(0, '#c0392b'); grad.addColorStop(0.4, '#d4543a'); grad.addColorStop(1, '#a02818'); }
      ctx.fillStyle = white ? '#fff' : grad;
      ctx.beginPath();
      ctx.moveTo(-topW, -4);
      ctx.lineTo(topW, -4);
      ctx.lineTo(botW, bodyH * 0.5);
      ctx.lineTo(-botW, bodyH * 0.5);
      ctx.closePath();
      ctx.fill();

      // 金色铠甲纹
      if (!white) {
        ctx.strokeStyle = '#d4a44a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -2); ctx.lineTo(0, bodyH * 0.45);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-topW * 0.7, bodyH * 0.15);
        ctx.lineTo(topW * 0.7, bodyH * 0.15);
        ctx.stroke();
        // V形金甲
        ctx.beginPath();
        ctx.moveTo(-topW * 0.5, 0);
        ctx.lineTo(0, bodyH * 0.2);
        ctx.lineTo(topW * 0.5, 0);
        ctx.stroke();
      }

      // 大肩甲
      ctx.fillStyle = white ? '#fff' : '#d4a44a';
      ctx.beginPath();
      ctx.ellipse(-topW - 5, -2, 8, 6, -0.3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(topW + 5, -2, 8, 6, 0.3, 0, TAU);
      ctx.fill();
      // 肩甲尖刺
      if (!white) {
        ctx.fillStyle = '#b08830';
        ctx.beginPath();
        ctx.moveTo(-topW - 12, -4);
        ctx.lineTo(-topW - 8, -10);
        ctx.lineTo(-topW - 4, -4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(topW + 12, -4);
        ctx.lineTo(topW + 8, -10);
        ctx.lineTo(topW + 4, -4);
        ctx.fill();
      }

      // 头
      ctx.fillStyle = white ? '#fff' : '#c09070';
      ctx.beginPath();
      ctx.arc(0, -10, r * 0.45, 0, TAU);
      ctx.fill();

      // 金冠
      ctx.fillStyle = white ? '#fff' : '#d4a44a';
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -12);
      ctx.lineTo(-r * 0.25, -16);
      ctx.lineTo(-r * 0.1, -13);
      ctx.lineTo(0, -17);
      ctx.lineTo(r * 0.1, -13);
      ctx.lineTo(r * 0.25, -16);
      ctx.lineTo(r * 0.35, -12);
      ctx.closePath();
      ctx.fill();

      // 怒目
      if (!white) {
        ctx.fillStyle = '#ff3030';
        ctx.shadowColor = '#ff3030';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.ellipse(-3.5, -10, 2, 1.5, 0, 0, TAU);
        ctx.ellipse(3.5, -10, 2, 1.5, 0, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 巨斧 - 肩扛
      const axeX = topW + 8;
      // 斧柄
      ctx.strokeStyle = white ? '#fff' : '#6a4a2a';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(axeX, bodyH * 0.3);
      ctx.lineTo(axeX, -r * 1.5);
      ctx.stroke();
      // 斧头
      ctx.fillStyle = white ? '#fff' : '#aaa';
      ctx.beginPath();
      ctx.moveTo(axeX, -r * 1.5);
      ctx.quadraticCurveTo(axeX + 12, -r * 1.3, axeX + 10, -r * 1);
      ctx.lineTo(axeX, -r * 1.1);
      ctx.quadraticCurveTo(axeX - 6, -r * 1.3, axeX, -r * 1.5);
      ctx.fill();
      // 斧刃光
      if (!white) {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(axeX + 4, -r * 1.25, 6, -0.5, 0.5);
        ctx.stroke();
      }

      ctx.restore();
    }

    _drawProjectiles(ctx) {
      for (const p of this.game.projectiles) {
        if (!p.alive) continue;
        ctx.save();
        if (p.type === 'poison') {
          // 毒圈
          const alpha = (p.life / p.maxLife) * 0.3;
          ctx.fillStyle = `rgba(123, 45, 142, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(180, 80, 200, ${alpha * 1.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (p.type === 'slam') {
          // 震地波纹
          const progress = 1 - p.life / p.maxLife;
          const r = progress * 80;
          ctx.strokeStyle = `rgba(184, 134, 11, ${(1 - progress) * 0.6})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.fromEnemy ? '#ff6666' : '#66ff66';
          ctx.shadowColor = p.fromEnemy ? '#ff0000' : '#00ff00';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    _drawPickups(ctx) {
      if (this.game.pickups.length === 0) return;
      ctx.save();
      ctx.shadowColor = '#4adad4';
      ctx.shadowBlur = 10;
      for (const pk of this.game.pickups) {
        const bob = Math.sin(pk.bobPhase) * 3;
        const pulse = 0.8 + Math.sin(pk.bobPhase * 1.5) * 0.2;
        const r = 6 * pulse;
        ctx.fillStyle = '#80f0ec';
        ctx.beginPath();
        ctx.arc(pk.x, pk.y + bob, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawGoldPickups(ctx) {
      if (!this.game.goldPickups || this.game.goldPickups.length === 0) return;
      ctx.save();
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      for (const gp of this.game.goldPickups) {
        if (!gp.alive) continue;
        const bob = Math.sin(gp.bobPhase) * 3;
        const pulse = 0.85 + Math.sin(gp.bobPhase * 1.3) * 0.15;
        const r = 5 * pulse;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(gp.x, gp.y + bob, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#b8860b';
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', gp.x, gp.y + bob + 2);
      }
      ctx.restore();
    }

    _drawHazards(ctx) {
      for (const h of this.game.hazards) {
        ctx.save();
        const alpha = Math.min(1, h.life / 60) * 0.35; // 消退前淡出
        const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.06;
        const r = h.radius * pulse;

        if (h.type === 'fire') {
          const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
          grad.addColorStop(0, `rgba(255, 100, 30, ${alpha * 0.8})`);
          grad.addColorStop(0.5, `rgba(255, 60, 10, ${alpha * 0.4})`);
          grad.addColorStop(1, `rgba(200, 40, 0, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(h.x, h.y, r, 0, TAU);
          ctx.fill();
          // 火焰边缘
          ctx.strokeStyle = `rgba(255, 120, 40, ${alpha * 0.6})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (h.type === 'poison') {
          const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
          grad.addColorStop(0, `rgba(50, 180, 50, ${alpha * 0.7})`);
          grad.addColorStop(0.5, `rgba(30, 140, 30, ${alpha * 0.35})`);
          grad.addColorStop(1, `rgba(20, 100, 20, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(h.x, h.y, r, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(80, 200, 80, ${alpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (h.type === 'ice') {
          const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
          grad.addColorStop(0, `rgba(150, 220, 255, ${alpha * 0.6})`);
          grad.addColorStop(0.5, `rgba(100, 180, 255, ${alpha * 0.3})`);
          grad.addColorStop(1, `rgba(80, 150, 220, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(h.x, h.y, r, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(180, 230, 255, ${alpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // 危害类型图标
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = alpha * 2;
        const icon = h.type === 'fire' ? '🔥' : h.type === 'poison' ? '☠️' : '❄️';
        ctx.fillText(icon, h.x, h.y + 5);
        ctx.restore();
      }
    }

    _drawChests(ctx) {
      for (const ch of this.game.chests) {
        if (!ch.alive) continue;
        ctx.save();
        const bob = Math.sin(ch.bobPhase) * 4;
        ctx.translate(ch.x, ch.y + bob);

        // 宝箱发光
        const glow = 0.3 + Math.sin(ch.bobPhase * 1.2) * 0.15;
        const glowColor = ch.type === 'gold' ? `rgba(255, 215, 0, ${glow})`
          : ch.type === 'heal' ? `rgba(68, 255, 68, ${glow})`
          : `rgba(74, 218, 212, ${glow})`;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 14;

        // 宝箱底色
        const boxColor = ch.type === 'gold' ? '#c8a020' : ch.type === 'heal' ? '#28a028' : '#2090a0';
        const boxLight = ch.type === 'gold' ? '#ffe060' : ch.type === 'heal' ? '#60ff60' : '#60e0e0';

        // 箱体
        ctx.fillStyle = boxColor;
        ctx.fillRect(-10, -6, 20, 14);
        // 箱盖
        ctx.fillStyle = boxLight;
        ctx.fillRect(-11, -8, 22, 5);
        // 锁扣
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-3, -4, 6, 4);
        ctx.shadowBlur = 0;

        // 宝箱类型图标
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const icon = ch.type === 'gold' ? '💰' : ch.type === 'heal' ? '❤️' : '✨';
        ctx.fillText(icon, 0, -12);

        ctx.restore();
      }
    }

    _drawParticles(ctx) {
      if (this.game.particles.length === 0) return;
      ctx.save();
      for (const p of this.game.particles) {
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.fillStyle = p.color;
        const baseSize = p.size || 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, baseSize * Math.min(1, p.life) + 0.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawDmgTexts(ctx) {
      if (!this.settings.get('showDmg')) return;
      for (const dt of this.game.dmgTexts) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, dt.life / (dt.maxLife * 0.3));
        const scale = dt.isCrit ? 1 + (1 - dt.life / dt.maxLife) * 0.3 : 1;
        ctx.font = dt.isCrit
          ? `bold ${Math.round(18 * scale)}px "LXGW WenKai", serif`
          : '14px "LXGW WenKai", serif';
        ctx.fillStyle = dt.color;
        ctx.textAlign = 'center';
        if (dt.isCrit) {
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 8;
        }
        ctx.fillText(dt.text, dt.x, dt.y);
        ctx.restore();
      }
    }

    _drawSkillEffects(ctx) {
      // Draw sword qi projectiles
      for (const proj of (this.game.swordQiProjectiles || [])) {
        ctx.save();
        ctx.fillStyle = '#4ad4ff';
        ctx.shadowColor = '#4ad4ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // Draw shadow clone
      if (this.game.shadowClone) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(this.game.shadowClone.x, this.game.shadowClone.y, 16, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('\u5F71', this.game.shadowClone.x, this.game.shadowClone.y + 4);
        ctx.restore();
      }

      // Draw golden bell shield
      const goldenBellSkill = (this.game.skills || []).find(s => s.id === 'golden_bell');
      if (goldenBellSkill && goldenBellSkill.active) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.game.player.x, this.game.player.y, this.game.player.radius + 10, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // Draw time slow overlay
      const timeSlowSkill = (this.game.skills || []).find(s => s.id === 'time_slow');
      if (timeSlowSkill && timeSlowSkill.active) {
        ctx.save();
        ctx.fillStyle = 'rgba(100, 150, 255, 0.06)';
        ctx.fillRect(this.game.cameraX, this.game.cameraY, this.cw, this.ch);
        ctx.restore();
      }

      // Draw lifesteal aura
      const lifestealSkill = (this.game.skills || []).find(s => s.id === 'lifesteal');
      if (lifestealSkill && lifestealSkill.active) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 50, 80, 0.4)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 10;
        const pulseR = this.game.player.radius + 6 + Math.sin(Date.now() * 0.005) * 3;
        ctx.beginPath();
        ctx.arc(this.game.player.x, this.game.player.y, pulseR, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // Draw blade burst glow
      const bladeBurstSkill = (this.game.skills || []).find(s => s.id === 'blade_burst');
      if (bladeBurstSkill && bladeBurstSkill.active) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 140, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff8c00';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.game.player.x, this.game.player.y, this.game.player.bladeLen + 5, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /* ---- 颜色辅助 ---- */
  function lightenColor(hex, amt) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + amt);
    const g = Math.min(255, ((num >> 8) & 0xFF) + amt);
    const b = Math.min(255, (num & 0xFF) + amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---- 启动 ---- */
  initNav('knife');
  initParticles('#particles', 20);
  new GameUI();

  // 新手引导
  if (typeof GuideSystem !== 'undefined') {
    GuideSystem.start('knife', [
      { title: '欢迎来到转转刀！', desc: '化身武林大侠，旋转刀刃割草千军，挑战无尽波次。' },
      { title: '开始战斗', desc: '点击此按钮开始新一局战斗。', target: '#knife-overlay-btn' },
      { title: '操作提示', desc: '鼠标/手指控制角色移动，刀刃自动旋转攻击敌人。生存越久波次越高！' }
    ]);
  }

})();
