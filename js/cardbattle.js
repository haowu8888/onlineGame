/* ========== 灵卡对决 ========== */
(function () {
  'use strict';

  /* ===================== 卡牌定义 ===================== */

  // 弟子卡（随从）图标
  const MINION_ART = {
    '剑修弟子': '⚔️', '灵兽幼崽': '🐾', '符箓师': '📜', '丹修弟子': '💊',
    '剑灵': '🗡️', '护法金刚': '🛡️', '天狐妖姬': '🦊', '雷法真人': '⚡',
    '剑仙': '✨', '太上长老': '👴',
    // 新可解锁卡
    '灵狐巫女': '🦊', '铁壁傀儡': '🤖', '影杀者': '🗡️', '灵兽驯师': '🐲',
    '雷击傀儡': '💣', '吞灵蟒': '🐍', '仙盾守卫': '🛡️', '破灭剑圣': '⚔️',
    '九天玄女': '👸', '混沌魔神': '😈', '炼魂幽灵': '👻', '真武将军': '🏯',
    '灵兽王': '🦁', '暗影刺客': '🌑', '玉面狐仙': '🦊',
    // AI用
    '妖兽': '🐺', '小妖': '👺', '毒蛇': '🐍', '妖兵': '👹', '石魔': '🪨',
    '妖将': '😈', '魔修': '🧛', '血煞': '💀', '炎魔': '🔥', '天魔': '👿',
    '魔将': '⚫', '噬魂者': '☠️', '暗影': '🌑', '魔尊护卫': '🏴',
  };

  const SPELL_ART = {
    '灵气弹': '🔵', '金光咒': '🌟', '回春术': '💚', '天雷符': '⚡', '仙人指路': '🔮',
    '烈焰风暴': '🔥', '灵力灌注': '💠', '天罚': '⛈️', '生命涌泉': '💧', '灵魂收割': '💀',
    '妖火术': '🔥', '黑雾': '🌫️', '吞噬': '🕳️', '魔焰': '💜',
  };

  /* --- 玩家卡牌库 --- */
  function createPlayerDeck() {
    const cards = [];
    // 弟子卡 (20)
    for (let i = 0; i < 3; i++) cards.push({ name: '剑修弟子', type: 'minion', cost: 1, atk: 2, hp: 2 });
    for (let i = 0; i < 3; i++) cards.push({ name: '灵兽幼崽', type: 'minion', cost: 2, atk: 2, hp: 3 });
    for (let i = 0; i < 2; i++) cards.push({ name: '符箓师', type: 'minion', cost: 2, atk: 1, hp: 3, battlecry: 'deal2random' });
    for (let i = 0; i < 2; i++) cards.push({ name: '丹修弟子', type: 'minion', cost: 3, atk: 2, hp: 4, battlecry: 'heal3' });
    for (let i = 0; i < 2; i++) cards.push({ name: '剑灵', type: 'minion', cost: 3, atk: 4, hp: 2 });
    for (let i = 0; i < 2; i++) cards.push({ name: '护法金刚', type: 'minion', cost: 4, atk: 3, hp: 6, taunt: true });
    for (let i = 0; i < 2; i++) cards.push({ name: '天狐妖姬', type: 'minion', cost: 4, atk: 4, hp: 4 });
    for (let i = 0; i < 2; i++) cards.push({ name: '雷法真人', type: 'minion', cost: 5, atk: 5, hp: 5, battlecry: 'aoe3' });
    cards.push({ name: '剑仙', type: 'minion', cost: 7, atk: 7, hp: 7, battlecry: 'deal5random' });
    cards.push({ name: '太上长老', type: 'minion', cost: 8, atk: 8, hp: 8, battlecry: 'heal5aoe3' });
    // 新关键词卡牌
    cards.push({ name: '疾风剑客', type: 'minion', cost: 3, atk: 3, hp: 2, charge: true });
    cards.push({ name: '圣光护卫', type: 'minion', cost: 4, atk: 2, hp: 4, divineShield: true, taunt: true });
    for (let i = 0; i < 2; i++) cards.push({ name: '怨灵', type: 'minion', cost: 2, atk: 2, hp: 1, deathrattle: 'summon_1_1' });
    cards.push({ name: '灵爆傀儡', type: 'minion', cost: 3, atk: 1, hp: 2, deathrattle: 'deal2all_enemy' });
    cards.push({ name: '夺魂使者', type: 'minion', cost: 5, atk: 5, hp: 3, charge: true, deathrattle: 'draw1' });
    // 法术卡 (10)
    for (let i = 0; i < 3; i++) cards.push({ name: '灵气弹', type: 'spell', cost: 1, effect: 'deal3minion', desc: '对一个随从造成3点伤害' });
    for (let i = 0; i < 2; i++) cards.push({ name: '金光咒', type: 'spell', cost: 2, effect: 'aoe2', desc: '对所有敌方随从造成2点伤害' });
    for (let i = 0; i < 2; i++) cards.push({ name: '回春术', type: 'spell', cost: 2, effect: 'heal5', desc: '为你恢复5点生命值' });
    for (let i = 0; i < 2; i++) cards.push({ name: '天雷符', type: 'spell', cost: 4, effect: 'deal6any', desc: '对任意目标造成6点伤害' });
    cards.push({ name: '仙人指路', type: 'spell', cost: 3, effect: 'draw2', desc: '抽两张牌' });
    return cards;
  }

  /* --- AI卡牌库 --- */
  // Each difficulty has multiple deck archetypes for variety
  const AI_ARCHETYPES = {
    0: [ // 练气
      { name: '妖兽群攻', style: 'aggro' },
      { name: '石魔防御', style: 'control' },
    ],
    1: [ // 筑基
      { name: '魔修快攻', style: 'aggro' },
      { name: '炎魔法术', style: 'spell' },
      { name: '血煞均衡', style: 'midrange' },
    ],
    2: [ // 金丹
      { name: '天魔冲锋', style: 'aggro' },
      { name: '噬魂控制', style: 'control' },
      { name: '魔尊重型', style: 'ramp' },
    ],
  };

  function createEnemyDeck(diff) {
    const archetypes = AI_ARCHETYPES[diff] || AI_ARCHETYPES[0];
    const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
    const cards = [];

    if (diff === 0) {
      if (archetype.style === 'aggro') {
        // 快攻：大量低费高攻随从
        for (let i = 0; i < 8; i++) cards.push({ name: '小妖', type: 'minion', cost: 1, atk: 1, hp: 2 });
        for (let i = 0; i < 8; i++) cards.push({ name: '毒蛇', type: 'minion', cost: 2, atk: 3, hp: 1 });
        for (let i = 0; i < 6; i++) cards.push({ name: '妖兽', type: 'minion', cost: 2, atk: 2, hp: 2 });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖兵', type: 'minion', cost: 3, atk: 2, hp: 3 });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖将', type: 'minion', cost: 3, atk: 2, hp: 4 });
      } else {
        // 防御：嘲讽+中费
        for (let i = 0; i < 4; i++) cards.push({ name: '小妖', type: 'minion', cost: 1, atk: 1, hp: 2 });
        for (let i = 0; i < 6; i++) cards.push({ name: '石魔', type: 'minion', cost: 3, atk: 3, hp: 3 });
        for (let i = 0; i < 6; i++) cards.push({ name: '妖兵', type: 'minion', cost: 3, atk: 2, hp: 3 });
        for (let i = 0; i < 6; i++) cards.push({ name: '妖兽', type: 'minion', cost: 2, atk: 2, hp: 2 });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖将', type: 'minion', cost: 3, atk: 2, hp: 4, taunt: true });
        for (let i = 0; i < 4; i++) cards.push({ name: '石魔', type: 'minion', cost: 4, atk: 2, hp: 5, taunt: true });
      }
    } else if (diff === 1) {
      if (archetype.style === 'aggro') {
        // 快攻：冲锋+低费
        for (let i = 0; i < 4; i++) cards.push({ name: '妖兽', type: 'minion', cost: 2, atk: 2, hp: 3 });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖兵', type: 'minion', cost: 2, atk: 3, hp: 2 });
        for (let i = 0; i < 4; i++) cards.push({ name: '血煞', type: 'minion', cost: 3, atk: 4, hp: 3 });
        for (let i = 0; i < 3; i++) cards.push({ name: '魔冲骑兵', type: 'minion', cost: 4, atk: 4, hp: 2, charge: true });
        for (let i = 0; i < 3; i++) cards.push({ name: '妖将', type: 'minion', cost: 4, atk: 4, hp: 4 });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖火术', type: 'spell', cost: 2, effect: 'deal3minion', desc: '对一个随从造成3点伤害' });
        for (let i = 0; i < 4; i++) cards.push({ name: '魔修', type: 'minion', cost: 3, atk: 3, hp: 4 });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖兵', type: 'minion', cost: 2, atk: 3, hp: 2 });
      } else if (archetype.style === 'spell') {
        // 法术型：大量法术+战吼
        for (let i = 0; i < 3; i++) cards.push({ name: '妖兽', type: 'minion', cost: 2, atk: 2, hp: 3 });
        for (let i = 0; i < 3; i++) cards.push({ name: '炎魔', type: 'minion', cost: 5, atk: 5, hp: 4, battlecry: 'aoe2enemy' });
        for (let i = 0; i < 3; i++) cards.push({ name: '石魔', type: 'minion', cost: 4, atk: 3, hp: 5, taunt: true });
        for (let i = 0; i < 5; i++) cards.push({ name: '妖火术', type: 'spell', cost: 2, effect: 'deal3minion', desc: '对一个随从造成3点伤害' });
        for (let i = 0; i < 5; i++) cards.push({ name: '黑雾', type: 'spell', cost: 3, effect: 'aoe2', desc: '对所有敌方随从造成2点伤害' });
        for (let i = 0; i < 3; i++) cards.push({ name: '魔焰', type: 'spell', cost: 5, effect: 'aoe3spell', desc: '对所有敌方随从造成3点伤害' });
        for (let i = 0; i < 3; i++) cards.push({ name: '魔修', type: 'minion', cost: 3, atk: 3, hp: 4 });
        for (let i = 0; i < 5; i++) cards.push({ name: '血煞', type: 'minion', cost: 3, atk: 4, hp: 3 });
      } else {
        // 均衡：原始筑基牌组
        for (let i = 0; i < 4; i++) cards.push({ name: '妖兽', type: 'minion', cost: 2, atk: 2, hp: 3 });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖兵', type: 'minion', cost: 2, atk: 3, hp: 2 });
        for (let i = 0; i < 4; i++) cards.push({ name: '魔修', type: 'minion', cost: 3, atk: 3, hp: 4 });
        for (let i = 0; i < 3; i++) cards.push({ name: '血煞', type: 'minion', cost: 3, atk: 4, hp: 3 });
        for (let i = 0; i < 3; i++) cards.push({ name: '石魔', type: 'minion', cost: 4, atk: 3, hp: 5, taunt: true });
        for (let i = 0; i < 2; i++) cards.push({ name: '炎魔', type: 'minion', cost: 5, atk: 5, hp: 4, battlecry: 'aoe2enemy' });
        for (let i = 0; i < 3; i++) cards.push({ name: '妖火术', type: 'spell', cost: 2, effect: 'deal3minion', desc: '对一个随从造成3点伤害' });
        for (let i = 0; i < 3; i++) cards.push({ name: '黑雾', type: 'spell', cost: 3, effect: 'aoe2', desc: '对所有敌方随从造成2点伤害' });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖将', type: 'minion', cost: 4, atk: 4, hp: 4 });
      }
    } else {
      if (archetype.style === 'aggro') {
        // 金丹快攻：冲锋+高攻
        for (let i = 0; i < 3; i++) cards.push({ name: '血煞', type: 'minion', cost: 3, atk: 4, hp: 3, battlecry: 'deal2random' });
        for (let i = 0; i < 4; i++) cards.push({ name: '魔冲骑兵', type: 'minion', cost: 4, atk: 4, hp: 2, charge: true });
        for (let i = 0; i < 3; i++) cards.push({ name: '天魔', type: 'minion', cost: 4, atk: 4, hp: 5 });
        for (let i = 0; i < 3; i++) cards.push({ name: '噬魂者', type: 'minion', cost: 5, atk: 6, hp: 4, battlecry: 'deal3random' });
        for (let i = 0; i < 4; i++) cards.push({ name: '妖火术', type: 'spell', cost: 2, effect: 'deal3minion', desc: '对一个随从造成3点伤害' });
        for (let i = 0; i < 2; i++) cards.push({ name: '吞噬', type: 'spell', cost: 4, effect: 'deal6any', desc: '对任意目标造成6点伤害' });
        for (let i = 0; i < 3; i++) cards.push({ name: '魔修', type: 'minion', cost: 3, atk: 3, hp: 4 });
        for (let i = 0; i < 4; i++) cards.push({ name: '暗影', type: 'minion', cost: 6, atk: 6, hp: 6, battlecry: 'aoe3' });
        for (let i = 0; i < 4; i++) cards.push({ name: '诅咒骷髅', type: 'minion', cost: 2, atk: 2, hp: 2, deathrattle: 'deal2all_enemy' });
      } else if (archetype.style === 'control') {
        // 金丹控制：嘲讽+回血+法术清场
        for (let i = 0; i < 3; i++) cards.push({ name: '魔将', type: 'minion', cost: 5, atk: 5, hp: 5, taunt: true });
        for (let i = 0; i < 2; i++) cards.push({ name: '魔尊护卫', type: 'minion', cost: 7, atk: 7, hp: 7, taunt: true });
        for (let i = 0; i < 2; i++) cards.push({ name: '暗盾卫士', type: 'minion', cost: 5, atk: 3, hp: 5, divineShield: true, taunt: true });
        for (let i = 0; i < 4; i++) cards.push({ name: '黑雾', type: 'spell', cost: 3, effect: 'aoe2', desc: '对所有敌方随从造成2点伤害' });
        for (let i = 0; i < 3; i++) cards.push({ name: '魔焰', type: 'spell', cost: 5, effect: 'aoe3spell', desc: '对所有敌方随从造成3点伤害' });
        for (let i = 0; i < 3; i++) cards.push({ name: '吞噬', type: 'spell', cost: 4, effect: 'deal6any', desc: '对任意目标造成6点伤害' });
        for (let i = 0; i < 3; i++) cards.push({ name: '天魔', type: 'minion', cost: 4, atk: 4, hp: 5 });
        for (let i = 0; i < 4; i++) cards.push({ name: '魔修', type: 'minion', cost: 3, atk: 3, hp: 4 });
        for (let i = 0; i < 2; i++) cards.push({ name: '暗影', type: 'minion', cost: 6, atk: 6, hp: 6, battlecry: 'aoe3' });
        for (let i = 0; i < 4; i++) cards.push({ name: '血煞', type: 'minion', cost: 3, atk: 4, hp: 3 });
      } else {
        // 金丹重型：高费大随从
        for (let i = 0; i < 3; i++) cards.push({ name: '魔修', type: 'minion', cost: 3, atk: 3, hp: 4 });
        for (let i = 0; i < 3; i++) cards.push({ name: '天魔', type: 'minion', cost: 4, atk: 4, hp: 5 });
        for (let i = 0; i < 3; i++) cards.push({ name: '魔将', type: 'minion', cost: 5, atk: 5, hp: 5, taunt: true });
        for (let i = 0; i < 3; i++) cards.push({ name: '噬魂者', type: 'minion', cost: 5, atk: 6, hp: 4, battlecry: 'deal3random' });
        for (let i = 0; i < 3; i++) cards.push({ name: '暗影', type: 'minion', cost: 6, atk: 6, hp: 6, battlecry: 'aoe3' });
        for (let i = 0; i < 3; i++) cards.push({ name: '魔尊护卫', type: 'minion', cost: 7, atk: 7, hp: 7, taunt: true });
        for (let i = 0; i < 3; i++) cards.push({ name: '妖火术', type: 'spell', cost: 2, effect: 'deal3minion', desc: '对一个随从造成3点伤害' });
        for (let i = 0; i < 3; i++) cards.push({ name: '黑雾', type: 'spell', cost: 3, effect: 'aoe2', desc: '对所有敌方随从造成2点伤害' });
        for (let i = 0; i < 2; i++) cards.push({ name: '吞噬', type: 'spell', cost: 4, effect: 'deal6any', desc: '对任意目标造成6点伤害' });
        for (let i = 0; i < 2; i++) cards.push({ name: '魔焰', type: 'spell', cost: 5, effect: 'aoe3spell', desc: '对所有敌方随从造成3点伤害' });
        for (let i = 0; i < 2; i++) cards.push({ name: '诅咒骷髅', type: 'minion', cost: 2, atk: 2, hp: 2, deathrattle: 'deal2all_enemy' });
      }
    }
    // Ensure exactly 30 cards (trim or pad)
    while (cards.length > 30) cards.pop();
    while (cards.length < 30) cards.push({ name: '小妖', type: 'minion', cost: 1, atk: 1, hp: 2 });
    // Store archetype name for display
    cards._archetypeName = archetype.name;
    return cards;
  }

  const OPPONENTS = [
    { name: '练气妖修', hp: 30, portrait: '👺', diff: 0 },
    { name: '筑基魔修', hp: 40, portrait: '😈', diff: 1 },
    { name: '金丹魔尊', hp: 50, portrait: '👿', diff: 2 },
  ];

  const DIFF_NAMES = ['练气', '筑基', '金丹'];

  /* --- 卡牌目录 (组牌系统) --- */
  const CARD_CATALOG = [
    // 基础卡 (初始拥有)
    {id:'c01',name:'剑修弟子',type:'minion',cost:1,atk:2,hp:2,maxCopy:3,starter:true},
    {id:'c02',name:'灵兽幼崽',type:'minion',cost:2,atk:2,hp:3,maxCopy:3,starter:true},
    {id:'c03',name:'符箓师',type:'minion',cost:2,atk:1,hp:3,battlecry:'deal2random',maxCopy:2,starter:true},
    {id:'c04',name:'丹修弟子',type:'minion',cost:3,atk:2,hp:4,battlecry:'heal3',maxCopy:2,starter:true},
    {id:'c05',name:'剑灵',type:'minion',cost:3,atk:4,hp:2,maxCopy:2,starter:true},
    {id:'c06',name:'护法金刚',type:'minion',cost:4,atk:3,hp:6,taunt:true,maxCopy:2,starter:true},
    {id:'c07',name:'天狐妖姬',type:'minion',cost:4,atk:4,hp:4,maxCopy:2,starter:true},
    {id:'c08',name:'雷法真人',type:'minion',cost:5,atk:5,hp:5,battlecry:'aoe3',maxCopy:2,starter:true},
    {id:'c09',name:'剑仙',type:'minion',cost:7,atk:7,hp:7,battlecry:'deal5random',maxCopy:1,starter:true},
    {id:'c10',name:'太上长老',type:'minion',cost:8,atk:8,hp:8,battlecry:'heal5aoe3',maxCopy:1,starter:true},
    {id:'c11',name:'疾风剑客',type:'minion',cost:3,atk:3,hp:2,charge:true,maxCopy:1,starter:true},
    {id:'c12',name:'圣光护卫',type:'minion',cost:4,atk:2,hp:4,divineShield:true,taunt:true,maxCopy:1,starter:true},
    {id:'c13',name:'怨灵',type:'minion',cost:2,atk:2,hp:1,deathrattle:'summon_1_1',maxCopy:2,starter:true},
    {id:'c14',name:'灵爆傀儡',type:'minion',cost:3,atk:1,hp:2,deathrattle:'deal2all_enemy',maxCopy:1,starter:true},
    {id:'c15',name:'夺魂使者',type:'minion',cost:5,atk:5,hp:3,charge:true,deathrattle:'draw1',maxCopy:1,starter:true},
    {id:'s01',name:'灵气弹',type:'spell',cost:1,effect:'deal3minion',desc:'对一个随从造成3点伤害',maxCopy:3,starter:true},
    {id:'s02',name:'金光咒',type:'spell',cost:2,effect:'aoe2',desc:'对所有敌方随从造成2点伤害',maxCopy:2,starter:true},
    {id:'s03',name:'回春术',type:'spell',cost:2,effect:'heal5',desc:'为你恢复5点生命值',maxCopy:2,starter:true},
    {id:'s04',name:'天雷符',type:'spell',cost:4,effect:'deal6any',desc:'对任意目标造成6点伤害',maxCopy:2,starter:true},
    {id:'s05',name:'仙人指路',type:'spell',cost:3,effect:'draw2',desc:'抽两张牌',maxCopy:1,starter:true},
    // 可解锁卡 (通过胜利获取)
    {id:'c16',name:'灵狐巫女',type:'minion',cost:2,atk:1,hp:2,battlecry:'heal3',maxCopy:2},
    {id:'c17',name:'铁壁傀儡',type:'minion',cost:3,atk:0,hp:8,taunt:true,maxCopy:2},
    {id:'c18',name:'影杀者',type:'minion',cost:4,atk:5,hp:2,charge:true,maxCopy:2},
    {id:'c19',name:'灵兽驯师',type:'minion',cost:3,atk:2,hp:3,battlecry:'summon_2_2',maxCopy:2},
    {id:'c20',name:'雷击傀儡',type:'minion',cost:4,atk:3,hp:3,deathrattle:'deal3all_enemy',maxCopy:2},
    {id:'c21',name:'吞灵蟒',type:'minion',cost:5,atk:4,hp:6,battlecry:'deal3random',maxCopy:2},
    {id:'c22',name:'仙盾守卫',type:'minion',cost:5,atk:3,hp:5,divineShield:true,taunt:true,maxCopy:1},
    {id:'c23',name:'破灭剑圣',type:'minion',cost:6,atk:7,hp:4,charge:true,maxCopy:1},
    {id:'c24',name:'九天玄女',type:'minion',cost:6,atk:5,hp:6,battlecry:'heal5aoe3',maxCopy:1},
    {id:'c25',name:'混沌魔神',type:'minion',cost:9,atk:9,hp:9,battlecry:'aoe3',taunt:true,maxCopy:1},
    {id:'c26',name:'炼魂幽灵',type:'minion',cost:1,atk:1,hp:1,deathrattle:'draw1',maxCopy:2},
    {id:'c27',name:'真武将军',type:'minion',cost:6,atk:6,hp:7,maxCopy:2},
    {id:'c28',name:'灵兽王',type:'minion',cost:5,atk:5,hp:5,deathrattle:'summon_3_3',maxCopy:1},
    {id:'c29',name:'暗影刺客',type:'minion',cost:2,atk:3,hp:1,charge:true,maxCopy:2},
    {id:'c30',name:'玉面狐仙',type:'minion',cost:4,atk:3,hp:4,battlecry:'draw1',maxCopy:2},
    {id:'s06',name:'烈焰风暴',type:'spell',cost:5,effect:'aoe4',desc:'对所有敌方随从造成4点伤害',maxCopy:2},
    {id:'s07',name:'灵力灌注',type:'spell',cost:0,effect:'draw1',desc:'抽一张牌',maxCopy:2},
    {id:'s08',name:'天罚',type:'spell',cost:6,effect:'deal8any',desc:'对任意目标造成8点伤害',maxCopy:1},
    {id:'s09',name:'生命涌泉',type:'spell',cost:3,effect:'heal8',desc:'恢复8点生命值',maxCopy:2},
    {id:'s10',name:'灵魂收割',type:'spell',cost:4,effect:'killlow3',desc:'消灭一个攻击力≤3的随从',maxCopy:2},
  ];

  const CARD_CATALOG_MAP = {};
  CARD_CATALOG.forEach(c => CARD_CATALOG_MAP[c.id] = c);
  const UNLOCKABLE_CARD_IDS = CARD_CATALOG.filter(c => !c.starter).map(c => c.id);

  /* --- 收藏/套牌存储 --- */
  function getCollection() {
    const col = Storage.get('cardbattle_collection', null);
    if (!col) {
      // Initialize with starter cards
      const init = {};
      CARD_CATALOG.filter(c => c.starter).forEach(c => { init[c.id] = c.maxCopy; });
      Storage.set('cardbattle_collection', init);
      return init;
    }
    return col;
  }

  function saveCollection(col) { Storage.set('cardbattle_collection', col); }

  function getDecks() { return Storage.get('cardbattle_decks', []); }
  function saveDecks(decks) { Storage.set('cardbattle_decks', decks); }
  function getActiveDeckIdx() { return Storage.get('cardbattle_active_deck', -1); }
  function setActiveDeckIdx(idx) { Storage.set('cardbattle_active_deck', idx); }

  function grantRandomCard() {
    const col = getCollection();
    // Find cards we don't have max copies of
    const candidates = UNLOCKABLE_CARD_IDS.filter(id => {
      const cat = CARD_CATALOG_MAP[id];
      return (col[id] || 0) < cat.maxCopy;
    });
    if (candidates.length === 0) return null;
    const id = candidates[Math.floor(Math.random() * candidates.length)];
    col[id] = (col[id] || 0) + 1;
    saveCollection(col);
    return CARD_CATALOG_MAP[id];
  }

  function buildDeckFromList(cardIds) {
    const cards = [];
    cardIds.forEach(id => {
      const cat = CARD_CATALOG_MAP[id];
      if (!cat) return;
      const card = { name: cat.name, type: cat.type, cost: cat.cost };
      if (cat.type === 'minion') { card.atk = cat.atk; card.hp = cat.hp; }
      if (cat.battlecry) card.battlecry = cat.battlecry;
      if (cat.taunt) card.taunt = true;
      if (cat.charge) card.charge = true;
      if (cat.divineShield) card.divineShield = true;
      if (cat.deathrattle) card.deathrattle = cat.deathrattle;
      if (cat.effect) { card.effect = cat.effect; card.desc = cat.desc; }
      cards.push(card);
    });
    return cards;
  }

  /* ===================== 工具函数 ===================== */

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getArt(card) {
    if (card.type === 'spell') return SPELL_ART[card.name] || '🔮';
    return MINION_ART[card.name] || '❓';
  }

  /* ===================== 游戏状态 ===================== */

  let G = null; // game state
  let selectedMinion = null; // index of selected attacker on player field
  let pendingSpell = null; // card object waiting for target
  let pendingSpellHandIdx = null;
  let animating = false;

  const MAX_FIELD = 6;

  function newGame(diff) {
    const opp = OPPONENTS[diff];
    // Check for custom deck
    const deckIdx = getActiveDeckIdx();
    const decks = getDecks();
    let playerDeck;
    if (deckIdx >= 0 && decks[deckIdx] && decks[deckIdx].cards.length === 30) {
      playerDeck = shuffle(buildDeckFromList(decks[deckIdx].cards));
    } else {
      playerDeck = shuffle(createPlayerDeck());
    }
    const enemyDeck = shuffle(createEnemyDeck(diff));

    G = {
      diff: diff,
      turn: 0, // incremented at start of each turn cycle
      phase: 'player', // 'player' | 'enemy' | 'gameover'
      playerHP: 30,
      playerMaxHP: 30,
      playerEnergy: 0,
      playerMaxEnergy: 0,
      playerDeck: playerDeck,
      playerHand: [],
      playerField: [], // { name, atk, hp, maxHp, taunt, canAttack, battlecry, ... }
      enemyHP: opp.hp,
      enemyMaxHP: opp.hp,
      enemyEnergy: 0,
      enemyMaxEnergy: 0,
      enemyDeck: enemyDeck,
      enemyHand: [],
      enemyField: [],
      enemyName: opp.name,
      enemyPortrait: opp.portrait,
      enemyArchetype: enemyDeck._archetypeName || '',
      turnCount: 0,
      gameOver: false,
      winner: null,
      playerHeroPowerUsed: false,
      enemyHeroPowerUsed: false,
      // Battle tracking for defeat analysis
      tracker: {
        playerDmgDealt: 0,
        playerDmgTaken: 0,
        playerCardsPlayed: 0,
        enemyCardsPlayed: 0,
        playerMinionsKilled: 0,
        enemyMinionsKilled: 0,
        peakEnemyField: 0,
        playerHealTotal: 0,
        unusedEnergy: 0, // total leftover energy across turns
      },
    };

    // 仙缘联动: 检查跨游戏奖励
    if (typeof CrossGameRewards !== 'undefined') {
      var cbRewards = CrossGameRewards.checkAndClaim('cardbattle');
      cbRewards.forEach(function(r) {
        if (r.reward.type === 'hp_bonus') { G.playerHP += r.reward.value; G.playerMaxHP += r.reward.value; }
        showToast('仙缘联动: ' + r.name, 'success');
      });
    }
    if (typeof CrossGameAchievements !== 'undefined') {
      var cbStats = Storage.get('cross_game_stats', {});
      CrossGameAchievements.trackStat('cardbattle_games', (cbStats.cardbattle_games || 0) + 1);
    }

    // Draw starting hands (3 each)
    for (let i = 0; i < 3; i++) {
      drawCard('player');
      drawCard('enemy');
    }

    // Start player's first turn
    startPlayerTurn();
  }

  function drawCard(who) {
    if (who === 'player') {
      if (G.playerDeck.length === 0) return false;
      if (G.playerHand.length >= 10) {
        // burn card
        G.playerDeck.shift();
        return false;
      }
      G.playerHand.push(G.playerDeck.shift());
      return true;
    } else {
      if (G.enemyDeck.length === 0) return false;
      if (G.enemyHand.length >= 10) {
        G.enemyDeck.shift();
        return false;
      }
      G.enemyHand.push(G.enemyDeck.shift());
      return true;
    }
  }

  function startPlayerTurn() {
    G.turn++;
    G.turnCount++;
    G.phase = 'player';
    animating = false;
    G.playerMaxEnergy = Math.min(10, G.playerMaxEnergy + 1);
    G.playerEnergy = G.playerMaxEnergy;
    G.playerHeroPowerUsed = false;
    drawCard('player');

    // Reset attack flags
    G.playerField.forEach(m => { m.canAttack = true; });

    clearSelection();
    render();
  }

  function startEnemyTurn() {
    G.phase = 'enemy';
    animating = true;
    // Track unused energy
    if (G.tracker) G.tracker.unusedEnergy += G.playerEnergy;
    G.enemyMaxEnergy = Math.min(10, G.enemyMaxEnergy + 1);
    G.enemyEnergy = G.enemyMaxEnergy;
    G.enemyHeroPowerUsed = false;
    drawCard('enemy');

    G.enemyField.forEach(m => { m.canAttack = true; });

    clearSelection();
    render();

    // AI plays after short delay
    setTimeout(() => runAI(), 600);
  }

  /* ===================== 卡牌打出 ===================== */

  function playMinionCard(card, handIdx, owner) {
    const field = owner === 'player' ? G.playerField : G.enemyField;
    if (field.length >= MAX_FIELD) return false;

    const energy = owner === 'player' ? G.playerEnergy : G.enemyEnergy;
    if (card.cost > energy) return false;

    // Spend energy
    if (owner === 'player') G.playerEnergy -= card.cost;
    else G.enemyEnergy -= card.cost;

    // Remove from hand
    const hand = owner === 'player' ? G.playerHand : G.enemyHand;
    hand.splice(handIdx, 1);

    // Create field minion
    const minion = {
      name: card.name,
      atk: card.atk,
      hp: card.hp,
      maxHp: card.hp,
      taunt: !!card.taunt,
      canAttack: !!card.charge, // charge: no summoning sickness
      charge: !!card.charge,
      divineShield: !!card.divineShield,
      deathrattle: card.deathrattle || null,
      battlecry: card.battlecry || null,
      owner: owner,
    };
    field.push(minion);

    // Track card played
    if (G && G.tracker) {
      if (owner === 'player') G.tracker.playerCardsPlayed++;
      else G.tracker.enemyCardsPlayed++;
    }

    // Execute battlecry
    if (minion.battlecry) {
      executeBattlecry(minion.battlecry, owner);
    }

    return true;
  }

  function executeBattlecry(cry, owner) {
    const enemyField = owner === 'player' ? G.enemyField : G.playerField;
    const enemyMaster = owner === 'player' ? 'enemy' : 'player';

    switch (cry) {
      case 'deal2random': {
        // Deal 2 damage to a random enemy minion
        const targets = enemyField.filter(m => m.hp > 0);
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          dealDamageToMinion(t, 2);
        }
        break;
      }
      case 'deal3random': {
        const targets = enemyField.filter(m => m.hp > 0);
        if (targets.length > 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          dealDamageToMinion(t, 3);
        }
        break;
      }
      case 'heal3': {
        if (owner === 'player') {
          G.playerHP = Math.min(G.playerMaxHP, G.playerHP + 3);
        } else {
          G.enemyHP = Math.min(G.enemyMaxHP, G.enemyHP + 3);
        }
        break;
      }
      case 'aoe3': {
        // Deal 3 damage to all enemy minions
        [...enemyField].forEach(m => dealDamageToMinion(m, 3));
        break;
      }
      case 'aoe2enemy': {
        // Deal 2 damage to all enemy minions
        [...enemyField].forEach(m => dealDamageToMinion(m, 2));
        break;
      }
      case 'deal5random': {
        // Deal 5 damage to a random enemy (minion or master)
        const targets = enemyField.filter(m => m.hp > 0);
        if (targets.length > 0 && Math.random() > 0.3) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          dealDamageToMinion(t, 5);
        } else {
          dealDamageToMaster(enemyMaster, 5);
        }
        break;
      }
      case 'heal5aoe3': {
        // Heal master 5 + deal 3 to all enemies
        if (owner === 'player') {
          G.playerHP = Math.min(G.playerMaxHP, G.playerHP + 5);
        } else {
          G.enemyHP = Math.min(G.enemyMaxHP, G.enemyHP + 5);
        }
        [...enemyField].forEach(m => dealDamageToMinion(m, 3));
        // Also deal 3 to enemy master
        dealDamageToMaster(enemyMaster, 3);
        break;
      }
      case 'summon_2_2': {
        const ff = owner === 'player' ? G.playerField : G.enemyField;
        if (ff.length < MAX_FIELD) {
          ff.push({ name: '灵兽', atk: 2, hp: 2, maxHp: 2, taunt: false, canAttack: false, owner });
        }
        break;
      }
    }
    removeDeadMinions();
  }

  function executeSpell(card, owner, targetMinion, targetMaster) {
    const enemyField = owner === 'player' ? G.enemyField : G.playerField;
    const friendlyField = owner === 'player' ? G.playerField : G.enemyField;

    switch (card.effect) {
      case 'deal3minion': {
        if (targetMinion) dealDamageToMinion(targetMinion, 3);
        break;
      }
      case 'aoe2': {
        [...enemyField].forEach(m => dealDamageToMinion(m, 2));
        break;
      }
      case 'aoe3spell': {
        [...enemyField].forEach(m => dealDamageToMinion(m, 3));
        break;
      }
      case 'heal5': {
        if (owner === 'player') {
          G.playerHP = Math.min(G.playerMaxHP, G.playerHP + 5);
        } else {
          G.enemyHP = Math.min(G.enemyMaxHP, G.enemyHP + 5);
        }
        break;
      }
      case 'deal6any': {
        if (targetMinion) {
          dealDamageToMinion(targetMinion, 6);
        } else if (targetMaster) {
          dealDamageToMaster(targetMaster, 6);
        }
        break;
      }
      case 'draw2': {
        drawCard(owner);
        drawCard(owner);
        break;
      }
      case 'aoe4': {
        [...enemyField].forEach(m => dealDamageToMinion(m, 4));
        break;
      }
      case 'draw1': {
        drawCard(owner);
        break;
      }
      case 'deal8any': {
        if (targetMinion) {
          dealDamageToMinion(targetMinion, 8);
        } else if (targetMaster) {
          dealDamageToMaster(targetMaster, 8);
        }
        break;
      }
      case 'heal8': {
        if (owner === 'player') {
          G.playerHP = Math.min(G.playerMaxHP, G.playerHP + 8);
        } else {
          G.enemyHP = Math.min(G.enemyMaxHP, G.enemyHP + 8);
        }
        break;
      }
      case 'killlow3': {
        if (targetMinion && targetMinion.atk <= 3) {
          targetMinion.hp = 0;
        }
        break;
      }
    }
    removeDeadMinions();
  }

  function spellNeedsTarget(effect) {
    return effect === 'deal3minion' || effect === 'deal6any' || effect === 'deal8any' || effect === 'killlow3';
  }

  function spellTargetType(effect) {
    // Returns what this spell can target
    if (effect === 'deal3minion') return 'enemy_minion'; // only enemy minions
    if (effect === 'deal6any' || effect === 'deal8any') return 'any'; // any target
    if (effect === 'killlow3') return 'any_minion'; // any minion
    return 'none';
  }

  /* ===================== 战斗系统 ===================== */

  function dealDamageToMinion(minion, dmg) {
    if (minion.divineShield && dmg > 0) {
      minion.divineShield = false;
      showDamageNumber(minion, 0, true); // blocked
      return;
    }
    minion.hp -= dmg;
    // Track damage
    if (G && G.tracker) {
      if (minion.owner === 'enemy' || (!minion.owner && G.enemyField.includes(minion))) {
        G.tracker.playerDmgDealt += dmg;
      } else {
        G.tracker.playerDmgTaken += dmg;
      }
    }
    showDamageNumber(minion, dmg);
  }

  function dealDamageToMaster(who, dmg) {
    if (who === 'player') {
      G.playerHP -= dmg;
      if (G.tracker) G.tracker.playerDmgTaken += dmg;
      showDamageNumberMaster('player', dmg);
    } else {
      G.enemyHP -= dmg;
      if (G.tracker) G.tracker.playerDmgDealt += dmg;
      showDamageNumberMaster('enemy', dmg);
    }
    checkGameOver();
  }

  function healMaster(who, amount) {
    if (who === 'player') {
      G.playerHP = Math.min(G.playerMaxHP, G.playerHP + amount);
    } else {
      G.enemyHP = Math.min(G.enemyMaxHP, G.enemyHP + amount);
    }
  }

  function removeDeadMinions() {
    // Collect deathrattles before removing
    const deadPlayer = G.playerField.filter(m => m.hp <= 0 && m.deathrattle);
    const deadEnemy = G.enemyField.filter(m => m.hp <= 0 && m.deathrattle);
    const deadPlayerCount = G.playerField.filter(m => m.hp <= 0).length;
    const deadEnemyCount = G.enemyField.filter(m => m.hp <= 0).length;
    G.playerField = G.playerField.filter(m => m.hp > 0);
    G.enemyField = G.enemyField.filter(m => m.hp > 0);
    // Track kills
    if (G.tracker) {
      G.tracker.playerMinionsKilled += deadEnemyCount;
      G.tracker.enemyMinionsKilled += deadPlayerCount;
      G.tracker.peakEnemyField = Math.max(G.tracker.peakEnemyField, G.enemyField.length);
    }
    // Execute deathrattles
    deadPlayer.forEach(m => executeDeathrattle(m.deathrattle, 'player'));
    deadEnemy.forEach(m => executeDeathrattle(m.deathrattle, 'enemy'));
  }

  function executeDeathrattle(dr, owner) {
    const friendlyField = owner === 'player' ? G.playerField : G.enemyField;
    const enemyField = owner === 'player' ? G.enemyField : G.playerField;
    switch (dr) {
      case 'summon_1_1': {
        if (friendlyField.length < MAX_FIELD) {
          friendlyField.push({ name: '灵魂', atk: 1, hp: 1, maxHp: 1, taunt: false, canAttack: false, owner });
        }
        break;
      }
      case 'deal2all_enemy': {
        enemyField.forEach(m => dealDamageToMinion(m, 2));
        break;
      }
      case 'heal3_master': {
        healMaster(owner, 3);
        break;
      }
      case 'draw1': {
        drawCard(owner);
        break;
      }
      case 'deal3all_enemy': {
        enemyField.forEach(m => dealDamageToMinion(m, 3));
        break;
      }
      case 'summon_3_3': {
        if (friendlyField.length < MAX_FIELD) {
          friendlyField.push({ name: '灵兽王子', atk: 3, hp: 3, maxHp: 3, taunt: false, canAttack: false, owner });
        }
        break;
      }
    }
  }

  function minionAttackTarget(attacker, attackerIdx, target, targetType) {
    // targetType: 'minion' or 'master'
    if (!attacker.canAttack) return;

    // Check taunt
    const enemyField = attacker.owner === 'player' ? G.enemyField : G.playerField;
    const hasTaunt = enemyField.some(m => m.taunt && m.hp > 0);
    if (hasTaunt && targetType === 'master') return; // must attack taunt
    if (hasTaunt && targetType === 'minion' && !target.taunt) return; // must attack taunt

    attacker.canAttack = false;

    if (targetType === 'minion') {
      // Both deal damage to each other
      const aDmg = attacker.atk;
      const tDmg = target.atk;
      dealDamageToMinion(target, aDmg);
      dealDamageToMinion(attacker, tDmg);
      removeDeadMinions();
    } else {
      // Attack master
      const who = attacker.owner === 'player' ? 'enemy' : 'player';
      dealDamageToMaster(who, attacker.atk);
    }

    checkGameOver();
  }

  function checkGameOver() {
    if (G.gameOver) return;
    if (G.playerHP <= 0) {
      G.gameOver = true;
      G.winner = 'enemy';
      G.phase = 'gameover';
      if (typeof SoundManager !== 'undefined') SoundManager.play('defeat');
      setTimeout(() => showResult(), 500);
    }
    if (G.enemyHP <= 0) {
      G.gameOver = true;
      G.winner = 'player';
      G.phase = 'gameover';
      if (typeof SoundManager !== 'undefined') SoundManager.play('success');
      setTimeout(() => showResult(), 500);
    }
  }

  /* ===================== AI逻辑 ===================== */

  function runAI() {
    if (G.gameOver || G.phase !== 'enemy') return;

    // AI: play cards, then hero power, then attack
    aiPlayCards(() => {
      if (G.gameOver) return;
      // AI uses hero power if available
      if (!G.enemyHeroPowerUsed && G.enemyEnergy >= 2) {
        useHeroPower('enemy');
        render();
      }
      aiAttack(() => {
        if (G.gameOver) return;
        // End enemy turn
        startPlayerTurn();
      });
    });
  }

  function aiPlayCards(callback) {
    // Play cards from hand, highest cost first (that we can afford), with delay between each
    const playOne = () => {
      if (G.gameOver || G.phase !== 'enemy') { callback(); return; }

      // Find playable cards sorted by cost descending
      let bestIdx = -1;
      let bestCost = -1;
      for (let i = 0; i < G.enemyHand.length; i++) {
        const c = G.enemyHand[i];
        if (c.cost <= G.enemyEnergy) {
          if (c.type === 'minion' && G.enemyField.length >= MAX_FIELD) continue;
          // AI skip target spells if no valid targets
          if (c.type === 'spell' && spellNeedsTarget(c.effect)) {
            const tt = spellTargetType(c.effect);
            if (tt === 'enemy_minion' && G.playerField.length === 0) continue;
            if (tt === 'any_minion' && G.playerField.length === 0 && G.enemyField.length === 0) continue;
            // 'any' always has a target (the player master)
          }
          if (c.cost > bestCost) {
            bestCost = c.cost;
            bestIdx = i;
          }
        }
      }

      if (bestIdx === -1) {
        callback();
        return;
      }

      const card = G.enemyHand[bestIdx];
      if (card.type === 'minion') {
        playMinionCard(card, bestIdx, 'enemy');
        removeDeadMinions();
        checkGameOver();
        render();
        setTimeout(playOne, 500);
      } else {
        // Spell
        G.enemyEnergy -= card.cost;
        G.enemyHand.splice(bestIdx, 1);
        if (G.tracker) G.tracker.enemyCardsPlayed++;
        // Determine target for targeted spells
        let targetMinion = null;
        let targetMaster = null;
        if (spellNeedsTarget(card.effect)) {
          const tt = spellTargetType(card.effect);
          if (tt === 'enemy_minion') {
            // Target lowest HP player minion
            const sorted = [...G.playerField].filter(m => m.hp > 0).sort((a, b) => a.hp - b.hp);
            targetMinion = sorted[0] || null;
          } else if (tt === 'any') {
            // Prefer killing a minion if possible, else hit master
            const killable = G.playerField.filter(m => m.hp <= 6 && m.hp > 0).sort((a, b) => b.atk - a.atk);
            if (killable.length > 0) {
              targetMinion = killable[0];
            } else {
              targetMaster = 'player';
            }
          } else if (tt === 'any_minion') {
            // Target highest ATK player minion that qualifies
            const sorted = [...G.playerField].filter(m => m.hp > 0 && m.atk <= 3).sort((a, b) => b.atk - a.atk);
            targetMinion = sorted[0] || null;
          }
        }
        executeSpell(card, 'enemy', targetMinion, targetMaster);
        checkGameOver();
        render();
        setTimeout(playOne, 500);
      }
    };
    playOne();
  }

  function aiAttack(callback) {
    // Collect references to minions that can attack (snapshot before attacks begin)
    const attackers = G.enemyField.filter(m => m.canAttack && m.hp > 0);

    // Calculate total possible face damage from all attackers for lethal check
    const playerHasTauntGlobal = G.playerField.some(t => t.taunt && t.hp > 0);
    const totalFaceDamage = playerHasTauntGlobal ? 0 : attackers.reduce((sum, m) => sum + m.atk, 0);
    const goFaceForLethal = !playerHasTauntGlobal && totalFaceDamage >= G.playerHP;

    let i = 0;

    const attackOne = () => {
      if (G.gameOver || G.phase !== 'enemy') { callback(); return; }
      if (i >= attackers.length) { callback(); return; }

      const m = attackers[i];
      i++;
      // Minion may have died from earlier counter-damage
      if (!m || m.hp <= 0) {
        attackOne();
        return;
      }

      // Determine target
      const playerHasTaunt = G.playerField.some(t => t.taunt && t.hp > 0);
      let target = null;
      let targetType = 'master';

      if (playerHasTaunt) {
        // Must attack taunt
        const taunts = G.playerField.filter(t => t.taunt && t.hp > 0);
        target = taunts.sort((a, b) => a.hp - b.hp)[0];
        targetType = 'minion';
      } else if (goFaceForLethal) {
        // Total damage from all attackers can kill the player — go face for lethal
        targetType = 'master';
      } else if (G.playerField.length > 0) {
        // Prioritize low-HP minions, then master if advantageous
        const sorted = [...G.playerField].filter(t => t.hp > 0).sort((a, b) => a.hp - b.hp);
        // If there's a minion we can kill, kill it
        const killable = sorted.filter(t => t.hp <= m.atk);
        if (killable.length > 0) {
          // Pick the one with highest attack among killable
          target = killable.sort((a, b) => b.atk - a.atk)[0];
          targetType = 'minion';
        } else if (sorted.length > 0 && Math.random() > 0.4) {
          target = sorted[0];
          targetType = 'minion';
        } else {
          targetType = 'master';
        }
      }

      m.canAttack = false;
      if (targetType === 'minion' && target) {
        const aDmg = m.atk;
        const tDmg = target.atk;
        dealDamageToMinion(target, aDmg);
        dealDamageToMinion(m, tDmg);
        removeDeadMinions();
      } else {
        dealDamageToMaster('player', m.atk);
      }
      checkGameOver();
      render();
      setTimeout(attackOne, 400);
    };
    attackOne();
  }

  /* ===================== UI渲染 ===================== */

  const $start = document.getElementById('cb-start');
  const $battle = document.getElementById('cb-battle');
  const $result = document.getElementById('cb-result');
  const $collection = document.getElementById('cb-collection');

  // Battle elements
  const $enemyName = document.getElementById('enemy-name');
  const $enemyHPFill = document.getElementById('enemy-hp-fill');
  const $enemyHPText = document.getElementById('enemy-hp-text');
  const $enemyField = document.getElementById('enemy-field');
  const $enemyDeckCount = document.getElementById('enemy-deck-count');
  const $enemyHandCount = document.getElementById('enemy-hand-count');
  const $playerHPFill = document.getElementById('player-hp-fill');
  const $playerHPText = document.getElementById('player-hp-text');
  const $playerField = document.getElementById('player-field');
  const $playerHand = document.getElementById('player-hand');
  const $playerDeckCount = document.getElementById('player-deck-count');
  const $energyText = document.getElementById('energy-text');
  const $turnIndicator = document.getElementById('turn-indicator');
  const $endTurnBtn = document.getElementById('btn-end-turn');
  const $targetHint = document.getElementById('target-hint');
  const $enemyMaster = document.getElementById('enemy-master');
  const $playerMaster = document.getElementById('player-master');
  const $enemyPortrait = document.querySelector('.cb-enemy-master .cb-master-portrait');
  const $diffBtns = document.querySelectorAll('.cb-diff-btn');

  function render() {
    if (!G) return;
    renderMasters();
    renderField('enemy');
    renderField('player');
    renderHand();
    renderEnergy();
    renderTurnIndicator();
    renderDeckInfo();
  }

  function renderMasters() {
    // Enemy
    $enemyName.textContent = G.enemyName;
    $enemyPortrait.textContent = G.enemyPortrait;
    const ePct = Math.max(0, G.enemyHP / G.enemyMaxHP * 100);
    $enemyHPFill.style.width = ePct + '%';
    $enemyHPText.textContent = Math.max(0, G.enemyHP) + '/' + G.enemyMaxHP;

    // Player
    const pPct = Math.max(0, G.playerHP / G.playerMaxHP * 100);
    $playerHPFill.style.width = pPct + '%';
    $playerHPText.textContent = Math.max(0, G.playerHP) + '/' + G.playerMaxHP;

    // Targetable states
    $enemyMaster.classList.remove('targetable');
    if (selectedMinion !== null && G.phase === 'player') {
      // Check if enemy master is a valid target (no taunt)
      const hasTaunt = G.enemyField.some(m => m.taunt && m.hp > 0);
      if (!hasTaunt) {
        $enemyMaster.classList.add('targetable');
      }
    }
    if (pendingSpell && spellTargetType(pendingSpell.effect) === 'any') {
      $enemyMaster.classList.add('targetable');
    }
    if (pendingSpell && spellTargetType(pendingSpell.effect) === 'any_minion') {
      // No master targeting for any_minion
    }
  }

  function renderField(who) {
    const field = who === 'player' ? G.playerField : G.enemyField;
    const $field = who === 'player' ? $playerField : $enemyField;
    $field.innerHTML = '';

    field.forEach((m, idx) => {
      const div = document.createElement('div');
      div.className = 'cb-minion';
      if (who === 'enemy') div.classList.add('enemy-minion');
      if (m.taunt) div.classList.add('has-taunt');
      if (m.divineShield) div.classList.add('has-divine-shield');

      // Player minions: show can-attack / sleeping
      if (who === 'player' && G.phase === 'player') {
        if (m.canAttack) {
          div.classList.add('can-attack');
        } else {
          div.classList.add('sleeping');
        }
        if (selectedMinion === idx) {
          div.classList.add('selected');
        }
      }

      // Enemy minions: targetable when player is selecting attack target
      if (who === 'enemy' && selectedMinion !== null && G.phase === 'player') {
        const hasTaunt = G.enemyField.some(em => em.taunt && em.hp > 0);
        if (!hasTaunt || m.taunt) {
          div.classList.add('targetable');
        }
      }

      // Spell targeting
      if (pendingSpell) {
        const tt = spellTargetType(pendingSpell.effect);
        if (tt === 'enemy_minion' && who === 'enemy') {
          div.classList.add('targetable');
        }
        if (tt === 'any') {
          div.classList.add('targetable');
        }
      }

      const isDamaged = m.hp < m.maxHp;
      const drIcon = m.deathrattle ? '<div style="position:absolute;top:2px;left:2px;font-size:0.55rem">💀</div>' : '';
      div.innerHTML = `
        ${drIcon}
        <div class="cb-minion-art">${getArt(m)}</div>
        <div class="cb-minion-name">${m.name}</div>
        <div class="cb-minion-atk">${m.atk}</div>
        <div class="cb-minion-hp ${isDamaged ? 'damaged' : ''}">${m.hp}</div>
      `;

      // Click handlers
      if (who === 'player' && G.phase === 'player') {
        div.addEventListener('click', () => onPlayerMinionClick(idx));
      }
      if (who === 'enemy') {
        div.addEventListener('click', () => onEnemyMinionClick(idx));
      }

      $field.appendChild(div);
    });

    // Empty field placeholder
    if (field.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color: var(--text-muted); font-size: 0.8rem; opacity: 0.5;';
      empty.textContent = who === 'player' ? '你的战场' : '对手战场';
      $field.appendChild(empty);
    }
  }

  function renderHand() {
    $playerHand.innerHTML = '';
    G.playerHand.forEach((card, idx) => {
      const div = document.createElement('div');
      const isSpell = card.type === 'spell';
      const canPlay = card.cost <= G.playerEnergy && G.phase === 'player'
        && (isSpell || G.playerField.length < MAX_FIELD);

      div.className = 'cb-card' + (isSpell ? ' spell-card' : '');
      if (canPlay && !animating) div.classList.add('playable');
      else div.classList.add('unplayable');

      let statsHTML = '';
      if (!isSpell) {
        statsHTML = `
          <div class="cb-card-stats">
            <span class="cb-card-atk">⚔ ${card.atk}</span>
            <span class="cb-card-hp">❤ ${card.hp}</span>
          </div>`;
      }

      let descText = '';
      if (isSpell && card.desc) {
        descText = card.desc;
      } else {
        const parts = [];
        if (card.charge) parts.push('冲锋');
        if (card.divineShield) parts.push('圣盾');
        if (card.taunt) parts.push('嘲讽');
        if (card.battlecry) parts.push(getBattlecryDesc(card.battlecry));
        if (card.deathrattle) parts.push(getDeathrattleDesc(card.deathrattle));
        descText = parts.join(' ');
      }

      div.innerHTML = `
        <div class="cb-card-cost">${card.cost}</div>
        <div class="cb-card-art">${getArt(card)}</div>
        <div class="cb-card-name">${card.name}</div>
        <div class="cb-card-desc">${descText}</div>
        ${statsHTML}
      `;

      if (canPlay && !animating) {
        div.addEventListener('click', () => onHandCardClick(idx));
      }

      $playerHand.appendChild(div);
    });
  }

  function getBattlecryDesc(cry) {
    const map = {
      'deal2random': '战吼: 对随机敌方随从造成2点伤害',
      'deal3random': '战吼: 对随机敌方随从造成3点伤害',
      'heal3': '战吼: 为主人恢复3点生命',
      'aoe3': '战吼: 对所有敌方随从造成3点伤害',
      'aoe2enemy': '战吼: 对所有敌方随从造成2点伤害',
      'deal5random': '战吼: 对随机敌人造成5点伤害',
      'heal5aoe3': '战吼: 恢复5点生命，对所有敌人造成3点伤害',
    };
    return map[cry] || '';
  }

  function getDeathrattleDesc(dr) {
    const map = {
      'summon_1_1': '亡语: 召唤一个1/1灵魂',
      'deal2all_enemy': '亡语: 对所有敌方随从造成2点伤害',
      'heal3_master': '亡语: 为主人恢复3点生命',
      'draw1': '亡语: 抽一张牌',
    };
    return map[dr] || '';
  }

  function renderEnergy() {
    $energyText.textContent = G.playerEnergy + '/' + G.playerMaxEnergy;
    // Update hero power button state
    const $hp = document.getElementById('btn-hero-power');
    if ($hp) {
      const canUse = G.phase === 'player' && !G.playerHeroPowerUsed && G.playerEnergy >= 2 && !G.gameOver;
      $hp.disabled = !canUse;
      $hp.style.opacity = canUse ? '1' : '0.4';
    }
  }

  /** Hero power: deal 2 damage to any target (minion or enemy master) */
  function useHeroPower(owner) {
    const HERO_POWER_COST = 2;
    if (owner === 'player') {
      if (G.playerHeroPowerUsed || G.playerEnergy < HERO_POWER_COST) return false;
      G.playerEnergy -= HERO_POWER_COST;
      G.playerHeroPowerUsed = true;
      // Deal 2 damage to random enemy minion or enemy master
      if (G.enemyField.length > 0 && Math.random() < 0.6) {
        const t = G.enemyField[Math.floor(Math.random() * G.enemyField.length)];
        dealDamageToMinion(t, 2);
        removeDeadMinions();
      } else {
        dealDamageToMaster('enemy', 2);
      }
    } else {
      if (G.enemyHeroPowerUsed || G.enemyEnergy < HERO_POWER_COST) return false;
      G.enemyEnergy -= HERO_POWER_COST;
      G.enemyHeroPowerUsed = true;
      // AI: deal 2 to player minion or player master
      if (G.playerField.length > 0 && Math.random() < 0.6) {
        const t = G.playerField[Math.floor(Math.random() * G.playerField.length)];
        dealDamageToMinion(t, 2);
        removeDeadMinions();
      } else {
        dealDamageToMaster('player', 2);
      }
    }
    return true;
  }

  function renderTurnIndicator() {
    if (G.phase === 'player') {
      $turnIndicator.textContent = '你的回合';
      $turnIndicator.classList.remove('enemy-turn');
      $endTurnBtn.disabled = false;
    } else if (G.phase === 'enemy') {
      $turnIndicator.textContent = '对手回合';
      $turnIndicator.classList.add('enemy-turn');
      $endTurnBtn.disabled = true;
    } else {
      $turnIndicator.textContent = G.winner === 'player' ? '胜利！' : '战败...';
      $endTurnBtn.disabled = true;
    }
  }

  function renderDeckInfo() {
    $enemyDeckCount.textContent = '牌库: ' + G.enemyDeck.length;
    $enemyHandCount.textContent = '手牌: ' + G.enemyHand.length;
    $playerDeckCount.textContent = '牌库: ' + G.playerDeck.length;
  }

  /* ===================== 交互处理 ===================== */

  function clearSelection() {
    selectedMinion = null;
    pendingSpell = null;
    pendingSpellHandIdx = null;
    $targetHint.style.display = 'none';
    $enemyMaster.classList.remove('targetable');
    document.body.classList.remove('cb-spell-target-mode');
  }

  function onHandCardClick(idx) {
    if (G.phase !== 'player' || animating || G.gameOver) return;
    clearSelection();

    const card = G.playerHand[idx];
    if (card.cost > G.playerEnergy) return;

    if (card.type === 'minion') {
      if (G.playerField.length >= MAX_FIELD) {
        showToast('战场已满（最多6个随从）', 'error');
        return;
      }
      animating = true;
      playMinionCard(card, idx, 'player');
      removeDeadMinions();
      checkGameOver();
      animating = false;
      render();
    } else {
      // Spell card
      if (spellNeedsTarget(card.effect)) {
        // Need target selection
        const tt = spellTargetType(card.effect);
        if (tt === 'enemy_minion' && G.enemyField.length === 0) {
          showToast('没有可用目标', 'error');
          return;
        }
        if (tt === 'any_minion' && G.enemyField.length === 0 && G.playerField.length === 0) {
          showToast('没有可用目标', 'error');
          return;
        }
        pendingSpell = card;
        pendingSpellHandIdx = idx;
        $targetHint.style.display = 'flex';
        document.body.classList.add('cb-spell-target-mode');
        render();
      } else {
        // No target needed, play immediately
        animating = true;
        G.playerEnergy -= card.cost;
        G.playerHand.splice(idx, 1);
        if (G.tracker) G.tracker.playerCardsPlayed++;
        executeSpell(card, 'player', null, null);
        checkGameOver();
        animating = false;
        render();
      }
    }
  }

  function onPlayerMinionClick(idx) {
    if (G.phase !== 'player' || animating || G.gameOver) return;

    if (pendingSpell) {
      // If spell targets 'any', player minions are also valid
      const tt = spellTargetType(pendingSpell.effect);
      if (tt === 'any') {
        // Target this friendly minion (rare case, but deal6any can target anything)
        const card = pendingSpell;
        animating = true;
        G.playerEnergy -= card.cost;
        G.playerHand.splice(pendingSpellHandIdx, 1);
        if (G.tracker) G.tracker.playerCardsPlayed++;
        executeSpell(card, 'player', G.playerField[idx], null);
        clearSelection();
        checkGameOver();
        animating = false;
        render();
        return;
      }
      return;
    }

    const m = G.playerField[idx];
    if (!m.canAttack) return;

    if (selectedMinion === idx) {
      // Deselect
      clearSelection();
      render();
      return;
    }

    selectedMinion = idx;
    $targetHint.style.display = 'flex';
    render();
  }

  function onEnemyMinionClick(idx) {
    if (G.phase !== 'player' || animating || G.gameOver) return;

    if (pendingSpell) {
      // Target for spell
      const card = pendingSpell;
      const tt = spellTargetType(card.effect);
      if (tt === 'enemy_minion' || tt === 'any' || tt === 'any_minion') {
        animating = true;
        G.playerEnergy -= card.cost;
        G.playerHand.splice(pendingSpellHandIdx, 1);
        if (G.tracker) G.tracker.playerCardsPlayed++;
        executeSpell(card, 'player', G.enemyField[idx], null);
        clearSelection();
        checkGameOver();
        animating = false;
        render();
      }
      return;
    }

    if (selectedMinion === null) return;

    const attacker = G.playerField[selectedMinion];
    if (!attacker || !attacker.canAttack) { clearSelection(); render(); return; }

    const target = G.enemyField[idx];
    const hasTaunt = G.enemyField.some(m => m.taunt && m.hp > 0);

    if (hasTaunt && !target.taunt) {
      showToast('必须先攻击嘲讽随从！', 'error');
      return;
    }

    minionAttackTarget(attacker, selectedMinion, target, 'minion');
    clearSelection();
    render();
  }

  // Click enemy master to attack
  $enemyMaster.addEventListener('click', () => {
    if (G.phase !== 'player' || animating || G.gameOver) return;

    if (pendingSpell) {
      const card = pendingSpell;
      const tt = spellTargetType(card.effect);
      if (tt === 'any') {
        animating = true;
        G.playerEnergy -= card.cost;
        G.playerHand.splice(pendingSpellHandIdx, 1);
        if (G.tracker) G.tracker.playerCardsPlayed++;
        executeSpell(card, 'player', null, 'enemy');
        clearSelection();
        checkGameOver();
        animating = false;
        render();
      }
      return;
    }

    if (selectedMinion === null) return;

    const attacker = G.playerField[selectedMinion];
    if (!attacker || !attacker.canAttack) { clearSelection(); render(); return; }

    const hasTaunt = G.enemyField.some(m => m.taunt && m.hp > 0);
    if (hasTaunt) {
      showToast('必须先攻击嘲讽随从！', 'error');
      return;
    }

    minionAttackTarget(attacker, selectedMinion, null, 'master');
    clearSelection();
    render();
  });

  // End turn button
  $endTurnBtn.addEventListener('click', () => {
    if (G.phase !== 'player' || G.gameOver) return;
    clearSelection();
    startEnemyTurn();
  });

  // Hero power button
  document.getElementById('btn-hero-power').addEventListener('click', () => {
    if (!G || G.phase !== 'player' || G.gameOver || animating) return;
    if (useHeroPower('player')) {
      clearSelection();
      render();
    }
  });

  // Cancel button
  document.getElementById('btn-cancel').addEventListener('click', () => {
    clearSelection();
    render();
  });

  /* ===================== 伤害数字动画 ===================== */

  function showDamageNumber(minion, dmg, blocked) {
    // Capture the DOM element reference immediately, before render() may re-render the DOM
    const field = minion.owner === 'player' ? $playerField : $enemyField;
    const allMinions = field.querySelectorAll('.cb-minion');
    const fieldArr = minion.owner === 'player' ? G.playerField : G.enemyField;
    const idx = fieldArr.indexOf(minion);
    const el = allMinions[idx];
    if (!el) return;

    setTimeout(() => {
      const num = document.createElement('div');
      num.className = 'cb-damage-number';
      if (blocked) {
        num.textContent = '圣盾！';
        num.style.color = '#ffd700';
        num.style.textShadow = '0 0 8px rgba(255,215,0,0.6), 0 2px 4px rgba(0,0,0,0.8)';
      } else {
        num.textContent = '-' + dmg;
      }
      el.style.position = 'relative';
      el.appendChild(num);
      setTimeout(() => num.remove(), 1000);
    }, 50);
  }

  function showDamageNumberMaster(who, dmg) {
    setTimeout(() => {
      const el = who === 'player' ? $playerMaster : $enemyMaster;
      const num = document.createElement('div');
      num.className = 'cb-damage-number';
      num.textContent = '-' + dmg;
      el.style.position = 'relative';
      el.appendChild(num);
      setTimeout(() => num.remove(), 1000);
    }, 50);
  }

  /* ===================== 结果界面 ===================== */

  function showResult() {
    // Arena mode handling
    if (G && G.isArena) { showArenaResult(); return; }
    const won = G.winner === 'player';
    const diffMul = (G.diff + 1) * 1000;
    const hpBonus = won ? Math.max(0, G.playerHP) * 10 : 0;
    const turnBonus = G.turnCount * 5;
    const score = won ? diffMul + hpBonus + turnBonus : Math.floor(turnBonus / 2);

    // Save score
    updateLeaderboard('cardbattle', score);

    // Achievement tracking
    if (typeof CrossGameAchievements !== 'undefined') {
      CrossGameAchievements.trackStat('games_played_cardbattle', true);
      if (won && G.diff === 2) {
        CrossGameAchievements.trackStat('cardbattle_cleared', true);
      }
      CrossGameAchievements.checkNew();
    }

    // Unlock next difficulty
    if (won) {
      const unlocked = Storage.get('cardbattle_unlocked', 0);
      if (G.diff >= unlocked) {
        Storage.set('cardbattle_unlocked', Math.min(2, G.diff + 1));
      }
    }

    // Card reward on victory
    let rewardCard = null;
    if (won) {
      rewardCard = grantRandomCard();
    }

    // Show result screen
    $battle.style.display = 'none';
    $result.style.display = '';

    const $title = document.getElementById('result-title');
    $title.textContent = won ? '胜利！' : '战败...';
    $title.className = 'cb-result-title ' + (won ? 'win' : 'lose');

    const $stats = document.getElementById('result-stats');
    // Defeat analysis tips
    let analysisHtml = '';
    if (!won && G.tracker) {
      const t = G.tracker;
      const tips = [];
      // Analyze what went wrong
      if (t.unusedEnergy > G.turnCount * 1.5) {
        tips.push('灵力浪费较多 — 尝试每回合用尽灵力，减少空转回合');
      }
      if (t.playerCardsPlayed < t.enemyCardsPlayed * 0.7) {
        tips.push('出牌数不足 — 考虑加入更多低费卡牌，提高出牌效率');
      }
      if (t.playerMinionsKilled < t.enemyMinionsKilled) {
        tips.push('场面交换不利 — 优先用法术清除高威胁随从，保护己方场面');
      }
      if (t.peakEnemyField >= 5) {
        tips.push('对手铺场过多 — 考虑加入AOE法术（金光咒/烈焰风暴）清场');
      }
      if (t.playerDmgTaken > 40 && t.playerHealTotal < 5) {
        tips.push('缺少回复手段 — 加入回春术或丹修弟子来维持血量');
      }
      if (tips.length === 0) {
        tips.push('实力接近！再试一次，注意场面控制和灵力管理');
      }
      const encourageText = typeof getEncouragement === 'function' ? getEncouragement() : '';
      analysisHtml = `
        <div style="margin-top:12px;padding:10px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;text-align:left">
          <div style="font-size:0.85rem;color:var(--red-light);font-weight:bold;margin-bottom:6px">败局分析${G.enemyArchetype ? ' (对手: ' + G.enemyArchetype + ')' : ''}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px">
            <span>造成伤害: ${t.playerDmgDealt}</span>
            <span>承受伤害: ${t.playerDmgTaken}</span>
            <span>出牌数: ${t.playerCardsPlayed}</span>
            <span>对手出牌: ${t.enemyCardsPlayed}</span>
            <span>击杀随从: ${t.playerMinionsKilled}</span>
            <span>损失随从: ${t.enemyMinionsKilled}</span>
            <span>浪费灵力: ${t.unusedEnergy}</span>
          </div>
          <div style="font-size:0.8rem;color:var(--cyan)">
            ${tips.map(tip => '<div style="margin-bottom:3px">💡 ' + tip + '</div>').join('')}
          </div>
          ${encourageText ? `<div style="text-align:center;font-size:0.8rem;color:var(--gold);font-style:italic;margin-top:8px">${encourageText}</div>` : ''}
        </div>`;
    }
    $stats.innerHTML = `
      <div class="cb-result-stat">
        <span class="stat-label">难度</span>
        <span class="stat-value">${DIFF_NAMES[G.diff]}</span>
      </div>
      <div class="cb-result-stat">
        <span class="stat-label">结果</span>
        <span class="stat-value">${won ? '胜利' : '战败'}</span>
      </div>
      <div class="cb-result-stat">
        <span class="stat-label">回合数</span>
        <span class="stat-value">${G.turnCount}</span>
      </div>
      ${won ? `<div class="cb-result-stat">
        <span class="stat-label">剩余生命</span>
        <span class="stat-value">${G.playerHP}</span>
      </div>` : ''}
      <div class="cb-result-stat">
        <span class="stat-label">得分</span>
        <span class="stat-value" style="color: var(--gold); font-size: 1.2rem;">${score}</span>
      </div>
      ${rewardCard ? `<div class="cb-result-stat">
        <span class="stat-label">获得卡牌</span>
        <span class="stat-value" style="color: var(--cyan);">${getArt(rewardCard)} ${rewardCard.name}</span>
      </div>` : (won ? `<div class="cb-result-stat"><span class="stat-label">卡牌</span><span class="stat-value" style="color:var(--text-muted)">收藏已满</span></div>` : '')}
      ${analysisHtml}
    `;
  }

  /* ===================== 界面切换 ===================== */

  function showStart() {
    $start.style.display = '';
    $battle.style.display = 'none';
    $result.style.display = 'none';
    $collection.style.display = 'none';
    G = null;
    animating = false;
    clearSelection();
    renderLeaderboard();
    renderDiffButtons();
  }

  function showBattle() {
    $start.style.display = 'none';
    $battle.style.display = '';
    $result.style.display = 'none';
  }

  function renderDiffButtons() {
    const unlocked = Storage.get('cardbattle_unlocked', 0);
    $diffBtns.forEach(btn => {
      const d = parseInt(btn.dataset.diff);
      if (d <= unlocked) {
        btn.classList.remove('locked');
      } else {
        btn.classList.add('locked');
      }
    });
  }

  function renderLeaderboard() {
    const board = getLeaderboard('cardbattle');
    const $lb = document.getElementById('cb-leaderboard');
    if (board.length === 0) {
      $lb.innerHTML = '<h3>历史战绩</h3><div class="cb-lb-empty">暂无记录，开始你的第一场对决吧！</div>';
      return;
    }
    const items = board.slice(0, 5).map((entry, i) => {
      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString('zh-CN');
      return `<li><span class="lb-rank">#${i + 1}</span><span>${escapeHtml(dateStr)}</span><span class="lb-score">${escapeHtml(String(entry.score))}</span></li>`;
    }).join('');
    $lb.innerHTML = `<h3>历史战绩</h3><ul class="cb-lb-list">${items}</ul>`;
  }

  /* ===================== 事件绑定 ===================== */

  // Difficulty buttons
  $diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('locked')) return;
      const diff = parseInt(btn.dataset.diff);
      newGame(diff);
      showBattle();
      render();
    });
  });

  // Result buttons
  document.getElementById('btn-retry').addEventListener('click', () => {
    const lastDiff = G ? G.diff : 0;
    newGame(lastDiff);
    showBattle();
    render();
  });

  document.getElementById('btn-back-menu').addEventListener('click', () => {
    showStart();
  });

  /* ===================== 收藏/组牌系统 ===================== */

  let deckBuildState = null; // {cards:[], name:''}

  function showCollection() {
    $start.style.display = 'none';
    $battle.style.display = 'none';
    $result.style.display = 'none';
    $collection.style.display = '';
    renderCollection();
  }

  function renderCollection() {
    const col = getCollection();
    const total = Object.values(col).reduce((s, v) => s + v, 0);
    const maxTotal = CARD_CATALOG.reduce((s, c) => s + c.maxCopy, 0);
    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h2 style="font-family:var(--font-display);color:var(--gold);margin:0">卡牌收藏</h2>
      <span style="color:var(--text-muted);font-size:0.85rem">${total}/${maxTotal} 张</span>
      <button class="btn btn-outline btn-sm" id="col-back">返回</button>
    </div>`;
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">';
    CARD_CATALOG.forEach(cat => {
      const owned = col[cat.id] || 0;
      const locked = owned === 0;
      const art = getArt(cat);
      const border = cat.type === 'spell' ? 'rgba(154,106,212,0.4)' : 'var(--border-color)';
      const bg = cat.type === 'spell' ? 'linear-gradient(180deg,#2a1e42,#1e1635)' : 'linear-gradient(180deg,#1e2a42,#162035)';
      html += `<div style="width:95px;min-width:95px;height:130px;background:${bg};border:2px solid ${locked?'rgba(100,100,100,0.3)':border};border-radius:10px;display:flex;flex-direction:column;align-items:center;position:relative;overflow:hidden;${locked?'opacity:0.4':''}">
        <div style="position:absolute;top:4px;left:4px;width:22px;height:22px;border-radius:50%;background:${cat.type==='spell'?'linear-gradient(135deg,#6a2ad4,#9a5af0)':'linear-gradient(135deg,#2a5ad4,#4a8af0)'};color:#fff;font-size:0.8rem;font-weight:bold;display:flex;align-items:center;justify-content:center">${cat.cost}</div>
        <div style="font-size:1.8rem;margin-top:20px">${art}</div>
        <div style="font-size:0.65rem;color:var(--text-primary);text-align:center;padding:2px 4px;margin-top:4px">${cat.name}</div>
        ${cat.type==='minion'?`<div style="display:flex;justify-content:space-between;width:100%;padding:0 8px;font-size:0.75rem;font-weight:bold;margin-top:auto;padding-bottom:6px"><span style="color:#f0c040">⚔${cat.atk}</span><span style="color:#f06060">❤${cat.hp}</span></div>`:'<div style="font-size:0.5rem;color:var(--text-muted);padding:0 6px;text-align:center;margin-top:2px;flex:1">'+(cat.desc||'')+'</div>'}
        <div style="position:absolute;top:4px;right:4px;font-size:0.65rem;color:${owned>=cat.maxCopy?'var(--green)':'var(--text-muted)'}">${owned}/${cat.maxCopy}</div>
      </div>`;
    });
    html += '</div>';
    $collection.innerHTML = html;
    document.getElementById('col-back').addEventListener('click', showStart);
  }

  function showDeckBuilder() {
    $start.style.display = 'none';
    $collection.style.display = '';
    const decks = getDecks();
    const activeIdx = getActiveDeckIdx();
    renderDeckList(decks, activeIdx);
  }

  function renderDeckList(decks, activeIdx) {
    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h2 style="font-family:var(--font-display);color:var(--gold);margin:0">套牌管理</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-gold btn-sm" id="deck-new">新建套牌</button>
        <button class="btn btn-outline btn-sm" id="deck-back">返回</button>
      </div>
    </div>`;

    // Default deck option
    html += `<div style="background:var(--bg-card);border:2px solid ${activeIdx===-1?'var(--gold)':'var(--border-color)'};border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer" class="deck-select" data-idx="-1">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text-primary);font-weight:bold">默认牌组</span>
        <span style="font-size:0.8rem;color:${activeIdx===-1?'var(--gold)':'var(--text-muted)'}">${activeIdx===-1?'使用中':'点击使用'}</span>
      </div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">30张初始卡牌</div>
    </div>`;

    decks.forEach((d, i) => {
      html += `<div style="background:var(--bg-card);border:2px solid ${activeIdx===i?'var(--gold)':'var(--border-color)'};border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer" class="deck-select" data-idx="${i}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="color:var(--text-primary);font-weight:bold">${escapeHtml(d.name)}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:0.8rem;color:${d.cards.length===30?'var(--green)':'var(--red)'}">${d.cards.length}/30</span>
            <span style="font-size:0.8rem;color:${activeIdx===i?'var(--gold)':'var(--text-muted)'}">${activeIdx===i?'使用中':'点击使用'}</span>
            <button class="btn btn-outline btn-sm deck-edit" data-idx="${i}" style="font-size:0.7rem;padding:2px 6px">编辑</button>
            <button class="btn btn-outline btn-sm deck-del" data-idx="${i}" style="font-size:0.7rem;padding:2px 6px;color:var(--red)">删</button>
          </div>
        </div>
      </div>`;
    });

    $collection.innerHTML = html;
    document.getElementById('deck-back').addEventListener('click', showStart);
    document.getElementById('deck-new').addEventListener('click', () => {
      const name = prompt('套牌名称:', '自定义套牌 ' + (decks.length + 1));
      if (!name) return;
      decks.push({ name, cards: [] });
      saveDecks(decks);
      renderDeckEditor(decks.length - 1);
    });
    $collection.querySelectorAll('.deck-select').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.deck-edit') || e.target.closest('.deck-del')) return;
        const idx = parseInt(el.dataset.idx);
        if (idx >= 0 && decks[idx].cards.length !== 30) {
          showToast('套牌需要恰好30张牌', 'error');
          return;
        }
        setActiveDeckIdx(idx);
        renderDeckList(decks, idx);
        showToast(idx === -1 ? '切换为默认牌组' : '切换为 ' + decks[idx].name, 'success');
      });
    });
    $collection.querySelectorAll('.deck-edit').forEach(btn => {
      btn.addEventListener('click', () => renderDeckEditor(parseInt(btn.dataset.idx)));
    });
    $collection.querySelectorAll('.deck-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (!confirm('删除套牌 "' + decks[idx].name + '"？')) return;
        decks.splice(idx, 1);
        saveDecks(decks);
        if (activeIdx === idx) setActiveDeckIdx(-1);
        else if (activeIdx > idx) setActiveDeckIdx(activeIdx - 1);
        renderDeckList(decks, getActiveDeckIdx());
      });
    });
  }

  function renderDeckEditor(deckIdx) {
    const decks = getDecks();
    const deck = decks[deckIdx];
    if (!deck) return;
    const col = getCollection();
    // Count cards in deck by id
    const deckCount = {};
    deck.cards.forEach(id => { deckCount[id] = (deckCount[id] || 0) + 1; });

    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <h2 style="font-family:var(--font-display);color:var(--gold);margin:0">编辑: ${escapeHtml(deck.name)}</h2>
      <span style="color:${deck.cards.length===30?'var(--green)':'var(--red)'}; font-weight:bold">${deck.cards.length}/30</span>
      <button class="btn btn-outline btn-sm" id="de-back">完成</button>
    </div>`;

    // Deck contents
    html += '<div style="margin-bottom:12px"><div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:6px">当前套牌:</div>';
    if (deck.cards.length === 0) {
      html += '<div style="color:var(--text-muted);text-align:center;padding:8px">空套牌 - 从下方添加卡牌</div>';
    } else {
      // Group by card id
      const grouped = {};
      deck.cards.forEach(id => { grouped[id] = (grouped[id] || 0) + 1; });
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      Object.entries(grouped).sort((a, b) => {
        const ca = CARD_CATALOG_MAP[a[0]], cb = CARD_CATALOG_MAP[b[0]];
        return (ca ? ca.cost : 0) - (cb ? cb.cost : 0);
      }).forEach(([id, cnt]) => {
        const cat = CARD_CATALOG_MAP[id];
        if (!cat) return;
        html += `<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:6px;padding:4px 8px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;gap:4px" class="de-remove" data-cid="${id}">
          <span style="color:#6aafff">${cat.cost}</span>
          <span>${getArt(cat)}</span>
          <span style="color:var(--text-primary)">${cat.name}</span>
          <span style="color:var(--text-muted)">x${cnt}</span>
          <span style="color:var(--red);font-size:0.7rem">-</span>
        </div>`;
      });
      html += '</div>';
    }
    html += '</div>';

    // Available cards to add
    html += '<div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:6px">可添加的卡牌:</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    CARD_CATALOG.forEach(cat => {
      const owned = col[cat.id] || 0;
      if (owned === 0) return;
      const inDeck = deckCount[cat.id] || 0;
      const canAdd = inDeck < owned && deck.cards.length < 30;
      html += `<div style="background:${canAdd?'var(--bg-card)':'rgba(50,50,50,0.3)'};border:1px solid ${canAdd?'var(--border-color)':'rgba(100,100,100,0.2)'};border-radius:6px;padding:4px 8px;font-size:0.75rem;cursor:${canAdd?'pointer':'not-allowed'};display:flex;align-items:center;gap:4px;${canAdd?'':'opacity:0.5'}" class="${canAdd?'de-add':''}" data-cid="${cat.id}">
        <span style="color:#6aafff">${cat.cost}</span>
        <span>${getArt(cat)}</span>
        <span style="color:var(--text-primary)">${cat.name}</span>
        <span style="color:var(--text-muted)">${inDeck}/${owned}</span>
        ${cat.type==='minion'?`<span style="font-size:0.65rem;color:var(--text-muted)">⚔${cat.atk} ❤${cat.hp}</span>`:''}
        ${canAdd?'<span style="color:var(--green);font-size:0.7rem">+</span>':''}
      </div>`;
    });
    html += '</div>';

    $collection.innerHTML = html;

    document.getElementById('de-back').addEventListener('click', () => {
      showDeckBuilder();
    });
    $collection.querySelectorAll('.de-add').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.dataset.cid;
        deck.cards.push(cid);
        saveDecks(decks);
        renderDeckEditor(deckIdx);
      });
    });
    $collection.querySelectorAll('.de-remove').forEach(el => {
      el.addEventListener('click', () => {
        const cid = el.dataset.cid;
        const idx = deck.cards.lastIndexOf(cid);
        if (idx >= 0) {
          deck.cards.splice(idx, 1);
          saveDecks(decks);
          renderDeckEditor(deckIdx);
        }
      });
    });
  }

  // Collection/deck buttons
  document.getElementById('btn-collection').addEventListener('click', showCollection);
  document.getElementById('btn-deckbuild').addEventListener('click', showDeckBuilder);

  /* --- Phase 4B: 联动仙卡录 --- */
  function getCardcollectCards() {
    const save = Storage.get('cardcollect_save', null);
    if (!save || !save.owned) return [];
    // CHARACTER_DATA is in cardcollect.js scope; read from save directly
    const results = [];
    Object.entries(save.owned).forEach(([idStr, data]) => {
      if (!data) return;
      const id = parseInt(idStr);
      const name = data.name || ('仙卡#' + id);
      const role = data.role || 'ATK';
      const quality = data.quality || '凡';
      const lv = data.level || 1;
      // Convert cardcollect stats to cardbattle card
      const qMul = quality === '圣' ? 2.5 : quality === '仙' ? 2 : quality === '灵' ? 1.5 : 1;
      if (role === 'ATK') {
        // ATK → aggressive minion
        const cost = Math.min(10, Math.max(1, Math.floor(2 + qMul + lv / 10)));
        results.push({
          id: 'cc_' + id, name: name, type: 'minion',
          cost: cost, atk: Math.floor(cost * 1.2), hp: Math.floor(cost * 0.8),
          charge: quality === '仙' || quality === '圣',
          maxCopy: 1, _fromCardcollect: true
        });
      } else if (role === 'DEF') {
        // DEF → taunt minion
        const cost = Math.min(10, Math.max(1, Math.floor(2 + qMul + lv / 10)));
        results.push({
          id: 'cc_' + id, name: name, type: 'minion',
          cost: cost, atk: Math.floor(cost * 0.6), hp: Math.floor(cost * 1.8),
          taunt: true, maxCopy: 1, _fromCardcollect: true
        });
      } else {
        // SUP → spell or battlecry minion
        const cost = Math.min(10, Math.max(1, Math.floor(1 + qMul + lv / 10)));
        results.push({
          id: 'cc_' + id, name: name, type: 'minion',
          cost: cost, atk: Math.floor(cost * 0.8), hp: Math.floor(cost * 1.2),
          battlecry: quality === '圣' ? 'heal5aoe3' : quality === '仙' ? 'aoe3' : 'heal3',
          maxCopy: 1, _fromCardcollect: true
        });
      }
    });
    return results;
  }

  // Merge cardcollect cards into collection
  function syncCardcollectToCollection() {
    const ccCards = getCardcollectCards();
    if (ccCards.length === 0) return;
    const col = getCollection();
    let added = 0;
    ccCards.forEach(c => {
      // Add to catalog dynamically if not present
      if (!CARD_CATALOG_MAP[c.id]) {
        CARD_CATALOG.push(c);
        CARD_CATALOG_MAP[c.id] = c;
        MINION_ART[c.name] = MINION_ART[c.name] || '🃏';
      }
      if (!col[c.id]) { col[c.id] = 1; added++; }
    });
    if (added > 0) {
      saveCollection(col);
      showToast('从仙卡录同步了 ' + added + ' 张卡牌！', 'success');
    }
  }

  /* --- Phase 4C: 竞技场模式 --- */
  let arenaState = null;

  function getArenaData() {
    return Storage.get('cardbattle_arena', { bestStreak: 0, currentRun: null });
  }
  function saveArenaData(d) { Storage.set('cardbattle_arena', d); }

  function startArenaRun() {
    const data = getArenaData();
    data.currentRun = { streak: 0, hp: 30 };
    saveArenaData(data);
    arenaState = data.currentRun;
    startArenaMatch();
  }

  function startArenaMatch() {
    if (!arenaState) return;
    // Scale difficulty based on streak
    const streak = arenaState.streak;
    const diffLvl = streak < 3 ? 0 : streak < 6 ? 1 : 2;
    const opp = OPPONENTS[diffLvl];
    const deckIdx = getActiveDeckIdx();
    const decks = getDecks();
    let playerDeck;
    if (deckIdx >= 0 && decks[deckIdx] && decks[deckIdx].cards.length === 30) {
      playerDeck = shuffle(buildDeckFromList(decks[deckIdx].cards));
    } else {
      playerDeck = shuffle(createPlayerDeck());
    }
    const enemyDeck = shuffle(createEnemyDeck(diffLvl));
    // Scale enemy HP based on streak
    const enemyHP = opp.hp + streak * 5;

    G = {
      diff: diffLvl,
      turn: 0,
      phase: 'player',
      playerHP: arenaState.hp,
      playerMaxHP: 30,
      playerEnergy: 0,
      playerMaxEnergy: 0,
      playerDeck: playerDeck,
      playerHand: [],
      playerField: [],
      enemyHP: enemyHP,
      enemyMaxHP: enemyHP,
      enemyEnergy: 0,
      enemyMaxEnergy: 0,
      enemyDeck: enemyDeck,
      enemyHand: [],
      enemyField: [],
      enemyName: '竞技场 #' + (streak + 1) + ' ' + opp.name,
      enemyPortrait: opp.portrait,
      turnCount: 0,
      gameOver: false,
      winner: null,
      playerHeroPowerUsed: false,
      enemyHeroPowerUsed: false,
      isArena: true,
    };
    for (let i = 0; i < 3; i++) { drawCard('player'); drawCard('enemy'); }
    startPlayerTurn();
    showBattle();
    render();
  }

  function endArenaMatch(won) {
    const data = getArenaData();
    if (!data.currentRun) return;
    if (won) {
      data.currentRun.streak++;
      data.currentRun.hp = G.playerHP;
      // Milestone rewards
      const milestones = [3, 6, 9, 12];
      if (milestones.includes(data.currentRun.streak)) {
        const card = grantRandomCard();
        if (card) showToast('竞技场里程碑！获得 ' + card.name, 'success');
      }
      saveArenaData(data);
      arenaState = data.currentRun;
    } else {
      if (data.currentRun.streak > data.bestStreak) {
        data.bestStreak = data.currentRun.streak;
      }
      data.currentRun = null;
      saveArenaData(data);
      arenaState = null;
    }

    // Cross-game stat: arena best streak
    if (typeof CrossGameAchievements !== 'undefined') {
      CrossGameAchievements.trackStat('cardbattle_arena_best', data.bestStreak || 0);
    }
  }

  // Override showResult for arena
  function showArenaResult() {
    if (G && G.isArena) {
      const won = G.winner === 'player';
      const before = getArenaData();
      const runStreak = before.currentRun ? before.currentRun.streak : 0;

      // 仙缘兑换：竞技场复活（失败时消耗一次，保留连胜）
      let revived = false;
      if (!won && before.currentRun) {
        const cbBonuses = Storage.get('xianyuan_cardbattle_bonuses', { arenaRevives: 0 });
        if ((cbBonuses.arenaRevives || 0) > 0) {
          cbBonuses.arenaRevives -= 1;
          Storage.set('xianyuan_cardbattle_bonuses', cbBonuses);

          const data = getArenaData();
          if (data.currentRun) {
            data.currentRun.hp = Math.max(10, Math.floor(30 * 0.6));
            saveArenaData(data);
            arenaState = data.currentRun;
            revived = true;
            showToast('消耗「竞技场复活」：保留连胜并继续！', 'success', 2500);
          }
        }
      }

      if (!revived) endArenaMatch(won);

      const after = getArenaData();
      const bestStreak = after.bestStreak || 0;
      const uiWon = won || revived;
      const currentStreak = uiWon && arenaState ? arenaState.streak : runStreak;

      $battle.style.display = 'none';
      $result.style.display = '';
      const $title = document.getElementById('result-title');
      $title.textContent = uiWon ? '竞技场胜利！' : '竞技场结束';
      $title.className = 'cb-result-title ' + (uiWon ? 'win' : 'lose');
      const $stats = document.getElementById('result-stats');
      $stats.innerHTML = `
        <div class="cb-result-stat"><span class="stat-label">${uiWon ? '当前连胜' : '本次连胜'}</span><span class="stat-value">${currentStreak}</span></div>
        <div class="cb-result-stat"><span class="stat-label">历史最佳</span><span class="stat-value" style="color:var(--gold)">${bestStreak}</span></div>
        ${uiWon ? '<div class="cb-result-stat"><span class="stat-label">剩余生命</span><span class="stat-value">' + (arenaState ? arenaState.hp : G.playerHP) + '/30</span></div>' : ''}
      `;
      // Replace result buttons
      const $actions = document.querySelector('.cb-result-actions');
      if (uiWon && arenaState) {
        $actions.innerHTML = '<button class="btn btn-gold" id="arena-next">下一场</button><button class="btn btn-outline" id="arena-quit">结束竞技场</button>';
        document.getElementById('arena-next').addEventListener('click', () => startArenaMatch());
        document.getElementById('arena-quit').addEventListener('click', () => {
          const d = getArenaData();
          if (d.currentRun && d.currentRun.streak > d.bestStreak) d.bestStreak = d.currentRun.streak;
          if (typeof CrossGameAchievements !== 'undefined') {
            CrossGameAchievements.trackStat('cardbattle_arena_best', d.bestStreak || 0);
          }
          d.currentRun = null; saveArenaData(d); arenaState = null; showStart();
        });
      } else {
        $actions.innerHTML = '<button class="btn btn-gold" id="btn-retry-a">再来一局</button><button class="btn btn-outline" id="btn-back-menu-a">返回选关</button>';
        document.getElementById('btn-retry-a').addEventListener('click', () => { startArenaRun(); });
        document.getElementById('btn-back-menu-a').addEventListener('click', showStart);
      }
      return;
    }
  }

  document.getElementById('btn-arena').addEventListener('click', () => {
    const data = getArenaData();
    if (data.currentRun) {
      arenaState = data.currentRun;
      startArenaMatch();
    } else {
      startArenaRun();
    }
  });

  /* ===================== 初始化 ===================== */

  initParticles('#particles', 20);
  getCollection(); // Initialize collection if needed
  syncCardcollectToCollection(); // Sync cards from cardcollect
  showStart();

  // 新手引导
  if (typeof GuideSystem !== 'undefined') {
    GuideSystem.start('cardbattle', [
      { title: '欢迎来到灵卡对决！', desc: '召唤弟子、布阵法宝，与AI仙师回合制对战。' },
      { title: '选择难度', desc: '选择对手开始对战，难度从左到右递增。', target: '#cb-start' },
      { title: '出牌技巧', desc: '从手牌中选择卡牌出战，注意灵力消耗和战场位置。' }
    ]);
  }

})();
