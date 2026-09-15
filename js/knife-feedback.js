import { TAU } from './knife-data.js?v=34';

export const FeedbackMethods = {
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
    for (const text of this.dmgTexts) text.update();
    this.particles = this.particles.map(particle => ({ ...particle, x: particle.x + particle.vx,
      y: particle.y + particle.vy, vy: particle.vy + 0.04, life: particle.life - 0.025 })).filter(particle => particle.life > 0);
    const PARTICLE_LIMIT = 300;
    const PARTICLE_RETAINED = 150;
    if (this.particles.length > PARTICLE_LIMIT) this.particles = this.particles.slice(-PARTICLE_RETAINED);
    this.bladeTrails = this.bladeTrails.map(trail => ({ ...trail, life: trail.life - 0.08 })).filter(trail => trail.life > 0);
    this.dashTrails = this.dashTrails.map(trail => ({ ...trail, life: trail.life - 0.1 })).filter(trail => trail.life > 0);
  },
};
