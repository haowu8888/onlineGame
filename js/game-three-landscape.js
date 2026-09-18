import * as THREE from './vendor/three.module.js?v=35';
import { PALETTE as P } from './game-three-palette.js?v=35';

const RIDGES = [[-13, -13, 11, 6], [-8, -15, 13, 6], [-3, -16, 9, 5],
  [4, -15, 12, 5], [10, -14, 10, 6], [16, -12, 11, 6]];
const MOUNTAIN = Object.freeze({ width: 54, depth: 20, columns: 100, rows: 36, offsetZ: -17 });

function mountains(resources, theme, own) {
  const geometry = own(new THREE.PlaneGeometry(MOUNTAIN.width, MOUNTAIN.depth, MOUNTAIN.columns, MOUNTAIN.rows));
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, MOUNTAIN.offsetZ);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  const low = new THREE.Color(theme.ground);
  const high = new THREE.Color(theme.sky);
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), z = positions.getZ(index);
    let height = 0;
    for (const [cx, cz, peak, spread] of RIDGES) {
      const distance = ((x - cx) / spread) ** 2 + ((z - cz) / (spread * 0.8)) ** 2;
      height = Math.max(height, peak * Math.exp(-distance * 1.4));
    }
    const texture = Math.sin(x * 2.8 + z * 1.3) * Math.sin(z * 2.3) * 0.14;
    positions.setY(index, height + texture - 0.6);
    color.copy(low).lerp(high, 0.15 + height / 30);
    colors.set([color.r, color.g, color.b], index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, resources.material(0xffffff, { vertexColors: true, roughness: 1 }));
}

// 山体几何是每个布景独有的，交给 own 回调登记，布景重建时随之释放；材质仍由场景共享。
export function landscape(resources, theme, own = resource => resources.own(resource)) {
  const group = new THREE.Group();
  const water = resources.mesh({ kind: 'cylinder', color: theme.sky,
    size: [75, 0.12, 65], at: [0, -3.7, -8], shadow: false,
    material: { roughness: 0.45, metalness: 0.22 } });
  group.add(water);
  group.add(mountains(resources, theme, own));
  return group;
}

export function terrace(resources, options) {
  const { width, depth, color } = options;
  const group = new THREE.Group();
  group.add(resources.mesh({ color: P.pine, size: [width, 0.26, depth], at: [0, -0.18, 0] }));
  group.add(resources.mesh({ color, size: [width - 0.2, 0.1, depth - 0.2], at: [0, -0.015, 0] }));
  const line = new THREE.Color(color).multiplyScalar(0.87).getHex();
  for (let x = -6; x <= 6; x += 2) {
    group.add(resources.mesh({ color: line, size: [0.018, 0.012, depth - 0.25], at: [x, 0.045, 0], shadow: false }));
  }
  const rows = Math.floor((depth - 1) / 2);
  for (let z = -rows; z <= rows; z += 2) {
    group.add(resources.mesh({ color: line, size: [width - 0.25, 0.012, 0.018], at: [0, 0.045, z], shadow: false }));
  }
  return group;
}

export function lantern(resources, { x, z }) {
  const group = new THREE.Group();
  group.add(resources.mesh({ kind: 'cylinder', color: P.stone, size: [0.58, 0.18, 0.58], at: [0, 0.1, 0] }));
  group.add(resources.mesh({ kind: 'cylinder', color: P.paper, size: [0.19, 0.63, 0.19], at: [0, 0.48, 0] }));
  group.add(resources.mesh({ color: P.gold, size: [0.34, 0.42, 0.34], at: [0, 0.94, 0],
    material: { emissive: P.gold, emissiveIntensity: 0.6 } }));
  group.add(resources.mesh({ kind: 'roof', color: P.pine, size: [0.65, 0.75, 0.65],
    at: [0, 1.16, 0], material: { side: THREE.DoubleSide } }));
  group.position.set(x, 0, z);
  return group;
}
