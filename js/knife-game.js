import { CFG, DIFF, TERRAINS } from './knife-data.js?v=38';
import { Player } from './knife-entities.js?v=38';
import { Enemy } from './knife-enemy.js?v=38';
import { Projectile, Pickup, DmgText } from './knife-effects.js?v=38';
import { KnifeMetaProgress } from './knife-meta.js?v=38';
import { RunMethods } from './knife-run.js?v=38';
import { SpawningMethods } from './knife-spawning.js?v=38';
import { UpgradeMethods } from './knife-upgrades.js?v=38';
import { SkillMethods } from './knife-skills.js?v=38';
import { CombatMethods } from './knife-combat.js?v=38';
import { BossMethods } from './knife-boss.js?v=38';
import { DropMethods } from './knife-drops.js?v=38';
import { FeedbackMethods } from './knife-feedback.js?v=38';
import { WorldMethods } from './knife-world.js?v=38';
import { FrameMethods } from './knife-frame.js?v=38';

export { CFG, CHALLENGE_MODIFIERS, META_MILESTONES, PERM_UPGRADES, getPermUpgradeCost } from './knife-data.js?v=38';
export const MetaProgress = new KnifeMetaProgress({
  get: (...args) => Storage.get(...args),
  setManyImmediate: values => Storage.setManyImmediate(values),
});

function entityFactory(random) {
  return {
    player: ({ x, y }) => new Player(x, y, random),
    enemy: options => new Enemy({ ...options, random }),
    projectile: options => new Projectile(options),
    pickup: options => new Pickup({ ...options, random }),
    text: options => new DmgText(options),
  };
}

/* 此入口组合浏览器服务；模拟方法只使用实例上注入的依赖。 */
export class Game {
  constructor(options = {}) {
    Object.assign(this, RunMethods, SpawningMethods, UpgradeMethods, SkillMethods, CombatMethods,
      BossMethods, DropMethods, FeedbackMethods, WorldMethods, FrameMethods);
    this.storage = options.storage ?? Storage;
    this.metaProgress = options.metaProgress ?? (options.storage ? new KnifeMetaProgress(options.storage) : MetaProgress);
    this.achievements = options.achievements ?? CrossGameAchievements;
    this.rewards = options.rewards ?? CrossGameRewards;
    this.sound = options.sound ?? SoundManager;
    this.notify = options.notify ?? showToast;
    this.obstacles = options.obstacles ?? [];
    this.random = options.random ?? Math.random;
    this.entities = options.entities ?? entityFactory(this.random);
    Object.assign(this, { state: 'menu', player: null, keys: {}, joyDir: null, diff: DIFF.normal,
      activeModifiers: [], terrain: TERRAINS[0], _enemySpeedMul: 1, _noUpgrade: false, _bossRush: false,
      enemies: [], projectiles: [], pickups: [], particles: [], dmgTexts: [], skills: [],
      goldPickups: [], swordQiProjectiles: [], chests: [], hazards: [], bladeTrails: [], dashTrails: [],
      impacts: [], impactPower: 0, impactAngle: 0, impactSound: 0 });
  }

  setDifficulty(name) {
    if (!Object.hasOwn(DIFF, name)) throw new RangeError(`未知游戏难度：${name}`);
    this.diff = DIFF[name];
  }

  rnd(minimum, maximum) {
    return minimum + this.random() * (maximum - minimum);
  }

  pick(values) {
    return values[Math.floor(this.random() * values.length)];
  }

  shuffle(values) {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(this.random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return shuffled;
  }
}
