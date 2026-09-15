(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GameScenePorts = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function clickControl(document, selector) {
    const button = document.querySelector(selector);
    if (!button) throw new Error('游戏操作入口不存在：' + selector);
    if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
      throw new Error('游戏操作当前不可用：' + button.textContent.trim());
    }
    button.click();
  }

  function openTab(document, selector) {
    const tab = document.querySelector(selector);
    if (!tab) throw new Error('游戏面板不存在：' + selector);
    if (!tab.classList.contains('active')) tab.click();
  }

  // 按钮实例的键随页面重建而改变，上一事件的点击不能结算下一事件。
  function choiceControls(document) {
    const identities = new WeakMap();
    let sequence = 0;
    let current = new Map();
    function read(selector) {
      const buttons = [...document.querySelectorAll(selector)].filter(button =>
        !button.disabled && button.getAttribute('aria-disabled') !== 'true' && button.getClientRects().length > 0);
      current = new Map(buttons.map(button => {
        if (!identities.has(button)) identities.set(button, 'choice-' + ++sequence);
        return [identities.get(button), button];
      }));
      return [...current].map(([key, button]) => ({ key,
        text: (button.querySelector('.ls-action-name') || button).textContent.trim() }));
    }
    function act(key) {
      const button = current.get(key);
      if (!button || !button.isConnected || button.disabled || !button.getClientRects().length) {
        throw new Error('人生事件已变化，请重新选择');
      }
      button.click();
    }
    return Object.freeze({ read, act });
  }

  function cultivation({ ui, models, realms, document }) {
    return {
      id: 'cultivation',
      read: () => models.cultivation({
        state: ui.gameEl.classList.contains('active') ? ui.game.data : null,
        battle: ui.game.battleState, realms, meditating: ui.game.meditating,
      }),
      act(action) {
        if (action.type === 'meditate') {
          openTab(document, '.cult-tab[data-tab="cultivate"]');
          clickControl(document, '#btn-meditate');
          return;
        }
        const controls = { 'battle-attack': 'attack', 'battle-back': 'back' };
        if (!controls[action.type]) throw new RangeError('未知修仙操作：' + action.type);
        openTab(document, '.cult-tab[data-tab="battle"]');
        clickControl(document, '#panel-battle [data-action="' + controls[action.type] + '"]');
      },
      mount: () => ui.gameEl.classList.contains('active')
        ? document.querySelector('#panel-cultivate.active .retreat-stage, #panel-battle.active') : null,
    };
  }

  function lifesim({ ui, models, realms, document }) {
    const controls = choiceControls(document);
    const selector = '#event-choices .ls-choice-btn, #event-area #btn-continue, #event-area .ls-action-card';
    return {
      id: 'lifesim',
      read: () => models.lifesim({
        state: ui.gameEl.classList.contains('active') ? ui.game.data : null,
        realms, maxLife: ui.game.data ? ui.game.getMaxLifespan() : null,
        choices: controls.read(selector), eventTitle: document.querySelector('.ls-event-title')?.textContent,
      }),
      act(action) {
        if (action.type !== 'life-choice') throw new RangeError('未知人生操作：' + action.type);
        controls.act(action.key);
      },
      mount: () => ui.gameEl.classList.contains('active') ? document.querySelector('.ls-life-layout') : null,
    };
  }

  function guigu({ ui, models, terrain, document }) {
    return {
      id: 'guigu',
      read: () => models.guigu({
        state: document.getElementById('guigu-game').style.display === 'none' ? null : ui.game.state,
        terrain, path: ui.game.state ? ui._getMapRoute() : null,
        target: ui._routeTarget, stepDays: ui.game.state ? ui.game.getTravelDays() : null,
      }),
      act(action) {
        if (action.type === 'map-select') {
          ui._routeTarget = { x: action.x, y: action.y };
          ui.renderMapPanel();
          return;
        }
        if (action.type !== 'map-step') throw new RangeError('未知八荒操作：' + action.type);
        const path = ui._getMapRoute();
        if (!path || !path.length) throw new Error('当前没有可行走的路线');
        ui._travelToCell(path[0]);
      },
      mount: () => document.getElementById('guigu-game').style.display !== 'none'
        ? document.querySelector('#panel-map.active .atlas-chart') : null,
    };
  }

  return Object.freeze({ cultivation, lifesim, guigu, choiceControls, clickControl, openTab });
});
