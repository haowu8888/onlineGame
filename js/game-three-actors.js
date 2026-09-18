import * as THREE from './vendor/three.module.js?v=35';
import { connection } from './game-three-resources.js?v=35';
import { PALETTE as P } from './game-three-palette.js?v=35';

const HALF_TURN = Math.PI;
const SKIN = 0xe5bea0;
const STYLES = Object.freeze({
  sword: { cloth: 0xe1e5dc, coat: 0x346174, trim: P.gold },
  healer: { cloth: 0xdae6d5, coat: 0x487764, trim: 0xbeb784 },
  mage: { cloth: 0xd7d5e3, coat: 0x716187, trim: 0xc4b293 },
  guard: { cloth: 0x435563, coat: 0x7e5749, trim: 0xd0b07a },
  sage: { cloth: 0xe7e3d2, coat: 0x376471, trim: 0xd4ad65 },
  enemy: { cloth: 0x50454e, coat: 0x9b594c, trim: 0xbb9c70 },
  fox: { cloth: 0xe4dce0, coat: 0xa67594, trim: 0xceba83 },
});

function styleFor(unit) {
  if (unit.side === 'enemy') return STYLES.enemy;
  if (/狐/.test(unit.name)) return STYLES.fox;
  if (/仙子|夫人|圣女/.test(unit.name)) return STYLES.mage;
  if (['healer', 'support', 'SUP'].includes(unit.role)) return STYLES.healer;
  if (['guard', 'tank', 'body', 'DEF'].includes(unit.role)) return STYLES.guard;
  if (['mage', 'talisman', '法修'].includes(unit.role)) return STYLES.mage;
  if (unit.role === 'sage') return STYLES.sage;
  return STYLES.sword;
}

function robes(resources, group, style) {
  group.add(resources.mesh({ kind: 'robe', color: style.cloth, size: [0.95, 1.4, 0.9], at: [0, 0.82, 0] }));
  group.add(resources.mesh({ kind: 'robe', color: style.coat, size: [1.01, 0.96, 0.78], at: [0, 1.02, -0.07] }));
  group.add(resources.mesh({ kind: 'robe', color: style.cloth, size: [0.49, 1.16, 0.25], at: [0, 0.97, 0.28] }));
  group.add(resources.mesh({ kind: 'cylinder', color: style.trim, size: [0.63, 0.07, 0.58], at: [0, 1.06, 0] }));
  for (const side of [-1, 1]) {
    group.add(connection(resources, { from: [side * 0.23, 1.48, 0.22], to: [0, 1.16, 0.35],
      color: style.trim, radius: 0.034 }));
    group.add(resources.mesh({ kind: 'robe', color: style.coat, size: [0.47, 0.77, 0.55],
      at: [side * 0.4, 1.05, 0.02], rotation: [0.12, 0, side * 0.38] }));
    group.add(resources.mesh({ kind: 'sphere', color: SKIN, size: [0.18, 0.2, 0.17], at: [side * 0.52, 0.75, 0.12] }));
    group.add(resources.mesh({ color: P.ink, size: [0.2, 0.17, 0.35], at: [side * 0.18, 0.1, 0.09] }));
    group.add(resources.mesh({ color: style.trim, size: [0.035, 0.66, 0.025],
      at: [side * 0.16, 0.67, 0.41], rotation: [0.14, 0, side * -0.12], shadow: false }));
  }
}

function face(resources, group, unit) {
  const hair = unit.age >= 60 || /药王|长老|老祖/.test(unit.name) ? 0xcdd1c9 : 0x26323c;
  group.add(resources.mesh({ kind: 'cylinder', color: SKIN, size: [0.16, 0.2, 0.16], at: [0, 1.56, 0] }));
  group.add(resources.mesh({ kind: 'sphere', color: SKIN, size: [0.43, 0.53, 0.4], at: [0, 1.84, 0] }));
  group.add(resources.mesh({ kind: 'sphere', color: hair, size: [0.46, 0.4, 0.42], at: [0, 1.99, -0.06] }));
  group.add(resources.mesh({ kind: 'sphere', color: hair, size: [0.23, 0.24, 0.23], at: [0, 2.22, -0.07] }));
  group.add(resources.mesh({ kind: 'robe', color: hair, size: [0.51, 0.68, 0.32], at: [0, 1.66, -0.19] }));
  for (const side of [-1, 1]) {
    group.add(resources.mesh({ kind: 'sphere', color: P.ink, size: [0.045, 0.028, 0.024],
      at: [side * 0.087, 1.86, 0.181], shadow: false }));
    group.add(resources.mesh({ color: P.gold, size: [0.026, 0.4, 0.025],
      at: [side * 0.12, 1.44, -0.26], rotation: [-0.2, 0, side * 0.2], shadow: false }));
  }
  group.add(resources.mesh({ color: P.gold, size: [0.35, 0.035, 0.06], at: [0, 2.18, -0.04] }));
  if (/狐/.test(unit.name)) addEars(resources, group);
}

