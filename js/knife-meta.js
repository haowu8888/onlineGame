import { META_MILESTONES, PERM_UPGRADES, getPermUpgradeCost } from './knife-data.js?v=38';

export class KnifeMetaProgress {
  constructor(storage) {
    this.storage = storage;
    this._key = 'knife_meta_progress';
  }

  load() {
    return { kills: 0, maxWave: 0, gamesPlayed: 0, unlocked: [], gold: 0, permLevels: {}, ...this.storage.get(this._key, {}) };
  }

  save(data) {
    return this.storage.setManyImmediate({ [this._key]: data });
  }

  addGold(amount) {
    const data = this.load();
    const gold = data.gold + amount;
    this.save({ ...data, gold });
    return gold;
  }

  getGold() {
    return this.load().gold;
  }

  getPermLevel(id) {
    return this.load().permLevels[id] ?? 0;
  }

  buyPermUpgrade(id) {
    const upgrade = PERM_UPGRADES.find(item => item.id === id);
    if (!upgrade) return false;
    const data = this.load();
    const level = data.permLevels[id] ?? 0;
    if (level >= upgrade.maxLv) return false;
    const cost = getPermUpgradeCost(upgrade, level);
    if (data.gold < cost) return false;
    this.save({ ...data, gold: data.gold - cost, permLevels: { ...data.permLevels, [id]: level + 1 } });
    return true;
  }

  recordGame(kills, wave) {
    const data = this.load();
    const next = { ...data, kills: data.kills + kills, maxWave: Math.max(data.maxWave, wave), gamesPlayed: data.gamesPlayed + 1 };
    const additions = META_MILESTONES.filter(item => !data.unlocked.includes(item.id) && next[item.stat] >= item.target);
    this.save({ ...next, unlocked: [...data.unlocked, ...additions.map(item => item.id)] });
    return additions;
  }

  getStartBonuses() {
    const unlocked = new Set(this.load().unlocked);
    const bonuses = { startHp: 0, startDmg: 0, speedMult: 1, pickupRange: 0, startSkill: null };
    for (const milestone of META_MILESTONES) {
      if (!unlocked.has(milestone.id)) continue;
      const bonus = milestone.bonus;
      bonuses.startHp += bonus.startHp ?? 0;
      bonuses.startDmg += bonus.startDmg ?? 0;
      bonuses.speedMult *= bonus.speedMult ?? 1;
      bonuses.pickupRange += bonus.pickupRange ?? 0;
      bonuses.startSkill = bonus.startSkill ?? bonuses.startSkill;
    }
    return bonuses;
  }
}
