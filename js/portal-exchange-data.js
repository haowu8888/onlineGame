'use strict';
{
  const PRICE_GROWTH = 1.2;
  const ITEMS = Object.freeze([
      { id: 'cult_gold_500', icon: '💰', name: '灵石袋(小)', desc: '修仙之路+500灵石', cost: 30, game: 'cultivation', effect: { type: 'gold', value: 500 }, repeatable: true },
      { id: 'cult_gold_2000', icon: '💰', name: '灵石袋(大)', desc: '修仙之路+2000灵石', cost: 100, game: 'cultivation', effect: { type: 'gold', value: 2000 }, repeatable: true },
      { id: 'cult_insight_30', icon: '🧠', name: '悟道丹', desc: '修仙之路+30悟道值', cost: 40, game: 'cultivation', effect: { type: 'insight', value: 30 }, repeatable: true },
      { id: 'cult_exp_pill', icon: '✨', name: '经验丹', desc: '修仙之路+500修为', cost: 35, game: 'cultivation', effect: { type: 'exp', value: 500 }, repeatable: true },
      { id: 'collect_stones_500', icon: '💎', name: '灵石包(仙卡)', desc: '仙卡录+500灵石(5抽)', cost: 50, game: 'cardcollect', effect: { type: 'stones', value: 500 }, repeatable: true },
      { id: 'collect_exp_scroll', icon: '📜', name: '修炼卷轴', desc: '仙卡录当前上阵队伍+200经验', cost: 45, game: 'cardcollect', effect: { type: 'team_exp', value: 200 }, repeatable: true },
      { id: 'guigu_gold_1000', icon: '🪙', name: '鬼谷金囊', desc: '鬼谷八荒+1000灵石', cost: 60, game: 'guigu', effect: { type: 'gold', value: 1000 }, repeatable: true },
      { id: 'guigu_herb', icon: '🌿', name: '灵草包', desc: '鬼谷八荒+3灵草', cost: 40, game: 'guigu', effect: { type: 'herb', value: 3 }, repeatable: true },
      { id: 'knife_heal', icon: '💗', name: '回春符', desc: '转转刀下一局生命上限与气血 +30', cost: 25, game: 'knife', effect: { type: 'heal_next', value: 30 }, repeatable: true },
      { id: 'tower_potion', icon: '🧪', name: '仙塔灵药', desc: '斩仙塔下一局生命上限与气血 +10', cost: 25, game: 'cardtower', effect: { type: 'heal_next', value: 10 }, repeatable: true },
      { id: 'knife_hp_boost', icon: '❤️', name: '护身符', desc: '转转刀初始HP+20(永久)', cost: 80, game: 'knife', effect: { type: 'hp', value: 20 }, repeatable: false },
      { id: 'tower_hp_boost', icon: '🛡️', name: '仙塔护甲', desc: '斩仙塔初始HP+15(永久)', cost: 80, game: 'cardtower', effect: { type: 'hp', value: 15 }, repeatable: false },
      { id: 'lifesim_luck', icon: '🍀', name: '转运符', desc: '仙途模拟器幸运+3(永久)', cost: 60, game: 'lifesim', effect: { type: 'luck', value: 3 }, repeatable: false },
      // Phase 6C 新增商品
      { id: 'guigu_mount_feed', icon: '🥕', name: '坐骑饲料', desc: '鬼谷八荒坐骑亲密度+10', cost: 20, game: 'guigu', effect: { type: 'mount_feed', value: 10 }, repeatable: true },
      { id: 'cardbattle_arena_life', icon: '💖', name: '竞技场复活', desc: '灵卡对决竞技场额外1命', cost: 35, game: 'cardbattle', effect: { type: 'arena_life', value: 1 }, repeatable: true },
      { id: 'cardcollect_equip_box', icon: '📦', name: '装备宝箱', desc: '仙卡录随机获得1件装备', cost: 45, game: 'cardcollect', effect: { type: 'equip_box', value: 1 }, repeatable: true },
      { id: 'knife_gold_boost', icon: '💰', name: '聚财符', desc: '转转刀下局金币×1.5', cost: 30, game: 'knife', effect: { type: 'gold_boost', value: 1.5 }, repeatable: true },
      { id: 'tower_relic_box', icon: '🎁', name: '圣物宝匣', desc: '斩仙塔下局起始额外1圣物选择', cost: 50, game: 'cardtower', effect: { type: 'relic_box', value: 1 }, repeatable: true }
    ].map(item => Object.freeze({
    ...item, effect: Object.freeze({ ...item.effect }),
  })));

  function requireCount(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(label + '不是有效的非负整数，请检查存档。');
    }
    return value;
  }

  function requireAmount(value, label) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(label + '不是有效的非负数，请检查存档。');
    }
    return value;
  }

  function requireRecord(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(label + '格式无效，请检查存档。');
    }
    return value;
  }

  function getItem(id) {
    const item = ITEMS.find(candidate => candidate.id === id);
    if (!item) throw new Error('不存在的兑换商品：' + id);
    return item;
  }

  function getPurchasedCounts(raw) {
    if (Array.isArray(raw)) {
      return raw.reduce((counts, id) => {
        getItem(id);
        return { ...counts, [id]: (counts[id] ?? 0) + 1 };
      }, {});
    }
    return Object.fromEntries(Object.entries(requireRecord(raw, '购买记录')).map(([id, count]) => [
      id, requireCount(count, '商品购买次数'),
    ]));
  }

  function getCost(item, count) {
    requireCount(count, '商品购买次数');
    if (!item.repeatable) return item.cost;
    let cost = item.cost;
    for (let index = 0; index < count; index++) {
      cost = requireCount(Math.floor(cost * PRICE_GROWTH), '商品价格');
    }
    return cost;
  }

  const api = Object.freeze({ ITEMS, getItem, getPurchasedCounts, getCost, requireCount, requireAmount, requireRecord });
  if (typeof module === 'object' && module.exports) module.exports = api;
  globalThis.PortalExchangeData = api;
}
