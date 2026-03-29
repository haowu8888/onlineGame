/* ========== 斩仙塔 - 肉鸽卡牌攀塔 ========== */
(function () {
  'use strict';

  let _uidCounter = 0;

  // 种子随机函数
  function seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /* ============================================================
     CARD DEFINITIONS (34 cards)
     ============================================================ */
  const CARDS = {
    // --- Starting cards (10) ---
    zhanji: {
      id: 'zhanji', name: '斩击', type: 'attack', cost: 1, art: '🗡',
      desc: '造成{atk}点伤害', atk: 6, upAtk: 9
    },
    huti: {
      id: 'huti', name: '护体', type: 'defense', cost: 1, art: '🛡',
      desc: '获得{blk}点护甲', blk: 5, upBlk: 8
    },
    mingxiang: {
      id: 'mingxiang', name: '冥想', type: 'spell', cost: 1, art: '🧘',
      desc: '抽{draw}张牌', draw: 2, upDraw: 3
    },
    lingqibaofa: {
      id: 'lingqibaofa', name: '灵气爆发', type: 'attack', cost: 2, art: '💥',
      desc: '造成{atk}点伤害', atk: 10, upAtk: 15
    },

    // --- Obtainable Attack (5) ---
    jianqizhan: {
      id: 'jianqizhan', name: '剑气斩', type: 'attack', cost: 1, art: '⚔',
      desc: '造成{atk}点伤害', atk: 8, upAtk: 12
    },
    wanjianjue: {
      id: 'wanjianjue', name: '万剑诀', type: 'attack', cost: 1, art: '🌪',
      desc: '造成{atk}点伤害', atk: 4, upAtk: 7
    },
    pojia: {
      id: 'pojia', name: '破甲击', type: 'attack', cost: 1, art: '🔨',
      desc: '造成{atk}伤害\n敌人护甲-{armorBreak}', atk: 5, upAtk: 7, armorBreak: 3, upArmorBreak: 5
    },
    zhuifengjian: {
      id: 'zhuifengjian', name: '追风剑', type: 'attack', cost: 1, art: '🌬',
      desc: '造成{atk}伤害\n下回合少抽1张', atk: 12, upAtk: 16, drawPenalty: 1
    },
    lianhuanzhan: {
      id: 'lianhuanzhan', name: '连环斩', type: 'attack', cost: 1, art: '🔄',
      desc: '造成{atk}x2次伤害', atk: 4, upAtk: 6, hits: 2
    },

    // --- Obtainable Defense (3) ---
    jinzhongzhao: {
      id: 'jinzhongzhao', name: '金钟罩', type: 'defense', cost: 1, art: '🔔',
      desc: '获得{blk}点护甲', blk: 8, upBlk: 12
    },
    tiebushan: {
      id: 'tiebushan', name: '铁布衫', type: 'defense', cost: 1, art: '🦔',
      desc: '获得{blk}护甲\n获得{thorns}荆棘', blk: 5, upBlk: 7, thorns: 2, upThorns: 3
    },
    lingdunshu: {
      id: 'lingdunshu', name: '灵盾术', type: 'defense', cost: 2, art: '✨',
      desc: '获得{blk}点护甲', blk: 12, upBlk: 18
    },

    // --- Obtainable Spells (7) ---
    xixingdafa: {
      id: 'xixingdafa', name: '吸星大法', type: 'spell', cost: 1, art: '🌑',
      desc: '造成{atk}伤害\n回复{heal}生命', atk: 5, upAtk: 7, heal: 3, upHeal: 5
    },
    tianleizhou: {
      id: 'tianleizhou', name: '天雷咒', type: 'spell', cost: 2, art: '⚡',
      desc: '造成{atk}点伤害', atk: 15, upAtk: 22
    },
    huichunshu: {
      id: 'huichunshu', name: '回春术', type: 'spell', cost: 1, art: '🌿',
      desc: '回复{heal}点生命', heal: 8, upHeal: 12
    },
    julingzhen: {
      id: 'julingzhen', name: '聚灵阵', type: 'spell', cost: 0, art: '🔮',
      desc: '获得{energy}点灵力', energy: 2, upEnergy: 3
    },
    chanding: {
      id: 'chanding', name: '禅定', type: 'spell', cost: 1, art: '☯',
      desc: '抽{draw}张牌\n获得{energy}灵力', draw: 3, upDraw: 4, energy: 1, upEnergy: 1
    },
    daoxintongming: {
      id: 'daoxintongming', name: '道心通明', type: 'spell', cost: 1, art: '🌟',
      desc: '本回合所有牌\n费用-{discount}', discount: 1, upDiscount: 1
    },
    fentianjue: {
      id: 'fentianjue', name: '焚天诀', type: 'spell', cost: 3, art: '🔥',
      desc: '造成{atk}伤害\n弃掉所有手牌', atk: 20, upAtk: 30, discardAll: true
    },

    // --- 新增攻击卡 ---
    lianzhan: { id:'lianzhan', name:'连斩', type:'attack', cost:1, art:'🔪', desc:'造成{atk}x{hits}次伤害', atk:3, upAtk:4, hits:3 },
    pozhanjue: { id:'pozhanjue', name:'破斩诀', type:'attack', cost:2, art:'💀', desc:'造成{atk}伤害，施加易伤{vulnerable}回合', atk:10, upAtk:14, vulnerable:2, upVulnerable:3 },
    xuepenjue: { id:'xuepenjue', name:'血喷诀', type:'attack', cost:1, art:'🩸', desc:'失去{selfDmg}HP，造成{atk}伤害', atk:15, upAtk:22, selfDmg:3 },
    fengshenjian: { id:'fengshenjian', name:'封神剑', type:'attack', cost:2, art:'🌊', desc:'造成{atk}伤害，每有1护甲+1', atk:8, upAtk:10, scalesWithBlock:true },
    yinleizhang: { id:'yinleizhang', name:'引雷掌', type:'attack', cost:1, art:'🖐️', desc:'造成{atk}伤害，虚弱{applyWeak}回合', atk:5, upAtk:7, applyWeak:2, upApplyWeak:3 },
    // --- 新增防御卡 ---
    wuweishenggong: { id:'wuweishenggong', name:'无为神功', type:'defense', cost:2, art:'🌀', desc:'获得{blk}护甲，回复{heal}HP', blk:10, upBlk:14, heal:5, upHeal:8 },
    xuantiandun: { id:'xuantiandun', name:'玄天盾', type:'defense', cost:1, art:'🔵', desc:'获得{blk}护甲，抽{draw}张牌', blk:4, upBlk:6, draw:1, upDraw:2 },
    // --- 新增法术卡 ---
    qiyunluanwu: { id:'qiyunluanwu', name:'气运乱舞', type:'spell', cost:1, art:'🎲', desc:'获得{strength}点力量', strength:2, upStrength:3 },
    taijiyin: { id:'taijiyin', name:'太极引', type:'spell', cost:0, art:'☯', desc:'抽{draw}张牌', draw:1, upDraw:2 },
    lingxuchan: { id:'lingxuchan', name:'灵虚蝉', type:'spell', cost:1, art:'🦗', desc:'所有敌人易伤{vulnerable}回合', vulnerable:1, upVulnerable:2, targetAll:true },
    tuntianfa: { id:'tuntianfa', name:'吞天法', type:'spell', cost:2, art:'🕳️', desc:'造成{atk}伤害，回复等量HP', atk:8, upAtk:12, lifestealFull:true },
    shenhunmie: { id:'shenhunmie', name:'神魂灭', type:'spell', cost:3, art:'💫', desc:'造成{atk}伤害(每回合+{atk})', atk:5, upAtk:8, retainScaling:true },
    wuxiangdun: { id:'wuxiangdun', name:'无相遁', type:'spell', cost:1, art:'👻', desc:'获得{blk}护甲，下回合多抽{drawNext}张', blk:6, upBlk:8, drawNext:1, upDrawNext:2 },
    huangquanlian: { id:'huangquanlian', name:'黄泉炼', type:'spell', cost:2, art:'🔥', desc:'消耗1张手牌，获得{strength}力量', strength:3, upStrength:5, requiresExhaust:true },
    tiandijue: { id:'tiandijue', name:'天地诀', type:'spell', cost:4, art:'🌌', desc:'造成{atk}伤害，获得{blk}护甲', atk:20, upAtk:30, blk:20, upBlk:30 },
    // --- Phase 3F 新增卡牌 ---
    huoyanzhang: { id:'huoyanzhang', name:'火焰掌', type:'attack', cost:1, art:'🔥', desc:'造成{atk}伤害，灼烧{burn}回合', atk:6, upAtk:9, burn:2, upBurn:3 },
    bingfengjian: { id:'bingfengjian', name:'冰封剑', type:'attack', cost:2, art:'❄️', desc:'造成{atk}伤害，冻结1回合', atk:12, upAtk:16, freeze:1 },
    liehunzhua: { id:'liehunzhua', name:'裂魂爪', type:'attack', cost:1, art:'🦅', desc:'造成{atk}x{hits}次伤害', atk:2, upAtk:3, hits:4 },
    poxuzhan: { id:'poxuzhan', name:'破虚斩', type:'attack', cost:2, art:'🌀', desc:'造成{atk}伤害，无视护甲', atk:14, upAtk:20, ignoreBlock:true },
    xuanfengzhan: { id:'xuanfengzhan', name:'旋风斩', type:'attack', cost:1, art:'🌪️', desc:'造成{atk}伤害(全体)', atk:6, upAtk:9, aoe:true },
    lingguishu: { id:'lingguishu', name:'灵龟术', type:'defense', cost:1, art:'🐢', desc:'获得{blk}护甲，荆棘{thorns}', blk:6, upBlk:9, thorns:3, upThorns:5 },
    jiutianbi: { id:'jiutianbi', name:'九天壁', type:'defense', cost:2, art:'🏔️', desc:'获得{blk}护甲，每层+2', blk:8, upBlk:12, scalesPerFloor:2 },
    choupaifa: { id:'choupaifa', name:'抽牌法', type:'spell', cost:0, art:'🃏', desc:'抽{draw}张牌，弃{discard}张', draw:3, upDraw:4, discard:1 },
    douzhuan: { id:'douzhuan', name:'斗转星移', type:'spell', cost:1, art:'💫', desc:'将{blkToAtk}护甲转为伤害', blkToAtk:true },
    xuemaipen: { id:'xuemaipen', name:'血脉喷涌', type:'spell', cost:0, art:'💉', desc:'失去{selfDmg}HP，抽{draw}张牌', selfDmg:3, upSelfDmg:2, draw:2, upDraw:3 },
    jingangquan: { id:'jingangquan', name:'金刚拳', type:'attack', cost:2, art:'👊', desc:'造成{atk}伤害，获得{blk}护甲', atk:8, upAtk:12, blk:8, upBlk:12 },
    shengmingzhishui: { id:'shengmingzhishui', name:'生命之水', type:'spell', cost:1, art:'💧', desc:'回复{heal}HP，清除毒', heal:6, upHeal:10, clearPoison:true },
    hundunyin: { id:'hundunyin', name:'混沌印', type:'spell', cost:2, art:'🌑', desc:'全体敌人施毒{poison}', poison:3, upPoison:5, targetAll:true },
    fenxingdun: { id:'fenxingdun', name:'分星盾', type:'defense', cost:1, art:'⭐', desc:'获得{blk}护甲x{hits}次', blk:3, upBlk:4, hits:2 },
    wuduzhu: { id:'wuduzhu', name:'五毒珠', type:'spell', cost:1, art:'☠️', desc:'施毒{poison}，抽{draw}张牌', poison:4, upPoison:6, draw:1, upDraw:1 },
    xingchenzhui: { id:'xingchenzhui', name:'星辰坠', type:'attack', cost:3, art:'☄️', desc:'造成{atk}伤害(全体)', atk:15, upAtk:22, aoe:true },

    // --- Class-exclusive cards ---
    // Swordsman (剑修)
    jianxiu_zhanlian: { id:'jianxiu_zhanlian', name:'斩连', type:'attack', cost:1, art:'⚔️', desc:'造成{atk}伤害，力量加成x2', atk:5, upAtk:8, strScale:2, classOnly:'swordsman' },
    jianxiu_jianzhen: { id:'jianxiu_jianzhen', name:'剑阵', type:'attack', cost:2, art:'🌟', desc:'造成{atk}伤害{hits}次', atk:4, upAtk:6, hits:3, classOnly:'swordsman' },
    jianxiu_pojun: { id:'jianxiu_pojun', name:'破军', type:'attack', cost:0, art:'💢', desc:'造成{atk}伤害，力量+{strGain}', atk:3, upAtk:5, strGain:1, classOnly:'swordsman' },
    // Talisman (符修)
    fuxiu_lingfu: { id:'fuxiu_lingfu', name:'灵符', type:'spell', cost:1, art:'📜', desc:'施毒{poison}并造成{atk}伤害', poison:3, upPoison:5, atk:4, upAtk:6, classOnly:'talisman' },
    fuxiu_fuzhuan: { id:'fuxiu_fuzhuan', name:'符篆连环', type:'spell', cost:1, art:'🔮', desc:'抽{draw}张牌，下张牌费-1', draw:1, upDraw:2, nextDiscount:1, classOnly:'talisman' },
    fuxiu_baopo: { id:'fuxiu_baopo', name:'爆破符', type:'attack', cost:2, art:'💣', desc:'造成{atk}伤害(全体)，施毒{poison}', atk:8, upAtk:12, aoe:true, poison:2, upPoison:3, classOnly:'talisman' },
    // Body Cultivator (体修)
    tixiu_tiebi: { id:'tixiu_tiebi', name:'铁壁', type:'defense', cost:1, art:'🏛️', desc:'获得{blk}护甲，荆棘+{thornGain}', blk:8, upBlk:12, thornGain:2, classOnly:'body' },
    tixiu_gangti: { id:'tixiu_gangti', name:'钢体', type:'defense', cost:2, art:'💎', desc:'获得{blk}护甲，回复{heal}HP', blk:10, upBlk:15, heal:4, upHeal:6, classOnly:'body' },
    tixiu_zhendan: { id:'tixiu_zhendan', name:'震弹', type:'attack', cost:1, art:'🔰', desc:'造成等于护甲值的伤害', blkAsDmg:true, classOnly:'body' }
  };

  /* Card instance factory */
  function makeCard(id, upgraded) {
    const tmpl = CARDS[id];
    if (!tmpl) return null;
    const c = { ...tmpl, upgraded: !!upgraded, uid: 'c' + (++_uidCounter) };
    if (upgraded) {
      if (c.upAtk !== undefined) c.atk = c.upAtk;
      if (c.upBlk !== undefined) c.blk = c.upBlk;
      if (c.upDraw !== undefined) c.draw = c.upDraw;
      if (c.upHeal !== undefined) c.heal = c.upHeal;
      if (c.upEnergy !== undefined) c.energy = c.upEnergy;
      if (c.upPoison !== undefined) c.poison = c.upPoison;
      if (c.upBurn !== undefined) c.burn = c.upBurn;
      if (c.upThorns !== undefined) c.thorns = c.upThorns;
      if (c.upArmorBreak !== undefined) c.armorBreak = c.upArmorBreak;
      if (c.upDiscount !== undefined) c.discount = c.upDiscount;
      if (c.upVulnerable !== undefined) c.vulnerable = c.upVulnerable;
      if (c.upApplyWeak !== undefined) c.applyWeak = c.upApplyWeak;
      if (c.upStrength !== undefined) c.strength = c.upStrength;
      if (c.upDrawNext !== undefined) c.drawNext = c.upDrawNext;
      c.name = tmpl.name + '+';
    }
    return c;
  }

  // Keyword tooltips dictionary
  const KEYWORD_TOOLTIPS = {
    '易伤': '受到攻击时伤害+50%，持续数回合',
    '虚弱': '攻击造成的伤害-25%，持续数回合',
    '中毒': '每回合开始时受到等量毒素伤害',
    '毒': '每回合开始时受到等量毒素伤害',
    '灼烧': '每回合开始时受到等量灼烧伤害',
    '力量': '每点力量使攻击伤害+1',
    '护甲': '抵挡等量的攻击伤害，回合结束后清零',
    '荆棘': '受到攻击时反弹伤害给攻击者',
    '冻结': '跳过下一次行动',
    '破甲': '移除敌人的护甲',
    '抽牌': '从牌库抽取卡牌到手牌',
    '灵力': '出牌所需消耗的资源，每回合回复',
    '缠绕': '无法行动',
  };

  function cardDescResolved(card) {
    let text = card.desc.replace(/\{(\w+)\}/g, (_, key) => card[key] || 0);
    // Wrap known keywords with tooltip spans
    for (const [keyword, tip] of Object.entries(KEYWORD_TOOLTIPS)) {
      // Only wrap if not already inside a tag
      text = text.replace(new RegExp(keyword, 'g'), `<span class="ct-keyword-tip" data-tip="${tip}">${keyword}</span>`);
    }
    return text;
  }

  function getCardTags(card) {
    const tags = [];
    if (!card) return tags;

    if (card.type === 'attack') tags.push('攻击');
    else if (card.type === 'defense') tags.push('防御');
    else if (card.type === 'spell') tags.push('法术');

    if (card.aoe || card.targetAll) tags.push('群攻');
    if ((card.hits || 1) > 1) tags.push('多段');
    if (card.draw) tags.push('抽牌');
    if (card.energy) tags.push('灵力');
    if (card.blk) tags.push('护甲');
    if (card.heal || card.lifestealFull) tags.push('回复');
    if (card.poison) tags.push('中毒');
    if (card.burn) tags.push('灼烧');
    if (card.freeze) tags.push('冻结');
    if (card.vulnerable) tags.push('易伤');
    if (card.applyWeak) tags.push('虚弱');
    if (card.discount || card.nextDiscount) tags.push('减费');
    if (card.armorBreak) tags.push('破甲');
    if (card.retainScaling || card.scalesWithBlock) tags.push('成长');
    if (card.selfDmg) tags.push('代价');
    if (card.discardAll || card.requiresExhaust) tags.push('弃牌');

    return Array.from(new Set(tags));
  }

  function renderTagChips(tags, max = 5) {
    if (!tags || tags.length === 0) return '';
    const shown = tags.slice(0, max);
    return `<div class="ct-card-tags">${shown.map(t => `<span class="ct-tag">${escapeHtml(t)}</span>`).join('')}</div>`;
  }

  function getBuildSummary(deck, relicIds) {
    const counts = new Map();
    (deck || []).forEach(c => {
      const tags = getCardTags(c);
      tags.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
    });

    // Relic set “方向提示”
    const setCounts = getRelicSetCounts(relicIds || []);
    for (const [setId, ct] of Object.entries(setCounts)) {
      const set = RELIC_SETS_MAP[setId];
      if (!set) continue;
      counts.set(set.name, (counts.get(set.name) || 0) + ct * 2);
    }

    const blacklist = new Set(['攻击', '防御', '法术']);
    const sorted = Array.from(counts.entries())
      .filter(([k]) => !blacklist.has(k))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    return sorted;
  }

  const OBTAINABLE_IDS = [
    'jianqizhan', 'wanjianjue', 'pojia', 'zhuifengjian', 'lianhuanzhan',
    'jinzhongzhao', 'tiebushan', 'lingdunshu',
    'xixingdafa', 'tianleizhou', 'huichunshu', 'julingzhen', 'chanding', 'daoxintongming', 'fentianjue',
    'lianzhan', 'pozhanjue', 'xuepenjue', 'fengshenjian', 'yinleizhang',
    'wuweishenggong', 'xuantiandun',
    'qiyunluanwu', 'taijiyin', 'lingxuchan', 'tuntianfa', 'shenhunmie', 'wuxiangdun', 'huangquanlian', 'tiandijue',
    'huoyanzhang', 'bingfengjian', 'liehunzhua', 'poxuzhan', 'xuanfengzhan',
    'lingguishu', 'jiutianbi',
    'choupaifa', 'douzhuan', 'xuemaipen', 'jingangquan', 'shengmingzhishui', 'hundunyin', 'fenxingdun', 'wuduzhu', 'xingchenzhui'
  ];

  /* ============================================================
     ENEMY & BOSS DEFINITIONS
     ============================================================ */
  const ENEMY_TEMPLATES = {
    xiaoyao: {
      id: 'xiaoyao', name: '小妖', sprite: '👹', maxHp: 20,
      pattern: [
        { type: 'attack', dmg: 8, label: '妖爪 攻击8' },
        { type: 'defend', blk: 4, label: '蜷缩 护甲4' }
      ]
    },
    yaoxiu: {
      id: 'yaoxiu', name: '妖修', sprite: '👿', maxHp: 35,
      pattern: [
        { type: 'attack', dmg: 12, poison: 2, label: '毒攻 伤害12+毒2' },
        { type: 'attack', dmg: 8, label: '妖术 攻击8' }
      ]
    },
    moxiu: {
      id: 'moxiu', name: '魔修', sprite: '🧙', maxHp: 50,
      pattern: [
        { type: 'attack', dmg: 10, steal: 1, label: '夺灵 伤害10+窃牌' },
        { type: 'attack', dmg: 14, label: '魔击 攻击14' }
      ]
    },
    hunxiushi: { id:'hunxiushi', name:'魂修士', sprite:'💀', maxHp:70, pattern:[
      {type:'attack',dmg:16,label:'魂斩 攻击16'},{type:'special',poison:3,label:'魂毒 施毒3'},{type:'attack',dmg:12,steal:1,label:'夺魂 伤害12+窃牌'}
    ]},
    yaoshou: { id:'yaoshou', name:'妖兽', sprite:'🦁', maxHp:90, pattern:[
      {type:'attack',dmg:20,label:'兽爪 攻击20'},{type:'defend',blk:8,label:'坚甲 护甲8'},{type:'attack',dmg:15,label:'撕咬 攻击15'}
    ]},
    xuwushi: { id:'xuwushi', name:'虚无氏', sprite:'🌫️', maxHp:60, pattern:[
      {type:'special',bind:true,label:'虚空禁 封印1回合'},{type:'attack',dmg:22,label:'虚无斩 攻击22'},{type:'special',poison:4,label:'虚无毒 施毒4'}
    ]},
    // --- Phase 3D 新增敌人 ---
    huoling: { id:'huoling', name:'火灵', sprite:'🔥', maxHp:45, pattern:[
      {type:'attack',dmg:14,label:'火焰 攻击14'},{type:'special',burn:3,label:'灼烧 燃烧3'}
    ]},
    bingpo: { id:'bingpo', name:'冰魄', sprite:'❄️', maxHp:55, pattern:[
      {type:'attack',dmg:10,label:'冰锥 攻击10'},{type:'special',bind:true,label:'冰冻 封印1回合'},{type:'attack',dmg:16,label:'寒冰 攻击16'}
    ]},
    shimagui: { id:'shimagui', name:'尸魔鬼', sprite:'🧟', maxHp:80, pattern:[
      {type:'attack',dmg:18,label:'鬼爪 攻击18'},{type:'attack',dmg:12,poison:3,label:'尸毒 伤害12+毒3'},{type:'special',enrage:3,label:'嗜血 攻击力+3'}
    ]},
    tianyaoke: { id:'tianyaoke', name:'天妖客', sprite:'👻', maxHp:100, pattern:[
      {type:'attack',dmg:20,steal:1,label:'摄魂 伤害20+窃牌'},{type:'special',poison:4,label:'天毒 施毒4'},{type:'attack',dmg:25,label:'妖刃 攻击25'}
    ]},
    longwei: { id:'longwei', name:'龙卫', sprite:'🐉', maxHp:120, pattern:[
      {type:'attack',dmg:22,label:'龙爪 攻击22'},{type:'defend',blk:12,label:'龙鳞 护甲12'},{type:'attack',dmg:28,label:'龙息 攻击28'}
    ]},
    xianbing: { id:'xianbing', name:'仙兵', sprite:'⚔️', maxHp:110, pattern:[
      {type:'attack',dmg:20,label:'天剑 攻击20'},{type:'attack',dmg:15,label:'阵法 攻击15'},{type:'defend',blk:10,label:'阵守 护甲10'}
    ]},
    moying: { id:'moying', name:'魔影', sprite:'🦇', maxHp:95, pattern:[
      {type:'attack',dmg:16,lifesteal:true,label:'吸血 吸血16'},{type:'special',bind:true,label:'暗影 封印1回合'},{type:'attack',dmg:24,label:'魔影斩 攻击24'}
    ]},
    leishou: { id:'leishou', name:'雷兽', sprite:'🐺', maxHp:130, pattern:[
      {type:'attack',dmg:26,label:'雷击 攻击26'},{type:'special',enrage:5,label:'电怒 攻击力+5'},{type:'attack',dmg:18,label:'雷齿 攻击18'}
    ]}
  };

  const BOSS_TEMPLATES = {
    sheyao: {
      id: 'sheyao', name: '蛇妖', sprite: '🐍', maxHp: 80, isBoss: true,
      pattern: [
        { type: 'attack', dmg: 15, label: '蛇咬 攻击15' },
        { type: 'special', poison: 5, label: '毒雾 施毒5' },
        { type: 'special', bind: true, label: '缠绕 封印1回合' }
      ]
    },
    yaojiang: {
      id: 'yaojiang', name: '妖将', sprite: '👺', maxHp: 120, isBoss: true,
      pattern: [
        { type: 'attack', dmg: 18, label: '妖刀 攻击18' },
        { type: 'special', summon: true, label: '召唤 唤出小妖' },
        { type: 'special', enrage: 5, label: '狂暴 攻击力+5' }
      ]
    },
    mozun: {
      id: 'mozun', name: '魔尊', sprite: '😈', maxHp: 180, isBoss: true,
      pattern: [
        { type: 'attack', dmg: 20, label: '魔灭 攻击20' },
        { type: 'attack', dmg: 10, lifesteal: true, label: '吸魂 吸血10' },
        { type: 'special', charge: true, label: '蓄力...' },
        { type: 'attack', dmg: 25, label: '魔神降世 攻击25' }
      ]
    },
    tianlei: { id:'tianlei', name:'天雷兽', sprite:'⚡', maxHp:250, isBoss:true, pattern:[
      {type:'attack',dmg:22,label:'雷击 攻击22'},{type:'special',enrage:6,label:'雷怒 攻击力+6'},
      {type:'attack',dmg:16,poison:3,label:'雷毒 伤害16+毒3'},{type:'special',charge:true,label:'蓄雷...'},
      {type:'attack',dmg:30,label:'天雷轰顶 攻击30'}
    ]},
    hundun: { id:'hundun', name:'混沌', sprite:'🌑', maxHp:350, isBoss:true, pattern:[
      {type:'attack',dmg:25,label:'混沌吞噬 攻击25'},{type:'special',summon:'xiaoyao',label:'混沌分身 召唤'},
      {type:'special',poison:5,label:'混沌侵蚀 施毒5'},{type:'attack',dmg:18,lifesteal:true,label:'虚空吸收 吸血18'},
      {type:'special',charge:true,label:'混沌凝聚...'},{type:'attack',dmg:40,label:'混沌湮灭 攻击40'}
    ]},
    // --- Phase 3D 新增Boss ---
    yanhuo: { id:'yanhuo', name:'炎火大帝', sprite:'🌋', maxHp:300, isBoss:true, pattern:[
      {type:'attack',dmg:22,label:'烈焰冲击 攻击22'},{type:'special',burn:5,label:'天火焚世 灼烧5'},
      {type:'attack',dmg:16,label:'火雨 攻击16'},{type:'special',enrage:8,label:'炎帝之怒 攻击力+8'},
      {type:'attack',dmg:30,label:'焚天灭地 攻击30'}
    ]},
    binghuang: { id:'binghuang', name:'冰皇', sprite:'🧊', maxHp:320, isBoss:true, pattern:[
      {type:'attack',dmg:18,label:'冰枪 攻击18'},{type:'special',bind:true,label:'绝对零度 封印1回合'},
      {type:'defend',blk:15,label:'冰壁 护甲15'},{type:'attack',dmg:24,poison:4,label:'冰霜侵蚀 伤害24+毒4'},
      {type:'special',charge:true,label:'极寒凝聚...'},{type:'attack',dmg:35,label:'冰川崩裂 攻击35'}
    ]},
    shiwang: { id:'shiwang', name:'尸王', sprite:'💀', maxHp:400, isBoss:true, pattern:[
      {type:'attack',dmg:20,lifesteal:true,label:'噬魂 吸血20'},{type:'special',summon:'shimagui',label:'召唤尸魔'},
      {type:'special',poison:6,label:'尸毒弥漫 施毒6'},{type:'attack',dmg:26,steal:1,label:'夺命 伤害26+窃牌'},
      {type:'special',enrage:7,label:'暴走 攻击力+7'},{type:'attack',dmg:32,label:'灭世之握 攻击32'}
    ]},
    longhuang: { id:'longhuang', name:'龙皇', sprite:'🐲', maxHp:450, isBoss:true, pattern:[
      {type:'attack',dmg:28,label:'龙息喷射 攻击28'},{type:'defend',blk:18,label:'龙鳞护体 护甲18'},
      {type:'special',enrage:6,label:'龙威 攻击力+6'},{type:'attack',dmg:22,lifesteal:true,label:'生命虹吸 吸血22'},
      {type:'special',charge:true,label:'龙啸九天...'},{type:'attack',dmg:45,label:'龙皇灭世 攻击45'}
    ]},
    mojun: { id:'mojun', name:'天魔君', sprite:'👹', maxHp:500, isBoss:true, pattern:[
      {type:'attack',dmg:30,label:'魔剑 攻击30'},{type:'special',poison:5,label:'魔气侵染 施毒5'},
      {type:'attack',dmg:20,steal:1,label:'夺灵 伤害20+窃牌'},{type:'special',summon:'moying',label:'召唤魔影'},
      {type:'special',charge:true,label:'天魔降世...'},{type:'attack',dmg:50,label:'天魔一击 攻击50'}
    ]},
    tiandao: { id:'tiandao', name:'天道化身', sprite:'☀️', maxHp:600, isBoss:true, pattern:[
      {type:'attack',dmg:32,label:'天罚 攻击32'},{type:'special',bind:true,label:'天道禁锢 封印1回合'},
      {type:'defend',blk:20,label:'天道守护 护甲20'},{type:'attack',dmg:24,lifesteal:true,label:'天道轮回 吸血24'},
      {type:'special',enrage:10,label:'天怒 攻击力+10'},{type:'special',charge:true,label:'天道审判...'},
      {type:'attack',dmg:60,label:'天道湮灭 攻击60'}
    ]},
    xianjun: { id:'xianjun', name:'堕仙君', sprite:'😇', maxHp:550, isBoss:true, pattern:[
      {type:'attack',dmg:28,label:'仙剑 攻击28'},{type:'special',poison:4,label:'仙毒 施毒4'},
      {type:'attack',dmg:20,lifesteal:true,label:'吸灵 吸血20'},{type:'defend',blk:16,label:'仙盾 护甲16'},
      {type:'special',charge:true,label:'仙法凝聚...'},{type:'attack',dmg:48,label:'诛仙一剑 攻击48'}
    ]},
    guishen: { id:'guishen', name:'鬼神', sprite:'👺', maxHp:480, isBoss:true, pattern:[
      {type:'attack',dmg:26,label:'鬼斩 攻击26'},{type:'special',summon:'hunxiushi',label:'召唤魂修'},
      {type:'special',bind:true,label:'鬼锁 封印1回合'},{type:'attack',dmg:22,poison:5,label:'鬼毒 伤害22+毒5'},
      {type:'special',charge:true,label:'鬼神降临...'},{type:'attack',dmg:42,label:'鬼神灭 攻击42'}
    ]},
    yuanshen: { id:'yuanshen', name:'原始神兽', sprite:'🦖', maxHp:520, isBoss:true, pattern:[
      {type:'attack',dmg:30,label:'神爪 攻击30'},{type:'defend',blk:14,label:'神甲 护甲14'},
      {type:'special',enrage:8,label:'远古之怒 攻击力+8'},{type:'attack',dmg:20,lifesteal:true,label:'生命汲取 吸血20'},
      {type:'special',charge:true,label:'原始之力...'},{type:'attack',dmg:55,label:'原始灭绝 攻击55'}
    ]},
    xukong: { id:'xukong', name:'虚空主宰', sprite:'🕳️', maxHp:700, isBoss:true, pattern:[
      {type:'attack',dmg:35,label:'虚空斩 攻击35'},{type:'special',bind:true,label:'虚空封印 封印1回合'},
      {type:'special',poison:7,label:'虚空侵蚀 施毒7'},{type:'attack',dmg:25,steal:1,label:'虚空窃取 伤害25+窃牌'},
      {type:'special',summon:'xuwushi',label:'虚空分身 召唤'},{type:'special',charge:true,label:'虚空坍缩...'},
      {type:'attack',dmg:70,label:'虚空湮灭 攻击70'}
    ]}
  };

  /* Tower Structure */
  ENEMY_TEMPLATES.xiaoyao.maxHp = 18;
  ENEMY_TEMPLATES.xiaoyao.pattern[0].dmg = 7;
  ENEMY_TEMPLATES.yaoxiu.maxHp = 32;
  ENEMY_TEMPLATES.yaoxiu.pattern[0].dmg = 11;
  ENEMY_TEMPLATES.yaoxiu.pattern[1].dmg = 7;
  ENEMY_TEMPLATES.moxiu.maxHp = 46;
  ENEMY_TEMPLATES.moxiu.pattern[0].dmg = 9;
  ENEMY_TEMPLATES.moxiu.pattern[1].dmg = 13;
  BOSS_TEMPLATES.sheyao.maxHp = 75;
  BOSS_TEMPLATES.sheyao.pattern[0].dmg = 14;

  const FLOORS = [
    // 第一幕：妖域
    { name:'第一层 · 练气', enemies:['xiaoyao','xiaoyao','xiaoyao'], boss:'sheyao' },
    { name:'第二层 · 筑基', enemies:['yaoxiu','yaoxiu','yaoxiu'], boss:'yaojiang' },
    { name:'第三层 · 金丹', enemies:['moxiu','moxiu','moxiu'], boss:'mozun' },
    { name:'第四层 · 元婴', enemies:['hunxiushi','hunxiushi','yaoshou'], boss:'tianlei' },
    { name:'第五层 · 化神', enemies:['yaoshou','hunxiushi','xuwushi'], boss:'hundun' },
    // 第二幕：魔渊
    { name:'第六层 · 魔域入口', enemies:['huoling','huoling','bingpo'], boss:'yanhuo' },
    { name:'第七层 · 寒冰地狱', enemies:['bingpo','bingpo','shimagui'], boss:'binghuang' },
    { name:'第八层 · 尸王墓', enemies:['shimagui','shimagui','tianyaoke'], boss:'shiwang' },
    { name:'第九层 · 妖兽巢穴', enemies:['tianyaoke','moying','longwei'], boss:'guishen' },
    { name:'第十层 · 龙渊', enemies:['longwei','longwei','moying'], boss:'longhuang' },
    // 第三幕：天道
    { name:'第十一层 · 仙门', enemies:['xianbing','xianbing','leishou'], boss:'xianjun' },
    { name:'第十二层 · 魔殿', enemies:['moying','tianyaoke','leishou'], boss:'mojun' },
    { name:'第十三层 · 原始秘境', enemies:['longwei','leishou','xianbing'], boss:'yuanshen' },
    { name:'第十四层 · 天道之路', enemies:['xianbing','longwei','tianyaoke'], boss:'tiandao' },
    { name:'第十五层 · 虚空终焉', enemies:['leishou','moying','longwei'], boss:'xukong' },
  ];


  const TOWER_NODE_META = {
    battle: { name: '??', icon: '?', shortLabel: '?', reward: '?????' },
    elite: { name: '??', icon: '?', shortLabel: '?', reward: '?????' },
    event: { name: '??', icon: '?', shortLabel: '?', reward: '????' },
    rest: { name: '??', icon: '?', shortLabel: '?', reward: '?? / ?? / ??' },
    shop: { name: '??', icon: '??', shortLabel: '?', reward: '???? / ??' },
    boss: { name: '??', icon: '??', shortLabel: '?', reward: '?????' },
  };

  const ENEMY_AFFIXES = {
    berserk: { id: 'berserk', name: '??', shortDesc: '???????', desc: '??????? +2?' },
    thorns: { id: 'thorns', name: '??', shortDesc: '?????', desc: '????????? 2?' },
    warded: { id: 'warded', name: '??', shortDesc: '????', desc: '???? 12 ??????????? 4 ???' },
    frail_open: { id: 'frail_open', name: '??', shortDesc: '?????', desc: '???????? 1 ????' },
  };

  const RARE_REWARD_CARD_IDS = [
    'tianleizhou', 'fentianjue', 'daoxintongming', 'chanding', 'lingdunshu',
    'tiandijue', 'shengmingzhishui', 'xingchenzhui', 'hundunyin', 'jiutianbi'
  ];

  const TOWER_PATH_ACTS = [
    { id: 'rift', name: '????', battlePool: ['xiaoyao', 'yaoxiu', 'moxiu'], elitePool: ['moxiu', 'hunxiushi', 'yaoshou'], bossPool: ['sheyao', 'yaojiang', 'mozun'], eventPool: ['treasure', 'altar', 'gambler'] },
    { id: 'abyss', name: '????', battlePool: ['huoling', 'bingpo', 'shimagui', 'tianyaoke'], elitePool: ['shimagui', 'tianyaoke', 'longwei'], bossPool: ['yanhuo', 'binghuang', 'shiwang'], eventPool: ['treasure', 'altar', 'gambler'] },
    { id: 'heaven', name: '????', battlePool: ['xianbing', 'moying', 'leishou', 'longwei'], elitePool: ['moying', 'leishou', 'xianbing'], bossPool: ['xianjun', 'tiandao', 'xukong'], eventPool: ['treasure', 'altar', 'gambler'] },
  ];

  const TOWER_ROW_BLUEPRINTS = [
    [
      [['battle', 'event', 'rest'], ['battle', 'event', 'shop']],
      [['elite', 'battle'], ['battle', 'elite']],
      [['battle', 'rest', 'shop'], ['event', 'battle', 'rest']],
      [['battle', 'elite', 'shop'], ['rest', 'battle', 'elite']],
      [['boss']]
    ],
    [
      [['battle', 'event', 'shop'], ['battle', 'event', 'rest']],
      [['battle', 'elite'], ['elite', 'battle']],
      [['battle', 'shop', 'rest'], ['event', 'battle', 'shop']],
      [['elite', 'battle', 'shop'], ['battle', 'elite', 'rest']],
      [['boss']]
    ],
    [
      [['battle', 'event', 'rest'], ['battle', 'event', 'shop']],
      [['elite', 'battle'], ['battle', 'elite']],
      [['battle', 'rest', 'shop'], ['event', 'battle', 'shop']],
      [['elite', 'battle', 'shop'], ['battle', 'elite', 'rest']],
      [['boss']]
    ],
  ];

  const TOWER_PATH_EVENTS = {
    treasure: {
      id: 'treasure', title: '????', desc: '??????????????????????????', rewardHint: '?? / ??? / ????',
      choices: [
        { id: 'open', label: '????', desc: '?? 12 ????? 1 ???????', effect: { type: 'relic', hpCostFlat: 12 } },
        { id: 'salvage', label: '????', desc: '?? 1 ?????????', effect: { type: 'rare_card' } },
        { id: 'leave', label: '?????', desc: '????????????', effect: { type: 'leave', toast: '?????????' } }
      ]
    },
    altar: {
      id: 'altar', title: '????', desc: '????????????????????????', rewardHint: '?? / ?? / ??',
      choices: [
        { id: 'blood_core', label: '?????', desc: '?? 10 ??????? +8???? 8 ???', effect: { type: 'max_hp', hpCostFlat: 10, maxHpGain: 8, healGain: 8, toast: '???????????????' } },
        { id: 'purge', label: '????', desc: '?? 1 ????', effect: { type: 'remove' } },
        { id: 'meditate', label: '????', desc: '?? 16 ???', effect: { type: 'heal', healFlat: 16, toast: '??????' } }
      ]
    },
    gambler: {
      id: 'gambler', title: '???', desc: '??????????????????????', rewardHint: '????? / ???',
      choices: [
        { id: 'small_bet', label: '????', desc: '?? 6 ???60% ????????????', effect: { type: 'gamble_card', hpCostFlat: 6, winChance: 0.6, failToast: '?????? 6 ??' } },
        { id: 'big_bet', label: '??????', desc: '?? 12 ???45% ??????????', effect: { type: 'gamble_relic', hpCostFlat: 12, winChance: 0.45, failToast: '??????????' } },
        { id: 'leave', label: '??????', desc: '??????????', effect: { type: 'leave', toast: '??????????' } }
      ]
    }
  };

  /* Random Events */
  const EVENTS = [
    {
      id: 'gift_card', title: '仙人赐卡',
      desc: '一位白袍仙人拦住你的去路，微笑着递出一张发光的卡牌...',
      resolve(game) {
        const pool = OBTAINABLE_IDS.filter(id => {
          const rareIds = ['tianleizhou', 'fentianjue', 'daoxintongming', 'chanding', 'lingdunshu'];
          return rareIds.includes(id);
        });
        const chosen = pick(pool);
        const card = makeCard(chosen, false);
        game.state.deck.push(card);
        return `获得稀有卡牌: ${card.name}`;
      }
    },
    {
      id: 'spring_heal', title: '灵泉恢复',
      desc: '你发现了一处灵气充裕的清泉，泉水散发着柔和的光芒...',
      resolve(game) {
        const amt = Math.min(25, game.state.maxHp - game.state.hp);
        game.state.hp += amt;
        return `恢复了 ${amt} 点生命值`;
      }
    },
    {
      id: 'upgrade', title: '炼丹炉',
      desc: '前方有一座无人看管的炼丹炉，炉火正旺。你可以用它来强化一张卡牌。',
      resolve: 'upgrade'
    },
    {
      id: 'cursed_chest', title: '诅咒宝箱',
      desc: '一个散发着诡异光芒的宝箱...打开它需要付出代价。',
      resolve(game) {
        const dmg = Math.floor(game.state.maxHp * 0.1);
        game.state.hp = Math.max(1, game.state.hp - dmg);
        // Give a random relic
        const available = RELICS.filter(r => !game.state.relics.includes(r.id));
        if (available.length > 0) {
          const relic = pick(available);
          game.state.relics.push(relic.id);
          // Apply immediate effects
          if (relic.effect.maxHpBonus) { game.state.maxHp += relic.effect.maxHpBonus; game.state.hp += relic.effect.maxHpBonus; }
          if (relic.effect.strengthBonus) game.state.strength += relic.effect.strengthBonus;
          if (relic.effect.maxEnergyBonus) game.state.maxEnergy += relic.effect.maxEnergyBonus;
          return `失去 ${dmg} 生命，获得法宝: ${relic.icon} ${relic.name}`;
        }
        return `失去 ${dmg} 生命，但宝箱是空的...`;
      }
    },
    {
      id: 'training_dummy', title: '练功木桩',
      desc: '路边立着一个练功木桩，散发着灵气。对着它修炼一番可以增加力量。',
      resolve(game) {
        game.state.strength += 1;
        return '力量永久 +1！';
      }
    },
    {
      id: 'fountain', title: '仙池',
      desc: '前方出现一座仙池，池水闪烁着金色光芒，据说饮用后可以强化体魄。',
      resolve(game) {
        game.state.maxHp += 5;
        game.state.hp = game.state.maxHp;
        return '最大生命 +5，生命完全恢复！';
      }
    },
    {
      id: 'sacrifice', title: '祭坛',
      desc: '一座古老的祭坛矗立在面前。献祭一张卡牌可以获得力量。',
      resolve: 'sacrifice'
    },
    {
      id: 'merchant', title: '行商',
      desc: '一位神秘的行商出现，他可以帮你净化牌组或强化卡牌。',
      resolve: 'upgrade'
    }
  ];

  const RELICS = [
    { id:'jade_pendant', name:'玉佩', desc:'最大生命+10', icon:'💎', setId:'iron', effect:{maxHpBonus:10} },
    { id:'spirit_brush', name:'灵笔', desc:'每回合多抽1张牌', icon:'🖊️', setId:'talisman', effect:{drawBonus:1} },
    { id:'thorn_ring', name:'荆棘戒', desc:'受到攻击时反弹3伤害', icon:'💍', setId:'iron', effect:{autoThorns:3} },
    { id:'iron_bell', name:'铁钟', desc:'每回合获得3护甲', icon:'🔔', setId:'iron', effect:{autoBlock:3} },
    { id:'stone_talisman', name:'镇元符', desc:'战斗开始获得8护甲', icon:'🧿', setId:'iron', effect:{startBlock:8} },
    { id:'blood_jade', name:'血玉', desc:'击杀敌人回复5HP', icon:'🔴', setId:'venom', effect:{killHeal:5} },
    { id:'qi_stone', name:'气运石', desc:'战斗开始获得1灵力', icon:'🪨', setId:'talisman', effect:{startEnergy:1} },
    { id:'ancient_scroll', name:'古卷', desc:'卡牌奖励多1张选择', icon:'📜', setId:'talisman', effect:{rewardExtra:1} },
    { id:'mirror_shard', name:'镜片', desc:'第一回合抽2张额外牌', icon:'🪞', setId:'talisman', effect:{firstTurnDraw:2} },
    { id:'poison_fang', name:'毒牙', desc:'每回合给所有敌人施加1毒', icon:'🐍', setId:'venom', effect:{autoPoison:1} },
    { id:'golden_core', name:'金丹', desc:'力量永久+1', icon:'💊', setId:'venom', effect:{strengthBonus:1} },
    { id:'spirit_armor', name:'灵甲', desc:'战斗开始获得5护甲', icon:'🛡️', setId:'iron', effect:{startBlock:5} },
    { id:'star_dust', name:'星尘', desc:'获得卡牌时有30%几率升级', icon:'✨', setId:'talisman', effect:{autoUpgradeChance:0.3} },
    { id:'phoenix_feather', name:'凤羽', desc:'死亡时复活(30%HP)一次', icon:'🪶', setId:'venom', effect:{revive:true} },
    { id:'dao_heart', name:'道心', desc:'最大灵力+1', icon:'❤️', setId:'talisman', effect:{maxEnergyBonus:1} },
    { id:'void_eye', name:'虚空之眼', desc:'可预知Boss下一步行动', icon:'👁️', setId:'talisman', effect:{seeIntent:true} },
    // --- Phase 3E 新增圣物 ---
    { id:'fire_pendant', name:'火坠', desc:'每回合对全体敌人造成2伤害', icon:'🔥', setId:null, effect:{autoBurn:2} },
    { id:'ice_crystal', name:'冰晶', desc:'每3回合冻结敌人1回合', icon:'❄️', setId:null, effect:{autoFreeze:3} },
    { id:'wind_boots', name:'风靴', desc:'第一回合多获得1灵力', icon:'👟', setId:'talisman', effect:{startEnergy:1} },
    { id:'earth_shield', name:'地盾', desc:'每回合获得2护甲', icon:'🪨', setId:'iron', effect:{autoBlock:2} },
    { id:'blood_pact', name:'血契', desc:'攻击回复1HP', icon:'🩸', setId:'venom', effect:{attackHeal:1} },
    { id:'thunder_mark', name:'雷印', desc:'力量永久+2', icon:'⚡', setId:'venom', effect:{strengthBonus:2} },
    { id:'soul_chain', name:'魂锁', desc:'每回合给敌人施加2毒', icon:'⛓️', setId:'venom', effect:{autoPoison:2} },
    { id:'dragon_scale', name:'龙鳞', desc:'最大生命+20', icon:'🐉', setId:'iron', effect:{maxHpBonus:20} },
    { id:'sage_eye', name:'圣者之眼', desc:'手牌上限+2', icon:'🔮', setId:null, effect:{handSizeBonus:2} },
    { id:'cursed_ring', name:'诅咒戒', desc:'力量+3，但每回合失去1HP', icon:'💜', setId:'venom', effect:{strengthBonus:3,hpLossPerTurn:1} },
    { id:'lucky_coin', name:'幸运币', desc:'卡牌奖励多1张选择', icon:'🪙', setId:'talisman', effect:{rewardExtra:1} },
    { id:'time_hourglass', name:'时之沙', desc:'每场战斗第1回合打出的牌费用-1', icon:'⏳', setId:'talisman', effect:{firstTurnDiscount:1} },
    { id:'life_root', name:'生命之根', desc:'每回合回复2HP', icon:'🌱', setId:'iron', effect:{autoHeal:2} },
  ];
  RELICS.push({ id:'calm_talisman', name:'静心符', desc:'每回合回复1HP', icon:'🧘', setId:'iron', effect:{autoHeal:1} });
  const RELICS_MAP = Object.fromEntries(RELICS.map(r => [r.id, r]));

  const RELIC_SETS = [
    {
      id: 'talisman',
      name: '符箓机缘',
      icon: '📜',
      tiers: {
        2: { spellFirstDiscount: 1 },
        4: { rewardExtra: 1 },
      },
      desc: '堆叠法术节奏与奖励选择',
    },
    {
      id: 'iron',
      name: '铁骨守御',
      icon: '🛡️',
      tiers: {
        2: { autoBlock: 2 },
        4: { firstDefenseBoost: 3 },
      },
      desc: '护甲体系与防御连动',
    },
    {
      id: 'venom',
      name: '毒煞魔道',
      icon: '☠️',
      tiers: {
        2: { poisonAmp: 1 },
        4: { autoPoison: 1 },
      },
      desc: '施毒增幅与持续压制',
    },
  ];
  const RELIC_SETS_MAP = Object.fromEntries(RELIC_SETS.map(s => [s.id, s]));

  function _sumEffectValue(v) {
    if (typeof v === 'number') return v;
    return v ? 1 : 0;
  }

  function getRelicSetCounts(relicIds) {
    const counts = {};
    for (const rid of relicIds) {
      const r = RELICS_MAP[rid];
      if (!r || !r.setId) continue;
      counts[r.setId] = (counts[r.setId] || 0) + 1;
    }
    return counts;
  }

  function getRelicSetBonusEffects(relicIds) {
    const counts = getRelicSetCounts(relicIds);
    const effects = {};
    const activeSets = [];

    for (const [setId, count] of Object.entries(counts)) {
      const set = RELIC_SETS_MAP[setId];
      if (!set) continue;
      const activeTiers = Object.keys(set.tiers)
        .map(n => Number(n))
        .filter(n => count >= n)
        .sort((a, b) => a - b);
      if (activeTiers.length === 0) continue;

      activeSets.push({ set, count, activeTiers });
      for (const tier of activeTiers) {
        const tierEff = set.tiers[tier] || {};
        for (const [k, v] of Object.entries(tierEff)) {
          effects[k] = (effects[k] || 0) + _sumEffectValue(v);
        }
      }
    }

    return { effects, activeSets, counts };
  }

  /* ============================================================
     角色职业系统
     ============================================================ */
  const CLASSES = [
    {
      id: 'sword', name: '剑修', icon: '⚔️', color: '#ff6b6b',
      desc: '攻击型：起始攻击牌多，每回合+1力量',
      passive: '剑意：每回合自动获得1力量',
      starterDeck: () => {
        const d = [];
        for (let i = 0; i < 4; i++) d.push(makeCard('zhanji', false));
        d.push(makeCard('jianxiu_pojun', false));
        for (let i = 0; i < 3; i++) d.push(makeCard('huti', false));
        d.push(makeCard('lingqibaofa', false));
        d.push(makeCard('mingxiang', false));
        return d;
      },
      exclusiveCards: ['jianxiu_zhanlian','jianxiu_jianzhen','jianxiu_pojun'],
      startBonus: (s) => {},
      turnBonus: (s) => { s.strength += 1; },
      statMod: { hp: 70, maxHp: 70 },
    },
    {
      id: 'talisman', name: '符修', icon: '📜', color: '#a78bfa',
      desc: '法术型：起始多灵力，卡牌费用-1',
      passive: '符箓：每回合所有卡牌费用-1',
      starterDeck: () => {
        const d = [];
        for (let i = 0; i < 3; i++) d.push(makeCard('zhanji', false));
        for (let i = 0; i < 3; i++) d.push(makeCard('huti', false));
        d.push(makeCard('mingxiang', false));
        d.push(makeCard('lingqibaofa', false));
        d.push(makeCard('fuxiu_lingfu', false));
        d.push(makeCard('fuxiu_fuzhuan', false));
        return d;
      },
      exclusiveCards: ['fuxiu_lingfu','fuxiu_fuzhuan','fuxiu_baopo'],
      startBonus: (s) => { s.maxEnergy += 1; },
      turnBonus: (s) => { s.costDiscount += 1; },
      statMod: { hp: 75, maxHp: 75 },
    },
    {
      id: 'body', name: '体修', icon: '🛡️', color: '#4ade80',
      desc: '防御型：高血量，每回合自动获得护甲',
      passive: '铁骨：每回合自动获得5护甲',
      starterDeck: () => {
        const d = [];
        for (let i = 0; i < 3; i++) d.push(makeCard('zhanji', false));
        for (let i = 0; i < 4; i++) d.push(makeCard('huti', false));
        d.push(makeCard('tixiu_tiebi', false));
        d.push(makeCard('mingxiang', false));
        d.push(makeCard('lingqibaofa', false));
        return d;
      },
      exclusiveCards: ['tixiu_tiebi','tixiu_gangti','tixiu_zhendan'],
      startBonus: (s) => {},
      turnBonus: (s) => { s.block += 5; },
      statMod: { hp: 100, maxHp: 100 },
    },
  ];


  function pickWithRng(list, rng) {
    if (!list || list.length === 0) return null;
    return list[Math.floor(rng() * list.length)];
  }

  function shuffleWithRng(list, rng) {
    const clone = [...list];
    for (let i = clone.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
  }

  function laneSlotsForCount(count) {
    if (count <= 1) return [1];
    if (count === 2) return [0, 2];
    return [0, 1, 2];
  }

  function describeNodeRewards(node) {
    if (node.type === 'event') {
      const event = TOWER_PATH_EVENTS[node.eventId];
      return [event ? event.rewardHint : TOWER_NODE_META.event.reward];
    }
    if (node.type === 'rest') return ['??', '?? / ??'];
    if (node.type === 'shop') return ['????', '????'];
    if (node.type === 'elite') return ['?????', node.affixId ? ENEMY_AFFIXES[node.affixId].name : '????'];
    if (node.type === 'boss') {
      const isFinalBoss = node.actIndex === TOWER_PATH_ACTS.length - 1;
      return ['?????', isFinalBoss ? '????' : '????'];
    }
    const lines = ['?????'];
    if (node.affixId) lines.push(ENEMY_AFFIXES[node.affixId].name);
    return lines;
  }

  function connectTowerRows(currentNodes, nextNodes) {
    currentNodes.forEach(node => {
      const linked = nextNodes.filter(next => Math.abs(next.lane - node.lane) <= 1).map(next => next.id);
      node.nextIds = linked.length ? linked : nextNodes.map(next => next.id);
    });
  }

  function createTowerNode(type, act, actIndex, rowIndex, lane, rng) {
    const meta = TOWER_NODE_META[type];
    const node = {
      id: `act-${actIndex}-row-${rowIndex}-lane-${lane}`,
      actIndex,
      rowIndex,
      lane,
      type,
      title: meta.name,
      nextIds: [],
      nextPreview: [],
      previewRewards: []
    };

    if (type === 'battle' || type === 'elite' || type === 'boss') {
      const poolKey = type === 'battle' ? 'battlePool' : (type === 'elite' ? 'elitePool' : 'bossPool');
      const enemyKey = pickWithRng(act[poolKey], rng);
      const template = BOSS_TEMPLATES[enemyKey] || ENEMY_TEMPLATES[enemyKey];
      node.enemyKey = enemyKey;
      node.title = template ? template.name : meta.name;
      if (type === 'elite') {
        node.affixId = pickWithRng(Object.keys(ENEMY_AFFIXES), rng);
        node.hpMul = 1.35 + actIndex * 0.08;
      } else if (type === 'battle' && actIndex > 0 && rng() < 0.22) {
        node.affixId = pickWithRng(['berserk', 'warded', 'frail_open'], rng);
        node.hpMul = 1.1;
      } else if (type === 'boss') {
        node.hpMul = 1.05 + actIndex * 0.06;
      }
    }

    if (type === 'event') {
      node.eventId = pickWithRng(act.eventPool, rng);
      node.title = TOWER_PATH_EVENTS[node.eventId].title;
    }

    node.previewRewards = describeNodeRewards(node);
    return node;
  }

  function buildTowerRows(rng) {
    const rows = [];
    let globalRowIndex = 0;
    let previousNodes = null;

    TOWER_PATH_ACTS.forEach((act, actIndex) => {
      const blueprintRows = TOWER_ROW_BLUEPRINTS[actIndex] || TOWER_ROW_BLUEPRINTS[TOWER_ROW_BLUEPRINTS.length - 1];
      blueprintRows.forEach((variants) => {
        const pickedTypes = pickWithRng(variants, rng);
        const lanes = laneSlotsForCount(pickedTypes.length);
        const nodes = pickedTypes.map((type, idx) => createTowerNode(type, act, actIndex, globalRowIndex, lanes[idx], rng));
        if (previousNodes) connectTowerRows(previousNodes, nodes);
        rows.push({ id: `tower-row-${globalRowIndex}`, actIndex, rowIndex: globalRowIndex, actName: act.name, nodes });
        previousNodes = nodes;
        globalRowIndex += 1;
      });
    });

    const nodeMap = {};
    rows.forEach(row => row.nodes.forEach(node => { nodeMap[node.id] = node; }));
    rows.forEach(row => row.nodes.forEach(node => {
      node.nextPreview = (node.nextIds || []).map(id => {
        const nextNode = nodeMap[id];
        return nextNode ? TOWER_NODE_META[nextNode.type].shortLabel : '';
      }).filter(Boolean);
    }));
    return rows;
  }

  function getTowerTotalNodeCount(rows) {
    return (rows || []).reduce((sum, row) => sum + row.nodes.length, 0);
  }

  /* ============================================================
     GAME STATE CLASS
     ============================================================ */
  class GameState {
    constructor() {
      this.chosenClass = null;
      this.reset();
    }
    reset() {
      const cls = this.chosenClass ? CLASSES.find(c => c.id === this.chosenClass) : null;
      this.hp = cls ? cls.statMod.hp : 90;
      this.maxHp = cls ? cls.statMod.maxHp : 90;
      this.floorIndex = 0;
      this.nodeIndex = 0;
      this.towerRows = [];
      this.towerNodeMap = {};
      this.availableNodeIds = [];
      this.currentNodeId = null;
      this.completedNodeIds = [];
      this.enemiesKilled = 0;
      this.floorsCleared = 0;
      this.deck = cls ? cls.starterDeck() : this._buildStarterDeck();
      this.drawPile = [];
      this.discardPile = [];
      this.hand = [];
      this.energy = 0;
      this.maxEnergy = 3;
      this.block = 0;
      this.poison = 0;
      this.burn = 0;
      this.thorns = 0;
      this.drawPenalty = 0;
      this.costDiscount = 0;
      this.bound = false;
      this.gameOver = false;
      this.victory = false;
      this.ascension = this._pendingAscension || 0;
      this.relics = [];
      this.strength = 0;
      this.vulnerable = 0;
      this.weak = 0;
      this.drawNextBonus = 0;
      this.shenhunmieDmg = 0;
      this.phoenixUsed = false;
      this.restShield = 0;

      // Apply class start bonus
      if (cls) cls.startBonus(this);
    }
    getRelicEffect(key) {
      const base = this.relics.reduce((sum, rid) => {
        const r = RELICS_MAP[rid];
        return sum + ((r && r.effect && r.effect[key]) ? _sumEffectValue(r.effect[key]) : 0);
      }, 0);
      const setBonus = getRelicSetBonusEffects(this.relics).effects;
      return base + (setBonus[key] ? _sumEffectValue(setBonus[key]) : 0);
    }
    hasRelic(key) {
      if (this.relics.some(rid => { const r = RELICS_MAP[rid]; return r && r.effect && r.effect[key]; })) return true;
      const setBonus = getRelicSetBonusEffects(this.relics).effects;
      return !!setBonus[key];
    }
    _buildStarterDeck() {
      const d = [];
      for (let i = 0; i < 4; i++) d.push(makeCard('zhanji', false));
      for (let i = 0; i < 4; i++) d.push(makeCard('huti', false));
      d.push(makeCard('mingxiang', false));
      d.push(makeCard('lingqibaofa', false));
      return d;
    }
  }

  /* ============================================================
     BATTLE MANAGER
     ============================================================ */
  class BattleManager {
    constructor(game) {
      this.game = game;
      this.enemies = [];
      this.turn = 0;
      this.inBattle = false;
      this.playerTurn = false;
      this._spellDiscountUsed = false;
      this._defenseBoostUsed = false;
    }

    startBattle(enemyKeys) {
      const s = this.game.state;
      const ascMul = 1 + (s.ascension || 0) * 0.1;
      const descriptors = enemyKeys.map(entry => typeof entry === 'string' ? { key: entry } : entry);
      this.enemies = descriptors.map(descriptor => {
        const key = descriptor.key;
        const tmpl = BOSS_TEMPLATES[key] || ENEMY_TEMPLATES[key];
        const scaledHp = Math.floor(tmpl.maxHp * ascMul * (descriptor.hpMul || 1));
        return {
          ...tmpl,
          maxHp: scaledHp,
          hp: scaledHp,
          block: 0,
          poison: 0,
          burn: 0,
          frozen: 0,
          patternIndex: 0,
          enrageBonus: 0,
          charged: false,
          vulnerable: 0,
          weak: 0,
          affixId: descriptor.affixId || null
        };
      });
      this.turn = 0;
      this.inBattle = true;
      s.block = 0;
      s.thorns = 0;
      s.costDiscount = 0;
      s.drawPenalty = 0;
      s.bound = false;
      s.shenhunmieDmg = 0;
      s.vulnerable = 0;
      s.weak = 0;
      s.drawNextBonus = 0;
      s.burn = 0;

      s.drawPile = this._shuffle([...s.deck]);
      s.discardPile = [];
      s.hand = [];
      this.enemies.forEach(enemy => this._applyEnemyAffixBattleStart(enemy));
      this.startPlayerTurn();
    }

    _getEnemyAffix(enemy) {
      return enemy && enemy.affixId ? ENEMY_AFFIXES[enemy.affixId] : null;
    }

    _applyEnemyAffixBattleStart(enemy) {
      const affix = this._getEnemyAffix(enemy);
      const s = this.game.state;
      if (!affix) return;
      if (affix.id === 'warded') {
        enemy.block += 12;
      }
      if (affix.id === 'frail_open') {
        s.vulnerable = Math.max(s.vulnerable, 1);
        this.game.ui.logMessage(`${enemy.name} ?${affix.name}?????? 1`, 'damage');
      }
    }

    _applyEnemyAffixTurnStart(enemy) {
      const affix = this._getEnemyAffix(enemy);
      if (!affix) return;
      if (affix.id === 'warded') {
        enemy.block += 4;
        this.game.ui.logMessage(`${enemy.name} ?${affix.name}?? 4 ??`, 'block');
      }
    }

    _applyEnemyAffixAfterAction(enemy) {
      const affix = this._getEnemyAffix(enemy);
      if (!affix) return;
      if (affix.id === 'berserk') {
        enemy.enrageBonus += 2;
        this.game.ui.logMessage(`${enemy.name} ?${affix.name}????? +2`, 'damage');
      }
    }

    _damagePlayerFromAffix(enemy, dmg) {
      const s = this.game.state;
      const blocked = Math.min(s.block, dmg);
      s.block -= blocked;
      const actual = dmg - blocked;
      s.hp -= actual;
      if (actual > 0) {
        this.game.ui.flashPlayerHit();
      }
      this.game.ui.logMessage(`${enemy.name} ????? ${dmg} ??`, 'damage');
    }

    _applyEnemyAffixOnDamaged(enemy, dealtDamage) {
      const affix = this._getEnemyAffix(enemy);
      if (!affix || dealtDamage <= 0) return;
      if (affix.id === 'thorns') {
        this._damagePlayerFromAffix(enemy, 2);
      }
    }

    getTurnSpellDiscount(card) {

      const s = this.game.state;
      if (!card || card.type !== 'spell') return 0;
      const disc = s.getRelicEffect('spellFirstDiscount');
      if (!disc) return 0;
      if (this._spellDiscountUsed) return 0;
      return disc;
    }

    getEffectiveCost(card) {
      const s = this.game.state;
      const base = Math.max(0, card.cost - s.costDiscount);
      return Math.max(0, base - this.getTurnSpellDiscount(card));
    }

    startPlayerTurn() {
      const s = this.game.state;
      this.turn++;
      this.playerTurn = true;
      this._spellDiscountUsed = false;
      this._defenseBoostUsed = false;
      s.block = 0;
      s.thorns = 0;
      s.costDiscount = 0;
      s.energy = s.maxEnergy + s.getRelicEffect('maxEnergyBonus');

      // Relic: autoBlock (iron_bell)
      const autoBlk = s.getRelicEffect('autoBlock');
      if (autoBlk > 0) {
        s.block += autoBlk;
      }

      // Relic: autoThorns (thorn_ring)
      const autoThorns = s.getRelicEffect('autoThorns');
      if (autoThorns > 0) {
        s.thorns += autoThorns;
      }

      // Relic: startEnergy (qi_stone) - first turn only
      if (this.turn === 1) {
        const startEn = s.getRelicEffect('startEnergy');
        if (startEn > 0) s.energy += startEn;
        // Relic: startBlock (spirit_armor) - first turn only
        const startBlk = s.getRelicEffect('startBlock');
        if (startBlk > 0) s.block += startBlk;
        if (s.restShield) {
          s.block += s.restShield;
          s.restShield = 0;
        }
      }

      // Relic: autoPoison (poison_fang) - apply to all enemies each turn
      const autoPoison = s.getRelicEffect('autoPoison');
      if (autoPoison > 0) {
        const amp = s.getRelicEffect('poisonAmp') || 0;
        this.enemies.forEach(e => {
          if (e.hp > 0) e.poison += (autoPoison + amp);
        });
      }

      // Relic: autoBurn (fire_pendant) - deal dmg to all enemies each turn
      const autoBurn = s.getRelicEffect('autoBurn');
      if (autoBurn > 0) {
        this.enemies.forEach(e => {
          if (e.hp > 0) { e.hp -= autoBurn; }
        });
      }

      // Relic: autoHeal (life_root) - heal player each turn
      const autoHeal = s.getRelicEffect('autoHeal');
      if (autoHeal > 0) {
        s.hp = Math.min(s.maxHp, s.hp + autoHeal);
      }

      // Relic: autoFreeze (ice_crystal) - every N turns freeze a random enemy for 1 turn
      const autoFreezeEvery = s.getRelicEffect('autoFreeze');
      if (autoFreezeEvery > 0 && this.turn % autoFreezeEvery === 0) {
        const candidates = this.enemies.filter(e => e.hp > 0);
        if (candidates.length > 0) {
          const e = candidates[randomInt(0, candidates.length - 1)];
          e.frozen = Math.max(e.frozen || 0, 1);
          this.game.ui.logMessage(`${e.name} 被冻结！`, 'block');
        }
      }

      // Relic: hpLossPerTurn (cursed_ring) - lose HP each turn
      const hpLoss = s.getRelicEffect('hpLossPerTurn');
      if (hpLoss > 0) {
        s.hp -= hpLoss;
      }

      // Relic: firstTurnDiscount (time_hourglass) - cost discount on first turn
      if (this.turn === 1) {
        const ftDiscount = s.getRelicEffect('firstTurnDiscount');
        if (ftDiscount > 0) s.costDiscount += ftDiscount;
      }

      // 职业回合被动
      if (s.chosenClass) {
        const cls = CLASSES.find(c => c.id === s.chosenClass);
        if (cls) cls.turnBonus(s);
      }

      // Poison damage to player
      if (s.poison > 0) {
        s.hp -= s.poison;
        this.game.ui.logMessage(`毒素侵体，受到 ${s.poison} 点伤害`, 'damage');
        s.poison = Math.max(0, s.poison - 1);
        if (s.hp <= 0) {
          s.hp = 0;
          this.endGame(false);
          return;
        }
      }

      // Burn damage to player
      if (s.burn > 0) {
        s.hp -= s.burn;
        this.game.ui.logMessage(`灼烧焚身，受到 ${s.burn} 点伤害`, 'damage');
        s.burn = Math.max(0, s.burn - 1);
        if (s.hp <= 0) {
          s.hp = 0;
          this.endGame(false);
          return;
        }
      }

      // Tick down player weak
      if (s.weak > 0) {
        s.weak = Math.max(0, s.weak - 1);
      }

      // Check bound
      if (s.bound) {
        s.bound = false;
        this.game.ui.logMessage('缠绕解除，本回合无法行动！', 'damage');
        this.game.ui.renderAll();
        setTimeout(() => this.endPlayerTurn(), 1500);
        return;
      }

      // Draw cards
      let drawCount = Math.max(1, 5 - s.drawPenalty);
      s.drawPenalty = 0;
      // Relic: drawBonus (spirit_brush)
      drawCount += s.getRelicEffect('drawBonus');
      // drawNextBonus from last turn (wuxiangdun)
      drawCount += s.drawNextBonus;
      s.drawNextBonus = 0;
      // Relic: firstTurnDraw (mirror_shard) - first turn only
      if (this.turn === 1) {
        drawCount += s.getRelicEffect('firstTurnDraw');
      }
      this.drawCards(drawCount);

      this.game.ui.renderAll();
    }

    drawCards(n) {
      const s = this.game.state;
      for (let i = 0; i < n; i++) {
        if (s.drawPile.length === 0) {
          if (s.discardPile.length === 0) break;
          s.drawPile = this._shuffle([...s.discardPile]);
          s.discardPile = [];
          this.game.ui.logMessage('弃牌堆洗入抽牌堆', '');
        }
        if (s.drawPile.length > 0) {
          s.hand.push(s.drawPile.pop());
        }
      }
    }

    canPlayCard(card) {
      const s = this.game.state;
      if (!this.playerTurn) return false;
      const cost = this.getEffectiveCost(card);
      if (s.energy < cost) return false;
      // requiresExhaust needs at least 1 other card in hand
      if (card.requiresExhaust && s.hand.filter(c => c.uid !== card.uid).length === 0) return false;
      return true;
    }

    playCard(cardUid) {
      const s = this.game.state;
      const idx = s.hand.findIndex(c => c.uid === cardUid);
      if (idx === -1) return;
      const card = s.hand[idx];
      if (!this.canPlayCard(card)) return;

      const spellDisc = this.getTurnSpellDiscount(card);
      const cost = Math.max(0, card.cost - s.costDiscount - spellDisc);
      s.energy -= cost;
      if (spellDisc > 0) this._spellDiscountUsed = true;
      s.hand.splice(idx, 1);
      if (typeof SoundManager !== 'undefined') SoundManager.play('card');

      // Resolve card effects
      this._resolveCard(card);
      if (s.hp <= 0) {
        s.hp = 0;
        this.game.ui.renderAll();
        setTimeout(() => this.endGame(false), 600);
        return;
      }

      // Check enemies dead
      this.enemies = this.enemies.filter(e => e.hp > 0);

      // Discard (unless discardAll triggers)
      if (!card.discardAll) {
        s.discardPile.push(card);
      } else {
        s.discardPile.push(card);
        // discard all hand
        while (s.hand.length > 0) {
          s.discardPile.push(s.hand.pop());
        }
      }

      this.game.ui.renderAll();

      // Check battle end
      if (this.enemies.length === 0) {
        setTimeout(() => this.battleWon(), 600);
      }
    }

    _resolveCard(card) {
      const s = this.game.state;
      const primaryTarget = this.enemies[0]; // primary target
      const affectAll = !!(card.aoe || card.targetAll);
      const targets = affectAll ? this.enemies.filter(e => e.hp > 0) : (primaryTarget ? [primaryTarget] : []);

      // requiresExhaust: must exhaust another hand card first
      if (card.requiresExhaust) {
        if (s.hand.length === 0) {
          this.game.ui.logMessage('没有可消耗的手牌！', 'damage');
          return;
        }
        const ri = randomInt(0, s.hand.length - 1);
        const exhausted = s.hand.splice(ri, 1)[0];
        this.game.ui.logMessage(`消耗了 ${exhausted.name}`, '');
      }

      // selfDmg: lose HP before attacking
      if (card.selfDmg) {
        s.hp -= card.selfDmg;
        this.game.ui.logMessage(`失去 ${card.selfDmg} 生命`, 'damage');
        if (s.hp <= 0) {
          s.hp = 0;
          return;
        }
      }

      // blkAsDmg: deal damage equal to current block (体修 震弹)
      if (card.blkAsDmg && primaryTarget && primaryTarget.hp > 0) {
        let dmg = s.block;
        if (s.weak > 0) dmg = Math.floor(dmg * 0.75);
        if (primaryTarget.vulnerable && primaryTarget.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
        let blocked = Math.min(primaryTarget.block, dmg);
        primaryTarget.block -= blocked;
        dmg -= blocked;
        primaryTarget.hp = Math.max(0, primaryTarget.hp - dmg);
        this.game.ui.showEnemyDamage(primaryTarget, s.block, blocked);
        this.game.ui.logMessage(`震弹造成 ${s.block} 伤害`, 'damage');
        if (primaryTarget.hp <= 0) {
          s.enemiesKilled++;
          this.game.ui.logMessage(`${primaryTarget.name} 被击败！`, 'heal');
        }
      }

      // Attack
      if (card.atk && targets.length > 0) {
        let baseDmg = card.atk;

        // retainScaling (shenhunmie)
        if (card.retainScaling) {
          baseDmg += s.shenhunmieDmg;
          s.shenhunmieDmg += card.atk;
        }

        // strength bonus (strScale multiplies the strength contribution)
        const strBonus = s.strength * (card.strScale || 1);
        baseDmg += strBonus;

        // scalesWithBlock
        if (card.scalesWithBlock) {
          baseDmg += s.block;
        }

        // weak debuff on player: reduce damage by 25%
        if (s.weak > 0) {
          baseDmg = Math.floor(baseDmg * 0.75);
        }

        const hits = card.hits || 1;
        let totalDealt = 0;
        for (const t of targets) {
          for (let h = 0; h < hits; h++) {
            if (!t || t.hp <= 0) break;
            let dmg = baseDmg;

            // vulnerable on target: increase damage by 50%
            if (t.vulnerable && t.vulnerable > 0) {
              dmg = Math.floor(dmg * 1.5);
            }

            let blocked = Math.min(t.block, dmg);
            t.block -= blocked;
            dmg -= blocked;
            t.hp = Math.max(0, t.hp - dmg);
            totalDealt += dmg;

            this.game.ui.showEnemyDamage(t, baseDmg, blocked);
            this._applyEnemyAffixOnDamaged(t, dmg);
            if (s.hp <= 0) return;
            if (t.hp <= 0) {
              s.enemiesKilled++;
              this.game.ui.logMessage(`${t.name} 被击败！`, 'heal');
              // blood_jade relic: heal on kill
              const killHealAmt = s.getRelicEffect('killHeal');
              if (killHealAmt > 0) {
                const healed = Math.min(killHealAmt, s.maxHp - s.hp);
                s.hp += healed;
                if (healed > 0) this.game.ui.logMessage(`血玉回复 ${healed} 生命`, 'heal');
              }
            }
          }
        }

        // lifestealFull: heal for damage dealt
        if (card.lifestealFull && totalDealt > 0) {
          const healed = Math.min(totalDealt, s.maxHp - s.hp);
          s.hp += healed;
          this.game.ui.logMessage(`吸取 ${healed} 生命`, 'heal');
        }

        // Relic: attackHeal (blood_pact)
        const atkHeal = s.getRelicEffect('attackHeal');
        if (atkHeal > 0 && totalDealt > 0) {
          const healed = Math.min(atkHeal, s.maxHp - s.hp);
          s.hp += healed;
        }
      }

      // Apply vulnerable from card (to target or all)
      if (card.vulnerable && !affectAll) {
        if (primaryTarget && primaryTarget.hp > 0) {
          primaryTarget.vulnerable = (primaryTarget.vulnerable || 0) + card.vulnerable;
          this.game.ui.logMessage(`${primaryTarget.name} 易伤 ${card.vulnerable} 回合`, 'damage');
        }
      }
      if (card.vulnerable && affectAll) {
        targets.forEach(e => { e.vulnerable = (e.vulnerable || 0) + card.vulnerable; });
        this.game.ui.logMessage(`所有敌人易伤 ${card.vulnerable} 回合`, 'damage');
      }

      // Apply weak from card
      if (card.applyWeak && primaryTarget && primaryTarget.hp > 0) {
        primaryTarget.weak = (primaryTarget.weak || 0) + card.applyWeak;
        this.game.ui.logMessage(`${primaryTarget.name} 虚弱 ${card.applyWeak} 回合`, 'damage');
      }

      // Armor break
      if (card.armorBreak && primaryTarget) {
        primaryTarget.block = Math.max(0, primaryTarget.block - card.armorBreak);
      }

      // Poison / burn / freeze from card (to target or all)
      if (card.poison) {
        const amp = s.getRelicEffect('poisonAmp') || 0;
        const amount = card.poison + amp;
        (affectAll ? targets : [primaryTarget]).forEach(e => { if (e && e.hp > 0) e.poison = (e.poison || 0) + amount; });
        this.game.ui.logMessage(`${affectAll ? '全体敌人' : (primaryTarget ? primaryTarget.name : '敌人')} 中毒 +${amount}`, 'damage');
      }
      if (card.burn) {
        const amount = card.burn;
        (affectAll ? targets : [primaryTarget]).forEach(e => { if (e && e.hp > 0) e.burn = (e.burn || 0) + amount; });
        this.game.ui.logMessage(`${affectAll ? '全体敌人' : (primaryTarget ? primaryTarget.name : '敌人')} 灼烧 +${amount}`, 'damage');
      }
      if (card.freeze) {
        const amount = card.freeze;
        (affectAll ? targets : [primaryTarget]).forEach(e => { if (e && e.hp > 0) e.frozen = Math.max(e.frozen || 0, amount); });
        this.game.ui.logMessage(`${affectAll ? '全体敌人' : (primaryTarget ? primaryTarget.name : '敌人')} 冻结！`, 'block');
      }

      // Block
      if (card.blk) {
        let blk = card.blk;
        const firstBoost = s.getRelicEffect('firstDefenseBoost') || 0;
        if (card.type === 'defense' && firstBoost > 0 && !this._defenseBoostUsed) {
          blk += firstBoost;
          this._defenseBoostUsed = true;
          this.game.ui.logMessage(`铁骨套装：首张防御牌护甲 +${firstBoost}`, 'block');
        }
        s.block += blk;
        this.game.ui.logMessage(`获得 ${blk} 护甲`, 'block');
      }

      // Thorns
      if (card.thorns) {
        s.thorns += card.thorns;
      }

      // Draw
      if (card.draw) {
        this.drawCards(card.draw);
      }

      // Heal
      if (card.heal) {
        const healed = Math.min(card.heal, s.maxHp - s.hp);
        s.hp += healed;
        this.game.ui.logMessage(`回复 ${healed} 生命`, 'heal');
      }

      // Energy gain
      if (card.energy) {
        s.energy += card.energy;
      }

      // Cost discount
      if (card.discount) {
        s.costDiscount += card.discount;
        this.game.ui.logMessage('本回合所有牌费用-1', '');
      }

      // Draw penalty
      if (card.drawPenalty) {
        s.drawPenalty += card.drawPenalty;
      }

      // Strength gain from card (qiyunluanwu, huangquanlian)
      if (card.strength) {
        s.strength += card.strength;
        this.game.ui.logMessage(`力量 +${card.strength}`, 'heal');
      }

      // drawNext bonus (wuxiangdun)
      if (card.drawNext) {
        s.drawNextBonus += card.drawNext;
        this.game.ui.logMessage(`下回合多抽 ${card.drawNext} 张`, '');
      }

      // strGain: gain strength (剑修 破军)
      if (card.strGain) {
        s.strength += card.strGain;
        this.game.ui.logMessage(`力量 +${card.strGain}`, 'heal');
      }

      // thornGain: gain thorns (体修 铁壁)
      if (card.thornGain) {
        s.thorns += card.thornGain;
        this.game.ui.logMessage(`荆棘 +${card.thornGain}`, 'block');
      }

      // nextDiscount: reduce cost of next card (符修 符篆连环)
      if (card.nextDiscount) {
        s.costDiscount += card.nextDiscount;
        this.game.ui.logMessage('下张牌费用 -1', '');
      }

      // clearPoison
      if (card.clearPoison) {
        s.poison = 0;
        this.game.ui.logMessage('清除中毒', 'heal');
      }
    }

    endPlayerTurn() {
      if (!this.inBattle) return;
      const s = this.game.state;
      this.playerTurn = false;

      // Discard hand
      while (s.hand.length > 0) {
        s.discardPile.push(s.hand.pop());
      }

      this.game.ui.renderAll();

      // Enemy turns
      setTimeout(() => this.doEnemyTurns(), 500);
    }

    doEnemyTurns() {
      if (!this.inBattle) return;
      const s = this.game.state;
      const asc = s.ascension || 0;
      let delay = 0;
      // 飞升3+: Boss额外行动; 飞升7+: Boss双倍行动
      const expandedEnemies = [];
      for (const e of this.enemies) {
        expandedEnemies.push(e);
        if (e.isBoss && asc >= 3) {
          expandedEnemies.push(e); // 额外行动
          if (asc >= 7) expandedEnemies.push(e); // 双倍行动(第三次)
        }
      }

      const processEnemy = (i) => {
        if (i >= expandedEnemies.length) {
          // Tick down enemy vulnerable and weak after all enemy turns
          this.enemies.forEach(e => {
            if (e.hp > 0) {
              if (e.vulnerable > 0) e.vulnerable = Math.max(0, e.vulnerable - 1);
              if (e.weak > 0) e.weak = Math.max(0, e.weak - 1);
            }
          });
          // Tick down player vulnerable
          const s = this.game.state;
          if (s.vulnerable > 0) s.vulnerable = Math.max(0, s.vulnerable - 1);

          // All enemies done, check alive
          if (this.game.state.hp <= 0) {
            this.endGame(false);
          } else if (this.inBattle) {
            setTimeout(() => this.startPlayerTurn(), 400);
          }
          return;
        }

        const enemy = expandedEnemies[i];
        if (enemy.hp <= 0) { processEnemy(i + 1); return; }

        this._doEnemyAction(enemy);
        this.game.ui.renderAll();

        if (this.game.state.hp <= 0) {
          this.game.state.hp = 0;
          this.game.ui.renderAll();
          setTimeout(() => this.endGame(false), 600);
          return;
        }

        setTimeout(() => processEnemy(i + 1), 700);
      };

      processEnemy(0);
    }

    _doEnemyAction(enemy) {
      const s = this.game.state;
      const action = enemy.pattern[enemy.patternIndex % enemy.pattern.length];
      enemy.patternIndex++;

      // Reset enemy block at start of their turn
      enemy.block = 0;
      this._applyEnemyAffixTurnStart(enemy);

      // Poison on enemy
      if (enemy.poison > 0) {
        enemy.hp = Math.max(0, enemy.hp - enemy.poison);
        this.game.ui.logMessage(`${enemy.name} 中毒，受到 ${enemy.poison} 伤害`, 'heal');
        enemy.poison = Math.max(0, enemy.poison - 1);
        if (enemy.hp <= 0) {
          s.enemiesKilled++;
          this.game.ui.logMessage(`${enemy.name} 被击败！`, 'heal');
          const killHealAmt = s.getRelicEffect('killHeal');
          if (killHealAmt > 0) {
            const healed = Math.min(killHealAmt, s.maxHp - s.hp);
            s.hp += healed;
            if (healed > 0) this.game.ui.logMessage(`血玉回复 ${healed} 生命`, 'heal');
          }
          return;
        }
      }

      // Burn on enemy
      if (enemy.burn > 0) {
        enemy.hp = Math.max(0, enemy.hp - enemy.burn);
        this.game.ui.logMessage(`${enemy.name} 灼烧，受到 ${enemy.burn} 伤害`, 'damage');
        enemy.burn = Math.max(0, enemy.burn - 1);
        if (enemy.hp <= 0) {
          s.enemiesKilled++;
          this.game.ui.logMessage(`${enemy.name} 被击败！`, 'heal');
          const killHealAmt = s.getRelicEffect('killHeal');
          if (killHealAmt > 0) {
            const healed = Math.min(killHealAmt, s.maxHp - s.hp);
            s.hp += healed;
            if (healed > 0) this.game.ui.logMessage(`血玉回复 ${healed} 生命`, 'heal');
          }
          return;
        }
      }

      // Frozen: skip action
      if (enemy.frozen > 0) {
        enemy.frozen = Math.max(0, enemy.frozen - 1);
        this.game.ui.logMessage(`${enemy.name} 冻结中，跳过行动`, 'block');
        return;
      }

      if (action.type === 'attack') {
        let dmg = action.dmg + (enemy.enrageBonus || 0);

        // Handle charged attack (mozun)
        if (enemy.charged) {
          dmg *= 2;
          this.game.ui.logMessage(`${enemy.name} 蓄力释放！伤害翻倍！`, 'damage');
          enemy.charged = false;
        }

        // Enemy weak: reduce damage by 25%
        if (enemy.weak && enemy.weak > 0) {
          dmg = Math.floor(dmg * 0.75);
        }

        // Player vulnerable: increase damage by 50%
        if (s.vulnerable > 0) {
          dmg = Math.floor(dmg * 1.5);
        }

        // Apply damage to player
        let blocked = Math.min(s.block, dmg);
        s.block -= blocked;
        let actual = dmg - blocked;
        s.hp -= actual;
        if (actual > 0 && typeof SoundManager !== 'undefined') SoundManager.play('hit');

        if (blocked > 0) {
          this.game.ui.logMessage(`${enemy.name} 攻击 ${dmg}，护甲抵挡 ${blocked}，受到 ${actual} 伤害`, 'damage');
        } else {
          this.game.ui.logMessage(`${enemy.name} 攻击，受到 ${dmg} 伤害`, 'damage');
        }

        // Thorns
        if (s.thorns > 0) {
          enemy.hp = Math.max(0, enemy.hp - s.thorns);
          this.game.ui.logMessage(`荆棘反伤 ${s.thorns}`, 'block');
          if (enemy.hp <= 0) {
            s.enemiesKilled++;
            // blood_jade relic: heal on kill
            const killHealAmt = s.getRelicEffect('killHeal');
            if (killHealAmt > 0) {
              const healed = Math.min(killHealAmt, s.maxHp - s.hp);
              s.hp += healed;
              if (healed > 0) this.game.ui.logMessage(`血玉回复 ${healed} 生命`, 'heal');
            }
          }
        }

        // Lifesteal
        if (action.lifesteal) {
          const steal = Math.min(actual, s.maxHp); // heal by damage dealt
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + steal);
          this.game.ui.logMessage(`${enemy.name} 吸取了 ${steal} 生命`, 'damage');
        }

        // Poison from attack
        if (action.poison) {
          s.poison += action.poison;
          this.game.ui.logMessage(`中毒! 毒素 +${action.poison}`, 'damage');
        }

        // Burn from attack
        if (action.burn) {
          s.burn += action.burn;
          this.game.ui.logMessage(`灼烧! 灼烧 +${action.burn}`, 'damage');
        }

        // Steal card — remove from an active battle pile, then sync s.deck
        if (action.steal) {
          let stolen = null;
          if (s.drawPile.length > 0) {
            const ri = randomInt(0, s.drawPile.length - 1);
            stolen = s.drawPile.splice(ri, 1)[0];
          } else if (s.discardPile.length > 0) {
            const ri = randomInt(0, s.discardPile.length - 1);
            stolen = s.discardPile.splice(ri, 1)[0];
          } else if (s.hand.length > 0) {
            const ri = randomInt(0, s.hand.length - 1);
            stolen = s.hand.splice(ri, 1)[0];
          }
          if (stolen) {
            // Keep deck tracking consistent
            const deckIdx = s.deck.findIndex(c => c.uid === stolen.uid);
            if (deckIdx !== -1) s.deck.splice(deckIdx, 1);
            this.game.ui.logMessage(`${enemy.name} 窃取了 ${stolen.name}！`, 'damage');
          }
        }

        this.game.ui.flashPlayerHit();
      }

      if (action.type === 'defend') {
        enemy.block += action.blk;
        this.game.ui.logMessage(`${enemy.name} 获得 ${action.blk} 护甲`, '');
      }

      if (action.type === 'special') {
        // Poison (no attack)
        if (action.poison) {
          s.poison += action.poison;
          this.game.ui.logMessage(`${enemy.name} 施放毒雾！毒素 +${action.poison}`, 'damage');
        }

        // Burn (no attack)
        if (action.burn) {
          s.burn += action.burn;
          this.game.ui.logMessage(`${enemy.name} 施放火焰！灼烧 +${action.burn}`, 'damage');
        }

        // Bind
        if (action.bind) {
          s.bound = true;
          this.game.ui.logMessage(`${enemy.name} 缠绕了你！下回合无法行动`, 'damage');
        }

        // Summon
        if (action.summon) {
          const summonKey = typeof action.summon === 'string' ? action.summon : 'xiaoyao';
          const summonTmpl = ENEMY_TEMPLATES[summonKey] || ENEMY_TEMPLATES.xiaoyao;
          const minion = {
            ...summonTmpl,
            hp: summonTmpl.maxHp,
            block: 0,
            poison: 0,
            burn: 0,
            frozen: 0,
            patternIndex: 0,
            enrageBonus: 0,
            charged: false,
            vulnerable: 0,
            weak: 0
          };
          this.enemies.push(minion);
          this.game.ui.logMessage(`${enemy.name} 召唤了${summonTmpl.name}！`, 'damage');
        }

        // Enrage
        if (action.enrage) {
          enemy.enrageBonus += action.enrage;
          this.game.ui.logMessage(`${enemy.name} 狂暴！攻击力 +${action.enrage}`, 'damage');
        }

        // Charge
        if (action.charge) {
          enemy.charged = true;
          this.game.ui.logMessage(`${enemy.name} 正在蓄力...`, '');
        }
      }
    }

    getEnemyIntent(enemy) {
      const action = enemy.pattern[enemy.patternIndex % enemy.pattern.length];
      return action;
    }

    battleWon() {
      this.inBattle = false;
      const s = this.game.state;
      this.game.ui.logMessage('战斗胜利！', 'heal');
      this.game.ui.renderAll();

      // Progress tower
      setTimeout(() => this.game.advanceNode(), 800);
    }

    endGame(victory) {
      const s = this.game.state;

      // Phoenix feather relic: revive once
      if (!victory && !s.phoenixUsed && s.hasRelic('revive')) {
        s.phoenixUsed = true;
        s.hp = Math.floor(s.maxHp * 0.3);
        this.game.ui.logMessage('凤羽发动！死亡复活！', 'heal');
        this.inBattle = true;
        this.game.ui.renderAll();
        setTimeout(() => this.startPlayerTurn(), 800);
        return;
      }

      this.inBattle = false;
      s.gameOver = true;
      s.victory = victory;
      if (typeof SoundManager !== 'undefined') SoundManager.play(victory ? 'success' : 'defeat');

      const ascBonus = (s.ascension || 0) * 50;
      const score = s.floorsCleared * 100 + s.enemiesKilled * 20 + Math.max(0, s.hp) * 2 + ascBonus;
      updateLeaderboard('cardtower', score);

      // Daily challenge record
      if (this.game._isDaily) {
        var dailyBest = Storage.get('cardtower_daily_best', { date: '', score: 0 });
        var todayStr = new Date().toISOString().slice(0, 10);
        if (todayStr !== dailyBest.date || score > dailyBest.score) {
          Storage.set('cardtower_daily_best', { date: todayStr, score: score });
        }
      }

      // 飞升难度追踪
      if (victory && s.ascension > 0) {
        var maxAsc = Storage.get('cardtower_max_ascension', 0);
        if (s.ascension > maxAsc) {
          Storage.set('cardtower_max_ascension', s.ascension);
        }
        CrossGameAchievements.trackStat('cardtower_max_ascension', s.ascension);
      }
      // 通关后解锁下一级飞升
      if (victory) {
        var currentMax = Storage.get('cardtower_max_ascension', 0);
        var nextAsc = Math.min(10, (s.ascension || 0) + 1);
        if (nextAsc > currentMax) {
          Storage.set('cardtower_max_ascension', nextAsc);
        }
      }

      CrossGameAchievements.trackStat('games_played_cardtower', true);
      if (victory) {
        CrossGameAchievements.trackStat('cardtower_cleared', true);
      }
      CrossGameAchievements.checkNew();

      this.game.ui.showGameOver(victory, score);
    }

    _shuffle(arr) {
      const rng = this._dailyRng || Math.random;
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  }

  /* ============================================================
     UI RENDERER
     ============================================================ */
  class UIRenderer {
    constructor(game) {
      this.game = game;
      this.els = {};
      this._cacheElements();
      this._bindEvents();
    }

    _cacheElements() {
      const $ = id => document.getElementById(id);
      this.els = {
        app: $('ct-app'),
        startScreen: $('ct-start'),
        gameScreen: $('ct-game'),
        btnStart: $('ct-btn-start'),
        btnRestart: $('ct-btn-restart'),
        towerMap: $('ct-tower-map'),
        deckInfo: $('ct-deck-info'),
        enemyArea: $('ct-enemy-area'),
        playerStatus: $('ct-player-status'),
        battleLog: $('ct-battle-log'),
        handArea: $('ct-hand-area'),
        btnEndTurn: $('ct-btn-end-turn'),
        cardReward: $('ct-card-reward'),
        rewardCards: $('ct-reward-cards'),
        btnSkipReward: $('ct-btn-skip-reward'),
        eventOverlay: $('ct-event-overlay'),
        eventTitle: $('ct-event-title'),
        eventDesc: $('ct-event-desc'),
        eventChoices: $('ct-event-choices'),
        upgradeOverlay: $('ct-upgrade-overlay'),
        upgradeCards: $('ct-upgrade-cards'),
        gameover: $('ct-gameover'),
        gameoverTitle: $('ct-gameover-title'),
        gameoverStats: $('ct-gameover-stats'),
        leaderboard: $('ct-leaderboard'),
        battlePanel: $('ct-battle-panel'),
        relicReward: $('ct-relic-reward'),
        relicChoices: $('ct-relic-choices'),
        relicTitle: document.querySelector('#ct-relic-reward .ct-overlay-title'),
        relicSubtitle: document.querySelector('#ct-relic-reward .ct-overlay-subtitle'),
        restShop: $('ct-rest-shop'),
        restChoices: $('ct-rest-choices'),
        restTitle: document.querySelector('#ct-rest-shop .ct-overlay-title'),
        restSubtitle: document.querySelector('#ct-rest-shop .ct-overlay-subtitle'),
        cardRemoval: $('ct-card-removal'),
        removalCards: $('ct-removal-cards'),
        btnSkipRemoval: $('ct-btn-skip-removal')
      };
    }

    _bindEvents() {
      this.els.btnStart.addEventListener('click', () => this._showClassSelection(false));
      // Daily challenge button
      var dailyBtn = document.createElement('button');
      dailyBtn.className = 'btn btn-outline btn-lg';
      dailyBtn.textContent = '每日挑战';
      dailyBtn.style.marginLeft = '12px';
      var dailyBest = Storage.get('cardtower_daily_best', { date: '', score: 0 });
      var todayStr = new Date().toISOString().slice(0, 10);
      if (dailyBest.date === todayStr && dailyBest.score > 0) {
        dailyBtn.title = '今日最佳: ' + dailyBest.score;
      }
      this.els.btnStart.parentNode.appendChild(dailyBtn);
      dailyBtn.addEventListener('click', () => this._showClassSelection(true));

      // Codex button (cards/relics)
      var codexBtn = document.createElement('button');
      codexBtn.className = 'btn btn-outline btn-lg';
      codexBtn.textContent = '图鉴';
      codexBtn.style.marginLeft = '12px';
      this.els.btnStart.parentNode.appendChild(codexBtn);
      codexBtn.addEventListener('click', () => this._showCodex());

      this.els.btnRestart.addEventListener('click', () => this.game.restartGame());
      this.els.btnEndTurn.addEventListener('click', () => this.game.battle.endPlayerTurn());
      this.els.btnSkipReward.addEventListener('click', () => this.game.skipReward());
      this.els.towerMap.addEventListener('click', (e) => {
        const nodeEl = e.target.closest('.ct-tower-node.available[data-node-id]');
        if (!nodeEl) return;
        const nodeId = nodeEl.dataset.nodeId;
        if (nodeId) this.game.selectTowerNode(nodeId);
      });
      document.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
        if (!this.els.gameScreen.classList.contains('active')) return;

        const key = e.key.toLowerCase();
        if (key === 'e') {
          if (this.game.state.gameOver || !this.game.battle.playerTurn) return;
          e.preventDefault();
          this.game.battle.endPlayerTurn();
          return;
        }

        if (['1', '2', '3'].includes(key)) {
          const idx = parseInt(key, 10) - 1;
          if (this.els.cardReward.classList.contains('active')) {
            const card = this.els.rewardCards.querySelectorAll('.ct-card')[idx];
            if (card) { e.preventDefault(); card.click(); }
            return;
          }
          if (this.els.relicReward.classList.contains('active')) {
            const relic = this.els.relicChoices.querySelectorAll('.ct-relic-choice')[idx];
            if (relic) { e.preventDefault(); relic.click(); }
            return;
          }
          if (this.els.upgradeOverlay.classList.contains('active')) {
            const card = this.els.upgradeCards.querySelectorAll('.ct-card')[idx];
            if (card) { e.preventDefault(); card.click(); }
            return;
          }
          if (this.els.eventOverlay.classList.contains('active')) {
            const choice = this.els.eventChoices.querySelectorAll('.ct-event-choice')[idx];
            if (choice) { e.preventDefault(); choice.click(); }
            return;
          }
          if (this.els.restShop.classList.contains('active')) {
            const choice = this.els.restChoices.querySelectorAll('.ct-rest-choice')[idx];
            if (choice) { e.preventDefault(); choice.click(); }
            return;
          }
        }

        if (key === '0' && this.els.cardRemoval.classList.contains('active')) {
          if (this.els.btnSkipRemoval) { e.preventDefault(); this.els.btnSkipRemoval.click(); }
        }
      });

      // Pile viewer (deck/draw/discard)
      this.els.deckInfo.addEventListener('click', (e) => {
        const stat = e.target.closest('.ct-deck-click');
        if (!stat) return;
        const pile = stat.dataset.pile;
        this._openPileViewer(pile);
      });
      this.els.deckInfo.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const stat = e.target.closest('.ct-deck-click');
        if (!stat) return;
        e.preventDefault();
        this._openPileViewer(stat.dataset.pile);
      });

      // Event delegation for hand card clicks (avoids re-adding listeners every render)
      this.els.handArea.addEventListener('click', (e) => {
        const cardEl = e.target.closest('.ct-card');
        if (!cardEl || cardEl.classList.contains('cant-play')) return;
        const uid = cardEl.dataset.uid;
        cardEl.classList.add('playing');
        setTimeout(() => {
          this.game.battle.playCard(uid);
        }, 300);
      });

      // Event delegation for reward card clicks
      this.els.rewardCards.addEventListener('click', (e) => {
        const cardEl = e.target.closest('.ct-card');
        if (!cardEl) return;
        const id = cardEl.dataset.id;
        if (id) this.game.pickRewardCard(id);
      });

      // Event delegation for upgrade card clicks
      this.els.upgradeCards.addEventListener('click', (e) => {
        const cardEl = e.target.closest('.ct-card');
        if (!cardEl) return;
        const uid = cardEl.dataset.uid;
        if (uid) {
          this.game.upgradeCard(uid);
          this.els.upgradeOverlay.classList.remove('active');
        }
      });

      // Event delegation for relic choices
      this.els.relicChoices.addEventListener('click', (e) => {
        const relicEl = e.target.closest('.ct-relic-choice');
        if (!relicEl) return;
        const id = relicEl.dataset.id;
        if (id) this.game.pickRelic(id);
      });

      // Event delegation for rest choices
      this.els.restChoices.addEventListener('click', (e) => {
        const choiceEl = e.target.closest('.ct-rest-choice');
        if (!choiceEl) return;
        const choice = choiceEl.dataset.choice;
        if (choice) this.game.handleRestChoice(choice);
      });

      // Event delegation for card removal clicks
      this.els.removalCards.addEventListener('click', (e) => {
        const cardEl = e.target.closest('.ct-card');
        if (!cardEl) return;
        const uid = cardEl.dataset.uid;
        if (uid) this.game.removeCard(uid);
      });

      // Skip card removal
      this.els.btnSkipRemoval.addEventListener('click', () => this.game.skipCardRemoval());
    }

    _showCodex() {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;overflow-y:auto;';
      const cardIds = Object.keys(CARDS);
      const cardsHtml = cardIds.map(id => {
        const c = CARDS[id];
        const typeName = c.type === 'attack' ? '攻击' : c.type === 'defense' ? '防御' : '法术';
        const upHint = (c.upAtk || c.upBlk || c.upDraw || c.upHeal || c.upEnergy || c.upPoison || c.upThorns || c.upArmorBreak || c.upDiscount || c.upVulnerable || c.upApplyWeak || c.upStrength || c.upDrawNext) ? '（可强化）' : '';
        return `<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px 12px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div style="font-size:1.4rem">${c.art || '🃏'}</div>
            <div style="flex:1;">
              <div style="font-weight:bold;color:var(--gold);">${escapeHtml(c.name)} ${upHint}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${typeName} · 费用 ${c.cost}</div>
            </div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);white-space:pre-line;">${escapeHtml(c.desc || '')}</div>
        </div>`;
      }).join('');

      const relicsHtml = RELICS.map(r => {
        return `<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px 12px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div style="font-size:1.4rem">${r.icon || '📿'}</div>
            <div style="flex:1;">
              <div style="font-weight:bold;color:var(--gold);">${escapeHtml(r.name)}</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(r.desc || '')}</div>
            </div>
          </div>
        </div>`;
      }).join('');

      overlay.innerHTML = `<div style="background:var(--bg-dark,#0f172a);border:1px solid var(--border-color);border-radius:14px;padding:18px;max-width:860px;width:92%;margin:20px auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
          <div style="font-size:1.2rem;font-weight:bold;color:var(--gold);">📖 图鉴</div>
          <button class="btn btn-outline btn-sm" id="ct-codex-close">关闭</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <button class="btn btn-gold btn-sm" id="ct-codex-tab-cards">卡牌</button>
          <button class="btn btn-outline btn-sm" id="ct-codex-tab-relics">法宝</button>
          <button class="btn btn-outline btn-sm" id="ct-codex-tab-keywords">关键词</button>
        </div>
        <div id="ct-codex-body"></div>
      </div>`;
      document.body.appendChild(overlay);

      const body = overlay.querySelector('#ct-codex-body');
      const render = (tab) => {
        overlay.querySelector('#ct-codex-tab-cards').className = 'btn ' + (tab === 'cards' ? 'btn-gold' : 'btn-outline') + ' btn-sm';
        overlay.querySelector('#ct-codex-tab-relics').className = 'btn ' + (tab === 'relics' ? 'btn-gold' : 'btn-outline') + ' btn-sm';
        overlay.querySelector('#ct-codex-tab-keywords').className = 'btn ' + (tab === 'keywords' ? 'btn-gold' : 'btn-outline') + ' btn-sm';

        if (tab === 'cards') {
          body.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:10px;">收录全部卡牌（部分为职业专属）。</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">${cardsHtml}</div>`;
          return;
        }
        if (tab === 'relics') {
          body.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:10px;">法宝在旅途中随机获得，部分可组成套装。</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">${relicsHtml}</div>`;
          return;
        }
        const kw = Object.keys(KEYWORD_TOOLTIPS).sort();
        body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">${kw.map(k => {
          return `<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:10px 12px;">
            <div style="font-weight:bold;color:var(--gold);margin-bottom:4px;">${escapeHtml(k)}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(KEYWORD_TOOLTIPS[k])}</div>
          </div>`;
        }).join('')}</div>`;
      };

      render('cards');

      overlay.querySelector('#ct-codex-tab-cards').addEventListener('click', () => render('cards'));
      overlay.querySelector('#ct-codex-tab-relics').addEventListener('click', () => render('relics'));
      overlay.querySelector('#ct-codex-tab-keywords').addEventListener('click', () => render('keywords'));

      overlay.querySelector('#ct-codex-close').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    showScreen(name) {
      this.els.startScreen.classList.remove('active');
      this.els.gameScreen.classList.remove('active');
      if (name === 'start') this.els.startScreen.classList.add('active');
      if (name === 'game') this.els.gameScreen.classList.add('active');
    }

    _showClassSelection(daily) {
      const maxUnlockedAsc = Storage.get('cardtower_max_ascension', 0);
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;overflow-y:auto;';
      let html = '<div style="background:var(--bg-card,#1a1f2e);border-radius:12px;padding:24px;max-width:520px;width:90%;">';
      html += '<h2 style="text-align:center;color:var(--gold,#ffd700);margin-bottom:16px;">选择修炼之道</h2>';

      // 飞升难度选择
      if (maxUnlockedAsc > 0) {
        html += '<div style="text-align:center;margin-bottom:14px;">';
        html += '<div style="color:var(--text-secondary,#aaa);font-size:0.8rem;margin-bottom:6px;">飞升难度 (通关解锁)</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">';
        html += '<button class="btn btn-outline ct-asc-btn" data-asc="0" style="font-size:0.75rem;padding:3px 10px;border-color:var(--gold);color:var(--gold);">普通</button>';
        for (let i = 1; i <= maxUnlockedAsc; i++) {
          html += `<button class="btn btn-outline ct-asc-btn" data-asc="${i}" style="font-size:0.75rem;padding:3px 10px;">飞升${i}</button>`;
        }
        html += '</div>';
        html += '<div id="ct-asc-desc" style="font-size:0.7rem;color:var(--text-muted,#888);margin-top:4px;">敌人正常强度</div>';
        html += '</div>';
      }

      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">';
      CLASSES.forEach(cls => {
        html += `<div class="ct-class-card" data-class="${cls.id}" style="cursor:pointer;border:2px solid ${cls.color}30;border-radius:10px;padding:16px;text-align:center;background:${cls.color}08;transition:all 0.2s;">
          <div style="font-size:2.5rem;margin-bottom:8px;">${cls.icon}</div>
          <div style="font-size:1.1rem;font-weight:bold;color:${cls.color};margin-bottom:4px;">${cls.name}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary,#aaa);margin-bottom:8px;">${cls.desc}</div>
          <div style="font-size:0.75rem;color:${cls.color};border-top:1px solid ${cls.color}30;padding-top:6px;">${cls.passive}</div>
          <div style="font-size:0.7rem;color:var(--text-muted,#666);margin-top:4px;">HP: ${cls.statMod.hp}</div>
        </div>`;
      });
      html += '</div></div>';
      overlay.innerHTML = html;
      document.body.appendChild(overlay);

      // 飞升难度选择逻辑
      let selectedAsc = 0;
      const ascDescs = [
        '敌人正常强度',
        '敌人HP+10%, 卡牌奖励-1',
        '敌人HP+20%, 卡牌奖励-1',
        '敌人HP+30%, 卡牌奖励-1, Boss额外行动',
        '敌人HP+40%, 卡牌奖励-1, Boss额外行动',
        '敌人HP+50%, 卡牌奖励-2, Boss额外行动',
        '敌人HP+60%, 卡牌奖励-2, Boss额外行动',
        '敌人HP+70%, 卡牌奖励-2, Boss双倍行动',
        '敌人HP+80%, 卡牌奖励-2, Boss双倍行动',
        '敌人HP+90%, 卡牌奖励-2, Boss双倍行动',
        '敌人HP+100%, 卡牌奖励-2, Boss双倍行动',
      ];
      overlay.querySelectorAll('.ct-asc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedAsc = parseInt(btn.dataset.asc);
          overlay.querySelectorAll('.ct-asc-btn').forEach(b => { b.style.borderColor = ''; b.style.color = ''; });
          btn.style.borderColor = 'var(--gold)';
          btn.style.color = 'var(--gold)';
          const descEl = overlay.querySelector('#ct-asc-desc');
          if (descEl) descEl.textContent = ascDescs[selectedAsc] || '未知';
        });
      });

      overlay.querySelectorAll('.ct-class-card').forEach(card => {
        card.addEventListener('mouseenter', () => { card.style.borderColor = card.dataset.class === 'sword' ? '#ff6b6b' : card.dataset.class === 'talisman' ? '#a78bfa' : '#4ade80'; card.style.transform = 'translateY(-4px)'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = ''; card.style.transform = ''; });
        card.addEventListener('click', () => {
          this.game.state.chosenClass = card.dataset.class;
          this.game.state._pendingAscension = selectedAsc;
          overlay.remove();
          this.game.startGame(daily);
        });
      });
    }

    _openPileViewer(pile) {
      const s = this.game.state;
      if (!s) return;
      let title = '牌组';
      let cards = s.deck || [];
      if (pile === 'draw') { title = '抽牌堆'; cards = s.drawPile || []; }
      if (pile === 'discard') { title = '弃牌堆'; cards = s.discardPile || []; }
      this._showPileModal(title, cards);
    }

    _showPileModal(title, cards) {
      // Prevent stacking multiple pile viewers when users click quickly.
      document.querySelectorAll('.modal-overlay[data-ct-pile="1"]').forEach(el => el.remove());

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.dataset.ctPile = '1';

      // Group same cards for readability
      const grouped = {};
      (cards || []).forEach(c => {
        const key = (c.id || c.name || '') + (c.upgraded ? '_u' : '');
        grouped[key] = grouped[key] || { card: c, count: 0 };
        grouped[key].count += 1;
      });
      const items = Object.values(grouped).sort((a, b) => {
        const ca = a.card, cb = b.card;
        return (ca.cost || 0) - (cb.cost || 0) || String(ca.name || '').localeCompare(String(cb.name || ''), 'zh-CN');
      });

      const listHtml = items.length === 0 ?
        '<div style="text-align:center;color:var(--text-muted);padding:14px;">空</div>' :
        items.map(it => {
          const c = it.card;
          const typeClass = `card-${c.type === 'defense' ? 'defense' : c.type}`;
          const tagsHtml = renderTagChips(getCardTags(c), 6);
          return `<div style="border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:10px 12px;background:rgba(0,0,0,0.12);margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(74,218,212,0.12);border:1px solid rgba(74,218,212,0.25);color:#6aafff;font-weight:bold;">${c.cost}</div>
                <div>
                  <div style="color:var(--text-primary);font-weight:bold;">${escapeHtml(c.name || '未知卡牌')}${c.upgraded ? '<span style="color:var(--gold);margin-left:6px;">+</span>' : ''}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">数量 x${it.count} · ${c.type === 'attack' ? '攻击' : c.type === 'defense' ? '防御' : '法术'}</div>
                </div>
              </div>
              <div style="font-size:1.5rem;opacity:0.9;">${escapeHtml(String(c.art || '🃏'))}</div>
            </div>
            ${tagsHtml}
            <div style="margin-top:8px;font-size:0.85rem;color:var(--text-secondary);line-height:1.4;">${cardDescResolved(c)}</div>
          </div>`;
        }).join('');

      overlay.innerHTML = `
        <div class="modal" style="max-width:720px;">
          <div class="modal-header">
            <h3 class="modal-title">${escapeHtml(title)} <span style="font-size:0.85rem;color:var(--text-muted);font-weight:normal;">(${cards.length})</span></h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">${listHtml}</div>
          <div class="modal-footer" style="justify-content:center;">
            <button class="btn btn-outline btn-sm" id="ct-pile-close">关闭</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.querySelector('.modal-close').addEventListener('click', close);
      overlay.querySelector('#ct-pile-close').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }

    renderAll() {
      this.renderTowerMap();
      this.renderDeckInfo();
      this.renderEnemies();
      this.renderPlayerStatus();
      this.renderHand();
      this.renderEndTurnButton();
    }

    /* --- Tower Map --- */
    renderTowerMap() {
      const s = this.game.state;
      if (!s.towerRows || s.towerRows.length === 0) {
        this.els.towerMap.innerHTML = '<div class="ct-node-empty">????????</div>';
        return;
      }

      let html = '';
      let currentAct = -1;
      s.towerRows.forEach(row => {
        if (row.actIndex !== currentAct) {
          currentAct = row.actIndex;
          html += `<div class="ct-tower-floor-divider">?${row.actIndex + 1}? ? ${escapeHtml(row.actName)}</div>`;
        }
        html += '<div class="ct-tower-row">';
        row.nodes.forEach(node => {
          const meta = TOWER_NODE_META[node.type];
          const completed = s.completedNodeIds.includes(node.id) || (s.gameOver && s.victory);
          const current = s.currentNodeId === node.id && !s.gameOver;
          const available = s.availableNodeIds.includes(node.id) && !s.gameOver;
          const affix = node.affixId ? ENEMY_AFFIXES[node.affixId] : null;
          const previewText = node.previewRewards.filter(Boolean).join(' ? ');
          const nextText = node.nextPreview.length ? node.nextPreview.join(' / ') : (node.type === 'boss' && node.actIndex === TOWER_PATH_ACTS.length - 1 ? '??' : '??');
          html += `<button type="button" class="ct-tower-node ${node.type === 'boss' ? 'boss' : ''} ${completed ? 'completed' : ''} ${current ? 'current' : ''} ${available ? 'available' : ''}" data-node-id="${node.id}" data-node-type="${node.type}">
            <div class="ct-tower-node-head">
              <span class="ct-tower-node-icon">${meta.icon}</span>
              <span class="ct-tower-node-label">${meta.name}</span>
              ${affix ? `<span class="ct-node-affix" title="${escapeHtml(affix.desc)}">${affix.name}</span>` : ''}
              ${completed ? '<span class="ct-tower-node-check">&#10003;</span>' : ''}
            </div>
            <div class="ct-tower-node-title">${escapeHtml(node.title)}</div>
            <div class="ct-node-preview" data-node-preview="${escapeHtml(previewText)}">${escapeHtml(previewText)}</div>
            <div class="ct-node-next">???${escapeHtml(nextText)}</div>
          </button>`;
        });
        html += '</div>';
      });

      this.els.towerMap.innerHTML = html;
    }

    /* --- Deck Info --- */
    renderDeckInfo() {
      const s = this.game.state;
      this.els.deckInfo.innerHTML = `
        <div class="ct-deck-stat ct-deck-click" data-pile="deck" role="button" tabindex="0"><span>牌组</span><span class="ct-deck-stat-val">${s.deck.length}</span></div>
        <div class="ct-deck-stat ct-deck-click" data-pile="draw" role="button" tabindex="0"><span>抽牌堆</span><span class="ct-deck-stat-val">${s.drawPile.length}</span></div>
        <div class="ct-deck-stat ct-deck-click" data-pile="discard" role="button" tabindex="0"><span>弃牌堆</span><span class="ct-deck-stat-val">${s.discardPile.length}</span></div>
      `;
    }

    /* --- Enemies --- */
    renderEnemies() {
      const s = this.game.state;
      const enemies = this.game.battle.enemies;
      if (!enemies || enemies.length === 0) {
        this.els.enemyArea.innerHTML = '';
        return;
      }

      this.els.enemyArea.innerHTML = enemies.map((e, i) => {
        const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);
        const intent = this.game.battle.getEnemyIntent(e);
        const affix = e.affixId ? ENEMY_AFFIXES[e.affixId] : null;
        let intentClass = 'intent-attack';
        if (intent.type === 'defend') intentClass = 'intent-defend';
        if (intent.type === 'special') intentClass = 'intent-special';

        let statuses = '';
        if (e.block > 0) statuses += `<span class="ct-status-badge block">?? ${e.block}</span>`;
        if (e.poison > 0) statuses += `<span class="ct-status-badge poison">? ${e.poison}</span>`;
        if (e.burn > 0) statuses += `<span class="ct-status-badge burn">?? ${e.burn}</span>`;
        if (e.frozen > 0) statuses += `<span class="ct-status-badge frozen">?? ${e.frozen}</span>`;
        if (e.enrageBonus > 0) statuses += `<span class="ct-status-badge enraged">?? +${e.enrageBonus}</span>`;
        if (e.charged) statuses += `<span class="ct-status-badge enraged">???</span>`;
        if (e.vulnerable > 0) statuses += `<span class="ct-status-badge vulnerable">?? ${e.vulnerable}</span>`;
        if (e.weak > 0) statuses += `<span class="ct-status-badge weak">?? ${e.weak}</span>`;
        if (affix) statuses += `<span class="ct-status-badge affix" data-enemy-affix="${affix.id}" title="${escapeHtml(affix.desc)}">${affix.name}</span>`;

        let intentHtml = `??: ${intent.label}`;
        if (e.isBoss && s.hasRelic('seeIntent')) {
          const next = e.pattern[(e.patternIndex + 1) % e.pattern.length];
          if (next && next.label) intentHtml += `<div class="ct-intent-next">???: ${next.label}</div>`;
        }

        return `<div class="ct-enemy ${e.isBoss ? 'boss-enemy' : ''}" data-idx="${i}">
          <span class="ct-enemy-sprite">${e.sprite}</span>
          <div class="ct-enemy-name">${e.name}</div>
          ${affix ? `<div class="ct-enemy-affix" data-enemy-affix="${affix.id}" title="${escapeHtml(affix.desc)}">${affix.name} ? ${affix.shortDesc}</div>` : ''}
          <div class="ct-enemy-hp-bar"><div class="ct-enemy-hp-fill" style="width:${hpPct}%"></div></div>
          <div class="ct-enemy-hp-text">${e.hp} / ${e.maxHp}</div>
          <div class="ct-enemy-intent ${intentClass}">${intentHtml}</div>
          <div class="ct-enemy-statuses">${statuses}</div>
        </div>`;
      }).join('');
    }

    /* --- Player Status --- */
    renderPlayerStatus() {
      const s = this.game.state;
      const cls = s.chosenClass ? CLASSES.find(c => c.id === s.chosenClass) : null;
      let statusHTML = '';
      if (cls) {
        statusHTML += `<div class="ct-ps-item"><span class="ct-ps-icon">${cls.icon}</span><span class="ct-ps-label">${cls.name}</span><span class="ct-ps-value" style="color:${cls.color};font-size:0.7rem;">${cls.passive.split('：')[1] || ''}</span></div>`;
      }
      if (s.ascension > 0) {
        statusHTML += `<div class="ct-ps-item"><span class="ct-ps-icon">🔥</span><span class="ct-ps-label">飞升</span><span class="ct-ps-value" style="color:#ff6b6b;">${s.ascension}</span></div>`;
      }
      statusHTML += `
        <div class="ct-ps-item"><span class="ct-ps-icon">❤</span><span class="ct-ps-label">生命</span><span class="ct-ps-value hp">${s.hp}/${s.maxHp}</span></div>
        <div class="ct-ps-item"><span class="ct-ps-icon">⚡</span><span class="ct-ps-label">灵力</span><span class="ct-ps-value energy">${s.energy}/${s.maxEnergy + s.getRelicEffect('maxEnergyBonus')}</span></div>
        <div class="ct-ps-item"><span class="ct-ps-icon">🛡</span><span class="ct-ps-label">护甲</span><span class="ct-ps-value block">${s.block}</span></div>
      `;
      if (s.poison > 0) statusHTML += `<div class="ct-ps-item"><span class="ct-ps-icon">☠</span><span class="ct-ps-label">中毒</span><span class="ct-ps-value hp">${s.poison}</span></div>`;
      if (s.burn > 0) statusHTML += `<div class="ct-ps-item"><span class="ct-ps-icon">🔥</span><span class="ct-ps-label">灼烧</span><span class="ct-ps-value hp">${s.burn}</span></div>`;
      if (s.thorns > 0) statusHTML += `<div class="ct-ps-item"><span class="ct-ps-icon">🦔</span><span class="ct-ps-label">荆棘</span><span class="ct-ps-value block">${s.thorns}</span></div>`;
      if (s.bound) statusHTML += `<div class="ct-ps-item"><span class="ct-ps-icon">🔗</span><span class="ct-ps-label">缠绕</span><span class="ct-ps-value hp">!</span></div>`;
      if (s.strength > 0) statusHTML += `<div class="ct-ps-item ct-status-effect"><span class="ct-ps-icon">💪</span><span class="ct-ps-label">力量</span><span class="ct-ps-value energy">${s.strength}</span></div>`;
      if (s.vulnerable > 0) statusHTML += `<div class="ct-ps-item ct-status-effect"><span class="ct-ps-icon">💔</span><span class="ct-ps-label">易伤</span><span class="ct-ps-value hp">${s.vulnerable}</span></div>`;
      if (s.weak > 0) statusHTML += `<div class="ct-ps-item ct-status-effect"><span class="ct-ps-icon">😵</span><span class="ct-ps-label">虚弱</span><span class="ct-ps-value hp">${s.weak}</span></div>`;

      const summary = getBuildSummary(s.deck, s.relics);
      if (summary.length > 0) {
        statusHTML += `<div class="ct-ps-item ct-ps-build"><span class="ct-ps-icon">🧩</span><span class="ct-ps-label">构筑</span><span class="ct-ps-value build">${summary.map(t => `<span class="ct-tag">${escapeHtml(t)}</span>`).join('')}</span></div>`;
      }

      // Relics
      const relicHTML = this.renderRelics();
      if (relicHTML) statusHTML += `<div class="ct-ps-item ct-ps-relics">${relicHTML}</div>`;

      this.els.playerStatus.innerHTML = statusHTML;
    }

    /* --- Hand --- */
    renderHand() {
      const s = this.game.state;
      const hand = s.hand;
      const battleMgr = this.game.battle;

      this.els.handArea.innerHTML = hand.map((card, i) => {
        const canPlay = battleMgr.canPlayCard(card);
        const effectiveCost = battleMgr.getEffectiveCost(card);
        const discounted = effectiveCost < card.cost;
        const typeClass = `card-${card.type === 'defense' ? 'defense' : card.type}`;
        const tagsHtml = renderTagChips(getCardTags(card), 3);
        let disabledAttrs = '';
        if (!canPlay) {
          let reason = '当前不可用';
          if (!battleMgr.playerTurn) {
            reason = '对手回合';
          } else if (s.energy < effectiveCost) {
            reason = `灵力不足（需要 ${effectiveCost}）`;
          } else if (card.requiresExhaust && s.hand.filter(c => c.uid !== card.uid).length === 0) {
            reason = '需要额外献祭一张手牌';
          }
          disabledAttrs = ` aria-disabled="true" data-disabled-reason="${escapeHtml(reason)}"`;
        }
        return `<div class="ct-card ${typeClass} ${canPlay ? '' : 'cant-play'} ${card.upgraded ? 'upgraded' : ''}" data-uid="${card.uid}"${disabledAttrs}>
          <div class="ct-card-cost ${discounted ? 'discounted' : ''}">${effectiveCost}</div>
          <div class="ct-card-art">${card.art}</div>
          <div class="ct-card-name">${card.name}</div>
          <div class="ct-card-type">${card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '法术'}</div>
          ${tagsHtml}
          <div class="ct-card-desc">${cardDescResolved(card)}</div>
        </div>`;
      }).join('');
    }

    renderEndTurnButton() {
      const canEnd = !!this.game.battle.playerTurn;
      this.els.btnEndTurn.setAttribute('aria-disabled', canEnd ? 'false' : 'true');
      if (!canEnd) {
        this.els.btnEndTurn.dataset.disabledReason = '对手回合';
      } else {
        delete this.els.btnEndTurn.dataset.disabledReason;
      }
    }

    /* --- Battle Log --- */
    logMessage(msg, type) {
      this.els.battleLog.textContent = msg;
      this.els.battleLog.className = 'ct-battle-log';
      if (type === 'damage') this.els.battleLog.classList.add('damage-flash');
      if (type === 'heal') this.els.battleLog.classList.add('heal-flash');
      if (type === 'block') this.els.battleLog.classList.add('block-flash');
    }

    showEnemyDamage(enemy, totalDmg, blocked) {
      // Flash animation on enemy element
      const enemyEls = this.els.enemyArea.querySelectorAll('.ct-enemy');
      const idx = this.game.battle.enemies.indexOf(enemy);
      if (idx >= 0 && enemyEls[idx]) {
        enemyEls[idx].classList.add('hit-flash');
        setTimeout(() => enemyEls[idx].classList.remove('hit-flash'), 300);

        // Floating damage number
        const numEl = document.createElement('div');
        numEl.className = 'ct-damage-num damage';
        numEl.textContent = `-${totalDmg}`;
        if (blocked > 0) {
          numEl.className = 'ct-damage-num block-dmg';
          numEl.textContent = `-${totalDmg} (挡${blocked})`;
        }
        numEl.style.left = '50%';
        numEl.style.top = '20%';
        enemyEls[idx].style.position = 'relative';
        enemyEls[idx].appendChild(numEl);
        setTimeout(() => numEl.remove(), 1000);
      }

      this.logMessage(`造成 ${totalDmg} 伤害${blocked > 0 ? ` (护甲抵挡${blocked})` : ''}`, 'damage');
    }

    flashPlayerHit() {
      this.els.battlePanel.classList.add('ct-player-hit');
      setTimeout(() => this.els.battlePanel.classList.remove('ct-player-hit'), 400);
    }

    /* --- Card Reward --- */
    showCardReward(cards) {
      this.els.rewardCards.innerHTML = cards.map(card => {
        const typeClass = `card-${card.type === 'defense' ? 'defense' : card.type}`;
        const tagsHtml = renderTagChips(getCardTags(card), 5);
        return `<div class="ct-card ${typeClass}" data-id="${card.id}">
          <div class="ct-card-cost">${card.cost}</div>
          <div class="ct-card-art">${card.art}</div>
          <div class="ct-card-name">${card.name}</div>
          <div class="ct-card-type">${card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '法术'}</div>
          ${tagsHtml}
          <div class="ct-card-desc">${cardDescResolved(card)}</div>
        </div>`;
      }).join('');

      this.els.cardReward.classList.add('active');
    }

    hideCardReward() {
      this.els.cardReward.classList.remove('active');
    }

    /* --- Event Overlay --- */
    showEvent(event) {
      this.els.eventTitle.textContent = event.title;
      this.els.eventDesc.textContent = event.desc;

      if (event.choices && event.onChoice) {
        this.els.eventChoices.innerHTML = event.choices.map(choice => `
          <button class="ct-event-choice" data-choice-id="${choice.id}">
            <span class="ct-event-choice-label">${choice.label}</span>
            <span class="ct-event-choice-desc">${choice.desc || ''}</span>
          </button>
        `).join('');
        this.els.eventChoices.querySelectorAll('[data-choice-id]').forEach(button => {
          button.addEventListener('click', () => event.onChoice(button.dataset.choiceId));
        });
        this.els.eventOverlay.classList.add('active');
        return;
      }

      if (event.resolve === 'upgrade') {
        this.els.eventOverlay.classList.remove('active');
        this.showUpgradeOverlay();
        return;
      }

      if (event.resolve === 'sacrifice') {
        this.els.eventOverlay.classList.remove('active');
        this.game.showCardRemovalForEvent();
        return;
      }

      this.els.eventChoices.innerHTML = `<button class="ct-event-choice" data-action="accept">??</button>`;
      this.els.eventChoices.querySelector('[data-action="accept"]').addEventListener('click', () => {
        const result = event.resolve(this.game);
        this.els.eventDesc.textContent = result;
        this.els.eventChoices.innerHTML = `<button class="ct-event-choice" data-action="continue">??</button>`;
        this.els.eventChoices.querySelector('[data-action="continue"]').addEventListener('click', () => {
          this.els.eventOverlay.classList.remove('active');
          this.game.proceedAfterEvent();
        });
      });

      this.els.eventOverlay.classList.add('active');
    }

    hideEvent() {
      this.els.eventOverlay.classList.remove('active');
    }

    /* --- Upgrade Overlay --- */
    showUpgradeOverlay() {
      const s = this.game.state;
      const upgradable = s.deck.filter(c => !c.upgraded);

      if (upgradable.length === 0) {
        showToast('没有可以强化的卡牌', 'info');
        this.game.proceedAfterEvent();
        return;
      }

      this.els.upgradeCards.innerHTML = upgradable.map(card => {
        const typeClass = `card-${card.type === 'defense' ? 'defense' : card.type}`;
        const tagsHtml = renderTagChips(getCardTags(card), 5);
        return `<div class="ct-card ${typeClass}" data-uid="${card.uid}">
          <div class="ct-card-cost">${card.cost}</div>
          <div class="ct-card-art">${card.art}</div>
          <div class="ct-card-name">${card.name}</div>
          <div class="ct-card-type">${card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '法术'}</div>
          ${tagsHtml}
          <div class="ct-card-desc">${cardDescResolved(card)}</div>
        </div>`;
      }).join('');

      this.els.upgradeOverlay.classList.add('active');
    }

    hideUpgradeOverlay() {
      this.els.upgradeOverlay.classList.remove('active');
    }

    /* --- Relic Reward --- */
    showRelicReward(relics, options = {}) {
      const s = this.game.state;
      const setCounts = getRelicSetCounts(s.relics);
      if (this.els.relicTitle && options.title) this.els.relicTitle.textContent = options.title;
      if (this.els.relicSubtitle && options.subtitle) this.els.relicSubtitle.textContent = options.subtitle;
      this.els.relicChoices.innerHTML = relics.map(r => {
        const set = r.setId ? RELIC_SETS_MAP[r.setId] : null;
        const cur = set ? (setCounts[r.setId] || 0) : 0;
        const next = set ? (cur + 1) : 0;
        let setHtml = '';
        if (set) {
          const tiers = Object.keys(set.tiers).map(n => Number(n)).sort((a, b) => a - b);
          const justUnlocked = tiers.filter(t => cur < t && next >= t);
          setHtml = `<div class="ct-relic-choice-set">套装：${set.icon} ${set.name}（${cur}→${next}）${justUnlocked.length ? ` <span class="ct-set-unlock">达成${justUnlocked[0]}件</span>` : ''}</div>`;
        }
        return `<div class="ct-relic-choice" data-id="${r.id}">
          <div class="ct-relic-choice-icon">${r.icon}</div>
          <div class="ct-relic-choice-name">${r.name}</div>
          <div class="ct-relic-choice-desc">${r.desc}</div>
          ${setHtml}
        </div>`;
      }).join('');
      this.els.relicReward.classList.add('active');
    }

    hideRelicReward() {
      this.els.relicReward.classList.remove('active');
    }

    /* --- Rest Shop --- */

    showRestShop(config = {}) {
      const choices = config.choices || [];
      if (this.els.restTitle) this.els.restTitle.textContent = config.title || '??';
      if (this.els.restSubtitle) this.els.restSubtitle.textContent = config.subtitle || '????????????';
      this.els.restChoices.innerHTML = choices.map(choice => `
        <div class="ct-rest-choice" data-choice="${choice.id}">
          <div class="ct-rest-choice-icon">${choice.icon || '?'}</div>
          <div class="ct-rest-choice-name">${choice.name}</div>
          <div class="ct-rest-choice-desc">${choice.desc || ''}</div>
    showRestShop() {
      const s = this.game.state;
      const healAmt = Math.floor(s.maxHp * 0.45);
      this.els.restChoices.innerHTML = `
        <div class="ct-rest-choice" data-choice="rest">
          <div class="ct-rest-choice-icon">🧘</div>
          <div class="ct-rest-choice-name">休息</div>
          <div class="ct-rest-choice-desc">恢复 ${healAmt} 生命（生命≥90%则下战斗获得6护甲）</div>
        </div>
        <div class="ct-rest-choice" data-choice="remove">
          <div class="ct-rest-choice-icon">🗑️</div>
          <div class="ct-rest-choice-name">净化</div>
          <div class="ct-rest-choice-desc">移除一张卡牌</div>
        </div>
      `).join('');
      this.els.restShop.classList.add('active');
    }

    hideRestShop() {
      this.els.restShop.classList.remove('active');
    }

    /* --- Card Removal --- */
    showCardRemoval() {
      const s = this.game.state;
      this.els.removalCards.innerHTML = s.deck.map(card => {
        const typeClass = `card-${card.type === 'defense' ? 'defense' : card.type}`;
        const tagsHtml = renderTagChips(getCardTags(card), 5);
        return `<div class="ct-card ${typeClass} ${card.upgraded ? 'upgraded' : ''}" data-uid="${card.uid}">
          <div class="ct-card-cost">${card.cost}</div>
          <div class="ct-card-art">${card.art}</div>
          <div class="ct-card-name">${card.name}</div>
          <div class="ct-card-type">${card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '法术'}</div>
          ${tagsHtml}
          <div class="ct-card-desc">${cardDescResolved(card)}</div>
        </div>`;
      }).join('');
      this.els.cardRemoval.classList.add('active');
    }

    hideCardRemoval() {
      this.els.cardRemoval.classList.remove('active');
    }

    /* --- Render Relics in Player Status --- */
    renderRelics() {
      const s = this.game.state;
      if (s.relics.length === 0) return '';
      const relicBadges = s.relics.map(rid => {
        const r = RELICS_MAP[rid];
        return r ? `<span class="ct-relic-badge" title="${r.name}: ${r.desc}">${r.icon}</span>` : '';
      }).join('');

      const setInfo = getRelicSetBonusEffects(s.relics);
      const setBadges = (setInfo.activeSets || []).map(({ set, count, activeTiers }) => {
        const tiers = Object.keys(set.tiers).map(n => Number(n)).sort((a, b) => a - b);
        const tierText = tiers.map(t => `${t}${count >= t ? '✅' : ''}`).join(' / ');
        const bonusLines = activeTiers.map(t => {
          const eff = set.tiers[t] || {};
          const effText = Object.entries(eff).map(([k, v]) => `${k}${typeof v === 'number' ? (v >= 0 ? `+${v}` : v) : ''}`).join('，');
          return `${t}件：${effText || '—'}`;
        }).join('\n');
        const title = `${set.icon} ${set.name} (${count}件)\n${set.desc}\n进度：${tierText}\n${bonusLines}`;
        const titleAttr = escapeHtml(title).replace(/\n/g, '&#10;');
        return `<span class="ct-relic-set-badge" title="${titleAttr}">${set.icon}${count}</span>`;
      }).join('');

      return `<div class="ct-relic-badges">${relicBadges}</div>${setBadges ? `<div class="ct-relic-set-badges">${setBadges}</div>` : ''}`;
    }

    /* --- Game Over --- */
    showGameOver(victory, score) {
      const s = this.game.state;
      const ascLabel = s.ascension > 0 ? ` (飞升${s.ascension})` : '';
      this.els.gameoverTitle.textContent = victory ? '登顶成功！飞升成仙！' + ascLabel : '魂归仙塔...' + ascLabel;
      this.els.gameoverTitle.style.color = victory ? 'var(--gold)' : 'var(--red)';

      const encourageHtml = !victory && typeof getEncouragement === 'function'
        ? `<div class="ct-gameover-encourage" style="text-align:center;font-size:0.85rem;color:var(--cyan);font-style:italic;margin:8px 0">${getEncouragement()}</div>` : '';

      let statsHtml = `
        <div class="ct-gameover-stat"><span class="ct-gameover-stat-label">通过楼层</span><span class="ct-gameover-stat-value">${s.floorsCleared} / ${this.game._getTotalTowerNodes()}</span></div>
        <div class="ct-gameover-stat"><span class="ct-gameover-stat-label">击败敌人</span><span class="ct-gameover-stat-value">${s.enemiesKilled}</span></div>
        <div class="ct-gameover-stat"><span class="ct-gameover-stat-label">剩余生命</span><span class="ct-gameover-stat-value">${Math.max(0, s.hp)}</span></div>
        <div class="ct-gameover-stat"><span class="ct-gameover-stat-label">最终牌组</span><span class="ct-gameover-stat-value">${s.deck.length} 张</span></div>`;
      if (s.ascension > 0) {
        statsHtml += `<div class="ct-gameover-stat"><span class="ct-gameover-stat-label">飞升难度</span><span class="ct-gameover-stat-value">${s.ascension}</span></div>`;
      }
      statsHtml += `<div class="ct-gameover-total"><div class="ct-gameover-stat"><span class="ct-gameover-stat-label">总分</span><span class="ct-gameover-stat-value">${score}</span></div></div>`;
      this.els.gameoverStats.innerHTML = encourageHtml + statsHtml;

      this.els.gameover.classList.add('active');
    }

    hideGameOver() {
      this.els.gameover.classList.remove('active');
    }

    /* --- Leaderboard --- */
    renderLeaderboard() {
      const board = getLeaderboard('cardtower');
      if (!board || board.length === 0) {
        this.els.leaderboard.innerHTML = '<h3>仙塔榜</h3><div class="ct-lb-empty">暂无记录</div>';
        return;
      }
      let html = '<h3>仙塔榜</h3>';
      board.slice(0, 5).forEach((entry, i) => {
        const d = new Date(entry.date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        html += `<div class="ct-lb-item">
          <span class="ct-lb-rank">#${i + 1}</span>
          <span>${dateStr}</span>
          <span class="ct-lb-score">${entry.score}</span>
        </div>`;
      });
      this.els.leaderboard.innerHTML = html;
    }
  }

  /* ============================================================
     GAME CONTROLLER
     ============================================================ */
  class Game {
    constructor() {
      this.state = new GameState();
      this.battle = new BattleManager(this);
      this.ui = new UIRenderer(this);
      this.init();
    }

    init() {
      initNav('cardtower');
      initParticles('#particles', 20);
      var resetState = typeof Phase2SaveReset !== 'undefined' ? Phase2SaveReset.ensure('cardtower') : null;
      if (resetState && resetState.status === 'cancelled') {
        this.renderResetBlocked();
        return;
      }
      this.ui.showScreen('start');
      this.ui.renderLeaderboard();
    }

    renderResetBlocked() {
      var app = document.getElementById('ct-app');
      if (!app) return;
      app.innerHTML = `
        <div class="ct-screen ct-start-screen active">
          <div class="ct-start-inner">
            <h1 class="ct-start-title">阶段2更新需清档</h1>
            <p class="ct-start-subtitle">你刚才取消了新版清档确认。斩仙塔当前版本不兼容旧进度，确认清档后才能继续进入。</p>
            <button class="btn btn-outline btn-lg" type="button" onclick="window.location.href='../index.html'">返回首页</button>
          </div>
        </div>
      `;
    }

    startGame(daily) {
      this.state.reset();
      this._isDaily = !!daily;
      if (daily) {
        const now = new Date();
        const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
        this._dailyRng = seededRandom(seed);
      } else {
        this._dailyRng = null;
      }
      this.pendingRewardCards = null;
      this.pendingRelicChoices = null;
      this.afterCardRewardCallback = null;
      this.afterRelicCallback = null;
      this.afterUpgradeCallback = null;
      this.cardRemovalCallback = null;
      this.pendingCampChoices = [];
      this.pendingPathEvent = null;

      if (typeof CrossGameRewards !== 'undefined') {
        const ctRewards = CrossGameRewards.checkAndClaim('cardtower');
        const ctState = this.state;
        ctRewards.forEach(function(r) {
          if (r.reward.type === 'hp_bonus') { ctState.hp += r.reward.value; ctState.maxHp += r.reward.value; }
          showToast('????: ' + r.name, 'success');
        });
      }

      const towerBonuses = Storage.get('xianyuan_tower_bonuses', { hp: 0, heal_next: 0, extraRelicChoices: 0 });
      if (towerBonuses.hp > 0) {
        this.state.hp += towerBonuses.hp;
        this.state.maxHp += towerBonuses.hp;
      }
      if (towerBonuses.heal_next > 0) {
        this.state.hp = Math.min(this.state.maxHp, this.state.hp + towerBonuses.heal_next);
        towerBonuses.heal_next = 0;
      }
      this.state._xianyuanExtraRelicChoices = Math.max(0, towerBonuses.extraRelicChoices || 0);
      if (towerBonuses.extraRelicChoices) towerBonuses.extraRelicChoices = 0;
      Storage.set('xianyuan_tower_bonuses', towerBonuses);

      this._buildTowerRun();
      this.ui.showScreen('game');
      this.ui.logMessage('???????????????', '');
      if (typeof CrossGameAchievements !== 'undefined') {
        const runStats = Storage.get('cross_game_stats', {});
        CrossGameAchievements.trackStat('cardtower_runs', (runStats.cardtower_runs || 0) + 1);
      }
      this.ui.renderAll();
    }

    random() {
      return (this._dailyRng || Math.random)();
    }

    _shuffleList(items) {
      return shuffleWithRng(items, () => this.random());
    }

    _buildTowerRun() {
      const rows = buildTowerRows(() => this.random());
      const nodeMap = {};
      rows.forEach(row => row.nodes.forEach(node => { nodeMap[node.id] = node; }));
      rows.forEach(row => row.nodes.forEach(node => {
        node.nextPreview = (node.nextIds || []).map(id => {
          const nextNode = nodeMap[id];
          return nextNode ? TOWER_NODE_META[nextNode.type].name : '';
        }).filter(Boolean);
      }));
      this.state.towerRows = rows;
      this.state.towerNodeMap = nodeMap;
      this.state.availableNodeIds = rows[0] ? rows[0].nodes.map(node => node.id) : [];
      this.state.currentNodeId = null;
      this.state.completedNodeIds = [];
      this.state.floorIndex = 0;
      this.state.nodeIndex = 0;
      this.state.floorsCleared = 0;
    }

    _getTotalTowerNodes() {
      return getTowerTotalNodeCount(this.state.towerRows);
    }

    _getNode(nodeId) {
      return nodeId ? this.state.towerNodeMap[nodeId] || null : null;
    }

    _getCurrentNode() {
      return this._getNode(this.state.currentNodeId);
    }

    _canSelectTowerNode() {
      if (this.state.gameOver || this.battle.inBattle) return false;
      if (this.ui.els.cardReward.classList.contains('active')) return false;
      if (this.ui.els.eventOverlay.classList.contains('active')) return false;
      if (this.ui.els.relicReward.classList.contains('active')) return false;
      if (this.ui.els.restShop.classList.contains('active')) return false;
      if (this.ui.els.upgradeOverlay.classList.contains('active')) return false;
      if (this.ui.els.cardRemoval.classList.contains('active')) return false;
      return true;
    }

    _buildEnemyDescriptor(node) {
      return { key: node.enemyKey, affixId: node.affixId || null, hpMul: node.hpMul || 1 };
    }

    _healPlayer(amount) {
      if (!amount) return 0;
      const healed = Math.min(amount, this.state.maxHp - this.state.hp);
      this.state.hp += healed;
      return healed;
    }

    _payHp(hpCostFlat = 0, hpCostPct = 0) {
      const pctCost = hpCostPct > 0 ? Math.floor(this.state.maxHp * hpCostPct) : 0;
      const cost = Math.max(0, hpCostFlat, pctCost);
      if (cost === 0) return true;
      if (this.state.hp <= cost) {
        showToast('????????????', 'error');
        return false;
      }
      this.state.hp -= cost;
      return true;
    }

    selectTowerNode(nodeId) {
      if (!this._canSelectTowerNode()) return;
      if (!this.state.availableNodeIds.includes(nodeId)) return;
      this.state.currentNodeId = nodeId;
      this.state.availableNodeIds = [];
      this.startCurrentNode();
    }

    restartGame() {
      this.ui.hideGameOver();
      this.ui.renderLeaderboard();
      this.state.reset();
      this.ui.showScreen('start');
    }

    startCurrentNode() {
      const node = this._getCurrentNode();
      if (!node) return;
      this.state.floorIndex = node.rowIndex;
      this.state.nodeIndex = node.lane;
      if (typeof CrossGameAchievements !== 'undefined') {
        CrossGameAchievements.trackStat('cardtower_max_floor', this.state.completedNodeIds.length + 1);
      }
      const meta = TOWER_NODE_META[node.type];
      const affix = node.affixId ? ENEMY_AFFIXES[node.affixId] : null;
      this.ui.logMessage(`??${meta.name}: ${node.title}${affix ? ` ? ${affix.name}` : ''}`, '');
      if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
        this.battle.startBattle([this._buildEnemyDescriptor(node)]);
        this.ui.renderAll();
        return;
      }
      if (node.type === 'event') {
        const eventDef = TOWER_PATH_EVENTS[node.eventId];
        if (!eventDef) {
          this.finishCurrentNode();
        } else {
          this.pendingPathEvent = eventDef;
          this.ui.showEvent({
            title: eventDef.title,
            desc: eventDef.desc,
            choices: eventDef.choices,
            onChoice: (choiceId) => this.handlePathEventChoice(choiceId)
          });
          this.ui.renderAll();
        }
        return;
      }
      if (node.type === 'rest') {
        const healAmt = Math.floor(this.state.maxHp * 0.3);
        this.pendingCampChoices = [
          { id: 'rest', run: () => { const healed = this._healPlayer(healAmt); showToast(`???? ${healed} ?`, 'success'); return () => this.finishCurrentNode(); } },
          { id: 'forge', run: () => () => { this.afterUpgradeCallback = () => this.finishCurrentNode(); this.ui.showUpgradeOverlay(); } },
          { id: 'purge', run: () => () => { this.cardRemovalCallback = () => this.finishCurrentNode(); this.ui.showCardRemoval(); } }
        ];
        this.ui.showRestShop({
          title: '??',
          subtitle: '?????????????',
          choices: [
            { id: 'rest', icon: '?', name: '??', desc: `?? ${healAmt} ??` },
            { id: 'forge', icon: '?', name: '??', desc: '?? 1 ???' },
            { id: 'purge', icon: '?', name: '??', desc: '?? 1 ???' }
          ]
        });
        this.ui.renderAll();
        return;
      }
      if (node.type === 'shop') {
        const rareCost = 12;
        const forgeCost = 8;
        const purgeCost = 6;
        this.pendingCampChoices = [
          { id: 'rare', run: () => { if (!this._payHp(rareCost)) return false; showToast('????????????????', 'success'); return () => this.showCardReward({ pool: RARE_REWARD_CARD_IDS, count: 3, disableClassCards: true, onComplete: () => this.finishCurrentNode() }); } },
          { id: 'forge', run: () => { if (!this._payHp(forgeCost)) return false; return () => { this.afterUpgradeCallback = () => this.finishCurrentNode(); this.ui.showUpgradeOverlay(); }; } },
          { id: 'purge', run: () => { if (!this._payHp(purgeCost)) return false; return () => { this.cardRemovalCallback = () => this.finishCurrentNode(); this.ui.showCardRemoval(); }; } },
          { id: 'leave', run: () => { showToast('??????????', 'info'); return () => this.finishCurrentNode(); } }
        ];
        this.ui.showRestShop({
          title: '??',
          subtitle: '???????????',
          choices: [
            { id: 'rare', icon: '??', name: '????', desc: `?? ${rareCost} ?????????` },
            { id: 'forge', icon: '?', name: '????', desc: `?? ${forgeCost} ????? 1 ???` },
            { id: 'purge', icon: '?', name: '????', desc: `?? ${purgeCost} ????? 1 ???` },
            { id: 'leave', icon: '?', name: '??', desc: '?????????' }
          ]
        });
        this.ui.renderAll();
      }
    }

    advanceNode() {
      const node = this._getCurrentNode();
      if (!node) return;
      if (node.type === 'battle') {
        this.showCardReward({ onComplete: () => this.finishCurrentNode() });
        return;
      }
      if (node.type === 'elite') {
        this.showRelicRewardAfterBoss({ title: '?????', subtitle: '????????????', onComplete: () => this.finishCurrentNode() });
        return;
      }
      if (node.type === 'boss') {
        const isFinalBoss = node.actIndex === TOWER_PATH_ACTS.length - 1;
        this.showRelicRewardAfterBoss({
          title: '????',
          subtitle: isFinalBoss ? '?????????????' : '??????????????',
          onComplete: () => {
            if (!isFinalBoss) {
              this.state.hp = this.state.maxHp;
              showToast('????????????', 'success');
            }
            this.finishCurrentNode();
          }
        });
        return;
      }
      this.finishCurrentNode();
    }

    finishCurrentNode() {
      const node = this._getCurrentNode();
      if (!node) {
        this.ui.renderAll();
        return;
      }
      if (!this.state.completedNodeIds.includes(node.id)) {
        this.state.completedNodeIds.push(node.id);
      }
      this.state.floorsCleared = this.state.completedNodeIds.length;
      const nextIds = (node.nextIds || []).filter(id => !this.state.completedNodeIds.includes(id));
      this.state.currentNodeId = null;
      this.state.availableNodeIds = nextIds;
      this.ui.renderAll();
      if (nextIds.length > 0) {
        const nextNames = nextIds.map(id => { const nextNode = this._getNode(id); return nextNode ? TOWER_NODE_META[nextNode.type].name : ''; }).filter(Boolean).join(' / ');
        this.ui.logMessage(`?????: ${nextNames}`, '');
        return;
      }
      this.battle.endGame(true);
    }

    showCardReward(options = {}) {
      const s = this.state;
      const ascReduction = Math.min(2, Math.floor((s.ascension || 0) / 3));
      const rewardCount = options.count || Math.max(2, 3 + s.getRelicEffect('rewardExtra') - ascReduction);
      let pool = options.pool ? [...options.pool] : [...OBTAINABLE_IDS];
      if (!options.disableClassCards && s.chosenClass) {
        const cls = CLASSES.find(c => c.id === s.chosenClass);
        if (cls && cls.exclusiveCards) {
          cls.exclusiveCards.forEach(id => { if (!pool.includes(id)) pool.push(id); });
        }
      }
      const drafted = options.cards || this._shuffleList([...new Set(pool)]).slice(0, rewardCount).map(id => makeCard(id, false));
      this.pendingRewardCards = drafted;
      this.afterCardRewardCallback = options.onComplete || null;
      this.ui.showCardReward(drafted);
    }

    pickRewardCard(cardId) {
      const s = this.state;
      const card = this.pendingRewardCards.find(c => c.id === cardId);
      if (card) {
        const upgradeChance = s.getRelicEffect('autoUpgradeChance');
        if (upgradeChance > 0 && this.random() < upgradeChance && !card.upgraded) {
          const upgraded = makeCard(card.id, true);
          upgraded.uid = card.uid;
          s.deck.push(upgraded);
          showToast(`??: ${upgraded.name} (????!)`, 'success');
        } else {
          s.deck.push(card);
          showToast(`??: ${card.name}`, 'success');
        }
      }
      this.ui.hideCardReward();
      this.pendingRewardCards = null;
      const cb = this.afterCardRewardCallback;
      this.afterCardRewardCallback = null;
      if (cb) { cb(); return; }
      this.finishCurrentNode();
    }

    skipReward() {
      this.ui.hideCardReward();
      this.pendingRewardCards = null;
      const cb = this.afterCardRewardCallback;
      this.afterCardRewardCallback = null;
      if (cb) { cb(); return; }
      this.finishCurrentNode();
    }

    proceedAfterEvent() {
      if (this.afterUpgradeCallback) {
        const cb = this.afterUpgradeCallback;
        this.afterUpgradeCallback = null;
        cb();
        return;
      }
      this.finishCurrentNode();
    }

    handlePathEventChoice(choiceId) {
      const eventDef = this.pendingPathEvent;
      if (!eventDef) return;
      const choice = eventDef.choices.find(item => item.id === choiceId);
      if (!choice) return;
      const effect = choice.effect || { type: 'leave' };
      let followUp = null;
      if (effect.type === 'relic') {
        if (!this._payHp(effect.hpCostFlat || 0, effect.hpCostPct || 0)) return;
        followUp = () => this.showRelicRewardAfterBoss({ title: '????', subtitle: '????????????????', onComplete: () => this.finishCurrentNode() });
      } else if (effect.type === 'rare_card') {
        followUp = () => this.showCardReward({ pool: RARE_REWARD_CARD_IDS, count: 3, disableClassCards: true, onComplete: () => this.finishCurrentNode() });
      } else if (effect.type === 'remove') {
        followUp = () => { this.cardRemovalCallback = () => this.finishCurrentNode(); this.ui.showCardRemoval(); };
      } else if (effect.type === 'heal') {
        const healed = this._healPlayer(effect.healFlat || Math.floor(this.state.maxHp * (effect.healPct || 0)));
        showToast(effect.toast || `?? ${healed} ?`, 'success');
      } else if (effect.type === 'max_hp') {
        if (!this._payHp(effect.hpCostFlat || 0, effect.hpCostPct || 0)) return;
        this.state.maxHp += effect.maxHpGain || 0;
        this.state.hp = Math.min(this.state.maxHp, this.state.hp + (effect.healGain || 0));
        showToast(effect.toast || '???????', 'success');
      } else if (effect.type === 'gamble_card') {
        if (!this._payHp(effect.hpCostFlat || 0, effect.hpCostPct || 0)) return;
        if (this.random() < (effect.winChance || 0.5)) {
          followUp = () => this.showCardReward({ pool: RARE_REWARD_CARD_IDS, count: 3, disableClassCards: true, onComplete: () => this.finishCurrentNode() });
        } else {
          showToast(effect.failToast || '????????', 'error');
        }
      } else if (effect.type === 'gamble_relic') {
        if (!this._payHp(effect.hpCostFlat || 0, effect.hpCostPct || 0)) return;
        if (this.random() < (effect.winChance || 0.45)) {
          followUp = () => this.showRelicRewardAfterBoss({ title: '????', subtitle: '?????????', onComplete: () => this.finishCurrentNode() });
        } else {
          showToast(effect.failToast || '??????????', 'error');
        }
      } else {
        showToast(effect.toast || '?????????', 'info');
      }
      this.pendingPathEvent = null;
      this.ui.hideEvent();
      if (followUp) { followUp(); return; }
      this.finishCurrentNode();
    }

    showRelicRewardAfterBoss(options = {}) {
      const s = this.state;
      const available = RELICS.filter(r => !s.relics.includes(r.id));
      if (available.length === 0) {
        if (options.onComplete) { options.onComplete(); return; }
        this.finishCurrentNode();
        return;
      }
      const shuffled = this._shuffleList(available);
      const extraChoices = Math.min(3, Math.max(0, s._xianyuanExtraRelicChoices || 0));
      const count = Math.min(available.length, options.count || 3 + extraChoices);
      const choices = shuffled.slice(0, count);
      if (extraChoices > 0) s._xianyuanExtraRelicChoices = 0;
      this.pendingRelicChoices = choices;
      this.afterRelicCallback = options.onComplete || null;
      this.ui.showRelicReward(choices, { title: options.title || '????', subtitle: options.subtitle || '???????????????' });
    }

    pickRelic(relicId) {
      const s = this.state;
      const relic = RELICS_MAP[relicId];
      if (!relic || s.relics.includes(relicId)) return;
      s.relics.push(relicId);
      if (relic.effect.maxHpBonus) { s.maxHp += relic.effect.maxHpBonus; s.hp += relic.effect.maxHpBonus; }
      if (relic.effect.strengthBonus) { s.strength += relic.effect.strengthBonus; }
      if (relic.effect.maxEnergyBonus) { s.maxEnergy += relic.effect.maxEnergyBonus; }
      showToast(`????: ${relic.icon} ${relic.name}`, 'success');
      this.ui.hideRelicReward();
      this.pendingRelicChoices = null;
      const cb = this.afterRelicCallback;
      this.afterRelicCallback = null;
      if (cb) { cb(); return; }
      this.finishCurrentNode();
    }

    handleRestChoice(choiceId) {
      const choice = (this.pendingCampChoices || []).find(item => item.id === choiceId);
      if (!choice) return;
      const followUp = choice.run ? choice.run() : null;
      if (followUp === false) return;
      this.ui.hideRestShop();

      this.pendingCampChoices = [];
      if (typeof followUp === 'function') followUp();
      if (choice === 'rest') {
        const healAmt = Math.floor(s.maxHp * 0.45);
        const healed = Math.min(healAmt, s.maxHp - s.hp);
        s.hp += healed;
        showToast(`休息恢复了 ${healed} 生命`, 'success');
        if (s.hp >= s.maxHp * 0.9) {
          s.restShield = Math.max(s.restShield || 0, 6);
          showToast('静养充沛：下场战斗获得6护甲', 'info');
        }
        this.showCardReward();
      } else if (choice === 'remove') {
        this.cardRemovalCallback = () => {
          const healAmt = Math.floor(s.maxHp * 0.1);
          const healed = Math.min(healAmt, s.maxHp - s.hp);
          s.hp += healed;
          if (healed > 0) {
            showToast(`净化后回复 ${healed} 生命`, 'success');
          }
          this.showCardReward();
        };
        this.ui.showCardRemoval();
      } else {
        // skip
        this.showCardReward();
      }
    }

    removeCard(uid) {
      const s = this.state;
      const idx = s.deck.findIndex(c => c.uid === uid);
      if (idx === -1) return;
      const removed = s.deck.splice(idx, 1)[0];
      showToast(`??? ${removed.name}`, 'info');
      this.ui.hideCardRemoval();
      if (this.cardRemovalCallback) {
        const cb = this.cardRemovalCallback;
        this.cardRemovalCallback = null;
        cb();
      }
    }

    skipCardRemoval() {
      this.ui.hideCardRemoval();
      if (this.cardRemovalCallback) {
        const cb = this.cardRemovalCallback;
        this.cardRemovalCallback = null;
        cb();
      }
    }

    showCardRemovalForEvent() {
      this.cardRemovalCallback = () => {
        this.state.maxHp += 5;
        showToast('???? +5', 'success');
        this.proceedAfterEvent();
      };
      this.ui.showCardRemoval();
    }

    upgradeCard(uid) {
      const s = this.state;
      const idx = s.deck.findIndex(c => c.uid === uid);
      if (idx === -1) return;
      const old = s.deck[idx];
      const upgraded = makeCard(old.id, true);
      upgraded.uid = old.uid;
      s.deck[idx] = upgraded;
      showToast(`${upgraded.name} ????`, 'success');
      const cb = this.afterUpgradeCallback;
      this.afterUpgradeCallback = null;
      if (cb) { cb(); return; }
      this.proceedAfterEvent();
    }
  }

  /* ============================================================
     BOOTSTRAP
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    window.__cardtowerGame = game;
    // 新手引导
    if (typeof GuideSystem !== 'undefined') {
      GuideSystem.start('cardtower', [
        { title: '欢迎来到斩仙塔！', desc: '肉鸽卡牌攀塔，从初始牌组出发，逐层击败妖魔。' },
        { title: '开始攀塔', desc: '点击此按钮开始新一轮挑战。', target: '#ct-btn-start' },
        { title: '出牌提示', desc: '战斗中点击手牌出牌，合理分配灵力，击败敌人后可获得新卡。' }
      ]);
    }
  });

})();
