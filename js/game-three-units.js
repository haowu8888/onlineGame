import * as THREE from './vendor/three.module.js?v=38';
import { halo } from './game-three-props.js?v=38';
import { actor } from './game-three-actors.js?v=38';
import { SceneLabel } from './game-three-labels.js?v=38';
import { SceneHitFeedback } from './game-three-feedback.js?v=38';
import { PALETTE as P, MOTION } from './game-three-palette.js?v=38';

const HEALTH_WIDTH = 1.05;
const HEALTH_HEIGHT = 2.48;
const LABEL_HEIGHT = 2.87;

class SceneUnit {
  constructor(resources, unit) {
    this.resources = resources;
    this.root = new THREE.Group();
    this.body = actor(resources, unit);
    this.ring = halo(resources, { radius: 0.68, color: unit.side === 'enemy' ? P.coral : P.jade });
    this.label = new SceneLabel();
    this.feedback = new SceneHitFeedback(resources);
    this.label.sprite.scale.set(1.75, 0.5, 1);
    this.label.sprite.position.y = LABEL_HEIGHT;
    this.healthBack = resources.mesh({ color: P.ink, size: [HEALTH_WIDTH, 0.09, 0.13], at: [0, HEALTH_HEIGHT, 0] });
    this.health = resources.mesh({ color: unit.side === 'enemy' ? P.coral : P.jade,
      size: [HEALTH_WIDTH, 0.075, 0.15], at: [0, HEALTH_HEIGHT, 0] });
    this.root.add(this.body, this.ring, this.label.sprite, this.healthBack, this.health, this.feedback.root);
    this.lastHp = unit.hp;
    this.hitAt = -Infinity;
    this.root.position.set(unit.x, 0.1, unit.z);
    this.bodyScale = this.body.scale.x;
    this.appearance = this.appearanceKey(unit);
  }

  appearanceKey(unit) {
    const ageStage = unit.age === undefined ? 'adult' : unit.age < 16 ? 'child' : unit.age < 60 ? 'adult' : 'elder';
    return [unit.role, unit.side, ageStage].join(':');
  }

  updateAppearance(unit) {
    const key = this.appearanceKey(unit);
    if (key === this.appearance) return;
    this.body.removeFromParent();
    this.body = actor(this.resources, unit);
    this.bodyScale = this.body.scale.x;
    this.root.add(this.body);
    this.appearance = key;
  }

  update(unit, time) {
    this.updateAppearance(unit);
    this.unit = unit;
    this.root.userData.action = unit.action || null;
    this.root.userData.label = unit.name + (unit.hp === undefined ? '' :
      ' · 生命 ' + Math.max(0, unit.hp) + '/' + unit.maxHp + (unit.atk === undefined ? '' : ' · 攻击 ' + unit.atk));
    this.root.userData.key = unit.key;
    this.ring.visible = Boolean(unit.action || unit.selected);
    const hasHealth = unit.hp !== undefined;
    this.health.visible = hasHealth;
    this.healthBack.visible = hasHealth;
    if (hasHealth) this.updateHealth(unit, time);
    const detail = unit.detail || (unit.selected && hasHealth ? Math.max(0, unit.hp) + ' / ' + unit.maxHp : '');
    this.label.update({ title: unit.name, detail, active: Boolean(unit.selected) });
  }

  updateHealth(unit, time) {
    if (!Number.isFinite(unit.hp) || !Number.isFinite(unit.maxHp) || unit.maxHp <= 0) {
      throw new TypeError('场景收到无效生命值：' + unit.name);
    }
    if (unit.hp < this.lastHp) this.hitAt = time;
    this.feedback.show({ before: this.lastHp, after: unit.hp, maximum: unit.maxHp, time });
    this.lastHp = unit.hp;
    const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
    this.health.scale.x = HEALTH_WIDTH * ratio;
    this.health.position.x = -(HEALTH_WIDTH * (1 - ratio)) / 2;
  }

