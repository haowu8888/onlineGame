import * as THREE from './vendor/three.module.js?v=35';
import { PALETTE as P } from './game-three-palette.js?v=35';

const QUARTER_TURN = Math.PI / 2;

export function tree(resources, options = {}) {
  const { color = P.leaf, scale = 1, x = 0, z = 0, crown = 'sphere' } = options;
  const group = new THREE.Group();
  group.add(resources.mesh({ kind: 'cylinder', color: P.bark, size: [0.21, 2.5, 0.21],
    at: [0.12, 1.15, 0], rotation: [0, 0, -0.16] }));
  const crowns = [[-0.72, 1.85, 0.15, 1.65], [0.74, 2.1, -0.05, 1.8],
    [-0.48, 2.65, -0.15, 1.55], [0.45, 3.05, 0, 1.35], [0, 3.5, -0.1, 0.95]];
  crowns.forEach(([cx, cy, cz, width], index) => {
    const tone = new THREE.Color(color).multiplyScalar(0.84 + index * 0.055).getHex();
    group.add(resources.mesh({ kind: crown, color: tone, size: [width, width * 0.43, width * 0.85],
      at: [cx, cy, cz], rotation: [0, index * 0.7, 0] }));
    group.add(resources.mesh({ kind: crown, color: tone, size: [width * 0.7, width * 0.4, width * 0.6],
      at: [cx - 0.2, cy + 0.1, cz + 0.18] }));
    group.add(resources.mesh({ kind: 'cylinder', color: P.bark, size: [0.07, Math.abs(cx) + 0.4, 0.07],
      at: [cx * 0.45, cy - 0.12, cz], rotation: [0, 0, cx > 0 ? -0.9 : 0.9] }));
  });
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}

export function pavilion(resources, options = {}) {
  const { x = 0, z = 0, scale = 1, roof = P.pine } = options;
  const group = new THREE.Group();
  group.add(resources.mesh({ color: P.stone, size: [3.1, 0.18, 2.7], at: [0, 0.06, 0] }));
  group.add(resources.mesh({ color: P.paper, size: [2.9, 0.2, 2.45], at: [0, 0.22, 0] }));
  for (const px of [-1.1, 1.1]) for (const pz of [-0.85, 0.85]) {
    group.add(resources.mesh({ kind: 'cylinder', color: 0x765149, size: [0.13, 2, 0.13], at: [px, 1.2, pz] }));
    group.add(resources.mesh({ kind: 'cylinder', color: P.paper, size: [0.27, 0.14, 0.27], at: [px, 0.4, pz] }));
  }
  group.add(resources.mesh({ color: P.bark, size: [2.55, 0.16, 2], at: [0, 2.18, 0] }));
  group.add(resources.mesh({ kind: 'roof', color: roof, size: [3.2, 1.5, 3], at: [0, 2.25, 0],
    material: { side: THREE.DoubleSide } }));
  group.add(resources.mesh({ kind: 'roof', color: P.gold, size: [3.28, 1.5, 3.08], at: [0, 2.21, 0],
    material: { side: THREE.DoubleSide } }));
  group.add(resources.mesh({ kind: 'cylinder', color: P.ink, size: [0.09, 1.78, 0.09],
    at: [0, 2.97, 0], rotation: [0, 0, QUARTER_TURN] }));
  for (const side of [-1, 1]) {
    group.add(resources.mesh({ kind: 'sphere', color: P.gold, size: [0.19, 0.3, 0.19], at: [side * 0.95, 1.86, 0.88],
      material: { emissive: P.gold, emissiveIntensity: 0.65 }, shadow: false }));
  }
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}

export function pagoda(resources, options = {}) {
  const group = new THREE.Group();
  const floors = 4;
  for (let floor = 0; floor < floors; floor++) {
    const width = 2.6 - floor * 0.36;
    const y = floor * 1.05;
    group.add(resources.mesh({ color: P.coral, size: [width * 0.6, 0.8, width * 0.6], at: [0, y + 0.4, 0] }));
    group.add(resources.mesh({ kind: 'roof', color: P.ink, size: [width, 1.2, width],
      at: [0, y + 0.84, 0], material: { side: THREE.DoubleSide } }));
    group.add(resources.mesh({ kind: 'roof', color: P.gold, size: [width + 0.08, 1.2, width + 0.08],
      at: [0, y + 0.81, 0], material: { side: THREE.DoubleSide } }));
    group.add(resources.mesh({ color: P.gold, size: [0.14, 0.4, 0.05], at: [0, y + 0.4, width * 0.31] }));
  }
  group.position.set(options.x || 0, 0, options.z || 0);
  group.scale.setScalar(options.scale || 1);
  return group;
}

export function island(resources, options = {}) {
  const { width = 15, depth = 12, color = P.stone } = options;
  const group = new THREE.Group();
  group.add(resources.mesh({ kind: 'cylinder', color, size: [width * 5, 0.35, depth * 5], at: [0, -0.18, 0] }));
  group.add(resources.mesh({ kind: 'cylinder', color: P.pine, size: [width * 4.8, 1.45, depth * 4.8], at: [0, -0.93, 0] }));
  for (let index = 0; index < 9; index++) {
    const angle = index / 9 * Math.PI * 2;
    group.add(resources.mesh({ kind: 'rock', color: index % 2 ? P.stone : P.pine,
      size: [2.1, 2.8 + index % 3, 2],
      at: [Math.cos(angle) * width * 0.7, -1.95, Math.sin(angle) * depth * 0.6],
      rotation: [0.2, angle, 0.15], material: { flatShading: true } }));
  }
  return group;
}

export function halo(resources, options = {}) {
  const { radius = 1, color = P.jade, y = 0.055 } = options;
  return resources.mesh({ kind: 'torus', color, at: [0, y, 0],
    size: [radius, radius, 1], rotation: [QUARTER_TURN, 0, 0],
    material: { emissive: color, emissiveIntensity: 0.6 }, shadow: false });
}
