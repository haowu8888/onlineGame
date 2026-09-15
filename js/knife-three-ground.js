import * as THREE from './vendor/three.module.js?v=34';

const COURT = Object.freeze({ radius: 11.8, tile: 1.85, size: 100, texture: 128 });
const STONE = [0xa7aa96, 0x9da58e, 0xb1b09b, 0xa3a68d, 0xacb09b];

function surfaceTexture() {
  const size = COURT.texture;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = (x * 13 + y * 23 + x * y * 3) % 13;
      const cloud = Math.sin(x / 12) * Math.cos(y / 11) * 5;
      const shade = Math.round(234 + grain + cloud);
      pixels.set([shade, shade, shade - 2, 255], (y * size + x) * 4);
    }
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(18, 18);
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

function floorMesh(geometry, material, height) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = height;
  mesh.receiveShadow = true;
  return mesh;
}

function tiles(map) {
  const points = [];
  for (let row = -6; row <= 6; row++) {
    for (let column = -6; column <= 6; column++) {
      const x = column * COURT.tile + (row % 2) * COURT.tile / 2;
      const z = row * COURT.tile;
      if (Math.hypot(x, z) < COURT.radius - 1.2) points.push({ x, z, row, column });
    }
  }
  const material = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, map, bumpMap: map, bumpScale: 0.035 });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.825, 0.075, 1.825), material, points.length);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  points.forEach(({ x, z, row, column }, index) => {
    transform.position.set(x, -0.015, z);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, color.setHex(STONE[Math.abs(row * 7 + column * 3) % STONE.length]));
  });
  mesh.receiveShadow = true;
  return mesh;
}

function inlay() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0x678777, transparent: true, opacity: 0.38, depthWrite: false });
  [3.8, 4.05, 8.7, 11.4].forEach(radius => {
    const ring = floorMesh(new THREE.RingGeometry(radius, radius + 0.035, 96), material, 0.035);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
  });
  const strokes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.53, 0.014, 0.09), material, 24);
  const transform = new THREE.Object3D();
  for (let index = 0; index < 24; index++) {
    const angle = Math.floor(index / 3) * Math.PI / 4;
    const radius = 3.12 + (index % 3) * 0.2;
    transform.position.set(Math.cos(angle) * radius, 0.036, Math.sin(angle) * radius);
    transform.rotation.y = -angle + Math.PI / 2;
    transform.updateMatrix();
    strokes.setMatrixAt(index, transform.matrix);
  }
  group.add(strokes);
  return group;
}

function steppingStones() {
  const material = new THREE.MeshStandardMaterial({ color: 0xc4c6b1, roughness: 1 });
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 0.9, 0.1, 5), material, 32);
  const transform = new THREE.Object3D();
  for (let index = 0; index < 32; index++) {
    const distance = 12.5 + Math.floor(index / 4) * 1.5;
    const angle = index % 4 * Math.PI / 2;
    transform.position.set(Math.cos(angle) * distance, -0.06, Math.sin(angle) * distance);
    transform.rotation.y = index * 1.7;
    transform.scale.set(1, 1, 0.7);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  }
  mesh.receiveShadow = true;
  return mesh;
}

export function createGround() {
  const group = new THREE.Group();
  const map = surfaceTexture();
  const tileMap = map.clone();
  tileMap.repeat.set(0.4, 0.4);
  tileMap.needsUpdate = true;
  const meadowMaterial = new THREE.MeshStandardMaterial({ color: 0x63856c, roughness: 1, map, bumpMap: map, bumpScale: 0.08 });
  const meadow = floorMesh(new THREE.PlaneGeometry(COURT.size, COURT.size), meadowMaterial, -0.17);
  meadow.rotation.x = -Math.PI / 2;
  const court = new THREE.Group();
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xb0b49e, roughness: 1 });
  court.add(floorMesh(new THREE.CylinderGeometry(COURT.radius, COURT.radius + 0.2, 0.12, 64), stoneMaterial, -0.06));
  court.add(tiles(tileMap), inlay(), steppingStones());
  group.add(meadow, court);
  return { group, court, meadowMaterial, stoneMaterial };
}
