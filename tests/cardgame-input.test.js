const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createGuideRuntime } = require('./helpers/guide-runtime');
const { makeDom } = require('./fixtures/dom');
const battleInput = require('../js/cardbattle-input');
const towerInput = require('../js/cardtower-input');

const TOWER_OVERLAYS = ['cardReward', 'relicReward', 'upgradeOverlay', 'eventOverlay', 'restShop', 'cardRemoval'];

function activeGuide(document) {
  const { guide } = createGuideRuntime(document);
  guide.overlay.classList.add('active');
  return guide;
}

function press(document, key) {
  const event = {
    type: 'keydown', key, target: document.body, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() {},
  };
  document.dispatchEvent(event);
  return event.defaultPrevented;
}

function createBattle() {
  const document = makeDom(`<div id="cb-battle"><div id="player-hand">
    <button id="card" class="cb-card">灵气弹</button></div>
    <button id="btn-end-turn">结束回合</button><button id="btn-hero-power">灵技</button>
    <button id="btn-cancel">取消</button></div>`);
  battleInput.bind({ document, readState: () => ({
    state: { gameOver: false, phase: 'player' }, selecting: true, animating: false,
  }) });
  return { document, keys: ['1', 'e', 'h', 'c', 'Escape'], expected: ['card', 'btn-end-turn', 'btn-hero-power', 'btn-cancel', 'btn-cancel'] };
}

function createTower() {
  const document = makeDom(`<div id="gameScreen" class="active">
    <div id="handArea"><button id="card" class="ct-card">斩击</button></div>
    <button id="btnEndTurn">结束回合</button></div>
    ${TOWER_OVERLAYS.map(id => `<div id="${id}"></div>`).join('')}`);
  const ids = [...TOWER_OVERLAYS, 'gameScreen', 'handArea', 'btnEndTurn'];
  const elements = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  towerInput.bind({ document, elements, game: {
    battle: { playerTurn: true, inBattle: true }, state: { gameOver: false },
  } });
  return { document, keys: ['1', 'e'], expected: ['card', 'btnEndTurn'] };
}

for (const [name, create] of [['灵卡', createBattle], ['仙塔', createTower]]) {
  test(name + '引导显示时阻止战斗键，点击跳过后保留引导节点也能继续操作', () => {
    const { document, keys, expected } = create();
    const guide = activeGuide(document);
    const clicked = [];
    for (const button of document.querySelectorAll('#card, #btn-end-turn, #btn-hero-power, #btn-cancel, #btnEndTurn')) {
      button.addEventListener('click', () => clicked.push(button.id));
    }
    for (const key of keys.filter(key => key !== 'Escape')) assert.equal(press(document, key), false);
    assert.deepEqual(clicked, []);
    document.querySelector('.guide-skip-btn').click();
    assert.ok(document.querySelector('.guide-backdrop'));
    assert.equal(guide.overlay.classList.contains('active'), false);
    for (const key of keys) assert.equal(press(document, key), true);
    assert.deepEqual(clicked, expected);
  });
}
