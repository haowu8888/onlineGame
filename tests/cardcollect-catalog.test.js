'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const catalog = require('../js/cardcollect-catalog.js');

const CHARACTER_COUNT = 31;
const EXPECTED_QUALITY_COUNTS = { '凡': 12, '灵': 10, '仙': 7, '圣': 2 };
const CATALOG_PATH = join(__dirname, '../js/cardcollect-catalog.js');

test('角色目录保留连续的 1 至 31 号，编号和名称均唯一', () => {
  const ids = catalog.characters.map(character => character.id);
  const names = catalog.characters.map(character => character.name);
  const expectedIds = Array.from({ length: CHARACTER_COUNT }, (_, index) => index + 1);

  assert.deepEqual(ids, expectedIds);
  assert.equal(new Set(ids).size, CHARACTER_COUNT);
  assert.equal(new Set(names).size, CHARACTER_COUNT);
  assert.ok(names.every(name => typeof name === 'string' && name.trim().length > 0));
});

test('品质分布保留凡 12、灵 10、仙 7、圣 2，天机真人仍为仙品辅助', () => {
  const counts = catalog.characters.reduce((result, character) => ({
    ...result,
    [character.quality]: (result[character.quality] || 0) + 1,
  }), {});

  assert.deepEqual(counts, EXPECTED_QUALITY_COUNTS);
  assert.deepEqual(catalog.byId[31], {
    id: 31, name: '天机真人', quality: '仙', role: 'SUP', atk: 60, hp: 260,
    skillName: '天机妙术', skillDesc: '提升全队攻击力15%持续2回合', skillType: 'atkBuff',
  });
});

test('编号索引完整且直接引用目录条目，未知编号不会返回角色', () => {
  assert.equal(Object.keys(catalog.byId).length, CHARACTER_COUNT);
  for (const character of catalog.characters) {
    assert.strictEqual(catalog.byId[character.id], character);
    assert.strictEqual(catalog.byId[String(character.id)], character);
  }
  assert.equal(catalog.byId[0], undefined);
  assert.equal(catalog.byId[CHARACTER_COUNT + 1], undefined);
});

test('导出对象、角色数组、每个角色和编号索引均被冻结且拒绝写入', () => {
  const before = JSON.stringify(catalog);
  const frozenObjects = [catalog, catalog.characters, catalog.byId, ...catalog.characters];
  assert.ok(frozenObjects.every(value => Object.isFrozen(value)));

  assert.throws(() => { catalog.characters = []; }, TypeError);
  assert.throws(() => { catalog.characters.push(catalog.characters[0]); }, TypeError);
  assert.throws(() => { catalog.characters[0] = null; }, TypeError);
  assert.throws(() => { catalog.characters[0].name = '被覆盖的角色'; }, TypeError);
  assert.throws(() => { catalog.byId[1] = null; }, TypeError);
  assert.throws(() => { delete catalog.byId[1]; }, TypeError);
  assert.equal(JSON.stringify(catalog), before);
});

test('无 CommonJS 的浏览器环境通过 CardCollectCatalog 导出相同的冻结目录', () => {
  const browser = {};
  browser.window = browser;
  vm.runInNewContext(readFileSync(CATALOG_PATH, 'utf8'), browser, { filename: CATALOG_PATH });

  const exported = browser.CardCollectCatalog;
  assert.ok(exported);
  assert.equal(JSON.stringify(exported), JSON.stringify(catalog));
  assert.ok([exported, exported.characters, exported.byId, ...exported.characters]
    .every(value => Object.isFrozen(value)));
  for (const character of exported.characters) {
    assert.strictEqual(exported.byId[character.id], character);
  }
});
