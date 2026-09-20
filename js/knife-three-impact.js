import * as THREE from './vendor/three.module.js?v=38';
import { InstanceBatch } from './knife-three-batch.js?v=38';
import { ARENA, worldPosition } from './knife-three-config.js?v=38';

const FX = Object.freeze({ height: 1.18, coreFraction: 0.32, slashFraction: 0.7,
  ringSegments: 48, normalRays: 5, heavyRays: 9, rayLength: 0.62,
  normalRadius: 0.62, heavyRadius: 1.04, white: 0xfff2cf, gold: 0xffbc58 });

function taperedSlash() {
  const shape = new THREE.Shape();
  shape.moveTo(-1, 0);
  shape.lineTo(-0.15, 0.09);
  shape.lineTo(1, 0);
  shape.lineTo(0.15, -0.09);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function effectBatch(scene, geometry) {
  return new InstanceBatch({ scene, geometry, material: new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
  }) });
}

export class ArenaImpacts {
  constructor(scene) {
    this.slashes = effectBatch(scene, taperedSlash());
    this.rings = effectBatch(scene, new THREE.RingGeometry(0.91, 1, FX.ringSegments));
    this.cores = effectBatch(scene, new THREE.CircleGeometry(1, FX.ringSegments));
    this.color = new THREE.Color();
    this.batches = [this.slashes, this.rings, this.cores];
  }

  render({ events = [], center, motion = true }) {
    const visible = motion ? events : [];
    this.slashes.begin(visible.length * (FX.heavyRays + 2));
    this.rings.begin(visible.length);
    this.cores.begin(visible.length);
    visible.forEach(event => this.draw(event, center));
    this.batches.forEach(batch => batch.end());
  }

  draw(event, center) {
    const remaining = Math.max(0, event.life / event.duration);
    const progress = 1 - remaining;
    const heavy = event.critical || event.defeated;
    const radius = (heavy ? FX.heavyRadius : FX.normalRadius) + event.radius / ARENA.pixelsPerUnit * 0.15;
    const position = worldPosition(event, center);
    const origin = { ...position, y: FX.height, rx: -Math.PI / 2 };
    const color = this.color.set(event.critical ? FX.gold : event.color).multiplyScalar(remaining ** 2).getHex();
    const wave = radius * (0.3 + progress * 1.65);
    this.rings.put({ ...origin, sx: wave, sy: wave, color });
    if (progress < FX.coreFraction) {
      const core = (1 - progress / FX.coreFraction) * radius * 0.32;
      this.cores.put({ ...origin, y: FX.height + 0.015, sx: core, sy: core, color: FX.white });
    }
    if (progress < FX.slashFraction) this.drawSlash({ event, origin, progress, radius });
    this.drawRays({ event, origin, progress, radius, color, heavy });
  }

  drawSlash({ event, origin, progress, radius }) {
    const strength = 1 - progress / FX.slashFraction;
    const length = radius * (0.85 + progress * 2.2);
    this.slashes.put({ ...origin, y: FX.height + 0.025,
      rz: -event.angle + Math.PI / 4, sx: length, sy: strength * 1.5, color: FX.white });
    if (!event.critical) return;
    this.slashes.put({ ...origin, y: FX.height + 0.04,
      rz: -event.angle - Math.PI / 4, sx: length * 0.7, sy: strength, color: FX.gold });
  }

  drawRays({ event, origin, progress, radius, color, heavy }) {
    const count = heavy ? FX.heavyRays : FX.normalRays;
    for (let index = 0; index < count; index++) {
      const angle = event.angle + index * Math.PI * 2 / count;
      const distance = radius * (0.2 + progress * 1.65);
      const length = FX.rayLength * (1 - progress) * radius;
      this.slashes.put({ ...origin, x: origin.x + Math.cos(angle) * distance,
        z: origin.z + Math.sin(angle) * distance, y: FX.height + Math.sin(progress * Math.PI) * 0.22,
        rz: -angle, sx: length, sy: (1 - progress) * 0.38, color });
    }
  }

  dispose() {
    this.batches.forEach(batch => batch.dispose());
  }
}
