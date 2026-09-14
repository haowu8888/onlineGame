'use strict';
{
  const STATS_KEY = 'cross_game_stats';
  const PURCHASED_KEY = 'xianyuan_purchased';
  const MAX_CARD_LEVEL = 30;
  const EXP_PER_LEVEL = 50;
  const MAX_GOLD_MULTIPLIER = 3;
  const QUEUED_REWARDS = {
    knife: { key: 'xianyuan_knife_bonuses', fields: { hp: 'hp', heal_next: 'heal_next', gold_boost: 'goldMul' }, recipient: '转转刀下局生效' },
    cardtower: { key: 'xianyuan_tower_bonuses', fields: { hp: 'hp', heal_next: 'heal_next', relic_box: 'extraRelicChoices' }, recipient: '斩仙塔下局生效' },
    cardcollect: { key: 'xianyuan_cardcollect_bonuses', fields: { equip_box: 'equipBoxes' }, recipient: '进入仙卡录领取' },
    guigu: { key: 'xianyuan_guigu_bonuses', fields: { mount_feed: 'mountFeed' }, recipient: '进入鬼谷八荒领取' },
    cardbattle: { key: 'xianyuan_cardbattle_bonuses', fields: { arena_life: 'arenaRevives' }, recipient: '竞技场失败时自动复活' },
    lifesim: { key: 'xianyuan_lifesim_bonuses', fields: { luck: 'luck' }, recipient: '仙途模拟器新角色生效' },
  };

  class ExchangeUnavailableError extends Error {}

  function unavailable(message) {
    throw new ExchangeUnavailableError(message);
  }

  function snapshotReader(storage) {
    const snapshot = new Map();
    return (key, fallback = null) => {
      if (!snapshot.has(key)) snapshot.set(key, storage.get(key));
      return snapshot.get(key) ?? fallback;
    };
  }

  function findSave({ read, data, keys, gameName }) {
    for (const key of keys) {
      const save = read(key);
      if (save) return { key, save: data.requireRecord(save, gameName + '存档') };
    }
    return unavailable('请先进入' + gameName + '创建角色，再兑换此道具。');
  }

  function numericReward({ item, target, data }) {
    // 修炼倍率与每秒悟道增量会产生小数，资源校验需遵循对应字段语义。
    const validate = item.game === 'cultivation' && ['exp', 'insight'].includes(item.effect.type)
      ? data.requireAmount : data.requireCount;
    const value = validate(target.save[item.effect.type] ?? 0, '角色资源');
    const total = validate(value + item.effect.value, '奖励后资源');
    return {
      updates: { [target.key]: { ...target.save, [item.effect.type]: total } },
      recipient: target.save.name || '当前存档',
    };
  }

  function herbReward({ target, item, data }) {
    if (!Array.isArray(target.save.inventory)) throw new Error('鬼谷背包格式无效，请检查存档。');
    const herbIndex = target.save.inventory.findIndex(entry => entry.id === 'mat001' && entry.type === 'material');
    const existing = target.save.inventory[herbIndex];
    const count = data.requireCount((existing?.count ?? 0) + item.effect.value, '灵草数量');
    const herb = existing
      ? { ...existing, count }
      : { id: 'mat001', name: '灵草', type: 'material', count };
    const inventory = herbIndex < 0
      ? [...target.save.inventory, herb]
      : target.save.inventory.map((entry, index) => index === herbIndex ? herb : entry);
    return { updates: { [target.key]: { ...target.save, inventory } }, recipient: target.save.name || '鬼谷角色' };
  }

  function cardExperienceReward({ target, item, data, progression }) {
    const owned = data.requireRecord(target.save.owned, '仙卡角色');
    if (!Array.isArray(target.save.team)) throw new Error('仙卡队伍格式无效，请检查存档。');
    const team = [...new Set(target.save.team.filter(id => id && owned[id]))];
    if (team.length === 0) return unavailable('请先在仙卡录编排队伍，再兑换修炼卷轴。');
    for (const id of team) {
      data.requireCount(owned[id].level, '角色等级');
      data.requireCount(owned[id].exp, '角色经验');
    }
    if (team.every(id => owned[id].level >= MAX_CARD_LEVEL)) {
      return unavailable('当前队伍已满级，修炼卷轴暂时无效。');
    }
    const nextOwned = progression.grantTeamExp({
      team, owned, expGain: item.effect.value, maxLevel: MAX_CARD_LEVEL,
      expForLevel: level => level * EXP_PER_LEVEL,
    });
    return { updates: { [target.key]: { ...target.save, owned: nextOwned } }, recipient: '仙卡录当前上阵队伍' };
  }

  function queuedReward({ item, read, data }) {
    const config = QUEUED_REWARDS[item.game];
    const field = config.fields[item.effect.type];
    const bonuses = data.requireRecord(read(config.key, {}), '游戏加成');
    let value;
    if (item.effect.type === 'gold_boost') {
      const previous = bonuses[field] ?? 1;
      if (!Number.isFinite(previous) || previous < 1) throw new Error('金币加成格式无效，请检查存档。');
      value = Math.min(MAX_GOLD_MULTIPLIER, previous * item.effect.value);
      if (value === previous) return unavailable('下局金币加成已达到上限，请使用后再兑换。');
    } else {
      value = data.requireCount(data.requireCount(bonuses[field] ?? 0, '已有加成') + item.effect.value, '游戏加成');
    }
    return { updates: { [config.key]: { ...bonuses, [field]: value } }, recipient: config.recipient };
  }

  function prepareReward(context) {
    const { item, read, data } = context;
    if (QUEUED_REWARDS[item.game]?.fields[item.effect.type]) return queuedReward(context);
    if (item.game === 'cultivation') {
      const target = findSave({ read, data, keys: [1, 2, 3].map(slot => 'cultivation_save_' + slot), gameName: '修仙之路' });
      return numericReward({ ...context, target });
    }
    if (item.game === 'guigu') {
      const target = findSave({ read, data, keys: [0, 1, 2].map(slot => 'guigu_save_' + slot), gameName: '鬼谷八荒' });
      return item.effect.type === 'herb' ? herbReward({ ...context, target }) : numericReward({ ...context, target });
    }
    if (item.game === 'cardcollect') {
      const target = findSave({ read, data, keys: ['cardcollect_save'], gameName: '仙卡录' });
      return item.effect.type === 'team_exp'
        ? cardExperienceReward({ ...context, target })
        : numericReward({ ...context, target });
    }
    throw new Error('商品奖励没有对应的发放方式：' + item.id);
  }

  function inspectItem(context, id) {
    const { read, data } = context;
    const item = data.getItem(id);
    const purchased = data.getPurchasedCounts(read(PURCHASED_KEY, {}));
    const count = purchased[id] ?? 0;
    const cost = data.getCost(item, count);
    const stats = data.requireRecord(read(STATS_KEY, {}), '仙缘档案');
    const points = data.requireCount(stats.xianyuan_points ?? 0, '仙缘点');
    const view = { item, cost, count, points, soldOut: !item.repeatable && count > 0 };
    try {
      if (view.soldOut) unavailable('此永久道具已兑换。');
      const reward = prepareReward({ ...context, item });
      if (points < cost) unavailable('仙缘点不足，还需要 ' + (cost - points) + ' 点。');
      return { ...view, available: true, reward, purchased, stats };
    } catch (error) {
      if (!(error instanceof ExchangeUnavailableError)) throw error;
      return { ...view, available: false, reason: error.message };
    }
  }

  function create({ storage, data, progression }) {
    function inspect(id) {
      return inspectItem({ read: snapshotReader(storage), data, progression }, id);
    }
    function list() {
      const context = { read: snapshotReader(storage), data, progression };
      return data.ITEMS.map(item => inspectItem(context, item.id));
    }
    function getBalance() {
      const stats = data.requireRecord(storage.get(STATS_KEY, {}), '仙缘档案');
      return data.requireCount(stats.xianyuan_points ?? 0, '仙缘点');
    }
    function purchase(id) {
      const view = inspect(id);
      if (!view.available) return unavailable(view.reason);
      const points = view.points - view.cost;
      storage.setManyImmediate({
        ...view.reward.updates,
        [STATS_KEY]: { ...view.stats, xianyuan_points: points },
        [PURCHASED_KEY]: { ...view.purchased, [id]: view.count + 1 },
      });
      return { points, cost: view.cost, item: view.item, recipient: view.reward.recipient };
    }
    return Object.freeze({ inspect, list, getBalance, purchase });
  }

  const api = Object.freeze({ create, ExchangeUnavailableError });
  if (typeof module === 'object' && module.exports) module.exports = api;
  globalThis.PortalExchangeModel = api;
}
