const test = require('node:test');
const assert = require('node:assert/strict');
const { renderUnit, statusLabels } = require('../js/cardcollect-battle-view');

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const BASE = Object.freeze({ id: 'a_23', charId: 23, name: '剑仙', hp: 75, maxHp: 100,
  alive: true, shield: 0, energy: 45 });

test('战斗头像传递真实角色编号与同一立绘入口，血条和能量保留真实数据', () => {
  const portraits = [];
  const html = renderUnit({ unit: BASE, isEnemy: false, focusedId: null, escape,
    portrait: (id, className) => { portraits.push([id, className]); return '<svg></svg>'; },
  });
  assert.deepEqual(portraits, [[23, 'cc-battle-portrait']]);
  assert.match(html, /aria-valuenow="75"/);
  assert.match(html, /aria-valuemax="100"/);
  assert.match(html, /width:75%/);
  assert.match(html, /width:45%/);
  assert.match(html, /data-unit-id="a_23"/);
});

test('敌人保留自己的图标，状态用文字标识，零以下气血不画负血条，名称安全转义', () => {
  const unit = { ...BASE, charId: undefined, hp: -5, name: '<img onerror=x>', icon: '🐺',
    alive: false, poisoned: true, stunned: true, shield: 12, ultReady: true };
  assert.deepEqual(statusLabels(unit), ['中毒', '眩晕', '护盾', '大招就绪']);
  const html = renderUnit({ unit, isEnemy: true, focusedId: unit.id, escape,
    portrait() { assert.fail('敌人不能冒用我方人物图'); },
  });
  assert.match(html, /&lt;img onerror=x>/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /aria-valuenow="0"/);
  assert.match(html, /0\/100/);
  assert.match(html, /cc-battle-unit dead/);
  assert.doesNotMatch(html, /enemy-clickable/);
  assert.match(html, /🐺/);
  assert.equal(unit.hp, -5);
});
