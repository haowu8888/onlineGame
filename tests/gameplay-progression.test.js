const assert = require('node:assert/strict');
const check = require('node:test');
const { loadGame } = require('./fixtures/game-runtime');

const life = loadGame({ file: 'lifesim.js', entry: '  // --- 初始化 ---', exports: '{ LifeSimGame }' });
check('仙途模拟器：转运符实际增加 luk 3 点，不创建无效 luck 属性', () => {
  const attrs = { str: 4, int: 4, cha: 4, luk: 4, spr: 4 };
  const baseline = new life.api.LifeSimGame();
  baseline.createCharacter('基准角色', attrs, []);
  life.storage.setImmediate('xianyuan_lifesim_bonuses', { luck: 3 });
  const boosted = new life.api.LifeSimGame();
  boosted.createCharacter('幸运角色', attrs, []);
  assert.equal(boosted.data.attrs.luk, baseline.data.attrs.luk + 3);
  assert.equal(boosted.getAttrWithTalent('luk'), baseline.getAttrWithTalent('luk') + 3);
  assert.equal(Object.hasOwn(boosted.data.attrs, 'luck'), false);
  assert.equal(attrs.luk, 4);
});
const collect = loadGame({
  file: 'cardcollect.js', entry: "  if (document.readyState === 'loading')",
  exports: '{ executeSkill, getCharData, setBattle(value) { battleState = value; } }',
});
function beastUnit() {
  return { ...collect.api.getCharData(17), id: 'a_17', maxHp: 155, alive: true, shield: 0, energy: 0 };
}
function enemy(id, hp) { return { id, name: id, hp, maxHp: hp, atk: 10, def: 0, alive: true, shield: 0 }; }
check('仙卡录：灵兽师正常追击最低血量的存活敌人', () => {
  const unit = beastUnit();
  const targets = [enemy('甲', 100), enemy('乙', 200)];
  const battle = { log: [] };
  collect.api.setBattle(battle);
  collect.api.executeSkill(unit, [unit], targets);
  assert.equal(targets[0].hp, 100 - unit.atk - Math.floor(unit.atk * 0.7));
  assert.equal(targets[1].hp, 200);
  assert.ok(battle.log.some(entry => entry.text.includes('灵兽追击')));
});
check('仙卡录：首击击杀目标后，追击切换到下一名存活敌人', () => {
  const unit = beastUnit();
  const targets = [enemy('甲', 1), enemy('乙', 200)];
  collect.api.setBattle({ log: [] });
  collect.api.executeSkill(unit, [unit], targets);
  assert.equal(targets[0].alive, false);
  assert.equal(targets[1].hp, 200 - Math.floor(unit.atk * 0.7));
});
check('仙卡录：首击清场不会空数组归约报错，也会恢复大招临时攻击值', () => {
  const unit = { ...beastUnit(), ultReady: true };
  const initialAttack = unit.atk;
  const targets = [enemy('最后敌人', 1)];
  collect.api.setBattle({ log: [] });
  collect.api.executeSkill(unit, [unit], targets);
  assert.equal(targets[0].alive, false);
  assert.equal(unit.atk, initialAttack);
});
