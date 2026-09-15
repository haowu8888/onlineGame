import * as THREE from './vendor/three.module.js?v=34';
import { ARENA, worldPosition } from './knife-three-config.js?v=34';
import { InstanceBatch } from './knife-three-batch.js?v=34';
import { BladeTrails } from './knife-three-trails.js?v=34';
import { DashTrails } from './knife-three-dash.js?v=34';
import { ArenaLoot } from './knife-three-loot.js?v=34';

const FX = Object.freeze({
  gemHeight: 0.45, bladeThickness: 0.04, bladeCoreLift: 0.045,
  bladeSteel: 0xd6e6df, bladeCore: 0xfff8df, gemColor: 0x3bc7d6, rareGemColor: 0x68aaf4,
  zoneOpacity: 0.2, dangerColor: 0xea604a, ringSegments: 48,
  floatingRate: 3, sparkHeight: 1.6, pickupRingRadius: 0.26,
});
const HAZARD_COLORS = Object.freeze({ fire: 0xe8794f, poison: 0xc26687, ice: 0x7facc8 });

function batch(scene, geometry, options = {}) {
  const material = options.basic
    ? new THREE.MeshBasicMaterial(options.material)
    : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.45, ...options.material });
  return new InstanceBatch({ scene, geometry, material, shadow: options.shadow });
}

