const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadESModule } = require('./helpers/esm-loader.js');

const inputModule = loadESModule('js/knife-input.js').then(result => result.namespace);

async function pressSpace({ state, target = 'canvas', repeat = false }) {
  const { KnifeInput } = await inputModule;
  const actions = [];
  let prevented = false;
  const context = { game: { state }, actions: {
    dash: () => actions.push('dash'), resume: () => actions.push('resume'),
  } };
  KnifeInput.prototype.keydown.call(context, {
    key: ' ', code: 'Space', repeat, defaultPrevented: false,
    target: { closest: selector => selector.split(',').some(item => item.trim() === target) },
    preventDefault: () => { prevented = true; },
  });
  return { actions, prevented };
}

test('空格在战场闪避、暂停时继续，在菜单和升级选择中保留默认行为', async () => {
  assert.deepEqual(await pressSpace({ state: 'playing' }), { actions: ['dash'], prevented: true });
  assert.deepEqual(await pressSpace({ state: 'paused' }), { actions: ['resume'], prevented: true });
  for (const state of ['menu', 'upgrading', 'blessing', 'over']) {
    assert.deepEqual(await pressSpace({ state }), { actions: [], prevented: false });
  }
  assert.deepEqual(await pressSpace({ state: 'playing', repeat: true }), { actions: [], prevented: false });
});

test('焦点在技能按钮、导航或文本输入时，空格不被战斗快捷键抢走', async () => {
  for (const target of ['button', 'a', 'summary', '[role="button"]', 'input', 'textarea', 'select']) {
    assert.deepEqual(await pressSpace({ state: 'playing', target }), { actions: [], prevented: false });
    assert.deepEqual(await pressSpace({ state: 'paused', target }), { actions: [], prevented: false });
  }
});

test('Ctrl、Meta 和 Alt 组合键保留浏览器行为，不触发移动、闪避或武学', async () => {
  const { KnifeInput } = await inputModule;
  const game = { state: 'playing', keys: {} };
  const actions = { dash: assert.fail, activateSkill: assert.fail };
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    for (const [key, code] of [['s', 'KeyS'], ['1', 'Digit1'], [' ', 'Space']]) {
      KnifeInput.prototype.keydown.call({ game, actions }, {
        key, code, [modifier]: true, defaultPrevented: false,
        target: { closest: () => null }, preventDefault: assert.fail,
      });
      assert.deepEqual(game.keys, {});
    }
  }
});
