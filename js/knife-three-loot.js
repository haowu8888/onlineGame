import * as THREE from './vendor/three.module.js?v=33';
import { worldPosition } from './knife-three-config.js?v=33';
import { InstanceBatch } from './knife-three-batch.js?v=33';

const LOOT = Object.freeze({ wood: 0x795435, lid: 0xaa7a44, brass: 0xe6bd6b,
  medicine: 0x5cbe9f, ivory: 0xebedd2, crystal: 0x64c7e4, bob: 0.045, rate: 2 });
const CHEST_PARTS = Object.freeze([
  { x: 0, y: 0.28, z: 0, sx: 0.74, sy: 0.46, sz: 0.55, color: LOOT.wood },
  { x: 0, y: 0.56, z: 0, sx: 0.79, sy: 0.17, sz: 0.6, color: LOOT.lid },
]);

function batch(scene, geometry, options = {}) {
  return new InstanceBatch({ scene, geometry,
    material: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, ...options }), shadow: true });
}

export class ArenaLoot {
  constructor(scene) {
    this.wood = batch(scene, new THREE.BoxGeometry(1, 1, 1));
    this.metal = batch(scene, new THREE.BoxGeometry(1, 1, 1), { metalness: 0.5, roughness: 0.35 });
    this.bottles = batch(scene, new THREE.SphereGeometry(1, 12, 8), { roughness: 0.2 });
    this.caps = batch(scene, new THREE.CylinderGeometry(0.12, 0.13, 0.15, 8));
    this.crystals = batch(scene, new THREE.OctahedronGeometry(0.37), { emissive: 0x308998, emissiveIntensity: 0.6 });
    this.rings = new InstanceBatch({ scene, geometry: new THREE.RingGeometry(0.46, 0.51, 32),
      material: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }) });
    this.batches = [this.wood, this.metal, this.bottles, this.caps, this.crystals, this.rings];
  }

  render({ chests, center, time }) {
    const visible = chests.filter(item => item.alive);
    this.batches.forEach(item => item.begin(visible.length * 4));
    visible.forEach(item => {
      const origin = worldPosition(item, center);
      const bob = Math.sin(time * LOOT.rate + item.bobPhase) * LOOT.bob;
      if (item.type === 'gold') this.drawChest(origin, bob);
      if (item.type === 'heal') this.drawMedicine(origin, bob);
      if (item.type === 'exp') this.drawCrystal({ origin, bob, time });
      const colors = { gold: LOOT.brass, heal: LOOT.medicine, exp: LOOT.crystal };
      this.rings.put({ ...origin, y: 0.04, rx: -Math.PI / 2, color: colors[item.type] });
    });
    this.batches.forEach(item => item.end());
  }

  drawChest(origin, bob) {
    CHEST_PARTS.forEach(part => this.wood.put({ ...part, x: origin.x, y: part.y + bob, z: origin.z }));
    [-1, 1].forEach(side => this.metal.put({ x: origin.x + side * 0.25, y: 0.35 + bob, z: origin.z,
      sx: 0.075, sy: 0.64, sz: 0.62, color: LOOT.brass }));
    this.metal.put({ x: origin.x, y: 0.38 + bob, z: origin.z + 0.32,
      sx: 0.15, sy: 0.19, sz: 0.07, color: LOOT.brass });
  }

  drawMedicine(origin, bob) {
    this.bottles.put({ ...origin, y: 0.34 + bob, sx: 0.29, sy: 0.34, sz: 0.27, color: LOOT.medicine });
    this.caps.put({ ...origin, y: 0.65 + bob, color: LOOT.brass });
    this.metal.put({ x: origin.x, y: 0.38 + bob, z: origin.z + 0.26, sx: 0.23, sy: 0.06, sz: 0.025, color: LOOT.ivory });
    this.metal.put({ x: origin.x, y: 0.38 + bob, z: origin.z + 0.27, sx: 0.06, sy: 0.23, sz: 0.025, color: LOOT.ivory });
  }

  drawCrystal({ origin, bob, time }) {
    this.crystals.put({ ...origin, y: 0.58 + bob, sx: 0.82, sy: 1.45, sz: 0.82, ry: time * 0.5, color: LOOT.crystal });
    this.caps.put({ ...origin, y: 0.13, sx: 2.5, sy: 1.5, sz: 2.5, color: 0x6c8790 });
  }

  dispose() { this.batches.forEach(item => item.dispose()); }
}
