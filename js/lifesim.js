/* ========== 仙途模拟器 ========== */

(function () {
  'use strict';

  // ==================== 数据常量 ====================

  const STAGES = [
    { name: '幼年', minAge: 0, maxAge: 6 },
    { name: '少年', minAge: 7, maxAge: 15 },
    { name: '青年', minAge: 16, maxAge: 30 },
    { name: '壮年', minAge: 31, maxAge: 60 },
    { name: '中年', minAge: 61, maxAge: 120 },
    { name: '老年', minAge: 121, maxAge: 999 },
  ];

  const CULTIVATION_REALMS = [
    { name: '凡人', lifespan: 80 },
    { name: '炼气', lifespan: 120 },
    { name: '筑基', lifespan: 200 },
    { name: '金丹', lifespan: 350 },
    { name: '元婴', lifespan: 500 },
    { name: '化神', lifespan: 800 },
    { name: '飞升', lifespan: 9999 },
  ];

  const ATTR_NAMES = { str: '体质', int: '智力', cha: '魅力', luk: '运气', spr: '灵根' };
  const ATTR_DESCS = { str: '影响生命、战斗、抗灾', int: '影响修炼速度、悟道', cha: '影响人际、拜师', luk: '影响奇遇、炼丹、寻宝', spr: '影响能否修仙、修仙速度' };
  const TOTAL_POINTS = 20;
  const MAX_ATTR = 999;

  // 各境界突破所需修为
  const REALM_EXP = [0, 100, 250, 500, 1000, 2000, 0];

  // 传承系统
  const LEGACY_REWARDS = [
    { id: 'extra_point', name: '灵光残留', icon: '✨', desc: '额外1点属性点', cost: 10, repeatable: true },
    { id: 'extra_gold', name: '前世遗财', icon: '💰', desc: '开局+50金币', cost: 5, repeatable: true },
    { id: 'cultivation_boost', name: '修行记忆', icon: '🧠', desc: '修为获取+20%', cost: 20, repeatable: false },
    { id: 'talent_reroll', name: '天道眷顾', icon: '🎲', desc: '可多一次重新投胎', cost: 15, repeatable: false },
    { id: 'starting_realm', name: '先天灵体', icon: '🌟', desc: '开局直接炼气境', cost: 50, repeatable: false },
  ];

  // ==================== 自由行动 ====================

  const FREE_ACTIONS_MORTAL = [
    { id: 'study', icon: '📖', name: '读书', desc: '潜心苦读', effect: g => { g.data.attrs.int += 1; return '你刻苦攻读，学识见长。智力+1'; } },
    { id: 'work', icon: '⚒️', name: '劳作', desc: '辛勤劳作', effect: g => { const gold = randomInt(10, 30); g.data.gold += gold; if (Math.random() < 0.3) { g.data.attrs.str += 1; return `辛勤劳作赚了${gold}金币，体魄也更健壮了。体质+1`; } return `辛勤劳作赚了${gold}金币。`; } },
    { id: 'travel', icon: '🗺️', name: '游历', desc: '四处游历', effect: g => { const r = Math.random(); if (r < 0.3) { g.data.attrs.luk += 1; g.data.gold += 20; return '游历中遇到好事！运气+1，金币+20'; } if (r < 0.6) { g.data.attrs.cha += 1; return '结交了不少有趣的人。魅力+1'; } g.data.attrs.int += 1; return '见闻增长了。智力+1'; } },
    { id: 'socialize', icon: '🤝', name: '交友', desc: '结交朋友', effect: g => { g.data.attrs.cha += 1; if (Math.random() < 0.4) { const name = pick(Math.random() < 0.5 ? NPC_NAMES_MALE : NPC_NAMES_FEMALE); g.addRelationship(name, 'friend', 30); return `结识了${name}。魅力+1`; } return '你广交好友。魅力+1'; } },
    { id: 'rest', icon: '😴', name: '休息', desc: '好好休息', effect: g => { g.data.attrs.str = Math.min(10, g.data.attrs.str + 1); g.data.gold += randomInt(3, 10); return '养精蓄锐。体质+1'; } },
    { id: 'minigame', icon: '🎮', name: '试炼', desc: '挑战试炼小游戏', effect: null, isMinigame: true },
  ];

  const FREE_ACTIONS_CULTIVATOR = [
    { id: 'cultivate', icon: '🧘', name: '修炼', desc: '潜心修炼', effect: g => { const exp = 10 + g.getAttrWithTalent('spr') * 3; if (g.data.realm >= 1 && g.data.realm < 6) g.data.cultivationExp = Math.min((g.data.cultivationExp || 0) + exp, REALM_EXP[g.data.realm]); if (Math.random() < 0.12) { g.data.attrs.spr += 1; return `潜心修炼，获得${exp}修为。灵光一闪！灵根+1`; } return `潜心修炼，获得${exp}修为。`; } },
    { id: 'explore', icon: '🗺️', name: '历练', desc: '外出历练', effect: g => { const roll = Math.random() * 10 + g.getAttrWithTalent('luk'); if (roll >= 12) { const gold = randomInt(30, 80); g.data.gold += gold; g.data.attrs.luk += 1; return `发现宝物！金币+${gold}，运气+1`; } if (roll >= 7) { g.data.gold += randomInt(10, 30); return '小有收获。'; } if (roll >= 4) { g.data.attrs.str += 1; return '与妖兽搏斗，体魄增强。体质+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '遭遇埋伏受伤。体质-1'; } },
    { id: 'trade', icon: '💰', name: '经商', desc: '坊市交易', effect: g => { if (g.data.gold < 20) return '身无分文，无法经商。'; const inv = Math.min(g.data.gold, randomInt(20, 60)); if (Math.random() + g.getAttrWithTalent('int') * 0.05 > 0.55) { const profit = Math.floor(inv * (0.3 + Math.random() * 0.7)); g.data.gold += profit; return `投入${inv}金币，赚了${profit}！`; } const loss = Math.floor(inv * 0.5); g.data.gold -= loss; return `经商亏损。金币-${loss}`; } },
    { id: 'socialize', icon: '🤝', name: '社交', desc: '会友论道', effect: g => { if (g.data.relationships && g.data.relationships.length > 0 && Math.random() < 0.5) { const rel = g.data.relationships[Math.floor(Math.random() * g.data.relationships.length)]; g.modifyAffinity(rel.name, 15); return `与${rel.name}论道，关系更近了。`; } g.data.attrs.cha += 1; const name = pick(Math.random() < 0.5 ? NPC_NAMES_MALE : NPC_NAMES_FEMALE); g.addRelationship(name, 'friend', 30); return `结识道友${name}。魅力+1`; } },
    { id: 'rest', icon: '😴', name: '休息', desc: '闭关调息', effect: g => { g.data.attrs.str = Math.min(10, g.data.attrs.str + 1); const exp = 5 + g.getAttrWithTalent('spr'); if (g.data.realm >= 1 && g.data.realm < 6) g.data.cultivationExp = Math.min((g.data.cultivationExp || 0) + exp, REALM_EXP[g.data.realm]); return `调息恢复。体质+1，修为+${exp}`; } },
    { id: 'minigame', icon: '🎮', name: '试炼', desc: '挑战试炼小游戏', effect: null, isMinigame: true },
    { id: 'dialogue', icon: '💬', name: '对话', desc: '与熟识之人深入交谈', effect: null, isDialogue: true },
  ];

  const FREE_ACTIONS_MORTAL_MAP = Object.fromEntries(FREE_ACTIONS_MORTAL.map(x => [x.id, x]));
  const FREE_ACTIONS_CULTIVATOR_MAP = Object.fromEntries(FREE_ACTIONS_CULTIVATOR.map(x => [x.id, x]));

  // ==================== 事件链 ====================

  const EVENT_CHAINS = [
    { id: 'treasure_map', name: '藏宝图', startCondition: d => d.age >= 16 && d.attrs.luk >= 4, startChance: 0.12, steps: [
      { icon: '🗺️', title: '残破地图', desc: '你在旧货摊上发现了半张泛黄的藏宝图，隐约可见山川标记。', gap: 0, choices: [{ text: '收起地图', effect: g => '你小心收好地图，等待找到另一半。' }, { text: '不感兴趣', effect: g => { g._abandonChain('treasure_map'); return '你随手丢掉了地图。'; } }] },
      { icon: '🧩', title: '地图的另一半', desc: '在一处山洞中，你居然发现了藏宝图的另一半！', gap: 3, choices: [{ text: '拼合地图', effect: g => { g.data.attrs.int += 1; return '两张残图完美拼合！智力+1'; } }, { text: '高价出售', effect: g => { g.data.gold += 80; g._abandonChain('treasure_map'); return '你将地图卖了好价钱。金币+80'; } }] },
      { icon: '🏛️', title: '秘境现世', desc: '按照地图指引，你来到了远古秘境入口。灵气喷涌而出。', gap: 4, choices: [{ text: '深入秘境', effect: g => { const p = g.getAttrWithTalent('str') + g.getAttrWithTalent('luk'); if (p >= 10) { g.data.gold += 200; g.data.attrs.spr += 2; g.data.legendary = true; return '获得远古传承！灵根+2，金币+200'; } if (p >= 6) { g.data.gold += 80; g.data.attrs.spr += 1; return '有些收获。灵根+1，金币+80'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '机关重重，受了伤。体质-1'; } }, { text: '谨慎探索', effect: g => { g.data.gold += 50; g.data.attrs.int += 1; return '安全退出。金币+50，智力+1'; } }] },
    ] },
    { id: 'mysterious_master', name: '神秘传承', startCondition: d => d.realm >= 1 && d.attrs.spr >= 5, startChance: 0.10, steps: [
      { icon: '👤', title: '神秘身影', desc: '修炼时你隐约感应到有人暗中观察你。', gap: 0, choices: [{ text: '追踪', effect: g => { g.data.attrs.spr += 1; return '你追踪到灵气波动的痕迹。灵根+1'; } }, { text: '不理会', effect: g => { g._abandonChain('mysterious_master'); return '你选择不去理会。'; } }] },
      { icon: '🧙', title: '隐世高人', desc: '神秘身影终于现身——一位隐世千年的上古修士。', gap: 4, choices: [{ text: '拜师求教', effect: g => { const name = pick(NPC_NAMES_MALE); g.addRelationship(name, 'master', 80); g.data.attrs.int += 2; g.data.cultivationBonus = (g.data.cultivationBonus || 0) + 1; return `${name}前辈传你秘法！智力+2`; } }, { text: '切磋论道', effect: g => { g.data.attrs.spr += 1; g.data.attrs.int += 1; return '受益匪浅。灵根+1，智力+1'; } }] },
      { icon: '📖', title: '传承之秘', desc: '高人将毕生修行精华凝聚成传承玉简交给你。', gap: 5, choices: [{ text: '接受传承', effect: g => { g.data.attrs.spr += 2; g.data.attrs.int += 1; g.data.legendary = true; const exp = 50 + g.getAttrWithTalent('spr') * 5; if (g.data.realm >= 1 && g.data.realm < 6) g.data.cultivationExp = Math.min((g.data.cultivationExp || 0) + exp, REALM_EXP[g.data.realm]); return `获得上古传承！灵根+2，智力+1，修为+${exp}`; } }, { text: '传于后人', effect: g => { g.data.attrs.cha += 2; g.data.legendary = true; return '美名远扬。魅力+2'; } }] },
    ] },
    { id: 'nemesis', name: '仇敌追杀', startCondition: d => d.realm >= 2 && d.age >= 30, startChance: 0.10, steps: [
      { icon: '🔪', title: '暗中杀机', desc: '你感觉到有人在暗中跟踪你，空气中弥漫着杀意。', gap: 0, choices: [{ text: '布置陷阱', effect: g => { g.data.attrs.int += 1; return '你布置了防御阵法。智力+1'; } }, { text: '主动出击', effect: g => { if (g.getAttrWithTalent('str') >= 6) { g.data.attrs.str += 1; return '击退了跟踪者！体质+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '反被偷袭。体质-1'; } }] },
      { icon: '⚔️', title: '仇敌现身', desc: '跟踪者终于露面——一个怀有深仇大恨的强敌。', gap: 3, choices: [{ text: '正面决战', effect: g => { const p = g.getAttrWithTalent('str') + g.data.realm * 2; if (p >= 12) { g.data.attrs.str += 2; g.data.gold += 100; g.data.rivalDefeated = true; return '击败强敌！体质+2，金币+100'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 2); return '不敌强敌，身受重伤。体质-2'; } }, { text: '以智取胜', effect: g => { if (g.getAttrWithTalent('int') >= 7) { g.data.attrs.int += 1; g.data.gold += 60; g.data.rivalDefeated = true; return '计谋得逞！智力+1，金币+60'; } g.data.gold = Math.max(0, g.data.gold - 50); return '计谋被识破。金币-50'; } }] },
      { icon: '☯️', title: '恩怨了结', desc: '经过生死搏斗，一切终将了结。', gap: 3, choices: [{ text: '斩草除根', effect: g => { g.data.attrs.str += 1; if (Math.random() < 0.3) g.data.demonPath = true; return '彻底解决了隐患。体质+1'; } }, { text: '以德报怨', effect: g => { g.data.attrs.cha += 2; const name = pick(NPC_NAMES_MALE); g.addRelationship(name, 'friend', 50); return `${name}被你感化。魅力+2`; } }] },
    ] },
    { id: 'love_fate', name: '情劫', startCondition: d => d.attrs.cha >= 5 && d.age >= 16 && !d.companion, startChance: 0.10, steps: [
      { icon: '🌸', title: '初遇', desc: '桃花盛开的季节，你遇到了一个让你心动的人。', gap: 0, choices: [{ text: '上前搭话', effect: g => { g.data.attrs.cha += 1; return '对方报以微笑。魅力+1'; } }, { text: '远远观望', effect: g => { g._abandonChain('love_fate'); return '你没有上前。'; } }] },
      { icon: '💕', title: '情愫暗生', desc: '你们频繁相遇，情感日渐深厚。', gap: 3, choices: [{ text: '表白心意', effect: g => { if (g.getAttrWithTalent('cha') >= 6) { const name = pick(NPC_NAMES_FEMALE); g.addRelationship(name, 'companion', 60); return `${name}接受了你！`; } g.data.attrs.cha += 1; return '被婉拒了，但你学会了坦诚。魅力+1'; } }, { text: '慢慢相处', effect: g => { g.data.attrs.cha += 1; return '关系稳步发展。魅力+1'; } }] },
      { icon: '💍', title: '共结连理', desc: '感情经历了考验，到了做出决定的时刻。', gap: 4, choices: [{ text: '结为道侣', effect: g => { const name = pick(NPC_NAMES_FEMALE); g.data.companion = true; if (!g.hasRelationship('companion')) g.addRelationship(name, 'companion', 80); g.data.attrs.cha += 1; g.data.attrs.luk += 1; return `与${name}结为道侣！魅力+1，运气+1`; } }, { text: '斩断情丝', effect: g => { g.data.attrs.spr += 2; g.data.attrs.int += 1; return '忍痛斩断情丝，道心大进。灵根+2，智力+1'; } }] },
    ] },
    { id: 'sect_tournament', name: '宗门大比', startCondition: d => d.inSect && d.realm >= 2, startChance: 0.10, steps: [
      { icon: '📯', title: '大比通告', desc: '宗门发布通告，一年一度的宗门大比即将开始，所有弟子均可参加。', gap: 0, choices: [
        { text: '报名参赛', effect: g => { g.data.attrs.str += 1; return '你报名参赛，开始紧张的备战训练。体质+1'; } },
        { text: '放弃参赛', effect: g => { g._abandonChain('sect_tournament'); return '你选择继续潜心修炼，不参与争斗。'; } }
      ]},
      { icon: '⚔️', title: '初赛激战', desc: '大比初赛开始，你的对手是一位实力相当的同门师兄。', gap: 2, choices: [
        { text: '全力以赴', effect: g => { const power = g.getAttrWithTalent('str') + g.data.realm * 2; if (power >= 10) { g.data.attrs.str += 1; g.data.gold += 80; return '你击败对手，晋级决赛！体质+1，金币+80'; } return '激战落败，止步初赛。'; } },
        { text: '以巧制胜', effect: g => { if (g.getAttrWithTalent('int') >= 6) { g.data.attrs.int += 1; g.data.gold += 80; return '你以智取胜，晋级决赛！智力+1，金币+80'; } return '计谋被识破，遗憾出局。'; } }
      ]},
      { icon: '🏆', title: '巅峰对决', desc: '决赛来临，你的对手是宗门第一天才。全场瞩目。', gap: 3, choices: [
        { text: '放手一搏', effect: g => { const power = g.getAttrWithTalent('str') + g.getAttrWithTalent('spr') + g.data.realm * 2; if (power >= 14) { g.data.attrs.str += 2; g.data.attrs.cha += 2; g.data.gold += 200; g.data.legendary = true; return '你力压群雄夺得魁首！名震宗门！体质+2，魅力+2，金币+200'; } g.data.attrs.str += 1; return '虽然惜败，但你的表现赢得了所有人的尊重。体质+1'; } },
        { text: '认输求教', effect: g => { g.data.attrs.int += 2; g.data.attrs.spr += 1; return '你主动认输并虚心求教，对手指点了你许多。智力+2，灵根+1'; } }
      ]}
    ] },
    { id: 'natural_disaster', name: '天灾降临', startCondition: d => d.age >= 20, startChance: 0.08, steps: [
      { icon: '🌑', title: '天象异变', desc: '天空忽然暗了下来，乌云翻涌，空气中弥漫着不祥的气息。', gap: 0, choices: [
        { text: '观察天象', effect: g => { g.data.attrs.int += 1; return '你仔细观测天象，发现灾变征兆。智力+1'; } },
        { text: '不以为意', effect: g => { return '你没有太在意天象变化。'; } }
      ]},
      { icon: '🌋', title: '天灾爆发', desc: '大地震颤，山河变色！灵气乱流肆虐大地，无数修士受到波及。', gap: 2, choices: [
        { text: '奋力抵抗', effect: g => { if (g.getAttrWithTalent('str') + g.data.realm * 2 >= 8) { g.data.attrs.str += 1; g.data.attrs.spr += 1; return '你在灾变中淬炼己身，反而有所突破！体质+1，灵根+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '灵气乱流重创了你的身体。体质-1'; } },
        { text: '保护他人', effect: g => { g.data.attrs.cha += 2; const name = pick(Math.random() < 0.5 ? NPC_NAMES_MALE : NPC_NAMES_FEMALE); g.addRelationship(name, 'friend', 60); return `你舍己救人，${name}对你感激涕零。魅力+2`; } }
      ]},
      { icon: '🌈', title: '灾后余生', desc: '天灾终于平息，大地满目疮痍，但废墟中隐藏着机遇。', gap: 3, choices: [
        { text: '搜寻宝物', effect: g => { const luck = g.getAttrWithTalent('luk'); if (luck >= 5) { g.data.attrs.spr += 2; g.data.gold += 150; return '你在废墟中发现了远古修士的遗藏！灵根+2，金币+150'; } g.data.gold += 50; return '找到了一些散落的灵石。金币+50'; } },
        { text: '帮助重建', effect: g => { g.data.attrs.cha += 1; g.data.attrs.str += 1; g.data.legendary = true; return '你带领众人重建家园，名声远扬。魅力+1，体质+1'; } }
      ]}
    ] },
    { id: 'chain_sect_disaster', name: '门派劫难', startCondition: d => d.inSect && d.realm >= 3, startChance: 0.15, steps: [
      { icon: '🔥', title: '门派危机', desc: '门派遭到魔修大军围攻，长老们正在组织弟子抵御！', gap: 0, choices: [
        { text: '冲锋陷阵', effect: g => { if(g.getAttrWithTalent('str')>=7){g.data.attrs.str+=2; g.data.gold+=200; return '你英勇杀敌，立下大功！体质+2，金币+200';} g.data.attrs.str=Math.max(1,g.data.attrs.str-1); return '你受了重伤，但保住了性命。体质-1'; } },
        { text: '布阵防御', effect: g => { g.data.attrs.int+=1; g.data.gold+=100; return '你协助布置阵法，有效阻挡了敌人。智力+1，金币+100'; } }
      ]},
      { icon: '⚔️', title: '反攻时刻', desc: '敌人的攻势已被遏制，现在是反攻的时候了。', gap: 3, choices: [
        { text: '率领弟子追击', effect: g => { g.data.attrs.cha+=2; g.data.gold+=300; return '你带领弟子一路追杀，大获全胜！魅力+2，金币+300'; } },
        { text: '留守门派治疗伤员', effect: g => { g.data.attrs.spr+=1; g.data.attrs.cha+=1; return '你的善举赢得了众人尊敬。灵根+1，魅力+1'; } }
      ]},
      { icon: '🎊', title: '劫后重建', desc: '危机解除后，门派需要重建。', gap: 3, choices: [
        { text: '捐献灵石资助重建', effect: g => { if(g.data.gold>=200){g.data.gold-=200; g.data.attrs.cha+=2; g.data.attrs.spr+=1; return '你的慷慨赢得了全门尊敬。魅力+2，灵根+1，金币-200';} return '你囊中羞涩，有心无力。'; } },
        { text: '全力修炼提升实力', effect: g => { g.data.attrs.str+=1; g.data.attrs.spr+=1; return '你刻苦修炼，实力大增。体质+1，灵根+1'; } }
      ]}
    ] },
    { id: 'chain_treasure', name: '寻宝奇缘', startCondition: d => (d.attrs.luk || 0) >= 5, startChance: 0.12, steps: [
      { icon: '🗺️', title: '藏宝图', desc: '你偶然得到了一张古老的藏宝图，上面标注着一处秘境的位置。', gap: 0, choices: [
        { text: '立即前往寻宝', effect: g => { g.data.gold+=50; return '你踏上了寻宝之路，途中捡到了一些灵石。金币+50'; } },
        { text: '先研究地图', effect: g => { g.data.attrs.int+=1; return '你仔细研究了地图上的阵法纹路。智力+1'; } }
      ]},
      { icon: '🏔️', title: '秘境入口', desc: '你找到了秘境入口，但被一道阵法封印着。', gap: 3, choices: [
        { text: '强行破阵', effect: g => { if(g.getAttrWithTalent('spr')>=6){g.data.attrs.spr+=1; return '你凭借深厚灵力破开了阵法！灵根+1';} g.data.attrs.spr=Math.max(1,g.data.attrs.spr-1); return '强行破阵反噬，灵力受损。灵根-1'; } },
        { text: '寻找机关', effect: g => { g.data.attrs.int+=1; return '你细心观察找到了机关开关。智力+1'; } }
      ]},
      { icon: '💎', title: '秘境宝藏', desc: '秘境深处，你发现了一处宝藏！', gap: 3, choices: [
        { text: '取走宝物', effect: g => { const gold=300+Math.floor(Math.random()*200); g.data.gold+=gold; g.data.attrs.luk+=1; return '你获得了大量宝物！金币+'+gold+'，运气+1'; } },
        { text: '参悟壁画中的功法', effect: g => { g.data.attrs.spr+=2; g.data.attrs.int+=1; return '壁画中蕴含的功法让你受益匪浅。灵根+2，智力+1'; } }
      ]}
    ] },
    { id: 'chain_tribulation', name: '天劫降临', startCondition: d => d.realm >= 4, startChance: 0.10, steps: [
      { icon: '⛈️', title: '劫云凝聚', desc: '天空中突然乌云密布，一股恐怖的天威笼罩而下。渡劫！', gap: 0, choices: [
        { text: '正面迎击天劫', effect: g => { g.data.attrs.str+=1; return '你昂首面对天劫，气势如虹。体质+1'; } },
        { text: '寻找掩护', effect: g => { g.data.attrs.int+=1; return '你找到一处天然屏障。智力+1'; } }
      ]},
      { icon: '⚡', title: '雷劫轰击', desc: '九道天雷接连劈下，每一道都比上一道更加猛烈！', gap: 2, choices: [
        { text: '硬抗天雷', effect: g => { if(g.getAttrWithTalent('str')>=8){g.data.attrs.str+=2; g.data.attrs.spr+=1; return '你以肉身硬抗天雷，淬炼了身体！体质+2，灵根+1';} g.data.attrs.str=Math.max(1,g.data.attrs.str-2); return '天雷太强，你遍体鳞伤。体质-2'; } },
        { text: '以法宝抵御', effect: g => { g.data.attrs.spr+=1; return '法宝挡住了大部分天雷。灵根+1'; } }
      ]},
      { icon: '🌈', title: '劫后新生', desc: '天雷散去，彩虹出现。你浑身上下焕然一新。', gap: 2, choices: [
        { text: '趁机感悟天道', effect: g => { g.data.attrs.spr+=2; g.data.attrs.int+=2; return '你在天劫中感悟了天道法则！灵根+2，智力+2'; } },
        { text: '收集残余雷电精华', effect: g => { g.data.gold+=500; g.data.attrs.str+=1; return '雷电精华价值不菲。金币+500，体质+1'; } }
      ]}
    ] },
    { id: 'chain_master_disciple', name: '师徒缘', startCondition: d => d.realm >= 2, startChance: 0.12, steps: [
      { icon: '👴', title: '偶遇高人', desc: '你在修炼时遇到了一位隐居的老修士，他的修为深不可测。', gap: 0, choices: [
        { text: '上前请教', effect: g => { const name=g.data.sex==='male'?'玄清道长':'玄清前辈'; g.addRelationship(name,'master',30); g.data.attrs.int+=1; return '老修士对你颇为欣赏，愿意指点你一二。智力+1'; } },
        { text: '暗中观察', effect: g => { g.data.attrs.int+=1; g.data.attrs.spr+=1; return '你偷学了一些精妙的运功法门。智力+1，灵根+1'; } }
      ]},
      { icon: '📖', title: '传道授业', desc: '老修士开始正式传授你修炼心得。', gap: 4, choices: [
        { text: '勤学苦练', effect: g => { g.data.attrs.spr+=2; g.data.attrs.str+=1; return '你日夜苦修，进步神速。灵根+2，体质+1'; } },
        { text: '举一反三', effect: g => { g.data.attrs.int+=2; g.data.attrs.spr+=1; return '你触类旁通，悟性极高。智力+2，灵根+1'; } }
      ]},
      { icon: '🎓', title: '出师之日', desc: '老修士认为你已经学有所成，可以独闯天下了。', gap: 4, choices: [
        { text: '谢师恩，继续前行', effect: g => { g.data.attrs.spr+=1; g.data.attrs.cha+=1; g.data.gold+=200; return '师父赠你一份厚礼。灵根+1，魅力+1，金币+200'; } },
        { text: '留下来继续深造', effect: g => { g.data.attrs.spr+=2; g.data.attrs.int+=2; return '你选择继续跟随师父。灵根+2，智力+2'; } }
      ]}
    ] },
    // --- 新增事件链 (11-20) ---
    { id: 'chain_alchemy_apprentice', name: '炼丹学徒', startCondition: d => d.attrs.int >= 5 && d.age >= 18, startChance: 0.10, steps: [
      { icon: '⚗️', title: '丹方残篇', desc: '你在旧书摊上发现了一本残缺的古丹方，记载着传说中的"九转还魂丹"。', gap: 0, choices: [
        { text: '买下丹方', effect: g => { if (g.data.gold >= 30) { g.data.gold -= 30; g.data.attrs.int += 1; return '你花了30金币买下丹方，开始研究。智力+1'; } return '你囊中羞涩买不起。'; } },
        { text: '抄录关键内容', effect: g => { g.data.attrs.int += 1; return '你偷偷记下了关键内容。智力+1'; } }
      ]},
      { icon: '🔥', title: '丹炉试炼', desc: '你按照丹方开始尝试炼丹，但火候极难掌控。', gap: 3, choices: [
        { text: '反复尝试', effect: g => { if (g.getAttrWithTalent('int') >= 7) { g.data.attrs.int += 1; g.data.attrs.spr += 1; return '经过无数次失败，你终于掌握了火候！智力+1，灵根+1'; } g.data.gold = Math.max(0, g.data.gold - 40); return '消耗了大量材料仍然失败。金币-40'; } },
        { text: '请教丹师', effect: g => { const name = pick(NPC_NAMES_MALE); g.addRelationship(name, 'master', 30); g.data.attrs.int += 1; return `丹师${name}指点了你炼丹要诀。智力+1`; } }
      ]},
      { icon: '💊', title: '成丹之日', desc: '丹炉中传出异香，一颗晶莹的丹药缓缓成形！', gap: 4, choices: [
        { text: '自己服用', effect: g => { g.data.attrs.spr += 2; g.data.attrs.str += 1; g.data.legendary = true; return '丹药入腹，灵力暴涨！灵根+2，体质+1'; } },
        { text: '高价出售', effect: g => { g.data.gold += 500; g.data.attrs.cha += 1; return '以天价售出！金币+500，魅力+1'; } }
      ]}
    ] },
    { id: 'chain_merchant_empire', name: '商业帝国', startCondition: d => d.attrs.cha >= 4 && d.gold >= 100, startChance: 0.10, steps: [
      { icon: '🏪', title: '商机初现', desc: '你发现两座城镇之间灵材价差极大，这是一个绝佳的商机。', gap: 0, choices: [
        { text: '开始倒卖', effect: g => { g.data.gold += 60; g.data.attrs.cha += 1; return '第一笔生意大赚！金币+60，魅力+1'; } },
        { text: '暂时观望', effect: g => { g.data.attrs.int += 1; return '你仔细分析了市场。智力+1'; } }
      ]},
      { icon: '🏦', title: '商会崛起', desc: '你的生意越做越大，有人邀请你加入灵材商会。', gap: 3, choices: [
        { text: '加入商会', effect: g => { g.data.gold += 150; g.data.attrs.cha += 1; const name = pick(NPC_NAMES_MALE); g.addRelationship(name, 'friend', 50); return `结识商会会长${name}。金币+150，魅力+1`; } },
        { text: '自立门户', effect: g => { if (g.getAttrWithTalent('cha') >= 6) { g.data.gold += 250; return '你的商号名震一方！金币+250'; } g.data.gold += 80; return '独自经营稍有盈利。金币+80'; } }
      ]},
      { icon: '👑', title: '商界称雄', desc: '你已成为此地最大的灵材供应商，无人不知。', gap: 4, choices: [
        { text: '继续扩张', effect: g => { g.data.gold += 400; g.data.attrs.cha += 2; g.data.legendary = true; return '商业帝国建成！金币+400，魅力+2'; } },
        { text: '急流勇退，专心修炼', effect: g => { g.data.gold += 200; g.data.attrs.spr += 2; return '散尽家财换得清净。金币+200，灵根+2'; } }
      ]}
    ] },
    { id: 'chain_lost_sibling', name: '失散手足', startCondition: d => d.age >= 20 && d.realm >= 1, startChance: 0.08, steps: [
      { icon: '📜', title: '身世之谜', desc: '你在整理遗物时发现了一封旧信，暗示你有一个失散多年的兄弟/姐妹。', gap: 0, choices: [
        { text: '开始寻找', effect: g => { g.data.attrs.int += 1; return '你决定踏上寻亲之路。智力+1'; } },
        { text: '不去追寻', effect: g => { g._abandonChain('chain_lost_sibling'); return '你选择不去打扰过去。'; } }
      ]},
      { icon: '🔍', title: '线索浮现', desc: '经过多方打听，你终于得到了手足的下落——对方竟也是修仙者！', gap: 4, choices: [
        { text: '前去相认', effect: g => { g.data.attrs.cha += 1; return '你踏上了相认之路。魅力+1'; } },
        { text: '先暗中观察', effect: g => { g.data.attrs.int += 1; return '你远远观察了对方的生活。智力+1'; } }
      ]},
      { icon: '🤝', title: '手足重逢', desc: '你们终于相认，对方修为不凡，愿与你并肩作战。', gap: 3, choices: [
        { text: '结伴修行', effect: g => { const name = pick(g.data.sex === 'male' ? NPC_NAMES_FEMALE : NPC_NAMES_MALE); g.addRelationship(name, 'friend', 80); g.data.attrs.str += 1; g.data.attrs.spr += 1; return `与${name}并肩修行！体质+1，灵根+1`; } },
        { text: '各自前行', effect: g => { g.data.attrs.luk += 2; g.data.gold += 100; return '对方赠你一件传家宝。运气+2，金币+100'; } }
      ]}
    ] },
    { id: 'chain_demon_invasion', name: '魔族入侵', startCondition: d => d.realm >= 3 && d.age >= 30, startChance: 0.08, steps: [
      { icon: '👿', title: '魔气弥漫', desc: '远方天际泛起紫黑色的光芒，魔族大军正在逼近此地！', gap: 0, choices: [
        { text: '召集众人防御', effect: g => { g.data.attrs.cha += 1; g.data.attrs.str += 1; return '你挺身而出号召众人。魅力+1，体质+1'; } },
        { text: '独自修炼备战', effect: g => { g.data.attrs.spr += 1; return '你闭关突击修炼。灵根+1'; } }
      ]},
      { icon: '⚔️', title: '激战魔军', desc: '魔族先锋已至！黑压压的魔兵铺天盖地而来。', gap: 2, choices: [
        { text: '正面迎战', effect: g => { const p = g.getAttrWithTalent('str') + g.data.realm * 2; if (p >= 12) { g.data.attrs.str += 2; g.data.gold += 200; return '你斩杀魔将！威震四方！体质+2，金币+200'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '魔将太强，你受了伤。体质-1'; } },
        { text: '用阵法削弱敌军', effect: g => { if (g.getAttrWithTalent('int') >= 7) { g.data.attrs.int += 2; g.data.gold += 150; return '阵法奏效！大量魔兵被困杀！智力+2，金币+150'; } g.data.attrs.int += 1; return '阵法有一定效果。智力+1'; } }
      ]},
      { icon: '🌅', title: '魔退黎明', desc: '经过血战，魔族大军终于退去。大地恢复安宁。', gap: 3, choices: [
        { text: '收集魔族遗物', effect: g => { g.data.gold += 300; g.data.attrs.str += 1; return '魔族遗物价值连城！金币+300，体质+1'; } },
        { text: '救治伤员', effect: g => { g.data.attrs.cha += 2; g.data.attrs.spr += 1; g.data.legendary = true; return '你的善举被世人传颂。魅力+2，灵根+1'; } }
      ]}
    ] },
    { id: 'chain_ancient_ruins', name: '古遗迹探险', startCondition: d => d.attrs.int >= 5 && d.attrs.luk >= 3, startChance: 0.10, steps: [
      { icon: '🏚️', title: '遗迹发现', desc: '地震后一座远古遗迹从地底浮出，灵气喷薄而出。', gap: 0, choices: [
        { text: '第一时间前往', effect: g => { g.data.attrs.str += 1; return '你率先抵达遗迹入口。体质+1'; } },
        { text: '准备充分再去', effect: g => { g.data.attrs.int += 1; return '你收集了遗迹的相关情报。智力+1'; } }
      ]},
      { icon: '🗿', title: '远古机关', desc: '遗迹内部布满了精妙的远古机关，稍有不慎就会触发致命陷阱。', gap: 3, choices: [
        { text: '小心翼翼前进', effect: g => { if (g.getAttrWithTalent('int') >= 6) { g.data.attrs.int += 1; g.data.gold += 100; return '你巧妙避开了所有机关！智力+1，金币+100'; } return '你触发了一个机关，险些丧命。'; } },
        { text: '强力破除机关', effect: g => { if (g.getAttrWithTalent('str') >= 7) { g.data.attrs.str += 1; return '你以蛮力破坏了机关！体质+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '机关反击，你受了伤。体质-1'; } }
      ]},
      { icon: '📜', title: '远古传承', desc: '遗迹最深处有一座石台，上面刻满了远古文字和法阵。', gap: 3, choices: [
        { text: '参悟远古法阵', effect: g => { g.data.attrs.spr += 2; g.data.attrs.int += 1; g.data.legendary = true; return '你领悟了远古功法！灵根+2，智力+1'; } },
        { text: '搬走石台上的宝物', effect: g => { g.data.gold += 400; g.data.attrs.luk += 1; return '远古宝物价值惊人！金币+400，运气+1'; } }
      ]}
    ] },
    { id: 'chain_divine_weapon', name: '神器觉醒', startCondition: d => d.realm >= 3 && d.attrs.str >= 6, startChance: 0.08, steps: [
      { icon: '🗡️', title: '神器感应', desc: '你修炼时，突然感应到远方有一股强大的器灵在呼唤你。', gap: 0, choices: [
        { text: '循着感应前往', effect: g => { g.data.attrs.spr += 1; return '你追踪器灵的呼唤。灵根+1'; } },
        { text: '暂时忽略', effect: g => { g._abandonChain('chain_divine_weapon'); return '你忽略了这股感应。'; } }
      ]},
      { icon: '⚒️', title: '器灵考验', desc: '你找到了一把插在巨石中的古剑，但器灵拒绝认主，要考验你。', gap: 3, choices: [
        { text: '以力拔剑', effect: g => { if (g.getAttrWithTalent('str') >= 8) { g.data.attrs.str += 2; return '你轰碎巨石，古剑出世！体质+2'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '力竭而退。体质-1'; } },
        { text: '以心意沟通', effect: g => { if (g.getAttrWithTalent('spr') >= 6) { g.data.attrs.spr += 2; return '器灵被你的诚意打动。灵根+2'; } g.data.attrs.spr += 1; return '器灵似乎有所动摇。灵根+1'; } }
      ]},
      { icon: '✨', title: '神器认主', desc: '古剑终于认你为主，剑身绽放出万道金光！', gap: 4, choices: [
        { text: '与神器融合', effect: g => { g.data.attrs.str += 2; g.data.attrs.spr += 1; g.data.legendary = true; return '人剑合一！体质+2，灵根+1'; } },
        { text: '用神器换取修为', effect: g => { const exp = 100 + g.getAttrWithTalent('spr') * 10; if (g.data.realm >= 1 && g.data.realm < 6) g.data.cultivationExp = Math.min((g.data.cultivationExp || 0) + exp, REALM_EXP[g.data.realm]); g.data.attrs.int += 2; return `以神器为引，顿悟天道！智力+2，修为+${exp}`; } }
      ]}
    ] },
    { id: 'chain_dragon_pact', name: '龙族契约', startCondition: d => d.realm >= 4 && d.attrs.spr >= 7, startChance: 0.07, steps: [
      { icon: '🐉', title: '龙吟之声', desc: '深夜修炼时，你听到了来自深渊的龙吟，那是上古龙族的呼唤。', gap: 0, choices: [
        { text: '循声前往', effect: g => { g.data.attrs.spr += 1; return '你来到了一处隐秘的龙穴。灵根+1'; } },
        { text: '封闭心神', effect: g => { g._abandonChain('chain_dragon_pact'); g.data.attrs.int += 1; return '你拒绝了龙族的呼唤。智力+1'; } }
      ]},
      { icon: '🔮', title: '龙之试炼', desc: '一条受伤的古龙盘踞在洞穴深处，它要求你完成三个试炼才能获得它的认可。', gap: 3, choices: [
        { text: '接受试炼', effect: g => { const total = g.getAttrWithTalent('str') + g.getAttrWithTalent('spr') + g.getAttrWithTalent('int'); if (total >= 18) { g.data.attrs.str += 1; g.data.attrs.spr += 1; g.data.attrs.int += 1; return '三关全过！体质+1，灵根+1，智力+1'; } if (total >= 12) { g.data.attrs.spr += 1; return '通过两关。灵根+1'; } return '试炼太难，只勉强过了一关。'; } },
        { text: '为古龙疗伤', effect: g => { g.data.attrs.spr += 2; return '你用灵力为古龙疗伤。灵根+2'; } }
      ]},
      { icon: '🐲', title: '龙血契约', desc: '古龙将一滴龙血赐予你，这是至高无上的荣誉。', gap: 4, choices: [
        { text: '吸收龙血', effect: g => { g.data.attrs.str += 2; g.data.attrs.spr += 2; g.data.legendary = true; return '龙血入体！体质+2，灵根+2'; } },
        { text: '与古龙结为契约伙伴', effect: g => { g.data.attrs.cha += 2; g.data.attrs.luk += 2; g.data.legendary = true; const name = '苍龙'; g.addRelationship(name, 'friend', 90); return `与${name}结为契约！魅力+2，运气+2`; } }
      ]}
    ] },
    { id: 'chain_time_anomaly', name: '时间异变', startCondition: d => d.realm >= 3 && d.attrs.int >= 6, startChance: 0.08, steps: [
      { icon: '⏳', title: '时空裂隙', desc: '空间突然出现一道裂缝，你看到了一个截然不同的世界。', gap: 0, choices: [
        { text: '走进裂隙', effect: g => { g.data.attrs.int += 1; g.data.attrs.spr += 1; return '你进入了时间夹缝。智力+1，灵根+1'; } },
        { text: '远离裂隙', effect: g => { g._abandonChain('chain_time_anomaly'); return '你谨慎地远离了裂隙。'; } }
      ]},
      { icon: '🕰️', title: '时间回溯', desc: '在时间夹缝中，你看到了自己的过去和可能的未来，这是一次难得的悟道机会。', gap: 3, choices: [
        { text: '观照前尘', effect: g => { g.data.attrs.int += 2; return '你从过去的经历中获得了新的领悟。智力+2'; } },
        { text: '窥探未来', effect: g => { if (g.getAttrWithTalent('spr') >= 7) { g.data.attrs.spr += 2; g.data.attrs.luk += 1; return '你窥见了一丝天机！灵根+2，运气+1'; } g.data.attrs.spr += 1; return '未来模糊不清。灵根+1'; } }
      ]},
      { icon: '🌀', title: '时间法则', desc: '你开始领悟时间法则的奥义，这是至高无上的修炼。', gap: 4, choices: [
        { text: '领悟时间法则', effect: g => { g.data.attrs.spr += 2; g.data.attrs.int += 2; g.data.legendary = true; const exp = 80 + g.getAttrWithTalent('spr') * 8; if (g.data.realm >= 1 && g.data.realm < 6) g.data.cultivationExp = Math.min((g.data.cultivationExp || 0) + exp, REALM_EXP[g.data.realm]); return `顿悟时间法则！灵根+2，智力+2，修为+${exp}`; } },
        { text: '带走时间碎片', effect: g => { g.data.gold += 500; g.data.attrs.luk += 2; return '时间碎片蕴含惊人灵力。金币+500，运气+2'; } }
      ]}
    ] },
    { id: 'chain_plague', name: '灵瘟蔓延', startCondition: d => d.age >= 25 && d.realm >= 2, startChance: 0.09, steps: [
      { icon: '🦠', title: '怪病蔓延', desc: '附近村镇突然爆发一种怪病，修士的灵力被不断侵蚀。', gap: 0, choices: [
        { text: '前去调查', effect: g => { g.data.attrs.int += 1; return '你决定查明真相。智力+1'; } },
        { text: '闭关自保', effect: g => { g._abandonChain('chain_plague'); g.data.attrs.spr += 1; return '你选择自保。灵根+1'; } }
      ]},
      { icon: '🔬', title: '追查病源', desc: '你发现病源是一株被魔气污染的远古灵草，它的毒素正在通过地脉扩散。', gap: 3, choices: [
        { text: '拔除灵草', effect: g => { if (g.getAttrWithTalent('str') >= 6) { g.data.attrs.str += 1; g.data.attrs.cha += 1; return '你成功拔除了毒源！体质+1，魅力+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '毒气反噬，你也被感染了。体质-1'; } },
        { text: '研制解药', effect: g => { if (g.getAttrWithTalent('int') >= 7) { g.data.attrs.int += 2; return '你成功研制出解药！智力+2'; } g.data.attrs.int += 1; return '解药部分有效。智力+1'; } }
      ]},
      { icon: '🌿', title: '瘟疫终结', desc: '在你的努力下，灵瘟终于被遏制。', gap: 3, choices: [
        { text: '免费救治村民', effect: g => { g.data.attrs.cha += 3; g.data.legendary = true; return '你被尊为"活神仙"！魅力+3'; } },
        { text: '将解药配方出售', effect: g => { g.data.gold += 400; g.data.attrs.int += 1; return '解药配方价值千金。金币+400，智力+1'; } }
      ]}
    ] },
    { id: 'chain_hidden_realm', name: '隐秘空间', startCondition: d => d.realm >= 2 && d.attrs.spr >= 5, startChance: 0.10, steps: [
      { icon: '🌌', title: '虚空之门', desc: '修炼入定时，你的神识触碰到了一处隐秘的空间通道。', gap: 0, choices: [
        { text: '神识探入', effect: g => { g.data.attrs.spr += 1; return '你小心翼翼地探索这个空间。灵根+1'; } },
        { text: '立即退出', effect: g => { g._abandonChain('chain_hidden_realm'); return '你谨慎地收回了神识。'; } }
      ]},
      { icon: '🏝️', title: '洞天福地', desc: '这是一处远古大能开辟的洞天，里面灵气浓郁到凝成液态。', gap: 3, choices: [
        { text: '在此修炼', effect: g => { const exp = 60 + g.getAttrWithTalent('spr') * 5; if (g.data.realm >= 1 && g.data.realm < 6) g.data.cultivationExp = Math.min((g.data.cultivationExp || 0) + exp, REALM_EXP[g.data.realm]); g.data.attrs.spr += 1; return `灵气充沛，修炼事半功倍！灵根+1，修为+${exp}`; } },
        { text: '采集灵液', effect: g => { g.data.gold += 200; g.data.attrs.luk += 1; return '灵液极为珍贵。金币+200，运气+1'; } }
      ]},
      { icon: '🏛️', title: '洞天之主', desc: '洞天深处有一道残留的神识，那是此洞天的原主人。', gap: 4, choices: [
        { text: '接受传承', effect: g => { g.data.attrs.spr += 2; g.data.attrs.int += 2; g.data.legendary = true; return '远古大能的传承融入你的体内！灵根+2，智力+2'; } },
        { text: '继承洞天', effect: g => { g.data.gold += 300; g.data.attrs.spr += 1; g.data.attrs.str += 1; return '你成为了这处洞天的新主人！金币+300，灵根+1，体质+1'; } }
      ]}
    ] },
  ];

  // ==================== 门派系统 ====================

  const SECTS = [
    { id: 'sword', name: '剑宗', icon: '⚔️', desc: '以剑入道，战力超群', bonus: 'str', bonusVal: 1, expMod: 0 },
    { id: 'alchemy', name: '丹宗', icon: '⚗️', desc: '炼丹制药，修为增速', bonus: 'int', bonusVal: 1, expMod: 0.2 },
    { id: 'talisman', name: '符宗', icon: '📿', desc: '制符画阵，灵根精纯', bonus: 'spr', bonusVal: 1, expMod: 0.1 },
    { id: 'body', name: '体宗', icon: '💪', desc: '以体为炉，刚猛无匹', bonus: 'str', bonusVal: 2, expMod: -0.1 },
  ];

  // ==================== 物品系统 ====================

  const GAME_ITEMS = [
    { id: 'heal_pill', name: '回春丹', icon: '💊', desc: '体质+1', useEffect: g => { g.data.attrs.str = Math.min(10, g.data.attrs.str + 1); return '服用回春丹，体质+1'; } },
    { id: 'spirit_pill', name: '聚灵丹', icon: '🔮', desc: '修为+30', useEffect: g => { if (g.data.realm >= 1 && g.data.realm < 6) { g.data.cultivationExp = Math.min((g.data.cultivationExp || 0) + 30, REALM_EXP[g.data.realm]); return '服用聚灵丹，修为+30'; } return '你还无法修炼。'; } },
    { id: 'break_pill', name: '破境丹', icon: '⭐', desc: '下次突破绿区+15%', useEffect: g => { g.data.breakPillActive = true; return '药力将在下次突破时生效。'; } },
    { id: 'shield_charm', name: '护身符', icon: '🛡️', desc: '免疫一次属性损失', useEffect: g => { g.data.shieldActive = true; return '护身符已激活。'; } },
    { id: 'spirit_stone', name: '灵石', icon: '💎', desc: '出售获得50金币', useEffect: g => { g.data.gold += 50; return '出售灵石，金币+50'; } },
  ];

  // ==================== 挑战模式 ====================

  const CHALLENGE_MODES = [
    { id: null, name: '普通模式', icon: '📖', desc: '标准游戏体验' },
    { id: 'mortal', name: '凡人挑战', icon: '👴', desc: '无法修仙，以凡人度过一生' },
    { id: 'speedrun', name: '速通挑战', icon: '⚡', desc: '50岁前未飞升则失败' },
    { id: 'ironman', name: '铁人模式', icon: '💀', desc: '负面事件更加频繁' },
  ];

  // ==================== NG+轮回加成 ====================

  const NG_PLUS_PERKS = [
    { id: 'ng_exp', name: '悟道残留', icon: '📖', desc: '修为获取+20%/层', maxLevel: 5, cost: [15, 25, 40, 60, 80] },
    { id: 'ng_gold', name: '前世财运', icon: '💰', desc: '金币获取+15%/层', maxLevel: 5, cost: [10, 20, 35, 50, 70] },
    { id: 'ng_attr', name: '轮回淬炼', icon: '💪', desc: '全属性+1/层', maxLevel: 3, cost: [30, 60, 100] },
    { id: 'ng_life', name: '寿命延长', icon: '⏳', desc: '寿命+10%/层', maxLevel: 3, cost: [25, 50, 80] },
    { id: 'ng_talent', name: '天赋觉醒', icon: '✨', desc: '额外天赋+1/层', maxLevel: 2, cost: [40, 80] },
  ];

  // ==================== 道途分支 ====================

  const DAO_PATHS = [
    { id: 'righteous', name: '正道', icon: '☀️', desc: '护持苍生，魅力+2，突破+10%', bonus: { cha: 2 }, breakBonus: 0.10 },
    { id: 'demonic', name: '魔道', icon: '🌑', desc: '弱肉强食，体质+2，修为+30%', bonus: { str: 2 }, expMul: 1.30 },
    { id: 'buddhist', name: '佛道', icon: '☸️', desc: '慈悲为怀，智力+2，寿命+20%', bonus: { int: 2 }, lifespanBonus: 0.20 },
  ];

  // ==================== 血脉系统 ====================

  const BLOODLINES = [
    { id: 'human', name: '凡人血脉', icon: '👤', desc: '无特殊效果', bonus: {} },
    { id: 'dragon', name: '龙血', icon: '🐲', desc: '体质+2，突破+10%', bonus: { str: 2 }, breakBonus: 0.10, rare: true },
    { id: 'phoenix', name: '凤血', icon: '🔥', desc: '灵根+2，寿命+15%', bonus: { spr: 2 }, lifespanBonus: 0.15, rare: true },
    { id: 'qilin', name: '麒麟血', icon: '🦌', desc: '运气+2，金币+25%', bonus: { luk: 2 }, goldBonus: 0.25, rare: true },
    { id: 'spirit', name: '灵血', icon: '🌟', desc: '全属性+1', bonus: { str: 1, int: 1, cha: 1, luk: 1, spr: 1 }, rare: true },
  ];

  // ==================== 世界纪元 ====================

  const WORLD_ERAS = [
    { id: 'normal', name: '普通纪元', icon: '🌤️', desc: '一切如常', effect: {} },
    { id: 'spirit_tide', name: '灵气复苏', icon: '🌊', desc: '修为获取×1.5', effect: { expMul: 1.5 } },
    { id: 'dark_age', name: '末法时代', icon: '🌑', desc: '修为获取×0.6，但金币+50%', effect: { expMul: 0.6, goldMul: 1.5 } },
    { id: 'war_age', name: '仙魔大战', icon: '⚔️', desc: '战斗事件更多，奖励翻倍', effect: { battleChance: true, rewardMul: 2.0 } },
    { id: 'golden_age', name: '太平盛世', icon: '🌸', desc: '金币+50%，寿命+10%', effect: { goldMul: 1.5, lifespanBonus: 0.10 } },
  ];

  // ==================== 天赋系统 ====================

  const TALENTS = [
    { id: 'innate_body', name: '先天道体', icon: '🌟', desc: '灵根检定+2', effect: { spr: 2 } },
    { id: 'defy_fate', name: '逆天改命', icon: '🔄', desc: '突破成功率+15%', effect: { breakBonus: 0.15 } },
    { id: 'poison_immune', name: '万毒不侵', icon: '🛡️', desc: '免疫负面健康事件', effect: { immuneNegHealth: true } },
    { id: 'divine_str', name: '天生神力', icon: '💪', desc: '体质+2', effect: { str: 2 } },
    { id: 'golden_touch', name: '点石成金', icon: '💰', desc: '金币获取+50%', effect: { goldBonus: 0.5 } },
    { id: 'lucky_star', name: '鸿运当头', icon: '🍀', desc: '运气+3', effect: { luk: 3 } },
    { id: 'undying', name: '不死之身', icon: '♾️', desc: '寿命+30%', effect: { lifespanBonus: 0.3 } },
    { id: 'past_life', name: '轮回记忆', icon: '🧠', desc: '初始属性点+2', effect: { extraPoints: 2 } },
    { id: 'gifted', name: '天赋异禀', icon: '✨', desc: '全属性+1', effect: { allAttr: 1 } },
    { id: 'charm_aura', name: '天生魅体', icon: '💖', desc: '魅力+3', effect: { cha: 3 } },
    { id: 'scholar_mind', name: '过目不忘', icon: '📖', desc: '智力+2', effect: { int: 2 } },
    { id: 'battle_instinct', name: '战斗本能', icon: '⚔️', desc: '战斗事件成功率提升', effect: { battleBonus: true } },
    { id: 'merchant_eye', name: '商贾之眼', icon: '🏪', desc: '交易获利翻倍', effect: { tradeBonus: true } },
    { id: 'spirit_sense', name: '灵觉天成', icon: '👁️', desc: '秘境奇遇概率提升', effect: { exploreBonus: true } },
    { id: 'dao_heart', name: '道心坚定', icon: '🧘', desc: '免疫走火入魔', effect: { immuneMadness: true } },
  ];

  // ==================== O(1) 查找表 ====================

  const TALENTS_MAP = Object.fromEntries(TALENTS.map(x => [x.id, x]));
  const LEGACY_REWARDS_MAP = Object.fromEntries(LEGACY_REWARDS.map(x => [x.id, x]));
  const NG_PLUS_PERKS_MAP = Object.fromEntries(NG_PLUS_PERKS.map(x => [x.id, x]));
  const EVENT_CHAINS_MAP = Object.fromEntries(EVENT_CHAINS.map(x => [x.id, x]));
  const GAME_ITEMS_MAP = Object.fromEntries(GAME_ITEMS.map(x => [x.id, x]));
  const SECTS_MAP = Object.fromEntries(SECTS.map(x => [x.id, x]));
  const BLOODLINES_MAP = Object.fromEntries(BLOODLINES.map(x => [x.id, x]));
  const WORLD_ERAS_MAP = Object.fromEntries(WORLD_ERAS.map(x => [x.id, x]));
  const DAO_PATHS_MAP = Object.fromEntries(DAO_PATHS.map(x => [x.id, x]));
  const CHALLENGE_MODES_MAP = Object.fromEntries(CHALLENGE_MODES.filter(x => x.id).map(x => [x.id, x]));

  // ==================== 人际关系系统 ====================

  const NPC_NAMES_MALE = ['云天河', '李慕白', '张无忌', '萧远山', '林平之', '段誉', '杨过', '令狐冲', '乔峰', '虚竹', '韦小宝', '郭靖'];
  const NPC_NAMES_FEMALE = ['赵灵儿', '林月如', '周芷若', '王语嫣', '黄蓉', '小龙女', '任盈盈', '阿紫', '慕容紫英', '花千骨', '白素贞', '碧瑶'];

  const RELATIONSHIP_TYPES = {
    master: { name: '师父', icon: '🧙', maxAffinity: 100 },
    companion: { name: '道侣', icon: '💕', maxAffinity: 100 },
    rival: { name: '宿敌', icon: '⚔️', maxAffinity: -100 },
    disciple: { name: '徒弟', icon: '👨‍🎓', maxAffinity: 100 },
    friend: { name: '好友', icon: '🤝', maxAffinity: 100 },
  };

  // ===== NPC对话树系统 (Phase 5F) =====
  const NPC_DIALOGUES = {
    master: [
      { minAffinity: 0, topic: '修炼指导', lines: ['师父捻须道："修行如逆水行舟，不进则退。"', '你认真聆听教诲。'], choices: [
        { text: '请求传授功法', effect: g => { g.data.cultivationExp += 15; return '师父传你一段口诀。修为+15'; } },
        { text: '请教处世之道', effect: g => { g.data.attrs.int += 1; return '师父的智慧令你受益匪浅。智力+1'; } },
      ]},
      { minAffinity: 40, topic: '师门往事', lines: ['师父难得感慨："当年我也曾像你一样年轻气盛..."', '你听到了许多不为人知的往事。'], choices: [
        { text: '感谢师父信任', effect: g => { g.modifyAffinity(g._dialogTarget, 10); return '你与师父的关系更近了。好感+10'; } },
        { text: '追问更多细节', effect: g => { g.data.attrs.int += 1; g.modifyAffinity(g._dialogTarget, 5); return '师父欣赏你的求知欲。智力+1'; } },
      ]},
      { minAffinity: 70, topic: '传承大道', lines: ['师父郑重道："我有一门压箱底的绝学..."', '这是师父一生的心血结晶。'], choices: [
        { text: '跪地拜谢', effect: g => { g.data.attrs.spr += 2; g.data.cultivationExp += 30; return '你获得了师父的真传！灵根+2，修为+30'; } },
        { text: '表示定不辜负', effect: g => { g.data.attrs.str += 1; g.data.attrs.spr += 1; return '师父欣慰地点头。体质+1，灵根+1'; } },
      ]},
    ],
    companion: [
      { minAffinity: 0, topic: '日常闲聊', lines: ['你们并肩而坐，聊着近况。', '微风拂过，气氛温馨。'], choices: [
        { text: '分享修炼心得', effect: g => { g.data.cultivationExp += 10; g.modifyAffinity(g._dialogTarget, 5); return '交流让你们都有所感悟。修为+10'; } },
        { text: '赠送礼物', effect: g => { if (g.data.gold < 20) return '你囊中羞涩...'; g.data.gold -= 20; g.modifyAffinity(g._dialogTarget, 15); return '对方很高兴地收下了。金币-20，好感+15'; } },
      ]},
      { minAffinity: 50, topic: '共论大道', lines: ['你们在月下切磋武艺，论道至深夜。', '灵气在二人之间共鸣。'], choices: [
        { text: '双修', effect: g => { g.data.cultivationExp += 25; g.data.attrs.spr += 1; return '双修令你们都获益匪浅。修为+25，灵根+1'; } },
        { text: '互诉衷肠', effect: g => { g.modifyAffinity(g._dialogTarget, 20); g.data.attrs.cha += 1; return '你们的关系更加深厚。好感+20，魅力+1'; } },
      ]},
      { minAffinity: 80, topic: '生死与共', lines: ['"无论发生什么，我都会陪在你身边。"', '你们立下永不分离的誓言。'], choices: [
        { text: '执子之手', effect: g => { g.data.attrs.spr += 1; g.data.attrs.cha += 1; g.modifyAffinity(g._dialogTarget, 10); return '此刻的幸福胜过一切。灵根+1，魅力+1'; } },
        { text: '许下承诺', effect: g => { g.data.cultivationBonus += 0.1; return '爱情成为你修炼的动力。修炼加成永久+10%'; } },
      ]},
    ],
    friend: [
      { minAffinity: 0, topic: '切磋武艺', lines: ['你与好友在演武场切磋。', '虽是友人之间的比试，但都很认真。'], choices: [
        { text: '全力以赴', effect: g => { g.data.attrs.str += 1; return '一番激烈对决，你的武艺有所精进。体质+1'; } },
        { text: '点到为止', effect: g => { g.modifyAffinity(g._dialogTarget, 10); return '友人赞你为人坦荡。好感+10'; } },
      ]},
      { minAffinity: 40, topic: '酒后真言', lines: ['"说实话，我一直很羡慕你..."', '好友罕见地吐露心声。'], choices: [
        { text: '鼓励对方', effect: g => { g.modifyAffinity(g._dialogTarget, 15); g.data.attrs.cha += 1; return '你的鼓励给了对方信心。魅力+1'; } },
        { text: '坦诚自己的弱点', effect: g => { g.modifyAffinity(g._dialogTarget, 20); return '坦诚拉近了距离。好感+20'; } },
      ]},
    ],
    rival: [
      { minAffinity: -100, topic: '宿命对决', lines: ['宿敌挡在你面前："我等这一天很久了。"', '空气中弥漫着杀气。'], choices: [
        { text: '接受挑战', effect: g => { const win = Math.random() < 0.5 + g.data.attrs.str * 0.05; if (win) { g.data.attrs.str += 2; g.modifyAffinity(g._dialogTarget, 10); return '你击败了宿敌！体质+2'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '你败了...体质-1'; } },
        { text: '试图化解恩怨', effect: g => { if (Math.random() < 0.3) { g.modifyAffinity(g._dialogTarget, 30); return '对方被你的诚意打动，恩怨就此化解。'; } return '对方冷哼一声转身离去。'; } },
      ]},
    ],
    disciple: [
      { minAffinity: 0, topic: '指点徒弟', lines: ['徒弟恭敬地请教修炼中的疑惑。', '你思索片刻，开口传授。'], choices: [
        { text: '倾囊相授', effect: g => { g.data.attrs.int += 1; g.modifyAffinity(g._dialogTarget, 10); return '教学相长，你也有所悟。智力+1'; } },
        { text: '让其自行领悟', effect: g => { g.data.attrs.spr += 1; return '你选择引导而非直接告知。灵根+1'; } },
      ]},
    ],
  };

  // ===== 三世记忆系统 (Phase 5G) =====
  const WORLD_MEMORY_KEY = 'lifesim_world_memory';

  function saveWorldMemory(data, ending) {
    const memories = Storage.get(WORLD_MEMORY_KEY, []);
    memories.push({
      name: data.name,
      realm: data.realm,
      realmName: CULTIVATION_REALMS[data.realm] ? CULTIVATION_REALMS[data.realm].name : '凡人',
      companion: data.relationships.find(r => r.type === 'companion')?.name || null,
      sect: data.sect,
      ending: ending.id,
      endingName: ending.name,
      attrs: { ...data.attrs },
      age: data.age,
      path: data.daoPath || data.path,
    });
    if (memories.length > 5) memories.shift();
    Storage.set(WORLD_MEMORY_KEY, memories);
  }

  function getLastMemory() {
    const memories = Storage.get(WORLD_MEMORY_KEY, []);
    return memories.length > 0 ? memories[memories.length - 1] : null;
  }

  // ==================== 成就系统 ====================

  const LIFESIM_ACHIEVEMENTS = [
    { id: 'ls_first_ascend', name: '首次飞升', icon: '🌟', desc: '达成飞升结局', condition: s => (s.endings || []).includes('ascend') },
    { id: 'ls_demon_lord', name: '魔道至尊', icon: '😈', desc: '达成魔道至尊结局', condition: s => (s.endings || []).includes('demon') },
    { id: 'ls_ten_lives', name: '十世轮回', icon: '🔄', desc: '累计轮回10次', condition: s => (s.totalRuns || 0) >= 10 },
    { id: 'ls_perfect_attrs', name: '完美属性', icon: '💎', desc: '单次游戏中任意属性达到10', condition: s => (s.maxAttr || 0) >= 10 },
    { id: 'ls_mortal_peak', name: '凡人巅峰', icon: '👴', desc: '以凡人身份活过70岁', condition: s => s.mortalOldAge },
    { id: 'ls_speedrun', name: '速通高手', icon: '⚡', desc: '30岁前飞升', condition: s => s.fastAscend },
    { id: 'ls_longevity', name: '万寿无疆', icon: '🐢', desc: '活过500岁', condition: s => (s.maxAge || 0) >= 500 },
    { id: 'ls_wealthy', name: '富可敌国', icon: '💰', desc: '累计获得1000金币', condition: s => (s.totalGold || 0) >= 1000 },
    { id: 'ls_all_realms', name: '六道轮回', icon: '☯️', desc: '达成所有境界的结局', condition: s => { const needed = ['mortal','qi','foundation','core','nascent','god','ascend']; return needed.every(e => (s.endings || []).includes(e)); } },
    { id: 'ls_three_lives', name: '三世情缘', icon: '💕', desc: '累计3次获得道侣', condition: s => (s.totalCompanions || 0) >= 3 },
    { id: 'ls_master_disciple', name: '师徒传承', icon: '🧙', desc: '同时拥有师父和徒弟关系', condition: s => s.masterAndDisciple },
    { id: 'ls_event_master', name: '见多识广', icon: '🗺️', desc: '累计经历100个事件', condition: s => (s.totalEvents || 0) >= 100 },
    { id: 'ls_golden_core', name: '金丹大道', icon: '🟡', desc: '达成金丹真人结局', condition: s => (s.endings || []).includes('core') },
    { id: 'ls_legend', name: '千古传说', icon: '🏆', desc: '达成千古传说结局', condition: s => (s.endings || []).includes('legend') },
    { id: 'ls_battle_death', name: '战死沙场', icon: '💀', desc: '在战斗中魂飞魄散', condition: s => (s.endings || []).includes('death') },
    { id: 'ls_madness', name: '心魔缠身', icon: '😵', desc: '走火入魔', condition: s => (s.endings || []).includes('madness') },
    { id: 'ls_five_friends', name: '广交好友', icon: '🤝', desc: '单次游戏中拥有5个以上关系', condition: s => (s.maxRelationships || 0) >= 5 },
    { id: 'ls_talent_lucky', name: '天选之人', icon: '🍀', desc: '一次投胎获得3个天赋', condition: s => s.threeTalents },
    { id: 'ls_rich_mortal', name: '富甲一方', icon: '💎', desc: '达成富甲一方结局', condition: s => (s.endings || []).includes('rich') },
    { id: 'ls_scholar', name: '儒道双修', icon: '📚', desc: '达成一代大儒结局', condition: s => (s.endings || []).includes('scholar') },
    // NG+相关
    { id: 'ls_ng_first', name: '轮回初悟', icon: '🔄', desc: '首次使用NG+加成', condition: s => s.ngPlusUsed },
    { id: 'ls_ng_max', name: '轮回至尊', icon: '♾️', desc: '任一NG+加成达到满级', condition: s => s.ngPlusMaxed },
    // 道途相关
    { id: 'ls_righteous', name: '正道之光', icon: '☀️', desc: '以正道飞升', condition: s => (s.endings || []).includes('righteous_ascend') },
    { id: 'ls_demonic', name: '魔道无双', icon: '🌑', desc: '以魔道达成化神', condition: s => (s.endings || []).includes('demon') },
    { id: 'ls_buddhist', name: '佛心通明', icon: '☸️', desc: '达成佛道觉悟结局', condition: s => (s.endings || []).includes('buddhist_enlighten') },
    // 血脉相关
    { id: 'ls_bloodline', name: '血脉觉醒', icon: '🐲', desc: '获得稀有血脉', condition: s => s.rareBloodline },
    { id: 'ls_family', name: '家族传承', icon: '👨‍👩‍👦', desc: '拥有后代', condition: s => s.hasChildren },
    // 世界纪元
    { id: 'ls_era_all', name: '历经万劫', icon: '🌍', desc: '在所有纪元中游玩过', condition: s => { const eras = s.erasPlayed || []; return WORLD_ERAS.every(e => eras.includes(e.id)); } },
    // 其他
    { id: 'ls_gold_1000', name: '万贯家财', icon: '💎', desc: '单次游戏积累1000金币', condition: s => (s.maxGold || 0) >= 1000 },
    { id: 'ls_all_endings', name: '万象归一', icon: '🏅', desc: '解锁所有结局', condition: s => (s.endings || []).length >= ENDINGS.length },
  ];

  const ENDINGS = [
    { id: 'poor', name: '贫苦一生', icon: '😢', score: 10, condition: d => d.realm === 0 && d.gold < 50, summary: '你一生贫困潦倒，终究默默无闻地离开了人世。' },
    { id: 'mortal', name: '凡人终老', icon: '👴', score: 20, condition: d => d.realm === 0 && d.gold >= 50, summary: '平凡的一生，虽无波澜，却也安然度过。' },
    { id: 'rich', name: '富甲一方', icon: '💰', score: 30, condition: d => d.realm === 0 && d.gold >= 500, summary: '虽未踏入仙途，但你积累了大量财富，成为一方富豪。' },
    { id: 'scholar', name: '一代大儒', icon: '📚', score: 35, condition: d => d.realm === 0 && d.attrs.int >= 8, summary: '你潜心学问，著书立说，成为受人敬仰的大儒。' },
    { id: 'madness', name: '走火入魔', icon: '😵', score: 15, condition: d => d.realm >= 1 && d.madness, summary: '修炼走火入魔，神智尽失，令人惋惜。' },
    { id: 'death', name: '魂飞魄散', icon: '💀', score: 5, condition: d => d.killedInBattle, summary: '在一场惨烈的战斗中魂飞魄散，化为虚无。' },
    { id: 'qi', name: '炼气修士', icon: '🌱', score: 40, condition: d => d.realm === 1, summary: '你踏入了修仙之路，达到了炼气境界。' },
    { id: 'foundation', name: '筑基修士', icon: '🏗️', score: 55, condition: d => d.realm === 2, summary: '你筑基成功，在修仙界站稳了脚跟。' },
    { id: 'core', name: '金丹真人', icon: '🟡', score: 70, condition: d => d.realm === 3, summary: '你结成金丹，成为一方真人，受人敬仰。' },
    { id: 'nascent', name: '元婴老祖', icon: '👶', score: 85, condition: d => d.realm === 4, summary: '你修成元婴，成为宗门老祖级别的存在。' },
    { id: 'god', name: '化神大能', icon: '✨', score: 95, condition: d => d.realm === 5, summary: '你修至化神之境，已是人间巅峰。' },
    { id: 'ascend', name: '飞升成仙', icon: '🌟', score: 100, condition: d => d.realm === 6, summary: '你突破一切桎梏，飞升成仙，超脱轮回！' },
    { id: 'demon', name: '魔道至尊', icon: '😈', score: 90, condition: d => d.demonPath && d.realm >= 4, summary: '你以魔入道，成为魔道至尊，天地为之色变。' },
    { id: 'legend', name: '千古传说', icon: '🏆', score: 120, condition: d => d.realm === 6 && d.legendary, summary: '你不仅飞升成仙，更留下了千古传说，后人世代传颂。' },
    // 关系相关结局
    { id: 'dao_couple', name: '双仙飞升', icon: '💕', score: 110, condition: d => d.realm === 6 && d.relationships && d.relationships.some(r => r.type === 'companion' && r.affinity >= 80), summary: '你与道侣携手飞升，共赴仙界，成就一段佳话。' },
    { id: 'sect_founder', name: '开宗立派', icon: '🏯', score: 105, condition: d => d.hasSect && d.relationships && d.relationships.some(r => r.type === 'disciple'), summary: '你开宗立派，桃李满天下，宗门传承千年不灭。' },
    { id: 'revenge', name: '快意恩仇', icon: '⚔️', score: 75, condition: d => d.rivalDefeated && d.realm >= 3, summary: '你击败宿敌，快意恩仇，在修仙界留下赫赫威名。' },
    // 道途结局
    { id: 'righteous_ascend', name: '正道飞升', icon: '☀️', score: 115, condition: d => d.realm === 6 && d.daoPath === 'righteous', summary: '你以正道飞升，万民敬仰，留下不朽传说。' },
    { id: 'buddhist_enlighten', name: '佛道觉悟', icon: '☸️', score: 105, condition: d => d.realm >= 5 && d.daoPath === 'buddhist', summary: '你悟透生死，大彻大悟，化身佛陀普度众生。' },
    { id: 'demonic_overlord', name: '魔帝', icon: '👿', score: 110, condition: d => d.realm >= 5 && d.daoPath === 'demonic' && d.legendary, summary: '你以魔帝之姿君临天下，万魔臣服。' },
    // 血脉结局
    { id: 'dragon_ascend', name: '化龙飞天', icon: '🐲', score: 115, condition: d => d.realm === 6 && d.bloodline === 'dragon', summary: '龙血觉醒，你化为真龙飞升九天！' },
    { id: 'phoenix_rebirth', name: '凤凰涅槃', icon: '🔥', score: 112, condition: d => d.realm >= 5 && d.bloodline === 'phoenix', summary: '凤血燃尽又重生，你浴火涅槃成就不灭之身。' },
    // 家族结局
    { id: 'patriarch', name: '家族之祖', icon: '👨‍👩‍👦', score: 80, condition: d => d.children && d.children.length >= 2 && d.realm >= 3, summary: '你建立了修仙世家，子嗣绵延，家族兴旺百代。' },
    // 纪元结局
    { id: 'era_hero', name: '纪元英雄', icon: '🌟', score: 95, condition: d => d.worldEra === 'war_age' && d.realm >= 4 && d.legendary, summary: '在仙魔大战中力挽狂澜，你成为了纪元英雄。' },
    // NG+结局
    { id: 'true_immortal', name: '真仙', icon: '👑', score: 150, condition: d => d.realm === 6 && d.legendary && d.ngPlusLevel >= 3, summary: '历经无数轮回，你终于证得真仙之位，超脱一切。' },
  ];
  const ENDINGS_MAP = Object.fromEntries(ENDINGS.map(x => [x.id, x]));

  // Events organized by life stage
  const EVENTS = {
    childhood: [
      { id: 'c1', icon: '👶', title: '出生', desc: '你降生在{birthplace}。', auto: true, birthplaces: ['一个贫穷的农户家庭', '一个富商家庭', '一个书香门第', '一个猎户家庭', '一个小镇的医药铺'], effect: (g, bp) => { g.log.push(`你出生在${bp}。`); if (bp.includes('富商')) g.data.gold += 50; if (bp.includes('书香')) g.data.attrs.int += 1; if (bp.includes('猎户')) g.data.attrs.str += 1; } },
      { id: 'c2', icon: '🌟', title: '异象降临', desc: '你出生时天降异象，紫气东来。', condition: d => d.attrs.spr >= 7, choices: [{ text: '这或许是天命', effect: g => { g.data.attrs.spr += 1; return '你的灵根似乎更加纯净了。灵根+1'; } }] },
      { id: 'c3', icon: '🤒', title: '幼年重病', desc: '你幼年时身患重病，命悬一线。', condition: d => d.attrs.str <= 3 && !(d.talents && d.talents.includes('poison_immune')), choices: [{ text: '坚强挺过', effect: g => { if (Math.random() < 0.5 + g.data.attrs.str * 0.05) { g.data.attrs.str += 1; return '大难不死，体质反而增强了。体质+1'; } return '虽然活了下来，但身体更加虚弱了。'; } }, { text: '求医问药', effect: g => { if (g.data.gold >= 20) { g.data.gold -= 20; g.data.attrs.str += 1; return '花费20金币请名医治疗，病情好转。体质+1'; } return '无钱医治，只能硬扛过去。'; } }] },
      { id: 'c4', icon: '📖', title: '启蒙读书', desc: '到了读书的年纪，是否用心学习？', choices: [{ text: '刻苦读书', effect: g => { g.data.attrs.int += 1; return '你废寝忘食地学习，学识大增。智力+1'; } }, { text: '贪玩打闹', effect: g => { g.data.attrs.str += 1; return '整天在外面疯跑，体格强壮了不少。体质+1'; } }] },
      { id: 'c5', icon: '🐕', title: '遇到野狗', desc: '路上遇到一群凶猛的野狗。', choices: [{ text: '勇敢驱赶', effect: g => { if (g.getAttrWithTalent('str') >= 4) { g.data.attrs.str += 1; return '你勇敢地赶走了野狗！体质+1'; } return '你被野狗咬伤了...'; } }, { text: '绕道而行', effect: () => '你绕了远路回家，平安无事。' }] },
      // 新增幼年事件
      { id: 'c6', icon: '🎣', title: '河边钓鱼', desc: '你偷偷跑到河边钓鱼，水面波光粼粼。', choices: [{ text: '耐心垂钓', effect: g => { if (g.getAttrWithTalent('luk') >= 5) { g.data.gold += 15; return '钓到一条金色灵鱼，卖了好价钱！金币+15'; } g.data.attrs.luk += 1; return '虽然只钓到普通鱼，但你享受了这份宁静。运气+1'; } }, { text: '跳入水中捉鱼', effect: g => { g.data.attrs.str += 1; return '你在水中扑腾许久，体力增长了。体质+1'; } }] },
      { id: 'c7', icon: '🌠', title: '天降异宝', desc: '夜晚，一颗流星坠落在村外。', condition: d => d.attrs.luk >= 5, choices: [{ text: '前去寻找', effect: g => { g.data.attrs.spr += 1; g.data.gold += 20; return '你找到了一块散发灵光的陨石！灵根+1，金币+20'; } }, { text: '告诉父母', effect: g => { g.data.attrs.cha += 1; return '父母夸你乖巧懂事。魅力+1'; } }] },
      { id: 'c8', icon: '🏚️', title: '家族变故', desc: '一场突如其来的灾祸降临你的家庭。', choices: [{ text: '坚强面对', effect: g => { g.data.attrs.str += 1; g.data.attrs.int += 1; return '苦难磨砺了你的心智和体魄。体质+1，智力+1'; } }, { text: '寻求帮助', effect: g => { if (g.getAttrWithTalent('cha') >= 4) { g.data.gold += 30; g.addRelationship(pick([...NPC_NAMES_MALE, ...NPC_NAMES_FEMALE]), 'friend', 30); return '好心人伸出援手，你也结交了一位好友。金币+30'; } return '无人援助，你只能独自承受。'; } }] },
      { id: 'c9', icon: '🐱', title: '捡到灵兽', desc: '你在路边发现了一只受伤的小灵兽。', choices: [{ text: '救助灵兽', effect: g => { g.data.attrs.cha += 1; if (g.hasTalent('spirit_sense')) { g.data.attrs.spr += 1; return '灵兽感激你的救助，将一丝灵气传给你。魅力+1，灵根+1'; } return '灵兽痊愈后离去，你感到一丝温暖。魅力+1'; } }, { text: '不管闲事', effect: () => '你匆匆离去，不想惹麻烦。' }] },
      { id: 'c10', icon: '💒', title: '天才儿童', desc: '镇上来了考核天才的仙人。', condition: d => d.attrs.int >= 6, choices: [{ text: '接受考核', effect: g => { g.data.attrs.int += 1; g.data.attrs.spr += 1; return '仙人惊叹你的天资，赐你一本启蒙秘籍。智力+1，灵根+1'; } }, { text: '藏拙不出', effect: g => { g.data.attrs.luk += 1; return '你低调行事，暗中积蓄力量。运气+1'; } }] },
      // 负面幼年事件
      { id: 'c11', icon: '🔥', title: '家宅失火', desc: '一场大火烧毁了你的家。', choices: [{ text: '奋力救火', effect: g => { if (g.getAttrWithTalent('str') >= 4) { g.data.attrs.str += 1; return '你英勇救火，虽然家毁了但你变得更坚强。体质+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '你被烫伤了，身体虚弱了许久。体质-1'; } }, { text: '逃离现场', effect: g => { const loss = Math.min(g.data.gold, randomInt(10, 30)); g.data.gold -= loss; return `家中积蓄付之一炬。金币-${loss}`; } }] },
      { id: 'c12', icon: '😭', title: '被人欺负', desc: '村里的大孩子经常欺负你。', choices: [{ text: '奋起反抗', effect: g => { if (g.getAttrWithTalent('str') >= 4) { g.data.attrs.str += 1; g.data.attrs.cha += 1; return '你打赢了！从此没人敢欺负你。体质+1，魅力+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '你被打得鼻青脸肿。体质-1'; } }, { text: '忍气吞声', effect: g => { g.data.attrs.cha = Math.max(1, g.data.attrs.cha - 1); g.data.attrs.int += 1; return '你暗暗发誓要出人头地。魅力-1，智力+1'; } }] },
    ],
    youth: [
      { id: 'y1', icon: '🔮', title: '灵根测试', desc: '修仙门派来到小镇进行灵根测试。这将决定你能否踏上修仙之路。', important: true, choices: [{ text: '参加测试', effect: g => { const spr = g.getAttrWithTalent('spr'); if (spr >= 5) { g.data.canCultivate = true; if (spr >= 8) { const masterName = pick(NPC_NAMES_MALE); g.addRelationship(masterName, 'master', 50); return `你的灵根品质极高！仙门长老${masterName}当场收你为徒！`; } return '测试通过！你拥有修仙的资质！'; } return '灵根品质太低，仙门不予接纳。或许凡人生活也有其精彩。'; } }, { text: '放弃测试', effect: () => '你选择了凡人的道路。' }] },
      { id: 'y2', icon: '🏫', title: '求学之路', desc: '你来到学堂深造。', choices: [{ text: '潜心学问', effect: g => { g.data.attrs.int += 1; return '你在学堂中表现优异。智力+1'; } }, { text: '结交好友', effect: g => { g.data.attrs.cha += 1; g.data.friends++; const friendName = pick(Math.random() < 0.5 ? NPC_NAMES_MALE : NPC_NAMES_FEMALE); g.addRelationship(friendName, 'friend', 40); return `你结识了好友${friendName}。魅力+1`; } }] },
      { id: 'y3', icon: '🏋️', title: '武馆招生', desc: '镇上的武馆在招收弟子。', choices: [{ text: '报名习武', effect: g => { g.data.attrs.str += 1; return '你在武馆练就了一身好武艺。体质+1'; } }, { text: '继续读书', effect: g => { g.data.attrs.int += 1; return '你选择以文为业。智力+1'; } }] },
      { id: 'y4', icon: '💕', title: '少年情愫', desc: '你对一位同窗心生好感。', condition: d => d.attrs.cha >= 4, choices: [{ text: '表达心意', effect: g => { const companionName = pick(NPC_NAMES_FEMALE); if (g.getAttrWithTalent('cha') >= 6) { g.data.companion = true; g.addRelationship(companionName, 'companion', 60); return `${companionName}也对你有好感，你们青梅竹马，成为一对。`; } g.data.attrs.cha += 1; return '被婉拒了，但你学会了如何表达自己。魅力+1'; } }, { text: '默默守护', effect: g => { g.data.attrs.int += 1; return '你将心思放在学业上，暗暗努力。智力+1'; } }] },
      { id: 'y5', icon: '🗡️', title: '山匪来袭', desc: '一群山匪袭击了小镇。', choices: [{ text: '挺身而出', effect: g => { if (g.getAttrWithTalent('str') >= 5 || g.hasTalent('battle_instinct')) { g.data.attrs.str += 1; g.data.gold += g.hasTalent('golden_touch') ? 45 : 30; return '你英勇击退了山匪，获得了赏金！体质+1，金币+' + (g.hasTalent('golden_touch') ? 45 : 30); } return '你虽勇敢但力不从心，受了些伤。'; } }, { text: '协助疏散', effect: g => { g.data.attrs.cha += 1; return '你帮助村民疏散，获得了大家的感激。魅力+1'; } }] },
      // 新增少年事件
      { id: 'y6', icon: '🥊', title: '武道大会', desc: '镇上举办武道大会，各路少年英雄齐聚。', choices: [{ text: '报名参赛', effect: g => { const str = g.getAttrWithTalent('str'); if (str >= 5) { g.data.attrs.str += 1; g.data.gold += 50; if (str >= 7) { const rivalName = pick(NPC_NAMES_MALE); g.addRelationship(rivalName, 'rival', -30); return `你获得冠军！但${rivalName}不服，视你为宿敌。体质+1，金币+50`; } return '你表现出色，获得不错的名次。体质+1，金币+50'; } return '你实力不足，首轮便被淘汰。'; } }, { text: '观摩学习', effect: g => { g.data.attrs.int += 1; return '你在观摩中学到了不少招式。智力+1'; } }] },
      { id: 'y7', icon: '📜', title: '古卷残页', desc: '你在旧书摊上发现一页古老的经卷残页。', choices: [{ text: '仔细研读', effect: g => { if (g.getAttrWithTalent('int') >= 5) { g.data.attrs.spr += 1; return '你隐约领悟了其中的修行要义。灵根+1'; } return '文字晦涩难懂，你未能领悟。'; } }, { text: '高价出售', effect: g => { const gold = g.hasTalent('merchant_eye') ? 60 : 30; g.data.gold += gold; return `你将残页卖给收藏家。金币+${gold}`; } }] },
      { id: 'y8', icon: '🎭', title: '戏班来访', desc: '一个游方戏班来到镇上表演。', choices: [{ text: '跟班学艺', effect: g => { g.data.attrs.cha += 1; g.data.attrs.luk += 1; return '你跟着戏班学了不少才艺。魅力+1，运气+1'; } }, { text: '专心读书', effect: g => { g.data.attrs.int += 1; return '你不为所动，继续苦读。智力+1'; } }] },
      { id: 'y9', icon: '🌊', title: '洪水来袭', desc: '连日暴雨，洪水淹没了村庄。', choices: [{ text: '奋力救人', effect: g => { if (g.getAttrWithTalent('str') >= 4) { g.data.attrs.str += 1; g.data.attrs.cha += 1; const friendName = pick(NPC_NAMES_FEMALE); g.addRelationship(friendName, 'friend', 50); return `你救下了${friendName}，她对你感激不尽。体质+1，魅力+1`; } return '你拼尽全力，但也差点被水冲走。'; } }, { text: '登高避水', effect: g => { g.data.attrs.int += 1; return '你机智地找到高处避难。智力+1'; } }] },
      { id: 'y10', icon: '🎩', title: '贵人相助', desc: '一位路过的仙人注意到了你。', condition: d => d.attrs.spr >= 4 || d.attrs.luk >= 6, choices: [{ text: '恭敬求教', effect: g => { g.data.attrs.spr += 1; g.data.attrs.int += 1; const masterName = pick(NPC_NAMES_MALE); g.addRelationship(masterName, 'friend', 40); return `仙人${masterName}指点了你几句，你受益匪浅。灵根+1，智力+1`; } }, { text: '请求收徒', effect: g => { if (g.getAttrWithTalent('spr') >= 6) { g.data.canCultivate = true; const masterName = pick(NPC_NAMES_MALE); g.addRelationship(masterName, 'master', 70); return `仙人${masterName}见你根骨奇佳，收你为徒！`; } return '仙人摇头叹息，认为你根骨尚浅。'; } }] },
      // 负面少年事件
      { id: 'y11', icon: '💔', title: '好友背叛', desc: '你最信任的朋友在背后说你坏话。', choices: [{ text: '当面对质', effect: g => { g.data.attrs.cha = Math.max(1, g.data.attrs.cha - 1); return '你们大吵一架，友情破裂。魅力-1'; } }, { text: '默默疏远', effect: g => { g.data.attrs.int += 1; return '你学会了识人之术。智力+1'; } }] },
      { id: 'y12', icon: '🐍', title: '毒蛇咬伤', desc: '在野外采药时被毒蛇咬伤。', choices: [{ text: '自行处理', effect: g => { if (g.hasTalent('poison_immune')) return '你天生百毒不侵，蛇毒自动化解。'; if (g.getAttrWithTalent('int') >= 5) { g.data.attrs.int += 1; return '你用学过的草药知识成功解毒。智力+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '虽然活了下来，但留下了后遗症。体质-1'; } }, { text: '呼救', effect: g => { if (g.data.gold >= 20) { g.data.gold -= 20; return '花钱请大夫解了毒。金币-20'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '无人相助，蛇毒损伤了身体。体质-1'; } }] },
    ],
    young_adult: [
      { id: 'a1', icon: '⛰️', title: '拜入仙门', desc: '你来到仙门山前，门派正在招收弟子。', condition: d => d.canCultivate, important: true, choices: [{ text: '拜入仙门', effect: g => { g.data.realm = 1; g.data.inSect = true; return '你正式成为仙门弟子，开始了修仙之路！突破至炼气！'; } }, { text: '独自修行', effect: g => { g.data.realm = 1; return '你选择独自修行，虽然艰难，但更加自由。突破至炼气！'; } }] },
      { id: 'a2', icon: '📿', title: '寻得功法', desc: '你在一处废墟中发现了一本残缺的功法。', condition: d => d.realm >= 1, choices: [{ text: '研习功法', effect: g => { if (g.getAttrWithTalent('int') >= 6) { g.data.cultivationBonus = (g.data.cultivationBonus || 0) + 1; return '你成功领悟了功法中的奥妙！修炼加速'; } return '功法太过深奥，未能领悟。'; } }, { text: '出售功法', effect: g => { const gold = g.hasTalent('merchant_eye') ? 200 : 100; g.data.gold += gold; return `你将功法卖给了坊市，获得${gold}金币。`; } }] },
      { id: 'a3', icon: '⚔️', title: '仙魔之战', desc: '修仙界爆发了一场仙魔大战，你被卷入其中。', condition: d => d.realm >= 1, choices: [{ text: '正面迎战', effect: g => { const power = g.getAttrWithTalent('str') + g.data.realm * 2; if (power >= 8 || g.hasTalent('battle_instinct')) { g.data.gold += g.hasTalent('golden_touch') ? 120 : 80; g.data.attrs.str += 1; return '你在战斗中表现出色，获得了战功！体质+1'; } if (!g.hasTalent('dao_heart')) { g.data.killedInBattle = Math.random() < 0.15; } if (g.data.killedInBattle) return '你在战斗中不敌强敌...'; return '你在战斗中受了重伤，侥幸逃生。'; } }, { text: '暗中观察', effect: g => { g.data.attrs.int += 1; return '你在暗中观察战局，领悟了不少战斗技巧。智力+1'; } }] },
      { id: 'a4', icon: '💊', title: '丹师指点', desc: '一位游方丹师愿意传授你炼丹之术。', choices: [{ text: '学习炼丹', effect: g => { g.data.attrs.int += 1; const gold = g.hasTalent('golden_touch') ? 75 : 50; g.data.gold += gold; return `你学会了基础炼丹术，炼制了一些丹药出售。智力+1，金币+${gold}`; } }, { text: '婉言谢绝', effect: () => '你婉言谢绝了丹师的好意。' }] },
      { id: 'a5', icon: '🗺️', title: '探索秘境', desc: '你发现了一处神秘的远古秘境入口。', choices: [{ text: '深入探索', effect: g => { const luck = g.getAttrWithTalent('luk'); const bonus = g.hasTalent('spirit_sense') ? 2 : 0; if (luck + bonus >= 6) { const gold = g.hasTalent('golden_touch') ? 300 : 200; g.data.gold += gold; g.data.attrs.spr += 1; return `你在秘境中获得了珍贵宝物和传承！灵根+1，金币+${gold}`; } if (luck + bonus >= 3) { g.data.gold += 50; return '秘境中收获一般，得到了一些灵石。金币+50'; } return '秘境中危险重重，你差点丢了性命。'; } }, { text: '谨慎离开', effect: g => { g.data.attrs.int += 1; return '你审时度势，选择了安全。智力+1'; } }] },
      { id: 'a6', icon: '🌙', title: '魔道诱惑', desc: '一位魔修向你展示了魔道修行的力量。', condition: d => d.realm >= 1, choices: [{ text: '接受魔道', effect: g => { g.data.demonPath = true; g.data.attrs.str += 2; g.data.attrs.int += 1; return '你踏入魔道，力量暴涨！体质+2，智力+1'; } }, { text: '坚守正道', effect: g => { g.data.attrs.cha += 1; return '你坚定心志，获得了旁人的敬重。魅力+1'; } }] },
      // 新增青年事件
      { id: 'a7', icon: '🏺', title: '古墓探险', desc: '你发现了一座远古修士的坟墓。', choices: [{ text: '进入探索', effect: g => { const luck = g.getAttrWithTalent('luk'); if (luck >= 5) { g.data.attrs.spr += 1; g.data.gold += 100; return '你在古墓中得到了传承！灵根+1，金币+100'; } if (luck >= 3) { g.data.gold += 30; return '古墓中只有些普通物品。金币+30'; } g.data.attrs.str -= 1; return '古墓中的机关让你受了伤。体质-1'; } }, { text: '封印古墓', effect: g => { g.data.attrs.cha += 1; return '你将古墓封好，以免危害他人。魅力+1'; } }] },
      { id: 'a8', icon: '🌋', title: '火山爆发', desc: '附近的火山突然喷发，灵气大涌！', choices: [{ text: '借势修炼', effect: g => { if (g.getAttrWithTalent('spr') >= 5) { g.data.attrs.spr += 2; return '你在极端灵气环境中突破极限！灵根+2'; } g.data.attrs.spr += 1; return '你吸收了些许灵气。灵根+1'; } }, { text: '帮助村民撤离', effect: g => { g.data.attrs.cha += 2; const friendName = pick(NPC_NAMES_FEMALE); g.addRelationship(friendName, 'friend', 60); return `你救助了不少村民，${friendName}对你感恩戴德。魅力+2`; } }] },
      { id: 'a9', icon: '💒', title: '宗门联姻', desc: '宗门安排了一桩联姻，对方是另一门派的优秀弟子。', condition: d => d.realm >= 1 && !d.companion, choices: [{ text: '接受联姻', effect: g => { const name = pick(NPC_NAMES_FEMALE); g.data.companion = true; g.addRelationship(name, 'companion', 50); g.data.gold += 100; return `你与${name}结为道侣，两门结好。金币+100`; } }, { text: '婉拒', effect: g => { g.data.attrs.int += 1; return '你以修道为重，婉拒了联姻。智力+1'; } }] },
      { id: 'a10', icon: '☸️', title: '佛道之辩', desc: '路遇一位高僧，邀你论道。', choices: [{ text: '与之辩论', effect: g => { if (g.getAttrWithTalent('int') >= 7) { g.data.attrs.int += 2; return '你在辩论中胜出，思维更加敏锐。智力+2'; } g.data.attrs.int += 1; return '虽然没有胜出，但你受到启发。智力+1'; } }, { text: '虚心求教', effect: g => { g.data.attrs.spr += 1; return '高僧传授你一段佛门心法，灵根有所增益。灵根+1'; } }] },
      { id: 'a11', icon: '😤', title: '宿敌出现', desc: '一位与你实力相当的修士处处与你作对。', condition: d => d.realm >= 1, choices: [{ text: '正面对抗', effect: g => { const rivalName = pick(NPC_NAMES_MALE); g.addRelationship(rivalName, 'rival', -50); if (g.getAttrWithTalent('str') >= 6) { g.data.attrs.str += 1; return `你击退了${rivalName}，但他发誓报仇。体质+1`; } return `你不敌${rivalName}，铩羽而归。`; } }, { text: '化敌为友', effect: g => { if (g.getAttrWithTalent('cha') >= 6) { const rivalName = pick(NPC_NAMES_MALE); g.addRelationship(rivalName, 'friend', 40); return `你以德服人，${rivalName}成为了你的好友。`; } return '对方不为所动，依旧敌视你。'; } }] },
      { id: 'a12', icon: '🌸', title: '桃花劫', desc: '你身陷一段纠葛的感情之中。', condition: d => d.attrs.cha >= 5, choices: [{ text: '顺从心意', effect: g => { const name = pick(NPC_NAMES_FEMALE); if (!g.data.companion) { g.data.companion = true; g.addRelationship(name, 'companion', 70); return `你与${name}两情相悦，结为道侣。`; } g.data.attrs.cha += 1; return '你已有道侣，只能忍痛割爱。魅力+1'; } }, { text: '斩断情丝', effect: g => { g.data.attrs.int += 1; g.data.attrs.spr += 1; return '你斩断情丝，道心反而更加坚定。智力+1，灵根+1'; } }] },
      { id: 'a13', icon: '🔮', title: '天命启示', desc: '你在修炼中看到了命运的一角。', condition: d => d.realm >= 1 && d.attrs.spr >= 5, choices: [{ text: '追寻天命', effect: g => { g.data.attrs.spr += 1; g.data.legendary = true; return '你感受到了天命的召唤，命运之路渐渐清晰。灵根+1'; } }, { text: '逆天改命', effect: g => { if (g.hasTalent('defy_fate')) { g.data.attrs.spr += 2; g.data.attrs.str += 1; return '你以逆天之姿改写命运！灵根+2，体质+1'; } g.data.attrs.str += 1; return '你选择掌握自己的命运。体质+1'; } }] },
      { id: 'a14', icon: '🐉', title: '灵兽契约', desc: '一头灵兽主动向你示好，请求契约。', condition: d => d.attrs.spr >= 4, choices: [{ text: '缔结契约', effect: g => { g.data.attrs.str += 1; g.data.attrs.spr += 1; return '你与灵兽缔结了契约，实力大增。体质+1，灵根+1'; } }, { text: '放其自由', effect: g => { g.data.attrs.luk += 2; return '灵兽感激你的善良，为你带来了好运。运气+2'; } }] },
      // 负面青年事件
      { id: 'a15', icon: '⚡', title: '雷劫误伤', desc: '你路过一处正在渡劫的前辈，余波将你击中。', condition: d => d.realm >= 1, choices: [{ text: '运功抵抗', effect: g => { if (g.getAttrWithTalent('spr') >= 6) { g.data.attrs.spr += 1; return '你借雷劫之力淬炼己身！灵根+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); g.data.attrs.spr = Math.max(1, g.data.attrs.spr - 1); return '雷劫余波伤你不轻。体质-1，灵根-1'; } }, { text: '就地装死', effect: g => { g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '虽然逃过一劫，但还是受了些伤。体质-1'; } }] },
      { id: 'a16', icon: '🕳️', title: '坠入深渊', desc: '修炼途中不慎坠入一个深不见底的裂缝。', choices: [{ text: '寻找出路', effect: g => { if (g.getAttrWithTalent('luk') >= 5) { g.data.gold += 80; g.data.attrs.spr += 1; return '你在深渊中找到了一处秘境遗迹！灵根+1，金币+80'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '你艰难爬出，但耗尽了体力。体质-1'; } }, { text: '等待救援', effect: g => { g.data.attrs.cha = Math.max(1, g.data.attrs.cha - 1); return '你等了很久才被人发现，颜面尽失。魅力-1'; } }] },
      { id: 'a17', icon: '💸', title: '投资失败', desc: '你投资的灵矿突然枯竭了。', condition: d => d.gold >= 50, choices: [{ text: '追加投入', effect: g => { const loss = Math.min(g.data.gold, randomInt(50, 100)); g.data.gold -= loss; if (Math.random() < 0.3) { g.data.gold += loss * 2; return `灵矿深处又发现了新矿脉！反赚${loss}金币！`; } return `血本无归，损失了${loss}金币。`; } }, { text: '及时止损', effect: g => { const loss = Math.min(g.data.gold, randomInt(20, 50)); g.data.gold -= loss; return `果断撤出，损失较小。金币-${loss}`; } }] },
    ],
    middle_age: [
      { id: 'm2', icon: '🏯', title: '建立势力', desc: '你的实力已经足以建立自己的势力。', condition: d => d.realm >= 3, choices: [{ text: '建立门派', effect: g => { if (g.getAttrWithTalent('cha') >= 6 && g.data.gold >= 200) { g.data.gold -= 200; g.data.hasSect = true; g.data.legendary = true; return '你建立了自己的门派，成为一代宗师！'; } return '条件不足，建立门派的计划暂时搁浅。'; } }, { text: '独行天下', effect: g => { g.data.attrs.str += 1; return '你选择独行天下，不受束缚。体质+1'; } }] },
      { id: 'm3', icon: '📿', title: '悟道天机', desc: '你在修炼中感悟到了天地大道的一丝真意。', condition: d => d.realm >= 2, choices: [{ text: '深入参悟', effect: g => { if (g.getAttrWithTalent('int') >= 7) { g.data.attrs.spr += 1; g.data.cultivationBonus = (g.data.cultivationBonus || 0) + 1; return '你领悟了大道真意！灵根+1，修炼加速'; } return '道心不够坚定，未能领悟。'; } }, { text: '以战悟道', effect: g => { g.data.attrs.str += 1; return '你选择在战斗中寻找突破。体质+1'; } }] },
      { id: 'm4', icon: '💍', title: '道侣之约', desc: '一位志同道合的修士向你示好。', condition: d => d.realm >= 1 && !d.companion, choices: [{ text: '结为道侣', effect: g => { const name = pick(NPC_NAMES_FEMALE); g.data.companion = true; g.addRelationship(name, 'companion', 70); g.data.attrs.cha += 1; return `你与${name}结为道侣，相伴修行。魅力+1`; } }, { text: '以道为重', effect: g => { g.data.attrs.int += 1; return '你以修道为重，婉言谢绝。智力+1'; } }] },
      { id: 'm5', icon: '🐉', title: '龙族邀请', desc: '一位龙族长老邀请你前往龙宫做客。', condition: d => d.realm >= 4, choices: [{ text: '前往龙宫', effect: g => { const gold = g.hasTalent('golden_touch') ? 450 : 300; g.data.gold += gold; g.data.attrs.str += 1; g.data.legendary = true; return `龙族赠你宝物和修炼心得！体质+1，金币+${gold}`; } }, { text: '婉言谢绝', effect: () => '你婉拒了龙族的邀请。' }] },
      // 新增壮年/中年事件
      { id: 'm6', icon: '🏰', title: '宗门危机', desc: '你所在的宗门遭遇了强敌围攻。', condition: d => d.realm >= 2 && d.inSect, choices: [{ text: '挺身护宗', effect: g => { if (g.getAttrWithTalent('str') + g.data.realm * 2 >= 10) { g.data.attrs.str += 1; g.data.attrs.cha += 2; g.data.legendary = true; const rival = g.getRelationship('rival'); if (rival) { g.data.rivalDefeated = true; g.modifyAffinity(rival.name, 20); return `你击退强敌，连宿敌${rival.name}也被你折服！体质+1，魅力+2`; } return '你力挽狂澜，成为宗门英雄！体质+1，魅力+2'; } return '你虽奋力抵抗，但实力不足，宗门蒙受损失。'; } }, { text: '联合盟友', effect: g => { if (g.getAttrWithTalent('cha') >= 6) { g.data.gold += 100; return '你成功联合盟友，击退了敌人。金币+100'; } return '盟友们犹豫不决，援军来得太迟。'; } }] },
      { id: 'm7', icon: '🌌', title: '星辰异变', desc: '星辰异象出现，天地灵气暴涨。', choices: [{ text: '借势修炼', effect: g => { g.data.attrs.spr += 1; if (g.hasTalent('innate_body')) { g.data.attrs.spr += 1; return '你的先天道体完美吸收天地灵气！灵根+2'; } return '你在灵气潮汐中感悟颇多。灵根+1'; } }, { text: '收集灵气结晶', effect: g => { const gold = g.hasTalent('golden_touch') ? 150 : 100; g.data.gold += gold; return `你收集了大量灵气结晶。金币+${gold}`; } }] },
      { id: 'm8', icon: '👴', title: '前辈指点', desc: '一位隐世前辈出现，愿意指点你修行。', condition: d => d.realm >= 2, choices: [{ text: '恭敬求教', effect: g => { const masterName = pick(NPC_NAMES_MALE); g.addRelationship(masterName, 'master', 60); g.data.attrs.int += 1; g.data.attrs.spr += 1; g.data.cultivationBonus = (g.data.cultivationBonus || 0) + 1; return `${masterName}前辈倾囊相授。智力+1，灵根+1，修炼加速`; } }, { text: '以战代教', effect: g => { g.data.attrs.str += 2; return '你请前辈与你切磋，体魄大幅提升。体质+2'; } }] },
      { id: 'm9', icon: '🏟️', title: '修仙大会', desc: '百年一度的修仙大会即将开始。', condition: d => d.realm >= 3, choices: [{ text: '参加比武', effect: g => { const power = g.getAttrWithTalent('str') + g.getAttrWithTalent('spr') + g.data.realm * 2; if (power >= 15) { g.data.legendary = true; g.data.gold += 200; g.data.attrs.str += 1; return '你在大会上一鸣惊人，名震四方！体质+1，金币+200'; } return '你虽未夺魁，但也展示了实力。'; } }, { text: '观摩交流', effect: g => { g.data.attrs.int += 1; const friendName = pick(NPC_NAMES_MALE); g.addRelationship(friendName, 'friend', 40); return `你结识了同道${friendName}，交流了修炼心得。智力+1`; } }] },
      { id: 'm10', icon: '💎', title: '天材地宝', desc: '你感应到附近有天材地宝即将成熟。', choices: [{ text: '前去采集', effect: g => { const luck = g.getAttrWithTalent('luk'); const bonus = g.hasTalent('spirit_sense') ? 3 : 0; if (luck + bonus >= 6) { g.data.attrs.spr += 1; g.data.attrs.str += 1; return '你成功采得天材地宝，实力大增！灵根+1，体质+1'; } if (luck + bonus >= 3) { g.data.gold += 80; return '虽然错过了最珍贵的，但也有所收获。金币+80'; } return '天材地宝被他人抢先，你空手而归。'; } }, { text: '设陷阱等待', effect: g => { g.data.attrs.int += 1; g.data.gold += 50; return '你用计谋获取了一些资源。智力+1，金币+50'; } }] },
      // 负面壮年/中年事件
      { id: 'm11', icon: '🩸', title: '旧伤复发', desc: '年轻时留下的暗伤突然发作。', choices: [{ text: '强忍修炼', effect: g => { g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); if (Math.random() < 0.3) { g.data.attrs.spr += 1; return '以痛为引，竟有所突破。体质-1，灵根+1'; } return '伤势加重，修炼效率大降。体质-1'; } }, { text: '闭关疗伤', effect: g => { if (g.data.gold >= 80) { g.data.gold -= 80; return '花费大量灵石疗伤，总算恢复了。金币-80'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '缺乏灵药，伤势未能痊愈。体质-1'; } }] },
      { id: 'm12', icon: '🌑', title: '道侣离散', desc: '你与道侣因修行理念不合而分道扬镳。', condition: d => d.companion && d.realm >= 2, choices: [{ text: '挽留道侣', effect: g => { if (g.getAttrWithTalent('cha') >= 7) { g.data.attrs.cha += 1; return '你的真心打动了道侣，和好如初。魅力+1'; } g.data.companion = false; g.data.attrs.cha = Math.max(1, g.data.attrs.cha - 1); return '道侣去意已决，你们缘尽于此。魅力-1'; } }, { text: '放手', effect: g => { g.data.companion = false; g.data.attrs.int += 1; return '你放下了这段情缘，道心更加通达。智力+1'; } }] },
      { id: 'm13', icon: '☠️', title: '禁地误入', desc: '你误入了一处远古禁地。', condition: d => d.realm >= 2, choices: [{ text: '深入探索', effect: g => { if (g.getAttrWithTalent('luk') >= 6 && g.getAttrWithTalent('str') >= 5) { g.data.attrs.spr += 2; g.data.gold += 150; return '你在禁地中获得了远古传承！灵根+2，金币+150'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 2); g.data.attrs.spr = Math.max(1, g.data.attrs.spr - 1); return '禁地中的阵法重创了你。体质-2，灵根-1'; } }, { text: '原路返回', effect: g => { g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '虽然撤退了，但还是触发了阵法受了伤。体质-1'; } }] },
      // 家族事件
      { id: 'm14', icon: '👶', title: '喜得麟儿', desc: '你的道侣/伴侣为你诞下一子。', condition: d => (d.companion || d.relationships?.some(r => r.type === 'companion')) && (!d.children || d.children.length < 3), choices: [{ text: '悉心培养', effect: g => { const childName = pick([...NPC_NAMES_MALE, ...NPC_NAMES_FEMALE]); if (!g.data.children) g.data.children = []; g.data.children.push({ name: childName, talent: Math.random() < 0.3 ? 'gifted' : 'normal' }); g.data.attrs.cha += 1; return `${childName}降生了！你有了后代。魅力+1`; } }, { text: '顺其自然', effect: g => { const childName = pick([...NPC_NAMES_MALE, ...NPC_NAMES_FEMALE]); if (!g.data.children) g.data.children = []; g.data.children.push({ name: childName, talent: 'normal' }); return `${childName}平安出生。`; } }] },
      { id: 'm15', icon: '👨‍👩‍👦', title: '子嗣天赋', desc: '你发现你的孩子表现出了非凡的天赋。', condition: d => d.children && d.children.length > 0, choices: [{ text: '亲自指导', effect: g => { g.data.children[0].talent = 'gifted'; g.data.attrs.int += 1; return '你倾心教导，孩子进步神速。智力+1'; } }, { text: '送入仙门', effect: g => { g.data.attrs.cha += 1; g.data.legendary = true; return '你的孩子被仙门看中，你也因此扬名。魅力+1'; } }] },
    ],
    late_life: [
      { id: 'l2', icon: '📜', title: '传承弟子', desc: '是时候将毕生所学传授给后人了。', condition: d => d.realm >= 2, choices: [{ text: '收徒传道', effect: g => { const discipleName = pick(NPC_NAMES_MALE.concat(NPC_NAMES_FEMALE)); g.addRelationship(discipleName, 'disciple', 70); g.data.legendary = true; g.data.attrs.cha += 1; return `你收${discipleName}为徒，将毕生所学倾囊相授。魅力+1`; } }, { text: '封存秘典', effect: g => { g.data.gold += 100; return '你将修炼心得封存于秘典之中。金币+100'; } }] },
      { id: 'l3', icon: '🌸', title: '尘缘回首', desc: '晚年时分，你回首一生的经历。', choices: [{ text: '问心无愧', effect: g => { const companionRel = g.getRelationship('companion'); if (companionRel) { g.data.attrs.cha += 1; return `有道侣${companionRel.name}相伴，此生无憾。魅力+1`; } return '虽有遗憾，但也算精彩。'; } }, { text: '闭关参悟', effect: g => { g.data.attrs.int += 1; return '你在闭关中参悟生死，心境更加圆满。智力+1'; } }] },
      // 新增老年事件
      { id: 'l4', icon: '📕', title: '著书立说', desc: '你决定将毕生修行经验著成书。', choices: [{ text: '撰写修仙志', effect: g => { g.data.attrs.int += 1; g.data.legendary = true; const gold = g.hasTalent('merchant_eye') ? 200 : 100; g.data.gold += gold; return `你的著作广受好评，流传后世。智力+1，金币+${gold}`; } }, { text: '秘传心法', effect: g => { const disciple = g.getRelationship('disciple'); if (disciple) { g.modifyAffinity(disciple.name, 30); return `你将心法秘传给徒弟${disciple.name}，师徒情谊更深。`; } g.data.attrs.spr += 1; return '你将心法封印，等待有缘人。灵根+1'; } }] },
      { id: 'l5', icon: '🌅', title: '日落黄昏', desc: '你独自坐在山巅，看着日落。', choices: [{ text: '感悟大道', effect: g => { g.data.attrs.spr += 1; g.data.attrs.int += 1; return '在日落中，你感悟到了生死轮回的真谛。灵根+1，智力+1'; } }, { text: '回忆往昔', effect: g => { const relCount = (g.data.relationships || []).length; if (relCount >= 3) { g.data.attrs.cha += 2; return '回忆中满是温暖的面孔，你此生无憾。魅力+2'; } g.data.attrs.cha += 1; return '往事如烟，你心中泛起一丝惆怅。魅力+1'; } }] },
      { id: 'l6', icon: '👻', title: '亡灵来访', desc: '一位已故的故人以魂魄形态来见你。', choices: [{ text: '与之交谈', effect: g => { const master = g.getRelationship('master'); if (master) { g.data.attrs.spr += 2; return `师父${master.name}的亡灵传授了你最后的秘法。灵根+2`; } g.data.attrs.int += 1; return '故人的话语让你领悟良多。智力+1'; } }, { text: '助其安息', effect: g => { g.data.attrs.cha += 1; g.data.attrs.luk += 1; return '你帮助亡灵安息，积累了功德。魅力+1，运气+1'; } }] },
      { id: 'l7', icon: '🔥', title: '涅槃重生', desc: '你感受到体内有一股毁灭与新生的力量。', condition: d => d.realm >= 3, choices: [{ text: '接纳涅槃', effect: g => { if (g.hasTalent('undying') || g.getAttrWithTalent('spr') >= 8) { g.data.attrs.str += 2; g.data.attrs.spr += 1; return '你浴火涅槃，脱胎换骨！体质+2，灵根+1'; } g.data.attrs.str += 1; return '涅槃之力未能完全掌控，但你变得更强了。体质+1'; } }, { text: '压制力量', effect: g => { g.data.attrs.int += 1; return '你选择压制这股力量，保持现状。智力+1'; } }] },
      { id: 'l8', icon: '☁️', title: '天道感悟', desc: '你在冥想中触摸到了天道的边缘。', condition: d => d.realm >= 4, choices: [{ text: '全力感悟', effect: g => { g.data.attrs.spr += 2; g.data.attrs.int += 1; g.data.cultivationBonus = (g.data.cultivationBonus || 0) + 2; return '你彻底参悟天道一角，修为大进！灵根+2，智力+1'; } }, { text: '与天道共鸣', effect: g => { g.data.legendary = true; g.data.attrs.spr += 1; return '你与天道共鸣，名号将被铭刻在天道之中。灵根+1'; } }] },
      // 负面老年事件
      { id: 'l9', icon: '💀', title: '寿元将尽', desc: '你感到生命力在不断流逝。', choices: [{ text: '以术续命', effect: g => { if (g.data.gold >= 200 && g.data.realm >= 3) { g.data.gold -= 200; return '你用珍稀灵药延续了寿元。金币-200'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 2); return '大限将至，体力急剧衰退。体质-2'; } }, { text: '坦然接受', effect: g => { g.data.attrs.int += 1; g.data.attrs.cha += 1; return '你坦然面对生死，心境反而圆满。智力+1，魅力+1'; } }] },
      { id: 'l10', icon: '⚔️', title: '仇家寻仇', desc: '多年前结下的仇怨，对方终于找上门来。', choices: [{ text: '决一死战', effect: g => { if (g.getAttrWithTalent('str') + g.data.realm * 2 >= 12) { g.data.attrs.str += 1; g.data.rivalDefeated = true; return '你宝刀未老，一战定胜负！体质+1'; } if (Math.random() < 0.2) { g.data.killedInBattle = true; return '你年老体衰，不敌仇家…'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 2); return '虽然活下来了，但伤势严重。体质-2'; } }, { text: '以和为贵', effect: g => { if (g.getAttrWithTalent('cha') >= 7) { g.data.attrs.cha += 1; return '你以德化怨，仇家最终释怀。魅力+1'; } const loss = Math.min(g.data.gold, randomInt(50, 100)); g.data.gold -= loss; return `你赔偿了${loss}金币，暂时化解了恩怨。`; } }] },
    ],
  };

  // ==================== LifeSimGame ====================

  class LifeSimGame {
    constructor() {
      this.data = null;
      this.log = [];
      this.eventQueue = [];
      this.usedEvents = new Set();
      this.activeSlot = null;
    }

    // --- 存档迁移 ---
    static migrateOldSave() {
      const old = Storage.get('game_lifesim_save');
      if (old && !Storage.get('game_lifesim_save_1')) {
        Storage.set('game_lifesim_save_1', old);
        Storage.remove('game_lifesim_save');
      }
    }

    static getSlotInfo(slot) {
      const saved = Storage.get('game_lifesim_save_' + slot);
      if (!saved || !saved.data) return null;
      const d = saved.data;
      return {
        name: d.name,
        realm: CULTIVATION_REALMS[d.realm]?.name || '凡人',
        age: d.age || 0,
      };
    }

    createCharacter(name, attrs, talents) {
      this.data = {
        name,
        age: 0,
        attrs: { ...attrs },
        realm: 0,
        gold: 0,
        canCultivate: false,
        inSect: false,
        hasSect: false,
        companion: false,
        demonPath: false,
        madness: false,
        killedInBattle: false,
        legendary: false,
        friends: 0,
        cultivationBonus: 0,
        talents: talents || [],
        relationships: [],
        rivalDefeated: false,
        eventCount: 0,
        cultivationExp: 0,
        path: 'none',
        sect: null,
        items: [],
        activeChains: [],
        completedChains: [],
        eventsSinceAction: 0,
        challengeMode: null,
        breakPillActive: false,
        shieldActive: false,
        // 道途
        daoPath: null,
        // 血脉
        bloodline: 'human',
        // 家族
        children: [],
        // 世界纪元
        worldEra: 'normal',
        // NG+
        ngPlusLevel: 0,
      };

      // 应用天赋初始效果
      for (const tid of this.data.talents) {
        const t = TALENTS_MAP[tid];
        if (!t) continue;
        if (t.effect.str) this.data.attrs.str += t.effect.str;
        if (t.effect.int) this.data.attrs.int += t.effect.int;
        if (t.effect.cha) this.data.attrs.cha += t.effect.cha;
        if (t.effect.luk) this.data.attrs.luk += t.effect.luk;
        if (t.effect.spr) this.data.attrs.spr += t.effect.spr;
        if (t.effect.allAttr) {
          for (const k of Object.keys(this.data.attrs)) {
            this.data.attrs[k] += t.effect.allAttr;
          }
        }
      }

      // 仙缘联动: 检查跨游戏奖励
      if (typeof CrossGameRewards !== 'undefined') {
        var lsRewards = CrossGameRewards.checkAndClaim('lifesim');
        var lsData = this.data;
        lsRewards.forEach(function(r) {
          if (r.reward.type === 'stat_bonus') {
            for (var k in lsData.attrs) { lsData.attrs[k] += r.reward.value; }
          }
        });
      }

      // 仙缘兑换: 永久加成
      var lsBonuses = Storage.get('xianyuan_lifesim_bonuses', { luck: 0 });
      if (lsBonuses.luck > 0) {
        this.data.attrs.luck = (this.data.attrs.luck || 0) + lsBonuses.luck;
      }

      this.log = [];
      this.usedEvents = new Set();
      // Birthplace event
      const birthEvent = EVENTS.childhood[0];
      const bp = birthEvent.birthplaces[Math.floor(Math.random() * birthEvent.birthplaces.length)];
      birthEvent.effect(this, bp);

      // Three-life memory check (Phase 5G)
      const pastLife = getLastMemory();
      if (pastLife) {
        this.data._pastLife = pastLife;
        // Small attribute bonus from past life
        if (pastLife.realm >= 3) {
          this.data.attrs.spr = Math.min(10, this.data.attrs.spr + 1);
        }
        if (pastLife.realm >= 5) {
          this.data.attrs.int = Math.min(10, this.data.attrs.int + 1);
        }
      }
    }

    // --- 天赋系统 ---
    static rollTalents() {
      const count = Math.random() < 0.3 ? 3 : 2;
      const shuffled = [...TALENTS];
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      return shuffled.slice(0, count).map(t => t.id);
    }

    hasTalent(id) {
      return this.data && this.data.talents && this.data.talents.includes(id);
    }

    getAttrWithTalent(attr) {
      if (!this.data) return 0;
      return this.data.attrs[attr] || 0;
    }

    clampAttrs() {
      if (!this.data || !this.data.attrs) return;
      for (const key of Object.keys(this.data.attrs)) {
        this.data.attrs[key] = Math.min(MAX_ATTR, Math.max(0, this.data.attrs[key]));
      }
    }

    // --- 修为系统 ---
    gainCultivationExp() {
      if (this.data.realm === 0 || this.data.realm >= 6) return 0;
      const base = 5;
      const sprBonus = this.getAttrWithTalent('spr') * 2;
      const intBonus = this.getAttrWithTalent('int');
      const cultBonus = (this.data.cultivationBonus || 0) * 3;
      let exp = base + sprBonus + intBonus + cultBonus;
      // 道途加成
      if (this.data.daoPath === 'demonic') exp = Math.floor(exp * 1.3);
      // 世界纪元加成
      const era = WORLD_ERAS_MAP[this.data.worldEra];
      if (era && era.effect.expMul) exp = Math.floor(exp * era.effect.expMul);
      // NG+修为加成
      const ngData = LifeSimGame.getNgPlusData();
      const ngExpLevel = (ngData.perks && ngData.perks.ng_exp) || 0;
      if (ngExpLevel > 0) exp = Math.floor(exp * (1 + ngExpLevel * 0.20));
      const max = REALM_EXP[this.data.realm];
      this.data.cultivationExp = Math.min((this.data.cultivationExp || 0) + exp, max);
      return exp;
    }

    canBreakthrough() {
      if (this.data.realm === 0 || this.data.realm >= 6) return false;
      return (this.data.cultivationExp || 0) >= REALM_EXP[this.data.realm];
    }

    _generateBreakthroughEvent() {
      const nextRealm = CULTIVATION_REALMS[this.data.realm + 1];
      const isFinal = this.data.realm === 5;
      return {
        icon: isFinal ? '⚡' : '⬆️',
        title: isFinal ? '天劫降临' : '突破契机',
        desc: isFinal
          ? '修炼至巅峰的你，迎来了天劫的考验。渡过天劫即可飞升成仙！'
          : `你的修为已积累至极限，${nextRealm.name}境就在眼前！`,
        important: true,
        choices: [
          { text: isFinal ? '渡劫飞升' : '闭关突破', isBreakthroughAttempt: true, effect: () => '' },
          { text: '继续积累', effect: g => { g.data.cultivationExp = Math.floor(g.data.cultivationExp * 0.8); g.data.attrs.int += 1; return '你选择厚积薄发，修为略有回落但根基更稳。智力+1'; } }
        ]
      };
    }

    // --- 事件链系统 ---
    _abandonChain(chainId) {
      if (!this.data.activeChains) return;
      this.data.activeChains = this.data.activeChains.filter(c => c.id !== chainId);
    }

    _advanceChainCountdowns() {
      if (!this.data.activeChains) return;
      for (const chain of this.data.activeChains) {
        if (chain.countdown > 0) chain.countdown--;
      }
    }

    _checkNewChains() {
      if (!this.data.activeChains) this.data.activeChains = [];
      if (!this.data.completedChains) this.data.completedChains = [];
      for (const chain of EVENT_CHAINS) {
        if (this.data.activeChains.some(c => c.id === chain.id)) continue;
        if (this.data.completedChains.includes(chain.id)) continue;
        if (chain.startCondition(this.data) && Math.random() < chain.startChance) {
          this.data.activeChains.push({ id: chain.id, step: 0, countdown: 0 });
          break;
        }
      }
    }

    _getReadyChainEvent() {
      if (!this.data.activeChains || this.data.activeChains.length === 0) return null;
      // Iterate backwards to avoid skipping elements when splicing
      for (let i = this.data.activeChains.length - 1; i >= 0; i--) {
        const chain = this.data.activeChains[i];
        if (chain.countdown <= 0) {
          const chainDef = EVENT_CHAINS_MAP[chain.id];
          if (!chainDef || chain.step >= chainDef.steps.length) {
            this.data.activeChains.splice(i, 1);
            continue;
          }
          const step = chainDef.steps[chain.step];
          const event = { icon: step.icon, title: step.title, desc: step.desc, choices: step.choices, chainName: chainDef.name, chainStep: chain.step + 1, chainTotal: chainDef.steps.length };
          chain.step++;
          if (chain.step >= chainDef.steps.length) {
            if (!this.data.completedChains) this.data.completedChains = [];
            this.data.completedChains.push(chain.id);
            this.data.activeChains.splice(i, 1);
          } else {
            chain.countdown = chainDef.steps[chain.step].gap || 3;
          }
          return event;
        }
      }
      return null;
    }

    // --- 门派系统 ---
    _generateSectChoiceEvent() {
      return {
        icon: '🏯', title: '选择门派',
        desc: '作为仙门弟子，你需要选择一个门派专修。',
        choices: SECTS.map(s => ({
          text: `${s.icon} ${s.name}`,
          effect: g => {
            g.data.sect = s.id;
            g.data.attrs[s.bonus] += s.bonusVal;
            if (s.expMod) g.data.cultivationBonus = (g.data.cultivationBonus || 0) + s.expMod;
            return `加入${s.name}！${s.desc}。${ATTR_NAMES[s.bonus]}+${s.bonusVal}`;
          }
        }))
      };
    }

    _generateDaoPathEvent() {
      return {
        icon: '☯️',
        title: '道途抉择',
        desc: '你的修为已到了关键时刻，必须选择自己的道途。这将影响你此后的修仙之路。',
        important: true,
        choices: DAO_PATHS.map(p => ({
          text: `${p.icon} ${p.name} — ${p.desc}`,
          effect: g => {
            g.data.daoPath = p.id;
            if (p.bonus) {
              for (const [k, v] of Object.entries(p.bonus)) {
                if (g.data.attrs[k] !== undefined) g.data.attrs[k] += v;
              }
            }
            return `你选择了${p.name}，${p.desc}`;
          }
        })),
      };
    }

    // --- 物品系统 ---
    addItem(itemId, count) {
      if (!this.data.items) this.data.items = [];
      const existing = this.data.items.find(it => it.id === itemId);
      if (existing) { existing.count += (count || 1); }
      else { this.data.items.push({ id: itemId, count: count || 1 }); }
    }

    removeItem(itemId, count) {
      if (!this.data.items) return;
      const existing = this.data.items.find(it => it.id === itemId);
      if (existing) {
        existing.count -= (count || 1);
        if (existing.count <= 0) this.data.items = this.data.items.filter(it => it.id !== itemId);
      }
    }

    getItemCount(itemId) {
      if (!this.data.items) return 0;
      const it = this.data.items.find(i => i.id === itemId);
      return it ? it.count : 0;
    }

    useItem(itemId) {
      if (this.getItemCount(itemId) <= 0) return null;
      const def = GAME_ITEMS_MAP[itemId];
      if (!def) return null;
      this.removeItem(itemId);
      return def.useEffect(this);
    }

    // --- 结局图鉴 ---
    static recordEnding(endingId) {
      const achieved = Storage.get('lifesim_ending_gallery', []);
      if (!achieved.includes(endingId)) {
        achieved.push(endingId);
        Storage.set('lifesim_ending_gallery', achieved);
      }
    }

    // --- 人际关系系统 ---
    addRelationship(name, type, affinity) {
      if (!this.data) return;
      if (!this.data.relationships) this.data.relationships = [];
      // 避免重复名字
      const existing = this.data.relationships.find(r => r.name === name);
      if (existing) {
        existing.affinity = Math.min(100, Math.max(-100, existing.affinity + (affinity || 0)));
        existing.type = type;
        return;
      }
      this.data.relationships.push({ name, type, affinity: affinity || 0 });
    }

    modifyAffinity(name, delta) {
      if (!this.data || !this.data.relationships) return;
      const rel = this.data.relationships.find(r => r.name === name);
      if (rel) rel.affinity = Math.min(100, Math.max(-100, rel.affinity + delta));
    }

    hasRelationship(type) {
      if (!this.data || !this.data.relationships) return false;
      return this.data.relationships.some(r => r.type === type);
    }

    getRelationship(type) {
      if (!this.data || !this.data.relationships) return null;
      return this.data.relationships.find(r => r.type === type) || null;
    }

    getStage() {
      for (const s of STAGES) {
        if (this.data.age >= s.minAge && this.data.age <= s.maxAge) return s;
      }
      return STAGES[STAGES.length - 1];
    }

    getMaxLifespan() {
      let lifespan = CULTIVATION_REALMS[this.data.realm].lifespan;
      if (this.hasTalent('undying')) {
        lifespan = Math.floor(lifespan * 1.3);
      }
      // 佛道加成
      if (this.data.daoPath === 'buddhist') {
        lifespan = Math.floor(lifespan * 1.2);
      }
      // 血脉加成
      const bl = BLOODLINES_MAP[this.data.bloodline];
      if (bl && bl.lifespanBonus) {
        lifespan = Math.floor(lifespan * (1 + bl.lifespanBonus));
      }
      // NG+寿命加成
      const ngData = LifeSimGame.getNgPlusData();
      const ngLifeLevel = (ngData.perks && ngData.perks.ng_life) || 0;
      if (ngLifeLevel > 0) {
        lifespan = Math.floor(lifespan * (1 + ngLifeLevel * 0.10));
      }
      // 世界纪元加成
      const era = WORLD_ERAS_MAP[this.data.worldEra];
      if (era && era.effect.lifespanBonus) {
        lifespan = Math.floor(lifespan * (1 + era.effect.lifespanBonus));
      }
      return lifespan;
    }

    isAlive() {
      if (this.data.killedInBattle || this.data.madness) return false;
      if (this.data.challengeMode === 'speedrun' && this.data.age > 50 && this.data.realm < 6) return false;
      return this.data.age < this.getMaxLifespan();
    }

    getNextEvent() {
      // 凡人挑战：禁止修仙相关事件
      if (this.data.challengeMode === 'mortal') {
        this.data.canCultivate = false;
      }

      // 修为满了优先触发突破
      if (this.canBreakthrough() && Math.random() < 0.7) {
        return this._generateBreakthroughEvent();
      }

      // 门派选择（入门后一次性）
      if (this.data.realm >= 1 && this.data.inSect && !this.data.sect) {
        return this._generateSectChoiceEvent();
      }

      // 道途选择（修炼到筑基后一次性）
      if (this.data.realm >= 2 && !this.data.daoPath) {
        return this._generateDaoPathEvent();
      }

      // 事件链优先
      const chainEvent = this._getReadyChainEvent();
      if (chainEvent) return chainEvent;

      const age = this.data.age;
      let pool = [];

      if (age <= 6) pool = EVENTS.childhood.slice(1); // skip birth
      else if (age <= 15) pool = EVENTS.youth;
      else if (age <= 30) pool = EVENTS.young_adult;
      else if (age <= 120) pool = EVENTS.middle_age;
      else pool = EVENTS.late_life;

      // Filter by condition and not used
      const available = pool.filter(e => {
        if (this.usedEvents.has(e.id)) return false;
        if (e.condition && !e.condition(this.data)) return false;
        return true;
      });

      // Prioritize important events
      const important = available.filter(e => e.important);
      if (important.length > 0) return important[Math.floor(Math.random() * important.length)];

      if (available.length === 0) return this._generateFiller();

      // 铁人模式：40%概率触发填充事件（含大量负面）
      if (this.data.challengeMode === 'ironman' && Math.random() < 0.4) {
        return this._generateFiller();
      }

      return available[Math.floor(Math.random() * available.length)];
    }

    _generateFiller() {
      const age = this.data.age;
      const realm = this.data.realm;
      const pool = [];

      // === 凡人填充事件 ===
      if (realm === 0) {
        pool.push(
          { icon: '🌾', title: '平静生活', desc: '日子平静地过去了。', choices: [{ text: '继续生活', effect: g => { let gold = randomInt(5, 20); if (g.hasTalent('golden_touch')) gold = Math.floor(gold * 1.5); g.data.gold += gold; return `你安稳过日子，积攒了些金币。金币+${gold}`; } }] },
          { icon: '🎉', title: '庆典', desc: '小镇举办了一场庆典。', choices: [{ text: '参加', effect: g => { g.data.attrs.cha += 1; return '你在庆典上结交了朋友。魅力+1'; } }, { text: '在家休息', effect: g => { g.data.gold += 10; return '你安心在家，存了些钱。金币+10'; } }] },
          // 负面：疾病
          { icon: '🤧', title: '染上风寒', desc: '换季时节，你不幸染上了风寒。', choices: [{ text: '卧床休养', effect: g => { if (g.hasTalent('poison_immune')) return '你体质特殊，很快便痊愈了。'; g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '养了许久才好，身体有些虚弱。体质-1'; } }, { text: '花钱看病', effect: g => { if (g.data.gold >= 15) { g.data.gold -= 15; return '花了15金币请大夫看病，很快痊愈。金币-15'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '没钱看病，只能硬扛。体质-1'; } }] },
          // 负面：被盗
          { icon: '🦹', title: '夜间失窃', desc: '一觉醒来，发现家中遭了贼。', choices: [{ text: '报官', effect: g => { const loss = Math.min(g.data.gold, randomInt(10, 30)); g.data.gold -= loss; return loss > 0 ? `官府无能，只追回部分。损失${loss}金币。` : '你本就身无分文，贼也白跑一趟。'; } }, { text: '自认倒霉', effect: g => { const loss = Math.min(g.data.gold, randomInt(15, 40)); g.data.gold -= loss; g.data.attrs.luk = Math.max(1, g.data.attrs.luk - 1); return `损失了${loss}金币，心情低落。运气-1`; } }] },
          // 负面：旱灾
          { icon: '☀️', title: '旱灾', desc: '连月不雨，庄稼枯死，粮价飞涨。', choices: [{ text: '节衣缩食', effect: g => { g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '饥饿让你消瘦了不少。体质-1'; } }, { text: '外出谋生', effect: g => { if (g.getAttrWithTalent('luk') >= 5) { g.data.gold += 20; return '你在外地找到了活计。金币+20'; } g.data.gold = Math.max(0, g.data.gold - 10); return '外面也不好过，还花了盘缠。金币-10'; } }] },
          // 负面：被骗
          { icon: '🎭', title: '江湖骗子', desc: '一个油嘴滑舌的人向你兜售"仙丹"。', choices: [{ text: '购买仙丹', effect: g => { if (g.getAttrWithTalent('int') >= 6) return '你识破了骗局，不予理睬。'; const loss = Math.min(g.data.gold, randomInt(20, 50)); g.data.gold -= loss; return `那不过是泥丸子！被骗了${loss}金币。`; } }, { text: '不理会', effect: () => '你转身离开，没有上当。' }] },
          // 中性
          { icon: '🌧️', title: '连日阴雨', desc: '阴雨绵绵，只能待在家中。', choices: [{ text: '读书解闷', effect: g => { g.data.attrs.int += 1; return '你趁此机会读了不少书。智力+1'; } }, { text: '练功健体', effect: g => { g.data.attrs.str += 1; return '你在室内坚持锻炼。体质+1'; } }] },
          // 负面：受伤
          { icon: '🦴', title: '意外摔伤', desc: '你不小心从高处摔下，伤了筋骨。', choices: [{ text: '好好养伤', effect: g => { if (g.hasTalent('poison_immune')) { return '你恢复力惊人，很快就好了。'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '伤筋动骨一百天，体质受损。体质-1'; } }, { text: '忍痛活动', effect: g => { g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); g.data.attrs.luk = Math.max(1, g.data.attrs.luk - 1); return '伤势加重了…体质-1，运气-1'; } }] },
          // 正面
          { icon: '🍀', title: '路遇贵人', desc: '路上遇到一位慷慨的长者。', choices: [{ text: '与其攀谈', effect: g => { if (g.getAttrWithTalent('cha') >= 5) { g.data.gold += 30; g.data.attrs.cha += 1; return '长者赏识你，赠你银两。魅力+1，金币+30'; } g.data.gold += 10; return '长者给了你一些路费。金币+10'; } }, { text: '匆匆而过', effect: () => '你行色匆匆，错过了这次缘分。' }] },
          // 负面：瘟疫
          { icon: '💀', title: '瘟疫蔓延', desc: '附近村镇爆发了瘟疫。', choices: [{ text: '帮助救治', effect: g => { g.data.attrs.cha += 1; if (!g.hasTalent('poison_immune') && Math.random() < 0.4) { g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '你帮助了很多人，但自己也染上了病。魅力+1，体质-1'; } return '你帮助救治了不少病人，赢得了尊敬。魅力+1'; } }, { text: '躲避瘟疫', effect: g => { g.data.attrs.cha = Math.max(1, g.data.attrs.cha - 1); return '你逃离了疫区，但邻里对你颇有微词。魅力-1'; } }] },
          // 中性
          { icon: '🎲', title: '赌坊诱惑', desc: '朋友拉你去赌坊试试手气。', choices: [{ text: '小赌一把', effect: g => { if (g.getAttrWithTalent('luk') >= 6) { const win = randomInt(20, 60); g.data.gold += win; return `手气极好，赢了${win}金币！`; } const loss = Math.min(g.data.gold, randomInt(15, 40)); g.data.gold -= loss; return `手气不佳，输了${loss}金币。`; } }, { text: '拒绝赌博', effect: g => { g.data.attrs.int += 1; return '你明智地拒绝了。智力+1'; } }] },
        );
      }

      // === 修仙者填充事件 ===
      if (realm >= 1) {
        pool.push(
          { icon: '🧘', title: '潜心修炼', desc: '你找到一处灵气充裕之地修炼。', choices: [{ text: '打坐修炼', effect: g => { g.data.attrs.spr += 1; return '你的修为有所精进。灵根+1'; } }] },
          { icon: '💰', title: '坊市交易', desc: '你在坊市中发现了一些好东西。', choices: [{ text: '购买物资', effect: g => { if (g.data.gold >= 50) { g.data.gold -= 50; g.data.attrs.str += 1; return '你购买了灵丹妙药。体质+1'; } return '金币不足，空手而归。'; } }, { text: '出售多余', effect: g => { let gold = randomInt(20, 50); if (g.hasTalent('merchant_eye')) gold *= 2; g.data.gold += gold; return `出售了多余物资。金币+${gold}`; } }] },
          // 负面：走火入魔
          { icon: '😵', title: '修炼偏差', desc: '修炼中灵气运行失控！', choices: [{ text: '强行镇压', effect: g => { if (g.hasTalent('dao_heart')) return '你道心坚定，轻松化解了偏差。'; if (g.getAttrWithTalent('int') >= 7) { return '你凭借过人悟性，及时调整了功法运行。'; } g.data.attrs.spr = Math.max(1, g.data.attrs.spr - 1); return '虽然稳住了，但修为受损。灵根-1'; } }, { text: '散功重修', effect: g => { g.data.attrs.spr = Math.max(1, g.data.attrs.spr - 2); g.data.attrs.int += 1; return '你散去部分修为重头修炼，虽有损失但基础更稳。灵根-2，智力+1'; } }] },
          // 负面：被偷袭
          { icon: '🗡️', title: '散修偷袭', desc: '一个实力不弱的散修向你发起偷袭！', choices: [{ text: '奋力反击', effect: g => { if (g.getAttrWithTalent('str') + g.data.realm * 2 >= 8) { g.data.gold += 40; g.data.attrs.str += 1; return '你击退了偷袭者，还缴获了他的灵石。体质+1，金币+40'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); const loss = Math.min(g.data.gold, randomInt(20, 50)); g.data.gold -= loss; return `你不敌对方，被抢走了灵石。体质-1，金币-${loss}`; } }, { text: '以速脱身', effect: g => { if (g.getAttrWithTalent('luk') >= 5) return '你身法灵活，成功脱险。'; const loss = Math.min(g.data.gold, randomInt(10, 30)); g.data.gold -= loss; return `逃跑中丢失了一些灵石。金币-${loss}`; } }] },
          // 负面：天劫余波
          { icon: '⛈️', title: '灵气紊乱', desc: '远处有大能渡劫，引发方圆百里灵气紊乱。', choices: [{ text: '趁机吸收', effect: g => { if (g.getAttrWithTalent('spr') >= 6) { g.data.attrs.spr += 1; return '你在紊乱的灵气中找到了规律！灵根+1'; } g.data.attrs.spr = Math.max(1, g.data.attrs.spr - 1); return '紊乱的灵气伤了你的经脉。灵根-1'; } }, { text: '封闭窍穴', effect: () => '你封闭窍穴等待灵气恢复，平安无事。' }] },
          // 负面：丹药副作用
          { icon: '💊', title: '丹毒侵体', desc: '之前服用的丹药产生了副作用。', choices: [{ text: '以毒攻毒', effect: g => { if (g.hasTalent('poison_immune')) return '你万毒不侵，丹毒自然化解。'; if (Math.random() < 0.5) { g.data.attrs.str += 1; return '你成功逼出丹毒，体质反而增强。体质+1'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); g.data.attrs.spr = Math.max(1, g.data.attrs.spr - 1); return '丹毒更加严重了。体质-1，灵根-1'; } }, { text: '闭关调息', effect: g => { g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '花费大量时间调理，虽然康复但耽误了修炼。体质-1'; } }] },
          // 负面：宗门勒索
          { icon: '🏴', title: '魔修勒索', desc: '一群魔修截住你，索要过路费。', choices: [{ text: '交钱了事', effect: g => { const loss = Math.min(g.data.gold, randomInt(30, 80)); g.data.gold -= loss; return `你忍气吞声，交了${loss}金币保命。`; } }, { text: '拼死一战', effect: g => { if (g.getAttrWithTalent('str') + g.data.realm * 2 >= 10) { g.data.attrs.str += 1; g.data.gold += 60; return '你以一敌众，击退魔修！体质+1，金币+60'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); const loss = Math.min(g.data.gold, randomInt(40, 80)); g.data.gold -= loss; return `寡不敌众，被打伤抢劫。体质-1，金币-${loss}`; } }] },
          // 中性
          { icon: '🌙', title: '月夜悟道', desc: '月光如水，你在月下感悟天地。', choices: [{ text: '静心感悟', effect: g => { g.data.attrs.int += 1; return '月光洗涤心灵，你有所领悟。智力+1'; } }, { text: '运功修炼', effect: g => { g.data.attrs.spr += 1; return '月华灵气入体，修为微增。灵根+1'; } }] },
          // 负面：心魔
          { icon: '👹', title: '心魔来袭', desc: '修炼中，你的心魔突然出现。', choices: [{ text: '直面心魔', effect: g => { if (g.hasTalent('dao_heart')) { g.data.attrs.spr += 1; g.data.attrs.int += 1; return '道心坚定，心魔不攻自破！灵根+1，智力+1'; } if (g.getAttrWithTalent('int') >= 6) { g.data.attrs.int += 1; return '你以智慧战胜了心魔。智力+1'; } g.data.attrs.int = Math.max(1, g.data.attrs.int - 1); g.data.attrs.spr = Math.max(1, g.data.attrs.spr - 1); return '心魔缠绕，你精神恍惚了很久。智力-1，灵根-1'; } }, { text: '服用定心丹', effect: g => { if (g.data.gold >= 30) { g.data.gold -= 30; return '定心丹的药力压制了心魔。金币-30'; } g.data.attrs.int = Math.max(1, g.data.attrs.int - 1); return '没有定心丹，心魔肆虐。智力-1'; } }] },
          // 正面
          { icon: '🌺', title: '灵泉涌现', desc: '你发现了一处天然灵泉。', choices: [{ text: '浸泡修炼', effect: g => { g.data.attrs.spr += 1; g.data.attrs.str += 1; return '灵泉洗涤身心，你感觉焕然一新。灵根+1，体质+1'; } }, { text: '收集灵泉水', effect: g => { const gold = g.hasTalent('merchant_eye') ? 80 : 40; g.data.gold += gold; return `灵泉水价值不菲。金币+${gold}`; } }] },
          // 负面：被算计
          { icon: '🕸️', title: '同门算计', desc: '你发现有人在暗中算计你。', choices: [{ text: '当面对质', effect: g => { if (g.getAttrWithTalent('cha') >= 6) { g.data.attrs.cha += 1; return '你以理服人，对方灰溜溜地走了。魅力+1'; } g.data.attrs.cha = Math.max(1, g.data.attrs.cha - 1); return '对方倒打一耙，你反被孤立。魅力-1'; } }, { text: '隐忍不发', effect: g => { g.data.attrs.int += 1; return '你暗中提防，等待时机。智力+1'; } }] },
        );
      }

      // === 老年专属负面填充 ===
      if (age >= 80) {
        pool.push(
          { icon: '⏳', title: '岁月侵蚀', desc: '你感到时光的重量压在身上。', choices: [{ text: '坦然面对', effect: g => { g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); g.data.attrs.int += 1; return '虽然体力衰退，但心境更加通达。体质-1，智力+1'; } }, { text: '服用驻颜丹', effect: g => { if (g.data.gold >= 50) { g.data.gold -= 50; return '丹药暂时缓解了衰老。金币-50'; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '没有丹药，只能任由衰老。体质-1'; } }] },
          { icon: '😔', title: '故人离世', desc: '一位老友先你一步离开了人世。', choices: [{ text: '送别故人', effect: g => { g.data.attrs.cha += 1; return '你送了故人最后一程。魅力+1'; } }, { text: '闭门不出', effect: g => { g.data.attrs.int += 1; return '悲痛之余，你对生死有了更深的理解。智力+1'; } }] },
        );
      }

      return pool[Math.floor(Math.random() * pool.length)];
    }

    advanceYears() {
      let advance;
      if (this.data.age <= 6) advance = randomInt(1, 3);
      else if (this.data.age <= 15) advance = randomInt(1, 3);
      else if (this.data.age <= 60) advance = randomInt(2, 8);
      else advance = randomInt(5, 20);

      this.data.age += advance;

      // 老年属性自然衰退
      if (this.data.age >= 100 && this.data.realm <= 2) {
        if (Math.random() < 0.3) {
          this.data.attrs.str = Math.max(1, this.data.attrs.str - 1);
          this.log.push(`<span class="log-age">[${this.data.age}岁]</span> 岁月不饶人，你的体力开始衰退。体质-1`);
        }
      } else if (this.data.age >= 200 && this.data.realm <= 3) {
        if (Math.random() < 0.2) {
          this.data.attrs.str = Math.max(1, this.data.attrs.str - 1);
          this.log.push(`<span class="log-age">[${this.data.age}岁]</span> 寿元消耗，体质下降。体质-1`);
        }
      }

      // Natural gold gain
      let goldGain = randomInt(0, 5);
      if (this.hasTalent('golden_touch')) goldGain = Math.floor(goldGain * 1.5);
      // 麒麟血脉金币加成
      const bl = BLOODLINES_MAP[this.data.bloodline];
      if (bl && bl.goldBonus) goldGain = Math.floor(goldGain * (1 + bl.goldBonus));
      // 世界纪元金币加成
      const era = WORLD_ERAS_MAP[this.data.worldEra];
      if (era && era.effect.goldMul) goldGain = Math.floor(goldGain * era.effect.goldMul);
      // NG+金币加成
      const ngData = LifeSimGame.getNgPlusData();
      const ngGoldLevel = (ngData.perks && ngData.perks.ng_gold) || 0;
      if (ngGoldLevel > 0) goldGain = Math.floor(goldGain * (1 + ngGoldLevel * 0.15));
      this.data.gold += goldGain;
      this.data.eventCount = (this.data.eventCount || 0) + 1;
      this.clampAttrs();
      return advance;
    }

    getEnding() {
      // Check endings from highest score to lowest
      const sorted = [...ENDINGS].sort((a, b) => b.score - a.score);
      for (const ending of sorted) {
        if (ending.condition(this.data)) return ending;
      }
      // Fallback
      return ENDINGS_MAP['mortal'] || ENDINGS[1];
    }

    saveState() {
      if (!this.activeSlot) return;
      Storage.setImmediate('game_lifesim_save_' + this.activeSlot, {
        data: this.data,
        log: this.log.slice(-50),
        usedEvents: [...this.usedEvents],
      });
    }

    static loadState(slot) {
      return Storage.get('game_lifesim_save_' + slot);
    }

    static clearSave(slot) {
      Storage.remove('game_lifesim_save_' + slot);
    }

    restoreFrom(saved) {
      this.data = saved.data;
      this.log = saved.log || [];
      this.usedEvents = new Set(saved.usedEvents || []);
      // Migrate new fields
      if (!this.data.talents) this.data.talents = [];
      if (!this.data.relationships) this.data.relationships = [];
      if (this.data.eventCount === undefined) this.data.eventCount = 0;
      if (this.data.rivalDefeated === undefined) this.data.rivalDefeated = false;
      if (this.data.cultivationExp === undefined) this.data.cultivationExp = 0;
      if (!this.data.path) this.data.path = 'none';
      if (this.data.sect === undefined) this.data.sect = null;
      if (!this.data.items) this.data.items = [];
      if (!this.data.activeChains) this.data.activeChains = [];
      if (!this.data.completedChains) this.data.completedChains = [];
      if (this.data.eventsSinceAction === undefined) this.data.eventsSinceAction = 0;
      if (this.data.challengeMode === undefined) this.data.challengeMode = null;
      if (!this.data.daoPath) this.data.daoPath = null;
      if (!this.data.bloodline) this.data.bloodline = 'human';
      if (!this.data.children) this.data.children = [];
      if (!this.data.worldEra) this.data.worldEra = 'normal';
      if (this.data.ngPlusLevel === undefined) this.data.ngPlusLevel = 0;
    }

    // --- 成就统计 ---
    static updateAchievementStats(gameData, ending) {
      const stats = Storage.get('lifesim_achievement_stats', {
        totalRuns: 0,
        endings: [],
        maxAttr: 0,
        maxAge: 0,
        totalGold: 0,
        totalCompanions: 0,
        totalEvents: 0,
        maxRelationships: 0,
        mortalOldAge: false,
        fastAscend: false,
        masterAndDisciple: false,
        threeTalents: false,
      });

      stats.totalRuns = (stats.totalRuns || 0) + 1;
      if (!stats.endings) stats.endings = [];
      if (!stats.endings.includes(ending.id)) stats.endings.push(ending.id);

      const d = gameData;
      const maxA = Math.max(d.attrs.str, d.attrs.int, d.attrs.cha, d.attrs.luk, d.attrs.spr);
      stats.maxAttr = Math.max(stats.maxAttr || 0, maxA);
      stats.maxAge = Math.max(stats.maxAge || 0, d.age);
      stats.totalGold = (stats.totalGold || 0) + d.gold;
      stats.totalEvents = (stats.totalEvents || 0) + (d.eventCount || 0);

      if (d.companion) stats.totalCompanions = (stats.totalCompanions || 0) + 1;
      if (d.relationships) stats.maxRelationships = Math.max(stats.maxRelationships || 0, d.relationships.length);
      if (d.realm === 0 && d.age >= 70) stats.mortalOldAge = true;
      if (d.realm === 6 && d.age <= 30) stats.fastAscend = true;
      if (d.relationships) {
        const hasMaster = d.relationships.some(r => r.type === 'master');
        const hasDisciple = d.relationships.some(r => r.type === 'disciple');
        if (hasMaster && hasDisciple) stats.masterAndDisciple = true;
      }
      if (d.talents && d.talents.length >= 3) stats.threeTalents = true;

      // NG+统计
      if (d.ngPlusLevel >= 1) stats.ngPlusUsed = true;
      const ngData = LifeSimGame.getNgPlusData();
      if (ngData.perks) {
        for (const p of NG_PLUS_PERKS) {
          if ((ngData.perks[p.id] || 0) >= p.maxLevel) { stats.ngPlusMaxed = true; break; }
        }
      }
      // 血脉统计
      const bl = BLOODLINES_MAP[d.bloodline];
      if (bl && bl.rare) stats.rareBloodline = true;
      // 家族统计
      if (d.children && d.children.length > 0) stats.hasChildren = true;
      // 金币统计
      stats.maxGold = Math.max(stats.maxGold || 0, d.gold);
      // 纪元统计
      if (!stats.erasPlayed) stats.erasPlayed = [];
      if (d.worldEra && !stats.erasPlayed.includes(d.worldEra)) stats.erasPlayed.push(d.worldEra);

      Storage.set('lifesim_achievement_stats', stats);
      return stats;
    }

    static checkAchievements() {
      const stats = Storage.get('lifesim_achievement_stats', {});
      const unlocked = Storage.get('lifesim_achievements', []);
      const newlyUnlocked = [];

      for (const ach of LIFESIM_ACHIEVEMENTS) {
        if (unlocked.includes(ach.id)) continue;
        if (ach.condition(stats)) {
          unlocked.push(ach.id);
          newlyUnlocked.push(ach);
        }
      }

      if (newlyUnlocked.length > 0) {
        Storage.set('lifesim_achievements', unlocked);
      }
      return newlyUnlocked;
    }

    // --- 传承系统 ---
    static calcLegacyPoints(gameData, ending) {
      let pts = 0;
      pts += ending.score;
      pts += gameData.realm * 5;
      pts += Math.floor(gameData.age / 50);
      if (gameData.relationships) pts += gameData.relationships.length * 3;
      if (gameData.legendary) pts += 10;
      return pts;
    }

    static getLegacyData() {
      return Storage.get('lifesim_legacy', { points: 0, purchased: [] });
    }

    static saveLegacyData(data) {
      Storage.set('lifesim_legacy', data);
    }

    static addLegacyPoints(pts) {
      const data = LifeSimGame.getLegacyData();
      data.points = (data.points || 0) + pts;
      LifeSimGame.saveLegacyData(data);
      return data.points;
    }

    static purchaseLegacy(rewardId) {
      const data = LifeSimGame.getLegacyData();
      const reward = LEGACY_REWARDS_MAP[rewardId];
      if (!reward) return false;
      if (data.points < reward.cost) return false;
      if (!reward.repeatable && data.purchased.includes(rewardId)) return false;
      data.points -= reward.cost;
      data.purchased.push(rewardId);
      LifeSimGame.saveLegacyData(data);
      return true;
    }

    static hasLegacy(rewardId) {
      const data = LifeSimGame.getLegacyData();
      return data.purchased.includes(rewardId);
    }

    static getLegacyCount(rewardId) {
      const data = LifeSimGame.getLegacyData();
      return data.purchased.filter(id => id === rewardId).length;
    }

    // --- NG+系统 ---
    static getNgPlusData() {
      return Storage.get('lifesim_ngplus', { points: 0, perks: {} });
    }

    static saveNgPlusData(data) {
      Storage.set('lifesim_ngplus', data);
    }

    static addNgPlusPoints(pts) {
      const data = LifeSimGame.getNgPlusData();
      data.points = (data.points || 0) + pts;
      LifeSimGame.saveNgPlusData(data);
      return data.points;
    }

    static upgradeNgPlusPerk(perkId) {
      const data = LifeSimGame.getNgPlusData();
      const perk = NG_PLUS_PERKS_MAP[perkId];
      if (!perk) return false;
      if (!data.perks) data.perks = {};
      const curLevel = data.perks[perkId] || 0;
      if (curLevel >= perk.maxLevel) return false;
      const cost = perk.cost[curLevel];
      if ((data.points || 0) < cost) return false;
      data.points -= cost;
      data.perks[perkId] = curLevel + 1;
      LifeSimGame.saveNgPlusData(data);
      return true;
    }

    // --- 血脉觉醒 ---
    static rollBloodline() {
      // 10% chance for rare bloodline
      if (Math.random() < 0.10) {
        const rares = BLOODLINES.filter(b => b.rare);
        return rares[Math.floor(Math.random() * rares.length)].id;
      }
      return 'human';
    }

    // --- 世界纪元 ---
    static rollWorldEra() {
      // 60% normal, 40% special
      if (Math.random() < 0.40) {
        const specials = WORLD_ERAS.filter(e => e.id !== 'normal');
        return specials[Math.floor(Math.random() * specials.length)].id;
      }
      return 'normal';
    }
  }

  // ==================== LifeSimUI ====================

  class LifeSimUI {
    constructor() {
      this.startEl = document.getElementById('lifesim-start');
      this.gameEl = document.getElementById('lifesim-game');
      this.endingEl = document.getElementById('lifesim-ending');
      this.game = new LifeSimGame();
      this._floatingTextCount = 0;

      this.initSettings();
      LifeSimGame.migrateOldSave();
      this.renderSlotSelection();
    }

    initSettings() {
      this._autoSpeed = 1;
      this.settings = new SettingsModal([
        { key: 'autoAdvance', label: '自动推进', type: 'checkbox', default: false, checkLabel: '选择后自动推进时间' },
        { key: 'autoSpeed', label: '推进速度', type: 'select', default: '1',
          options: [
            { value: '1', label: '1x (正常)' },
            { value: '2', label: '2x (快速)' },
            { value: '5', label: '5x (极速)' }
          ]
        }
      ], 'settings_lifesim', (vals) => {
        this._autoSpeed = parseInt(vals.autoSpeed) || 1;
      });
      var savedSettings = Storage.get('settings_lifesim', {});
      this._autoSpeed = parseInt(savedSettings.autoSpeed) || 1;
    }

    _scheduleAutoAdvance(btnId) {
      if (this._autoAdvanceTimer) clearTimeout(this._autoAdvanceTimer);
      if (!this.settings || !this.settings.get('autoAdvance')) return;
      var speed = this._autoSpeed || 1;
      if (speed <= 0) return;
      var interval = Math.max(200, Math.floor(1500 / speed));
      this._autoAdvanceTimer = setTimeout(() => {
        const btn = document.getElementById(btnId);
        if (btn) btn.click();
      }, interval);
    }

    // --- 存档选择 ---
    renderSlotSelection() {
      this.hideAll();
      this.startEl.classList.remove('hidden');

      let html = '<h2>仙途模拟器</h2><p class="subtitle">投胎修仙界，一世一轮回</p>';
      html += '<div class="slot-grid">';
      for (let i = 1; i <= 3; i++) {
        const info = LifeSimGame.getSlotInfo(i);
        if (info) {
          html += `<div class="save-slot"><div class="slot-info"><div class="slot-name">${info.name}</div><div class="slot-realm">${info.realm}</div><div class="slot-details">年龄: ${info.age}岁</div></div><div class="slot-actions"><button class="btn btn-gold btn-sm" data-enter="${i}">继续</button><button class="btn btn-outline btn-sm" data-delete="${i}" style="color:var(--red);">删除</button></div></div>`;
        } else {
          html += `<div class="save-slot"><div class="slot-info"><div class="slot-empty">空存档</div></div><div class="slot-actions"><button class="btn btn-cyan btn-sm" data-create="${i}">新建角色</button></div></div>`;
        }
      }
      html += '</div>';
      const legacy = LifeSimGame.getLegacyData();
      html += `<div class="ls-legacy-summary">传承点：${legacy.points || 0}</div>`;
      const ngData = LifeSimGame.getNgPlusData();
      html += `<div class="ls-ngplus-summary">轮回点：${ngData.points || 0}</div>`;
      html += '<div class="ls-achievement-entry"><button class="btn btn-outline btn-sm" id="btn-ls-ngplus">轮回加成</button> <button class="btn btn-outline btn-sm" id="btn-ls-achievements">成就</button> <button class="btn btn-outline btn-sm" id="btn-ls-gallery">结局图鉴</button></div>';
      this.startEl.innerHTML = html;

      // Event delegation for slot selection buttons
      this.startEl.addEventListener('click', (e) => {
        const target = e.target.closest('[data-enter],[data-delete],[data-create]');
        if (!target) return;
        if (target.dataset.enter) {
          const slot = parseInt(target.dataset.enter);
          const saved = LifeSimGame.loadState(slot);
          if (saved) {
            this.game.activeSlot = slot;
            this.game.restoreFrom(saved);
            this.hideAll();
            this.gameEl.classList.add('active');
            this.showNextEvent();
          }
        } else if (target.dataset.delete) {
          const slot = parseInt(target.dataset.delete);
          if (confirm('确定删除此存档？所有进度将丢失！')) {
            LifeSimGame.clearSave(slot);
            this.renderSlotSelection();
          }
        } else if (target.dataset.create) {
          this.showStartScreen(parseInt(target.dataset.create));
        }
      });

      const achBtn = this.startEl.querySelector('#btn-ls-achievements');
      if (achBtn) {
        achBtn.addEventListener('click', () => this.showAchievementPanel());
      }
      const galBtn = this.startEl.querySelector('#btn-ls-gallery');
      if (galBtn) {
        galBtn.addEventListener('click', () => this.showEndingGallery());
      }
      const ngBtn = this.startEl.querySelector('#btn-ls-ngplus');
      if (ngBtn) {
        ngBtn.addEventListener('click', () => this.showNgPlusPanel());
      }
    }

    hideAll() {
      this.startEl.classList.add('hidden');
      this.gameEl.classList.remove('active');
      this.endingEl.classList.remove('active');
    }

    showStartScreen(slot) {
      this.hideAll();
      this.startEl.classList.remove('hidden');

      const defaultAttrs = { str: 4, int: 4, cha: 4, luk: 4, spr: 4 };
      let attrs = { ...defaultAttrs };
      let currentTalents = LifeSimGame.rollTalents();
      let legacyUsed = []; // 本次使用的传承
      let selectedChallenge = null; // 挑战模式
      let bloodline = LifeSimGame.rollBloodline();
      let worldEra = LifeSimGame.rollWorldEra();
      let charName = '';

      const hasPastLife = currentTalents.includes('past_life');
      const totalPoints = TOTAL_POINTS + (hasPastLife ? 2 : 0);

      const getPointsLeft = () => totalPoints - Object.values(attrs).reduce((a, b) => a + b, 0);

      // Step-by-step wizard: 0=Name, 1=Talent/Bloodline, 2=Attributes, 3=Confirm
      this._createStep = 0;
      const stepNames = ['道号', '天赋血脉', '属性分配', '确认投胎'];

      const renderStepDots = () => {
        return `<div class="ls-wizard-steps">
          ${stepNames.map((name, i) => `<div class="ls-wizard-dot ${i === this._createStep ? 'active' : ''} ${i < this._createStep ? 'done' : ''}">
            <div class="ls-wizard-dot-circle">${i < this._createStep ? '✓' : i + 1}</div>
            <div class="ls-wizard-dot-label">${name}</div>
          </div>`).join('<div class="ls-wizard-dot-line"></div>')}
        </div>`;
      };

      const renderStepNav = (canNext = true) => {
        const isFirst = this._createStep === 0;
        const isLast = this._createStep === 3;
        return `<div class="ls-wizard-nav">
          ${isFirst ? '' : '<button class="btn btn-outline btn-sm" id="btn-wizard-prev">上一步</button>'}
          ${isLast ? '<button class="btn btn-gold btn-sm" id="btn-start-game">开始投胎</button>' : `<button class="btn btn-gold btn-sm" id="btn-wizard-next" ${canNext ? '' : 'disabled'}>下一步</button>`}
        </div>`;
      };

      const render = () => {
        const tpUsed = currentTalents.includes('past_life');
        const legacyExtraPts = legacyUsed.filter(id => id === 'extra_point').length;
        const tp = TOTAL_POINTS + (tpUsed ? 2 : 0) + legacyExtraPts;
        const pointsLeft = tp - Object.values(attrs).reduce((a, b) => a + b, 0);
        const legacy = LifeSimGame.getLegacyData();

        let stepContent = '';

        // --- Step 0: Name ---
        if (this._createStep === 0) {
          stepContent = `
            <div class="form-group" style="margin-top:20px;">
              <label class="form-label" style="font-size:1.1rem;">为你的角色取一个道号</label>
              <input type="text" class="form-input" id="ls-name" placeholder="请输入你的道号" maxlength="12" value="${charName}">
              <div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);">道号将伴随你的整个修仙之旅</div>
            </div>
          `;
        }

        // --- Step 1: Talent / Bloodline / Era / Challenge / Legacy ---
        if (this._createStep === 1) {
          // 传承商店HTML
          let legacyShopHTML = '';
          if ((legacy.points || 0) > 0 || legacyUsed.length > 0) {
            legacyShopHTML = `
              <div class="ls-legacy-shop">
                <label class="form-label">传承商店 <span style="font-size:0.75rem;color:var(--purple)">（传承点：${legacy.points || 0}）</span></label>
                <div class="ls-legacy-grid">
                  ${LEGACY_REWARDS.map(r => {
                    const owned = !r.repeatable && legacy.purchased.includes(r.id);
                    const canBuy = (legacy.points || 0) >= r.cost && !owned;
                    return `<div class="ls-legacy-item ${owned ? 'owned' : ''} ${canBuy ? '' : 'disabled'}">
                      <span class="ls-legacy-icon">${r.icon}</span>
                      <span class="ls-legacy-name">${r.name}</span>
                      <span class="ls-legacy-desc">${r.desc}</span>
                      <button class="btn btn-xs ${canBuy ? 'btn-purple' : 'btn-outline'}" data-legacy="${r.id}" ${canBuy ? '' : 'disabled'}>${owned ? '已拥有' : r.cost + '点'}</button>
                    </div>`;
                  }).join('')}
                </div>
              </div>
            `;
          }

          stepContent = `
            <div class="ls-talent-section">
              <label class="form-label">天赋</label>
              <div class="ls-talent-list">
                ${currentTalents.map(tid => {
                  const t = TALENTS_MAP[tid];
                  return t ? `<div class="ls-talent-badge"><span class="ls-talent-icon">${t.icon}</span><span class="ls-talent-name">${t.name}</span><span class="ls-talent-desc">${t.desc}</span></div>` : '';
                }).join('')}
              </div>
              <button class="btn btn-outline btn-sm" id="btn-reroll-talent">重新投胎</button>
            </div>
            ${legacyShopHTML}
            <div class="form-group">
              <label class="form-label">挑战模式</label>
              <div class="ls-challenge-grid">
                ${CHALLENGE_MODES.map(m => `<div class="ls-challenge-option ${selectedChallenge === m.id ? 'selected' : ''}" data-challenge="${m.id || ''}"><div class="ls-challenge-icon">${m.icon}</div><div class="ls-challenge-name">${m.name}</div><div class="ls-challenge-desc">${m.desc}</div></div>`).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">血脉 <span class="ls-reroll-hint">（10%概率获得稀有血脉）</span></label>
              <div class="ls-bloodline-display">
                ${(() => {
                  const bl = BLOODLINES_MAP[bloodline];
                  return `<div class="ls-bloodline-card ${bl.rare ? 'rare' : ''}">
                    <span class="ls-bloodline-icon">${bl.icon}</span>
                    <span class="ls-bloodline-name">${bl.name}</span>
                    <span class="ls-bloodline-desc">${bl.desc}</span>
                  </div>`;
                })()}
                <button class="btn btn-outline btn-xs" id="btn-reroll-blood">重铸血脉</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">世界纪元</label>
              <div class="ls-era-display">
                ${(() => {
                  const era = WORLD_ERAS_MAP[worldEra];
                  return `<div class="ls-era-card"><span class="ls-era-icon">${era.icon}</span><span class="ls-era-name">${era.name}</span><span class="ls-era-desc">${era.desc}</span></div>`;
                })()}
              </div>
            </div>
          `;
        }

        // --- Step 2: Attribute Allocation ---
        if (this._createStep === 2) {
          stepContent = `
            <div class="form-group" style="margin-top:20px;">
              <label class="form-label">属性分配 <span style="font-size:0.75rem;color:var(--text-muted)">（总${tp}点）</span></label>
              <div class="attr-points-left">剩余点数：${pointsLeft}</div>
              <div class="attr-group">
                ${Object.entries(ATTR_NAMES).map(([key, name]) => `
                  <div class="attr-row">
                    <span class="attr-label">${name}</span>
                    <input type="range" class="attr-slider" data-attr="${key}" min="1" max="10" value="${attrs[key]}">
                    <span class="attr-val" id="val-${key}">${attrs[key]}</span>
                  </div>
                  <div class="attr-desc">${ATTR_DESCS[key]}</div>
                `).join('')}
              </div>
              <div style="margin-top:12px;">
                <button class="btn btn-outline btn-sm" id="btn-random">随机分配</button>
              </div>
            </div>
          `;
        }

        // --- Step 3: Confirmation ---
        if (this._createStep === 3) {
          const blDef = BLOODLINES_MAP[bloodline];
          const eraDef = WORLD_ERAS_MAP[worldEra];
          const challengeDef = selectedChallenge ? CHALLENGE_MODES_MAP[selectedChallenge] : null;
          stepContent = `
            <div class="ls-confirm-summary" style="margin-top:20px;">
              <div class="form-group">
                <label class="form-label">角色总览</label>
                <div style="background:var(--bg-darker);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:10px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:var(--text-muted);">道号</span>
                    <span style="color:var(--gold);font-size:1.1rem;font-family:var(--font-display);">${escapeHtml(charName)}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:var(--text-muted);">血脉</span>
                    <span>${blDef.icon} ${blDef.name}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:var(--text-muted);">纪元</span>
                    <span>${eraDef.icon} ${eraDef.name}</span>
                  </div>
                  ${challengeDef ? `<div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:var(--text-muted);">挑战</span>
                    <span>${challengeDef.icon} ${challengeDef.name}</span>
                  </div>` : ''}
                  <div style="border-top:1px solid var(--border-color);padding-top:10px;">
                    <span style="color:var(--text-muted);font-size:0.85rem;">天赋</span>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                      ${currentTalents.map(tid => {
                        const t = TALENTS_MAP[tid];
                        return t ? `<span style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:4px;padding:2px 8px;font-size:0.8rem;">${t.icon} ${t.name}</span>` : '';
                      }).join('')}
                    </div>
                  </div>
                  <div style="border-top:1px solid var(--border-color);padding-top:10px;">
                    <span style="color:var(--text-muted);font-size:0.85rem;">属性</span>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-top:6px;">
                      ${Object.entries(ATTR_NAMES).map(([key, name]) => `<div style="display:flex;justify-content:space-between;font-size:0.85rem;"><span>${name}</span><span style="color:var(--cyan);">${attrs[key]}</span></div>`).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }

        this.startEl.innerHTML = `
          <div class="back-to-slots" id="back-slots">← 返回存档列表</div>
          <h2>仙途模拟器</h2>
          <p class="subtitle">投胎修仙界，一世一轮回</p>
          ${renderStepDots()}
          ${stepContent}
          ${renderStepNav(this._createStep !== 0 || charName.length > 0)}
        `;

        // --- Back button ---
        document.getElementById('back-slots').addEventListener('click', () => this.renderSlotSelection());

        // --- Wizard navigation ---
        const prevBtn = document.getElementById('btn-wizard-prev');
        if (prevBtn) {
          prevBtn.addEventListener('click', () => {
            // Save current name if on step 0
            if (this._createStep === 0) {
              const nameEl = document.getElementById('ls-name');
              if (nameEl) charName = nameEl.value.trim();
            }
            this._createStep = Math.max(0, this._createStep - 1);
            render();
          });
        }
        const nextBtn = document.getElementById('btn-wizard-next');
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            // Validate current step
            if (this._createStep === 0) {
              const nameEl = document.getElementById('ls-name');
              charName = nameEl ? nameEl.value.trim() : '';
              if (!charName) { showToast('请输入道号', 'error'); return; }
            }
            if (this._createStep === 2) {
              const tpUsed2 = currentTalents.includes('past_life');
              const legacyExtraPts2 = legacyUsed.filter(id => id === 'extra_point').length;
              const tp2 = TOTAL_POINTS + (tpUsed2 ? 2 : 0) + legacyExtraPts2;
              const left2 = tp2 - Object.values(attrs).reduce((a, b) => a + b, 0);
              if (left2 > 0) { showToast(`还有${left2}点未分配`, 'error'); return; }
            }
            this._createStep = Math.min(3, this._createStep + 1);
            render();
          });
        }

        // --- Name input live update for next button ---
        if (this._createStep === 0) {
          const nameInput = document.getElementById('ls-name');
          if (nameInput) {
            nameInput.addEventListener('input', () => {
              charName = nameInput.value.trim();
              const nb = document.getElementById('btn-wizard-next');
              if (nb) nb.disabled = charName.length === 0;
            });
            nameInput.focus();
          }
        }

        // --- Step 1 event handlers ---
        if (this._createStep === 1) {
          // Re-roll talents
          const rerollTalentBtn = document.getElementById('btn-reroll-talent');
          if (rerollTalentBtn) {
            rerollTalentBtn.addEventListener('click', () => {
              currentTalents = LifeSimGame.rollTalents();
              attrs = { ...defaultAttrs };
              render();
            });
          }

          // Reroll bloodline
          const rerollBloodBtn = document.getElementById('btn-reroll-blood');
          if (rerollBloodBtn) {
            rerollBloodBtn.addEventListener('click', () => {
              bloodline = LifeSimGame.rollBloodline();
              render();
            });
          }

          // Challenge mode buttons
          this.startEl.querySelectorAll('[data-challenge]').forEach(btn => {
            btn.addEventListener('click', () => {
              const id = btn.dataset.challenge || null;
              selectedChallenge = id || null;
              render();
            });
          });

          // Legacy shop buttons
          this.startEl.querySelectorAll('[data-legacy]').forEach(btn => {
            btn.addEventListener('click', () => {
              const rewardId = btn.dataset.legacy;
              if (LifeSimGame.purchaseLegacy(rewardId)) {
                legacyUsed.push(rewardId);
                showToast(`已购买传承：${LEGACY_REWARDS_MAP[rewardId].name}`, 'success');
                render();
              }
            });
          });
        }

        // --- Step 2 event handlers ---
        if (this._createStep === 2) {
          // Bind sliders
          const currentTp = tp;
          const getLeft = () => currentTp - Object.values(attrs).reduce((a, b) => a + b, 0);
          const pointsLeftEl = this.startEl.querySelector('.attr-points-left');

          this.startEl.querySelectorAll('.attr-slider').forEach(slider => {
            slider.addEventListener('input', () => {
              const key = slider.dataset.attr;
              const newVal = parseInt(slider.value);
              const oldVal = attrs[key];
              const diff = newVal - oldVal;
              const pointsAvailable = getLeft();

              if (diff > pointsAvailable) {
                slider.value = oldVal + pointsAvailable;
                attrs[key] = oldVal + pointsAvailable;
              } else {
                attrs[key] = newVal;
              }

              document.getElementById(`val-${key}`).textContent = attrs[key];
              pointsLeftEl.textContent = `剩余点数：${getLeft()}`;
            });
          });

          // Random button
          const randomBtn = document.getElementById('btn-random');
          if (randomBtn) {
            randomBtn.addEventListener('click', () => {
              attrs = { str: 1, int: 1, cha: 1, luk: 1, spr: 1 };
              let remaining = currentTp - 5;
              const keys = Object.keys(attrs);
              while (remaining > 0) {
                const key = keys[Math.floor(Math.random() * keys.length)];
                if (attrs[key] < 10) {
                  const add = Math.min(remaining, randomInt(1, Math.min(3, 10 - attrs[key])));
                  attrs[key] += add;
                  remaining -= add;
                }
              }
              render();
            });
          }
        }

        // --- Step 3: Start game button ---
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) {
          startBtn.addEventListener('click', () => {
            const name = charName;
            if (!name) { showToast('请输入道号', 'error'); return; }
            const tpUsedF = currentTalents.includes('past_life');
            const legacyExtraPtsF = legacyUsed.filter(id => id === 'extra_point').length;
            const tpF = TOTAL_POINTS + (tpUsedF ? 2 : 0) + legacyExtraPtsF;
            const getLeftF = () => tpF - Object.values(attrs).reduce((a, b) => a + b, 0);
            if (getLeftF() > 0) { showToast(`还有${getLeftF()}点未分配`, 'error'); return; }
            this.game.activeSlot = slot;
            this.game.createCharacter(name, attrs, currentTalents);

            // 应用血脉
            this.game.data.bloodline = bloodline;
            const blDef = BLOODLINES_MAP[bloodline];
            if (blDef && blDef.bonus) {
              for (const [k, v] of Object.entries(blDef.bonus)) {
                if (this.game.data.attrs[k] !== undefined) this.game.data.attrs[k] += v;
              }
            }

            // 应用世界纪元
            this.game.data.worldEra = worldEra;

            // 应用NG+加成
            const ngData = LifeSimGame.getNgPlusData();
            if (ngData.perks) {
              const ngAttrLevel = ngData.perks.ng_attr || 0;
              if (ngAttrLevel > 0) {
                for (const k of Object.keys(this.game.data.attrs)) {
                  this.game.data.attrs[k] += ngAttrLevel;
                }
              }
              const ngGoldLevel = ngData.perks.ng_gold || 0;
              if (ngGoldLevel > 0) this.game.data.gold += ngGoldLevel * 15;
              const ngTalentLevel = ngData.perks.ng_talent || 0;
              if (ngTalentLevel > 0 && currentTalents.length < TALENTS.length) {
                const remaining = TALENTS.filter(t => !currentTalents.includes(t.id));
                for (let i = remaining.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [remaining[i], remaining[j]] = [remaining[j], remaining[i]]; }
                const extra = remaining.slice(0, ngTalentLevel);
                extra.forEach(t => {
                  this.game.data.talents.push(t.id);
                  if (t.effect.str) this.game.data.attrs.str += t.effect.str;
                  if (t.effect.int) this.game.data.attrs.int += t.effect.int;
                  if (t.effect.cha) this.game.data.attrs.cha += t.effect.cha;
                  if (t.effect.luk) this.game.data.attrs.luk += t.effect.luk;
                  if (t.effect.spr) this.game.data.attrs.spr += t.effect.spr;
                  if (t.effect.allAttr) { for (const k of Object.keys(this.game.data.attrs)) this.game.data.attrs[k] += t.effect.allAttr; }
                });
              }
              this.game.data.ngPlusLevel = Object.values(ngData.perks).reduce((a, b) => a + b, 0);
            }

            // 应用传承效果
            const goldBonus = legacyUsed.filter(id => id === 'extra_gold').length;
            if (goldBonus > 0) this.game.data.gold += goldBonus * 50;
            if (legacyUsed.includes('cultivation_boost')) this.game.data.cultivationBonus = (this.game.data.cultivationBonus || 0) + 1;
            if (legacyUsed.includes('starting_realm')) {
              this.game.data.realm = 1;
              this.game.data.canCultivate = true;
            }

            // 应用挑战模式
            if (selectedChallenge) {
              this.game.data.challengeMode = selectedChallenge;
              if (selectedChallenge === 'mortal') {
                this.game.data.canCultivate = false;
              }
            }

            this.game.saveState();
            this.hideAll();
            this.gameEl.classList.add('active');
            this.showNextEvent();
            showToast(`${name}，欢迎来到仙途！`, 'success');
          });
        }
      };

      render();
    }

    showNextEvent() {
      if (!this.game.isAlive()) {
        this.showEnding();
        return;
      }

      // Three-life deja vu trigger (Phase 5G)
      const pastLife = this.game.data._pastLife;
      if (pastLife && this.game.data.age === 5 && !this.game.data._dejaVuShown) {
        this.game.data._dejaVuShown = true;
        this._showDejaVuEvent(pastLife);
        return;
      }

      const yearsAdvanced = this.game.advanceYears();
      if (!this.game.isAlive()) {
        this.showEnding();
        return;
      }

      // 修炼获取修为
      const expGain = this.game.gainCultivationExp();

      // 事件链推进
      this.game._advanceChainCountdowns();
      this.game._checkNewChains();

      // 转运符过期
      if (this.game.data.luckCharmTurns) {
        this.game.data.luckCharmTurns--;
        if (this.game.data.luckCharmTurns <= 0) {
          this.game.data.attrs.luk = Math.max(1, this.game.data.attrs.luk - 3);
          this.game.data.luckCharmTurns = 0;
        }
      }

      // 事件计数
      this.game.data.eventsSinceAction = (this.game.data.eventsSinceAction || 0) + 1;

      // 每5个事件一次自由行动
      if (this.game.data.eventsSinceAction >= 5) {
        this.game.data.eventsSinceAction = 0;
        this.game.saveState();
        this.showFreeAction();
        return;
      }

      // 随机插入叙述小插曲（30%概率）
      if (Math.random() < 0.3) {
        const interlude = this._getInterlude();
        if (interlude) {
          this.game.log.push(`<span class="log-age">[${this.game.data.age}岁]</span> ${interlude}`);
        }
      }

      const event = this.game.getNextEvent();
      if (event.id) this.game.usedEvents.add(event.id);
      this.game.saveState();
      this.renderGameUI(event);
    }

    _getInterlude() {
      const d = this.game.data;
      const interludes = [];

      if (d.age <= 6) {
        interludes.push('你在田野间追逐蝴蝶，无忧无虑。', '母亲教你认了几个字。', '你第一次尝到了糖葫芦的味道。');
      } else if (d.age <= 15) {
        interludes.push('青春年少，你对未来充满憧憬。', '你在溪边发呆，想着远方的世界。', '夜里你偷偷看星星，好奇天上是否有仙人。');
      } else if (d.age <= 60) {
        if (d.realm >= 1) {
          interludes.push('你在修炼之余，品了一壶灵茶。', '山中修行日久，你渐渐忘记了红尘。', '你望着云海翻涌，心中感慨万千。');
        } else {
          interludes.push('又是平常的一天，你操持着生计。', '邻居家办了喜事，你随了份礼。', '你在集市上买了些新鲜蔬果。');
        }
      } else {
        if (d.realm >= 3) {
          interludes.push('天地间的灵气对你而言已如呼吸般自然。', '你闭目感知方圆百里的一切。', '云雾缭绕间，你品味着岁月的厚重。');
        } else {
          interludes.push('你坐在门前晒太阳，回忆着年轻时的日子。', '老友相聚，你们聊起了从前。', '你将一生的经验讲给后辈听。');
        }
      }

      // 关系相关插曲
      const companion = this.game.getRelationship('companion');
      if (companion && Math.random() < 0.3) {
        interludes.push(`你与道侣${companion.name}一起${d.realm >= 1 ? '修炼' : '散步'}，岁月静好。`);
      }
      const master = this.game.getRelationship('master');
      if (master && Math.random() < 0.2) {
        interludes.push(`师父${master.name}的教诲浮现在你脑海中。`);
      }

      return interludes.length > 0 ? interludes[Math.floor(Math.random() * interludes.length)] : null;
    }

    renderGameUI(event) {
      const d = this.game.data;
      const stage = this.game.getStage();
      const maxLife = this.game.getMaxLifespan();
      const lifePct = Math.min(100, (d.age / maxLife) * 100);

      // Talent badges
      const talentHTML = d.talents && d.talents.length > 0 ? `<div class="ls-talent-bar">${d.talents.map(tid => {
        const t = TALENTS_MAP[tid];
        return t ? `<span class="ls-talent-mini" title="${t.name}: ${t.desc}">${t.icon}</span>` : '';
      }).join('')}</div>` : '';

      // Relationship badges (compact)
      const relHTML = d.relationships && d.relationships.length > 0 ? `<div class="ls-rel-bar">${d.relationships.map(r => {
        const rt = RELATIONSHIP_TYPES[r.type] || { name: '未知', icon: '❓' };
        return `<span class="ls-rel-badge" title="${rt.name}: ${r.name} (好感${r.affinity})">${rt.icon}${r.name}</span>`;
      }).join('')}</div>` : '';

      // Relationship status display (detailed)
      const keyRelTypes = ['companion', 'master', 'disciple'];
      const keyRels = (d.relationships || []).filter(r => keyRelTypes.includes(r.type));
      const relDetailHTML = keyRels.length > 0 ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${keyRels.map(r => {
        const rt = RELATIONSHIP_TYPES[r.type] || { name: '未知', icon: '❓' };
        const affPct = Math.min(100, Math.max(0, (r.affinity || 0)));
        const affColor = affPct >= 80 ? '#4ade80' : affPct >= 50 ? '#22d3ee' : affPct >= 20 ? '#facc15' : '#f87171';
        return `<div style="display:flex;align-items:center;gap:6px;background:var(--bg-card,#1e293b);border:1px solid var(--border-color,#334155);border-radius:8px;padding:6px 12px;font-size:0.8rem;"><span style="font-size:1.1rem;">${rt.icon}</span><span style="color:var(--text-muted,#94a3b8);font-size:0.7rem;">${rt.name}</span><span style="color:var(--text-primary,#e2e8f0);">${r.name}</span><div style="width:50px;height:6px;background:var(--bg-darker,#0f172a);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${affPct}%;background:${affColor};border-radius:3px;transition:width 0.3s;"></div></div><span style="font-size:0.7rem;color:${affColor};">${r.affinity || 0}</span></div>`;
      }).join('')}</div>` : '';

      // Item bar
      const itemHTML = d.items && d.items.length > 0 ? `<div class="ls-item-bar">${d.items.map(it => {
        const def = GAME_ITEMS_MAP[it.id];
        return def ? `<button class="ls-item-btn" data-item="${it.id}" title="${def.name}: ${def.desc}">${def.icon}×${it.count}</button>` : '';
      }).join('')}</div>` : '';

      // Sect badge
      const sectDef = d.sect ? SECTS_MAP[d.sect] : null;
      const sectHTML = sectDef ? `<div class="ls-sect-badge">${sectDef.icon} ${sectDef.name}</div>` : '';

      // Chain indicator with progress
      const chainHTML = d.activeChains && d.activeChains.length > 0 ? `<div class="ls-chain-bar">${d.activeChains.map(c => {
        const def = EVENT_CHAINS_MAP[c.id];
        if (!def) return '';
        const total = def.steps.length;
        const current = c.step; // already advanced to next step index
        const pct = Math.floor((current / total) * 100);
        return `<span class="ls-chain-badge" title="${def.name}: 进度 ${current}/${total}">
          📜${def.name} <span style="font-size:0.65rem;color:var(--text-muted)">${current}/${total}</span>
          <span class="ls-chain-progress"><span class="ls-chain-progress-fill" style="width:${pct}%"></span></span>
        </span>`;
      }).join('')}</div>` : '';

      // Challenge badge
      const challengeHTML = d.challengeMode ? `<div class="ls-challenge-badge">${CHALLENGE_MODES_MAP[d.challengeMode]?.icon || ''} ${CHALLENGE_MODES_MAP[d.challengeMode]?.name || ''}</div>` : '';

      // 道途/血脉/纪元
      const daoPathDef = d.daoPath ? DAO_PATHS_MAP[d.daoPath] : null;
      const daoHTML = daoPathDef ? `<span class="ls-dao-badge">${daoPathDef.icon} ${daoPathDef.name}</span>` : '';
      const blDef = d.bloodline && d.bloodline !== 'human' ? BLOODLINES_MAP[d.bloodline] : null;
      const bloodHTML = blDef ? `<span class="ls-blood-badge">${blDef.icon} ${blDef.name}</span>` : '';
      const eraDef = d.worldEra && d.worldEra !== 'normal' ? WORLD_ERAS_MAP[d.worldEra] : null;
      const eraHTML = eraDef ? `<span class="ls-era-badge">${eraDef.icon} ${eraDef.name}</span>` : '';
      const extraBadgesHTML = (daoHTML || bloodHTML || eraHTML) ? `<div class="ls-extra-badges">${daoHTML}${bloodHTML}${eraHTML}</div>` : '';

      this.gameEl.innerHTML = `
        <div class="ls-info-bar">
          <div class="ls-info-item"><div class="ls-info-label">道号</div><div class="ls-info-value">${escapeHtml(d.name)}</div></div>
          <div class="ls-info-item"><div class="ls-info-label">年龄</div><div class="ls-info-value cyan">${d.age}岁</div></div>
          <div class="ls-info-item"><div class="ls-info-label">阶段</div><div class="ls-info-value">${stage.name}</div></div>
          <div class="ls-info-item"><div class="ls-info-label">境界</div><div class="ls-info-value purple">${(CULTIVATION_REALMS[d.realm] || CULTIVATION_REALMS[0]).name}</div></div>
          <div class="ls-info-item"><div class="ls-info-label">金币</div><div class="ls-info-value">${d.gold}</div></div>
        </div>
        ${sectHTML}${challengeHTML}${extraBadgesHTML}
        ${talentHTML}
        <div class="ls-attr-bars">
          ${Object.entries(ATTR_NAMES).map(([key, name]) => `
            <div class="ls-attr-bar">
              <span class="ls-attr-name">${name}</span>
              <div class="ls-attr-fill-bg"><div class="ls-attr-fill ${key}" style="width:${d.attrs[key] * 10}%"></div></div>
              <span class="ls-attr-num">${d.attrs[key]}</span>
            </div>
          `).join('')}
        </div>
        ${relDetailHTML}
        ${relHTML}
        ${itemHTML}
        ${chainHTML}
        <div class="ls-life-bar-wrap">
          <div class="ls-life-bar-label"><span>寿命 ${d.age} / ${maxLife}岁</span><span>${lifePct.toFixed(0)}%</span></div>
          <div class="ls-life-bar-bg"><div class="ls-life-bar-fill ${lifePct > 80 ? 'low' : ''}" style="width:${lifePct}%"></div></div>
        </div>
        ${d.realm >= 1 && d.realm < 6 ? (() => {
          const expMax = REALM_EXP[d.realm];
          const expCur = d.cultivationExp || 0;
          const expPct = Math.min(100, (expCur / expMax) * 100);
          const canBrk = expCur >= expMax;
          return `<div class="ls-cult-bar-wrap">
            <div class="ls-cult-bar-label"><span>修为 ${expCur} / ${expMax}</span><span>${canBrk ? '可突破！' : expPct.toFixed(0) + '%'}</span></div>
            <div class="ls-cult-bar-bg"><div class="ls-cult-bar-fill ${canBrk ? 'full' : ''}" style="width:${expPct}%"></div></div>
          </div>`;
        })() : ''}
        <div class="ls-event-area" id="event-area">
          ${event.chainName ? `<div class="ls-chain-indicator">📜 ${event.chainName} <span style="font-size:0.7rem;opacity:0.7">（第${event.chainStep || '?'}/${event.chainTotal || '?'}步）</span></div>` : ''}
          <div class="ls-event-icon">${event.icon}</div>
          <div class="ls-event-title">${event.title}</div>
          <div class="ls-event-desc">${event.desc.replace('{birthplace}', '')}</div>
          <div class="ls-event-choices" id="event-choices">
            ${(event.choices || []).map((c, i) => `<button class="ls-choice-btn" data-choice="${i}">${c.text}</button>`).join('')}
          </div>
        </div>
        <div class="ls-log-area">
          <div class="ls-log-title" style="display:flex;justify-content:space-between;align-items:center;">人生历程<button class="btn btn-outline btn-sm" id="btn-history" style="font-size:0.75rem;padding:2px 8px;">📜 历程</button></div>
          ${this.game.log.slice(-15).reverse().map(l => `<div class="ls-log-entry">${l}</div>`).join('')}
        </div>
      `;

      document.getElementById('btn-history')?.addEventListener('click', () => {
        this._showHistoryLog();
      });

      const choicesEl = document.getElementById('event-choices');
      choicesEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.ls-choice-btn');
        if (!btn) return;
          const idx = parseInt(btn.dataset.choice);
          const choice = event.choices[idx];

          // 突破小游戏
          if (choice.isBreakthroughAttempt) {
            this.showBreakthroughGame();
            return;
          }

          // 记录属性快照
          const beforeAttrs = { ...d.attrs };
          const beforeGold = d.gold;

          const resultText = choice.effect(this.game);

          // 护身符：免疫属性损失
          if (this.game.data.shieldActive) {
            let shielded = false;
            for (const key of Object.keys(ATTR_NAMES)) {
              if (d.attrs[key] < beforeAttrs[key]) { d.attrs[key] = beforeAttrs[key]; shielded = true; }
            }
            if (d.gold < beforeGold) { d.gold = beforeGold; shielded = true; }
            if (shielded) { this.game.data.shieldActive = false; this.showFloatingText('护身符挡住了！', 'positive'); }
          }

          this.game.clampAttrs();

          this.game.log.push(`<span class="log-age">[${d.age}岁]</span> ${event.title}: ${resultText}`);

          // 显示属性变化飘字
          for (const key of Object.keys(ATTR_NAMES)) {
            const diff = d.attrs[key] - beforeAttrs[key];
            if (diff !== 0) this.showFloatingText(`${ATTR_NAMES[key]} ${diff > 0 ? '+' : ''}${diff}`, diff > 0 ? 'positive' : 'negative');
          }
          const goldDiff = d.gold - beforeGold;
          if (goldDiff !== 0) this.showFloatingText(`金币 ${goldDiff > 0 ? '+' : ''}${goldDiff}`, goldDiff > 0 ? 'positive' : 'negative');

          // Show result with visual feedback
          const eventArea = document.getElementById('event-area');
          const isNegative = resultText.includes('-') && !resultText.includes('+');
          const isPositive = resultText.includes('+') && !resultText.includes('-');
          const resultClass = isNegative ? 'result-negative' : isPositive ? 'result-positive' : '';
          eventArea.querySelector('.ls-event-choices').innerHTML = `
            <div class="ls-event-result ${resultClass}">${resultText}</div>
            <button class="btn btn-gold btn-sm ls-continue-btn" id="btn-continue">继续</button>
          `;

          document.getElementById('btn-continue').addEventListener('click', () => {
            if (this._autoAdvanceTimer) clearTimeout(this._autoAdvanceTimer);
            if (this.game.data.killedInBattle || this.game.data.madness) {
              this.showEnding();
            } else {
              this.game.saveState();
              this.showNextEvent();
            }
          });
          this._scheduleAutoAdvance('btn-continue');
      });

      // If event has no choices (auto), show continue
      if (!event.choices || event.choices.length === 0) {
        choicesEl.innerHTML = `<button class="btn btn-gold btn-sm ls-continue-btn" id="btn-continue">继续</button>`;
        document.getElementById('btn-continue').addEventListener('click', () => {
          if (this._autoAdvanceTimer) clearTimeout(this._autoAdvanceTimer);
          this.game.saveState();
          this.showNextEvent();
        });
        this._scheduleAutoAdvance('btn-continue');
      }

      // Item buttons - event delegation on gameEl
      this.gameEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.ls-item-btn');
        if (!btn) return;
        const itemId = btn.dataset.item;
        const result = this.game.useItem(itemId);
        if (result) {
          showToast(result, 'success');
          this.game.saveState();
          this.renderGameUI(event);
        }
      });
    }

    showEnding() {
      const ending = this.game.getEnding();
      const d = this.game.data;

      // Save three-life memory (Phase 5G)
      saveWorldMemory(d, ending);

      // Clear save for this slot
      if (this.game.activeSlot) {
        LifeSimGame.clearSave(this.game.activeSlot);
      }

      updateLeaderboard('lifesim', ending.score, { name: d.name });

      // Update achievement stats
      const stats = LifeSimGame.updateAchievementStats(d, ending);
      const newAchs = LifeSimGame.checkAchievements();

      // 记录结局到图鉴
      LifeSimGame.recordEnding(ending.id);

      // 传承点
      const legacyPts = LifeSimGame.calcLegacyPoints(d, ending);
      const totalLegacy = LifeSimGame.addLegacyPoints(legacyPts);

      // NG+点数
      const ngPts = Math.floor(ending.score * 0.5) + d.realm * 3;
      const totalNgPts = LifeSimGame.addNgPlusPoints(ngPts);

      // CrossGameAchievements tracking
      if (typeof CrossGameAchievements !== 'undefined') {
        CrossGameAchievements.trackStat('lifesim_max_age', d.age);
        CrossGameAchievements.trackStat('games_played_lifesim', true);
        var lsRebirthStats = Storage.get('cross_game_stats', {});
        CrossGameAchievements.trackStat('lifesim_rebirths', (lsRebirthStats.lifesim_rebirths || 0) + 1);
      }

      this.hideAll();
      this.endingEl.classList.add('active');

      let achHTML = '';
      if (newAchs.length > 0) {
        achHTML = `<div class="ending-new-achievements"><div class="ending-ach-title">新成就解锁！</div>${newAchs.map(a => `<div class="ending-ach-item"><span class="ending-ach-icon">${a.icon}</span><span class="ending-ach-name">${a.name}</span></div>`).join('')}</div>`;
      }

      const legacyHTML = `<div class="ending-legacy">
        <div class="ending-legacy-title">传承点 +${legacyPts}</div>
        <div class="ending-legacy-total">累计传承点：${totalLegacy}</div>
        <div class="ending-legacy-hint">传承点可在创建角色时使用</div>
      </div>`;

      const ngHTML = `<div class="ending-ngplus">
        <div class="ending-legacy-title">轮回点 +${ngPts}</div>
        <div class="ending-legacy-total">累计轮回点：${totalNgPts}</div>
        <div class="ending-legacy-hint">轮回点可在存档界面使用</div>
      </div>`;

      this.endingEl.innerHTML = `
        <div class="ending-card">
          <div class="ending-icon">${ending.icon}</div>
          <div class="ending-title">${ending.name}</div>
          <div class="ending-summary">${ending.summary}</div>
          ${ending.score <= 35 && typeof getEncouragement === 'function' ? `<div style="font-size:0.85rem;color:var(--cyan);font-style:italic;margin:6px 0">${getEncouragement()}</div>` : ''}
          <div class="ending-score">${ending.score} 分</div>
          <div class="ending-score-label">人生评分</div>
          <div class="ending-stats">
            <div class="ending-stat"><div class="ending-stat-label">享年</div><div class="ending-stat-value">${d.age}岁</div></div>
            <div class="ending-stat"><div class="ending-stat-label">境界</div><div class="ending-stat-value">${CULTIVATION_REALMS[d.realm].name}</div></div>
            <div class="ending-stat"><div class="ending-stat-label">财富</div><div class="ending-stat-value">${d.gold}</div></div>
            <div class="ending-stat"><div class="ending-stat-label">体质</div><div class="ending-stat-value">${d.attrs.str}</div></div>
            <div class="ending-stat"><div class="ending-stat-label">智力</div><div class="ending-stat-value">${d.attrs.int}</div></div>
            <div class="ending-stat"><div class="ending-stat-label">灵根</div><div class="ending-stat-value">${d.attrs.spr}</div></div>
          </div>
          ${d.relationships && d.relationships.length > 0 ? `<div class="ending-relationships"><div class="ending-stat-label" style="margin-bottom:8px;">人际关系</div>${d.relationships.map(r => {
            const rt = RELATIONSHIP_TYPES[r.type] || { name: '未知', icon: '❓' };
            return `<span class="ls-rel-badge">${rt.icon}${rt.name}: ${r.name}</span>`;
          }).join('')}</div>` : ''}
          ${achHTML}
          ${legacyHTML}
          ${ngHTML}
          <div class="ending-actions">
            <button class="btn btn-gold" id="btn-reincarnate">再来一世</button>
            <button class="btn btn-outline" id="btn-back-portal" onclick="location.href='../index.html'">返回游坊</button>
          </div>
        </div>
      `;

      document.getElementById('btn-reincarnate').addEventListener('click', () => {
        this.renderSlotSelection();
      });

      // Show new achievement toasts
      newAchs.forEach((a, i) => {
        setTimeout(() => showToast(`成就达成：${a.name}！`, 'success'), i * 500);
      });
    }

    // --- 自由行动 ---
    showFreeAction() {
      const d = this.game.data;
      const actions = d.realm >= 1 ? FREE_ACTIONS_CULTIVATOR : FREE_ACTIONS_MORTAL;
      const stage = this.game.getStage();
      const maxLife = this.game.getMaxLifespan();
      const lifePct = Math.min(100, (d.age / maxLife) * 100);

      // Re-render the full game UI with free action panel
      const talentHTML = d.talents && d.talents.length > 0 ? `<div class="ls-talent-bar">${d.talents.map(tid => { const t = TALENTS_MAP[tid]; return t ? `<span class="ls-talent-mini" title="${t.name}: ${t.desc}">${t.icon}</span>` : ''; }).join('')}</div>` : '';
      const sectDef = d.sect ? SECTS_MAP[d.sect] : null;
      const sectHTML = sectDef ? `<div class="ls-sect-badge">${sectDef.icon} ${sectDef.name}</div>` : '';

      // Relationship status display for free action
      const keyRelTypes = ['companion', 'master', 'disciple'];
      const keyRels = (d.relationships || []).filter(r => keyRelTypes.includes(r.type));
      const relDetailHTML = keyRels.length > 0 ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${keyRels.map(r => {
        const rt = RELATIONSHIP_TYPES[r.type] || { name: '未知', icon: '❓' };
        const affPct = Math.min(100, Math.max(0, (r.affinity || 0)));
        const affColor = affPct >= 80 ? '#4ade80' : affPct >= 50 ? '#22d3ee' : affPct >= 20 ? '#facc15' : '#f87171';
        return `<div style="display:flex;align-items:center;gap:6px;background:var(--bg-card,#1e293b);border:1px solid var(--border-color,#334155);border-radius:8px;padding:6px 12px;font-size:0.8rem;"><span style="font-size:1.1rem;">${rt.icon}</span><span style="color:var(--text-muted,#94a3b8);font-size:0.7rem;">${rt.name}</span><span style="color:var(--text-primary,#e2e8f0);">${r.name}</span><div style="width:50px;height:6px;background:var(--bg-darker,#0f172a);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${affPct}%;background:${affColor};border-radius:3px;transition:width 0.3s;"></div></div><span style="font-size:0.7rem;color:${affColor};">${r.affinity || 0}</span></div>`;
      }).join('')}</div>` : '';

      this.gameEl.innerHTML = `
        <div class="ls-info-bar">
          <div class="ls-info-item"><div class="ls-info-label">道号</div><div class="ls-info-value">${escapeHtml(d.name)}</div></div>
          <div class="ls-info-item"><div class="ls-info-label">年龄</div><div class="ls-info-value cyan">${d.age}岁</div></div>
          <div class="ls-info-item"><div class="ls-info-label">阶段</div><div class="ls-info-value">${stage.name}</div></div>
          <div class="ls-info-item"><div class="ls-info-label">境界</div><div class="ls-info-value purple">${(CULTIVATION_REALMS[d.realm] || CULTIVATION_REALMS[0]).name}</div></div>
          <div class="ls-info-item"><div class="ls-info-label">金币</div><div class="ls-info-value">${d.gold}</div></div>
        </div>
        ${sectHTML}${talentHTML}
        ${relDetailHTML}
        <div class="ls-event-area" id="event-area">
          <div class="ls-event-icon">🎯</div>
          <div class="ls-event-title">自由行动</div>
          <div class="ls-event-desc">选择你接下来要做什么：</div>
          <div class="ls-free-action-grid">
            ${actions.map(a => `<button class="ls-action-card" data-action="${a.id}"><div class="ls-action-icon">${a.icon}</div><div class="ls-action-name">${a.name}</div><div class="ls-action-desc">${a.desc}</div></button>`).join('')}
          </div>
        </div>
        <div class="ls-log-area">
          <div class="ls-log-title" style="display:flex;justify-content:space-between;align-items:center;">人生历程<button class="btn btn-outline btn-sm" id="btn-history" style="font-size:0.75rem;padding:2px 8px;">📜 历程</button></div>
          ${this.game.log.slice(-15).reverse().map(l => `<div class="ls-log-entry">${l}</div>`).join('')}
        </div>
      `;

      document.getElementById('btn-history')?.addEventListener('click', () => {
        this._showHistoryLog();
      });

      // Event delegation for action cards
      this.gameEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.ls-action-card');
        if (!btn) return;
          const actionId = btn.dataset.action;
          const actionMap = d.realm >= 1 ? FREE_ACTIONS_CULTIVATOR_MAP : FREE_ACTIONS_MORTAL_MAP;
          const action = actionMap[actionId];
          if (!action) return;

          // 小游戏特殊处理
          if (action.isMinigame) {
            this._showTrialMinigame();
            return;
          }

          // 对话特殊处理
          if (action.isDialogue) {
            this._showNpcDialogue();
            return;
          }

          const beforeAttrs = { ...d.attrs };
          const beforeGold = d.gold;
          let resultText = action.effect(this.game);

          // === 状态触发不同结果 ===
          let stateBonus = '';
          // 高境界（>= 4）：可能遇到秘境
          if ((d.realm || 0) >= 4 && Math.random() < 0.25) {
            const secretRealmBonuses = [
              () => { d.attrs.spr += 2; return '【秘境奇遇】你意外闯入一处远古秘境，获得珍稀灵气洗礼！灵根+2'; },
              () => { d.attrs.int += 2; return '【秘境奇遇】秘境中的古老石碑蕴含天道至理，你感悟颇深！智力+2'; },
              () => { d.attrs.str += 1; d.attrs.spr += 1; d.gold += 100; return '【秘境奇遇】秘境深处有远古修士遗宝，你满载而归！体质+1，灵根+1，金币+100'; },
            ];
            const bonusFn = secretRealmBonuses[Math.floor(Math.random() * secretRealmBonuses.length)];
            stateBonus = bonusFn();
          }
          // 有道侣：协作奖励
          else if (this.game.hasRelationship('companion') && Math.random() < 0.30) {
            const companion = this.game.getRelationship('companion');
            const companionName = companion ? companion.name : '道侣';
            const coopBonuses = [
              () => { d.attrs.spr += 1; d.attrs.int += 1; return `【协作奖励】道侣${companionName}与你双修共进，灵根+1，智力+1`; },
              () => { d.attrs.str += 1; d.attrs.cha += 1; return `【协作奖励】${companionName}与你并肩作战，默契大增！体质+1，魅力+1`; },
              () => { d.gold += 50; d.attrs.luk += 1; return `【协作奖励】${companionName}助你发现了隐秘宝藏！金币+50，运气+1`; },
            ];
            const bonusFn = coopBonuses[Math.floor(Math.random() * coopBonuses.length)];
            stateBonus = bonusFn();
            if (companion) this.game.modifyAffinity(companion.name, 5);
          }
          // 在宗门：门派相关行动
          else if (d.inSect && Math.random() < 0.25) {
            const sectBonuses = [
              () => { d.attrs.str += 1; return '【门派切磋】你与同门师兄弟切磋武艺，体质+1'; },
              () => { d.attrs.int += 1; d.attrs.spr += 1; return '【长老指点】宗门长老指点你修行，智力+1，灵根+1'; },
              () => { d.gold += 30; return '【门派俸禄】宗门发放了修炼资源，金币+30'; },
              () => { d.attrs.cha += 1; return '【师兄教导】师兄传授你待人接物之道，魅力+1'; },
            ];
            const bonusFn = sectBonuses[Math.floor(Math.random() * sectBonuses.length)];
            stateBonus = bonusFn();
          }
          if (stateBonus) resultText += '\n' + stateBonus;

          // === 行动后小事件（15%概率） ===
          let miniEvent = '';
          if (Math.random() < 0.15) {
            const miniEvents = [
              // 旅途偶遇
              () => {
                if (Math.random() < 0.5) {
                  const npcName = pick(Math.random() < 0.5 ? NPC_NAMES_MALE : NPC_NAMES_FEMALE);
                  if (!this.game.hasRelationship('friend') || (d.relationships || []).length < 8) {
                    this.game.addRelationship(npcName, 'friend', 20);
                  }
                  return `✦ 旅途偶遇：你遇到了游方修士${npcName}，一番交谈甚是投缘。`;
                } else {
                  const gold = randomInt(10, 30);
                  d.gold += gold;
                  return `✦ 旅途偶遇：路遇一位散修，互通有无后你获得${gold}金币。`;
                }
              },
              // 学习顿悟
              () => {
                if (Math.random() < 0.5) {
                  d.attrs.int += 1;
                  return '✦ 学习顿悟：灵光一闪，你对天地之理有了新的领悟。智力+1';
                } else {
                  d.attrs.spr += 1;
                  return '✦ 学习顿悟：冥冥中你感应到一丝天道气息，修行有所精进。灵根+1';
                }
              },
              // 随机拾宝
              () => {
                if (Math.random() < 0.6) {
                  const gold = randomInt(15, 50);
                  d.gold += gold;
                  return `✦ 意外拾宝：你在路边发现了一个遗落的储物袋，里面有${gold}金币！`;
                } else {
                  const itemDef = GAME_ITEMS[Math.floor(Math.random() * GAME_ITEMS.length)];
                  this.game.addItem(itemDef.id, 1);
                  return `✦ 意外拾宝：你捡到了一枚${itemDef.name}（${itemDef.icon}）！`;
                }
              },
            ];
            const meFn = miniEvents[Math.floor(Math.random() * miniEvents.length)];
            miniEvent = meFn();
          }
          if (miniEvent) resultText += '\n' + miniEvent;

          // 护身符
          if (this.game.data.shieldActive) {
            let shielded = false;
            for (const key of Object.keys(ATTR_NAMES)) {
              if (d.attrs[key] < beforeAttrs[key]) { d.attrs[key] = beforeAttrs[key]; shielded = true; }
            }
            if (shielded) { this.game.data.shieldActive = false; this.showFloatingText('护身符挡住了！', 'positive'); }
          }

          this.game.clampAttrs();

          // 飘字
          for (const key of Object.keys(ATTR_NAMES)) {
            const diff = d.attrs[key] - beforeAttrs[key];
            if (diff !== 0) this.showFloatingText(`${ATTR_NAMES[key]} ${diff > 0 ? '+' : ''}${diff}`, diff > 0 ? 'positive' : 'negative');
          }
          const goldDiff = d.gold - beforeGold;
          if (goldDiff !== 0) this.showFloatingText(`金币 ${goldDiff > 0 ? '+' : ''}${goldDiff}`, goldDiff > 0 ? 'positive' : 'negative');

          this.game.log.push(`<span class="log-age">[${d.age}岁]</span> ${action.name}: ${resultText.replace(/\n/g, ' ')}`);

          // 历练时随机获得物品
          if (actionId === 'explore' && Math.random() < 0.25) {
            const itemDef = GAME_ITEMS[Math.floor(Math.random() * GAME_ITEMS.length)];
            this.game.addItem(itemDef.id, 1);
            this.showFloatingText(`获得${itemDef.name}！`, 'positive');
          }

          const eventArea = document.getElementById('event-area');
          const isNeg = resultText.includes('-') && !resultText.includes('+');
          const isPos = resultText.includes('+') && !resultText.includes('-');
          const resultDisplay = resultText.replace(/\n/g, '<br>');

          // Deep action follow-up choices (Phase 5H, 20% chance)
          const followup = this._getFollowupChoices(actionId, d);
          if (followup) {
            eventArea.innerHTML = `
              <div class="ls-event-icon">${action.icon}</div>
              <div class="ls-event-title">${action.name}</div>
              <div class="ls-event-result">${resultDisplay}</div>
              <div style="margin-top:12px;font-size:0.85rem;color:var(--gold-light,#ffd700);">${followup.prompt}</div>
              <div style="display:flex;gap:8px;margin-top:8px;justify-content:center;">
                ${followup.choices.map((c, i) => `<button class="btn btn-outline btn-sm followup-choice" data-fi="${i}">${c.text}</button>`).join('')}
              </div>
            `;
            eventArea.querySelectorAll('.followup-choice').forEach(btn => {
              btn.addEventListener('click', () => {
                const fi = parseInt(btn.dataset.fi);
                const fc = followup.choices[fi];
                const fResult = fc.effect(this.game);
                this.game.clampAttrs();
                this.game.log.push(`<span class="log-age">[${d.age}岁]</span> ${action.name}: ${resultText.replace(/\n/g, ' ')} → ${fResult}`);
                eventArea.innerHTML = `
                  <div class="ls-event-icon">${action.icon}</div>
                  <div class="ls-event-title">${action.name}</div>
                  <div class="ls-event-result result-positive">${fResult}</div>
                  <button class="btn btn-gold btn-sm ls-continue-btn" id="btn-continue">继续</button>
                `;
                document.getElementById('btn-continue').addEventListener('click', () => {
                  if (this._autoAdvanceTimer) clearTimeout(this._autoAdvanceTimer);
                  this.game.saveState();
                  this.showNextEvent();
                });
                this._scheduleAutoAdvance('btn-continue');
              });
            });
            return;
          }

          eventArea.innerHTML = `
            <div class="ls-event-icon">${action.icon}</div>
            <div class="ls-event-title">${action.name}</div>
            <div class="ls-event-result ${isNeg ? 'result-negative' : isPos ? 'result-positive' : ''}">${resultDisplay}</div>
            <button class="btn btn-gold btn-sm ls-continue-btn" id="btn-continue">继续</button>
          `;

          document.getElementById('btn-continue').addEventListener('click', () => {
            if (this._autoAdvanceTimer) clearTimeout(this._autoAdvanceTimer);
            this.game.saveState();
            this.showNextEvent();
          });
          this._scheduleAutoAdvance('btn-continue');
      });
    }

    // --- 突破小游戏 ---
    showBreakthroughGame() {
      const d = this.game.data;
      const realm = d.realm;
      const nextRealmName = CULTIVATION_REALMS[realm + 1].name;
      const isFinal = realm === 5;

      // 计算区域大小
      let greenPct = Math.max(10, 30 - realm * 3 + (this.game.getAttrWithTalent('spr') + this.game.getAttrWithTalent('int')) * 0.8);
      if (this.game.hasTalent('defy_fate')) greenPct += 10;
      if (this.game.data.breakPillActive) { greenPct += 15; this.game.data.breakPillActive = false; }
      greenPct = Math.min(60, greenPct);

      const yellowPct = 15;
      const greenStart = 50 - greenPct / 2;
      const greenEnd = 50 + greenPct / 2;
      const yellowLeftStart = Math.max(0, greenStart - yellowPct);
      const yellowRightEnd = Math.min(100, greenEnd + yellowPct);

      const speed = 1.2 + realm * 0.4;

      const eventArea = document.getElementById('event-area');
      eventArea.innerHTML = `
        <div class="ls-bt-game">
          <div class="ls-bt-title">${isFinal ? '⚡ 渡劫飞升 ⚡' : '突破 · ' + nextRealmName}</div>
          <div class="ls-bt-hint">点击按钮，在指针进入<span style="color:#4ade80">绿色区域</span>时停下！</div>
          <div class="ls-bt-bar-wrap">
            <div class="ls-bt-bar">
              <div class="ls-bt-zone zone-red" style="left:0;width:${yellowLeftStart}%"></div>
              <div class="ls-bt-zone zone-yellow" style="left:${yellowLeftStart}%;width:${greenStart - yellowLeftStart}%"></div>
              <div class="ls-bt-zone zone-green" style="left:${greenStart}%;width:${greenPct}%"></div>
              <div class="ls-bt-zone zone-yellow" style="left:${greenEnd}%;width:${yellowRightEnd - greenEnd}%"></div>
              <div class="ls-bt-zone zone-red" style="left:${yellowRightEnd}%;width:${100 - yellowRightEnd}%"></div>
              <div class="ls-bt-needle" id="bt-needle"></div>
            </div>
          </div>
          <button class="btn btn-gold ls-bt-stop-btn" id="btn-bt-stop">出手！</button>
        </div>
      `;

      let pos = 0;
      let direction = 1;
      let running = true;
      const needle = document.getElementById('bt-needle');
      let lastTimestamp = null;

      const animate = (timestamp) => {
        if (!running) return;
        if (lastTimestamp === null) lastTimestamp = timestamp;
        const delta = (timestamp - lastTimestamp) / 16.67; // normalize to ~60fps
        lastTimestamp = timestamp;
        pos += speed * direction * delta;
        if (pos >= 100) { pos = 100; direction = -1; }
        if (pos <= 0) { pos = 0; direction = 1; }
        needle.style.left = pos + '%';
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);

      document.getElementById('btn-bt-stop').addEventListener('click', () => {
        if (!running) return;
        running = false;

        let result;
        if (pos >= greenStart && pos <= greenEnd) {
          result = 'success';
        } else if (pos >= yellowLeftStart && pos <= yellowRightEnd) {
          result = 'fail_safe';
        } else {
          result = 'fail_bad';
        }

        // Show QTE phase for bonus
        this.showBreakthroughQTE(result, isFinal, realm);
      });
    }

    // --- 突破QTE反应加成 ---
    showBreakthroughQTE(baseResult, isFinal, realm) {
      const eventArea = document.getElementById('event-area');

      // QTE bar parameters
      const qteGreenPct = 30; // green zone is 30% of bar
      const qteYellowPct = 10; // yellow borders 10% each side
      const qteGreenStart = 50 - qteGreenPct / 2; // 35%
      const qteGreenEnd = 50 + qteGreenPct / 2;   // 65%
      const qteYellowLeftStart = qteGreenStart - qteYellowPct; // 25%
      const qteYellowRightEnd = qteGreenEnd + qteYellowPct;    // 75%
      const qteSpeed = 1.5 + realm * 0.5; // higher realm = faster

      eventArea.innerHTML = `
        <div class="ls-bt-game">
          <div class="ls-bt-title">⚡ 凝神聚气 ⚡</div>
          <div class="ls-bt-hint">灵气涌动！在<span style="color:#4ade80">绿色区域</span>按下以凝聚额外灵力！</div>
          <div class="ls-bt-bar-wrap">
            <div class="ls-bt-bar">
              <div class="ls-bt-zone zone-red" style="left:0;width:${qteYellowLeftStart}%"></div>
              <div class="ls-bt-zone zone-yellow" style="left:${qteYellowLeftStart}%;width:${qteGreenStart - qteYellowLeftStart}%"></div>
              <div class="ls-bt-zone zone-green" style="left:${qteGreenStart}%;width:${qteGreenPct}%"></div>
              <div class="ls-bt-zone zone-yellow" style="left:${qteGreenEnd}%;width:${qteYellowRightEnd - qteGreenEnd}%"></div>
              <div class="ls-bt-zone zone-red" style="left:${qteYellowRightEnd}%;width:${100 - qteYellowRightEnd}%"></div>
              <div class="ls-bt-needle" id="bt-qte-needle"></div>
            </div>
          </div>
          <div class="ls-bt-qte-timer" id="bt-qte-timer">剩余时间：<span id="bt-qte-countdown">3.0</span>秒</div>
          <button class="btn btn-gold ls-bt-stop-btn" id="btn-qte-stop">凝气！</button>
        </div>
      `;

      let qtePos = 0;
      let qteDir = 1;
      let qteRunning = true;
      const qteNeedle = document.getElementById('bt-qte-needle');
      let qteStartTime = performance.now();
      const qteTimeLimit = 3000; // 3 seconds to react
      const countdownEl = document.getElementById('bt-qte-countdown');
      let qteLastTimestamp = null;

      const animateQTE = (timestamp) => {
        if (!qteRunning) return;

        if (qteLastTimestamp === null) {
          qteLastTimestamp = timestamp;
          qteStartTime = timestamp;
        }
        const delta = (timestamp - qteLastTimestamp) / 16.67; // normalize to ~60fps
        qteLastTimestamp = timestamp;

        // Update countdown timer
        const elapsed = timestamp - qteStartTime;
        const remaining = Math.max(0, (qteTimeLimit - elapsed) / 1000);
        countdownEl.textContent = remaining.toFixed(1);

        // Auto-expire
        if (elapsed >= qteTimeLimit) {
          qteRunning = false;
          this.resolveBreakthroughQTE(baseResult, isFinal, 0);
          return;
        }

        qtePos += qteSpeed * qteDir * delta;
        if (qtePos >= 100) { qtePos = 100; qteDir = -1; }
        if (qtePos <= 0) { qtePos = 0; qteDir = 1; }
        qteNeedle.style.left = qtePos + '%';
        requestAnimationFrame(animateQTE);
      };
      requestAnimationFrame(animateQTE);

      document.getElementById('btn-qte-stop').addEventListener('click', () => {
        if (!qteRunning) return;
        qteRunning = false;

        let qteBonus = 0;
        if (qtePos >= qteGreenStart && qtePos <= qteGreenEnd) {
          // In green zone: 10-15% bonus based on precision (closer to center = higher)
          const center = 50;
          const distFromCenter = Math.abs(qtePos - center);
          const maxDist = qteGreenPct / 2;
          const precision = 1 - (distFromCenter / maxDist); // 0 to 1
          qteBonus = 10 + Math.floor(precision * 5); // 10 to 15
        } else if (qtePos >= qteYellowLeftStart && qtePos <= qteYellowRightEnd) {
          // In yellow zone: 5% bonus
          qteBonus = 5;
        }
        // Outside: 0 bonus

        this.resolveBreakthroughQTE(baseResult, isFinal, qteBonus);
      });
    }

    resolveBreakthroughQTE(baseResult, isFinal, qteBonus) {
      const eventArea = document.getElementById('event-area');

      // Show QTE result before proceeding
      let qteResultText = '';
      let qteClass = '';
      if (qteBonus >= 10) {
        qteResultText = `完美凝气！突破加成 +${qteBonus}%！`;
        qteClass = 'result-positive';
      } else if (qteBonus > 0) {
        qteResultText = `凝气成功！突破加成 +${qteBonus}%`;
        qteClass = 'result-positive';
      } else {
        qteResultText = '凝气失败，没有额外加成。';
        qteClass = 'result-negative';
      }

      // Apply QTE bonus to modify the base result
      // If base result was fail_safe, QTE bonus can upgrade it to success
      // If base result was fail_bad, QTE bonus can upgrade it to fail_safe (5%) or success (10%+)
      let finalResult = baseResult;
      if (qteBonus >= 10) {
        if (baseResult === 'fail_safe') finalResult = 'success';
        else if (baseResult === 'fail_bad') finalResult = 'fail_safe';
      } else if (qteBonus >= 5) {
        if (baseResult === 'fail_bad') finalResult = 'fail_safe';
      }

      eventArea.innerHTML = `
        <div class="ls-bt-game">
          <div class="ls-bt-title">⚡ 凝气结果 ⚡</div>
          <div class="ls-event-result ${qteClass}" style="margin-bottom:12px;">${qteResultText}</div>
          <button class="btn btn-gold btn-sm ls-continue-btn" id="btn-qte-proceed">查看突破结果</button>
        </div>
      `;

      document.getElementById('btn-qte-proceed').addEventListener('click', () => {
        this.handleBreakthroughResult(finalResult, isFinal);
      });
    }

    handleBreakthroughResult(result, isFinal) {
      const d = this.game.data;
      let resultText = '';
      let resultClass = '';

      if (result === 'success') {
        d.realm++;
        d.cultivationExp = 0;
        if (isFinal) {
          d.legendary = true;
          resultText = '天劫渡过！你飞升成仙，超脱轮回！！！';
        } else {
          resultText = `突破成功！修为提升至${CULTIVATION_REALMS[d.realm].name}！`;
        }
        resultClass = 'result-positive';
        this.showFloatingText('突破成功！', 'positive');
      } else if (result === 'fail_safe') {
        d.cultivationExp = Math.floor(d.cultivationExp * 0.5);
        resultText = '突破失败，但你安全退出，修为略有回落。';
        resultClass = 'result-negative';
        this.showFloatingText('突破失败', 'negative');
      } else {
        d.cultivationExp = Math.floor(d.cultivationExp * 0.3);
        if (!this.game.hasTalent('dao_heart') && Math.random() < 0.3) {
          if (isFinal) {
            d.killedInBattle = true;
            resultText = '天劫之力太过强大，你未能渡过...';
          } else {
            d.madness = true;
            resultText = '突破失败，走火入魔！';
          }
        } else {
          d.attrs.str = Math.max(1, d.attrs.str - 1);
          d.attrs.spr = Math.max(1, d.attrs.spr - 1);
          resultText = '突破失败，反噬严重！体质-1，灵根-1';
          this.showFloatingText('体质 -1', 'negative');
          this.showFloatingText('灵根 -1', 'negative');
        }
        resultClass = 'result-negative';
      }

      this.game.log.push(`<span class="log-age">[${d.age}岁]</span> ${resultText}`);

      const eventArea = document.getElementById('event-area');
      eventArea.innerHTML = `
        <div class="ls-bt-result">
          <div class="ls-event-result ${resultClass}">${resultText}</div>
          <button class="btn btn-gold btn-sm ls-continue-btn" id="btn-continue">继续</button>
        </div>
      `;

      document.getElementById('btn-continue').addEventListener('click', () => {
        if (d.killedInBattle || d.madness) {
          this.showEnding();
        } else {
          this.game.saveState();
          this.showNextEvent();
        }
      });
    }

    // --- 属性飘字 ---
    showFloatingText(text, type) {
      const el = document.createElement('div');
      el.className = 'ls-float-text ' + (type || '');
      el.textContent = text;
      const offset = this._floatingTextCount++;
      el.style.top = (35 + offset * 6) + '%';
      document.body.appendChild(el);
      el.addEventListener('animationend', () => { el.remove(); this._floatingTextCount = Math.max(0, this._floatingTextCount - 1); });
    }

    _getFollowupChoices(actionId, d) {
      if (Math.random() > 0.20) return null; // 20% chance
      const followups = {
        cultivate: {
          prompt: '修炼中你感到灵力涌动，似乎即将有所突破...',
          choices: [
            { text: '尝试突破', effect: g => { if (Math.random() < 0.4) { g.data.attrs.spr += 2; return '你突破了瓶颈！灵根+2'; } return '突破失败，但你的根基更加稳固。'; } },
            { text: '稳固境界', effect: g => { const exp = 15 + g.getAttrWithTalent('spr') * 2; g.data.cultivationExp = Math.min((g.data.cultivationExp || 0) + exp, REALM_EXP[g.data.realm] || 999); return `你谨慎地夯实根基。修为+${exp}`; } },
          ]
        },
        explore: {
          prompt: '你在历练中发现了一处隐蔽的洞穴...',
          choices: [
            { text: '进入探索', effect: g => { if (Math.random() < 0.5) { const gold = randomInt(30, 80); g.data.gold += gold; return `洞穴中有前人遗留的宝物！金币+${gold}`; } g.data.attrs.str = Math.max(1, g.data.attrs.str - 1); return '洞穴中有毒气，你仓皇逃出。体质-1'; } },
            { text: '标记位置稍后再来', effect: g => { g.data.attrs.int += 1; return '你记下了位置，以后再来。智力+1'; } },
          ]
        },
        trade: {
          prompt: '一位神秘商人向你展示了一件稀有宝物...',
          choices: [
            { text: '花100金购买', effect: g => { if (g.data.gold < 100) return '你囊中羞涩，只能作罢。'; g.data.gold -= 100; g.data.attrs.spr += 2; g.data.attrs.int += 1; return '你购得宝物，修炼大有裨益！灵根+2，智力+1'; } },
            { text: '讨价还价', effect: g => { if (Math.random() < 0.3 + g.getAttrWithTalent('cha') * 0.05) { g.data.gold -= 50; g.data.attrs.spr += 1; return '商人被你说服半价出售。灵根+1'; } return '商人不满你的还价，拂袖而去。'; } },
          ]
        },
        socialize: {
          prompt: '你的朋友告诉你一个秘密...',
          choices: [
            { text: '保守秘密', effect: g => { g.data.attrs.cha += 1; const rels = g.data.relationships || []; if (rels.length > 0) g.modifyAffinity(rels[0].name, 10); return '你值得信赖。魅力+1'; } },
            { text: '利用情报', effect: g => { g.data.gold += 40; g.data.attrs.int += 1; return '你巧妙利用了这个情报。金币+40，智力+1'; } },
          ]
        },
      };
      return followups[actionId] || null;
    }

    _showDejaVuEvent(pastLife) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
      let companionText = pastLife.companion ? `<div style="font-size:0.85rem;margin-top:8px;color:#d4a5ff;">你梦中反复出现一个名叫"${pastLife.companion}"的身影...</div>` : '';
      let sectText = pastLife.sect ? `<div style="font-size:0.85rem;margin-top:4px;color:#4adad4;">你对"${pastLife.sect}"有种莫名的亲切感。</div>` : '';
      overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:400px;width:100%;text-align:center;">
        <div style="font-size:2rem;margin-bottom:8px;">🔮</div>
        <div style="font-size:1.1rem;font-weight:bold;color:var(--gold-light,#ffd700);margin-bottom:12px;">似曾相识</div>
        <div style="font-size:0.9rem;line-height:1.6;margin-bottom:8px;">你做了一个奇怪的梦，梦中你叫"${pastLife.name}"，曾修至${pastLife.realmName}...</div>
        <div style="font-size:0.85rem;color:var(--text-muted);">结局：${pastLife.endingName} | 享年${pastLife.age}岁</div>
        ${companionText}
        ${sectText}
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;">
          <button class="btn btn-gold btn-sm" id="deja-accept">追忆前世</button>
          <button class="btn btn-outline btn-sm" id="deja-ignore">只是一场梦</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);

      document.getElementById('deja-accept').addEventListener('click', () => {
        const d = this.game.data;
        d.attrs.spr = Math.min(10, d.attrs.spr + 1);
        d.cultivationExp = (d.cultivationExp || 0) + 10;
        showToast('前世记忆涌来...灵根+1，修为+10', 'success');
        overlay.remove();
        this.showNextEvent();
      });
      document.getElementById('deja-ignore').addEventListener('click', () => {
        const d = this.game.data;
        d.attrs.luk = Math.min(10, d.attrs.luk + 1);
        showToast('你从梦中醒来，感到格外幸运。运气+1', 'info');
        overlay.remove();
        this.showNextEvent();
      });
    }

    _showNpcDialogue() {
      const d = this.game.data;
      const rels = d.relationships || [];
      if (rels.length === 0) {
        showToast('你还没有认识的人，先去社交吧！', 'info');
        return;
      }
      // Pick a random relationship
      const rel = rels[Math.floor(Math.random() * rels.length)];
      const dialogues = NPC_DIALOGUES[rel.type] || NPC_DIALOGUES.friend;
      // Filter by affinity threshold
      const available = dialogues.filter(dlg => Math.abs(rel.affinity) >= dlg.minAffinity);
      if (available.length === 0) {
        showToast(`${rel.name}对你还不够熟悉...`, 'info');
        return;
      }
      const dlg = available[Math.floor(Math.random() * available.length)];
      const rt = RELATIONSHIP_TYPES[rel.type] || { name: '未知', icon: '❓' };
      // Store target for effects
      this.game._dialogTarget = rel.name;

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
      overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:400px;width:100%;">
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:1.5rem;">${rt.icon}</div>
          <div style="font-size:1.1rem;font-weight:bold;margin:4px 0;">${rel.name} (${rt.name})</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">好感度: ${rel.affinity}</div>
        </div>
        <div style="font-size:0.85rem;color:var(--gold-light,#ffd700);margin-bottom:6px;">${dlg.topic}</div>
        ${dlg.lines.map(l => `<div style="font-size:0.85rem;margin-bottom:6px;line-height:1.5;">${l}</div>`).join('')}
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
          ${dlg.choices.map((c, i) => `<button class="btn btn-outline btn-sm dlg-choice" data-ci="${i}">${c.text}</button>`).join('')}
        </div>
      </div>`;
      document.body.appendChild(overlay);

      overlay.querySelectorAll('.dlg-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const ci = parseInt(btn.dataset.ci);
          const choice = dlg.choices[ci];
          const result = choice.effect(this.game);
          this.game.clampAttrs();
          overlay.querySelector('div > div').innerHTML = `
            <div style="text-align:center;font-size:1.2rem;margin-bottom:12px;">${rt.icon} ${rel.name}</div>
            <div style="font-size:0.9rem;text-align:center;margin-bottom:16px;line-height:1.5;">${result}</div>
            <button class="btn btn-gold btn-sm" id="dlg-done" style="width:100%;">确定</button>`;
          document.getElementById('dlg-done').addEventListener('click', () => {
            overlay.remove();
            delete this.game._dialogTarget;
            this.game.data.eventsSinceAction = 0;
            this.advanceAge();
          });
        });
      });
    }

    _showTrialMinigame() {
      const d = this.game.data;
      const games = ['memory', 'reaction', 'sequence', 'swordduel', 'alchemy'];
      const gameType = games[Math.floor(Math.random() * games.length)];

      const overlay = document.createElement('div');
      overlay.className = 'event-modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(overlay);

      const finishMinigame = (score, maxScore) => {
        if (typeof CrossGameAchievements !== 'undefined') {
          CrossGameAchievements.trackStat('lifesim_minigame_score', score);
        }
        const pct = score / maxScore;
        let reward = '';
        if (pct >= 0.8) {
          d.attrs.int += 2; d.attrs.spr += 1; d.gold += 30;
          reward = '完美通关！智力+2 灵根+1 金币+30';
        } else if (pct >= 0.5) {
          d.attrs.int += 1; d.gold += 15;
          reward = '表现不错！智力+1 金币+15';
        } else {
          d.attrs.str += 1;
          reward = '虽有遗憾，但也有所收获。体质+1';
        }
        this.game.clampAttrs();
        this.game.log.push(`<span class="log-age">[${d.age}岁]</span> 试炼: ${reward}`);

        overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:360px;text-align:center;">
          <h3 style="color:var(--gold,#ffd700);margin-bottom:12px;">试炼结束</h3>
          <div style="font-size:2rem;margin-bottom:8px;">${pct >= 0.8 ? '🏆' : pct >= 0.5 ? '⭐' : '💪'}</div>
          <div style="margin-bottom:8px;">得分: ${score}/${maxScore}</div>
          <div style="color:#4adad4;margin-bottom:12px;">${reward}</div>
          <button class="btn btn-gold btn-sm" id="mg-done">继续</button>
        </div>`;
        overlay.querySelector('#mg-done').addEventListener('click', () => {
          overlay.remove();
          this.game.saveState();
          this.showNextEvent();
        });
      };

      if (gameType === 'memory') {
        // 记忆翻牌游戏
        const symbols = ['🔥', '💧', '⚡', '🌿', '🌙', '☀️'];
        const pairs = symbols.slice(0, 4);
        const cards = [...pairs, ...pairs].sort(() => Math.random() - 0.5);
        let flipped = [], matched = 0, attempts = 0, locked = false;

        const renderMemory = () => {
          overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:400px;">
            <h3 style="text-align:center;color:var(--gold,#ffd700);margin-bottom:12px;">记忆翻牌</h3>
            <div style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">翻牌配对，尝试次数: ${attempts}</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
              ${cards.map((c, i) => {
                const isFlipped = flipped.includes(i);
                const isMatched = c === 'done';
                return `<div class="mg-mem-card" data-idx="${i}" style="height:60px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;border-radius:8px;cursor:pointer;border:2px solid ${isMatched ? '#4ade80' : isFlipped ? 'var(--gold)' : 'var(--border-color)'};background:${isMatched ? '#4ade8020' : isFlipped ? '#ffd70020' : 'var(--bg-darker,#0f172a)'};">${isFlipped || isMatched ? (isMatched ? '✅' : c) : '❓'}</div>`;
              }).join('')}
            </div>
          </div>`;

          overlay.querySelectorAll('.mg-mem-card').forEach(card => {
            card.addEventListener('click', () => {
              if (locked) return;
              const idx = parseInt(card.dataset.idx);
              if (flipped.includes(idx) || cards[idx] === 'done') return;
              flipped.push(idx);
              renderMemory();
              if (flipped.length === 2) {
                locked = true;
                attempts++;
                setTimeout(() => {
                  if (cards[flipped[0]] === cards[flipped[1]]) {
                    cards[flipped[0]] = 'done';
                    cards[flipped[1]] = 'done';
                    matched += 2;
                    if (matched >= cards.length) {
                      const score = Math.max(1, 8 - attempts);
                      finishMinigame(score, 8);
                      return;
                    }
                  }
                  flipped = [];
                  locked = false;
                  renderMemory();
                }, 600);
              }
            });
          });
        };
        renderMemory();

      } else if (gameType === 'reaction') {
        // 反应速度游戏：点击出现的目标
        let score = 0, round = 0, maxRounds = 8;
        const nextTarget = () => {
          if (round >= maxRounds) { finishMinigame(score, maxRounds); return; }
          round++;
          const delay = 500 + Math.random() * 1500;
          overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:360px;text-align:center;">
            <h3 style="color:var(--gold,#ffd700);margin-bottom:8px;">灵兽追击</h3>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;">第${round}/${maxRounds}轮 | 得分: ${score}</div>
            <div style="height:200px;display:flex;align-items:center;justify-content:center;font-size:1rem;color:var(--text-muted);">等待灵兽出现...</div>
          </div>`;
          setTimeout(() => {
            if (!document.body.contains(overlay)) return;
            const x = 20 + Math.random() * 60;
            const y = 20 + Math.random() * 60;
            const icons = ['🐉', '🦊', '🐺', '🦅', '🐅', '🦌'];
            const icon = icons[Math.floor(Math.random() * icons.length)];
            const startTime = Date.now();
            let clicked = false;

            overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:360px;text-align:center;">
              <h3 style="color:var(--gold,#ffd700);margin-bottom:8px;">灵兽追击</h3>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">第${round}/${maxRounds}轮 | 得分: ${score}</div>
              <div style="position:relative;height:200px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-darker,#0f172a);overflow:hidden;">
                <div id="mg-target" style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);font-size:2.5rem;cursor:pointer;animation:fadeIn 0.2s;">${icon}</div>
              </div>
            </div>`;

            const target = overlay.querySelector('#mg-target');
            target.addEventListener('click', () => {
              if (clicked) return;
              clicked = true;
              const reaction = Date.now() - startTime;
              if (reaction < 1200) score++;
              nextTarget();
            });

            setTimeout(() => { if (!clicked && document.body.contains(overlay)) nextTarget(); }, 2000);
          }, delay);
        };
        nextTarget();

      } else if (gameType === 'sequence') {
        // 序列记忆游戏：记住并重复序列
        const symbols = ['🔥', '💧', '⚡', '🌿', '🌙'];
        let seqLen = 3, score = 0, maxScore = 5;

        const playRound = () => {
          if (score >= maxScore || seqLen > 7) { finishMinigame(score, maxScore); return; }
          const seq = [];
          for (let i = 0; i < seqLen; i++) seq.push(Math.floor(Math.random() * symbols.length));

          // Show sequence
          let showIdx = 0;
          const showNext = () => {
            if (showIdx >= seq.length) {
              // Player input phase
              let inputIdx = 0;
              overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:360px;text-align:center;">
                <h3 style="color:var(--gold,#ffd700);margin-bottom:8px;">灵诀记忆</h3>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">重复序列 (${inputIdx}/${seqLen}) | 得分: ${score}</div>
                <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                  ${symbols.map((s, i) => `<button class="mg-seq-btn" data-idx="${i}" style="font-size:2rem;width:56px;height:56px;border-radius:10px;border:2px solid var(--border-color);background:var(--bg-darker,#0f172a);cursor:pointer;">${s}</button>`).join('')}
                </div>
              </div>`;

              overlay.querySelectorAll('.mg-seq-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                  const idx = parseInt(btn.dataset.idx);
                  if (idx === seq[inputIdx]) {
                    inputIdx++;
                    btn.style.borderColor = '#4ade80';
                    if (inputIdx >= seqLen) {
                      score++;
                      seqLen++;
                      setTimeout(playRound, 500);
                    }
                  } else {
                    btn.style.borderColor = '#ff4444';
                    finishMinigame(score, maxScore);
                  }
                });
              });
              return;
            }

            overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:360px;text-align:center;">
              <h3 style="color:var(--gold,#ffd700);margin-bottom:8px;">灵诀记忆</h3>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">记住序列... (${showIdx + 1}/${seqLen})</div>
              <div style="font-size:4rem;height:80px;display:flex;align-items:center;justify-content:center;">${symbols[seq[showIdx]]}</div>
            </div>`;
            showIdx++;
            setTimeout(showNext, 800);
          };
          showNext();
        };
        playRound();

      } else if (gameType === 'swordduel') {
        // 剑术对决：3轮攻防猜拳变体
        const moves = [
          { id: 'slash', name: '横斩', icon: '⚔️', beats: 'thrust' },
          { id: 'thrust', name: '直刺', icon: '🗡️', beats: 'parry' },
          { id: 'parry', name: '格挡', icon: '🛡️', beats: 'slash' },
        ];
        let round = 0, maxRounds = 3, wins = 0, losses = 0;
        const enemyNames = ['剑修弟子', '江湖豪客', '武林高手', '仙门剑客'];
        const enemyName = enemyNames[Math.floor(Math.random() * enemyNames.length)];

        const playDuelRound = () => {
          if (round >= maxRounds) {
            const bonus = wins > losses ? (wins === maxRounds ? 3 : 1) : 0;
            if (bonus > 0) { d.attrs.str += bonus; d.gold += wins * 20; }
            const totalScore = wins * 3 + (maxRounds - losses);
            finishMinigame(totalScore, maxRounds * 4);
            return;
          }
          round++;
          overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:380px;text-align:center;">
            <h3 style="color:var(--gold,#ffd700);margin-bottom:4px;">剑术对决</h3>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">对手: ${enemyName} | 第${round}/${maxRounds}回合 | 胜${wins} 负${losses}</div>
            <div style="font-size:3rem;margin-bottom:12px;">⚔️ vs ${['😠','😤','👿'][round-1]||'😠'}</div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;">横斩克直刺，直刺克格挡，格挡克横斩</div>
            <div style="display:flex;gap:10px;justify-content:center;">
              ${moves.map(m => `<button class="mg-duel-btn" data-move="${m.id}" style="flex:1;padding:12px 8px;border-radius:10px;border:2px solid var(--border-color);background:var(--bg-darker,#0f172a);cursor:pointer;text-align:center;">
                <div style="font-size:2rem;">${m.icon}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${m.name}</div>
              </button>`).join('')}
            </div>
          </div>`;

          overlay.querySelectorAll('.mg-duel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const pMove = moves.find(m => m.id === btn.dataset.move);
              const eMove = moves[Math.floor(Math.random() * moves.length)];
              let resultText, resultColor;
              if (pMove.beats === eMove.id) {
                wins++;
                resultText = `${pMove.icon}${pMove.name} 克制 ${eMove.icon}${eMove.name}，你赢了！`;
                resultColor = '#4ade80';
              } else if (eMove.beats === pMove.id) {
                losses++;
                resultText = `${eMove.icon}${eMove.name} 克制 ${pMove.icon}${pMove.name}，你输了！`;
                resultColor = '#ff6b6b';
              } else {
                resultText = `${pMove.icon}${pMove.name} 对 ${eMove.icon}${eMove.name}，平局！`;
                resultColor = '#ffd700';
              }
              overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:380px;text-align:center;">
                <h3 style="color:var(--gold,#ffd700);margin-bottom:8px;">剑术对决</h3>
                <div style="font-size:2.5rem;margin-bottom:8px;">${pMove.icon} ⚡ ${eMove.icon}</div>
                <div style="color:${resultColor};font-size:1rem;margin-bottom:12px;">${resultText}</div>
                <button class="btn btn-gold btn-sm" id="mg-duel-next">下一回合</button>
              </div>`;
              overlay.querySelector('#mg-duel-next').addEventListener('click', playDuelRound);
            });
          });
        };
        playDuelRound();

      } else if (gameType === 'alchemy') {
        // 炼丹：食材组合匹配
        const ingredients = [
          { id: 'herb', name: '灵草', icon: '🌿', element: 'wood' },
          { id: 'fire_stone', name: '火晶石', icon: '🔥', element: 'fire' },
          { id: 'spring', name: '灵泉水', icon: '💧', element: 'water' },
          { id: 'ore', name: '寒铁矿', icon: '⛰️', element: 'earth' },
          { id: 'pearl', name: '雷灵珠', icon: '⚡', element: 'thunder' },
          { id: 'dew', name: '晨露', icon: '🌙', element: 'yin' },
        ];
        const recipes = [
          { name: '回春丹', combo: ['herb', 'spring'], icon: '💊', score: 2 },
          { name: '火灵丹', combo: ['fire_stone', 'herb'], icon: '🔴', score: 2 },
          { name: '铁骨丹', combo: ['ore', 'spring'], icon: '⚪', score: 2 },
          { name: '雷火丹', combo: ['pearl', 'fire_stone'], icon: '🟡', score: 3 },
          { name: '太阴丹', combo: ['dew', 'spring'], icon: '🟣', score: 2 },
          { name: '天罡丹', combo: ['pearl', 'ore', 'herb'], icon: '🌟', score: 4 },
        ];
        let score = 0, rounds = 0, maxRounds = 3;
        const selected = [];

        const checkRecipe = (sel) => {
          const ids = sel.map(s => s.id).sort();
          return recipes.find(r => {
            const combo = [...r.combo].sort();
            return combo.length === ids.length && combo.every((c, i) => c === ids[i]);
          });
        };

        const renderAlchemy = (msg) => {
          overlay.innerHTML = `<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:420px;">
            <h3 style="text-align:center;color:var(--gold,#ffd700);margin-bottom:4px;">炼丹术</h3>
            <div style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">选择2-3种材料投入丹炉 | 第${rounds+1}/${maxRounds}炉 | 得分:${score}</div>
            ${msg ? `<div style="text-align:center;color:#4adad4;font-size:0.85rem;margin-bottom:8px;">${msg}</div>` : ''}
            <div style="text-align:center;margin-bottom:12px;">
              <span style="font-size:0.75rem;color:var(--text-muted);">丹炉:</span>
              <span style="font-size:1.5rem;margin-left:8px;">${selected.length > 0 ? selected.map(s => s.icon).join(' + ') : '🔥 空'}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
              ${ingredients.map(ing => {
                const isSel = selected.find(s => s.id === ing.id);
                return `<button class="mg-alch-ing" data-id="${ing.id}" style="padding:10px 4px;border-radius:8px;border:2px solid ${isSel ? 'var(--gold)' : 'var(--border-color)'};background:${isSel ? '#ffd70020' : 'var(--bg-darker,#0f172a)'};cursor:pointer;text-align:center;">
                  <div style="font-size:1.5rem;">${ing.icon}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;">${ing.name}</div>
                </button>`;
              }).join('')}
            </div>
            <div style="display:flex;gap:8px;justify-content:center;">
              <button class="btn btn-outline btn-sm" id="mg-alch-clear" ${selected.length===0?'disabled':''}>清空</button>
              <button class="btn btn-gold btn-sm" id="mg-alch-brew" ${selected.length<2?'disabled':''}>开炉炼丹</button>
            </div>
          </div>`;

          overlay.querySelectorAll('.mg-alch-ing').forEach(btn => {
            btn.addEventListener('click', () => {
              const ing = ingredients.find(i => i.id === btn.dataset.id);
              const existIdx = selected.findIndex(s => s.id === ing.id);
              if (existIdx >= 0) { selected.splice(existIdx, 1); }
              else if (selected.length < 3) { selected.push(ing); }
              renderAlchemy();
            });
          });

          const clearBtn = overlay.querySelector('#mg-alch-clear');
          if (clearBtn) clearBtn.addEventListener('click', () => { selected.length = 0; renderAlchemy(); });

          const brewBtn = overlay.querySelector('#mg-alch-brew');
          if (brewBtn) brewBtn.addEventListener('click', () => {
            const recipe = checkRecipe(selected);
            rounds++;
            if (recipe) {
              score += recipe.score;
              selected.length = 0;
              if (rounds >= maxRounds) { finishMinigame(score, maxRounds * 3); }
              else { renderAlchemy(`炼成 ${recipe.icon}${recipe.name}！+${recipe.score}分`); }
            } else {
              selected.length = 0;
              if (rounds >= maxRounds) { finishMinigame(score, maxRounds * 3); }
              else { renderAlchemy('炼丹失败！材料不匹配...'); }
            }
          });
        };
        renderAlchemy();
      }
    }

    _showHistoryLog() {
      const existing = document.getElementById('history-modal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'history-modal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
      const logs = this.game.log || [];
      let logHtml = logs.length === 0 ? '<p style="color:var(--text-muted)">暂无历程记录</p>' :
        logs.map((entry, i) => `<div style="padding:6px 0;border-bottom:1px solid rgba(212,164,74,0.1);font-size:0.85rem;color:var(--text-secondary)"><span style="color:var(--gold);margin-right:8px">${i + 1}.</span>${typeof entry === 'string' ? entry : entry.text || JSON.stringify(entry)}</div>`).join('');
      modal.innerHTML = `<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);max-width:500px;width:100%;max-height:70vh;display:flex;flex-direction:column;">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-family:var(--font-display);color:var(--gold)">📜 修仙历程</h3>
          <button class="btn btn-sm btn-outline" id="close-history">关闭</button>
        </div>
        <div style="padding:12px 20px;overflow-y:auto;flex:1">${logHtml}</div>
      </div>`;
      document.body.appendChild(modal);
      const content = modal.querySelector('div > div:last-child');
      if (content) content.scrollTop = content.scrollHeight;
      document.getElementById('close-history').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    showNgPlusPanel() {
      this.hideAll();
      this.startEl.classList.remove('hidden');

      const ngData = LifeSimGame.getNgPlusData();

      let html = '<div class="back-to-slots" id="back-slots">← 返回存档列表</div>';
      html += '<h2>轮回加成</h2>';
      html += `<div class="ls-ngplus-points">轮回点：${ngData.points || 0}</div>`;
      html += '<div class="ls-ngplus-grid">';
      for (const perk of NG_PLUS_PERKS) {
        const curLevel = (ngData.perks && ngData.perks[perk.id]) || 0;
        const isMax = curLevel >= perk.maxLevel;
        const nextCost = isMax ? 0 : perk.cost[curLevel];
        const canBuy = !isMax && (ngData.points || 0) >= nextCost;
        html += `<div class="ls-ngplus-card ${isMax ? 'maxed' : ''}">
          <div class="ls-ngplus-icon">${perk.icon}</div>
          <div class="ls-ngplus-name">${perk.name}</div>
          <div class="ls-ngplus-desc">${perk.desc}</div>
          <div class="ls-ngplus-level">Lv.${curLevel}/${perk.maxLevel}</div>
          <div class="ls-ngplus-bar"><div class="ls-ngplus-bar-fill" style="width:${(curLevel / perk.maxLevel) * 100}%"></div></div>
          ${isMax ? '<div class="ls-ngplus-status">已满级</div>' : `<button class="btn ${canBuy ? 'btn-purple' : 'btn-outline'} btn-xs" data-ng-perk="${perk.id}" ${canBuy ? '' : 'disabled'}>升级 (${nextCost}点)</button>`}
        </div>`;
      }
      html += '</div>';
      this.startEl.innerHTML = html;

      document.getElementById('back-slots').addEventListener('click', () => this.renderSlotSelection());

      this.startEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ng-perk]');
        if (!btn) return;
        const perkId = btn.dataset.ngPerk;
        if (LifeSimGame.upgradeNgPlusPerk(perkId)) {
          showToast('升级成功！', 'success');
          this.showNgPlusPanel();
        }
      });
    }

    showEndingGallery() {
      this.hideAll();
      this.startEl.classList.remove('hidden');

      const achieved = Storage.get('lifesim_ending_gallery', []);

      let html = '<div class="back-to-slots" id="back-slots">← 返回存档列表</div>';
      html += '<h2>结局图鉴</h2>';
      html += `<div class="ls-gallery-stats"><span>已解锁: ${achieved.length}/${ENDINGS.length}</span></div>`;
      html += '<div class="ls-gallery-grid">';
      for (const ending of ENDINGS) {
        const unlocked = achieved.includes(ending.id);
        html += `<div class="ls-gallery-card ${unlocked ? 'unlocked' : 'locked'}">
          <div class="ls-gallery-icon">${unlocked ? ending.icon : '❓'}</div>
          <div class="ls-gallery-name">${unlocked ? ending.name : '???'}</div>
          ${unlocked ? `<div class="ls-gallery-score">${ending.score}分</div>` : ''}
        </div>`;
      }
      html += '</div>';
      this.startEl.innerHTML = html;

      document.getElementById('back-slots').addEventListener('click', () => this.renderSlotSelection());
    }

    showAchievementPanel() {
      this.hideAll();
      this.startEl.classList.remove('hidden');

      const unlocked = Storage.get('lifesim_achievements', []);
      const stats = Storage.get('lifesim_achievement_stats', {});

      let html = '<div class="back-to-slots" id="back-slots">← 返回存档列表</div>';
      html += '<h2>成就</h2>';
      html += `<div class="ls-ach-stats">
        <span>总轮回: ${stats.totalRuns || 0}</span>
        <span>最高年龄: ${stats.maxAge || 0}岁</span>
        <span>累计金币: ${stats.totalGold || 0}</span>
        <span>已解锁: ${unlocked.length}/${LIFESIM_ACHIEVEMENTS.length}</span>
      </div>`;
      html += '<div class="ls-ach-grid">';
      for (const ach of LIFESIM_ACHIEVEMENTS) {
        const done = unlocked.includes(ach.id);
        html += `<div class="ls-ach-card ${done ? 'completed' : 'locked'}">
          <div class="ls-ach-icon">${ach.icon}</div>
          <div class="ls-ach-name">${ach.name}</div>
          <div class="ls-ach-desc">${ach.desc}</div>
          ${done ? '<div class="ls-ach-status">已达成</div>' : ''}
        </div>`;
      }
      html += '</div>';
      this.startEl.innerHTML = html;

      document.getElementById('back-slots').addEventListener('click', () => this.renderSlotSelection());
    }
  }

  // --- 初始化 ---
  initNav('lifesim');
  initParticles('#particles', 15);
  new LifeSimUI();

  // 新手引导
  if (typeof GuideSystem !== 'undefined') {
    GuideSystem.start('lifesim', [
      { title: '欢迎来到仙途模拟器！', desc: '投胎修仙界，逐年推进，做出抉择，追求飞升成仙。' },
      { title: '创建角色', desc: '输入道号，分配属性点，开始你的仙途人生。', target: '#lifesim-start' },
      { title: '游戏提示', desc: '每年会遇到随机事件，不同选择影响你的命运走向。活得越久越好！' }
    ]);
  }

})();
