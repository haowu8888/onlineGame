import { createKnifeIcon } from './knife-icons.js?v=38';

export class KnifeChoices {
  constructor({ game, onChoose }) {
    this.game = game;
    this.onChoose = onChoose;
    this.panel = document.getElementById('upgrade-panel');
    this.cards = document.getElementById('upgrade-cards');
    this.title = document.getElementById('upgrade-title');
    this.panel.addEventListener('keydown', event => this.trapFocus(event));
    this.cards.addEventListener('click', event => {
      const card = event.target.closest('[data-choice]');
      if (card) this.choose(Number(card.dataset.choice));
    });
    this.close();
  }

  show() {
    const blessing = this.game.state === 'blessing';
    const options = blessing ? this.game.pendingBlessings : this.game.pendingUpgrades;
    this.title.textContent = blessing ? '仙缘降临，择一项祝福' : `境界 ${this.game.player.level} · 选择你的下一招`;
    this.cards.replaceChildren(...options.map((option, index) => this.createCard({ option, index, blessing })));
    this.panel.hidden = false;
    this.panel.inert = false;
    this.panel.classList.add('active');
    this.cards.querySelector('button')?.focus({ preventScroll: true });
  }

  createCard({ option, index, blessing }) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.dataset.choice = index;
    card.dataset.kind = option.id.startsWith('skill_') ? 'skill' : 'upgrade';
    const count = this.game.player.upgradeCounts[option.id] || 0;
    const content = [
      ['upgrade-shortcut', String(index + 1)], ['upgrade-icon', option.icon],
      ['upgrade-name', option.name], ['upgrade-desc', option.desc],
      ['upgrade-count', blessing ? '本局生效' : `已修炼 ${count} / ${option.max} 重`],
    ];
    content.forEach(([className, text]) => {
      const element = document.createElement('span');
      element.className = className;
      if (className === 'upgrade-icon') element.appendChild(createKnifeIcon(option.id));
      else element.textContent = text;
      card.appendChild(element);
    });
    return card;
  }

  choose(index) {
    const blessing = this.game.state === 'blessing';
    const options = blessing ? this.game.pendingBlessings : this.game.pendingUpgrades;
    if (!['blessing', 'upgrading'].includes(this.game.state) || !options[index]) return;
    const selected = options[index];
    try {
      if (blessing) this.game.applyBlessing(index);
      else this.game.applyUpgrade(index);
      this.close();
      this.onChoose();
      showToast(`${selected.name}${blessing ? ' 生效' : ' +1'}`, 'success');
    } catch (error) {
      console.error('[KnifeGame] choice failed:', error);
      showToast(`强化未完成：${error.message}`, 'error');
    }
  }

  trapFocus(event) {
    if (event.key !== 'Tab') return;
    const buttons = [...this.cards.querySelectorAll('button')];
    const boundary = event.shiftKey ? buttons[0] : buttons[buttons.length - 1];
    if (document.activeElement !== boundary) return;
    event.preventDefault();
    (event.shiftKey ? buttons[buttons.length - 1] : buttons[0]).focus();
  }

  close() {
    this.panel.classList.remove('active');
    this.panel.inert = true;
    this.panel.hidden = true;
  }
}
