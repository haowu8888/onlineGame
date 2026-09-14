import { BLESSINGS, UPGRADES } from './knife-data.js?v=33';

export const UpgradeMethods = {
  _triggerBlessingChoice() {
    const pool = BLESSINGS.filter(b => !b.unique || !(this._blessingsTaken && this._blessingsTaken[b.id]));
    if (pool.length === 0) return;
    const choices = [];
    const copy = [...pool];
    while (choices.length < 3 && copy.length > 0) {
      const idx = Math.floor(this.random() * copy.length);
      choices.push(copy.splice(idx, 1)[0]);
    }
    this.pendingBlessings = choices;
    if (this.pendingBlessings.length > 0) {
      this.state = 'blessing';
    }
  },

  applyBlessing(index) {
    const blessing = this.pendingBlessings[index];
    if (!blessing) return false;
    blessing.apply(this);
    this._blessingsTaken[blessing.id] = (this._blessingsTaken[blessing.id] ?? 0) + 1;
    this.pendingBlessings = [];
    this.state = 'playing';
    return true;
  },

  triggerUpgrade() {
    if (this._noUpgrade) return;
    this.upgradeQueue++;
    if (this.state !== 'upgrading') this._prepareNextUpgrade();
  },

  _prepareNextUpgrade() {
    if (this.upgradeQueue <= 0) { this.state = 'playing'; return; }
    this.upgradeQueue--;
    const available = UPGRADES.filter(item => (this.player.upgradeCounts[item.id] ?? 0) < item.max);
    if (!available.length) { this.upgradeQueue = 0; this.state = 'playing'; return; }
    const shuffled = this.shuffle(available);
    this.pendingUpgrades = shuffled.slice(0, 3);
    this.ensureEarlySkill();
    this.state = 'upgrading';
  },

  ensureEarlySkill() {
    if (this.player.level > 3 || this.skills.some(skill => skill.unlocked)) return;
    if (this.pendingUpgrades.some(upgrade => upgrade.id.startsWith('skill_'))) return;
    const available = UPGRADES.filter(upgrade => upgrade.id.startsWith('skill_')
      && (this.player.upgradeCounts[upgrade.id] ?? 0) < upgrade.max);
    if (available.length) this.pendingUpgrades[this.pendingUpgrades.length - 1] = this.pick(available);
  },

  applyUpgrade(index) {
    const upgrade = this.pendingUpgrades[index];
    if (!upgrade) return false;
    upgrade.effect(this.player, this);
    this.player.upgradeCounts[upgrade.id] = (this.player.upgradeCounts[upgrade.id] ?? 0) + 1;
    this.pendingUpgrades = [];
    this._prepareNextUpgrade();
    return true;
  },
};
