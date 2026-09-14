export const TAU = Math.PI * 2;

/* ---- 配置 ---- */
export const CFG = {
  canvasW: 800,
  canvasH: 600,
  playerRadius: 16,
  playerSpeed: 2.6,
  baseBladeLen: 65,
  baseBladeSpeed: 0.05,
  bladeDmg: 1,
  bladeHitCD: 12,            // 刀刃对同一敌人的打击冷却（帧）
  xpPerLevel: [10, 16, 24, 36, 52, 72, 92, 115, 140, 170],
  enemySpawnInterval: 65,    // 帧（更快刷怪→割草感）
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
export const DIFF = {
  easy:   { hpMul: 0.7, spdMul: 0.8, spawnMul: 1.3, dmgMul: 0.7 },
  normal: { hpMul: 1.0, spdMul: 1.0, spawnMul: 1.0, dmgMul: 1.0 },
  hard:   { hpMul: 1.5, spdMul: 1.2, spawnMul: 0.7, dmgMul: 1.4 },
};

/* ---- 敌人类型 ---- */
export const ENEMY_TYPES = {
  pawn:      { name: '小喽啰', hp: 3,  speed: 1.0, radius: 10, dmg: 1, xp: 1, color: '#8B4513' },
  swordsman: { name: '剑客',   hp: 6,  speed: 1.3, radius: 12, dmg: 1, xp: 2, color: '#4a6fa5' },
  archer:    { name: '弓手',   hp: 4,  speed: 0.8, radius: 10, dmg: 1, xp: 2, color: '#6b8e23', ranged: true, shootCD: 120 },
  brute:     { name: '壮汉',   hp: 14, speed: 0.6, radius: 18, dmg: 2, xp: 3, color: '#8b0000' },
  ninja:     { name: '忍者',   hp: 5,  speed: 2.2, radius: 9,  dmg: 1, xp: 3, color: '#2c2c54' },
  // 精英怪
  shadow_assassin: { name: '影刺客', hp: 15, speed: 2.5, radius: 12, dmg: 3, xp: 8, color: '#1a0a2e', isElite: true, teleportCD: 150 },
  iron_shield:     { name: '铁盾兵', hp: 60, speed: 0.4, radius: 20, dmg: 2, xp: 10, color: '#6a6a6a', isElite: true, defense: 2 },
};

export const BOSS_TYPES = [
  { name: '黑风寨主', hp: 80,  speed: 0.7, radius: 26, dmg: 3, xp: 25, color: '#1a1a2e', skills: ['charge'] },
  { name: '毒娘子',   hp: 100, speed: 0.9, radius: 22, dmg: 2, xp: 35, color: '#4a0e4e', skills: ['poison'] },
  { name: '铁臂金刚', hp: 150, speed: 0.5, radius: 30, dmg: 4, xp: 50, color: '#b8860b', skills: ['slam'] },
  { name: '幽冥剑仙', hp: 130, speed: 1.2, radius: 24, dmg: 3, xp: 60, color: '#0f3460', skills: ['dash'] },
  { name: '鸠摩天王', hp: 250, speed: 0.8, radius: 32, dmg: 5, xp: 100, color: '#c0392b', skills: ['charge', 'slam'] },
];

/* ---- Boss进化变体 (25波后循环) ---- */
export const BOSS_VARIANTS = [
  { prefix: '狂暴', suffix: '', hpMul: 1.3, spdMul: 1.15, dmgMul: 1.2, extraSkill: null },
  { prefix: '幻影', suffix: '', hpMul: 1.1, spdMul: 1.4, dmgMul: 1.0, extraSkill: 'teleport' },
  { prefix: '裂魂', suffix: '', hpMul: 1.5, spdMul: 1.0, dmgMul: 1.3, extraSkill: 'split' },
  { prefix: '封域', suffix: '', hpMul: 1.2, spdMul: 0.9, dmgMul: 1.5, extraSkill: 'areaLock' },
];

/* ---- 挑战修饰符 ---- */
export const CHALLENGE_MODIFIERS = [
  { id: 'one_hp',      name: '残血修罗', icon: '💀', desc: '仅1点生命', goldMul: 2.5, xpMul: 2.0, apply: (g) => { g.player.maxHp = 1; g.player.hp = 1; } },
  { id: 'no_upgrade',  name: '返璞归真', icon: '🚫', desc: '无法升级', goldMul: 2.0, xpMul: 1.0, apply: (g) => { g._noUpgrade = true; } },
  { id: 'fast_enemy',  name: '疾风迅雷', icon: '💨', desc: '敌人速度x1.6', goldMul: 1.8, xpMul: 1.5, apply: (g) => { g._enemySpeedMul = 1.6; } },
  { id: 'glass_cannon', name: '玻璃大炮', icon: '🔥', desc: '伤害x3 但生命-70%', goldMul: 1.5, xpMul: 1.5, apply: (g) => { g.player.bladeDmg *= 3; g.player.maxHp = Math.max(1, Math.floor(g.player.maxHp * 0.3)); g.player.hp = g.player.maxHp; } },
  { id: 'boss_rush',   name: '群魔乱舞', icon: '👹', desc: '每波都是Boss', goldMul: 3.0, xpMul: 2.5, apply: (g) => { g._bossRush = true; } },
];

/* ---- 地形系统 ---- */
export const TERRAINS = [
  { id: 'plain', name: '草原', bgInner: '#1a2a15', bgOuter: '#0e1a0a', gridColor: 'rgba(212, 164, 74, 0.04)', decorColors: ['rgba(60,90,40,0.3)', 'rgba(80,70,50,0.2)'] },
  { id: 'lava',  name: '熔岩', bgInner: '#2a1510', bgOuter: '#1a0a05', gridColor: 'rgba(255, 100, 30, 0.06)', decorColors: ['rgba(180,60,20,0.25)', 'rgba(100,40,15,0.2)'], dotDmg: 1, dotInterval: 90, dotRange: 120, icon: '🌋' },
  { id: 'ice',   name: '冰窟', bgInner: '#101a2a', bgOuter: '#050a1a', gridColor: 'rgba(120, 180, 255, 0.06)', decorColors: ['rgba(100,150,220,0.25)', 'rgba(60,100,180,0.2)'], slowMul: 0.7, fragile: 1.15, icon: '❄️' },
];

/* ---- 主动技能配置 ---- */
export const PLAYER_SKILLS = [
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
export const UPGRADES = [
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
export const BLESSINGS = [
  { id: 'bless_heal',   name: '回气', desc: '立即回复25%生命', icon: '💚', unique: false, apply: (g) => { if (g.player) g.player.hp = Math.min(g.player.maxHp, g.player.hp + Math.floor(g.player.maxHp * 0.25)); } },
  { id: 'bless_dmg',    name: '磨刃', desc: '旋刃伤害 +2',     icon: '🗡️', unique: false, apply: (g) => { if (g.player) g.player.bladeDmg += 2; } },
  { id: 'bless_speed',  name: '身法', desc: '移动速度 +8%',     icon: '💨', unique: false, apply: (g) => { if (g.player) g.player.speed *= 1.08; } },
  { id: 'bless_magnet', name: '引灵', desc: '拾取范围 +20',     icon: '🧲', unique: false, apply: (g) => { if (g.player) g.player.pickupRange += 20; } },
  { id: 'bless_wisdom', name: '悟道', desc: '经验获取 +15%',    icon: '📖', unique: false, apply: (g) => { if (g.player) g.player.xpMultiplier += 0.15; } },
  { id: 'bless_blade',  name: '分刃', desc: '旋刃数量 +1',     icon: '🌀', unique: true,  apply: (g) => { if (g.player) g.player.bladeCount += 1; } },
  { id: 'bless_guard', name: '护体', desc: '获得1层护盾并回复15%生命', icon: '🛡️', unique: true, apply: (g) => { if (g.player) { g.player.startShield += 1; g.player.hp = Math.min(g.player.maxHp, g.player.hp + Math.floor(g.player.maxHp * 0.15)); } } },
  { id: 'bless_combo', name: '连斩', desc: '连杀计时+0.6秒', icon: '⏱️', unique: false, apply: (g) => { if (g.player) g.player.comboBonus += 36; } },
  { id: 'bless_focus', name: '气定', desc: '获得小回复并减速敌人', icon: '🧿', unique: false, apply: (g) => { if (g.player) { g.player.hp = Math.min(g.player.maxHp, g.player.hp + Math.floor(g.player.maxHp * 0.1)); g._enemySpeedMul = (g._enemySpeedMul || 1) * 0.9; } } },
  { id: 'bless_rebirth', name: '涅槃', desc: '获得一次复生(35%生命)', icon: '🔥', unique: true, apply: (g) => { if (g.player) g.player.reviveCharges = (g.player.reviveCharges || 0) + 1; } },
];

/* ---- Meta 进度系统 ---- */
export const META_MILESTONES = [
  { id: 'kill_50', label: '杀敌50', desc: '起始生命+10', stat: 'kills', target: 50, bonus: { startHp: 10 } },
  { id: 'kill_200', label: '杀敌200', desc: '起始生命+15', stat: 'kills', target: 200, bonus: { startHp: 15 } },
  { id: 'kill_500', label: '杀敌500', desc: '起始伤害+1', stat: 'kills', target: 500, bonus: { startDmg: 1 } },
  { id: 'wave_10', label: '到达第10波', desc: '初始解锁剑气', stat: 'maxWave', target: 10, bonus: { startSkill: 'sword_qi' } },
  { id: 'wave_20', label: '到达第20波', desc: '移速+8%', stat: 'maxWave', target: 20, bonus: { speedMult: 1.08 } },
  { id: 'play_10', label: '游玩10局', desc: '起始生命+25', stat: 'gamesPlayed', target: 10, bonus: { startHp: 25 } },
  { id: 'play_25', label: '游玩25局', desc: '拾取范围+10', stat: 'gamesPlayed', target: 25, bonus: { pickupRange: 10 } },
];

/* ---- 永久升级商店 ---- */
export const PERM_UPGRADES = [
  { id: 'perm_hp',    name: '铁骨', desc: '起始生命 +20', icon: '❤️', maxLv: 10, baseCost: 30, costScale: 1.4, apply: (p) => { p.maxHp += 20; p.hp += 20; } },
  { id: 'perm_atk',   name: '锋刃', desc: '起始伤害 +1', icon: '⚔️', maxLv: 8, baseCost: 50, costScale: 1.5, apply: (p) => { p.bladeDmg += 1; } },
  { id: 'perm_crit',  name: '天眼', desc: '暴击率 +3%', icon: '🎯', maxLv: 6, baseCost: 60, costScale: 1.5, apply: (p) => { p.critChance = Math.min(0.6, p.critChance + 0.03); } },
  { id: 'perm_shield', name: '护体', desc: '开局获得护盾(抵消1次伤害)', icon: '🛡️', maxLv: 3, baseCost: 80, costScale: 2.0, apply: (p) => { p.startShield = (p.startShield || 0) + 1; } },
  { id: 'perm_speed', name: '轻功', desc: '移速 +5%', icon: '👟', maxLv: 5, baseCost: 40, costScale: 1.4, apply: (p) => { p.speed *= 1.05; } },
  { id: 'perm_pickup', name: '磁力', desc: '拾取范围 +8', icon: '🧲', maxLv: 5, baseCost: 35, costScale: 1.3, apply: (p) => { p.pickupRange += 8; } },
];

export function getPermUpgradeCost(upgrade, level) {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, level));
}
