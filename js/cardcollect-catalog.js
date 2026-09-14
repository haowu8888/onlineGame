/* 仙卡录角色目录：保留卡池顺序，供收集与对战共用。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CardCollectCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const characters = Object.freeze([
    // 凡 (12)
    { id: 1, name: '散修弟子', quality: '凡', role: 'ATK', atk: 30, hp: 100, skillName: '基础剑击', skillDesc: '攻击1个敌人', skillType: 'single' },
    { id: 2, name: '山野猎人', quality: '凡', role: 'ATK', atk: 35, hp: 90, skillName: '连射', skillDesc: '攻击2次，每次60%伤害', skillType: 'double' },
    { id: 3, name: '村庄守卫', quality: '凡', role: 'DEF', atk: 20, hp: 150, skillName: '坚守', skillDesc: '减少全队受到伤害10%', skillType: 'teamDef' },
    { id: 4, name: '草药师', quality: '凡', role: 'SUP', atk: 15, hp: 120, skillName: '回春', skillDesc: '治疗血量最低的队友20%最大生命', skillType: 'healLowest' },
    { id: 5, name: '符箓学徒', quality: '凡', role: 'ATK', atk: 28, hp: 110, skillName: '灵符', skillDesc: '攻击敌人，20%几率眩晕', skillType: 'singleStun' },
    { id: 6, name: '采药童子', quality: '凡', role: 'SUP', atk: 18, hp: 130, skillName: '百草', skillDesc: '治疗全队8%最大生命', skillType: 'healAll' },
    { id: 7, name: '灵兽幼崽', quality: '凡', role: 'ATK', atk: 32, hp: 95, skillName: '撕咬', skillDesc: '攻击无视20%防御', skillType: 'armorPen' },
    { id: 8, name: '铁匠学徒', quality: '凡', role: 'DEF', atk: 22, hp: 140, skillName: '铁壁', skillDesc: '获得15%最大生命护盾', skillType: 'selfShield' },
    { id: 9, name: '书生', quality: '凡', role: 'SUP', atk: 20, hp: 115, skillName: '鼓舞', skillDesc: '提升全队攻击力10%持续2回合', skillType: 'atkBuff' },
    { id: 10, name: '乞丐', quality: '凡', role: 'ATK', atk: 38, hp: 80, skillName: '脏拳', skillDesc: '攻击敌人，30%几率中毒', skillType: 'singlePoison' },
    { id: 11, name: '护院', quality: '凡', role: 'DEF', atk: 25, hp: 135, skillName: '格挡', skillDesc: '格挡下一次攻击', skillType: 'block' },
    { id: 12, name: '小道士', quality: '凡', role: 'SUP', atk: 16, hp: 125, skillName: '祈福', skillDesc: '治疗自身25%最大生命', skillType: 'healSelf' },
    // 灵 (10)
    { id: 13, name: '剑修弟子', quality: '灵', role: 'ATK', atk: 50, hp: 150, skillName: '剑气斩', skillDesc: '对单体造成高额伤害', skillType: 'heavySingle' },
    { id: 14, name: '体修弟子', quality: '灵', role: 'DEF', atk: 35, hp: 250, skillName: '金刚体', skillDesc: '大幅提升自身防御', skillType: 'selfDefBig' },
    { id: 15, name: '丹修弟子', quality: '灵', role: 'SUP', atk: 30, hp: 180, skillName: '灵丹', skillDesc: '治疗全队15%最大生命', skillType: 'healAllMid' },
    { id: 16, name: '符修弟子', quality: '灵', role: 'ATK', atk: 45, hp: 160, skillName: '五雷符', skillDesc: '对全体敌人造成伤害', skillType: 'aoe' },
    { id: 17, name: '灵兽师', quality: '灵', role: 'ATK', atk: 48, hp: 155, skillName: '召唤灵兽', skillDesc: '召唤灵兽额外攻击一次', skillType: 'extraAttack' },
    { id: 18, name: '阵法师', quality: '灵', role: 'SUP', atk: 32, hp: 190, skillName: '护阵', skillDesc: '全队获得10%最大生命护盾', skillType: 'teamShield' },
    { id: 19, name: '御剑弟子', quality: '灵', role: 'ATK', atk: 55, hp: 140, skillName: '御剑术', skillDesc: '攻击2个随机敌人', skillType: 'randomTwo' },
    { id: 20, name: '毒修弟子', quality: '灵', role: 'ATK', atk: 42, hp: 165, skillName: '蛊毒', skillDesc: '使全体敌人中毒', skillType: 'poisonAll' },
    { id: 21, name: '铸器师', quality: '灵', role: 'DEF', atk: 38, hp: 220, skillName: '灵甲', skillDesc: '提升全队防御15%', skillType: 'teamDefBig' },
    { id: 22, name: '医修弟子', quality: '灵', role: 'SUP', atk: 28, hp: 200, skillName: '济世', skillDesc: '复活1个阵亡队友并恢复30%生命', skillType: 'revive' },
    // 仙 (6)
    { id: 23, name: '剑仙', quality: '仙', role: 'ATK', atk: 80, hp: 220, skillName: '万剑归宗', skillDesc: '对全体敌人造成大量伤害', skillType: 'aoeBig' },
    { id: 24, name: '雷法真人', quality: '仙', role: 'ATK', atk: 75, hp: 230, skillName: '九天雷罚', skillDesc: '对单体造成巨额伤害并眩晕', skillType: 'heavyStun' },
    { id: 25, name: '太乙真人', quality: '仙', role: 'SUP', atk: 50, hp: 300, skillName: '太乙真气', skillDesc: '治疗全队25%最大生命', skillType: 'healAllBig' },
    { id: 26, name: '金刚尊者', quality: '仙', role: 'DEF', atk: 60, hp: 400, skillName: '不动明王', skillDesc: '嘲讽敌人并大幅提升防御', skillType: 'taunt' },
    { id: 27, name: '天狐仙子', quality: '仙', role: 'ATK', atk: 85, hp: 200, skillName: '魅惑', skillDesc: '魅惑敌人使其跳过回合并造成伤害', skillType: 'charm' },
    { id: 28, name: '药王', quality: '仙', role: 'SUP', atk: 55, hp: 280, skillName: '仙丹', skillDesc: '治疗全队+驱散负面+提升攻击力', skillType: 'healCleanseBuff' },
    // 圣 (2)
    { id: 29, name: '剑尊', quality: '圣', role: 'ATK', atk: 120, hp: 350, skillName: '一剑破万法', skillDesc: '对单体造成毁灭伤害并溅射全体', skillType: 'devastate' },
    { id: 30, name: '仙帝', quality: '圣', role: 'SUP', atk: 80, hp: 500, skillName: '天道轮回', skillDesc: '全队满血+复活所有+提升攻击力', skillType: 'ultimate' },
    { id: 31, name: '天机真人', quality: '仙', role: 'SUP', atk: 60, hp: 260, skillName: '天机妙术', skillDesc: '提升全队攻击力15%持续2回合', skillType: 'atkBuff' },
  ].map(character => Object.freeze(character)));
  const byId = Object.freeze(Object.fromEntries(characters.map(character => [character.id, character])));
  return Object.freeze({ characters, byId });
});
