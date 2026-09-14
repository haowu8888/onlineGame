(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardBattleTactics = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const EXECUTE_ATTACK_LIMIT = 3;
  const CURVE_LAST_COST = 7;
  const HERO_POWER = Object.freeze({ cost: 2, damage: 2 });
  const TARGET_TYPES = Object.freeze({
    deal3minion: 'enemy_minion',
    deal6any: 'any',
    deal8any: 'any',
    killlow3: 'any_minion',
  });

  function livingIndexes(field, predicate) {
    return field.flatMap((minion, index) => minion.hp > 0 && predicate(minion) ? [index] : []);
  }

  function spellTargets({ effect, enemyField, playerField }) {
    const kind = TARGET_TYPES[effect] || 'none';
    const eligible = minion => effect !== 'killlow3' || minion.atk <= EXECUTE_ATTACK_LIMIT;
    return {
      kind,
      enemy: kind === 'none' ? [] : livingIndexes(enemyField, eligible),
      player: ['any', 'any_minion'].includes(kind) ? livingIndexes(playerField, eligible) : [],
      master: kind === 'any',
    };
  }

  function attackTargets(enemyField) {
    const taunt = enemyField.some(minion => minion.hp > 0 && minion.taunt);
    return {
      kind: 'attack',
      enemy: livingIndexes(enemyField, minion => !taunt || minion.taunt),
      player: [],
      master: !taunt,
    };
  }

  function cardStatus({ card, state, animating, maxField }) {
    if (state.gameOver) return { playable: false, reason: '对局已结束' };
    if (state.phase !== 'player' || animating) return { playable: false, reason: '等待回合' };
    if (card.cost > state.playerEnergy) return { playable: false, reason: '需要 ' + card.cost + ' 灵力' };
    if (card.type === 'minion' && state.playerField.length >= maxField) {
      return { playable: false, reason: '我方阵位已满' };
    }
    const targets = spellTargets({ effect: card.effect, enemyField: state.enemyField, playerField: state.playerField });
    if (targets.kind !== 'none' && !targets.master && !targets.enemy.length && !targets.player.length) {
      return { playable: false, reason: '没有合法目标' };
    }
    return { playable: true, reason: card.type === 'minion' ? '召唤弟子' : '施放法术' };
  }

  function selectionTargets({ state, spell, minionIndex }) {
    if (spell) return spellTargets({ effect: spell.effect, enemyField: state.enemyField, playerField: state.playerField });
    if (minionIndex !== null && state.playerField[minionIndex]?.canAttack) return attackTargets(state.enemyField);
    return { kind: 'none', enemy: [], player: [], master: false };
  }

  function selectionText({ state, spell, minionIndex }) {
    if (spell) {
      const kind = TARGET_TYPES[spell.effect];
      const scope = {
        enemy_minion: '选择一个敌方随从',
        any: '选择任一随从或对手仙师',
        any_minion: '选择攻击不高于 ' + EXECUTE_ATTACK_LIMIT + ' 的随从',
      }[kind];
      return { title: spell.name, instruction: scope, detail: spell.desc || '' };
    }
    const minion = minionIndex === null ? null : state.playerField[minionIndex];
    if (!minion) return null;
    const taunt = state.enemyField.some(enemy => enemy.hp > 0 && enemy.taunt);
    return {
      title: minion.name + ' · 攻击 ' + minion.atk,
      instruction: taunt ? '必须先攻击带有嘲讽的随从' : '选择敌方随从或对手仙师',
      detail: '选中高亮目标即可攻击',
    };
  }

  function turnSummary({ state, animating, maxField }) {
    const playable = state.playerHand.filter(card => cardStatus({ card, state, animating, maxField }).playable).length;
    const canAct = state.phase === 'player' && !animating && !state.gameOver;
    const ready = canAct ? state.playerField.filter(minion => minion.canAttack && minion.hp > 0).length : 0;
    return { playable, ready, handCount: state.playerHand.length, turn: state.turn };
  }

  function deckSummary({ ids, catalog }) {
    const cards = ids.map(id => catalog[id]).filter(Boolean);
    const curve = Array.from({ length: CURVE_LAST_COST + 1 }, (_, cost) => ({
      cost, label: cost === CURVE_LAST_COST ? cost + '+' : String(cost),
      count: cards.filter(card => Math.min(CURVE_LAST_COST, card.cost) === cost).length,
    }));
    const minions = cards.filter(card => card.type === 'minion').length;
    const totalCost = cards.reduce((sum, card) => sum + card.cost, 0);
    return {
      total: ids.length, minions, spells: cards.length - minions, curve,
      average: cards.length ? totalCost / cards.length : 0,
      unknown: ids.filter(id => !catalog[id]),
    };
  }

  return Object.freeze({
    HERO_POWER, spellTargets, attackTargets, cardStatus, selectionTargets, selectionText, turnSummary, deckSummary,
  });
});
