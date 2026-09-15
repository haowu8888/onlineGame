const test = require('node:test');
const assert = require('node:assert/strict');
const ports = require('../js/game-scene-ports');

function button(text, callback) {
  return { textContent: text, disabled: false, isConnected: true,
    getClientRects: () => [{}], getAttribute: () => null,
    querySelector: () => null, click: callback };
}

test('人生按钮的身份跨读取保持稳定，下一事件不得复用上一事件的操作', () => {
  let outcomes = 0;
  let buttons = [button('寻访', () => outcomes++), button('不可用', () => assert.fail('不应点击'))];
  buttons[1].disabled = true;
  const controls = ports.choiceControls({ querySelectorAll: () => buttons });
  const first = controls.read('choices');
  assert.equal(first.length, 1);
  assert.equal(controls.read('choices')[0].key, first[0].key);
  controls.act(first[0].key);
  assert.equal(outcomes, 1);
  buttons = [button('继续', () => outcomes++)];
  const second = controls.read('choices');
  assert.notEqual(first[0].key, second[0].key);
  assert.throws(() => controls.act(first[0].key), /事件已变化/);
  controls.act(second[0].key);
  assert.equal(outcomes, 2);
});

test('修炼点击复用真实面板按钮，读取的是游戏控制器的修炼状态', () => {
  let meditations = 0;
  const controls = new Map([
    ['.cult-tab[data-tab="cultivate"]', { classList: { contains: () => true } }],
    ['#btn-meditate', button('开始修炼', () => meditations++)],
  ]);
  const state = { name: '道友' };
  const port = ports.cultivation({
    ui: { gameEl: { classList: { contains: () => true } }, game: { data: state, meditating: true } },
    models: { cultivation: value => value }, realms: [], document: { querySelector: selector => controls.get(selector) },
  });
  assert.equal(port.read().state, state);
  assert.equal(port.read().meditating, true);
  port.act({ type: 'meditate' });
  assert.equal(meditations, 1);
  assert.throws(() => port.act({ type: 'invented' }), /未知/);
});

test('地图点击只选择目的地，前进调用原控制器的路线首格而非瞬移', () => {
  const moved = [];
  const ui = { game: { state: {}, getTravelDays: () => 3 }, renderMapPanel() {},
    _getMapRoute: () => [{ x: 2, y: 1 }, { x: 3, y: 1 }], _travelToCell: point => moved.push(point) };
  const port = ports.guigu({ ui, models: { guigu: value => value }, terrain: [],
    document: { getElementById: () => ({ style: { display: '' } }) } });
  port.act({ type: 'map-select', x: 3, y: 1 });
  assert.deepEqual(ui._routeTarget, { x: 3, y: 1 });
  assert.equal(moved.length, 0);
  port.act({ type: 'map-step' });
  assert.deepEqual(moved, [{ x: 2, y: 1 }]);
  assert.equal(port.read().stepDays, 3);
});

test('失效的真实按钮显式报错，不执行替代结算', () => {
  assert.throws(() => ports.clickControl({ querySelector: () => null }, '#missing'), /不存在/);
  const disabled = { ...button('突破', () => assert.fail('不应执行')), disabled: true };
  assert.throws(() => ports.clickControl({ querySelector: () => disabled }, '#disabled'), /不可用/);
});
