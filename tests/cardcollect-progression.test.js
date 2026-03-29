const assert = require('node:assert/strict');

const {
  getCompensationBuffPct,
  grantTeamExp,
  resolveAutoEquipDrop,
} = require('../js/cardcollect-progression.js');

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('连续失败补偿按 6% 递增并封顶 36%', () => {
  assert.equal(getCompensationBuffPct(1), 0);
  assert.equal(getCompensationBuffPct(2), 12);
  assert.equal(getCompensationBuffPct(7), 36);
});

run('队伍经验结算会升级并清空满级角色经验', () => {
  const owned = {
    1: { level: 1, exp: 40 },
    2: { level: 30, exp: 20 },
    3: { level: 3, exp: 10 },
  };
  const result = grantTeamExp({
    team: [1, 2, null, 9],
    owned,
    expGain: 20,
    maxLevel: 30,
    expForLevel(level) {
      return level * 50;
    },
  });

  assert.notStrictEqual(result, owned);
  assert.deepEqual(result[1], { level: 2, exp: 10 });
  assert.deepEqual(result[2], { level: 30, exp: 0 });
  assert.deepEqual(result[3], owned[3]);
});

run('自动装备会替换收益最高的队友并返还旧装备', () => {
  const result = resolveAutoEquipDrop({
    equip: { id: 'w2', slot: 'weapon', atk: 20, hp: 0 },
    team: [101, 102],
    owned: {
      101: { level: 10, exp: 0 },
      102: { level: 12, exp: 0 },
    },
    equipment: {
      101: { weapon: 'w1' },
      102: { weapon: 'w0' },
    },
    equipInventory: ['a1'],
    equipMap: {
      w0: { id: 'w0', slot: 'weapon', atk: 18, hp: 0 },
      w1: { id: 'w1', slot: 'weapon', atk: 8, hp: 0 },
      w2: { id: 'w2', slot: 'weapon', atk: 20, hp: 0 },
    },
  });

  assert.equal(result.equipped, true);
  assert.equal(result.targetId, 101);
  assert.equal(result.replacedId, 'w1');
  assert.deepEqual(result.nextEquipment[101], { weapon: 'w2' });
  assert.deepEqual(result.nextEquipment[102], { weapon: 'w0' });
  assert.deepEqual(result.nextInventory, ['a1', 'w1']);
});
