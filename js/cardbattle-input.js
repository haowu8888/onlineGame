(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardBattleInput = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BUTTON_KEYS = Object.freeze({ e: 'btn-end-turn', h: 'btn-hero-power', c: 'btn-cancel', escape: 'btn-cancel' });

  function action({ document, key, selecting }) {
    if (['escape', 'c'].includes(key) && !selecting) return null;
    if (BUTTON_KEYS[key]) return document.getElementById(BUTTON_KEYS[key]);
    if (/^[1-9]$/.test(key)) return document.querySelectorAll('#player-hand .cb-card')[Number(key) - 1];
    return null;
  }

  function bind({ document, readState }) {
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (document.querySelector('dialog[open],.modal-overlay:not([hidden]):not(.hidden),.guide-overlay.active')) return;
      const { state, selecting, animating } = readState();
      if (!state || state.gameOver || state.phase !== 'player' || animating) return;
      if (document.getElementById('cb-battle').style.display === 'none') return;
      const button = action({ document, key: event.key.toLowerCase(), selecting });
      if (!button || button.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      button.click();
    });
  }

  return Object.freeze({ action, bind });
});