function addEars(resources, group) {
  for (const side of [-1, 1]) {
    group.add(resources.mesh({ kind: 'cone', color: P.paper, size: [0.2, 0.38, 0.22],
      at: [side * 0.17, 2.18, 0], rotation: [0, 0, side * -0.25] }));
  }
}

function weapon(resources, group, style) {
  if (style === STYLES.healer || style === STYLES.mage || style === STYLES.sage) {
    group.add(resources.mesh({ kind: 'cylinder', color: P.bark, size: [0.065, 2.1, 0.065], at: [-0.6, 1.04, 0.14] }));
    group.add(resources.mesh({ kind: 'torus', color: style.trim, size: [0.17, 0.24, 0.17], at: [-0.6, 2.1, 0.14] }));
    group.add(resources.mesh({ kind: 'rock', color: P.jade, size: [0.15, 0.28, 0.15], at: [-0.6, 2.1, 0.14],
      material: { emissive: P.jade, emissiveIntensity: 0.6 } }));
    return;
  }
  group.add(resources.mesh({ color: 0xc8dad8, size: [0.11, 1.35, 0.065], at: [0.62, 1.27, 0.12],
    rotation: [0, 0, -0.12], material: { metalness: 0.7, roughness: 0.25 } }));
  group.add(resources.mesh({ color: style.trim, size: [0.37, 0.065, 0.16], at: [0.55, 0.78, 0.12] }));
  group.add(resources.mesh({ color: P.ink, size: [0.075, 0.25, 0.1], at: [0.54, 0.64, 0.12] }));
  if (style === STYLES.guard) {
    group.add(resources.mesh({ kind: 'sphere', color: style.trim, size: [0.58, 0.88, 0.18], at: [-0.5, 0.95, 0.32] }));
    group.add(resources.mesh({ kind: 'sphere', color: style.coat, size: [0.48, 0.76, 0.19], at: [-0.5, 0.95, 0.33] }));
  }
}

function beast(resources, unit) {
  const group = new THREE.Group();
  const color = /蛇|蟒/.test(unit.name) ? 0x506e5b : 0x7d7370;
  group.add(resources.mesh({ kind: 'sphere', color, size: [0.95, 0.7, 1.5], at: [0, 0.66, -0.1] }));
  group.add(resources.mesh({ kind: 'rock', color, size: [0.8, 0.75, 0.9], at: [0, 1, 0.6] }));
  group.add(resources.mesh({ kind: 'sphere', color: 0xa1927b, size: [0.4, 0.23, 0.5], at: [0, 0.89, 0.96] }));
  for (const side of [-1, 1]) {
    group.add(resources.mesh({ kind: 'cone', color: P.ink, size: [0.18, 0.47, 0.22],
      at: [side * 0.27, 1.41, 0.5], rotation: [0.3, 0, side * -0.2] }));
    group.add(resources.mesh({ kind: 'sphere', color: P.gold, size: [0.1, 0.075, 0.06], at: [side * 0.24, 1.11, 0.93],
      material: { emissive: P.coral, emissiveIntensity: 0.8 }, shadow: false }));
    for (const z of [-0.6, 0.45]) group.add(resources.mesh({ kind: 'robe', color,
      size: [0.36, 0.65, 0.43], at: [side * 0.33, 0.33, z] }));
  }
  return group;
}

function createActor(resources, unit) {
  if (unit.side === 'enemy' && /兽|狼|蟒|虎|蛇/.test(unit.name)) return beast(resources, unit);
  const group = new THREE.Group();
  const style = styleFor(unit);
  robes(resources, group, style);
  face(resources, group, unit);
  weapon(resources, group, style);
  return group;
}

export function actor(resources, unit) {
  const style = Object.keys(STYLES).find(key => STYLES[key] === styleFor(unit));
  const beastKind = unit.side === 'enemy' && /兽|狼|蟒|虎|蛇/.test(unit.name);
  const elder = unit.age >= 60 || /药王|长老|老祖/.test(unit.name);
  const key = ['figure', style, beastKind, /蛇|蟒/.test(unit.name), /狐/.test(unit.name), elder].join(':');
  const group = resources.model(key, () => createActor(resources, unit));
  if (unit.role === 'boss') group.scale.setScalar(1.2);
  else if (unit.age !== undefined && unit.age < 16) group.scale.setScalar(0.75);
  group.rotation.y = unit.side === 'enemy' ? HALF_TURN : 0;
  return group;
}
