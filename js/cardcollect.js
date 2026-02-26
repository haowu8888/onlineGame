/* ========== 仙卡录 - 卡牌收集 + 自动战斗 ========== */
(function () {
  'use strict';

  // ===== 角色图标映射 =====
  const ICONS = [
    '🧑', '🏹', '🛡️', '🌿', '📜', '👦', '🐾', '🔨', '📖', '🥋',
    '💂', '🧒', '⚔️', '💪', '🧪', '⚡', '🦊', '🔮', '🗡️', '☠️',
    '🛠️', '💊', '🌀', '🌩️', '🧙', '🗿', '🦋', '🏺', '👑', '✨'
  ];

  // ===== 角色数据 =====
  const CHARACTER_DATA = [
    // 凡 (12)
    { id: 1, name: '散修弟子', quality: '凡', role: 'ATK', atk: 30, hp: 100, skillName: '基础剑击', skillDesc: '攻击1个敌人', skillType: 'single' },
    { id: 2, name: '山野猎人', quality: '凡', role: 'ATK', atk: 35, hp: 90, skillName: '连射', skillDesc: '攻击2次，每次60%伤害', skillType: 'double' },
    { id: 3, name: '村庄守卫', quality: '凡', role: 'DEF', atk: 20, hp: 150, skillName: '坚守', skillDesc: '减少全队受到伤害10%', skillType: 'teamDef' },
    { id: 4, name: '草药师', quality: '凡', role: 'SUP', atk: 15, hp: 120, skillName: '回春', skillDesc: '治疗血量最低的队友20%最大生命', skillType: 'healLowest' },
    { id: 5, name: '符箓学徒', quality: '凡', role: 'ATK', atk: 28, hp: 110, skillName: '灵符', skillDesc: '攻击敌人，20%几率眩晕', skillType: 'singleStun' },
    { id: 6, name: '采药童子', quality: '凡', role: 'SUP', atk: 18, hp: 130, skillName: '百草', skillDesc: '治疗全队8%最大生命', skillType: 'healAll' },
    { id: 7, name: '灵兽幼崽', quality: '凡', role: 'ATK', atk: 32, hp: 95, skillName: '撕咬', skillDesc: '攻击无视20%防御', skillType: 'armorPen' },
    { id: 8, name: '铁匠学徒', quality: '凡', role: 'DEF', atk: 22, hp: 140, skillName: '铁壁', skillDesc: '获得15%最大生命护盾', skillType: 'selfShield' },
    { id: 9, name: '书生', quality: '凡', role: 'SUP', atk: 20, hp: 115, skillName: '鼓舞', skillDesc: '提升全队攻击力10%持续2回合', skillType: 'atkBuff' },
    { id: 10, name: '乞丐', quality: '凡', role: 'ATK', atk: 38, hp: 80, skillName: '脏拳', skillDesc: '攻击敌人，30%几率中毒', skillType: 'singlePoison' },
    { id: 11, name: '护院', quality: '凡', role: 'DEF', atk: 25, hp: 135, skillName: '格挡', skillDesc: '格挡下一次攻击', skillType: 'block' },
    { id: 12, name: '小道士', quality: '凡', role: 'SUP', atk: 16, hp: 125, skillName: '祈福', skillDesc: '治疗自身25%最大生命', skillType: 'healSelf' },
    // 灵 (10)
    { id: 13, name: '剑修弟子', quality: '灵', role: 'ATK', atk: 50, hp: 150, skillName: '剑气斩', skillDesc: '对单体造成高额伤害', skillType: 'heavySingle' },
    { id: 14, name: '体修弟子', quality: '灵', role: 'DEF', atk: 35, hp: 250, skillName: '金刚体', skillDesc: '大幅提升自身防御', skillType: 'selfDefBig' },
    { id: 15, name: '丹修弟子', quality: '灵', role: 'SUP', atk: 30, hp: 180, skillName: '灵丹', skillDesc: '治疗全队15%最大生命', skillType: 'healAllMid' },
    { id: 16, name: '符修弟子', quality: '灵', role: 'ATK', atk: 45, hp: 160, skillName: '五雷符', skillDesc: '对全体敌人造成伤害', skillType: 'aoe' },
    { id: 17, name: '灵兽师', quality: '灵', role: 'ATK', atk: 48, hp: 155, skillName: '召唤灵兽', skillDesc: '召唤灵兽额外攻击一次', skillType: 'extraAttack' },
    { id: 18, name: '阵法师', quality: '灵', role: 'SUP', atk: 32, hp: 190, skillName: '护阵', skillDesc: '全队获得10%最大生命护盾', skillType: 'teamShield' },
    { id: 19, name: '御剑弟子', quality: '灵', role: 'ATK', atk: 55, hp: 140, skillName: '御剑术', skillDesc: '攻击2个随机敌人', skillType: 'randomTwo' },
    { id: 20, name: '毒修弟子', quality: '灵', role: 'ATK', atk: 42, hp: 165, skillName: '蛊毒', skillDesc: '使全体敌人中毒', skillType: 'poisonAll' },
    { id: 21, name: '铸器师', quality: '灵', role: 'DEF', atk: 38, hp: 220, skillName: '灵甲', skillDesc: '提升全队防御15%', skillType: 'teamDefBig' },
    { id: 22, name: '医修弟子', quality: '灵', role: 'SUP', atk: 28, hp: 200, skillName: '济世', skillDesc: '复活1个阵亡队友并恢复30%生命', skillType: 'revive' },
    // 仙 (6)
    { id: 23, name: '剑仙', quality: '仙', role: 'ATK', atk: 80, hp: 220, skillName: '万剑归宗', skillDesc: '对全体敌人造成大量伤害', skillType: 'aoeBig' },
    { id: 24, name: '雷法真人', quality: '仙', role: 'ATK', atk: 75, hp: 230, skillName: '九天雷罚', skillDesc: '对单体造成巨额伤害并眩晕', skillType: 'heavyStun' },
    { id: 25, name: '太乙真人', quality: '仙', role: 'SUP', atk: 50, hp: 300, skillName: '太乙真气', skillDesc: '治疗全队25%最大生命', skillType: 'healAllBig' },
    { id: 26, name: '金刚尊者', quality: '仙', role: 'DEF', atk: 60, hp: 400, skillName: '不动明王', skillDesc: '嘲讽敌人并大幅提升防御', skillType: 'taunt' },
    { id: 27, name: '天狐仙子', quality: '仙', role: 'ATK', atk: 85, hp: 200, skillName: '魅惑', skillDesc: '魅惑敌人使其跳过回合并造成伤害', skillType: 'charm' },
    { id: 28, name: '药王', quality: '仙', role: 'SUP', atk: 55, hp: 280, skillName: '仙丹', skillDesc: '治疗全队+驱散负面+提升攻击力', skillType: 'healCleanseBuff' },
    // 圣 (2)
    { id: 29, name: '剑尊', quality: '圣', role: 'ATK', atk: 120, hp: 350, skillName: '一剑破万法', skillDesc: '对单体造成毁灭伤害并溅射全体', skillType: 'devastate' },
    { id: 30, name: '仙帝', quality: '圣', role: 'SUP', atk: 80, hp: 500, skillName: '天道轮回', skillDesc: '全队满血+复活所有+提升攻击力', skillType: 'ultimate' },
  ];

  // O(1) lookup map for character data by id
  const CHAR_MAP = Object.fromEntries(CHARACTER_DATA.map(c => [c.id, c]));

  // ===== 章节数据 =====
  const CHAPTERS = [
    { id: 1, name: '幽冥小径', hpMin: 80, hpMax: 120, atkMin: 15, atkMax: 25 },
    { id: 2, name: '灵兽森林', hpMin: 120, hpMax: 180, atkMin: 25, atkMax: 35 },
    { id: 3, name: '妖魔谷', hpMin: 180, hpMax: 250, atkMin: 35, atkMax: 45 },
    { id: 4, name: '阴风洞', hpMin: 250, hpMax: 350, atkMin: 45, atkMax: 55 },
    { id: 5, name: '蛮荒古域', hpMin: 350, hpMax: 450, atkMin: 55, atkMax: 70 },
    { id: 6, name: '天劫海', hpMin: 450, hpMax: 600, atkMin: 70, atkMax: 85 },
    { id: 7, name: '魔渊', hpMin: 600, hpMax: 800, atkMin: 85, atkMax: 100 },
    { id: 8, name: '九幽冥府', hpMin: 800, hpMax: 1000, atkMin: 100, atkMax: 120 },
    { id: 9, name: '混沌秘境', hpMin: 1000, hpMax: 1300, atkMin: 120, atkMax: 150 },
    { id: 10, name: '仙魔战场', hpMin: 1300, hpMax: 1800, atkMin: 150, atkMax: 200 },
    { id: 11, name: '雷劫荒原', hpMin: 1800, hpMax: 2400, atkMin: 200, atkMax: 260 },
    { id: 12, name: '血月深渊', hpMin: 2400, hpMax: 3200, atkMin: 260, atkMax: 330 },
    { id: 13, name: '焚天火域', hpMin: 3200, hpMax: 4200, atkMin: 330, atkMax: 420 },
    { id: 14, name: '冰封绝地', hpMin: 4200, hpMax: 5500, atkMin: 420, atkMax: 530 },
    { id: 15, name: '万妖殿', hpMin: 5500, hpMax: 7200, atkMin: 530, atkMax: 660 },
    { id: 16, name: '噬魂之渊', hpMin: 7200, hpMax: 9400, atkMin: 660, atkMax: 820 },
    { id: 17, name: '天魔幻境', hpMin: 9400, hpMax: 12000, atkMin: 820, atkMax: 1000 },
    { id: 18, name: '龙骨墓地', hpMin: 12000, hpMax: 15500, atkMin: 1000, atkMax: 1250 },
    { id: 19, name: '星陨荒漠', hpMin: 15500, hpMax: 20000, atkMin: 1250, atkMax: 1550 },
    { id: 20, name: '虚空裂缝', hpMin: 20000, hpMax: 26000, atkMin: 1550, atkMax: 1920 },
    { id: 21, name: '天道试炼场', hpMin: 26000, hpMax: 33000, atkMin: 1920, atkMax: 2400 },
    { id: 22, name: '太古封印', hpMin: 33000, hpMax: 42000, atkMin: 2400, atkMax: 3000 },
    { id: 23, name: '轮回回廊', hpMin: 42000, hpMax: 54000, atkMin: 3000, atkMax: 3700 },
    { id: 24, name: '神魔坟场', hpMin: 54000, hpMax: 68000, atkMin: 3700, atkMax: 4600 },
    { id: 25, name: '混沌源海', hpMin: 68000, hpMax: 86000, atkMin: 4600, atkMax: 5700 },
    { id: 26, name: '诸天万界', hpMin: 86000, hpMax: 110000, atkMin: 5700, atkMax: 7100 },
    { id: 27, name: '天帝废墟', hpMin: 110000, hpMax: 140000, atkMin: 7100, atkMax: 8800 },
    { id: 28, name: '鸿蒙裂隙', hpMin: 140000, hpMax: 180000, atkMin: 8800, atkMax: 11000 },
    { id: 29, name: '永恒虚无', hpMin: 180000, hpMax: 230000, atkMin: 11000, atkMax: 14000 },
    { id: 30, name: '创世之巅', hpMin: 230000, hpMax: 300000, atkMin: 14000, atkMax: 18000 },
  ];

  const ENEMY_NAMES = ['妖兽', '魔修', '鬼卒', '邪灵', '妖将', '魔兵', '幽魂', '邪魔', '妖王', '魔尊',
    '雷灵', '血魔', '炎魔将', '冰魄', '万妖之首', '噬魂者', '天魔', '龙骸', '星陨兽', '虚空行者',
    '天道守卫', '太古凶兽', '轮回使者', '神魔', '混沌古兽', '万界主宰', '天帝残影', '鸿蒙巨兽', '虚无之主', '创世守护'];

  const QUALITY_ORDER = { '凡': 0, '灵': 1, '仙': 2, '圣': 3 };
  const QUALITY_CSS = { '凡': 'fan', '灵': 'ling', '仙': 'xian', '圣': 'sheng' };
  const QUALITY_RATES = { '凡': 0.40, '灵': 0.35, '仙': 0.20, '圣': 0.05 };
  // O(1) lookup map for gacha pools by quality
  const QUALITY_POOL = Object.fromEntries(
    Object.keys(QUALITY_RATES).map(q => [q, CHARACTER_DATA.filter(c => c.quality === q)])
  );
  const ROLE_LABELS = { ATK: '攻击', DEF: '防御', SUP: '辅助' };

  // ===== 阵法系统 =====
  const FORMATIONS = [
    // 角色类型阵法
    { id: 'atk2', name: '双刃阵', icon: '⚔️', desc: '攻击+10%', condition: t => t.filter(c => c.role === 'ATK').length >= 2, apply: (allies) => { for (const a of allies) a.atk = Math.floor(a.atk * 1.10); } },
    { id: 'atk3', name: '万剑阵', icon: '🗡️', desc: '攻击+25%', condition: t => t.filter(c => c.role === 'ATK').length >= 3, apply: (allies) => { for (const a of allies) a.atk = Math.floor(a.atk * 1.25); } },
    { id: 'def2', name: '铁壁阵', icon: '🛡️', desc: '受伤-10%', condition: t => t.filter(c => c.role === 'DEF').length >= 2, apply: (allies) => { for (const a of allies) a.def = Math.floor(a.def * 1.5); } },
    { id: 'sup2', name: '回春阵', icon: '💚', desc: '最大生命+15%', condition: t => t.filter(c => c.role === 'SUP').length >= 2, apply: (allies) => { for (const a of allies) { a.maxHp = Math.floor(a.maxHp * 1.15); a.hp = a.maxHp; } } },
    // 混合阵法
    { id: 'balanced', name: '三才阵', icon: '☯️', desc: '全属性+8%', condition: t => { const r = new Set(t.map(c => c.role)); return r.has('ATK') && r.has('DEF') && r.has('SUP'); }, apply: (allies) => { for (const a of allies) { a.atk = Math.floor(a.atk * 1.08); a.maxHp = Math.floor(a.maxHp * 1.08); a.hp = a.maxHp; a.def = Math.floor(a.def * 1.08); } } },
    // 品质阵法
    { id: 'xian2', name: '仙灵阵', icon: '✨', desc: '全队攻击+20%', condition: t => t.filter(c => { const q = (state.owned[c.id] && state.owned[c.id].quality) || c.quality; return q === '仙' || q === '圣'; }).length >= 2, apply: (allies) => { for (const a of allies) a.atk = Math.floor(a.atk * 1.20); } },
    { id: 'full5', name: '五行聚灵阵', icon: '🌀', desc: '全属性+12%', condition: t => t.length >= 5, apply: (allies) => { for (const a of allies) { a.atk = Math.floor(a.atk * 1.12); a.maxHp = Math.floor(a.maxHp * 1.12); a.hp = a.maxHp; a.def = Math.floor(a.def * 1.12); } } },
  ];

  function detectFormations(teamChars) {
    const active = [];
    // atk3 supersedes atk2
    const atk3 = FORMATIONS.find(f => f.id === 'atk3');
    const atk2 = FORMATIONS.find(f => f.id === 'atk2');
    const atk3Active = atk3.condition(teamChars);
    if (atk3Active) { active.push(atk3); }
    else if (atk2.condition(teamChars)) { active.push(atk2); }
    // Others (no superseding conflicts)
    for (const f of FORMATIONS) {
      if (f.id === 'atk2' || f.id === 'atk3') continue;
      if (f.condition(teamChars)) active.push(f);
    }
    return active;
  }

  function getTeamChars() {
    return state.team.filter(Boolean).map(cid => {
      const base = getCharData(cid);
      return base ? { id: cid, role: base.role, quality: base.quality } : null;
    }).filter(Boolean);
  }

  const SAVE_KEY = 'cardcollect_save';
  const MAX_LEVEL = 30;
  const EXP_PER_LEVEL = 50; // base; actual = level * EXP_PER_LEVEL

  // ===== 装备系统 =====
  const EQUIP_SLOTS = ['weapon', 'armor', 'accessory'];
  const EQUIP_SLOT_NAMES = { weapon: '武器', armor: '护甲', accessory: '饰品' };
  const EQUIPMENT_POOL = [
    // Weapons (+atk)
    { id: 'w1', slot: 'weapon', name: '铁剑', icon: '🗡️', quality: '凡', atk: 8, hp: 0, minCh: 1 },
    { id: 'w2', slot: 'weapon', name: '灵纹剑', icon: '⚔️', quality: '灵', atk: 20, hp: 0, minCh: 5 },
    { id: 'w3', slot: 'weapon', name: '赤霄剑', icon: '🔥', quality: '仙', atk: 45, hp: 0, minCh: 12 },
    { id: 'w4', slot: 'weapon', name: '天罚神剑', icon: '⚡', quality: '圣', atk: 80, hp: 0, minCh: 22 },
    // Armor (+hp)
    { id: 'a1', slot: 'armor', name: '布甲', icon: '👘', quality: '凡', atk: 0, hp: 30, minCh: 1 },
    { id: 'a2', slot: 'armor', name: '灵纹甲', icon: '🥋', quality: '灵', atk: 0, hp: 80, minCh: 5 },
    { id: 'a3', slot: 'armor', name: '玄冰铠', icon: '❄️', quality: '仙', atk: 0, hp: 180, minCh: 12 },
    { id: 'a4', slot: 'armor', name: '混沌圣铠', icon: '💎', quality: '圣', atk: 0, hp: 350, minCh: 22 },
    // Accessories (+atk & +hp)
    { id: 'c1', slot: 'accessory', name: '灵石戒', icon: '💍', quality: '凡', atk: 4, hp: 15, minCh: 2 },
    { id: 'c2', slot: 'accessory', name: '蛟龙坠', icon: '📿', quality: '灵', atk: 10, hp: 40, minCh: 7 },
    { id: 'c3', slot: 'accessory', name: '凤凰羽', icon: '🪶', quality: '仙', atk: 25, hp: 100, minCh: 15 },
    { id: 'c4', slot: 'accessory', name: '鸿蒙珠', icon: '🔮', quality: '圣', atk: 45, hp: 200, minCh: 25 },
  ];
  const EQUIP_MAP = Object.fromEntries(EQUIPMENT_POOL.map(e => [e.id, e]));

  function getEquipBonus(charId) {
    const equips = state.equipment && state.equipment[charId];
    if (!equips) return { atk: 0, hp: 0 };
    let atk = 0, hp = 0;
    for (const slot of EQUIP_SLOTS) {
      const eid = equips[slot];
      if (eid && EQUIP_MAP[eid]) {
        atk += EQUIP_MAP[eid].atk;
        hp += EQUIP_MAP[eid].hp;
      }
    }
    return { atk, hp };
  }

  function rollEquipDrop(chapterId) {
    // 30% base drop chance, scaling with chapter
    const dropChance = 0.25 + chapterId * 0.01;
    if (Math.random() > dropChance) return null;
    const available = EQUIPMENT_POOL.filter(e => e.minCh <= chapterId);
    if (available.length === 0) return null;
    // Weighted by quality rarity
    const weights = available.map(e => QUALITY_RATES[e.quality] || 0.3);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < available.length; i++) {
      r -= weights[i];
      if (r <= 0) return available[i];
    }
    return available[available.length - 1];
  }

  // ===== Game State =====
  let state = {
    stones: 1000,
    highestChapter: 0,
    team: [null, null, null, null, null], // charId or null
    owned: {}, // { charId: { level, exp, dupes } }
    pityCounter: 0,
    lastLoginDate: null,
    clearedChapters: {},
    equipment: {}, // { charId: { weapon, armor, accessory } }
    equipInventory: [], // [equipId, ...]
    chapterFailCount: {}, // { chapterId: consecutiveFailures }
  };

  // ===== Save/Load =====
  function saveGame() {
    Storage.setImmediate(SAVE_KEY, state);
  }

  function loadGame() {
    const saved = Storage.get(SAVE_KEY, null);
    if (saved) {
      state.stones = saved.stones ?? 1000;
      state.highestChapter = saved.highestChapter ?? 0;
      state.team = saved.team ?? [null, null, null, null, null];
      state.owned = saved.owned ?? {};
      state.pityCounter = saved.pityCounter ?? 0;
      state.lastLoginDate = saved.lastLoginDate ?? null;
      state.clearedChapters = saved.clearedChapters ?? {};
      state.equipment = saved.equipment ?? {};
      state.equipInventory = saved.equipInventory ?? [];
      // Clean team: remove chars no longer owned
      for (let i = 0; i < 5; i++) {
        if (state.team[i] && !state.owned[state.team[i]]) {
          state.team[i] = null;
        }
      }
      // Breakthrough data is stored in state.owned; getEffectiveStats reads from there
    }
  }

  // ===== Utility =====
  function getCharData(id) {
    return CHAR_MAP[id];
  }

  function getOwnedChar(id) {
    return state.owned[id] || null;
  }

  function getEffectiveStats(id) {
    const base = getCharData(id);
    const own = getOwnedChar(id);
    if (!base || !own) return null;
    const lvMult = 1 + own.level * 0.05;
    // Use breakthrough-persisted values from state.owned if available
    const baseAtk = own.baseAtk || base.atk;
    const baseHp = own.baseHp || base.hp;
    const quality = own.quality || base.quality;
    const eqBonus = getEquipBonus(id);
    return {
      atk: Math.floor(baseAtk * lvMult) + eqBonus.atk,
      hp: Math.floor(baseHp * lvMult) + eqBonus.hp,
      level: own.level,
      quality: quality,
    };
  }

  function expForLevel(lv) {
    return lv * EXP_PER_LEVEL;
  }

  function getUniqueCount() {
    return Object.keys(state.owned).length;
  }

  function calcScore() {
    let totalLevels = 0;
    for (const id in state.owned) {
      totalLevels += state.owned[id].level;
    }
    return state.highestChapter * 100 + getUniqueCount() * 10 + totalLevels;
  }

  // ===== Breakthrough =====
  function canBreakthrough(id) {
    const base = getCharData(id);
    const own = getOwnedChar(id);
    if (!base || !own) return false;
    const quality = own.quality || base.quality;
    if (quality === '凡' && own.level >= 10 && own.dupes >= 3) return true;
    if (quality === '灵' && own.level >= 20 && own.dupes >= 2) return true;
    if (quality === '仙' && own.level >= 30 && own.dupes >= 1) return true;
    return false;
  }

  function getBreakthroughInfo(id) {
    const base = getCharData(id);
    const own = getOwnedChar(id);
    if (!base || !own) return null;
    const quality = own.quality || base.quality;
    if (quality === '凡') return { targetQuality: '灵', needLevel: 10, needDupes: 3 };
    if (quality === '灵') return { targetQuality: '仙', needLevel: 20, needDupes: 2 };
    if (quality === '仙') return { targetQuality: '圣', needLevel: 30, needDupes: 1 };
    return null;
  }

  function doBreakthrough(id) {
    const base = getCharData(id);
    const own = getOwnedChar(id);
    const info = getBreakthroughInfo(id);
    if (!canBreakthrough(id) || !info) return false;
    // Calculate new stats without mutating CHARACTER_DATA template
    const curAtk = own.baseAtk || base.atk;
    const curHp = own.baseHp || base.hp;
    // Persist breakthrough data to state only
    state.owned[id].quality = info.targetQuality;
    state.owned[id].baseAtk = Math.floor(curAtk * 1.3);
    state.owned[id].baseHp = Math.floor(curHp * 1.3);
    own.dupes -= info.needDupes;
    saveGame();
    return true;
  }

  // ===== Gacha System =====
  function gachaPull() {
    state.pityCounter++;
    let quality;
    if (state.pityCounter >= 80) {
      quality = '圣';
      state.pityCounter = 0;
    } else if (state.pityCounter >= 50) {
      const roll = Math.random();
      if (roll < QUALITY_RATES['圣'] * 3) {
        quality = '圣';
      } else {
        quality = '仙';
      }
      state.pityCounter = 0;
    } else {
      const roll = Math.random();
      let cumulative = 0;
      quality = '凡';
      for (const q of ['圣', '仙', '灵', '凡']) {
        cumulative += QUALITY_RATES[q];
        if (roll < cumulative) {
          quality = q;
          break;
        }
      }
      if (quality === '仙' || quality === '圣') {
        state.pityCounter = 0;
      }
    }
    const pool = QUALITY_POOL[quality];
    const char = pick(pool);
    return char;
  }

  function executePull(count) {
    if (count === 1 && state.stones < 100) {
      showToast('灵石不足！', 'error');
      return null;
    }
    if (count === 10 && state.stones < 900) {
      showToast('灵石不足！', 'error');
      return null;
    }
    state.stones -= count === 10 ? 900 : 100;
    if (typeof SoundManager !== 'undefined') SoundManager.play('card');
    const results = [];
    for (let i = 0; i < count; i++) {
      const char = gachaPull();
      const wasDupe = !!state.owned[char.id];
      if (state.owned[char.id]) {
        state.owned[char.id].dupes++;
      } else {
        state.owned[char.id] = { level: 1, exp: 0, dupes: 0 };
      }
      results.push({ ...char, wasDupe });
    }
    saveGame();
    trackAchievements();
    if (typeof CrossGameAchievements !== 'undefined') {
      var pullStats = Storage.get('cross_game_stats', {});
      CrossGameAchievements.trackStat('cardcollect_pulls', (pullStats.cardcollect_pulls || 0) + count);
      CrossGameAchievements.trackStat('cardcollect_cards', Object.keys(state.owned).length);
    }
    return results;
  }

  // ===== Battle Engine =====
  let battleState = null;
  let battleInterval = null;
  let battleSpeed = 1;
  let battleSkipping = false;
  let focusedEnemyId = null; // player-selected target

  function generateEnemies(chapter, wave) {
    const ch = CHAPTERS[chapter - 1];
    const count = Math.min(3 + Math.floor(wave / 2), 5);
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const hp = randomInt(ch.hpMin, ch.hpMax);
      const atk = randomInt(ch.atkMin, ch.atkMax);
      // Boss on wave 3
      const isBoss = wave === 3 && i === 0;
      const mult = isBoss ? 1.8 : 1;
      enemies.push({
        id: `e_${wave}_${i}`,
        name: (isBoss ? '首领·' : '') + ENEMY_NAMES[chapter - 1],
        icon: isBoss ? '👹' : '👻',
        hp: Math.floor(hp * mult),
        maxHp: Math.floor(hp * mult),
        atk: Math.floor(atk * mult),
        def: Math.floor(atk * 0.15),
        alive: true,
        stunned: false,
        poisoned: false,
        poisonTurns: 0,
      });
    }
    return enemies;
  }

  function buildAllyUnits() {
    const allies = [];
    for (let i = 0; i < 5; i++) {
      const cid = state.team[i];
      if (!cid) continue;
      const base = getCharData(cid);
      const own = getOwnedChar(cid);
      if (!base || !own) continue;
      const stats = getEffectiveStats(cid);
      allies.push({
        id: `a_${cid}`,
        charId: cid,
        name: base.name,
        icon: ICONS[cid - 1],
        hp: stats.hp,
        maxHp: stats.hp,
        atk: stats.atk,
        def: Math.floor(stats.atk * 0.2),
        role: base.role,
        skillType: base.skillType,
        skillName: base.skillName,
        alive: true,
        shield: 0,
        stunned: false,
        poisoned: false,
        poisonTurns: 0,
        blocking: false,
        atkBuffTurns: 0,
        defBuffTurns: 0,
        tauntTurns: 0,
        energy: 0,         // 大招能量 0-100
        ultReady: false,    // 大招可用
      });
    }
    // Apply formation bonuses
    const teamChars = getTeamChars();
    const formations = detectFormations(teamChars);
    for (const f of formations) f.apply(allies);
    // Store formations for display (set on battleState in startBattle after assignment)
    allies._formations = formations;
    return allies;
  }

  function startBattle(chapterId) {
    const teamCount = state.team.filter(Boolean).length;
    if (teamCount === 0) {
      showToast('请先编排阵容！', 'error');
      return;
    }

    battleSkipping = false;
    battleSpeed = 1;
    focusedEnemyId = null;
    battleState = {
      chapter: chapterId,
      wave: 0,
      totalWaves: 3,
      allies: buildAllyUnits(),
      enemies: [],
      log: [],
      running: true,
      won: false,
      activeFormations: [],
    };
    // Transfer formation info from allies
    battleState.activeFormations = battleState.allies._formations || [];
    delete battleState.allies._formations;
    // Log active formations
    if (battleState.activeFormations.length > 0) {
      addLog('阵法激活: ' + battleState.activeFormations.map(f => f.icon + f.name).join('、'), 'info');
    }

    // Underdog compensation: buff allies if player has failed this chapter multiple times
    const failCount = (state.chapterFailCount || {})[chapterId] || 0;
    if (failCount >= 2) {
      const buffPct = Math.min(failCount * 5, 30); // 5% per fail, max 30%
      const buffMul = 1 + buffPct / 100;
      for (const ally of battleState.allies) {
        ally.hp = Math.floor(ally.hp * buffMul);
        ally.maxHp = Math.floor(ally.maxHp * buffMul);
        ally.atk = Math.floor(ally.atk * buffMul);
        ally.def = Math.floor(ally.def * buffMul);
      }
      addLog(`天道庇护：连败${failCount}次，全队属性+${buffPct}%`, 'skill');
    }

    // Start wave 1
    nextWave();

    // Show overlay
    const overlay = document.getElementById('battle-overlay');
    overlay.classList.add('active');
    document.getElementById('battle-chapter-name').textContent =
      `第${chapterId}章 · ${CHAPTERS[chapterId - 1].name}`;
    document.getElementById('btn-battle-speed').textContent = '速度：1x';

    renderBattle();

    // Start auto-battle loop
    runBattleLoop();
  }

  function nextWave() {
    battleState.wave++;
    battleState.enemies = generateEnemies(battleState.chapter, battleState.wave);
    focusedEnemyId = null; // reset target on new wave
    addLog(`--- 第${battleState.wave}波 ---`, 'info');
  }

  function addLog(text, type) {
    if (!battleState) return;
    battleState.log.push({ text, type });
    if (battleState.log.length > 200) battleState.log.shift();
  }

  function getAliveAllies() {
    return battleState.allies.filter(u => u.alive);
  }

  function getAliveEnemies() {
    return battleState.enemies.filter(u => u.alive);
  }

  function getPriorityTarget(aliveEnemies) {
    // Player-selected target takes priority if still alive
    if (focusedEnemyId) {
      const focused = aliveEnemies.find(e => e.id === focusedEnemyId);
      if (focused) return focused;
    }
    // Fallback: lowest HP
    return aliveEnemies.reduce((a, b) => a.hp < b.hp ? a : b);
  }

  function dealDamage(attacker, target, multiplier, ignoreDefPct) {
    const atkBuff = attacker.atkBuffTurns > 0 ? 1.1 : 1;
    const rawAtk = attacker.atk * multiplier * atkBuff;
    const defReduction = target.def * (1 - (ignoreDefPct || 0)) * 0.3;
    const defBuff = target.defBuffTurns > 0 ? 0.85 : 1;
    let dmg = Math.floor((rawAtk - defReduction) * defBuff);
    if (dmg < 1) dmg = 1;

    // Blocking check
    if (target.blocking) {
      target.blocking = false;
      addLog(`${target.name} 格挡了攻击！`, 'buff');
      showDamageFloat(target.id, '格挡', 'buff');
      return 0;
    }

    // Shield absorb
    if (target.shield > 0) {
      if (target.shield >= dmg) {
        target.shield -= dmg;
        addLog(`${target.name} 的护盾吸收了 ${dmg} 伤害`, 'buff');
        showDamageFloat(target.id, `-${dmg}(盾)`, 'buff');
        return 0;
      } else {
        dmg -= target.shield;
        addLog(`${target.name} 的护盾破碎`, 'info');
        target.shield = 0;
      }
    }

    target.hp -= dmg;
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      // Clear focus if focused enemy dies
      if (focusedEnemyId === target.id) focusedEnemyId = null;
    }
    return dmg;
  }

  function healUnit(target, amount) {
    const healed = Math.min(amount, target.maxHp - target.hp);
    target.hp += healed;
    return healed;
  }

  function executeSkill(unit, allies, enemies) {
    if (!unit.alive || unit.stunned) {
      if (unit.stunned) {
        unit.stunned = false;
        addLog(`${unit.name} 被眩晕，跳过回合`, 'info');
      }
      return;
    }

    // Check ultimate activation (auto-trigger when ready, or manual if pending)
    const isUlt = unit.ultReady === true;
    if (isUlt) {
      unit.ultReady = false;
      unit.energy = 0;
      addLog(`⚡ ${unit.name} 释放大招！效果翻倍！`, 'buff');
      showDamageFloat(unit.id, '⚡大招!', 'buff');
    }

    // Poison tick
    if (unit.poisoned && unit.poisonTurns > 0) {
      const poisonDmg = Math.floor(unit.maxHp * 0.05);
      unit.hp -= poisonDmg;
      if (unit.hp <= 0) { unit.hp = 0; unit.alive = false; }
      unit.poisonTurns--;
      if (unit.poisonTurns <= 0) unit.poisoned = false;
      addLog(`${unit.name} 中毒受到 ${poisonDmg} 伤害`, 'damage');
      showDamageFloat(unit.id, `-${poisonDmg}`, 'damage');
      if (!unit.alive) return;
    }

    // Decrement buffs
    if (unit.atkBuffTurns > 0) unit.atkBuffTurns--;
    if (unit.defBuffTurns > 0) unit.defBuffTurns--;
    if (unit.tauntTurns > 0) unit.tauntTurns--;

    const aliveAllies = allies.filter(a => a.alive);
    const aliveEnemies = enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0 && unit.role === 'ATK') return;
    if (aliveAllies.length === 0 && unit.role === 'SUP') return;

    highlightUnit(unit.id);

    // Ultimate: temporarily boost stats for 2x effect
    const origAtk = unit.atk;
    if (isUlt) unit.atk = Math.floor(unit.atk * 2);

    const st = unit.skillType;

    // ATK skills
    if (unit.role === 'ATK' || (!unit.skillType && unit.role !== 'SUP' && unit.role !== 'DEF')) {
      let target;
      switch (st) {
        case 'single':
          target = getPriorityTarget(aliveEnemies);
          { const dmg = dealDamage(unit, target, 1.0, 0); addLog(`${unit.name} 使用 ${unit.skillName || '攻击'} 对 ${target.name} 造成 ${dmg} 伤害`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); }
          break;
        case 'double':
          for (let i = 0; i < 2; i++) {
            const t = getPriorityTarget(aliveEnemies.filter(e => e.alive));
            if (!t || !t.alive) break;
            const dmg = dealDamage(unit, t, 0.6, 0);
            addLog(`${unit.name} 连射 对 ${t.name} 造成 ${dmg} 伤害`, 'damage');
            showDamageFloat(t.id, `-${dmg}`, 'damage');
          }
          break;
        case 'singleStun':
          target = getPriorityTarget(aliveEnemies);
          { const dmg = dealDamage(unit, target, 1.0, 0); addLog(`${unit.name} 使用灵符对 ${target.name} 造成 ${dmg} 伤害`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); if (target.alive && Math.random() < 0.2) { target.stunned = true; addLog(`${target.name} 被眩晕！`, 'buff'); } }
          break;
        case 'armorPen':
          target = getPriorityTarget(aliveEnemies);
          { const dmg = dealDamage(unit, target, 1.0, 0.2); addLog(`${unit.name} 撕咬 对 ${target.name} 造成 ${dmg} 伤害（无视防御）`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); }
          break;
        case 'singlePoison':
          target = getPriorityTarget(aliveEnemies);
          { const dmg = dealDamage(unit, target, 1.0, 0); addLog(`${unit.name} 使用脏拳对 ${target.name} 造成 ${dmg} 伤害`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); if (target.alive && Math.random() < 0.3) { target.poisoned = true; target.poisonTurns = 3; addLog(`${target.name} 中毒了！`, 'buff'); } }
          break;
        case 'heavySingle':
          target = getPriorityTarget(aliveEnemies);
          { const dmg = dealDamage(unit, target, 1.5, 0); addLog(`${unit.name} 使用 ${unit.skillName} 对 ${target.name} 造成 ${dmg} 伤害`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); }
          break;
        case 'aoe':
          aliveEnemies.forEach(e => {
            const dmg = dealDamage(unit, e, 0.7, 0);
            addLog(`${unit.name} 五雷符 对 ${e.name} 造成 ${dmg} 伤害`, 'damage');
            showDamageFloat(e.id, `-${dmg}`, 'damage');
          });
          break;
        case 'extraAttack':
          target = getPriorityTarget(aliveEnemies);
          { const dmg1 = dealDamage(unit, target, 1.0, 0); addLog(`${unit.name} 攻击 ${target.name} 造成 ${dmg1} 伤害`, 'damage'); showDamageFloat(target.id, `-${dmg1}`, 'damage'); }
          { const t2 = enemies.filter(e => e.alive).reduce((a, b) => a.hp < b.hp ? a : b, null); if (t2) { const dmg2 = dealDamage(unit, t2, 0.7, 0); addLog(`灵兽追击 对 ${t2.name} 造成 ${dmg2} 伤害`, 'damage'); showDamageFloat(t2.id, `-${dmg2}`, 'damage'); } }
          break;
        case 'randomTwo':
          for (let i = 0; i < 2; i++) {
            const pool = enemies.filter(e => e.alive);
            if (pool.length === 0) break;
            const t = pick(pool);
            const dmg = dealDamage(unit, t, 0.9, 0);
            addLog(`${unit.name} 御剑斩 对 ${t.name} 造成 ${dmg} 伤害`, 'damage');
            showDamageFloat(t.id, `-${dmg}`, 'damage');
          }
          break;
        case 'poisonAll':
          aliveEnemies.forEach(e => {
            e.poisoned = true;
            e.poisonTurns = 3;
          });
          addLog(`${unit.name} 释放蛊毒，全体敌人中毒！`, 'buff');
          break;
        case 'aoeBig':
          aliveEnemies.forEach(e => {
            const dmg = dealDamage(unit, e, 1.0, 0);
            addLog(`${unit.name} 万剑归宗 对 ${e.name} 造成 ${dmg} 伤害`, 'damage');
            showDamageFloat(e.id, `-${dmg}`, 'damage');
          });
          break;
        case 'heavyStun':
          target = getPriorityTarget(aliveEnemies);
          { const dmg = dealDamage(unit, target, 2.0, 0); addLog(`${unit.name} 九天雷罚 对 ${target.name} 造成 ${dmg} 伤害`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); if (target.alive) { target.stunned = true; addLog(`${target.name} 被雷电眩晕！`, 'buff'); } }
          break;
        case 'charm':
          target = aliveEnemies.reduce((a, b) => a.atk > b.atk ? a : b);
          { const dmg = dealDamage(unit, target, 1.2, 0); addLog(`${unit.name} 魅惑 ${target.name}，造成 ${dmg} 伤害`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); if (target.alive) { target.stunned = true; addLog(`${target.name} 被魅惑，跳过下回合！`, 'buff'); } }
          break;
        case 'devastate':
          target = getPriorityTarget(aliveEnemies);
          { const dmg = dealDamage(unit, target, 2.5, 0.3); addLog(`${unit.name} 一剑破万法 对 ${target.name} 造成 ${dmg} 毁灭伤害`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); }
          // Splash
          aliveEnemies.filter(e => e.alive && e.id !== target.id).forEach(e => {
            const splashDmg = dealDamage(unit, e, 0.8, 0);
            addLog(`溅射 对 ${e.name} 造成 ${splashDmg} 伤害`, 'damage');
            showDamageFloat(e.id, `-${splashDmg}`, 'damage');
          });
          break;
        default:
          // generic attack
          target = getPriorityTarget(aliveEnemies);
          if (target) { const dmg = dealDamage(unit, target, 1.0, 0); addLog(`${unit.name} 攻击 ${target.name} 造成 ${dmg} 伤害`, 'damage'); showDamageFloat(target.id, `-${dmg}`, 'damage'); }
      }
    }

    // DEF skills
    if (unit.role === 'DEF') {
      switch (st) {
        case 'teamDef':
          aliveAllies.forEach(a => { a.defBuffTurns = Math.max(a.defBuffTurns, 2); });
          addLog(`${unit.name} 使用坚守，全队减伤！`, 'buff');
          break;
        case 'selfShield':
          unit.shield += Math.floor(unit.maxHp * 0.15);
          addLog(`${unit.name} 铁壁，获得护盾 ${Math.floor(unit.maxHp * 0.15)}`, 'buff');
          showDamageFloat(unit.id, `+盾`, 'buff');
          break;
        case 'block':
          unit.blocking = true;
          addLog(`${unit.name} 进入格挡状态`, 'buff');
          break;
        case 'selfDefBig':
          unit.defBuffTurns = Math.max(unit.defBuffTurns, 3);
          unit.shield += Math.floor(unit.maxHp * 0.1);
          addLog(`${unit.name} 金刚体，大幅提升防御`, 'buff');
          showDamageFloat(unit.id, `防御↑`, 'buff');
          break;
        case 'teamDefBig':
          aliveAllies.forEach(a => { a.defBuffTurns = Math.max(a.defBuffTurns, 3); });
          addLog(`${unit.name} 灵甲，全队防御提升15%`, 'buff');
          break;
        case 'taunt':
          unit.tauntTurns = 2;
          unit.defBuffTurns = Math.max(unit.defBuffTurns, 2);
          unit.shield += Math.floor(unit.maxHp * 0.15);
          addLog(`${unit.name} 不动明王，嘲讽敌人并提升防御`, 'buff');
          showDamageFloat(unit.id, `嘲讽`, 'buff');
          break;
        default:
          // generic defense: small shield
          unit.shield += Math.floor(unit.maxHp * 0.1);
          addLog(`${unit.name} 防御姿态`, 'buff');
      }
    }

    // SUP skills
    if (unit.role === 'SUP') {
      switch (st) {
        case 'healLowest': {
          const lowest = aliveAllies.reduce((a, b) => (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b);
          const amt = healUnit(lowest, Math.floor(lowest.maxHp * 0.20));
          addLog(`${unit.name} 回春，治疗 ${lowest.name} ${amt} 生命`, 'heal');
          showDamageFloat(lowest.id, `+${amt}`, 'heal');
          break;
        }
        case 'healAll':
          aliveAllies.forEach(a => {
            const amt = healUnit(a, Math.floor(a.maxHp * 0.08));
            if (amt > 0) showDamageFloat(a.id, `+${amt}`, 'heal');
          });
          addLog(`${unit.name} 百草，全队治疗`, 'heal');
          break;
        case 'atkBuff':
          aliveAllies.forEach(a => { a.atkBuffTurns = Math.max(a.atkBuffTurns, 2); });
          addLog(`${unit.name} 鼓舞，全队攻击力提升10%`, 'buff');
          break;
        case 'healSelf': {
          const amt = healUnit(unit, Math.floor(unit.maxHp * 0.25));
          addLog(`${unit.name} 祈福，自我治疗 ${amt}`, 'heal');
          showDamageFloat(unit.id, `+${amt}`, 'heal');
          break;
        }
        case 'healAllMid':
          aliveAllies.forEach(a => {
            const amt = healUnit(a, Math.floor(a.maxHp * 0.15));
            if (amt > 0) showDamageFloat(a.id, `+${amt}`, 'heal');
          });
          addLog(`${unit.name} 灵丹，全队治疗`, 'heal');
          break;
        case 'teamShield':
          aliveAllies.forEach(a => {
            a.shield += Math.floor(a.maxHp * 0.10);
          });
          addLog(`${unit.name} 护阵，全队获得护盾`, 'buff');
          break;
        case 'revive': {
          const dead = allies.filter(a => !a.alive);
          if (dead.length > 0) {
            const revived = dead[0];
            revived.alive = true;
            revived.hp = Math.floor(revived.maxHp * 0.3);
            addLog(`${unit.name} 济世，复活了 ${revived.name}！`, 'heal');
            showDamageFloat(revived.id, `复活`, 'heal');
          } else {
            // Heal lowest instead
            const lowest = aliveAllies.reduce((a, b) => (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b);
            const amt = healUnit(lowest, Math.floor(lowest.maxHp * 0.15));
            addLog(`${unit.name} 治疗 ${lowest.name} ${amt}`, 'heal');
            showDamageFloat(lowest.id, `+${amt}`, 'heal');
          }
          break;
        }
        case 'healAllBig':
          aliveAllies.forEach(a => {
            const amt = healUnit(a, Math.floor(a.maxHp * 0.25));
            if (amt > 0) showDamageFloat(a.id, `+${amt}`, 'heal');
          });
          addLog(`${unit.name} 太乙真气，全队大量治疗`, 'heal');
          break;
        case 'healCleanseBuff':
          aliveAllies.forEach(a => {
            const amt = healUnit(a, Math.floor(a.maxHp * 0.15));
            a.poisoned = false;
            a.poisonTurns = 0;
            a.stunned = false;
            a.atkBuffTurns = Math.max(a.atkBuffTurns, 2);
            if (amt > 0) showDamageFloat(a.id, `+${amt}`, 'heal');
          });
          addLog(`${unit.name} 仙丹，治疗+驱散+增益`, 'heal');
          break;
        case 'ultimate': {
          // Full heal + revive all + ATK buff
          allies.forEach(a => {
            if (!a.alive) {
              a.alive = true;
              a.hp = a.maxHp;
              showDamageFloat(a.id, `复活`, 'heal');
            } else {
              const amt = healUnit(a, a.maxHp);
              if (amt > 0) showDamageFloat(a.id, `+${amt}`, 'heal');
            }
            a.atkBuffTurns = Math.max(a.atkBuffTurns, 3);
            a.poisoned = false;
            a.stunned = false;
          });
          addLog(`${unit.name} 天道轮回！全队满血+复活+攻击增益`, 'heal');
          break;
        }
        default:
          // generic heal
          { const lowest = aliveAllies.reduce((a, b) => a.hp < b.hp ? a : b); const amt = healUnit(lowest, Math.floor(lowest.maxHp * 0.1)); addLog(`${unit.name} 治疗 ${lowest.name} ${amt}`, 'heal'); showDamageFloat(lowest.id, `+${amt}`, 'heal'); }
      }
    }

    // Restore ATK after ultimate
    if (isUlt) unit.atk = origAtk;

    // Energy gain on action (+10)
    if (unit.energy !== undefined && unit.alive) {
      unit.energy = Math.min(100, unit.energy + 10);
      if (unit.energy >= 100 && !unit.ultReady) {
        unit.ultReady = true;
        addLog(`${unit.name} 大招就绪！`, 'buff');
        showDamageFloat(unit.id, '⚡大招', 'buff');
      }
    }
  }

  function enemyAct(enemy, allies) {
    if (!enemy.alive || enemy.stunned) {
      if (enemy.stunned) {
        enemy.stunned = false;
        addLog(`${enemy.name} 被眩晕，跳过回合`, 'info');
      }
      return;
    }

    // Poison tick
    if (enemy.poisoned && enemy.poisonTurns > 0) {
      const poisonDmg = Math.floor(enemy.maxHp * 0.05);
      enemy.hp -= poisonDmg;
      if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; }
      enemy.poisonTurns--;
      if (enemy.poisonTurns <= 0) enemy.poisoned = false;
      addLog(`${enemy.name} 中毒受到 ${poisonDmg} 伤害`, 'damage');
      showDamageFloat(enemy.id, `-${poisonDmg}`, 'damage');
      if (!enemy.alive) return;
    }

    const aliveAllies = allies.filter(a => a.alive);
    if (aliveAllies.length === 0) return;

    // Target: taunt unit first, else random
    let target;
    const taunter = aliveAllies.find(a => a.tauntTurns > 0);
    if (taunter) {
      target = taunter;
    } else {
      target = pick(aliveAllies);
    }

    const dmg = dealDamage(enemy, target, 1.0, 0);
    addLog(`${enemy.name} 攻击 ${target.name} 造成 ${dmg} 伤害`, 'damage');
    showDamageFloat(target.id, `-${dmg}`, 'damage');
    hitUnit(target.id);
    // Energy gain on being hit (+15)
    if (target.energy !== undefined && target.alive && dmg > 0) {
      target.energy = Math.min(100, target.energy + 15);
      if (target.energy >= 100 && !target.ultReady) {
        target.ultReady = true;
        addLog(`${target.name} 大招就绪！`, 'buff');
        showDamageFloat(target.id, '⚡大招', 'buff');
      }
    }
  }

  function executeBattleRound() {
    if (!battleState || !battleState.running) return false;

    const allies = battleState.allies;
    const enemies = battleState.enemies;

    // All units act: sort by ATK (speed)
    const allAllies = allies.filter(a => a.alive);
    allAllies.sort((a, b) => b.atk - a.atk);

    // Allies act
    for (const ally of allAllies) {
      if (!battleState.running) return false;
      executeSkill(ally, allies, enemies);
      // Check enemies all dead
      if (getAliveEnemies().length === 0) {
        // Wave cleared
        if (battleState.wave < battleState.totalWaves) {
          nextWave();
          renderBattle();
          return false;
        } else {
          // Battle won
          battleState.running = false;
          battleState.won = true;
          addLog('战斗胜利！', 'info');
          endBattle();
          return false;
        }
      }
    }

    // Enemies act
    const aliveEnemies = getAliveEnemies();
    for (const enemy of aliveEnemies) {
      if (!battleState.running) return false;
      enemyAct(enemy, allies);
      // Check allies all dead
      if (getAliveAllies().length === 0) {
        battleState.running = false;
        battleState.won = false;
        addLog('战斗失败...', 'info');
        endBattle();
        return false;
      }
    }

    renderBattle();

    // Check if any ally has ultReady after this round (pause for manual trigger)
    if (!battleSkipping) {
      const ultReadyUnit = allies.find(a => a.alive && a.ultReady);
      if (ultReadyUnit) return true; // signal: pause for ult
    }
    return false;
  }

  function showUltPrompt(unit) {
    // Show ult activation button on battle UI
    const el = document.querySelector(`[data-unit-id="${unit.id}"]`);
    if (!el) return null;
    const btn = document.createElement('button');
    btn.className = 'cc-ult-btn';
    btn.textContent = '⚡释放大招';
    btn.dataset.unitId = unit.id;
    el.appendChild(btn);
    el.classList.add('ult-pending');
    return btn;
  }

  function removeUltPrompt() {
    document.querySelectorAll('.cc-ult-btn').forEach(b => b.remove());
    document.querySelectorAll('.ult-pending').forEach(el => el.classList.remove('ult-pending'));
  }

  function waitForUltInput(unit) {
    return new Promise(resolve => {
      renderBattle(); // render first to show ult-ready state
      const btn = showUltPrompt(unit);
      if (!btn) { resolve(); return; }

      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        removeUltPrompt();
        resolve();
      };

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Player chose to fire ult now - keep ultReady so executeSkill picks it up
        cleanup();
      });

      // Auto-fire after 3 seconds
      setTimeout(cleanup, 3000);
    });
  }

  function runBattleLoop() {
    if (battleInterval) clearInterval(battleInterval);

    if (battleSkipping) {
      // Run all rounds instantly
      let safety = 0;
      while (battleState && battleState.running && safety < 500) {
        executeBattleRound();
        safety++;
      }
      renderBattle();
      return;
    }

    const delay = Math.max(100, 800 / battleSpeed);
    async function tick() {
      if (!battleState || !battleState.running) {
        clearInterval(battleInterval);
        return;
      }
      const needsUltPause = executeBattleRound();
      renderBattle();
      if (needsUltPause && battleState && battleState.running) {
        // Pause interval, wait for ult input
        clearInterval(battleInterval);
        const ultUnit = battleState.allies.find(a => a.alive && a.ultReady);
        if (ultUnit) {
          await waitForUltInput(ultUnit);
        }
        // Resume loop
        if (battleState && battleState.running) {
          battleInterval = setInterval(tick, delay);
        }
      }
    }
    battleInterval = setInterval(tick, delay);
  }

  function endBattle() {
    if (battleInterval) clearInterval(battleInterval);
    renderBattle();

    setTimeout(() => {
      document.getElementById('battle-overlay').classList.remove('active');

      if (battleState.won) {
        const ch = battleState.chapter;
        // Reset fail counter on victory
        if (!state.chapterFailCount) state.chapterFailCount = {};
        state.chapterFailCount[ch] = 0;
        const reward = 150 + ch * 50;
        const expReward = ch * 15;
        state.stones += reward;

        // First-clear bonus
        if (!state.clearedChapters[ch]) {
          var firstClearBonus = ch * 20;
          state.stones += firstClearBonus;
          state.clearedChapters[ch] = true;
          showToast('首通奖励：+' + firstClearBonus + '灵石', 'success');
        }

        // Grant EXP to team
        for (const cid of state.team) {
          if (!cid || !state.owned[cid]) continue;
          const own = state.owned[cid];
          own.exp += expReward;
          // Level up
          while (own.level < MAX_LEVEL && own.exp >= expForLevel(own.level)) {
            own.exp -= expForLevel(own.level);
            own.level++;
          }
          if (own.level >= MAX_LEVEL) own.exp = 0;
        }

        if (ch > state.highestChapter) {
          state.highestChapter = ch;
        }

        // Equipment drop
        const droppedEquip = rollEquipDrop(ch);
        if (droppedEquip) {
          state.equipInventory.push(droppedEquip.id);
          showToast(`获得装备：${droppedEquip.icon} ${droppedEquip.name}`, 'success');
        }

        saveGame();
        updateLeaderboard('cardcollect', calcScore());
        trackAchievements();

        // Show result
        showBattleResult(true, reward, expReward, droppedEquip);
      } else {
        // Increment fail counter for compensation
        if (!state.chapterFailCount) state.chapterFailCount = {};
        const ch = battleState.chapter;
        state.chapterFailCount[ch] = (state.chapterFailCount[ch] || 0) + 1;
        saveGame();
        showBattleResult(false, 0, 0, null, ch);
      }

      battleState = null;
    }, battleSkipping ? 100 : 600);
  }

  function showBattleResult(won, stones, exp, droppedEquip, failedChapter) {
    const modal = document.getElementById('battle-result-modal');
    document.getElementById('result-title').textContent = won ? '战斗胜利' : '战斗失败';
    const equipHtml = droppedEquip
      ? `<div class="result-equip" style="margin-top:6px;color:#d4a5ff;">装备掉落：${droppedEquip.icon} ${droppedEquip.name} (${EQUIP_SLOT_NAMES[droppedEquip.slot]})</div>`
      : '';
    let compensationHint = '';
    if (!won && failedChapter) {
      const fc = (state.chapterFailCount || {})[failedChapter] || 0;
      if (fc >= 2) {
        const nextBuff = Math.min(fc * 5, 30);
        compensationHint = `<div style="margin-top:6px;font-size:0.75rem;color:var(--gold)">下次挑战将获得天道庇护：属性+${nextBuff}%</div>`;
      } else if (fc === 1) {
        compensationHint = `<div style="margin-top:6px;font-size:0.75rem;color:var(--text-muted)">再失败1次将获得天道庇护加成</div>`;
      }
    }
    document.getElementById('result-body').innerHTML = won
      ? `<div class="result-icon">🎉</div>
         <div class="result-text">成功通关！</div>
         <div class="result-rewards">获得 ${stones} 灵石</div>
         <div class="result-exp">队伍获得 ${exp} 经验</div>
         ${equipHtml}`
      : `<div class="result-icon">💀</div>
         <div class="result-text">队伍全灭，请提升实力后再挑战</div>
         ${compensationHint}
         <div class="result-encourage" style="margin-top:8px;font-size:0.8rem;color:var(--cyan);font-style:italic">${typeof getEncouragement==='function'?getEncouragement():''}</div>`;
    modal.classList.add('active');
    refreshUI();
  }

  // ===== Damage Float & Animation Helpers =====
  function showDamageFloat(unitId, text, type) {
    if (battleSkipping) return;
    const el = document.querySelector(`[data-unit-id="${unitId}"]`);
    if (!el) return;
    const float = document.createElement('span');
    float.className = `cc-damage-float ${type === 'heal' ? 'heal' : type === 'buff' ? 'buff' : ''}`;
    float.textContent = text;
    el.appendChild(float);
    setTimeout(() => float.remove(), 800);
  }

  function highlightUnit(unitId) {
    if (battleSkipping) return;
    const el = document.querySelector(`[data-unit-id="${unitId}"]`);
    if (el) {
      el.classList.add('acting');
      setTimeout(() => el.classList.remove('acting'), 300);
    }
  }

  function hitUnit(unitId) {
    if (battleSkipping) return;
    const el = document.querySelector(`[data-unit-id="${unitId}"]`);
    if (el) {
      el.classList.add('hit');
      setTimeout(() => el.classList.remove('hit'), 300);
    }
  }

  // ===== Render Functions =====
  function renderBattleUnit(unit, isEnemy) {
    const hpPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp * 100) : 0;
    const hpClass = hpPct <= 25 ? 'low' : hpPct <= 50 ? 'mid' : '';
    const statusIcons = [];
    if (unit.poisoned) statusIcons.push('🟢');
    if (unit.stunned) statusIcons.push('💫');
    if (unit.shield > 0) statusIcons.push('🛡️');
    if (unit.atkBuffTurns > 0) statusIcons.push('⬆️');
    if (unit.blocking) statusIcons.push('🔰');
    if (unit.ultReady) statusIcons.push('⚡');
    const isFocused = isEnemy && unit.alive && focusedEnemyId === unit.id;

    const energyBar = unit.energy !== undefined
      ? `<div class="unit-energy-bar"><div class="unit-energy-fill ${unit.ultReady ? 'ready' : ''}" style="width:${unit.energy}%"></div></div>`
      : '';

    return `<div class="cc-battle-unit ${unit.alive ? '' : 'dead'} ${isFocused ? 'focused' : ''} ${isEnemy && unit.alive ? 'enemy-clickable' : ''}" data-unit-id="${unit.id}">
      <span class="unit-icon">${unit.icon || '👻'}</span>
      <div class="unit-info">
        <div class="unit-name">${isFocused ? '🎯 ' : ''}${unit.name} ${statusIcons.join('')}</div>
        <div class="unit-hp-bar"><div class="unit-hp-fill ${hpClass}" style="width:${hpPct}%"></div></div>
        <div class="unit-hp-text">${unit.hp}/${unit.maxHp}</div>
        ${energyBar}
      </div>
    </div>`;
  }

  function renderBattle() {
    if (!battleState) return;

    document.getElementById('battle-wave-info').textContent =
      `第${battleState.wave}/${battleState.totalWaves}波`;

    // Formation display
    let formHtml = '';
    if (battleState.activeFormations && battleState.activeFormations.length > 0) {
      formHtml = '<div class="cc-battle-formations">' +
        battleState.activeFormations.map(f => `<span class="cc-formation-tag">${f.icon} ${f.name} <small>${f.desc}</small></span>`).join('') +
        '</div>';
    }

    document.getElementById('battle-allies').innerHTML =
      formHtml + battleState.allies.map(u => renderBattleUnit(u, false)).join('');

    document.getElementById('battle-enemies').innerHTML =
      battleState.enemies.map(u => renderBattleUnit(u, true)).join('');

    // Enemy click-to-focus handlers
    document.querySelectorAll('.enemy-clickable').forEach(el => {
      el.addEventListener('click', () => {
        const eid = el.dataset.unitId;
        if (focusedEnemyId === eid) {
          focusedEnemyId = null; // toggle off
        } else {
          focusedEnemyId = eid;
        }
        renderBattle();
      });
    });

    const logEl = document.getElementById('battle-log');
    logEl.innerHTML = battleState.log.slice(-30).map(l =>
      `<div class="log-entry log-${l.type}">${l.text}</div>`
    ).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderTeam() {
    const slotsEl = document.getElementById('team-slots');
    let html = '';
    for (let i = 0; i < 5; i++) {
      const cid = state.team[i];
      if (cid && state.owned[cid]) {
        const base = getCharData(cid);
        const own = state.owned[cid];
        const stats = getEffectiveStats(cid);
        const qcss = QUALITY_CSS[base.quality];
        html += `<div class="cc-team-slot filled quality-border-${qcss}" data-slot="${i}">
          <button class="slot-remove" data-remove="${i}">&times;</button>
          <div class="cc-mini-card">
            <div class="card-icon">${ICONS[cid - 1]}</div>
            <div class="card-name quality-${qcss}">${base.name}</div>
            <div class="card-quality quality-${qcss}">${base.quality}·${ROLE_LABELS[base.role]}</div>
            <div class="card-level">Lv.${own.level}</div>
            <div class="card-stats">ATK ${stats.atk} HP ${stats.hp}</div>
          </div>
        </div>`;
      } else {
        html += `<div class="cc-team-slot" data-slot="${i}">
          <span class="slot-empty-text">空位${i + 1}</span>
        </div>`;
      }
    }
    slotsEl.innerHTML = html;

    // Formation preview below team slots
    const teamChars = getTeamChars();
    const formations = detectFormations(teamChars);
    let formEl = document.getElementById('team-formations');
    if (!formEl) {
      formEl = document.createElement('div');
      formEl.id = 'team-formations';
      formEl.className = 'cc-team-formations';
      slotsEl.parentNode.insertBefore(formEl, slotsEl.nextSibling);
    }
    if (formations.length > 0) {
      formEl.innerHTML = '<div class="cc-formation-label">激活阵法</div>' +
        formations.map(f => `<span class="cc-formation-tag">${f.icon} ${f.name} <small>${f.desc}</small></span>`).join('');
    } else {
      formEl.innerHTML = '<div class="cc-formation-label" style="opacity:0.5;">无阵法激活（编排阵容以激活阵法加成）</div>';
    }
  }

  let benchFilter = 'all';

  function renderBench() {
    const listEl = document.getElementById('bench-list');
    const ownedIds = Object.keys(state.owned).map(Number);
    let chars = ownedIds.map(id => ({ id, base: getCharData(id), own: state.owned[id] }));

    if (benchFilter !== 'all') {
      chars = chars.filter(c => c.base.role === benchFilter);
    }

    // Sort by quality desc then level desc
    chars.sort((a, b) => {
      const qDiff = QUALITY_ORDER[b.base.quality] - QUALITY_ORDER[a.base.quality];
      if (qDiff !== 0) return qDiff;
      return b.own.level - a.own.level;
    });

    const teamSet = new Set(state.team.filter(Boolean));

    listEl.innerHTML = chars.map(c => {
      const qcss = QUALITY_CSS[c.base.quality];
      const inTeam = teamSet.has(c.id);
      return `<div class="cc-bench-card quality-border-${qcss} ${inTeam ? 'in-team' : ''}" data-char-id="${c.id}">
        <div class="card-icon">${ICONS[c.id - 1]}</div>
        <div class="card-name quality-${qcss}">${c.base.name}</div>
        <div class="card-info">Lv.${c.own.level} ${ROLE_LABELS[c.base.role]}</div>
      </div>`;
    }).join('');

    if (chars.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">暂无角色，请前往召唤</div>';
    }

    // Click to add to team
    listEl.querySelectorAll('.cc-bench-card:not(.in-team)').forEach(card => {
      card.addEventListener('click', () => {
        const cid = parseInt(card.dataset.charId);
        // Find first empty slot
        const emptyIdx = state.team.indexOf(null);
        if (emptyIdx === -1) {
          showToast('阵容已满，请先移除角色', 'error');
          return;
        }
        state.team[emptyIdx] = cid;
        saveGame();
        renderTeam();
        renderBench();
      });
    });
  }

  function renderChapters() {
    const grid = document.getElementById('chapter-grid');
    grid.innerHTML = CHAPTERS.map(ch => {
      const unlocked = ch.id <= state.highestChapter + 1;
      const cleared = ch.id <= state.highestChapter;
      const reward = 150 + ch.id * 50;
      return `<div class="cc-chapter-card ${cleared ? 'cleared' : ''} ${!unlocked ? 'locked' : ''}" data-chapter="${ch.id}">
        <div class="cc-chapter-num">第${ch.id}章</div>
        <div class="cc-chapter-name">${ch.name}</div>
        <div class="cc-chapter-desc">敌人 ATK ${ch.atkMin}-${ch.atkMax} | HP ${ch.hpMin}-${ch.hpMax}</div>
        <div class="cc-chapter-reward">奖励：${reward}灵石 + ${ch.id * 15}经验</div>
        ${!unlocked ? '<div style="color:var(--text-muted);font-size:0.75rem;margin-top:4px;">需先通关前一章</div>' : ''}
      </div>`;
    }).join('');

    grid.querySelectorAll('.cc-chapter-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        const chId = parseInt(card.dataset.chapter);
        startBattle(chId);
      });
    });
  }

  function renderGachaResults(results) {
    const container = document.getElementById('gacha-results');
    let hasSheng = false;
    container.innerHTML = results.map((char, idx) => {
      const qcss = QUALITY_CSS[char.quality];
      const own = state.owned[char.id];
      const isDupe = char.wasDupe;
      if (char.quality === '圣') hasSheng = true;
      return `<div class="cc-gacha-card gacha-glow-${qcss}" style="animation-delay: ${idx * 0.12}s">
        <div class="card-icon">${ICONS[char.id - 1]}</div>
        <div class="card-name quality-${qcss}">${char.name}</div>
        <div class="card-quality-tag quality-${qcss}" style="background:rgba(128,128,128,0.15);">${char.quality}·${ROLE_LABELS[char.role]}</div>
        ${isDupe ? `<div class="card-dupe">碎片+1 (${own.dupes})</div>` : '<div class="card-dupe" style="color:var(--green);">新获得!</div>'}
      </div>`;
    }).join('');

    // Screen shake for 圣
    if (hasSheng) {
      const wrapper = document.querySelector('.cc-container');
      wrapper.classList.add('cc-shake');
      setTimeout(() => wrapper.classList.remove('cc-shake'), 500);
    }
  }

  function renderCollection() {
    const grid = document.getElementById('collection-grid');
    const filter = collectionFilter;

    let chars = CHARACTER_DATA.slice();
    if (filter !== 'all') {
      chars = chars.filter(c => c.quality === filter);
    }

    grid.innerHTML = chars.map(c => {
      const owned = state.owned[c.id];
      const qcss = QUALITY_CSS[c.quality];
      return `<div class="cc-collection-card ${owned ? '' : 'not-owned'} quality-border-${qcss}" data-char-id="${c.id}">
        ${owned ? `<span class="card-count">x${owned.dupes}</span>` : ''}
        <div class="card-icon">${ICONS[c.id - 1]}</div>
        <div class="card-name quality-${qcss}">${c.name}</div>
        <div class="card-quality-tag quality-${qcss}" style="background:rgba(128,128,128,0.15);">${c.quality}</div>
        ${owned ? `<div class="card-level">Lv.${owned.level}</div>` : '<div class="card-level">未获得</div>'}
      </div>`;
    }).join('');

    grid.querySelectorAll('.cc-collection-card:not(.not-owned)').forEach(card => {
      card.addEventListener('click', () => {
        const cid = parseInt(card.dataset.charId);
        showCharDetail(cid);
      });
    });
  }

  function showCharDetail(charId) {
    const base = getCharData(charId);
    const own = getOwnedChar(charId);
    if (!base || !own) return;

    const stats = getEffectiveStats(charId);
    const qcss = QUALITY_CSS[base.quality];
    const expNeeded = own.level >= MAX_LEVEL ? 0 : expForLevel(own.level);
    const expPct = expNeeded > 0 ? Math.floor(own.exp / expNeeded * 100) : 100;

    const btInfo = getBreakthroughInfo(charId);

    document.getElementById('char-detail-name').textContent = base.name;
    document.getElementById('char-detail-name').className = `modal-title quality-${qcss}`;

    let btHtml = '';
    if (btInfo) {
      const canBt = canBreakthrough(charId);
      btHtml = `<div class="cc-detail-breakthrough">
        <strong>突破：${base.quality} → ${btInfo.targetQuality}</strong><br>
        需要：等级 ${btInfo.needLevel} + 碎片 ${btInfo.needDupes}个<br>
        <div class="cc-detail-dupes">当前碎片：${own.dupes} | 等级：${own.level}</div>
        ${canBt ? `<button class="btn btn-gold btn-sm" style="margin-top:8px;" id="btn-breakthrough">突破进阶</button>` : ''}
      </div>`;
    } else if (base.quality === '圣') {
      btHtml = `<div class="cc-detail-breakthrough"><strong>已达最高品质</strong></div>`;
    }

    document.getElementById('char-detail-body').innerHTML = `
      <div class="cc-detail-top">
        <div class="cc-detail-icon">${ICONS[charId - 1]}</div>
        <div class="cc-detail-info">
          <div class="cc-detail-quality quality-${qcss}">${base.quality}品 · ${ROLE_LABELS[base.role]}</div>
          <div class="cc-detail-stats">
            <span>攻击：<strong>${stats.atk}</strong></span>
            <span>生命：<strong>${stats.hp}</strong></span>
          </div>
        </div>
      </div>
      <div class="cc-detail-level">
        <div class="cc-detail-level-bar">
          <span>Lv.${own.level}</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${expPct}%"></div></div>
          <span>${own.level >= MAX_LEVEL ? 'MAX' : `${own.exp}/${expNeeded}`}</span>
        </div>
      </div>
      <div class="cc-detail-skill">
        <div class="cc-detail-skill-name">${base.skillName}</div>
        <div class="cc-detail-skill-desc">${base.skillDesc}</div>
      </div>
      ${_renderEquipSlots(charId)}
      ${btHtml}
    `;

    document.getElementById('char-detail-footer').innerHTML = '';

    const modal = document.getElementById('char-detail-modal');
    modal.classList.add('active');

    // Breakthrough button
    const btBtn = document.getElementById('btn-breakthrough');
    if (btBtn) {
      btBtn.addEventListener('click', () => {
        if (doBreakthrough(charId)) {
          showToast(`${base.name} 突破成功！品质提升为 ${base.quality}`, 'success');
          modal.classList.remove('active');
          refreshUI();
        }
      });
    }

    // Equipment slot click handlers
    modal.querySelectorAll('.cc-equip-slot').forEach(slotEl => {
      slotEl.addEventListener('click', () => {
        const slot = slotEl.dataset.slot;
        _showEquipPicker(charId, slot);
      });
    });
    modal.querySelectorAll('.cc-equip-unequip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = btn.dataset.slot;
        const equips = state.equipment[charId];
        if (equips && equips[slot]) {
          state.equipInventory.push(equips[slot]);
          equips[slot] = null;
          saveGame();
          showCharDetail(charId); // refresh
        }
      });
    });
  }

  function _renderEquipSlots(charId) {
    if (!state.equipment[charId]) state.equipment[charId] = {};
    const equips = state.equipment[charId];
    let html = '<div class="cc-equip-section"><div class="cc-equip-title">装备</div><div class="cc-equip-grid">';
    for (const slot of EQUIP_SLOTS) {
      const eid = equips[slot];
      const eq = eid ? EQUIP_MAP[eid] : null;
      if (eq) {
        const qcss = QUALITY_CSS[eq.quality];
        html += `<div class="cc-equip-slot filled quality-border-${qcss}" data-slot="${slot}">
          <span class="cc-equip-icon">${eq.icon}</span>
          <span class="cc-equip-name quality-${qcss}">${eq.name}</span>
          <span class="cc-equip-stat">${eq.atk ? '+' + eq.atk + '攻' : ''}${eq.hp ? '+' + eq.hp + '命' : ''}</span>
          <button class="cc-equip-unequip" data-slot="${slot}">&times;</button>
        </div>`;
      } else {
        html += `<div class="cc-equip-slot empty" data-slot="${slot}">
          <span class="cc-equip-icon" style="opacity:0.3;">+</span>
          <span class="cc-equip-name" style="opacity:0.5;">${EQUIP_SLOT_NAMES[slot]}</span>
        </div>`;
      }
    }
    html += '</div></div>';
    return html;
  }

  function _showEquipPicker(charId, slot) {
    const available = state.equipInventory
      .map((eid, idx) => ({ eid, idx, eq: EQUIP_MAP[eid] }))
      .filter(item => item.eq && item.eq.slot === slot);
    if (available.length === 0) {
      showToast('没有可用的' + EQUIP_SLOT_NAMES[slot] + '，通关章节可获取装备', 'info');
      return;
    }
    // Sort by quality desc
    available.sort((a, b) => (QUALITY_ORDER[b.eq.quality] || 0) - (QUALITY_ORDER[a.eq.quality] || 0));

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:2100;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `<div style="background:var(--bg-card);border-radius:12px;padding:20px;max-width:360px;width:90%;max-height:60vh;overflow-y:auto;">
      <h3 style="margin:0 0 12px;">选择${EQUIP_SLOT_NAMES[slot]}</h3>
      <div class="cc-equip-picker-list">${available.map(item => {
        const eq = item.eq;
        const qcss = QUALITY_CSS[eq.quality];
        return `<div class="cc-equip-picker-item quality-border-${qcss}" data-inv-idx="${item.idx}">
          <span>${eq.icon}</span>
          <span class="quality-${qcss}">${eq.name}</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">${eq.atk ? '+' + eq.atk + '攻 ' : ''}${eq.hp ? '+' + eq.hp + '命' : ''}</span>
        </div>`;
      }).join('')}</div>
      <button class="btn btn-outline btn-sm" style="margin-top:12px;width:100%;" id="equip-picker-close">关闭</button>
    </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#equip-picker-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll('.cc-equip-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const invIdx = parseInt(item.dataset.invIdx);
        const eid = state.equipInventory[invIdx];
        // Unequip current if any
        if (!state.equipment[charId]) state.equipment[charId] = {};
        const current = state.equipment[charId][slot];
        if (current) state.equipInventory.push(current);
        // Equip new
        state.equipment[charId][slot] = eid;
        state.equipInventory.splice(invIdx, 1);
        saveGame();
        overlay.remove();
        showCharDetail(charId); // refresh
      });
    });
  }

  function refreshUI() {
    document.getElementById('stone-count').textContent = formatNumber(state.stones);
    document.getElementById('chapter-info').textContent = state.highestChapter > 0 ? `最高通关：第${state.highestChapter}章` : '尚未通关';
    document.getElementById('card-count').textContent = `卡牌：${getUniqueCount()}/30`;
    // Pity counter display
    var pityEl = document.getElementById('pity-info');
    if (!pityEl) {
      pityEl = document.createElement('div');
      pityEl.id = 'pity-info';
      pityEl.style.cssText = 'font-size:0.75rem;color:var(--text-muted);text-align:center;margin-top:4px;';
      var stoneEl = document.getElementById('stone-count');
      if (stoneEl && stoneEl.parentNode) stoneEl.parentNode.appendChild(pityEl);
    }
    if (pityEl) {
      pityEl.textContent = '距保底: ' + (50 - (state.pityCounter % 50)) + '抽(仙) / ' + (80 - state.pityCounter) + '抽(圣)';
    }

    // Render current active tab
    const activeTab = document.querySelector('.cc-tab.active');
    if (activeTab) {
      const tab = activeTab.dataset.tab;
      if (tab === 'team') { renderTeam(); renderBench(); }
      if (tab === 'chapter') { renderChapters(); }
      if (tab === 'gacha') { /* don't clear results */ }
      if (tab === 'collection') { renderCollection(); }
    }
  }

  // ===== Achievement Tracking =====
  function trackAchievements() {
    CrossGameAchievements.trackStat('games_played_cardcollect', true);
    CrossGameAchievements.trackStat('cardcollect_cards', getUniqueCount());
    const newAch = CrossGameAchievements.checkNew();
    newAch.forEach(a => {
      showToast(`成就解锁：${a.name} - ${a.desc}`, 'success', 4000);
    });
  }

  // ===== Tab System =====
  let collectionFilter = 'all';

  function initTabs() {
    const tabs = document.querySelectorAll('.cc-tab');
    const panels = document.querySelectorAll('.cc-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(`panel-${tab.dataset.tab}`);
        if (panel) panel.classList.add('active');

        // Render on switch
        const t = tab.dataset.tab;
        if (t === 'team') { renderTeam(); renderBench(); }
        if (t === 'chapter') { renderChapters(); }
        if (t === 'collection') { renderCollection(); }
      });
    });
  }

  function initFilters() {
    // Bench filter
    document.getElementById('bench-filter').addEventListener('click', (e) => {
      if (!e.target.classList.contains('cc-filter-btn')) return;
      document.querySelectorAll('#bench-filter .cc-filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      benchFilter = e.target.dataset.filter;
      renderBench();
    });

    // Collection filter
    document.getElementById('collection-filter').addEventListener('click', (e) => {
      if (!e.target.classList.contains('cc-filter-btn')) return;
      document.querySelectorAll('#collection-filter .cc-filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      collectionFilter = e.target.dataset.filter;
      renderCollection();
    });
  }

  function initGacha() {
    document.getElementById('btn-pull1').addEventListener('click', () => {
      const results = executePull(1);
      if (results) {
        renderGachaResults(results);
        refreshUI();
      }
    });

    document.getElementById('btn-pull10').addEventListener('click', () => {
      const results = executePull(10);
      if (results) {
        renderGachaResults(results);
        refreshUI();
      }
    });
  }

  function initBattleControls() {
    document.getElementById('btn-battle-speed').addEventListener('click', () => {
      if (battleSpeed === 1) battleSpeed = 2;
      else if (battleSpeed === 2) battleSpeed = 4;
      else battleSpeed = 1;
      document.getElementById('btn-battle-speed').textContent = `速度：${battleSpeed}x`;
      if (battleState && battleState.running) {
        runBattleLoop();
      }
    });

    document.getElementById('btn-battle-skip').addEventListener('click', () => {
      battleSkipping = true;
      if (battleState && battleState.running) {
        if (battleInterval) clearInterval(battleInterval);
        runBattleLoop();
      }
    });
  }

  function initModals() {
    // Char detail close
    document.getElementById('char-detail-close').addEventListener('click', () => {
      document.getElementById('char-detail-modal').classList.remove('active');
    });
    document.getElementById('char-detail-modal').addEventListener('click', (e) => {
      if (e.target.id === 'char-detail-modal') {
        document.getElementById('char-detail-modal').classList.remove('active');
      }
    });

    // Battle result close
    document.getElementById('result-close').addEventListener('click', () => {
      document.getElementById('battle-result-modal').classList.remove('active');
    });
    document.getElementById('result-ok').addEventListener('click', () => {
      document.getElementById('battle-result-modal').classList.remove('active');
    });
    document.getElementById('battle-result-modal').addEventListener('click', (e) => {
      if (e.target.id === 'battle-result-modal') {
        document.getElementById('battle-result-modal').classList.remove('active');
      }
    });
  }

  // ===== Settings =====
  function initSettings() {
    new SettingsModal([
      {
        key: 'battleSpeed',
        label: '默认战斗速度',
        type: 'select',
        options: [
          { value: 1, label: '1x' },
          { value: 2, label: '2x' },
          { value: 4, label: '4x' },
        ],
        default: 1,
      },
      {
        key: 'particles',
        label: '粒子效果',
        type: 'checkbox',
        checkLabel: '启用背景粒子',
        default: true,
      },
    ], 'cardcollect_settings', (vals) => {
      battleSpeed = vals.battleSpeed;
      const particleEl = document.getElementById('particles');
      if (vals.particles) {
        if (particleEl.children.length === 0) initParticles('#particles', 20);
      } else {
        particleEl.innerHTML = '';
      }
    });
  }

  // ===== Init =====
  function init() {
    loadGame();
    // Daily login reward
    (function checkDailyLogin() {
      var today = new Date().toDateString();
      if (state.lastLoginDate !== today) {
        state.stones += 100;
        state.lastLoginDate = today;
        saveGame();
        showToast('每日登录奖励：+100灵石', 'success');
      }
    })();
    // 仙缘联动: 检查跨游戏奖励
    if (typeof CrossGameRewards !== 'undefined') {
      var ccRewards = CrossGameRewards.checkAndClaim('cardcollect');
      ccRewards.forEach(function(r) {
        if (r.reward.type === 'free_pulls') { state.stones += r.reward.value * 100; saveGame(); }
        showToast('仙缘联动: ' + r.name, 'success');
      });
    }
    initNav('cardcollect');
    initParticles('#particles', 20);
    initSettings();
    initTabs();
    initFilters();
    initGacha();
    initBattleControls();
    initModals();
    trackAchievements();
    refreshUI();
    renderTeam();
    renderBench();

    // Delegated event listener for team slot remove buttons (avoids listener leaks)
    document.getElementById('team-slots').addEventListener('click', (e) => {
      const btn = e.target.closest('.slot-remove');
      if (!btn) return;
      e.stopPropagation();
      const idx = parseInt(btn.dataset.remove);
      state.team[idx] = null;
      saveGame();
      renderTeam();
      renderBench();
    });

    // 新手引导
    if (typeof GuideSystem !== 'undefined') {
      GuideSystem.start('cardcollect', [
        { title: '欢迎来到仙卡录！', desc: '抽取修仙角色卡，编排阵容自动战斗，通关十章秘境。' },
        { title: '抽卡', desc: '使用灵石抽取角色卡，收集各品质英雄。', target: '#btn-pull1' },
        { title: '编排阵容', desc: '从收集的角色中编排五人阵容进行战斗。', target: '#team-slots' },
        { title: '章节挑战', desc: '派出阵容挑战各章秘境Boss。', target: '#panel-chapter' }
      ]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
