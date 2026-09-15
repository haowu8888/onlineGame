import * as THREE from './vendor/three.module.js?v=34';
import { ARENA, worldPosition } from './knife-three-config.js?v=34';

export const ACTOR_RIG = Object.freeze({ heroScale: 1.12, enemyRadius: 14, headY: 1.77, hatY: 2.16, shoulderY: 1.34, armLength: 0.52 });
const MOTION = Object.freeze({ strideRate: 2.35, stepLift: 0.09 });
const FLASH_PARTS = new Set(['torso', 'hem', 'sleeves', 'armor']);
const FLASH_BLEND = 0.58;
const DASH_LEAN = 0.18;

export class ActorMotion {
  constructor() {
    this.previous = new WeakMap();
  }

  sample({ entity, time, menu }) {
    if (menu) return { step: 0, bob: Math.sin(time * 1.8) * 0.012, sway: Math.sin(time * 2.3) * 0.08 };
    const previous = this.previous.get(entity);
    if (previous?.time === time) return previous.pose;
    const distance = previous ? Math.hypot(entity.x - previous.x, entity.y - previous.y) : 0;
    const seed = entity.x * 0.07 + entity.y * 0.11;
    const phase = ((previous?.phase ?? seed) + distance / ARENA.pixelsPerUnit * MOTION.strideRate) % (Math.PI * 2);
    const step = distance > 0.02 ? Math.sin(phase) : 0;
    const pose = { step, bob: Math.abs(step) * 0.035, sway: Math.sin(time * 2.7) * 0.06 + step * 0.03 };
    this.previous.set(entity, { x: entity.x, y: entity.y, time, phase, pose });
    return pose;
  }
}

/* 批处理没有场景父子节点：在这里把局部关节姿态转换为世界坐标。 */
export class ActorPainter {
  constructor(parts) {
    this.parts = parts;
    this.facingRotation = new THREE.Quaternion();
    this.rotation = new THREE.Quaternion();
    this.localAngles = new THREE.Euler();
    this.worldAngles = new THREE.Euler();
    this.flashColor = new THREE.Color();
    this.highlight = new THREE.Color(0xffdcc4);
  }

  begin({ entity, center, scale, facing, motion, outfit, menu, flash }) {
    this.origin = worldPosition(entity, center);
    this.scale = scale;
    this.yaw = Math.PI / 2 - facing;
    this.cos = Math.cos(this.yaw);
    this.sin = Math.sin(this.yaw);
    this.motion = motion;
    this.outfit = outfit;
    this.menu = menu;
    this.flash = flash;
    this.lean = entity.dash?.frames > 0 ? DASH_LEAN : 0;
    this.facingRotation.setFromEuler(this.localAngles.set(0, this.yaw, 0));
  }

  put(kind, options) {
    const { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, color } = options;
    const leaningZ = z + y * this.lean;
    this.rotation.setFromEuler(this.localAngles.set(rx + this.lean, ry, rz));
    this.rotation.premultiply(this.facingRotation);
    this.worldAngles.setFromQuaternion(this.rotation);
    this.parts[kind].put({
      x: this.origin.x + (x * this.cos + leaningZ * this.sin) * this.scale,
      y: (y + this.motion.bob) * this.scale,
      z: this.origin.z + (leaningZ * this.cos - x * this.sin) * this.scale,
      sx: sx * this.scale, sy: sy * this.scale, sz: sz * this.scale,
      rx: this.worldAngles.x, ry: this.worldAngles.y, rz: this.worldAngles.z,
      color: this.flash && FLASH_PARTS.has(kind) ? this.flashColor.set(color).lerp(this.highlight, FLASH_BLEND).getHex() : color,
    });
  }

  arm(side, fraction = 1) {
    const { outfit, motion, menu } = this;
    let swing = motion.step * side * 0.58;
    if (menu) swing = side < 0 ? -0.44 : 0.12;
    if (outfit.kind === 'archer') swing = (side < 0 ? -0.75 : -0.12) + swing * 0.25;
    if (outfit.kind === 'ninja') swing = 0.55 + swing * 0.55;
    const length = ACTOR_RIG.armLength * fraction;
    return {
      x: side * (0.53 * outfit.width + length * 0.1),
      y: ACTOR_RIG.shoulderY + outfit.stoop - Math.cos(swing) * length,
      z: -Math.sin(swing) * length, rx: swing, rz: side * 0.1,
    };
  }

  foot(side) {
    const step = this.motion.step * side;
    return {
      x: side * 0.22 * this.outfit.width,
      y: 0.15 + Math.max(0, step) * MOTION.stepLift,
      z: step * 0.21 + (this.menu ? side * 0.05 : 0), rx: step * 0.27,
    };
  }
}
