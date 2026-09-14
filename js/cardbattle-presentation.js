(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardBattlePresentation = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ART_GROUPS = Object.freeze([
    [/剑|武|骑兵|影杀|刺客/, 'blade'], [/兽|妖|蛇|蟒|狐|龙/, 'beast'],
    [/护|卫|金刚|石魔|傀儡/, 'guard'], [/幽|魂|灵|怨|暗影/, 'spirit'],
    [/仙|长老|魔神|玄女/, 'elder'],
  ]);

  function sigil(name) {
    return '<svg class="cb-sigil" viewBox="0 0 96 112" fill="none" stroke="currentColor" stroke-width="2.4"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="../assets/cardbattle/sigils.svg#'
      + name + '"></use></svg>';
  }

  function art(card) {
    if (card.type === 'spell') return sigil('spell');
    const group = ART_GROUPS.find(([pattern]) => pattern.test(card.name));
    return sigil(group ? group[1] : 'caster');
  }

  function create({ document, escape: escapeHtml, tactics, descriptions, maxField }) {
    const byId = id => document.getElementById(id);

    function description(card) {
      if (card.type === 'spell') return card.desc || '';
      return [card.charge && '冲锋', card.divineShield && '圣盾', card.taunt && '嘲讽',
        card.battlecry && descriptions.battlecry(card.battlecry),
        card.deathrattle && descriptions.deathrattle(card.deathrattle)].filter(Boolean).join(' · ');
    }

    function fieldClasses({ minion, who, ready, selected, targetable }) {
      return ['cb-minion', who === 'enemy' && 'enemy-minion', minion.taunt && 'has-taunt',
        minion.divineShield && 'has-divine-shield', ready && 'can-attack', selected && 'selected',
        who === 'player' && !ready && 'sleeping', targetable && 'targetable'].filter(Boolean).join(' ');
    }

    function minionButton({ minion, index, who, selection, state, onClick, animating }) {
      const ready = who === 'player' && minion.canAttack && state.phase === 'player' && !animating;
      const selected = who === 'player' && selection.minionIndex === index;
      const targets = tactics.selectionTargets({ state, ...selection });
      const targetable = targets[who].includes(index);
      const selectable = targetable || (ready && !selection.spell);
      const detail = description(minion);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = fieldClasses({ minion, who, ready, selected, targetable });
      button.dataset.idx = index;
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-disabled', String(!selectable));
      button.setAttribute('aria-label', minion.name + '，攻击 ' + minion.atk + '，生命 ' + minion.hp + (detail ? '，' + detail : ''));
      button.title = detail || (ready ? '点击选择攻击目标' : '随从在召唤的下一回合可以攻击');
      button.innerHTML = '<span class="cb-minion-art">' + art(minion) + '</span><span class="cb-minion-name">'
        + escapeHtml(minion.name) + '</span><span class="cb-minion-atk" aria-hidden="true">' + minion.atk
        + '</span><span class="cb-minion-hp' + (minion.hp < minion.maxHp ? ' damaged' : '') + '" aria-hidden="true">'
        + minion.hp + '</span><span class="cb-minion-state">'
        + (targetable ? '选择目标' : selected ? '已选中' : ready ? '可攻击' : who === 'player' ? '休整中' : minion.taunt ? '嘲讽' : '敌方随从') + '</span>';
      button.addEventListener('click', () => onClick(index));
      return button;
    }

    function field({ who, state, selection, onClick, animating }) {
      const container = byId(who + '-field');
      const minions = state[who + 'Field'];
      const active = document.activeElement;
      const focused = container.contains(active) ? Number(active.dataset.idx) : null;
      container.replaceChildren();
      minions.forEach((minion, index) => container.appendChild(
        minionButton({ minion, index, who, selection, state, onClick, animating })));
      if (!minions.length) {
        const empty = document.createElement('p');
        empty.className = 'cb-field-empty';
        empty.textContent = who === 'player' ? '从手牌召唤随从，布置你的阵线' : '对手尚未召唤随从';
        container.appendChild(empty);
      }
      byId(who + '-field-count').textContent = minions.length + ' / ' + maxField;
      if (focused !== null) container.children[Math.min(focused, minions.length - 1)]?.focus({ preventScroll: true });
    }

    function handButton({ card, index, state, animating, spell, onClick }) {
      const status = tactics.cardStatus({ card, state, animating, maxField });
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cb-card ' + (card.type === 'spell' ? 'spell-card ' : '') + (status.playable ? 'playable' : 'unplayable');
      button.classList.toggle('selected-card', spell === card);
      button.dataset.idx = index;
      button.setAttribute('aria-disabled', String(!status.playable));
      button.setAttribute('aria-pressed', String(spell === card));
      button.setAttribute('aria-label', card.name + '，' + card.cost + ' 灵力，' + description(card) + '，' + status.reason);
      button.title = description(card) || '召唤到场上，下一回合开始可以攻击';
      button.innerHTML = '<span class="cb-card-cost">' + card.cost + '</span><span class="cb-card-key" aria-hidden="true">'
        + (index + 1) + '</span><span class="cb-card-art">' + art(card) + '</span><span class="cb-card-name">'
        + escapeHtml(card.name) + '</span><span class="cb-card-desc">' + escapeHtml(description(card)) + '</span>'
        + (card.type === 'minion' ? '<span class="cb-card-stats"><span class="cb-card-atk">攻击 ' + card.atk
          + '</span><span class="cb-card-hp">生命 ' + card.hp + '</span></span>' : '<span class="cb-card-kind">法术</span>')
        + '<span class="cb-card-state">' + (spell === card ? '正在选择目标' : escapeHtml(status.reason)) + '</span>';
      button.addEventListener('click', () => onClick(index));
      return button;
    }

    function hand({ state, animating, spell, onClick }) {
      const container = byId('player-hand');
      const active = document.activeElement;
      const focused = container.contains(active) ? Number(active.dataset.idx) : null;
      container.replaceChildren();
      state.playerHand.forEach((card, index) => container.appendChild(handButton({ card, index, state, animating, spell, onClick })));
      if (!state.playerHand.length) {
        const empty = document.createElement('p');
        empty.className = 'cb-hand-empty';
        empty.textContent = '手牌已用尽 · 下一回合会抽取一张牌';
        container.appendChild(empty);
      }
      if (focused !== null) container.children[Math.min(focused, state.playerHand.length - 1)]?.focus({ preventScroll: true });
    }

    function selection({ state, spell, minionIndex }) {
      const hint = byId('target-hint');
      const text = tactics.selectionText({ state, spell, minionIndex });
      hint.style.display = text ? 'flex' : 'none';
      if (text) {
        byId('cb-target-title').textContent = text.title;
        byId('cb-target-instruction').textContent = text.instruction;
        byId('cb-target-detail').textContent = text.detail;
      }
      const targetable = tactics.selectionTargets({ state, spell, minionIndex }).master;
      byId('enemy-master').classList.toggle('targetable', targetable);
      byId('enemy-master').setAttribute('aria-disabled', String(!targetable));
    }

    function summary({ state, animating, powerTarget }) {
      const power = tactics.HERO_POWER;
      const turn = tactics.turnSummary({ state, animating, maxField });
      byId('cb-round-count').textContent = '回合 ' + turn.turn;
      byId('cb-hand-count').textContent = '手牌 ' + turn.handCount;
      byId('cb-action-summary').textContent = state.phase === 'player'
        ? '可出 ' + turn.playable + ' 张 · 可攻击 ' + turn.ready + ' 名' : '对手正在行动';
      const targetName = state.enemyHP <= power.damage || !powerTarget ? state.enemyName : powerTarget.name;
      byId('cb-power-plan').textContent = '灵技 → ' + targetName + ' · ' + power.damage + ' 伤害';
      byId('btn-hero-power').title = '自动对 ' + targetName + ' 造成 ' + power.damage
        + ' 点伤害；优先斩杀仙师，否则攻击最高攻击随从。每回合一次，消耗 ' + power.cost + ' 灵力。';
    }

    function focusTarget() {
      document.querySelector('.cb-battle .targetable')?.focus({ preventScroll: true });
    }

    return Object.freeze({ field, hand, selection, summary, focusTarget });
  }

  return Object.freeze({ create, art, sigil });
});
