import { KnifeArena } from './knife-three.js?v=33';
import { KnifeUI } from './knife-ui.js?v=33';
import { sceneryObstacles } from './knife-scenery.js?v=33';
import { Game, MetaProgress, META_MILESTONES, CHALLENGE_MODIFIERS,
  PERM_UPGRADES, getPermUpgradeCost } from './knife-game.js?v=33';

initNav('knife');

const renderer = new KnifeArena({
  canvas: document.getElementById('knife-canvas'),
  labels: document.getElementById('knife-labels'),
});
const interfaceView = new KnifeUI({
  game: new Game({ obstacles: sceneryObstacles({ x: 0, y: 0 }) }), renderer, progress: MetaProgress,
  milestones: META_MILESTONES, modifiers: CHALLENGE_MODIFIERS,
  upgrades: PERM_UPGRADES, upgradeCost: getPermUpgradeCost,
});

// 只读诊断供开发检查；不暴露可修改战斗结果的调试入口。
export function getSnapshot() {
  return interfaceView.snapshot();
}
