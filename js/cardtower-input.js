(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardTowerInput = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const OVERLAY_CHOICES = Object.freeze([
    ['cardReward', 'rewardCards', '.ct-card'],
    ['relicReward', 'relicChoices', '.ct-relic-choice'],
    ['upgradeOverlay', 'upgradeCards', '.ct-card'],
    ['eventOverlay', 'eventChoices', '.ct-event-choice'],
    ['restShop', 'restChoices', '.ct-rest-choice'],
    ['cardRemoval', 'removalCards', '.ct-card'],
  ]);

  function overlayAction({ elements, key }) {
    const active = OVERLAY_CHOICES.find(([overlay]) => elements[overlay].classList.contains('active'));
    if (!active) return { active: false };
    if (key === '0' && active[0] === 'cardRemoval') return { active: true, button: elements.btnSkipRemoval };
    if (!/^[1-9]$/.test(key)) return { active: true };
    const [, container, selector] = active;
    return { active: true, button: elements[container].querySelectorAll(selector)[Number(key) - 1] };
  }

  function action({ elements, game, key }) {
    const overlay = overlayAction({ elements, key });
    if (overlay.active) return overlay.button;
    if (!game.battle.playerTurn || !game.battle.inBattle || game.state.gameOver) return null;
    if (key === 'e') return elements.btnEndTurn;
    if (/^[1-9]$/.test(key)) return elements.handArea.querySelectorAll('.ct-card')[Number(key) - 1];
    return null;
  }

  function bind({ document, elements, game }) {
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (!elements.gameScreen.classList.contains('active')) return;
      if (document.querySelector('dialog[open],.modal-overlay:not([hidden]):not(.hidden),.guide-overlay.active')) return;
      const button = action({ elements, game, key: event.key.toLowerCase() });
      if (!button || button.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      button.click();
    });
  }

  return Object.freeze({ action, overlayAction, bind });
});
