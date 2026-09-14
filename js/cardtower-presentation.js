(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardTowerPresentation = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SIGILS = '../assets/cardtower/sigils.svg?v=33#';
  const TYPE_NAMES = Object.freeze({ attack: '攻击', defense: '防御', spell: '法术' });
  const TYPE_SIGILS = Object.freeze({ attack: 'blade', defense: 'shield', spell: 'seal' });
  const CONDITIONS = Object.freeze([
    ['poison', '中毒'], ['burn', '灼烧'], ['thorns', '荆棘'], ['strength', '力量'],
    ['vulnerable', '易伤'], ['weak', '虚弱'],
  ]);

  function sigil(name) {
    return '<svg class="ct-sigil" viewBox="0 0 96 112" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="' + SIGILS + name + '"></use></svg>';
  }

  function create(options) {
    const { document, escape: escapeHtml, tactics, classes, floors, enemyTemplates, bossTemplates } = options;

    function route(state, container) {
      const progress = tactics.route({ floors, floorIndex: state.floorIndex, nodeIndex: state.nodeIndex, victory: state.victory });
      const current = progress[state.floorIndex];
      const floorList = progress.map((floor, index) => '<li class="ct-route-floor ' + floor.status + '"'
        + (floor.status === 'current' ? ' aria-current="step"' : '') + '><span class="ct-route-number">'
        + (floor.status === 'complete' ? '✓' : index + 1) + '</span><span>'
        + escapeHtml(floor.name.split('·').pop().trim()) + '</span></li>').join('');
      const nodes = current.nodes.map((node, index) => {
        const enemy = enemyTemplates[node.key] || bossTemplates[node.key];
        return '<li class="ct-route-node ' + node.status + (node.boss ? ' boss' : '') + '">'
          + '<span>' + (node.status === 'complete' ? '✓' : index + 1) + '</span><strong>'
          + escapeHtml(enemy.name) + '</strong><small>' + (node.boss ? '守关' : '遭遇') + '</small></li>';
      }).join('');
      container.innerHTML = '<ol class="ct-route-floors" aria-label="' + floors.length + ' 层攀塔路线">' + floorList
        + '</ol><div class="ct-route-current"><p>本层行程</p><ol>' + nodes + '</ol></div>';
      const location = document.getElementById('ct-location');
      location.textContent = current.name + ' · 第 ' + (state.nodeIndex + 1) + ' 战';
    }

    function deck(state, container) {
      const summary = tactics.deckSummary(state.deck);
      container.innerHTML = '<p class="ct-deck-title">随身牌组</p><div class="ct-pile-buttons">'
        + pileButton('deck', '牌组', state.deck.length)
        + pileButton('draw', '抽牌堆', state.drawPile.length)
        + pileButton('discard', '弃牌堆', state.discardPile.length) + '</div>'
        + '<p class="ct-deck-mix">攻击 ' + summary.attack + ' / 防御 ' + summary.defense + ' / 法术 ' + summary.spell + '</p>';
    }

    function pileButton(pile, label, count) {
      return '<button type="button" class="ct-deck-stat ct-deck-click" data-pile="' + pile
        + '"><span>' + label + '</span><strong class="ct-deck-stat-val">' + count + '</strong></button>';
    }

    function enemyConditions(enemy) {
      const conditions = [
        ['block', '护甲'], ['poison', '中毒'], ['burn', '灼烧'], ['frozen', '冻结'],
        ['enrageBonus', '狂暴'], ['vulnerable', '易伤'], ['weak', '虚弱'],
      ].filter(([key]) => enemy[key] > 0).map(([key, label]) => label + ' ' + enemy[key]);
      if (enemy.charged) conditions.push('蓄力中');
      return conditions.map(text => '<span class="ct-condition">' + text + '</span>').join('');
    }

    function enemyMarkup(enemy, context) {
      const { index, battle, state } = context;
      const intent = battle.getEnemyIntent(enemy);
      const type = enemy.isBoss ? 'sovereign' : /蛇|蛟|龙/.test(enemy.name) ? 'serpent' : 'demon';
      const next = enemy.isBoss && state.hasRelic('seeIntent')
        ? enemy.pattern[(enemy.patternIndex + 1) % enemy.pattern.length] : null;
      return '<article class="ct-enemy ' + (enemy.isBoss ? 'boss-enemy' : '') + '" data-idx="' + index + '">'
        + '<div class="ct-enemy-intent intent-' + intent.type + '"><span>敌方意图</span><strong>'
        + escapeHtml(intent.label) + '</strong></div><div class="ct-enemy-portrait">' + sigil(type) + '</div>'
        + '<div class="ct-enemy-heading"><h2 class="ct-enemy-name">' + escapeHtml(enemy.name) + '</h2>'
        + (index === 0 ? '<span class="ct-primary-target">单体优先目标</span>' : '') + '</div>'
        + '<div class="ct-enemy-hp-bar" role="meter" aria-label="' + escapeHtml(enemy.name) + '生命" aria-valuemin="0" aria-valuemax="'
        + enemy.maxHp + '" aria-valuenow="' + Math.max(0, enemy.hp) + '"><div class="ct-enemy-hp-fill" style="width:'
        + Math.max(0, enemy.hp / enemy.maxHp * 100) + '%"></div></div>'
        + '<p class="ct-enemy-hp-text">' + Math.max(0, enemy.hp) + ' / ' + enemy.maxHp + '</p>'
        + '<div class="ct-enemy-statuses">' + enemyConditions(enemy) + '</div>'
        + (next ? '<p class="ct-intent-next">下一步：' + escapeHtml(next.label) + '</p>' : '') + '</article>';
    }

    function enemies(game, container) {
      container.innerHTML = game.battle.enemies.map((enemy, index) => enemyMarkup(enemy, {
        index, battle: game.battle, state: game.state,
      })).join('');
    }

    function metric(label, value, style) {
      return '<div class="ct-vital ' + style + '"><span>' + label + '</span><strong>' + value + '</strong></div>';
    }

    function status(game, container, relics) {
      const state = game.state;
      const character = classes.find(item => item.id === state.chosenClass);
      const identity = character ? '<div class="ct-character">' + sigil({ sword: 'blade', talisman: 'seal', body: 'shield' }[character.id])
        + '<div><strong>' + escapeHtml(character.name) + '</strong><span>' + escapeHtml(character.passive) + '</span></div></div>' : '';
      const conditions = CONDITIONS.filter(([key]) => state[key] > 0)
        .map(([key, label]) => '<span class="ct-condition">' + label + ' ' + state[key] + '</span>').join('');
      const build = options.buildSummary(state.deck, state.relics);
      const details = '<details class="ct-build-details"><summary>构筑与法宝'
        + (state.ascension ? ' · 飞升 ' + state.ascension : '') + '</summary><div>'
        + build.map(text => '<span class="ct-tag">' + escapeHtml(text) + '</span>').join('') + relics + '</div></details>';
      container.innerHTML = identity + '<div class="ct-vitals">'
        + metric('生命', state.hp + '<small> / ' + state.maxHp + '</small>', 'hp')
        + metric('灵力', state.energy + '<small> / ' + (state.maxEnergy + state.getRelicEffect('maxEnergyBonus')) + '</small>', 'energy')
        + metric('护甲', state.block, 'block') + '</div>'
        + '<div class="ct-conditions">' + conditions + (state.bound ? '<span class="ct-condition">缠绕</span>' : '') + '</div>' + details;
    }

    function cardMarkup(card, context) {
      const { status, index, reward } = context;
      const type = TYPE_NAMES[card.type];
      const tags = options.cardTags(card).filter(tag => !Object.values(TYPE_NAMES).includes(tag)).slice(0, 2);
      const caption = reward ? '加入牌组' : status.reason;
      const label = card.name + '，' + type + '，' + status.cost + ' 灵力。'
        + tactics.describeCard(card) + '。' + caption;
      return '<button type="button" class="ct-card card-' + card.type
        + (!status.playable ? ' cant-play' : '') + (card.upgraded ? ' upgraded' : '')
        + '" data-uid="' + escapeHtml(card.uid) + '" data-id="' + escapeHtml(card.id)
        + '" aria-label="' + escapeHtml(label) + '" aria-disabled="' + !status.playable + '">'
        + '<span class="ct-card-cost' + (status.cost < card.cost ? ' discounted' : '') + '">' + status.cost + '</span>'
        + '<span class="ct-card-key" aria-hidden="true">' + (index + 1) + '</span>'
        + '<span class="ct-card-art">' + sigil(TYPE_SIGILS[card.type]) + '</span>'
        + '<strong class="ct-card-name">' + escapeHtml(card.name) + '</strong>'
        + '<span class="ct-card-type">' + type + (tags.length ? ' · ' + tags.map(escapeHtml).join(' / ') : '') + '</span>'
        + '<span class="ct-card-desc">' + escapeHtml(tactics.describeCard(card)) + '</span>'
        + '<span class="ct-card-state">' + caption + '</span></button>';
    }

    function hand(game, container) {
      const { state, battle } = game;
      const focused = container.contains(document.activeElement) ? document.activeElement.closest('.ct-card') : null;
      const focusIndex = focused ? Array.from(container.children).indexOf(focused) : -1;
      const canAct = battle.playerTurn && battle.inBattle && !state.gameOver && battle.enemies.length > 0;
      const summary = tactics.handSummary({
        cards: state.hand, costs: state.hand.map(card => battle.getEffectiveCost(card)), energy: state.energy, canAct,
      });
      container.innerHTML = state.hand.map((card, index) => cardMarkup(card, { status: summary.items[index], index, reward: false })).join('');
      document.getElementById('ct-turn-plan').textContent = canAct
        ? '灵力 ' + state.energy + ' · 可出 ' + summary.playableCount + ' 张'
        : battle.inBattle ? '敌方行动中' : '战斗结束';
      document.getElementById('ct-turn-count').textContent = '回合 ' + battle.turn;
      if (focusIndex >= 0) container.children[Math.min(focusIndex, container.children.length - 1)]?.focus({ preventScroll: true });
    }

    function rewardCards(cards) {
      return cards.map((card, index) => cardMarkup(card, {
        status: { playable: true, cost: card.cost, reason: '加入牌组' }, index, reward: true,
      })).join('');
    }

    return Object.freeze({ route, deck, enemies, status, hand, rewardCards, sigil });
  }

  return Object.freeze({ create, sigil });
});
