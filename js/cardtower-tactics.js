(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardTowerTactics = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SACRIFICE_HAND_SIZE = 2;

  function describeCard(card) {
    return card.desc.replace(/\{(\w+)\}/g, (_, key) => String(card[key] ?? 0));
  }

  function cardStatus({ card, cost, energy, handSize, canAct }) {
    if (!canAct) return { playable: false, reason: '等待回合', cost };
    if (energy < cost) return { playable: false, reason: '需要 ' + cost + ' 灵力', cost };
    if (card.requiresExhaust && handSize < SACRIFICE_HAND_SIZE) {
      return { playable: false, reason: '还需一张祭牌', cost };
    }
    return { playable: true, reason: '可以打出', cost };
  }

  function handSummary({ cards, costs, energy, canAct }) {
    const items = cards.map((card, index) => ({
      uid: card.uid,
      ...cardStatus({ card, cost: costs[index], energy, handSize: cards.length, canAct }),
    }));
    return { items, playableCount: items.filter(item => item.playable).length };
  }

  function deckSummary(cards) {
    return cards.reduce((summary, card) => ({
      total: summary.total + 1,
      attack: summary.attack + Number(card.type === 'attack'),
      defense: summary.defense + Number(card.type === 'defense'),
      spell: summary.spell + Number(card.type === 'spell'),
    }), { total: 0, attack: 0, defense: 0, spell: 0 });
  }

  function route({ floors, floorIndex, nodeIndex, victory }) {
    return floors.map((floor, index) => ({
      name: floor.name,
      status: victory || index < floorIndex ? 'complete' : index === floorIndex ? 'current' : 'upcoming',
      nodes: [...floor.enemies, floor.boss].map((key, position) => ({
        key,
        boss: position === floor.enemies.length,
        status: victory || index < floorIndex || (index === floorIndex && position < nodeIndex)
          ? 'complete' : index === floorIndex && position === nodeIndex ? 'current' : 'upcoming',
      })),
    }));
  }

  return Object.freeze({ describeCard, cardStatus, handSummary, deckSummary, route });
});
