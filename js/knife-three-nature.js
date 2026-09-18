import * as THREE from './vendor/three.module.js?v=35';
import { SCENERY } from './knife-scenery.js?v=35';

const RED_LEAVES = [0xa7473b, 0xc36748, 0xd99a5b, 0xb9563f, 0xdea975];
const PINE_LEAVES = [0x315e52, 0x437764, 0x719471];
const CROWNS = [[-0.8, 3, 0.2, 1.5], [0.9, 3.2, 0.1, 1.45], [0, 4.1, -0.2, 1.5], [-1.2, 3.8, -0.1, 1], [1.1, 4.1, -0.2, 1.05]];

function instances({ geometry, items, material, shadow = true }) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  items.forEach((item, index) => {
    transform.position.set(item.x, item.y, item.z);
    transform.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
    transform.scale.set(item.sx || 1, item.sy || 1, item.sz || 1);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, color.setHex(item.color));
  });
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  return mesh;
}

function material() {
  return new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0 });
}

function treeParts() {
  const trunks = [];
  SCENERY.filter(item => ['maple', 'pine'].includes(item.kind)).forEach(tree => {
    const s = tree.scale;
    trunks.push({ x: tree.x, y: 1.6 * s, z: tree.z, sx: s, sy: s, sz: s, color: 0x736553 });
    [-1, 1].forEach(side => trunks.push({ x: tree.x + side * 0.38 * s, y: 2.5 * s,
      z: tree.z, sx: 0.55 * s, sy: 0.52 * s, sz: 0.55 * s, rz: side * -0.6, color: 0x736553 }));
  });
  return { trunks };
}

function appendMaple(crowns, tree) {
  CROWNS.forEach(([x, y, z, size], index) => crowns.push({
    x: tree.x + x * tree.scale, y: y * tree.scale, z: tree.z + z * tree.scale,
    sx: size * tree.scale, sy: size * tree.scale * 0.65, sz: size * tree.scale,
    ry: index, color: RED_LEAVES[index],
  }));
}

function appendPine(pines, tree) {
  PINE_LEAVES.forEach((color, index) => {
    const radius = tree.scale * (1.7 - index * 0.38);
    pines.push({ x: tree.x, y: (2.8 + index * 0.88) * tree.scale, z: tree.z,
      sx: radius, sy: tree.scale, sz: radius, ry: index * 0.3, color });
  });
}

function rocks() {
  const items = [];
  SCENERY.filter(item => item.kind === 'rock').forEach(rock => {
    items.push({ x: rock.x, y: 0.4 * rock.scale, z: rock.z, sx: rock.scale,
      sy: rock.scale * 0.65, sz: rock.scale * 0.85, ry: rock.x, color: 0x8b9b94 });
    items.push({ x: rock.x + 0.5, y: 0.12, z: rock.z + 0.55, sx: 0.32,
      sy: 0.22, sz: 0.35, ry: rock.z, color: 0xa3b3a6 });
  });
  return instances({ geometry: new THREE.DodecahedronGeometry(1), items, material: material() });
}

function grass() {
  const items = [];
  for (let index = 0; index < 230; index++) {
    const angle = index * 2.39996;
    const distance = 12.5 + (index * 7.3) % 21;
    const size = 0.65 + index % 4 * 0.15;
    items.push({ x: Math.cos(angle) * distance, y: size * 0.15 - 0.08,
      z: Math.sin(angle) * distance, sx: size, sy: size, sz: size, ry: index,
      color: index % 3 === 0 ? 0xb4bd88 : 0x678f69 });
  }
  return instances({ geometry: new THREE.ConeGeometry(0.16, 0.42, 3), items, material: material(), shadow: false });
}

function lanterns() {
  const lamps = SCENERY.filter(item => item.kind === 'lantern');
  const parts = [
    { geometry: new THREE.CylinderGeometry(0.5, 0.58, 0.2, 6), y: 0.08, color: 0x869287 },
    { geometry: new THREE.CylinderGeometry(0.17, 0.25, 0.76, 6), y: 0.53, color: 0x929e90 },
    { geometry: new THREE.BoxGeometry(0.46, 0.5, 0.46), y: 1.15, color: 0xf5d595 },
    { geometry: new THREE.ConeGeometry(0.63, 0.38, 4), y: 1.59, color: 0x556e66 },
  ];
  const group = new THREE.Group();
  parts.forEach((part, index) => group.add(instances({ geometry: part.geometry,
    material: index === 2 ? new THREE.MeshStandardMaterial({ emissive: 0xf3b968, emissiveIntensity: 0.6 }) : material(),
    items: lamps.map(lamp => ({ x: lamp.x, y: part.y, z: lamp.z, color: part.color, ry: Math.PI / 4 })),
  })));
  return group;
}

