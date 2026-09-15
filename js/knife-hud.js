import { createKnifeIcon } from './knife-icons.js?v=34';
import { DASH } from './knife-movement.js?v=34';

const FRAME_RATE = 60;
const TERRAIN_NAMES = Object.freeze({ plain: '青岚庭院', lava: '赤焰古道', ice: '寒玉秘境' });

function text(element, value) {
  const next = String(value);
  if (element.textContent !== next) element.textContent = next;
}

function fill(element, fraction) {
  const width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  if (element.style.width !== width) element.style.width = width;
}

export class KnifeHUD {
  constructor({ game, activateSkill }) {
    this.game = game;
    this.activateSkill = activateSkill;
    const ids = ['hp-fill', 'hp-text', 'xp-fill', 'hud-level', 'hud-wave', 'hud-kills',
      'hud-gold', 'hud-time', 'knife-boss-bar', 'knife-boss-name', 'knife-boss-hp-fill',
      'wave-announce', 'skill-bar', 'arena-terrain', 'hud-blades', 'knife-dash', 'dash-status', 'dash-cd-mask'];
    this.nodes = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
    this.skillNodes = [];
    this.signature = '';
  }

  render() {
    const { player } = this.game;
    if (!player) return;
    const nodes = this.nodes;
    fill(nodes['hp-fill'], player.hp / player.maxHp);
    fill(nodes['xp-fill'], player.xp / player.xpToNext());
    const values = { 'hp-text': `${player.hp} / ${player.maxHp}`, 'hud-level': player.level,
      'hud-wave': this.game.wave, 'hud-kills': player.kills, 'hud-gold': this.game.runGold || 0,
      'hud-time': this.game.getTimeStr(), 'arena-terrain': TERRAIN_NAMES[this.game.terrain.id], 'hud-blades': `×${player.bladeCount}` };
    Object.entries(values).forEach(([id, value]) => text(nodes[id], value));
    this.renderBoss();
    this.renderWave();
    this.renderSkills();
    this.renderDash();
  }

  renderDash() {
    const dash = this.game.player.dash;
    const seconds = Math.ceil(dash.cooldown / FRAME_RATE);
    const button = this.nodes['knife-dash'];
    const caption = dash.frames > 0 ? '闪避中' : seconds ? `${seconds}s` : '就绪';
    button.disabled = this.game.state !== 'playing' || dash.cooldown > 0;
    button.classList.toggle('active', dash.frames > 0);
    button.setAttribute('aria-label', `闪避 · ${caption} · 空格键`);
    text(this.nodes['dash-status'], caption);
    this.nodes['dash-cd-mask'].style.height = `${dash.cooldown / DASH.cooldown * 100}%`;
  }

  renderBoss() {
    const boss = this.game.enemies.find(enemy => enemy.isBoss && enemy.alive);
    this.nodes['knife-boss-bar'].hidden = !boss;
    if (!boss) return;
    text(this.nodes['knife-boss-name'], boss.name);
    fill(this.nodes['knife-boss-hp-fill'], boss.hp / boss.maxHp);
  }

  renderWave() {
    const announcement = this.nodes['wave-announce'];
    const active = this.game.waveTransition > 0 && this.game.waveTransition < 80;
    announcement.classList.toggle('active', active);
    if (!active) return;
    const boss = this.game._bossRush || this.game.wave % 5 === 0;
    announcement.classList.toggle('boss', boss);
    text(announcement, `${boss ? '首领来袭 · ' : ''}第 ${this.game.wave} 波`);
  }

  buildSkills() {
    this.skillNodes = this.game.skills.map((skill, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skill-slot';
      button.dataset.skill = skill.id;
      const content = [['skill-icon', skill.icon], ['skill-name', skill.name],
        ['skill-key', skill.key], ['skill-status', '待习得'], ['skill-cd-mask', '']];
      const children = content.map(([className, value]) => {
        const span = document.createElement('span');
        span.className = className;
        if (className === 'skill-icon') span.appendChild(createKnifeIcon(skill.id));
        else span.textContent = value;
        button.appendChild(span);
        return span;
      });
      button.addEventListener('click', () => this.activateSkill(index));
      return { button, status: children[3], mask: children[4] };
    });
    this.nodes['skill-bar'].replaceChildren(...this.skillNodes.map(item => item.button));
    const empty = document.createElement('p');
    empty.className = 'skills-empty';
    empty.textContent = '拾取灵晶，升级后可习得主动武学';
    this.nodes['skill-bar'].appendChild(empty);
  }

  renderSkills() {
    const signature = this.game.skills.map(skill => skill.id).join(',');
    if (signature !== this.signature) {
      this.signature = signature;
      this.buildSkills();
    }
    this.game.skills.forEach((skill, index) => {
      const { button, status, mask } = this.skillNodes[index];
      const seconds = Math.ceil(skill.currentCooldown / FRAME_RATE);
      const caption = !skill.unlocked ? '待习得' : skill.active ? '生效中' : seconds ? `${seconds}s` : '就绪';
      button.disabled = !skill.unlocked || seconds > 0 || this.game.state !== 'playing';
      button.classList.toggle('locked', !skill.unlocked);
      button.classList.toggle('active', skill.active);
      button.title = `${skill.name}：${skill.desc || ''}${skill.unlocked ? '' : ' · 升级时可习得'}`;
      button.setAttribute('aria-label', `${skill.key} · ${skill.name} · ${caption}`);
      text(status, caption);
      mask.style.height = `${skill.currentCooldown / skill.cooldown * 100}%`;
    });
  }
}
