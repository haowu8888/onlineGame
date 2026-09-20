import { TAU } from './knife-data.js?v=38';

const PARTICLE_GRAVITY = 0.04;
const PARTICLE_FADE = 0.025;
const PARTICLE_LIMIT = 300;
const PARTICLE_RETAINED = 150;
const BLADE_TRAIL_FADE = 0.08;
const DASH_TRAIL_FADE = 0.1;
const IMPACT = Object.freeze({ normalFrames: 16, heavyFrames: 24, normalPower: 1.6,
  criticalPower: 5.2, defeatPower: 3.4, decay: 0.68, quiet: 0.02 });

// 每帧原地推进并压缩，几百个粒子和刀光不再逐帧重新分配对象。
function fadeInPlace(trails, step) {
  let write = 0;
  for (const trail of trails) {
    trail.life -= step;
    if (trail.life > 0) trails[write++] = trail;
  }
  trails.length = write;
}

export const FeedbackMethods = {
  emitImpact({ enemy, color, critical, defeated }) {
    const duration = critical || defeated ? IMPACT.heavyFrames : IMPACT.normalFrames;
    const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
    this.impacts.push({ x: enemy.x, y: enemy.y, radius: enemy.radius, angle,
      color, critical, defeated, duration, life: duration });
    const power = critical ? IMPACT.criticalPower : defeated ? IMPACT.defeatPower : IMPACT.normalPower;
    // 同帧群攻取最强的一击，镜头不会随目标数量累加到失控。
    if (power >= this.impactPower) {
      this.impactPower = power;
      this.impactAngle = angle;
    }
    const cue = critical ? 2 : 1;
    this.impactSound = Math.max(this.impactSound, cue);
  },

  updateImpacts() {
    if (this.impactSound) this.sound.play(this.impactSound === 2 ? 'critical' : 'impact');
    this.impactSound = 0;
    this.impactPower *= IMPACT.decay;
    if (this.impactPower < IMPACT.quiet) this.impactPower = 0;
    fadeInPlace(this.impacts, 1);
  },

  addShake(amount) {
    this.shakeX += (this.random() - 0.5) * amount;
    this.shakeY += (this.random() - 0.5) * amount;
  },

  emitParticles({ origin, count, color, speed = 3, spread = 0, size, life = 1 }) {
    for (let index = 0; index < count; index++) {
      this.particles.push({ x: origin.x + this.rnd(-spread, spread), y: origin.y + this.rnd(-spread, spread),
        vx: this.rnd(-speed, speed), vy: this.rnd(-speed, speed), life, color, size });
    }
  },

  emitParticleRing({ origin, count, speed, radius = 0, color, size }) {
    for (let index = 0; index < count; index++) {
      const direction = TAU * index / count;
      this.particles.push({ x: origin.x + Math.cos(direction) * radius, y: origin.y + Math.sin(direction) * radius,
        vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed, life: 1, color, size });
    }
  },

  healPlayer(amount, color = '#55dd88') {
    const gained = Math.min(amount, this.player.maxHp - this.player.hp);
    this.player.hp += gained;
    if (gained <= 0) return;
    this.dmgTexts.push(this.entities.text({ x: this.player.x + this.rnd(-8, 8), y: this.player.y - 25,
      text: '+' + gained, color, isCrit: false }));
  },

  updateFeedback() {
    this.updateImpacts();
    for (const text of this.dmgTexts) text.update();
    let write = 0;
    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += PARTICLE_GRAVITY;
      particle.life -= PARTICLE_FADE;
      if (particle.life > 0) this.particles[write++] = particle;
    }
    this.particles.length = write;
    if (this.particles.length > PARTICLE_LIMIT) this.particles = this.particles.slice(-PARTICLE_RETAINED);
    fadeInPlace(this.bladeTrails, BLADE_TRAIL_FADE);
    fadeInPlace(this.dashTrails, DASH_TRAIL_FADE);
  },
};