  animate(time, elapsed, reducedMotion) {
    const unit = this.unit;
    const dead = unit.dead || (unit.hp !== undefined && unit.hp <= 0);
    const motion = reducedMotion || dead ? 0 : Math.sin(time * MOTION.breathingRate) * MOTION.breathingAmount;
    const hit = reducedMotion ? 0 : Math.max(0, 1 - (time - this.hitAt) / MOTION.damageDuration);
    const movement = reducedMotion ? 1 : 1 - Math.exp(-MOTION.moveRate * elapsed);
    this.root.position.x += (unit.x - this.root.position.x) * movement;
    this.root.position.z += (unit.z - this.root.position.z) * movement;
    this.body.scale.y = this.bodyScale * (dead ? 0.28 : 1 + motion - hit * MOTION.damageScale);
    this.body.rotation.z = dead ? Math.PI / 3 : 0;
    this.body.position.z = reducedMotion || dead ? 0 : hit * 0.22 * (unit.side === 'enemy' ? -1 : 1);
    this.ring.scale.setScalar(0.68 + (reducedMotion ? 0 : Math.sin(time * MOTION.glowRate) * 0.025));
    this.health.visible = !dead && unit.hp !== undefined;
    this.healthBack.visible = this.health.visible;
    this.label.sprite.visible = !dead;
    this.feedback.animate(time, reducedMotion);
  }

  dispose() {
    this.feedback.dispose();
    this.label.dispose();
    this.root.removeFromParent();
  }
}

class SceneCard {
  constructor(resources, card) {
    this.root = new THREE.Group();
    const color = card.type === 'defense' ? P.pine : card.type === 'spell' ? P.purple : P.coral;
    this.root.add(resources.mesh({ color: P.gold, size: [1.22, 0.12, 1.85] }));
    this.root.add(resources.mesh({ color, size: [1.12, 0.14, 1.74], at: [0, 0.06, 0] }));
    this.root.add(resources.mesh({ kind: 'rock', color: P.paper, size: [0.35, 0.45, 0.35], at: [0, 0.35, 0] }));
    this.label = new SceneLabel();
    this.label.sprite.scale.set(1.8, 0.6, 1);
    this.label.sprite.position.set(0, 0.68, 0.55);
    this.root.add(this.label.sprite);
  }

  update(card) {
    this.root.position.set(card.x, card.action ? 0.25 : 0.04, card.z);
    this.root.rotation.x = -0.12;
    this.root.userData.action = card.action || null;
    this.root.userData.key = card.key;
    this.root.userData.label = card.name + '，' + card.cost + ' 灵力';
    this.label.update({ title: card.name, detail: card.cost + ' 灵力', active: Boolean(card.action) });
  }

  animate() {}

  dispose() {
    this.label.dispose();
    this.root.removeFromParent();
  }
}

export class ScenePieces {
  constructor(resources) {
    this.resources = resources;
    this.root = new THREE.Group();
    this.pieces = new Map();
  }

  update(model, time) {
    const items = [...model.units.map(unit => ({ ...unit, pieceType: 'unit' })),
      ...model.cards.map(card => ({ ...card, pieceType: 'card' }))];
    const keys = new Set(items.map(item => item.key));
    for (const [key, piece] of this.pieces) {
      if (keys.has(key)) continue;
      piece.dispose();
      this.pieces.delete(key);
    }
    items.forEach(item => this.updatePiece(item, time));
  }

  updatePiece(item, time) {
    if (!this.pieces.has(item.key)) {
      const piece = item.pieceType === 'card' ? new SceneCard(this.resources, item) : new SceneUnit(this.resources, item);
      this.pieces.set(item.key, piece);
      this.root.add(piece.root);
    }
    this.pieces.get(item.key).update(item, time);
  }

  animate(time, elapsed, reducedMotion) {
    this.pieces.forEach(piece => piece.animate(time, elapsed, reducedMotion));
  }

  get targets() {
    return [...this.pieces.values()].map(piece => piece.root).filter(root => root.userData.action);
  }

  dispose() {
    this.pieces.forEach(piece => piece.dispose());
    this.pieces.clear();
  }
}
