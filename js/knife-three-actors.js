import { actorParts, ACTOR_PART_SLOTS } from './knife-three-actor-geometry.js?v=38';
import { ACTOR_RIG, ActorMotion, ActorPainter } from './knife-three-actor-pose.js?v=38';
import { ACTOR_PALETTE, outfitFor, drawWardrobe } from './knife-three-actor-wardrobe.js?v=38';

const MENU_HERO = Object.freeze({ x: 0, y: 0, radius: 18, facingAngle: 1.02, hp: 100, maxHp: 100 });
const SIDES = Object.freeze([-1, 1]);

export class ArenaActors {
  constructor(scene) {
    this.parts = actorParts(scene);
    this.batches = Object.entries(this.parts);
    this.painter = new ActorPainter(this.parts);
    this.motion = new ActorMotion();
  }

  render({ game, center, time }) {
    const enemies = (game.enemies || []).filter(enemy => enemy.alive);
    const count = enemies.length + 1 + (game.shadowClone ? 1 : 0);
    for (const [name, batch] of this.batches) batch.begin(count * ACTOR_PART_SLOTS[name]);
    enemies.forEach(entity => this.drawActor({ entity, center, time, hero: false }));
    this.drawActor({ entity: game.player || MENU_HERO, center, time, hero: true, menu: !game.player });
    if (game.shadowClone) this.drawActor({
      entity: { ...game.player, ...game.shadowClone }, motionEntity: game.shadowClone,
      center, time, hero: true, clone: true,
    });
    for (const [, batch] of this.batches) batch.end();
  }

  drawActor({ entity, center, time, hero, clone = false, menu = false, motionEntity = entity }) {
    const outfit = outfitFor({ entity, hero, clone });
    const scale = hero ? ACTOR_RIG.heroScale * (menu ? 1.4 : 1) : entity.radius / ACTOR_RIG.enemyRadius;
    const facing = hero ? entity.facingAngle : entity.moveAngle;
    const motion = this.motion.sample({ entity: motionEntity, time, menu });
    const flash = hero ? entity.hurtFlash > 0 : entity.hitFlash > 0;
    this.painter.begin({ entity, center, scale, facing: facing ?? 0, motion, outfit, menu, flash });
    this.drawBody(outfit);
    this.drawFace(outfit);
    this.drawLimbs(outfit);
    drawWardrobe(this.painter, outfit);
    this.drawShadow(outfit);
    if (entity.hp < entity.maxHp) this.drawHealth(entity, outfit);
  }

  drawBody(outfit) {
    const { width, stoop } = outfit;
    this.painter.put('torso', { y: 1.09 + stoop, sx: width, color: outfit.robe });
    SIDES.forEach(side => this.painter.put('hem', {
      x: side * 0.21 * width, y: 0.64 + stoop * 0.4, z: -0.015,
      sx: width, sy: outfit.kind === 'hero' ? 1.04 : 0.86,
      ry: side * (0.06 + this.painter.motion.step * 0.025), color: side < 0 ? outfit.hem : outfit.robe,
    }));
  }

  drawFace(outfit) {
    const y = ACTOR_RIG.headY + outfit.stoop;
    const z = outfit.kind === 'hero' ? 0.12 : 0.045;
    const painter = this.painter;
    painter.put('head', { y, z, sx: 1.08, sy: 1.05, sz: 0.96, color: outfit.skin });
    painter.put('hair', { y: y + 0.015, z: z - 0.02, sx: 1.09, color: ACTOR_PALETTE.ink });
    painter.put('detail', { y: y - 0.015, z: z - 0.22, sx: 0.5, sy: 0.46, sz: 0.2, color: ACTOR_PALETTE.ink });
    SIDES.forEach(side => {
      painter.put('detail', { x: side * 0.11, y: y + 0.025, z: z + 0.32, sx: 0.051, sy: 0.065, sz: 0.025, color: 0x282b32 });
      painter.put('detail', { x: side * 0.112, y: y + 0.096, z: z + 0.302, sx: 0.085, sy: 0.022, sz: 0.03, rz: -side * 0.12, color: ACTOR_PALETTE.ink });
    });
    if (outfit.kind === 'ninja') return;
    painter.put('head', { y: y - 0.045, z: z + 0.33, sx: 0.14, sy: 0.2, sz: 0.22, color: 0xe7a574 });
    painter.put('detail', { y: y - 0.13, z: z + 0.294, sx: 0.085, sy: 0.02, sz: 0.023, color: 0x915848 });
  }

  drawLimbs(outfit) {
    const painter = this.painter;
    SIDES.forEach(side => {
      const arm = painter.arm(side, 0.5);
      const hand = painter.arm(side);
      const cuff = painter.arm(side, 0.84);
      const foot = painter.foot(side);
      painter.put('sleeves', { ...arm, sx: outfit.fists ? 1.33 : 1, sz: outfit.fists ? 1.33 : 1,
        color: outfit.fists ? outfit.skin : outfit.robe });
      painter.put('detail', { ...cuff, sx: outfit.fists ? 0.42 : 0.34, sy: 0.1, sz: 0.33, color: outfit.trim });
      painter.put(outfit.fists ? 'armor' : 'head', { ...hand,
        sx: outfit.fists ? 0.54 : 0.39, sy: outfit.fists ? 0.55 : 0.41, sz: outfit.fists ? 0.56 : 0.4,
        color: outfit.skin });
      painter.put('detail', { x: foot.x, y: 0.34 + (foot.y - 0.15) * 0.5, z: foot.z * 0.7,
        sx: 0.18, sy: 0.28, sz: 0.18, rx: foot.rx * 0.5, color: outfit.kind === 'hero' ? 0xd5c8aa : outfit.boots });
      painter.put('boots', { ...foot, color: outfit.boots });
    });
  }

  drawShadow(outfit) {
    const { origin, scale } = this.painter;
    this.parts.shadow.put({ x: origin.x, y: 0.025, z: origin.z, rx: -Math.PI / 2,
      sx: scale * outfit.width * 1.85, sy: scale * 1.32, color: 0x283e32 });
  }

  drawHealth(entity, outfit) {
    const { origin, scale } = this.painter;
    const fraction = Math.max(0, entity.hp / entity.maxHp);
    const y = scale * (outfit.kind === 'boss' ? 2.82 : 2.5);
    this.parts.health.put({ x: origin.x, y, z: origin.z, sx: scale, color: ACTOR_PALETTE.ink });
    this.parts.health.put({ x: origin.x - scale * (1 - fraction) / 2, y: y + 0.005,
      z: origin.z + 0.04, sx: scale * fraction, color: outfit.kind === 'hero' ? 0x72ae63 : ACTOR_PALETTE.vermilion });
  }

  dispose() {
    Object.values(this.parts).forEach(batch => {
      batch.material.map?.dispose();
      batch.dispose();
    });
  }
}
