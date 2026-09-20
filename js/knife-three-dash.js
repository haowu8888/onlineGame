import * as THREE from './vendor/three.module.js?v=38';
import { ARENA, worldPosition } from './knife-three-config.js?v=38';
import { InstanceBatch } from './knife-three-batch.js?v=38';

const STREAKS = Object.freeze([-0.25, 0, 0.25]);
const TRAIL = Object.freeze({ width: 0.15, height: 0.12, overlap: 0.04, color: 0xbbefdc });

export class DashTrails {
  constructor(scene) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    this.batch = new InstanceBatch({ scene, geometry,
      material: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true,
        opacity: 0.55, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }) });
  }

  render({ segments, center }) {
    this.batch.begin(segments.length * STREAKS.length);
    segments.forEach(segment => this.draw(segment, center));
    this.batch.end();
  }

  draw(segment, center) {
    const dx = (segment.x2 - segment.x1) / ARENA.pixelsPerUnit;
    const dz = (segment.y2 - segment.y1) / ARENA.pixelsPerUnit;
    const length = Math.hypot(dx, dz);
    if (!length) return;
    const midpoint = worldPosition({ x: (segment.x1 + segment.x2) / 2, y: (segment.y1 + segment.y2) / 2 }, center);
    STREAKS.forEach(offset => this.batch.put({
      x: midpoint.x - dz / length * offset, y: TRAIL.height, z: midpoint.z + dx / length * offset,
      sx: length + TRAIL.overlap, sz: TRAIL.width * segment.life,
      ry: -Math.atan2(dz, dx), color: TRAIL.color,
    }));
  }

  dispose() { this.batch.dispose(); }
}
