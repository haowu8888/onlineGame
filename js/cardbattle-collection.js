(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CardBattleCollection = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const QUALITY_POWER = Object.freeze({ '凡': 1, '灵': 1.5, '仙': 2, '圣': 2.5 });
  const ROLE_STATS = Object.freeze({
    ATK: Object.freeze({ baseCost: 2, atk: 1.2, hp: 0.8 }),
    DEF: Object.freeze({ baseCost: 2, atk: 0.6, hp: 1.8 }),
    SUP: Object.freeze({ baseCost: 1, atk: 0.8, hp: 1.2 }),
  });
  const COST = Object.freeze({ minimum: 1, maximum: 10, levelsPerPoint: 10 });

  function abilities(role, quality) {
    if (role === 'ATK') return { charge: quality === '仙' || quality === '圣' };
    if (role === 'DEF') return { taunt: true };
    if (quality === '圣') return { battlecry: 'heal5aoe3' };
    return { battlecry: quality === '仙' ? 'aoe3' : 'heal3' };
  }

  function convert({ character, progress }) {
    if (!character) throw new RangeError('仙卡录存档包含未知角色编号');
    if (!Number.isSafeInteger(progress?.level) || progress.level < 1) {
      throw new TypeError('仙卡录角色等级必须是正整数');
    }
    const quality = progress.quality ?? character.quality;
    if (!Object.hasOwn(QUALITY_POWER, quality)) throw new RangeError('未知的仙卡录角色品质：' + quality);
    const stats = ROLE_STATS[character.role];
    if (!stats) throw new RangeError('未知的仙卡录角色定位：' + character.role);
    const rawCost = Math.floor(stats.baseCost + QUALITY_POWER[quality] + progress.level / COST.levelsPerPoint);
    const cost = Math.min(COST.maximum, Math.max(COST.minimum, rawCost));
    return {
      id: 'cc_' + character.id, name: character.name, type: 'minion', cost,
      atk: Math.floor(cost * stats.atk), hp: Math.floor(cost * stats.hp),
      ...abilities(character.role, quality), maxCopy: 1, _fromCardcollect: true,
    };
  }

  function fromSave({ save, catalog }) {
    if (save == null) return [];
    if (!save.owned || typeof save.owned !== 'object' || Array.isArray(save.owned)) {
      throw new TypeError('仙卡录存档缺少有效的 owned 角色记录');
    }
    return Object.entries(save.owned).map(([id, progress]) => convert({ character: catalog[id], progress }));
  }

  return Object.freeze({ fromSave });
});
