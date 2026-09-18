import * as THREE from './vendor/three.module.js?v=35';
import { InstanceBatch } from './knife-three-batch.js?v=35';

const SHADOW_TEXTURE_SIZE = 32;
const SHAPE_BEVEL = 0.035;

export const ACTOR_PART_SLOTS = Object.freeze({
  torso: 2, hem: 2, head: 4, hair: 1, hat: 1, sleeves: 2, boots: 2,
  cloth: 5, detail: 32, steel: 4, bow: 1, shield: 1, armor: 6,
  horn: 5, hood: 1, shadow: 1, health: 2,
});

function tailoredShape(points, depth) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSize: SHAPE_BEVEL, bevelThickness: SHAPE_BEVEL,
    bevelSegments: 2, steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function bowGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.62, 0), new THREE.Vector3(0.23, -0.34, 0),
    new THREE.Vector3(0.3, 0, 0), new THREE.Vector3(0.23, 0.34, 0),
    new THREE.Vector3(0, 0.62, 0),
  ]);
  return new THREE.TubeGeometry(curve, 8, 0.045, 4, false);
}

function contactShadow() {
  const data = new Uint8Array(SHADOW_TEXTURE_SIZE * SHADOW_TEXTURE_SIZE * 4);
  for (let y = 0; y < SHADOW_TEXTURE_SIZE; y++) {
    for (let x = 0; x < SHADOW_TEXTURE_SIZE; x++) {
      const radius = Math.hypot((x + 0.5) / SHADOW_TEXTURE_SIZE * 2 - 1, (y + 0.5) / SHADOW_TEXTURE_SIZE * 2 - 1);
      const offset = (y * SHADOW_TEXTURE_SIZE + x) * 4;
      data.set([255, 255, 255, Math.round(Math.max(0, 1 - radius) ** 2 * 150)], offset);
    }
  }
  const texture = new THREE.DataTexture(data, SHADOW_TEXTURE_SIZE, SHADOW_TEXTURE_SIZE);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
}

function clothMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
}

function metalMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.45 });
}

export function actorParts(scene) {
  const geometries = {
    torso: tailoredShape([[-0.29, -0.34], [0.29, -0.34], [0.47, 0.23], [0.29, 0.37], [-0.29, 0.37], [-0.47, 0.23]], 0.46),
    hem: tailoredShape([[-0.17, 0.28], [0.17, 0.28], [0.24, -0.23], [0.04, -0.31], [-0.24, -0.23]], 0.39),
    head: new THREE.SphereGeometry(0.34, 20, 14),
    hair: new THREE.SphereGeometry(0.355, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.43),
    hat: new THREE.ConeGeometry(0.7, 0.26, 24),
    sleeves: new THREE.CylinderGeometry(0.2, 0.255, 0.5, 12),
    boots: tailoredShape([[-0.11, -0.13], [0.11, -0.13], [0.12, 0.12], [-0.1, 0.15]], 0.37),
    cloth: tailoredShape([[-0.43, 0.5], [0.43, 0.5], [0.54, -0.42], [0.13, -0.54], [-0.08, -0.39], [-0.5, -0.46]], 0.045),
    detail: new THREE.BoxGeometry(1, 1, 1),
    steel: tailoredShape([[-0.065, -0.5], [0.055, -0.5], [0.075, 0.23], [-0.025, 0.59], [-0.075, 0.39]], 0.035),
    bow: bowGeometry(),
    shield: tailoredShape([[-0.34, 0.39], [0, 0.51], [0.34, 0.39], [0.31, -0.25], [0, -0.53], [-0.31, -0.25]], 0.11),
    armor: new THREE.IcosahedronGeometry(0.5, 0),
    horn: new THREE.ConeGeometry(0.12, 0.59, 5),
    hood: new THREE.SphereGeometry(0.43, 8, 6, Math.PI * 0.8, Math.PI * 1.4, 0, Math.PI * 0.86),
    shadow: new THREE.PlaneGeometry(1, 1),
    health: new THREE.BoxGeometry(1, 0.065, 0.055),
  };
  return Object.fromEntries(Object.entries(geometries).map(([name, geometry]) => {
    let material = ['steel', 'shield', 'armor', 'horn'].includes(name) ? metalMaterial() : clothMaterial();
    if (name === 'shadow') { material.dispose(); material = contactShadow(); }
    if (name === 'health') { material.dispose(); material = new THREE.MeshBasicMaterial(); }
    if (name === 'hood') material.side = THREE.DoubleSide;
    return [name, new InstanceBatch({ scene, geometry, material, shadow: !['shadow', 'health', 'detail'].includes(name) })];
  }));
}
