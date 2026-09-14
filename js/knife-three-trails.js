import * as THREE from './vendor/three.module.js?v=33';
import { ARENA, worldPosition } from './knife-three-config.js?v=33';

const TRAIL = Object.freeze({
  innerFraction: 0.87, opacity: 0.5, subdivisions: 3, verticesPerStep: 12,
  initialVertices: 192, capacityGrowth: 2, color: 0xffebbc, heightOffset: 0.025,
});

export function trailSnapshots(segments, blades) {
  const groups = [];
  for (const segment of segments) {
    if (!(segment.life > 0)) continue;
    let group = groups[groups.length - 1];
    if (!group || group.life !== segment.life) {
      group = { life: segment.life, blades: [] };
      groups.push(group);
    }
    group.blades.push(segment);
  }
  const frames = [];
  // 刀刃数量改变后索引不再代表同一把刀，只连接连续的同组真实记录。
  for (let index = groups.length - 1; index >= 0; index--) {
    if (groups[index].blades.length !== blades.length) break;
    frames.unshift(groups[index]);
  }
  if (!frames.length || !blades.length) return [];
  const latest = frames[frames.length - 1];
  const unchanged = latest.blades.every((blade, index) => ['x1', 'y1', 'x2', 'y2']
    .every(key => blade[key] === blades[index][key]));
  if (unchanged) frames[frames.length - 1] = { life: 1, blades };
  else frames.push({ life: 1, blades });
  return frames;
}

function ribbonCurves({ frames, index, center }) {
  const outer = [];
  const inner = [];
  for (const frame of frames) {
    const blade = frame.blades[index];
    const start = worldPosition({ x: blade.x1, y: blade.y1 }, center);
    const end = worldPosition({ x: blade.x2, y: blade.y2 }, center);
    const height = ARENA.weaponHeight + TRAIL.heightOffset;
    outer.push(new THREE.Vector3(end.x, height, end.z));
    inner.push(new THREE.Vector3(
      start.x + (end.x - start.x) * TRAIL.innerFraction, height,
      start.z + (end.z - start.z) * TRAIL.innerFraction,
    ));
  }
  return {
    inner: new THREE.CatmullRomCurve3(inner, false, 'centripetal'),
    outer: new THREE.CatmullRomCurve3(outer, false, 'centripetal'),
    lives: frames.map(frame => frame.life),
  };
}

function ribbonRow(curves, t) {
  const inner = curves.inner.getPoint(t);
  const outer = curves.outer.getPoint(t);
  const frame = t * (curves.lives.length - 1);
  const index = Math.floor(frame);
  const next = Math.min(index + 1, curves.lives.length - 1);
  const life = THREE.MathUtils.lerp(curves.lives[index], curves.lives[next], frame - index);
  return { points: [inner, inner.clone().lerp(outer, 0.5), outer], alpha: TRAIL.opacity * life * life };
}

export class BladeTrails {
  constructor(scene) {
    this.scene = scene;
    this.capacity = 0;
    this.count = 0;
    this.color = new THREE.Color(TRAIL.color);
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, toneMapped: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  grow(required) {
    this.capacity = Math.max(TRAIL.initialVertices, this.capacity * TRAIL.capacityGrowth, required);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.capacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.capacity * 4), 4).setUsage(THREE.DynamicDrawUsage));
    this.geometry.dispose();
    this.geometry = geometry;
    this.mesh.geometry = geometry;
  }

  render({ segments, blades, center }) {
    const frames = trailSnapshots(segments, blades);
    const steps = Math.max(0, frames.length - 1) * TRAIL.subdivisions;
    const required = blades.length * steps * TRAIL.verticesPerStep;
    this.count = 0;
    this.mesh.visible = required > 0;
    if (!required) { this.geometry.setDrawRange(0, 0); return; }
    if (required > this.capacity) this.grow(required);
    for (let index = 0; index < blades.length; index++) {
      this.drawTrack({ frames, index, center });
    }
    this.geometry.setDrawRange(0, this.count);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  drawTrack(options) {
    const curves = ribbonCurves(options);
    const steps = (options.frames.length - 1) * TRAIL.subdivisions;
    let previous = ribbonRow(curves, 0);
    for (let step = 1; step <= steps; step++) {
      const current = ribbonRow(curves, step / steps);
      this.band(previous, current);
      previous = current;
    }
  }

  band(previous, current) {
    for (let edge = 0; edge < 2; edge++) {
      this.vertex(previous.points[edge], edge === 1 ? previous.alpha : 0);
      this.vertex(current.points[edge], edge === 1 ? current.alpha : 0);
      this.vertex(previous.points[edge + 1], edge === 0 ? previous.alpha : 0);
      this.vertex(previous.points[edge + 1], edge === 0 ? previous.alpha : 0);
      this.vertex(current.points[edge], edge === 1 ? current.alpha : 0);
      this.vertex(current.points[edge + 1], edge === 0 ? current.alpha : 0);
    }
  }

  vertex(point, alpha) {
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const position = this.count * 3;
    const color = this.count * 4;
    positions[position] = point.x;
    positions[position + 1] = point.y;
    positions[position + 2] = point.z;
    colors[color] = this.color.r;
    colors[color + 1] = this.color.g;
    colors[color + 2] = this.color.b;
    colors[color + 3] = alpha;
    this.count++;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