function petals() {
  const count = 28;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const colors = Array.from({ length: count }, (_, index) => new THREE.Color(RED_LEAVES[index % RED_LEAVES.length]).toArray()).flat();
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.08, vertexColors: true,
    transparent: true, opacity: 0.65, depthWrite: false }));
}

export function createNature() {
  const group = new THREE.Group();
  const { trunks } = treeParts();
  group.add(instances({ geometry: new THREE.CylinderGeometry(0.16, 0.29, 3.2, 6), items: trunks, material: material() }));
  const foliage = createFoliage();
  foliage.forEach(mesh => group.add(mesh));
  group.add(rocks(), grass(), lanterns(), gate());
  const leaves = petals();
  group.add(leaves);
  return { group, leaves, foliage };
}

function createFoliage() {
  return SCENERY.filter(tree => ['maple', 'pine'].includes(tree.kind)).map(tree => {
    const items = [];
    if (tree.kind === 'maple') appendMaple(items, tree);
    else appendPine(items, tree);
    const geometry = tree.kind === 'maple' ? new THREE.IcosahedronGeometry(1, 2) : new THREE.ConeGeometry(1, 2.5, 12);
    const leaves = material();
    leaves.transparent = true;
    leaves.depthWrite = false;
    const mesh = instances({ geometry, items, material: leaves });
    mesh.userData.tree = tree;
    return mesh;
  });
}

export function revealNearbyActors(foliage, position) {
  foliage.forEach(mesh => {
    const tree = mesh.userData.tree;
    const distance = Math.hypot(tree.x - position.x, tree.z - position.z);
    const visibility = THREE.MathUtils.smoothstep(distance, 2.3 * tree.scale, 4.5 * tree.scale);
    mesh.material.opacity = 0.18 + visibility * 0.82;
  });
}

function gate() {
  const group = new THREE.Group();
  const timber = 0x92564a, roof = 0x385d54, trim = 0xb79f6f;
  const bars = [
    { x: 0, y: 3.8, z: -14, sx: 7.6, sy: 0.32, sz: 0.4, color: timber },
    { x: 0, y: 4.52, z: -14, sx: 8.4, sy: 0.22, sz: 1.32, color: roof },
    { x: 0, y: 4.78, z: -14, sx: 6.8, sy: 0.24, sz: 0.3, color: roof },
    { x: 0, y: 4.17, z: -13.88, sx: 1.65, sy: 0.58, sz: 0.18, color: 0x345448 },
    { x: -0.32, y: 4.18, z: -13.77, sx: 0.12, sy: 0.29, sz: 0.025, color: trim },
    { x: 0.32, y: 4.18, z: -13.77, sx: 0.12, sy: 0.29, sz: 0.025, color: trim },
  ];
  [-1, 1].forEach(side => {
    bars.push({ x: side * 4.08, y: 4.64, z: -14, sx: 1.15, sy: 0.17, sz: 1.3, rz: side * 0.28, color: roof });
    bars.push({ x: side * 3.2, y: 0.12, z: -14, sx: 0.9, sy: 0.28, sz: 0.9, color: 0x8c9b86 });
  });
  const pillars = [-1, 1].map(side => ({ x: side * 3.2, y: 2.2, z: -14, color: timber }));
  group.add(instances({ geometry: new THREE.BoxGeometry(1, 1, 1), items: bars, material: material() }));
  group.add(instances({ geometry: new THREE.CylinderGeometry(0.23, 0.28, 4.2, 8), items: pillars, material: material() }));
  return group;
}

export function updatePetals(leaves, time) {
  const points = leaves.geometry.attributes.position;
  for (let index = 0; index < points.count; index++) {
    const phase = index * 1.37;
    points.setXYZ(index, ((phase * 3 + time * 0.28) % 28) - 14,
      0.2 + ((phase - time * 0.16) % 4 + 4) % 4, Math.sin(phase) * 12 + Math.sin(time * 0.25 + phase));
  }
  points.needsUpdate = true;
}