function bladeGeometry() {
  const outline = new THREE.Shape();
  outline.moveTo(-0.5, -0.07);
  outline.lineTo(-0.1, -0.09);
  outline.quadraticCurveTo(0.29, -0.055, 0.5, 0);
  outline.quadraticCurveTo(0.16, 0.04, -0.13, 0.035);
  outline.lineTo(-0.5, 0.055);
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: FX.bladeThickness, bevelEnabled: true, bevelThickness: 0.015,
    bevelSize: 0.008, bevelSegments: 1, steps: 1, curveSegments: 6,
  });
  geometry.translate(0, 0, -FX.bladeThickness / 2);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export class ArenaEffects {
  constructor(scene) {
    this.blades = batch(scene, bladeGeometry(), {
      material: { emissive: 0x9db5b0, emissiveIntensity: 0.12 }, shadow: true,
    });
    this.bladeCores = batch(scene, bladeGeometry(), { basic: true, material: { toneMapped: false } });
    this.hilts = batch(scene, new THREE.BoxGeometry(0.12, 0.11, 0.38), { shadow: true });
    this.trails = new BladeTrails(scene);
    this.dashTrails = new DashTrails(scene);
    this.loot = new ArenaLoot(scene);
    this.gems = batch(scene, new THREE.OctahedronGeometry(0.2), {
      material: { emissive: 0x238c9d, emissiveIntensity: 0.75, roughness: 0.2, metalness: 0.1 },
    });
    this.pickupRings = batch(scene, new THREE.RingGeometry(0.7, 1, 20), {
      basic: true, material: { transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, side: THREE.DoubleSide },
    });
    this.gold = batch(scene, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 10), { shadow: true });
    this.sparks = batch(scene, new THREE.IcosahedronGeometry(0.06), { basic: true });
    this.projectiles = batch(scene, new THREE.OctahedronGeometry(0.13), { basic: true });
    this.zones = batch(scene, new THREE.CircleGeometry(1, FX.ringSegments), {
      basic: true, material: { transparent: true, opacity: FX.zoneOpacity, depthWrite: false, side: THREE.DoubleSide },
    });
    this.rings = batch(scene, new THREE.RingGeometry(0.94, 1, FX.ringSegments), {
      basic: true, material: { transparent: true, opacity: 0.74, depthWrite: false, toneMapped: false, side: THREE.DoubleSide },
    });
    this.batches = [this.blades, this.bladeCores, this.hilts, this.gems, this.pickupRings, this.gold, this.sparks, this.projectiles, this.zones, this.rings];
  }

  render({ game, center, time }) {
    const player = game.player;
    const blades = player ? player.getBladeEndpoints() : this.menuBlades(time);
    this.blades.begin(blades.length);
    this.bladeCores.begin(blades.length);
    this.hilts.begin(blades.length);
    blades.forEach(blade => {
      this.drawSegment(this.blades, blade, center);
      this.drawSegment(this.bladeCores, blade, center);
      this.drawHilt(blade, center);
    });
    this.trails.render({ segments: game.bladeTrails || [], blades, center });
    this.dashTrails.render({ segments: game.dashTrails, center });
    this.loot.render({ chests: game.chests || [], center, time });
    this.drawPickups(game, center, time);
    this.drawParticles(game, center);
    this.drawZones(game, center, time);
    this.batches.forEach(item => item.end());
  }

  menuBlades(time) {
    const count = 4;
    return Array.from({ length: count }, (_, index) => {
      const angle = time * 0.55 + index * Math.PI * 2 / count;
      return {
        x1: Math.cos(angle) * 27, y1: Math.sin(angle) * 27,
        x2: Math.cos(angle) * 94, y2: Math.sin(angle) * 94,
      };
    });
  }

  drawSegment(target, segment, center) {
    const start = worldPosition({ x: segment.x1, y: segment.y1 }, center);
    const end = worldPosition({ x: segment.x2, y: segment.y2 }, center);
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    const core = target === this.bladeCores;
    target.put({
      x: (start.x + end.x) / 2, y: ARENA.weaponHeight + (core ? FX.bladeCoreLift : 0), z: (start.z + end.z) / 2,
      sx: length, sy: core ? 0.3 : 1, sz: core ? 0.27 : 1,
      ry: -Math.atan2(end.z - start.z, end.x - start.x), color: core ? FX.bladeCore : FX.bladeSteel,
    });
  }

  drawHilt(blade, center) {
    this.hilts.put({
      ...worldPosition({ x: blade.x1, y: blade.y1 }, center), y: ARENA.weaponHeight,
      ry: -Math.atan2(blade.y2 - blade.y1, blade.x2 - blade.x1), color: 0x845f37,
    });
  }

  drawPickups(game, center, time) {
    const pickups = (game.pickups || []).filter(item => item.alive);
    this.gems.begin(pickups.length);
    this.pickupRings.begin(pickups.length);
    pickups.forEach(item => {
      const color = item.xp > 10 ? FX.rareGemColor : FX.gemColor;
      this.drawFloating({ target: this.gems, item, center, time, color });
      this.pickupRings.put({ ...worldPosition(item, center), y: 0.045, rx: -Math.PI / 2,
        sx: FX.pickupRingRadius, sy: FX.pickupRingRadius, color });
    });
    const gold = (game.goldPickups || []).filter(item => item.alive);
    this.gold.begin(gold.length);
    gold.forEach(item => this.drawFloating({ target: this.gold, item, center, time, color: ARENA.gold }));
  }

  drawFloating({ target, item, center, time, color }) {
    const position = worldPosition(item, center);
    const phase = time ? time * FX.floatingRate + (item.bobPhase || 0) : 0;
    const crystal = target === this.gems;
    const scale = crystal && item.xp > 10 ? 1.2 : 1;
    target.put({
      ...position, y: FX.gemHeight + Math.sin(phase) * 0.1,
      sx: scale, sy: scale * (crystal ? 1.3 : 1), sz: scale, ry: time, color,
    });
  }

  drawParticles(game, center) {
    const particles = game.particles || [];
    this.sparks.begin(particles.length);
    particles.forEach(item => {
      const scale = (item.size || 2.5) / 2.5 * Math.max(0, item.life);
      this.sparks.put({
        ...worldPosition(item, center), y: 0.2 + item.life * FX.sparkHeight,
        sx: scale, sy: scale, sz: scale, color: item.color,
      });
    });
    const bullets = [...(game.projectiles || []), ...(game.swordQiProjectiles || [])]
      .filter(item => item.alive !== false && item.type !== 'poison' && item.type !== 'slam');
    this.projectiles.begin(bullets.length);
    bullets.forEach(item => this.projectiles.put({
      ...worldPosition(item, center), y: ARENA.weaponHeight,
      sx: item.fromEnemy ? 1 : 1.5, sy: 1, sz: 2.3,
      ry: -Math.atan2(item.vy || 0, item.vx || 1) + Math.PI / 2,
      color: item.fromEnemy ? ARENA.vermilion : ARENA.jade,
    }));
  }

  drawZones(game, center, time) {
    const hazards = [...(game.hazards || []), ...(game.projectiles || []).filter(item => item.type === 'poison' || item.type === 'slam')]
      .filter(item => item.alive !== false);
    const active = game.player ? (game.skills || []).filter(skill => skill.active) : [];
    this.zones.begin(hazards.length);
    this.rings.begin(hazards.length + active.length + (game.player ? 1 : 0));
    hazards.forEach(item => {
      const radius = (item.radius || 30) / ARENA.pixelsPerUnit;
      const position = worldPosition(item, center);
      const color = HAZARD_COLORS[item.type] || ARENA.vermilion;
      const transform = { ...position, y: 0.035, rx: -Math.PI / 2, sx: radius, sy: radius, color };
      this.zones.put(transform);
      this.rings.put({ ...transform, y: 0.05, color: FX.dangerColor });
    });
    if (!game.player) return;
    const position = worldPosition(game.player, center);
    const footprint = game.player.radius / ARENA.pixelsPerUnit + 0.2;
    this.rings.put({ ...position, y: 0.055, rx: -Math.PI / 2,
      sx: footprint, sy: footprint, color: ARENA.jade });
    active.forEach(skill => {
      const radius = (game.player.radius + 10) / ARENA.pixelsPerUnit;
      this.rings.put({
        ...position, y: 0.08, rx: -Math.PI / 2,
        sx: radius + Math.sin(time * 4) * 0.08, sy: radius,
        color: skill.id === 'lifesteal' ? ARENA.vermilion : ARENA.gold,
      });
    });
  }

  dispose() {
    this.trails.dispose();
    this.dashTrails.dispose();
    this.loot.dispose();
    this.batches.forEach(item => item.dispose());
  }
}
