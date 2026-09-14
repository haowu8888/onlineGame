/* 阵容编排：使用调用方提供的有效属性，保持输入不可变。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CardCollectRoster = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TEAM_SIZE = 5;
  const QUALITY_RANK = Object.freeze({ '凡': 0, '灵': 1, '仙': 2, '圣': 3 });
  const SORT_KEYS = Object.freeze({
    quality: ['quality', 'level', 'atk', 'hp'],
    atk: ['atk', 'hp', 'quality', 'level'],
    hp: ['hp', 'atk', 'quality', 'level'],
  });

  function buildCards({ ids, getCharacter, getStats, roleLabels }) {
    return ids.map(id => {
      const character = getCharacter(id);
      const stats = getStats(id);
      if (!character || !stats) throw new Error(`无法读取已拥有的角色: ${id}`);
      return {
        id, name: character.name, role: character.role, roleLabel: roleLabels[character.role],
        skillName: character.skillName, skillDesc: character.skillDesc,
        ...stats,
      };
    });
  }

  function sortCards(cards, mode = 'quality') {
    const keys = SORT_KEYS[mode];
    if (!keys) throw new RangeError(`未知的角色排序: ${mode}`);
    return cards.slice().sort((left, right) => {
      for (const key of keys) {
        const a = key === 'quality' ? QUALITY_RANK[left.quality] : left[key];
        const b = key === 'quality' ? QUALITY_RANK[right.quality] : right[key];
        if (a !== b) return b - a;
      }
      return left.id - right.id;
    });
  }

  function autoTeam(cards, mode) {
    const ranked = sortCards(cards, mode);
    return Array.from({ length: TEAM_SIZE }, (_, index) => ranked[index]?.id ?? null);
  }

  function replaceMember({ team, cardId, slot }) {
    if (team.length !== TEAM_SIZE || !Number.isInteger(slot) || slot < 0 || slot >= TEAM_SIZE) {
      throw new RangeError('请选择有效的五人阵位');
    }
    const previousSlot = team.indexOf(cardId);
    return team.map((id, index) => {
      if (index === slot) return cardId;
      return previousSlot >= 0 && index === previousSlot ? team[slot] : id;
    });
  }

  function summarize({ cards, team }) {
    const byId = new Map(cards.map(card => [card.id, card]));
    return team.filter(id => id !== null).reduce((total, id) => {
      const card = byId.get(id);
      if (!card) throw new Error(`阵容中的角色尚未拥有: ${id}`);
      return {
        count: total.count + 1, atk: total.atk + card.atk, hp: total.hp + card.hp,
        roles: { ...total.roles, [card.role]: total.roles[card.role] + 1 },
      };
    }, { count: 0, atk: 0, hp: 0, roles: { ATK: 0, DEF: 0, SUP: 0 } });
  }

  function compareCards(candidate, current) {
    return { atk: candidate.atk - current.atk, hp: candidate.hp - current.hp };
  }

  return Object.freeze({ TEAM_SIZE, buildCards, sortCards, autoTeam, replaceMember, summarize, compareCards });
});
