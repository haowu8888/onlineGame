import * as THREE from './vendor/three.module.js?v=38';
import { SceneLabel } from './game-three-labels.js?v=38';

const EFFECT = Object.freeze({ duration: 0.68, lift: 0.9, baseHeight: 3.28,
  normalRadius: 0.75, heavyRadius: 1.15, heavyRatio: 0.2 });

export class SceneHitFeedback {
  constructor(resources) {
    this.root = new THREE.Group();
    this.startedAt = -Infinity;
    this.label = new SceneLabel();
    this.label.sprite.scale.set(1.5, 0.42, 1);
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffcf80,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, toneMapped: false });
    this.ring = new THREE.Mesh(resources.geometry('impactRing'), this.ringMaterial);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 1.15;
    this.root.add(this.ring, this.label.sprite);
    this.root.visible = false;
  }

  show({ before, after, maximum, time }) {
    if (!Number.isFinite(before) || before === after) return;
    const change = after - before;
    this.healing = change > 0;
    this.strength = Math.abs(change) / maximum >= EFFECT.heavyRatio ? EFFECT.heavyRadius : EFFECT.normalRadius;
    this.startedAt = time;
    this.label.update({ title: (change > 0 ? '+' : '−') + Math.abs(change),
      variant: this.healing ? 'heal' : 'damage' });
    this.ringMaterial.color.setHex(this.healing ? 0x83e6b7 : 0xffcf80);
  }

  animate(time, reducedMotion) {
    const progress = (time - this.startedAt) / EFFECT.duration;
    this.root.visible = !reducedMotion && progress >= 0 && progress < 1;
    if (!this.root.visible) return;
    const remaining = 1 - progress;
    this.label.sprite.position.y = EFFECT.baseHeight + progress * EFFECT.lift;
    this.label.material.opacity = Math.min(1, remaining * 3);
    const pop = 1 + Math.exp(-progress * 10) * 0.28;
    this.label.sprite.scale.set(1.5 * pop, 0.42 * pop, 1);
    this.ring.visible = !this.healing;
    this.ring.scale.setScalar(this.strength * (0.45 + progress * 1.4));
    this.ringMaterial.opacity = remaining ** 3 * 0.85;
  }

  dispose() {
    this.root.removeFromParent();
    this.ringMaterial.dispose();
    this.label.dispose();
  }
}
