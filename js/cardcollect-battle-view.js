(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardCollectBattleView = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  function statusLabels(unit) {
    return [unit.poisoned && '中毒', unit.stunned && '眩晕', unit.shield > 0 && '护盾',
      unit.atkBuffTurns > 0 && '强攻', unit.blocking && '格挡', unit.ultReady && '大招就绪'].filter(Boolean);
  }

  function renderUnit({ unit, isEnemy, focusedId, portrait, escape }) {
    const hpPercent = Math.max(0, Math.min(100, unit.hp / unit.maxHp * 100));
    const healthClass = hpPercent <= 25 ? 'low' : hpPercent <= 50 ? 'mid' : '';
    const focused = isEnemy && unit.alive && focusedId === unit.id;
    const classes = ['cc-battle-unit', !unit.alive && 'dead', focused && 'focused',
      isEnemy && unit.alive && 'enemy-clickable'].filter(Boolean).join(' ');
    const artwork = unit.charId
      ? portrait(unit.charId, 'cc-battle-portrait') : `<span aria-hidden="true">${escape(unit.icon || '👻')}</span>`;
    const energy = unit.energy === undefined ? '' : `<div class="unit-energy-bar" aria-label="能量 ${unit.energy}%">
      <div class="unit-energy-fill ${unit.ultReady ? 'ready' : ''}" style="width:${unit.energy}%"></div></div>`;
    return `<div class="${classes}" data-unit-id="${escape(unit.id)}">
      <span class="unit-icon ${unit.charId ? 'has-portrait' : ''}">${artwork}</span>
      <div class="unit-info"><div class="unit-name">${focused ? '🎯 ' : ''}${escape(unit.name)}</div>
        <div class="unit-hp-bar" role="meter" aria-label="${escape(unit.name)}生命" aria-valuenow="${Math.max(0, unit.hp)}" aria-valuemin="0" aria-valuemax="${unit.maxHp}">
          <div class="unit-hp-fill ${healthClass}" style="width:${hpPercent}%"></div></div>
        <div class="unit-hp-text">${Math.max(0, unit.hp)}/${unit.maxHp}</div>${energy}
        <div class="unit-status-tags">${statusLabels(unit).map(label => `<span>${label}</span>`).join('')}</div>
      </div></div>`;
  }

  return Object.freeze({ renderUnit, statusLabels });
});
