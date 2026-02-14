/* ========== 修仙放置RPG ========== */

(function () {
  'use strict';

  // ==================== 数据常量 ====================

  const REALMS = [
    { name: '凡人', expReq: 0, baseHp: 100, baseAtk: 10, baseDef: 5, baseSpirit: 30 },
    { name: '炼气期', expReq: 100, baseHp: 200, baseAtk: 25, baseDef: 12, baseSpirit: 50, rate: 0.95 },
    { name: '筑基期', expReq: 500, baseHp: 400, baseAtk: 50, baseDef: 25, baseSpirit: 80, rate: 0.85 },
    { name: '金丹期', expReq: 2000, baseHp: 800, baseAtk: 100, baseDef: 50, baseSpirit: 120, rate: 0.70 },
    { name: '元婴期', expReq: 8000, baseHp: 1600, baseAtk: 200, baseDef: 100, baseSpirit: 180, rate: 0.55 },
    { name: '化神期', expReq: 30000, baseHp: 3200, baseAtk: 400, baseDef: 200, baseSpirit: 260, rate: 0.40 },
    { name: '渡劫期', expReq: 100000, baseHp: 6400, baseAtk: 800, baseDef: 400, baseSpirit: 380, rate: 0.25 },
    { name: '大乘期', expReq: 500000, baseHp: 12800, baseAtk: 1600, baseDef: 800, baseSpirit: 500, rate: 0.15 },
  ];

  const SPIRIT_ROOTS = [
    { id: 'gold', name: '金灵根', desc: '攻击+20%', icon: '⚔️', atkMul: 1.2, defMul: 1.0, expMul: 1.0 },
    { id: 'wood', name: '木灵根', desc: '生命+20%', icon: '🌿', atkMul: 1.0, defMul: 1.0, expMul: 1.0, hpMul: 1.2 },
    { id: 'water', name: '水灵根', desc: '修炼+20%', icon: '💧', atkMul: 1.0, defMul: 1.0, expMul: 1.2 },
    { id: 'fire', name: '火灵根', desc: '攻击+30%,防御-10%', icon: '🔥', atkMul: 1.3, defMul: 0.9, expMul: 1.0 },
    { id: 'earth', name: '土灵根', desc: '防御+25%', icon: '🪨', atkMul: 1.0, defMul: 1.25, expMul: 1.0 },
    { id: 'chaos', name: '混沌灵根', desc: '全属性+10%', icon: '☯️', atkMul: 1.1, defMul: 1.1, expMul: 1.1, hpMul: 1.1 },
  ];

  const SECTS = [
    { id: 'sword', name: '御剑宗', desc: '攻击+15%', icon: '🗡️', atkMul: 1.15, defMul: 1.0, expMul: 1.0, spiritMul: 1.0 },
    { id: 'pill', name: '丹鼎派', desc: '炼丹成功率+15%', icon: '⚗️', atkMul: 1.0, defMul: 1.0, expMul: 1.0, alchemyBonus: 0.15, spiritMul: 1.1 },
    { id: 'body', name: '炼体门', desc: '防御+20%,生命+10%', icon: '💪', atkMul: 1.0, defMul: 1.2, expMul: 1.0, hpMul: 1.1, spiritMul: 0.9 },
    { id: 'spirit', name: '灵修阁', desc: '修炼速度+20%', icon: '📖', atkMul: 1.0, defMul: 1.0, expMul: 1.2, spiritMul: 1.3 },
  ];

  const EQUIPMENT = [
    // 武器
    { id: 'wooden_sword', name: '木剑', icon: '🗡️', slot: 'weapon', quality: 'common', price: 100, atk: 10, def: 0, hp: 0, desc: '初学者木剑', realmReq: 0 },
    { id: 'iron_sword', name: '铁剑', icon: '🗡️', slot: 'weapon', quality: 'common', price: 300, atk: 18, def: 0, hp: 0, desc: '锋利的铁剑', realmReq: 1 },
    { id: 'spirit_sword', name: '灵剑', icon: '⚔️', slot: 'weapon', quality: 'good', price: 800, atk: 30, def: 0, hp: 0, desc: '注入灵力的剑', realmReq: 1 },
    { id: 'dark_iron_sword', name: '玄铁剑', icon: '⚔️', slot: 'weapon', quality: 'good', price: 2000, atk: 50, def: 0, hp: 0, desc: '玄铁铸造的重剑', realmReq: 2 },
    { id: 'purple_sword', name: '紫电剑', icon: '⚔️', slot: 'weapon', quality: 'rare', price: 5000, atk: 80, def: 0, hp: 0, desc: '剑身环绕紫色雷电', realmReq: 3 },
    { id: 'sky_sword', name: '天罡剑', icon: '🔱', slot: 'weapon', quality: 'rare', price: 12000, atk: 120, def: 0, hp: 0, desc: '天罡之气凝聚成剑', realmReq: 4 },
    { id: 'immortal_sword', name: '仙人剑', icon: '🔱', slot: 'weapon', quality: 'epic', price: 30000, atk: 200, def: 0, hp: 0, desc: '仙人遗留的神兵', realmReq: 5 },
    { id: 'dao_sword', name: '天道剑', icon: '🔱', slot: 'weapon', quality: 'legend', price: 80000, atk: 350, def: 0, hp: 0, desc: '蕴含天道法则的至高神剑', realmReq: 6 },
    // 护甲
    { id: 'cloth_armor', name: '布衣', icon: '👘', slot: 'armor', quality: 'common', price: 80, atk: 0, def: 8, hp: 0, desc: '普通布衣', realmReq: 0 },
    { id: 'iron_armor', name: '铁甲', icon: '🛡️', slot: 'armor', quality: 'common', price: 250, atk: 0, def: 15, hp: 0, desc: '普通铁甲', realmReq: 1 },
    { id: 'spirit_robe', name: '灵袍', icon: '👘', slot: 'armor', quality: 'good', price: 700, atk: 0, def: 30, hp: 50, desc: '灵力编织的法袍', realmReq: 1 },
    { id: 'turtle_armor', name: '玄龟甲', icon: '🛡️', slot: 'armor', quality: 'good', price: 1800, atk: 0, def: 50, hp: 80, desc: '玄龟壳制成的甲', realmReq: 2 },
    { id: 'golden_armor', name: '金丝甲', icon: '🛡️', slot: 'armor', quality: 'rare', price: 4500, atk: 0, def: 80, hp: 120, desc: '金丝软甲,轻便坚韧', realmReq: 3 },
    { id: 'silkworm_robe', name: '天蚕衣', icon: '👘', slot: 'armor', quality: 'rare', price: 11000, atk: 0, def: 120, hp: 200, desc: '天蚕丝织就', realmReq: 4 },
    { id: 'star_robe', name: '星辰袍', icon: '✨', slot: 'armor', quality: 'epic', price: 28000, atk: 0, def: 200, hp: 400, desc: '星辰之力护体', realmReq: 5 },
    { id: 'chaos_armor', name: '混沌战甲', icon: '🛡️', slot: 'armor', quality: 'legend', price: 75000, atk: 0, def: 350, hp: 800, desc: '混沌之力铸造的无上战甲', realmReq: 6 },
    // 饰品
    { id: 'jade_ring', name: '玉戒', icon: '💍', slot: 'accessory', quality: 'common', price: 120, atk: 5, def: 5, hp: 30, desc: '灵玉打磨的戒指', realmReq: 0 },
    { id: 'spirit_necklace', name: '灵石项链', icon: '📿', slot: 'accessory', quality: 'common', price: 350, atk: 8, def: 8, hp: 50, desc: '灵石串成的项链', realmReq: 1 },
    { id: 'wind_ring', name: '风灵环', icon: '💍', slot: 'accessory', quality: 'good', price: 1000, atk: 15, def: 12, hp: 80, desc: '蕴含风之灵力', realmReq: 2 },
    { id: 'sky_bracelet', name: '天目镯', icon: '📿', slot: 'accessory', quality: 'rare', price: 5500, atk: 25, def: 20, hp: 150, desc: '可洞察天机的手镯', realmReq: 3 },
    { id: 'dragon_pendant', name: '龙魂坠', icon: '📿', slot: 'accessory', quality: 'epic', price: 25000, atk: 50, def: 40, hp: 300, desc: '封印龙魂的吊坠', realmReq: 5 },
    { id: 'chaos_pearl', name: '鸿蒙珠', icon: '🔮', slot: 'accessory', quality: 'legend', price: 70000, atk: 80, def: 60, hp: 500, desc: '鸿蒙初开时诞生的至宝', realmReq: 6 },
  ];

  const RECIPES = [
    { id: 'hp_pill', name: '回春丹', desc: '恢复30%生命', effect: { type: 'heal', value: 0.3 }, materials: [{ id: 'herb', count: 3 }], baseRate: 0.8, realmReq: 0 },
    { id: 'exp_pill', name: '培元丹', desc: '获得修为100', effect: { type: 'exp', value: 100 }, materials: [{ id: 'herb', count: 5 }, { id: 'crystal', count: 1 }], baseRate: 0.7, realmReq: 1 },
    { id: 'atk_pill', name: '狂暴丹', desc: '战斗中攻击+50%', effect: { type: 'buff_atk', value: 1.5 }, materials: [{ id: 'beast_core', count: 2 }, { id: 'herb', count: 3 }], baseRate: 0.6, realmReq: 2 },
    { id: 'def_pill', name: '金刚丹', desc: '战斗中防御+50%', effect: { type: 'buff_def', value: 1.5 }, materials: [{ id: 'ore', count: 3 }, { id: 'crystal', count: 1 }], baseRate: 0.6, realmReq: 2 },
    { id: 'break_pill', name: '破境丹', desc: '突破成功率+20%', effect: { type: 'break_bonus', value: 0.2 }, materials: [{ id: 'crystal', count: 3 }, { id: 'beast_core', count: 2 }, { id: 'herb', count: 5 }], baseRate: 0.5, realmReq: 3 },
    { id: 'super_pill', name: '九转金丹', desc: '获得修为1000', effect: { type: 'exp', value: 1000 }, materials: [{ id: 'crystal', count: 5 }, { id: 'beast_core', count: 3 }, { id: 'herb', count: 8 }], baseRate: 0.35, realmReq: 4 },
    { id: 'speed_pill', name: '疾风丹', desc: '修炼速度+100%持续60秒', effect: { type: 'speed_boost', value: 2, duration: 60 }, materials: [{ id: 'herb', count: 4 }, { id: 'crystal', count: 2 }], baseRate: 0.7, realmReq: 1 },
    { id: 'crit_pill', name: '破甲丹', desc: '战斗中暴击率+30%', effect: { type: 'buff_crit', value: 0.3 }, materials: [{ id: 'beast_core', count: 3 }, { id: 'ore', count: 2 }], baseRate: 0.6, realmReq: 2 },
    { id: 'spirit_pill', name: '聚灵丹', desc: '恢复50%灵力', effect: { type: 'restore_spirit', value: 0.5 }, materials: [{ id: 'crystal', count: 3 }, { id: 'herb', count: 4 }], baseRate: 0.65, realmReq: 2 },
    { id: 'revive_pill', name: '续命丹', desc: '战斗中复活(50%HP)', effect: { type: 'revive', value: 0.5 }, materials: [{ id: 'crystal', count: 4 }, { id: 'beast_core', count: 3 }, { id: 'herb', count: 6 }], baseRate: 0.4, realmReq: 4 },
    { id: 'greater_heal_pill', name: '大还丹', desc: '恢复70%生命', effect: { type: 'heal', value: 0.7 }, materials: [{ id: 'herb', count: 8 }, { id: 'crystal', count: 3 }, { id: 'beast_core', count: 2 }], baseRate: 0.5, realmReq: 3 },
    { id: 'enlighten_pill', name: '悟道丹', desc: '获得修为5000', effect: { type: 'exp', value: 5000 }, materials: [{ id: 'crystal', count: 8 }, { id: 'beast_core', count: 5 }, { id: 'herb', count: 10 }, { id: 'ore', count: 5 }], baseRate: 0.25, realmReq: 5 },
  ];

  const DUNGEONS = [
    { id: 'forest', name: '灵兽森林', desc: '低级灵兽出没', realmReq: 0, monsters: ['wolf', 'snake', 'bear'] },
    { id: 'cave', name: '灵矿洞穴', desc: '矿脉深处有守护兽', realmReq: 1, monsters: ['bat', 'golem', 'spider'] },
    { id: 'valley', name: '落凰谷', desc: '传说中凤凰陨落之地', realmReq: 2, monsters: ['ghost', 'demon', 'phoenix_jr'] },
    { id: 'tower', name: '天魔塔', desc: '魔修盘踞之地', realmReq: 3, monsters: ['dark_monk', 'demon_lord', 'shadow'] },
    { id: 'void', name: '虚空裂缝', desc: '时空交错，危机四伏', realmReq: 5, monsters: ['void_beast', 'ancient_dragon', 'chaos_entity'] },
    { id: 'heaven', name: '天劫之地', desc: '天道考验', realmReq: 6, monsters: ['thunder_god', 'celestial', 'dao_guardian'] },
  ];

  const MONSTERS = {
    wolf: { name: '灵狼', icon: '🐺', hp: 50, atk: 12, def: 5, exp: 20, gold: 10, drops: [{ id: 'beast_core', rate: 0.3 }, { id: 'herb', rate: 0.5 }] },
    snake: { name: '蟒蛇', icon: '🐍', hp: 70, atk: 15, def: 8, exp: 30, gold: 15, drops: [{ id: 'beast_core', rate: 0.4 }, { id: 'herb', rate: 0.4 }] },
    bear: { name: '灵熊', icon: '🐻', hp: 120, atk: 20, def: 15, exp: 50, gold: 25, drops: [{ id: 'beast_core', rate: 0.5 }, { id: 'ore', rate: 0.3 }] },
    bat: { name: '蝙蝠精', icon: '🦇', hp: 80, atk: 18, def: 6, exp: 35, gold: 20, drops: [{ id: 'crystal', rate: 0.2 }, { id: 'herb', rate: 0.4 }] },
    golem: { name: '石魔傀', icon: '🗿', hp: 200, atk: 25, def: 30, exp: 60, gold: 40, drops: [{ id: 'ore', rate: 0.6 }, { id: 'crystal', rate: 0.3 }] },
    spider: { name: '千年蛛妖', icon: '🕷️', hp: 150, atk: 30, def: 12, exp: 55, gold: 35, drops: [{ id: 'herb', rate: 0.5 }, { id: 'beast_core', rate: 0.4 }] },
    ghost: { name: '幽魂', icon: '👻', hp: 180, atk: 35, def: 10, exp: 70, gold: 45, drops: [{ id: 'crystal', rate: 0.4 }, { id: 'herb', rate: 0.3 }] },
    demon: { name: '妖修', icon: '👹', hp: 300, atk: 45, def: 25, exp: 100, gold: 60, drops: [{ id: 'beast_core', rate: 0.5 }, { id: 'crystal', rate: 0.3 }] },
    phoenix_jr: { name: '火鸦', icon: '🐦', hp: 250, atk: 55, def: 20, exp: 120, gold: 70, drops: [{ id: 'crystal', rate: 0.5 }, { id: 'beast_core', rate: 0.4 }] },
    dark_monk: { name: '暗修', icon: '🧙', hp: 500, atk: 80, def: 40, exp: 200, gold: 120, drops: [{ id: 'crystal', rate: 0.5 }, { id: 'ore', rate: 0.4 }] },
    demon_lord: { name: '魔尊', icon: '😈', hp: 800, atk: 120, def: 60, exp: 350, gold: 200, drops: [{ id: 'crystal', rate: 0.6 }, { id: 'beast_core', rate: 0.5 }] },
    shadow: { name: '暗影', icon: '🌑', hp: 400, atk: 100, def: 30, exp: 250, gold: 150, drops: [{ id: 'crystal', rate: 0.5 }, { id: 'herb', rate: 0.5 }] },
    void_beast: { name: '虚空兽', icon: '🌀', hp: 1500, atk: 200, def: 100, exp: 600, gold: 400, drops: [{ id: 'crystal', rate: 0.7 }, { id: 'beast_core', rate: 0.6 }] },
    ancient_dragon: { name: '古龙', icon: '🐉', hp: 3000, atk: 350, def: 180, exp: 1200, gold: 800, drops: [{ id: 'crystal', rate: 0.8 }, { id: 'ore', rate: 0.6 }] },
    chaos_entity: { name: '混沌体', icon: '🌌', hp: 2000, atk: 280, def: 140, exp: 900, gold: 600, drops: [{ id: 'crystal', rate: 0.7 }, { id: 'beast_core', rate: 0.7 }] },
    thunder_god: { name: '雷神', icon: '⚡', hp: 5000, atk: 500, def: 250, exp: 2000, gold: 1500, drops: [{ id: 'crystal', rate: 0.9 }, { id: 'beast_core', rate: 0.7 }] },
    celestial: { name: '天人', icon: '👼', hp: 8000, atk: 700, def: 400, exp: 4000, gold: 3000, drops: [{ id: 'crystal', rate: 0.9 }, { id: 'ore', rate: 0.8 }] },
    dao_guardian: { name: '道之守卫', icon: '🛡️', hp: 12000, atk: 1000, def: 600, exp: 8000, gold: 5000, drops: [{ id: 'crystal', rate: 1.0 }, { id: 'beast_core', rate: 0.9 }] },
  };

  const MATERIALS = {
    herb: { name: '灵草', icon: '🌿', desc: '炼丹基础材料' },
    crystal: { name: '灵石', icon: '💎', desc: '蕴含灵力的石头' },
    beast_core: { name: '兽核', icon: '🔮', desc: '灵兽体内的核心' },
    ore: { name: '灵矿', icon: '⛏️', desc: '蕴含灵力的矿石' },
  };

  const SHOP_ITEMS = [
    { id: 'herb', name: '灵草', icon: '🌿', price: 10, type: 'material', desc: '炼丹基础材料' },
    { id: 'crystal', name: '灵石', icon: '💎', price: 50, type: 'material', desc: '蕴含灵力的石头' },
    { id: 'beast_core', name: '兽核', icon: '🔮', price: 80, type: 'material', desc: '灵兽核心' },
    { id: 'ore', name: '灵矿', icon: '⛏️', price: 40, type: 'material', desc: '灵力矿石' },
    { id: 'hp_pill', name: '回春丹', icon: '💊', price: 30, type: 'pill', desc: '恢复30%生命' },
  ];

  const EQUIP_SLOTS = ['weapon', 'armor', 'accessory'];
  const SLOT_NAMES = { weapon: '武器', armor: '护甲', accessory: '饰品' };
  const SLOT_ICONS = { weapon: '🗡️', armor: '🛡️', accessory: '💍' };
  const QUALITY_NAMES = { common: '凡品', good: '良品', rare: '稀有', epic: '史诗', legend: '传说' };

  const SKILLS = [
    // 御剑宗
    { id: 'sword_qi', name: '剑气斩', desc: '释放剑气攻击', sect: 'sword', dmgMul: 1.8, spiritCost: 20, cooldown: 0, realmReq: 0, effect: null },
    { id: 'ten_swords', name: '万剑归宗', desc: '召唤剑雨', sect: 'sword', dmgMul: 2.5, spiritCost: 40, cooldown: 3, realmReq: 2, effect: { type: 'dot', dmg: 0.3, turns: 2 } },
    { id: 'sword_intent', name: '剑意无形', desc: '无形剑意', sect: 'sword', dmgMul: 3.5, spiritCost: 60, cooldown: 5, realmReq: 4, effect: { type: 'lifesteal', value: 0.2 } },
    { id: 'sword_domain', name: '御剑领域', desc: '剑域笼罩', sect: 'sword', dmgMul: 5.0, spiritCost: 100, cooldown: 8, realmReq: 6, effect: { type: 'dot', dmg: 0.5, turns: 3 } },
    // 丹鼎派
    { id: 'poison_mist', name: '毒雾术', desc: '释放毒雾', sect: 'pill', dmgMul: 1.5, spiritCost: 15, cooldown: 0, realmReq: 0, effect: { type: 'dot', dmg: 0.2, turns: 3 } },
    { id: 'heal_art', name: '回春术', desc: '恢复生命', sect: 'pill', dmgMul: 0, spiritCost: 30, cooldown: 3, realmReq: 1, effect: { type: 'heal', value: 0.25 } },
    { id: 'spirit_drain_skill', name: '吸灵术', desc: '吸取灵力', sect: 'pill', dmgMul: 2.0, spiritCost: 20, cooldown: 4, realmReq: 3, effect: { type: 'spirit_drain', value: 30 } },
    { id: 'nirvana', name: '涅槃术', desc: '浴火重生', sect: 'pill', dmgMul: 4.0, spiritCost: 90, cooldown: 8, realmReq: 5, effect: { type: 'heal', value: 0.4 } },
    // 炼体门
    { id: 'iron_fist', name: '铁拳', desc: '刚猛拳击', sect: 'body', dmgMul: 2.0, spiritCost: 15, cooldown: 0, realmReq: 0, effect: null },
    { id: 'stone_skin', name: '金刚体', desc: '防御增幅', sect: 'body', dmgMul: 0, spiritCost: 25, cooldown: 4, realmReq: 1, effect: { type: 'def_buff', value: 2.0, turns: 3 } },
    { id: 'counter_skill', name: '以彼之道', desc: '反弹伤害', sect: 'body', dmgMul: 1.0, spiritCost: 35, cooldown: 4, realmReq: 3, effect: { type: 'counter', value: 0.5, turns: 2 } },
    { id: 'titan', name: '巨人化', desc: '全属性提升', sect: 'body', dmgMul: 3.0, spiritCost: 80, cooldown: 7, realmReq: 5, effect: { type: 'shield', value: 0.3 } },
    // 灵修阁
    { id: 'mind_blast', name: '神识冲击', desc: '精神攻击', sect: 'spirit', dmgMul: 1.6, spiritCost: 18, cooldown: 0, realmReq: 0, effect: null },
    { id: 'spirit_shield', name: '灵盾', desc: '灵力护盾', sect: 'spirit', dmgMul: 0, spiritCost: 30, cooldown: 3, realmReq: 1, effect: { type: 'shield', value: 0.25 } },
    { id: 'soul_burn', name: '焚魂', desc: '灼烧灵魂', sect: 'spirit', dmgMul: 2.8, spiritCost: 50, cooldown: 5, realmReq: 3, effect: { type: 'dot', dmg: 0.4, turns: 2 } },
    { id: 'void_gaze', name: '虚空之眼', desc: '虚空凝视', sect: 'spirit', dmgMul: 4.5, spiritCost: 90, cooldown: 7, realmReq: 5, effect: { type: 'spirit_drain', value: 50 } },
  ];

  const ACHIEVEMENTS = [
    // 战斗
    { id: 'first_kill', name: '初出茅庐', icon: '⚔️', desc: '击败第一个敌人', category: 'battle', condition: d => d.totalKills >= 1, reward: { gold: 50, exp: 30 } },
    { id: 'kills_100', name: '百战修士', icon: '⚔️', desc: '累计击败100个敌人', category: 'battle', condition: d => d.totalKills >= 100, reward: { gold: 500, exp: 300 } },
    { id: 'kills_1000', name: '千斩', icon: '🗡️', desc: '累计击败1000个敌人', category: 'battle', condition: d => d.totalKills >= 1000, reward: { gold: 2000, exp: 1500 } },
    { id: 'kills_5000', name: '屠龙勇士', icon: '🐉', desc: '累计击败5000个敌人', category: 'battle', condition: d => d.totalKills >= 5000, reward: { gold: 10000, exp: 8000 } },
    // 修炼
    { id: 'realm_1', name: '入门', icon: '🌱', desc: '突破到炼气期', category: 'cultivation', condition: d => d.realm >= 1, reward: { gold: 100, exp: 50 } },
    { id: 'realm_2', name: '筑基成功', icon: '🏗️', desc: '突破到筑基期', category: 'cultivation', condition: d => d.realm >= 2, reward: { gold: 300, exp: 200 } },
    { id: 'realm_3', name: '金丹大道', icon: '🟡', desc: '突破到金丹期', category: 'cultivation', condition: d => d.realm >= 3, reward: { gold: 800, exp: 500 } },
    { id: 'realm_4', name: '元婴老怪', icon: '👶', desc: '突破到元婴期', category: 'cultivation', condition: d => d.realm >= 4, reward: { gold: 2000, exp: 1500 } },
    { id: 'realm_5', name: '化神尊者', icon: '✨', desc: '突破到化神期', category: 'cultivation', condition: d => d.realm >= 5, reward: { gold: 5000, exp: 4000 } },
    { id: 'realm_6', name: '渡劫大能', icon: '🌩️', desc: '突破到渡劫期', category: 'cultivation', condition: d => d.realm >= 6, reward: { gold: 15000, exp: 12000 } },
    { id: 'realm_7', name: '大乘圆满', icon: '🌟', desc: '达到大乘期', category: 'cultivation', condition: d => d.realm >= 7, reward: { gold: 50000, exp: 40000 } },
    { id: 'exp_10k', name: '修炼之路', icon: '📖', desc: '累计获得10000修为', category: 'cultivation', condition: d => d.totalExp >= 10000, reward: { gold: 200, exp: 100 } },
    { id: 'exp_100k', name: '修仙大道', icon: '📚', desc: '累计获得100000修为', category: 'cultivation', condition: d => d.totalExp >= 100000, reward: { gold: 2000, exp: 1000 } },
    // 炼丹
    { id: 'craft_1', name: '初学炼丹', icon: '🔥', desc: '成功炼制第一颗丹药', category: 'alchemy', condition: d => d.totalCrafts >= 1, reward: { gold: 50, exp: 30 } },
    { id: 'craft_20', name: '丹道小成', icon: '🔮', desc: '成功炼制20颗丹药', category: 'alchemy', condition: d => d.totalCrafts >= 20, reward: { gold: 500, exp: 300 } },
    { id: 'craft_100', name: '丹道大师', icon: '⚗️', desc: '成功炼制100颗丹药', category: 'alchemy', condition: d => d.totalCrafts >= 100, reward: { gold: 3000, exp: 2000 } },
    // 探索
    { id: 'event_1', name: '初探秘境', icon: '🗺️', desc: '触发第一个随机事件', category: 'explore', condition: d => d.totalEvents >= 1, reward: { gold: 50, exp: 30 } },
    { id: 'event_10', name: '历练丰富', icon: '🧭', desc: '触发10个随机事件', category: 'explore', condition: d => d.totalEvents >= 10, reward: { gold: 300, exp: 200 } },
    { id: 'event_50', name: '阅历无数', icon: '🌍', desc: '触发50个随机事件', category: 'explore', condition: d => d.totalEvents >= 50, reward: { gold: 1500, exp: 1000 } },
    { id: 'event_100', name: '天命之人', icon: '🌈', desc: '触发100个随机事件', category: 'explore', condition: d => d.totalEvents >= 100, reward: { gold: 5000, exp: 4000 } },
  ];

  const RANDOM_EVENTS = [
    { id: 'treasure_box', name: '发现宝箱', icon: '📦', desc: '你发现了一个古老的宝箱！', chance: 0.004, options: [
      { text: '打开宝箱', result: g => { const gold = randomInt(100, 300); g.data.gold += gold; return `获得 ${gold} 灵石！`; } },
      { text: '谨慎离开', result: g => { const exp = randomInt(30, 80); g.data.exp += exp; g.data.totalExp += exp; return `感悟道理，获得 ${exp} 修为。`; } },
    ]},
    { id: 'evil_cultivator', name: '遭遇妖修', icon: '👹', desc: '一名妖修挡住了你的去路！', chance: 0.003, options: [
      { text: '与之战斗', result: g => { if (Math.random() < 0.6) { const gold = randomInt(150, 400); const exp = randomInt(80, 200); g.data.gold += gold; g.data.exp += exp; g.data.totalExp += exp; return `击败妖修！获得 ${gold} 灵石和 ${exp} 修为！`; } else { const loss = Math.floor(g.data.gold * 0.1); g.data.gold = Math.max(0, g.data.gold - loss); return `不敌妖修，丢失了 ${loss} 灵石。`; } } },
      { text: '绕道而行', result: () => '你选择绕道而行，避免了一场恶战。' },
    ]},
    { id: 'inheritance', name: '获得传承', icon: '📜', desc: '你发现了一处古修士洞府！', chance: 0.002, options: [
      { text: '接受传承', result: g => { const exp = randomInt(300, 600); g.data.exp += exp; g.data.totalExp += exp; return `获得古修士传承，修为大增！+${exp} 修为！`; } },
      { text: '搜刮洞府', result: g => { const gold = randomInt(200, 500); g.data.gold += gold; return `在洞府中找到 ${gold} 灵石。`; } },
    ]},
    { id: 'herb_find', name: '发现灵药', icon: '🌿', desc: '你发现了一片灵药田！', chance: 0.005, options: [
      { text: '采集灵药', result: g => { const c = randomInt(3, 6); g.data.inventory.herb = (g.data.inventory.herb || 0) + c; return `采集了 ${c} 株灵草！`; } },
      { text: '在此修炼', result: g => { const exp = randomInt(50, 120); g.data.exp += exp; g.data.totalExp += exp; return `灵气充裕之地修炼，获得 ${exp} 修为。`; } },
    ]},
    { id: 'merchant', name: '神秘商人', icon: '🧳', desc: '一位云游商人出现在你面前。', chance: 0.004, options: [
      { text: '交易 (花费100灵石)', result: g => { if (g.data.gold >= 100) { g.data.gold -= 100; const mats = ['herb','crystal','beast_core','ore']; const m = pick(mats); const c = randomInt(2, 4); g.data.inventory[m] = (g.data.inventory[m] || 0) + c; return `购得 ${c} 个${MATERIALS[m].name}！`; } return '灵石不足，商人摇头离去。'; } },
      { text: '闲聊', result: g => { const exp = randomInt(20, 50); g.data.exp += exp; g.data.totalExp += exp; return `交流修仙心得，获得 ${exp} 修为。`; } },
    ]},
    { id: 'mine', name: '灵石矿脉', icon: '⛏️', desc: '你发现了一条灵矿矿脉！', chance: 0.005, options: [
      { text: '开采矿石', result: g => { const c = randomInt(2, 5); g.data.inventory.ore = (g.data.inventory.ore || 0) + c; return `开采了 ${c} 块灵矿！`; } },
      { text: '探索深处', result: g => { if (Math.random() < 0.5) { const c = randomInt(1, 3); g.data.inventory.crystal = (g.data.inventory.crystal || 0) + c; return `发现 ${c} 颗灵石！`; } const gold = randomInt(50, 150); g.data.gold += gold; return `找到 ${gold} 灵石的矿物。`; } },
    ]},
    { id: 'spring', name: '灵泉', icon: '💧', desc: '你发现了一处灵泉！', chance: 0.004, options: [
      { text: '饮用灵泉', result: g => { g.data.hp = g.data.maxHp; if (g.data.spirit !== undefined) g.data.spirit = g.data.maxSpirit; const exp = randomInt(40, 100); g.data.exp += exp; g.data.totalExp += exp; return `伤势全愈，灵力恢复，获得 ${exp} 修为！`; } },
      { text: '在灵泉旁修炼', result: g => { const exp = randomInt(80, 200); g.data.exp += exp; g.data.totalExp += exp; return `灵气充沛，获得 ${exp} 修为！`; } },
    ]},
    { id: 'tribulation', name: '天劫感悟', icon: '🌩️', desc: '你在天劫余波中获得感悟！', chance: 0.002, options: [
      { text: '参悟天劫', result: g => { const exp = randomInt(200, 500); g.data.exp += exp; g.data.totalExp += exp; return `参悟大道，获得 ${exp} 修为！`; } },
      { text: '收集雷灵', result: g => { const c = randomInt(1, 3); g.data.inventory.crystal = (g.data.inventory.crystal || 0) + c; g.data.inventory.beast_core = (g.data.inventory.beast_core || 0) + c; return `收集了 ${c} 颗灵石和 ${c} 颗兽核！`; } },
    ]},
    { id: 'beast_remains', name: '灵兽遗骸', icon: '🦴', desc: '你发现了一具远古灵兽的遗骸。', chance: 0.003, options: [
      { text: '搜索遗骸', result: g => { const c = randomInt(2, 5); g.data.inventory.beast_core = (g.data.inventory.beast_core || 0) + c; return `获取了 ${c} 颗兽核！`; } },
      { text: '感悟灵兽之道', result: g => { const exp = randomInt(100, 250); g.data.exp += exp; g.data.totalExp += exp; return `感悟战斗之道，获得 ${exp} 修为！`; } },
    ]},
    { id: 'pill_rain', name: '天降丹药', icon: '💊', desc: '天空中降下了奇异的丹药！', chance: 0.006, options: [
      { text: '收集丹药', result: g => { const heal = Math.floor(g.data.maxHp * 0.3); g.data.hp = Math.min(g.data.maxHp, g.data.hp + heal); const exp = randomInt(30, 80); g.data.exp += exp; g.data.totalExp += exp; return `恢复 ${heal} 生命，获得 ${exp} 修为！`; } },
      { text: '分析丹方', result: g => { for (const m of ['herb','crystal','beast_core','ore']) { const c = randomInt(1, 2); g.data.inventory[m] = (g.data.inventory[m] || 0) + c; } return '分析丹药成分，获得了各种炼丹材料！'; } },
    ]},
  ];

  // ==================== CultivationGame类 ====================

  class CultivationGame {
    constructor() {
      this.data = null;
      this.activeSlot = null;
      this.meditating = false;
      this.battleState = null;
      this.autoSaveInterval = null;
      this.tickInterval = null;
      this.tickCount = 0;
      this.speedBoostEnd = 0;
    }

    static migrateOldSave() {
      const old = Storage.get('cultivation_save');
      if (old && !Storage.get('cultivation_save_1')) {
        Storage.set('cultivation_save_1', old);
        Storage.remove('cultivation_save');
      }
    }

    static getSlotInfo(slot) {
      const data = Storage.get('cultivation_save_' + slot);
      if (!data) return null;
      return { name: data.name, realm: REALMS[data.realm]?.name || '凡人', sect: SECTS.find(s => s.id === data.sect)?.name || '', totalKills: data.totalKills || 0 };
    }

    createCharacter(name, spiritRootId, sectId, slot) {
      const sr = SPIRIT_ROOTS.find(s => s.id === spiritRootId);
      const sect = SECTS.find(s => s.id === sectId);
      if (!name || !sr || !sect) return false;

      this.activeSlot = slot;
      this.data = {
        name, spiritRoot: spiritRootId, sect: sectId,
        realm: 0, exp: 0, gold: 50, hp: 100, maxHp: 100, atk: 10, def: 5,
        spirit: 30, maxSpirit: 30,
        inventory: { herb: 5, crystal: 0, beast_core: 0, ore: 0 },
        pills: { hp_pill: 2 },
        equipment: { weapon: null, armor: null, accessory: null },
        ownedEquips: [],
        totalExp: 0, totalKills: 0, totalCrafts: 0, totalEvents: 0,
        achievements: [],
        lastOnline: Date.now(), created: Date.now(),
      };

      this.recalcStats();
      this.data.hp = this.data.maxHp;
      this.data.spirit = this.data.maxSpirit;
      this.save();
      return true;
    }

    load(slot) {
      const saved = Storage.get('cultivation_save_' + slot);
      if (!saved) return false;
      this.activeSlot = slot;
      this.data = saved;
      // migrate missing fields
      if (this.data.spirit === undefined) { this.data.spirit = 30; this.data.maxSpirit = 30; }
      if (!this.data.achievements) this.data.achievements = [];
      if (this.data.totalCrafts === undefined) this.data.totalCrafts = 0;
      if (this.data.totalEvents === undefined) this.data.totalEvents = 0;
      this.recalcStats();
      this.processOfflineGains();
      return true;
    }

    save() {
      if (!this.data || !this.activeSlot) return;
      this.data.lastOnline = Date.now();
      Storage.set('cultivation_save_' + this.activeSlot, this.data);
    }

    deleteSave() {
      if (this.activeSlot) Storage.remove('cultivation_save_' + this.activeSlot);
      this.data = null;
    }

    recalcStats() {
      const d = this.data;
      const realm = REALMS[d.realm];
      const sr = SPIRIT_ROOTS.find(s => s.id === d.spiritRoot);
      const sect = SECTS.find(s => s.id === d.sect);

      let baseHp = realm.baseHp;
      let baseAtk = realm.baseAtk;
      let baseDef = realm.baseDef;
      let baseSpirit = realm.baseSpirit || 30;

      baseAtk *= sr.atkMul;
      baseDef *= sr.defMul;
      if (sr.hpMul) baseHp *= sr.hpMul;

      baseAtk *= sect.atkMul;
      baseDef *= sect.defMul;
      if (sect.hpMul) baseHp *= sect.hpMul;
      if (sect.spiritMul) baseSpirit *= sect.spiritMul;

      for (const slot of EQUIP_SLOTS) {
        const eqId = d.equipment[slot];
        if (!eqId) continue;
        const eq = EQUIPMENT.find(i => i.id === eqId);
        if (!eq) continue;
        if (eq.atk) baseAtk += eq.atk;
        if (eq.def) baseDef += eq.def;
        if (eq.hp) baseHp += eq.hp;
      }

      d.maxHp = Math.floor(baseHp);
      d.atk = Math.floor(baseAtk);
      d.def = Math.floor(baseDef);
      d.maxSpirit = Math.floor(baseSpirit);
      if (d.hp > d.maxHp) d.hp = d.maxHp;
      if (d.spirit > d.maxSpirit) d.spirit = d.maxSpirit;
    }

    getExpRate() {
      const sr = SPIRIT_ROOTS.find(s => s.id === this.data.spiritRoot);
      const sect = SECTS.find(s => s.id === this.data.sect);
      const base = (this.data.realm + 1) * 2;
      let rate = Math.floor(base * sr.expMul * sect.expMul);
      if (Date.now() < this.speedBoostEnd) rate *= 2;
      return rate;
    }

    processOfflineGains() {
      const now = Date.now();
      const elapsed = (now - this.data.lastOnline) / 1000;
      if (elapsed < 10) return;
      const gain = Math.floor(elapsed * this.getExpRate() * 0.5);
      if (gain > 0) {
        this.data.exp += gain;
        this.data.totalExp += gain;
        showToast(`离线收获 ${formatNumber(gain)} 修为`, 'info');
      }
    }

    tick() {
      if (!this.data || !this.meditating) return;
      const rate = this.getExpRate();
      this.data.exp += rate;
      this.data.totalExp += rate;
      if (this.data.hp < this.data.maxHp) {
        this.data.hp = Math.min(this.data.maxHp, this.data.hp + Math.ceil(this.data.maxHp * 0.01));
      }
      // 灵力恢复
      if (this.data.spirit < this.data.maxSpirit) {
        this.data.spirit = Math.min(this.data.maxSpirit, this.data.spirit + Math.ceil(this.data.maxSpirit * 0.02));
      }
      this.tickCount++;
      // 每10秒检查成就
      if (this.tickCount % 10 === 0) this.checkAchievements();
    }

    _checkRandomEvent() {
      for (const evt of RANDOM_EVENTS) {
        if (Math.random() < evt.chance) return evt;
      }
      return null;
    }

    canBreakthrough() {
      if (this.data.realm >= REALMS.length - 1) return false;
      return this.data.exp >= REALMS[this.data.realm + 1].expReq;
    }

    tryBreakthrough() {
      if (!this.canBreakthrough()) return { success: false, reason: '修为不足' };
      const nextRealm = REALMS[this.data.realm + 1];
      let rate = nextRealm.rate || 0.5;
      if (this.data.pills.break_pill && this.data.pills.break_pill > 0) {
        rate += 0.2;
        this.data.pills.break_pill--;
      }
      this.data.exp -= Math.floor(nextRealm.expReq * 0.5);
      if (Math.random() < rate) {
        this.data.realm++;
        this.recalcStats();
        this.data.hp = this.data.maxHp;
        this.data.spirit = this.data.maxSpirit;
        this.save();
        this.checkAchievements();
        updateLeaderboard('cultivation', this.data.realm, { name: this.data.name });
        return { success: true, realm: REALMS[this.data.realm].name };
      }
      this.save();
      return { success: false, reason: '突破失败，损失部分修为' };
    }

    // --- 战斗系统 ---
    startBattle(dungeonId) {
      const dungeon = DUNGEONS.find(d => d.id === dungeonId);
      if (!dungeon || this.data.realm < dungeon.realmReq) return null;
      const monsterId = pick(dungeon.monsters);
      const mTemplate = MONSTERS[monsterId];
      const scale = 1 + this.data.realm * 0.3;

      this.battleState = {
        monster: { ...mTemplate, id: monsterId, currentHp: Math.floor(mTemplate.hp * scale), maxHp: Math.floor(mTemplate.hp * scale), atk: Math.floor(mTemplate.atk * scale), def: Math.floor(mTemplate.def * scale) },
        log: [], turn: 0, done: false, won: false,
        buffAtk: 1, buffDef: 1, buffCrit: 0,
        dots: [], cooldowns: {}, counterTurns: 0, counterValue: 0, shield: 0,
        reviveUsed: false,
      };
      this.battleState.log.push({ text: `遭遇 ${mTemplate.icon} ${mTemplate.name}！`, type: 'info' });
      return this.battleState;
    }

    _monsterAttack() {
      const b = this.battleState;
      const d = this.data;
      let mDmg = Math.max(1, Math.floor(b.monster.atk - d.def * b.buffDef * 0.5));
      // 反伤
      if (b.counterTurns > 0) {
        const reflected = Math.floor(mDmg * b.counterValue);
        b.monster.currentHp -= reflected;
        b.log.push({ text: `反弹 ${reflected} 点伤害！`, type: 'skill' });
        b.counterTurns--;
      }
      // 护盾吸收
      if (b.shield > 0) {
        const absorbed = Math.min(b.shield, mDmg);
        b.shield -= absorbed;
        mDmg -= absorbed;
        if (absorbed > 0) b.log.push({ text: `护盾吸收 ${absorbed} 点伤害`, type: 'info' });
      }
      d.hp -= mDmg;
      b.log.push({ text: `${b.monster.name} 造成 ${mDmg} 点伤害`, type: 'damage' });

      if (b.monster.currentHp <= 0) {
        b.monster.currentHp = 0; b.done = true; b.won = true;
        this.battleReward(); return;
      }
      if (d.hp <= 0) {
        // 续命丹检查
        if (!b.reviveUsed && d.pills.revive_pill && d.pills.revive_pill > 0) {
          d.pills.revive_pill--;
          d.hp = Math.floor(d.maxHp * 0.5);
          b.reviveUsed = true;
          b.log.push({ text: '续命丹生效，浴火重生！', type: 'heal' });
        } else {
          d.hp = 0; b.done = true; b.won = false;
          b.log.push({ text: '你被击败了...', type: 'info' });
          d.hp = Math.ceil(d.maxHp * 0.1);
        }
      }
    }

    _processDots() {
      const b = this.battleState;
      const newDots = [];
      for (const dot of b.dots) {
        const dmg = Math.floor(this.data.atk * dot.dmg);
        b.monster.currentHp -= dmg;
        b.log.push({ text: `持续伤害 ${dmg} 点`, type: 'skill' });
        dot.turns--;
        if (dot.turns > 0) newDots.push(dot);
      }
      b.dots = newDots;
      if (b.monster.currentHp <= 0) {
        b.monster.currentHp = 0; b.done = true; b.won = true;
        this.battleReward();
      }
    }

    battleAttack() {
      if (!this.battleState || this.battleState.done) return;
      const b = this.battleState;
      b.turn++;
      // 冷却递减
      for (const k in b.cooldowns) { if (b.cooldowns[k] > 0) b.cooldowns[k]--; }

      let pDmg = Math.max(1, Math.floor(this.data.atk * b.buffAtk - b.monster.def * 0.5));
      if (b.buffCrit > 0 && Math.random() < b.buffCrit) { pDmg = Math.floor(pDmg * 1.5); b.log.push({ text: '暴击！', type: 'skill' }); }
      b.monster.currentHp -= pDmg;
      b.log.push({ text: `你造成 ${pDmg} 点伤害`, type: 'damage' });

      if (b.monster.currentHp <= 0) { b.monster.currentHp = 0; b.done = true; b.won = true; this.battleReward(); return; }
      this._processDots();
      if (b.done) return;
      this._monsterAttack();
    }

    battleSkill() {
      if (!this.battleState || this.battleState.done) return;
      const b = this.battleState;
      b.turn++;
      for (const k in b.cooldowns) { if (b.cooldowns[k] > 0) b.cooldowns[k]--; }

      const pDmg = Math.max(1, Math.floor(this.data.atk * b.buffAtk * 1.5 - b.monster.def * 0.3));
      b.monster.currentHp -= pDmg;
      b.log.push({ text: `你使出灵技，造成 ${pDmg} 点伤害！`, type: 'damage' });

      if (b.monster.currentHp <= 0) { b.monster.currentHp = 0; b.done = true; b.won = true; this.battleReward(); return; }
      this._processDots();
      if (b.done) return;
      this._monsterAttack();
    }

    battleUseSkill(skillId) {
      if (!this.battleState || this.battleState.done) return;
      const skill = SKILLS.find(s => s.id === skillId);
      if (!skill) return;
      const b = this.battleState;
      const d = this.data;

      if (d.realm < skill.realmReq) { showToast('境界不足', 'error'); return; }
      if ((b.cooldowns[skillId] || 0) > 0) { showToast(`冷却中 (${b.cooldowns[skillId]}回合)`, 'error'); return; }
      if (d.spirit < skill.spiritCost) { showToast('灵力不足', 'error'); return; }

      d.spirit -= skill.spiritCost;
      b.cooldowns[skillId] = skill.cooldown;
      b.turn++;
      for (const k in b.cooldowns) { if (k !== skillId && b.cooldowns[k] > 0) b.cooldowns[k]--; }

      // 技能伤害
      if (skill.dmgMul > 0) {
        let pDmg = Math.max(1, Math.floor(d.atk * b.buffAtk * skill.dmgMul - b.monster.def * 0.3));
        if (b.buffCrit > 0 && Math.random() < b.buffCrit) { pDmg = Math.floor(pDmg * 1.5); b.log.push({ text: '暴击！', type: 'skill' }); }
        b.monster.currentHp -= pDmg;
        b.log.push({ text: `${skill.name}！造成 ${pDmg} 点伤害`, type: 'skill' });

        // 吸血
        if (skill.effect && skill.effect.type === 'lifesteal') {
          const heal = Math.floor(pDmg * skill.effect.value);
          d.hp = Math.min(d.maxHp, d.hp + heal);
          b.log.push({ text: `吸取 ${heal} 生命`, type: 'heal' });
        }
      }

      // 特殊效果
      if (skill.effect) {
        const eff = skill.effect;
        if (eff.type === 'dot') b.dots.push({ dmg: eff.dmg, turns: eff.turns });
        if (eff.type === 'heal') { const heal = Math.floor(d.maxHp * eff.value); d.hp = Math.min(d.maxHp, d.hp + heal); b.log.push({ text: `恢复 ${heal} 生命`, type: 'heal' }); }
        if (eff.type === 'def_buff') { b.buffDef = eff.value; b.log.push({ text: `防御提升${eff.turns}回合！`, type: 'info' }); }
        if (eff.type === 'counter') { b.counterTurns = eff.turns; b.counterValue = eff.value; b.log.push({ text: `反伤${eff.turns}回合！`, type: 'info' }); }
        if (eff.type === 'shield') { b.shield = Math.floor(d.maxHp * eff.value); b.log.push({ text: `获得 ${b.shield} 护盾`, type: 'info' }); }
        if (eff.type === 'spirit_drain') { const gain = Math.min(eff.value, d.maxSpirit - d.spirit); d.spirit += gain; b.log.push({ text: `恢复 ${gain} 灵力`, type: 'info' }); }
      }

      if (b.monster.currentHp <= 0) { b.monster.currentHp = 0; b.done = true; b.won = true; this.battleReward(); return; }
      this._processDots();
      if (b.done) return;
      this._monsterAttack();
    }

    battleUsePill() {
      if (!this.battleState || this.battleState.done) return false;
      if (!this.data.pills.hp_pill || this.data.pills.hp_pill <= 0) return false;
      this.data.pills.hp_pill--;
      const heal = Math.floor(this.data.maxHp * 0.3);
      this.data.hp = Math.min(this.data.maxHp, this.data.hp + heal);
      this.battleState.log.push({ text: `使用回春丹，恢复 ${heal} 生命`, type: 'heal' });
      return true;
    }

    battleUseBuff(pillId) {
      if (!this.battleState || this.battleState.done) return false;
      if (!this.data.pills[pillId] || this.data.pills[pillId] <= 0) return false;
      const recipe = RECIPES.find(r => r.id === pillId);
      if (!recipe) return false;
      this.data.pills[pillId]--;
      const eff = recipe.effect;
      if (eff.type === 'buff_atk') { this.battleState.buffAtk = eff.value; this.battleState.log.push({ text: `使用${recipe.name}，攻击力提升！`, type: 'info' }); }
      else if (eff.type === 'buff_def') { this.battleState.buffDef = eff.value; this.battleState.log.push({ text: `使用${recipe.name}，防御力提升！`, type: 'info' }); }
      else if (eff.type === 'buff_crit') { this.battleState.buffCrit = eff.value; this.battleState.log.push({ text: `使用${recipe.name}，暴击率提升！`, type: 'info' }); }
      return true;
    }

    battleFlee() {
      if (!this.battleState || this.battleState.done) return;
      if (Math.random() < 0.6) {
        this.battleState.done = true;
        this.battleState.log.push({ text: '成功逃跑！', type: 'info' });
      } else {
        const b = this.battleState;
        const mDmg = Math.max(1, Math.floor(b.monster.atk - this.data.def * 0.3));
        this.data.hp -= mDmg;
        b.log.push({ text: `逃跑失败！${b.monster.name} 造成 ${mDmg} 点伤害`, type: 'damage' });
        if (this.data.hp <= 0) { this.data.hp = Math.ceil(this.data.maxHp * 0.1); b.done = true; b.won = false; b.log.push({ text: '你被击败了...', type: 'info' }); }
      }
    }

    battleReward() {
      const b = this.battleState;
      const m = b.monster;
      const scale = 1 + this.data.realm * 0.3;
      const exp = Math.floor(m.exp * scale);
      const gold = Math.floor(m.gold * scale);
      this.data.exp += exp; this.data.totalExp += exp; this.data.gold += gold; this.data.totalKills++;
      b.log.push({ text: `获得 ${exp} 修为, ${gold} 灵石`, type: 'reward' });
      const mTemplate = MONSTERS[m.id];
      if (mTemplate.drops) {
        for (const drop of mTemplate.drops) {
          if (Math.random() < drop.rate) {
            const count = randomInt(1, 2);
            this.data.inventory[drop.id] = (this.data.inventory[drop.id] || 0) + count;
            b.log.push({ text: `获得 ${MATERIALS[drop.id].icon} ${MATERIALS[drop.id].name} x${count}`, type: 'reward' });
          }
        }
      }
      this.checkAchievements();
    }

    // --- 炼丹 ---
    canCraft(recipeId) {
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!recipe || this.data.realm < recipe.realmReq) return false;
      for (const mat of recipe.materials) { if ((this.data.inventory[mat.id] || 0) < mat.count) return false; }
      return true;
    }

    craft(recipeId) {
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!this.canCraft(recipeId)) return { success: false, reason: '材料不足或境界不够' };
      for (const mat of recipe.materials) this.data.inventory[mat.id] -= mat.count;
      let rate = recipe.baseRate;
      const sect = SECTS.find(s => s.id === this.data.sect);
      if (sect.alchemyBonus) rate += sect.alchemyBonus;
      rate = Math.min(0.99, rate);
      if (Math.random() < rate) {
        this.data.pills[recipe.id] = (this.data.pills[recipe.id] || 0) + 1;
        if (recipe.effect.type === 'exp') { this.data.exp += recipe.effect.value; this.data.totalExp += recipe.effect.value; }
        this.data.totalCrafts++;
        this.save();
        this.checkAchievements();
        return { success: true, pill: recipe.name };
      }
      this.save();
      return { success: false, reason: '炼丹失败，材料已消耗' };
    }

    // --- 商店 ---
    buy(itemId) {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item || this.data.gold < item.price) return false;
      this.data.gold -= item.price;
      if (item.type === 'material') this.data.inventory[item.id] = (this.data.inventory[item.id] || 0) + 1;
      else if (item.type === 'pill') this.data.pills[item.id] = (this.data.pills[item.id] || 0) + 1;
      this.save();
      return true;
    }

    buyEquip(equipId) {
      const eq = EQUIPMENT.find(e => e.id === equipId);
      if (!eq || this.data.gold < eq.price) return false;
      if (this.data.realm < eq.realmReq) return false;
      if (this.data.ownedEquips.includes(equipId) || Object.values(this.data.equipment).includes(equipId)) return false;
      this.data.gold -= eq.price;
      this.data.ownedEquips.push(equipId);
      this.save();
      return true;
    }

    sell(materialId, count = 1) {
      if ((this.data.inventory[materialId] || 0) < count) return false;
      const prices = { herb: 5, crystal: 25, beast_core: 40, ore: 20 };
      this.data.inventory[materialId] -= count;
      this.data.gold += (prices[materialId] || 5) * count;
      this.save();
      return true;
    }

    // --- 装备 ---
    equip(itemId) {
      const item = EQUIPMENT.find(i => i.id === itemId);
      if (!item) return false;
      const idx = this.data.ownedEquips.indexOf(itemId);
      if (idx === -1) return false;
      const current = this.data.equipment[item.slot];
      if (current) this.data.ownedEquips.push(current);
      this.data.ownedEquips.splice(idx, 1);
      this.data.equipment[item.slot] = itemId;
      this.recalcStats();
      this.save();
      return true;
    }

    unequip(slot) {
      const current = this.data.equipment[slot];
      if (!current) return false;
      this.data.ownedEquips.push(current);
      this.data.equipment[slot] = null;
      this.recalcStats();
      this.save();
      return true;
    }

    // --- 成就 ---
    checkAchievements() {
      if (!this.data) return;
      let newAch = false;
      for (const ach of ACHIEVEMENTS) {
        if (this.data.achievements.includes(ach.id)) continue;
        if (ach.condition(this.data)) {
          this.data.achievements.push(ach.id);
          if (ach.reward.gold) this.data.gold += ach.reward.gold;
          if (ach.reward.exp) { this.data.exp += ach.reward.exp; this.data.totalExp += ach.reward.exp; }
          showToast(`成就达成：${ach.name}！`, 'success');
          newAch = true;
        }
      }
      if (newAch) this.save();
    }

    startAutoSave() {
      this.autoSaveInterval = setInterval(() => this.save(), 30000);
      window.addEventListener('beforeunload', () => this.save());
    }

    startTick(callback) {
      this.tickInterval = setInterval(() => { this.tick(); if (callback) callback(); }, 1000);
    }

    stopTick() {
      if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
    }
  }

  // ==================== CultivationUI类 ====================

  class CultivationUI {
    constructor() {
      this.game = new CultivationGame();
      this.charCreateEl = document.getElementById('char-create');
      this.gameEl = document.getElementById('cult-game');
      this.statusBarEl = document.getElementById('status-bar');
      this.eventPaused = false;

      this.initSettings();
      CultivationGame.migrateOldSave();
      this.renderSlotSelection();
    }

    initSettings() {
      new SettingsModal([
        { key: 'autoMeditate', label: '自动打坐', type: 'checkbox', default: true, checkLabel: '进入游戏时自动开始打坐' }
      ], 'settings_cultivation', () => {});
    }

    // --- 存档选择 ---
    renderSlotSelection() {
      let html = '<h2>踏入仙途</h2><div class="slot-grid">';
      for (let i = 1; i <= 3; i++) {
        const info = CultivationGame.getSlotInfo(i);
        if (info) {
          html += `<div class="save-slot"><div class="slot-info"><div class="slot-name">${info.name}</div><div class="slot-realm">${info.realm}</div><div class="slot-details">${info.sect} | 击杀: ${info.totalKills}</div></div><div class="slot-actions"><button class="btn btn-gold btn-sm" data-enter="${i}">进入</button><button class="btn btn-outline btn-sm" data-delete="${i}" style="color:var(--red);">删除</button></div></div>`;
        } else {
          html += `<div class="save-slot"><div class="slot-info"><div class="slot-empty">空存档</div></div><div class="slot-actions"><button class="btn btn-cyan btn-sm" data-create="${i}">创建角色</button></div></div>`;
        }
      }
      html += '</div>';
      this.charCreateEl.innerHTML = html;
      this.charCreateEl.style.display = '';

      this.charCreateEl.querySelectorAll('[data-enter]').forEach(btn => {
        btn.addEventListener('click', () => {
          const slot = parseInt(btn.dataset.enter);
          if (this.game.load(slot)) this.enterGame();
        });
      });
      this.charCreateEl.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          const slot = parseInt(btn.dataset.delete);
          if (confirm('确定删除此存档？所有进度将丢失！')) {
            Storage.remove('cultivation_save_' + slot);
            this.renderSlotSelection();
          }
        });
      });
      this.charCreateEl.querySelectorAll('[data-create]').forEach(btn => {
        btn.addEventListener('click', () => this.showCharCreate(parseInt(btn.dataset.create)));
      });
    }

    showCharCreate(slot) {
      this.charCreateEl.innerHTML = `
        <div class="back-to-slots" id="back-slots">← 返回存档列表</div>
        <h2>踏入仙途</h2>
        <div class="form-group"><label class="form-label">道号</label><input type="text" class="form-input" id="char-name" placeholder="请输入你的道号" maxlength="12"></div>
        <div class="form-group"><label class="form-label">灵根</label><div class="spirit-root-options" id="spirit-roots"></div></div>
        <div class="form-group"><label class="form-label">门派</label><div class="sect-options" id="sects"></div></div>
        <button class="btn btn-gold btn-lg" style="width:100%;margin-top:16px;" id="btn-create">踏入仙途</button>
      `;

      document.getElementById('back-slots').addEventListener('click', () => this.renderSlotSelection());
      const rootsEl = document.getElementById('spirit-roots');
      const sectsEl = document.getElementById('sects');

      rootsEl.innerHTML = SPIRIT_ROOTS.map(sr => `<div class="spirit-root-option" data-id="${sr.id}"><div class="option-name">${sr.icon} ${sr.name}</div><div class="option-desc">${sr.desc}</div></div>`).join('');
      sectsEl.innerHTML = SECTS.map(s => `<div class="sect-option" data-id="${s.id}"><div class="option-name">${s.icon} ${s.name}</div><div class="option-desc">${s.desc}</div></div>`).join('');

      let selectedRoot = null, selectedSect = null;
      rootsEl.addEventListener('click', e => { const opt = e.target.closest('.spirit-root-option'); if (!opt) return; rootsEl.querySelectorAll('.spirit-root-option').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); selectedRoot = opt.dataset.id; });
      sectsEl.addEventListener('click', e => { const opt = e.target.closest('.sect-option'); if (!opt) return; sectsEl.querySelectorAll('.sect-option').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); selectedSect = opt.dataset.id; });

      document.getElementById('btn-create').addEventListener('click', () => {
        const name = document.getElementById('char-name').value.trim();
        if (!name) { showToast('请输入道号', 'error'); return; }
        if (!selectedRoot) { showToast('请选择灵根', 'error'); return; }
        if (!selectedSect) { showToast('请选择门派', 'error'); return; }
        if (this.game.createCharacter(name, selectedRoot, selectedSect, slot)) {
          this.enterGame();
          showToast(`${name}，欢迎踏入仙途！`, 'success');
        }
      });
    }

    enterGame() {
      this.charCreateEl.style.display = 'none';
      this.gameEl.classList.add('active');
      this.game.startAutoSave();
      this.game.meditating = window._settingsModal?.get('autoMeditate') ?? true;
      this.game.startTick(() => this.onTick());
      this.bindTabs();
      this.renderAll();
    }

    bindTabs() {
      const tabs = document.getElementById('cult-tabs');
      tabs.addEventListener('click', e => {
        const tab = e.target.closest('.cult-tab');
        if (!tab) return;
        tabs.querySelectorAll('.cult-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.cult-panel').forEach(p => p.classList.remove('active'));
        const panel = document.querySelector(`[data-panel="${tab.dataset.tab}"]`);
        if (panel) panel.classList.add('active');
        this.renderPanel(tab.dataset.tab);
      });
    }

    onTick() {
      this.renderStatusBar();
      const activePanel = document.querySelector('.cult-panel.active');
      if (activePanel && activePanel.dataset.panel === 'cultivate') this.renderCultivatePanel();
      // 随机事件
      if (!this.eventPaused && this.game.meditating) {
        const evt = this.game._checkRandomEvent();
        if (evt) this.showEventModal(evt);
      }
    }

    renderAll() { this.renderStatusBar(); this.renderCultivatePanel(); }

    renderPanel(panelId) {
      switch (panelId) {
        case 'cultivate': this.renderCultivatePanel(); break;
        case 'battle': this.renderBattlePanel(); break;
        case 'alchemy': this.renderAlchemyPanel(); break;
        case 'shop': this.renderShopPanel(); break;
        case 'inventory': this.renderInventoryPanel(); break;
        case 'achievement': this.renderAchievementPanel(); break;
      }
    }

    // --- 状态栏 ---
    renderStatusBar() {
      const d = this.game.data;
      if (!d) return;
      const realm = REALMS[d.realm];
      const nextRealm = d.realm < REALMS.length - 1 ? REALMS[d.realm + 1] : null;
      const expPct = nextRealm ? Math.min(100, (d.exp / nextRealm.expReq) * 100) : 100;
      const spiritPct = d.maxSpirit > 0 ? (d.spirit / d.maxSpirit) * 100 : 0;

      this.statusBarEl.innerHTML = `
        <div class="status-item"><div class="status-label">道号</div><div class="status-value">${d.name}</div></div>
        <div class="status-item"><div class="status-label">境界</div><div class="status-value purple">${realm.name}</div></div>
        <div class="status-item"><div class="status-label">生命</div><div class="status-value ${d.hp < d.maxHp * 0.3 ? 'red' : 'cyan'}">${d.hp}/${d.maxHp}</div></div>
        <div class="status-item"><div class="status-label">攻击</div><div class="status-value">${d.atk}</div></div>
        <div class="status-item"><div class="status-label">防御</div><div class="status-value">${d.def}</div></div>
        <div class="status-item"><div class="status-label">灵力</div><div class="status-value blue">${d.spirit}/${d.maxSpirit}</div></div>
        <div class="status-item"><div class="status-label">灵石</div><div class="status-value">${formatNumber(d.gold)}</div></div>
        <div class="exp-bar-wrap">
          <div class="exp-bar-label"><span>修为 ${formatNumber(d.exp)}${nextRealm ? ' / ' + formatNumber(nextRealm.expReq) : ' (已满)'}</span><span>${expPct.toFixed(1)}%</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${expPct}%"></div></div>
        </div>
        <div class="spirit-bar-wrap">
          <div class="spirit-bar-label"><span>灵力 ${d.spirit}/${d.maxSpirit}</span><span>${spiritPct.toFixed(0)}%</span></div>
          <div class="progress-bar spirit-bar"><div class="progress-fill" style="width:${spiritPct}%"></div></div>
        </div>
      `;
    }

    // --- 修炼面板 ---
    renderCultivatePanel() {
      const d = this.game.data;
      const panel = document.getElementById('panel-cultivate');
      const rate = this.game.getExpRate();
      const canBreak = this.game.canBreakthrough();
      const nextRealm = d.realm < REALMS.length - 1 ? REALMS[d.realm + 1] : null;

      panel.innerHTML = `<div class="cultivation-area">
        <div class="meditation-visual ${this.game.meditating ? 'meditating' : ''}">🧘</div>
        <div class="cultivation-info">修炼速度：<strong>${rate} 修为/秒</strong> ${this.game.meditating ? '（修炼中...）' : '（已停止）'}</div>
        <div class="cultivation-actions"><button class="btn ${this.game.meditating ? 'btn-outline' : 'btn-cyan'} btn-sm" id="btn-meditate">${this.game.meditating ? '停止修炼' : '开始修炼'}</button></div>
        ${nextRealm ? `<div class="breakthrough-area"><div class="breakthrough-info">下一境界：<strong>${nextRealm.name}</strong> | 需要修为：${formatNumber(nextRealm.expReq)} | 成功率：${Math.floor((nextRealm.rate || 0.5) * 100)}%${d.pills.break_pill > 0 ? ' (+破境丹20%)' : ''}</div>
        <button class="btn ${canBreak ? 'btn-gold' : 'btn-outline'} btn-sm" id="btn-breakthrough" ${canBreak ? '' : 'disabled'}>${canBreak ? '尝试突破' : '修为不足'}</button></div>` : '<div class="breakthrough-area"><div class="breakthrough-info" style="color:var(--gold)">已达最高境界！</div></div>'}
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color);"><button class="btn btn-outline btn-sm" id="btn-back-slots">返回存档列表</button></div>
      </div>`;

      panel.querySelector('#btn-meditate').addEventListener('click', () => { this.game.meditating = !this.game.meditating; this.renderCultivatePanel(); });
      const breakBtn = panel.querySelector('#btn-breakthrough');
      if (breakBtn && canBreak) {
        breakBtn.addEventListener('click', () => {
          const result = this.game.tryBreakthrough();
          if (result.success) showToast(`突破成功！晋升${result.realm}！`, 'success');
          else showToast(result.reason, 'error');
          this.renderStatusBar(); this.renderCultivatePanel();
        });
      }
      panel.querySelector('#btn-back-slots').addEventListener('click', () => {
        this.game.save(); this.game.stopTick();
        if (this.game.autoSaveInterval) clearInterval(this.game.autoSaveInterval);
        this.gameEl.classList.remove('active');
        this.game.data = null;
        this.renderSlotSelection();
      });
    }

    // --- 战斗面板 ---
    renderBattlePanel() {
      const panel = document.getElementById('panel-battle');
      const d = this.game.data;
      if (this.game.battleState && !this.game.battleState.done) { this.renderBattleField(panel); return; }
      panel.innerHTML = `<div class="battle-zone"><h3 style="color:var(--gold);margin-bottom:16px;">选择秘境</h3><div class="realm-select">${DUNGEONS.map(dg => {
        const locked = d.realm < dg.realmReq;
        return `<div class="realm-card ${locked ? 'locked' : ''}" data-dungeon="${dg.id}"><div class="realm-card-name">${dg.name}</div><div class="realm-card-desc">${dg.desc}</div><div class="realm-card-level">${locked ? `需要${REALMS[dg.realmReq].name}` : '可进入'}</div></div>`;
      }).join('')}</div></div>`;
      panel.querySelectorAll('.realm-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => { const state = this.game.startBattle(card.dataset.dungeon); if (state) this.renderBattleField(panel); });
      });
    }

    renderBattleField(panel) {
      const b = this.game.battleState;
      const d = this.game.data;
      const mHpPct = (b.monster.currentHp / b.monster.maxHp) * 100;
      const pHpPct = (d.hp / d.maxHp) * 100;
      const spiritPct = d.maxSpirit > 0 ? (d.spirit / d.maxSpirit) * 100 : 0;

      // 获取可用技能
      const mySkills = SKILLS.filter(s => s.sect === d.sect && d.realm >= s.realmReq);
      let skillBtns = '';
      if (!b.done) {
        skillBtns = '<div class="battle-skills">' + mySkills.map(s => {
          const cd = b.cooldowns[s.id] || 0;
          const noSpirit = d.spirit < s.spiritCost;
          return `<button class="skill-btn ${cd > 0 || noSpirit ? 'on-cd' : ''}" data-skill="${s.id}" ${cd > 0 || noSpirit ? 'disabled' : ''}>${s.name} (${s.spiritCost}灵)${cd > 0 ? `<span class="cd-text">${cd}回合</span>` : ''}</button>`;
        }).join('') + '</div>';
      }

      panel.innerHTML = `<div class="battle-zone"><div class="battle-field active">
        <div class="battle-entities">
          <div class="battle-entity"><div class="battle-entity-icon">🧘</div><div class="battle-entity-name">${d.name}</div>
            <div class="battle-hp"><div class="battle-hp-text">${d.hp} / ${d.maxHp}</div><div class="battle-hp-bar"><div class="battle-hp-fill ${pHpPct < 30 ? 'low' : ''}" style="width:${pHpPct}%"></div></div></div>
            <div class="battle-spirit-bar"><div class="battle-spirit-fill" style="width:${spiritPct}%"></div></div>
          </div>
          <div class="battle-vs">VS</div>
          <div class="battle-entity"><div class="battle-entity-icon">${b.monster.icon}</div><div class="battle-entity-name">${b.monster.name}</div>
            <div class="battle-hp"><div class="battle-hp-text">${b.monster.currentHp} / ${b.monster.maxHp}</div><div class="battle-hp-bar"><div class="battle-hp-fill ${mHpPct < 30 ? 'low' : ''}" style="width:${mHpPct}%"></div></div></div>
          </div>
        </div>
        ${!b.done ? `<div class="battle-actions">
          <button class="btn btn-gold btn-sm" data-action="attack">攻击</button>
          <button class="btn btn-outline btn-sm" data-action="pill">服丹 (${d.pills.hp_pill || 0})</button>
          <button class="btn btn-outline btn-sm" data-action="flee">逃跑</button>
        </div>${skillBtns}` : `<div class="battle-actions"><button class="btn btn-gold btn-sm" data-action="back">返回秘境</button></div>`}
        <div class="battle-log">${b.log.map(l => `<div class="battle-log-entry ${l.type}">${l.text}</div>`).join('')}</div>
      </div></div>`;

      panel.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          switch (btn.dataset.action) {
            case 'attack': this.game.battleAttack(); break;
            case 'pill': if (!this.game.battleUsePill()) { showToast('没有回春丹了！', 'error'); return; } break;
            case 'flee': this.game.battleFlee(); break;
            case 'back': this.game.battleState = null; this.renderBattlePanel(); return;
          }
          this.renderBattleField(panel); this.renderStatusBar();
        });
      });
      panel.querySelectorAll('[data-skill]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.game.battleUseSkill(btn.dataset.skill);
          this.renderBattleField(panel); this.renderStatusBar();
        });
      });
    }

    // --- 炼丹面板 ---
    renderAlchemyPanel() {
      const panel = document.getElementById('panel-alchemy');
      const d = this.game.data;
      let selectedRecipe = null;

      const renderDetail = () => {
        const detailEl = panel.querySelector('.recipe-detail');
        if (!selectedRecipe) { detailEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">选择一个丹方</p>'; return; }
        const r = selectedRecipe;
        const sect = SECTS.find(s => s.id === d.sect);
        let rate = r.baseRate;
        if (sect.alchemyBonus) rate += sect.alchemyBonus;
        rate = Math.min(0.99, rate);
        detailEl.innerHTML = `<h4>${r.name}</h4><p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">${r.desc}</p>
          <p class="form-label">所需材料：</p><ul class="recipe-materials">${r.materials.map(m => {
            const has = (d.inventory[m.id] || 0) >= m.count;
            return `<li class="${has ? 'has' : 'missing'}">${MATERIALS[m.id].icon} ${MATERIALS[m.id].name} x${m.count} (拥有:${d.inventory[m.id] || 0})</li>`;
          }).join('')}</ul>
          <p class="recipe-success-rate">成功率：${Math.floor(rate * 100)}%</p>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">已拥有：${d.pills[r.id] || 0} 颗</p>
          <button class="btn btn-gold btn-sm" id="btn-craft" ${this.game.canCraft(r.id) ? '' : 'disabled'}>${this.game.canCraft(r.id) ? '炼丹' : '材料不足'}</button>`;
        const craftBtn = detailEl.querySelector('#btn-craft');
        if (craftBtn && this.game.canCraft(r.id)) {
          craftBtn.addEventListener('click', () => {
            const result = this.game.craft(r.id);
            if (result.success) showToast(`成功炼制 ${result.pill}！`, 'success');
            else showToast(result.reason, 'error');
            this.renderAlchemyPanel(); this.renderStatusBar();
          });
        }
      };

      panel.innerHTML = `<div class="alchemy-area"><div class="recipe-list">${RECIPES.map(r => {
        const locked = d.realm < r.realmReq;
        return `<div class="recipe-card ${locked ? 'locked' : ''}" data-recipe="${r.id}"><div class="recipe-name">${r.name} ${locked ? '🔒' : ''}</div><div class="recipe-desc">${r.desc}${locked ? ` (需${REALMS[r.realmReq].name})` : ''}</div></div>`;
      }).join('')}</div><div class="recipe-detail"><p style="color:var(--text-muted);text-align:center;padding:40px 0;">选择一个丹方</p></div></div>`;
      panel.querySelectorAll('.recipe-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => {
          panel.querySelectorAll('.recipe-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedRecipe = RECIPES.find(r => r.id === card.dataset.recipe);
          renderDetail();
        });
      });
    }

    // --- 商店面板 ---
    renderShopPanel() {
      const panel = document.getElementById('panel-shop');
      const d = this.game.data;

      // 消耗品
      let html = `<h3 style="color:var(--gold);margin-bottom:16px;">坊市</h3><p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">灵石：${formatNumber(d.gold)}</p>`;
      html += '<h4 class="shop-section-title">消耗品</h4><div class="shop-grid">';
      for (const item of SHOP_ITEMS) {
        html += `<div class="shop-item" data-item="${item.id}"><div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div><div class="item-desc">${item.desc}</div><div class="item-price">${item.price} 灵石</div></div>`;
      }
      html += '</div>';

      // 装备按品质分组
      const qualities = ['common', 'good', 'rare', 'epic', 'legend'];
      for (const q of qualities) {
        const eqs = EQUIPMENT.filter(e => e.quality === q);
        if (eqs.length === 0) continue;
        html += `<h4 class="shop-section-title">${QUALITY_NAMES[q]}装备</h4><div class="shop-grid">`;
        for (const eq of eqs) {
          const locked = d.realm < eq.realmReq;
          const owned = d.ownedEquips.includes(eq.id) || Object.values(d.equipment).includes(eq.id);
          const stats = [];
          if (eq.atk) stats.push(`攻+${eq.atk}`);
          if (eq.def) stats.push(`防+${eq.def}`);
          if (eq.hp) stats.push(`血+${eq.hp}`);
          html += `<div class="shop-item quality-${q} ${locked ? 'locked' : ''} ${owned ? 'owned' : ''}" data-equip="${eq.id}">
            <span class="quality-label ${q}">${QUALITY_NAMES[q]}</span>
            <div class="item-icon">${eq.icon}</div><div class="item-name">${eq.name}</div>
            <div class="item-stats">${stats.join(' ')}</div>
            <div class="item-desc">${eq.desc}${locked ? ` (需${REALMS[eq.realmReq].name})` : ''}</div>
            <div class="item-price">${owned ? '已拥有' : eq.price + ' 灵石'}</div></div>`;
        }
        html += '</div>';
      }
      panel.innerHTML = html;

      panel.querySelectorAll('[data-item]').forEach(el => {
        el.addEventListener('click', () => {
          if (this.game.buy(el.dataset.item)) { showToast('购买成功！', 'success'); this.renderShopPanel(); this.renderStatusBar(); }
          else showToast('灵石不足！', 'error');
        });
      });
      panel.querySelectorAll('[data-equip]:not(.locked):not(.owned)').forEach(el => {
        el.addEventListener('click', () => {
          if (this.game.buyEquip(el.dataset.equip)) { showToast('购买成功！', 'success'); this.renderShopPanel(); this.renderStatusBar(); }
          else showToast('灵石不足或境界不够！', 'error');
        });
      });
    }

    // --- 背包面板 ---
    renderInventoryPanel() {
      const panel = document.getElementById('panel-inventory');
      const d = this.game.data;

      let equipHTML = '<div class="equipment-area"><div class="equip-slots">';
      for (const slot of EQUIP_SLOTS) {
        const eqId = d.equipment[slot];
        const eq = eqId ? EQUIPMENT.find(i => i.id === eqId) : null;
        equipHTML += `<div class="equip-slot ${eq ? 'equipped' : ''} ${eq ? 'quality-' + eq.quality : ''}" data-slot="${slot}"><div class="equip-slot-icon">${eq ? eq.icon : SLOT_ICONS[slot]}</div><div>${eq ? eq.name : SLOT_NAMES[slot]}</div></div>`;
      }
      equipHTML += '</div><div style="flex:1;"><h4 style="color:var(--gold);margin-bottom:8px;">装备</h4>';
      if (d.ownedEquips.length === 0) {
        equipHTML += '<p style="color:var(--text-muted);font-size:0.85rem;">暂无装备</p>';
      } else {
        equipHTML += '<div class="inventory-grid">';
        d.ownedEquips.forEach((eqId, idx) => {
          const eq = EQUIPMENT.find(i => i.id === eqId);
          if (!eq) return;
          equipHTML += `<div class="inv-item quality-${eq.quality}" data-equip-idx="${idx}" data-equip-id="${eqId}"><span class="quality-label ${eq.quality}">${QUALITY_NAMES[eq.quality]}</span><div class="item-icon">${eq.icon}</div><div class="item-name">${eq.name}</div><div class="item-desc">${eq.desc}</div></div>`;
        });
        equipHTML += '</div>';
      }
      equipHTML += '</div></div>';

      let matHTML = '<h4 style="color:var(--gold);margin:20px 0 8px;">材料</h4><div class="inventory-grid">';
      for (const [id, mat] of Object.entries(MATERIALS)) {
        matHTML += `<div class="inv-item" data-sell="${id}"><div class="item-icon">${mat.icon}</div><div class="item-name">${mat.name}</div><div class="item-count">x${d.inventory[id] || 0}</div></div>`;
      }
      matHTML += '</div>';

      let pillHTML = '<h4 style="color:var(--gold);margin:20px 0 8px;">丹药</h4><div class="inventory-grid">';
      for (const recipe of RECIPES) {
        const count = d.pills[recipe.id] || 0;
        if (count === 0) continue;
        pillHTML += `<div class="inv-item" data-use-pill="${recipe.id}"><div class="item-icon">💊</div><div class="item-name">${recipe.name}</div><div class="item-desc">${recipe.desc}</div><div class="item-count">x${count}</div></div>`;
      }
      pillHTML += '</div>';

      panel.innerHTML = equipHTML + matHTML + pillHTML;

      panel.querySelectorAll('[data-equip-id]').forEach(el => {
        el.addEventListener('click', () => { if (this.game.equip(el.dataset.equipId)) { showToast('装备成功！', 'success'); this.renderInventoryPanel(); this.renderStatusBar(); } });
      });
      panel.querySelectorAll('.equip-slot.equipped').forEach(el => {
        el.addEventListener('click', () => { if (this.game.unequip(el.dataset.slot)) { showToast('已卸下装备', 'info'); this.renderInventoryPanel(); this.renderStatusBar(); } });
      });
      panel.querySelectorAll('[data-sell]').forEach(el => {
        el.addEventListener('click', () => { if (this.game.sell(el.dataset.sell)) { showToast('出售成功', 'success'); this.renderInventoryPanel(); this.renderStatusBar(); } else showToast('没有可出售的', 'error'); });
      });
      panel.querySelectorAll('[data-use-pill]').forEach(el => {
        el.addEventListener('click', () => {
          const pillId = el.dataset.usePill;
          const recipe = RECIPES.find(r => r.id === pillId);
          if (!recipe || !d.pills[pillId] || d.pills[pillId] <= 0) return;
          const eff = recipe.effect;
          if (eff.type === 'heal') { const heal = Math.floor(d.maxHp * eff.value); d.hp = Math.min(d.maxHp, d.hp + heal); d.pills[pillId]--; showToast(`恢复 ${heal} 生命`, 'success'); }
          else if (eff.type === 'exp') { d.exp += eff.value; d.totalExp += eff.value; d.pills[pillId]--; showToast(`获得 ${eff.value} 修为`, 'success'); }
          else if (eff.type === 'restore_spirit') { const gain = Math.floor(d.maxSpirit * eff.value); d.spirit = Math.min(d.maxSpirit, d.spirit + gain); d.pills[pillId]--; showToast(`恢复 ${gain} 灵力`, 'success'); }
          else if (eff.type === 'speed_boost') { this.game.speedBoostEnd = Date.now() + eff.duration * 1000; d.pills[pillId]--; showToast(`修炼速度提升${eff.duration}秒！`, 'success'); }
          else { showToast('此丹药需在战斗中使用', 'info'); return; }
          this.game.save(); this.renderInventoryPanel(); this.renderStatusBar();
        });
      });
    }

    // --- 成就面板 ---
    renderAchievementPanel() {
      const panel = document.getElementById('panel-achievement');
      const d = this.game.data;
      const categories = { battle: '战斗成就', cultivation: '修炼成就', alchemy: '炼丹成就', explore: '探索成就' };
      let html = '';
      for (const [cat, title] of Object.entries(categories)) {
        html += `<h4 class="ach-category-title">${title}</h4><div class="achievement-grid">`;
        for (const ach of ACHIEVEMENTS.filter(a => a.category === cat)) {
          const done = d.achievements.includes(ach.id);
          html += `<div class="achievement-card ${done ? 'completed' : 'locked'}">
            <div class="ach-icon">${ach.icon}</div><div class="ach-name">${ach.name}</div>
            <div class="ach-desc">${ach.desc}</div>
            <div class="ach-reward">奖励: ${ach.reward.gold || 0}灵石 ${ach.reward.exp || 0}修为</div>
            ${done ? '<div class="ach-status">✅ 已达成</div>' : ''}
          </div>`;
        }
        html += '</div>';
      }
      panel.innerHTML = html;
    }

    // --- 随机事件弹窗 ---
    showEventModal(event) {
      this.eventPaused = true;
      this.game.data.totalEvents++;

      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';
      overlay.innerHTML = `<div class="event-modal">
        <div class="event-icon">${event.icon}</div>
        <div class="event-title">${event.name}</div>
        <div class="event-desc">${event.desc}</div>
        <div class="event-choices">${event.options.map((o, i) => `<button class="event-choice-btn" data-choice="${i}">${o.text}</button>`).join('')}</div>
      </div>`;
      document.body.appendChild(overlay);

      overlay.querySelectorAll('[data-choice]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.choice);
          const resultText = event.options[idx].result(this.game);
          const modal = overlay.querySelector('.event-modal');
          const choices = modal.querySelector('.event-choices');
          choices.innerHTML = `<div class="event-result">${resultText}</div><button class="btn btn-gold btn-sm event-close-btn">确定</button>`;
          modal.querySelector('.event-close-btn').addEventListener('click', () => {
            overlay.remove();
            this.eventPaused = false;
            this.game.save();
            this.game.checkAchievements();
            this.renderStatusBar();
          });
        });
      });
    }
  }

  // --- 初始化 ---
  initNav('cultivation');
  initParticles('#particles', 20);
  new CultivationUI();

})();
