import { createKnifeIcon } from './knife-icons.js?v=35';

export class KnifeMenu {
  constructor({ game, progress, milestones, modifiers, upgrades, upgradeCost }) {
    Object.assign(this, { game, progress, milestones, modifiers, upgrades, upgradeCost });
    this.overlay = document.getElementById('knife-overlay');
    this.title = document.getElementById('knife-overlay-title');
    this.description = document.getElementById('knife-overlay-desc');
    this.startButton = document.getElementById('knife-overlay-btn');
    this.shopButton = document.getElementById('knife-shop-btn');
    this.main = document.getElementById('knife-menu-content');
    this.shop = document.getElementById('knife-perm-shop');
    this.selected = new Set();
    this.result = null;
    this.shopButton.addEventListener('click', () => this.showShop());
    document.getElementById('perm-shop-close').addEventListener('click', () => this.show(this.game.state));
    this.buildModifiers();
  }

  getSelectedModifiers() {
    return this.modifiers.filter(modifier => this.selected.has(modifier.id));
  }

  show(view) {
    this.overlay.dataset.view = view;
    this.overlay.classList.add('active');
    this.overlay.inert = false;
    this.main.hidden = false;
    this.shop.hidden = true;
    document.getElementById('knife-challenges').hidden = view !== 'menu';
    document.getElementById('knife-progress').hidden = view !== 'menu';
    document.getElementById('knife-records').hidden = view === 'paused';
    this.shopButton.hidden = view === 'paused';
    const copy = {
      menu: ['转转刀', '走位避敌，旋刃迎战。\n拾取灵晶，搭配武学，杀出自己的江湖。', '开始试炼'],
      paused: ['且歇片刻', '战斗已暂停。\n准备好后，继续你的江湖之行。', '继续战斗'],
      over: ['胜败皆修行', this.result?.description || '', '重新出山'],
    }[view];
    [this.title.textContent, this.description.textContent, this.startButton.textContent] = copy;
    if (view !== 'paused') this.renderProgress();
    if (view === 'paused' || view === 'over') this.startButton.focus({ preventScroll: true });
  }

  hide() {
    this.overlay.classList.remove('active');
    this.overlay.inert = true;
  }

  renderProgress() {
    const data = this.progress.load();
    document.getElementById('knife-records').hidden = this.game.state === 'menu' && !data.gamesPlayed;
    const records = [['最高波次', data.maxWave], ['累计击败', data.kills], ['持有金币', data.gold]];
    document.getElementById('knife-records').replaceChildren(...records.map(([label, value]) => {
      const item = document.createElement('div');
      const number = document.createElement('strong');
      const caption = document.createElement('span');
      number.textContent = formatNumber(value || 0);
      caption.textContent = label;
      item.append(number, caption);
      return item;
    }));
    document.getElementById('knife-progress-summary').textContent = `修炼成就 ${data.unlocked.length} / ${this.milestones.length}`;
    const list = document.getElementById('knife-milestones');
    list.replaceChildren(...this.milestones.map(milestone => {
      const row = document.createElement('li');
      const unlocked = data.unlocked.includes(milestone.id);
      row.classList.toggle('unlocked', unlocked);
      row.textContent = `${unlocked ? '已达成' : '未达成'} · ${milestone.label} — ${milestone.desc}`;
      return row;
    }));
  }

  buildModifiers() {
    const list = document.getElementById('knife-modifiers');
    list.replaceChildren(...this.modifiers.map(modifier => {
      const button = document.createElement('button');
      button.className = 'knife-mod-btn';
      button.type = 'button';
      button.textContent = modifier.name;
      button.title = `${modifier.desc} · 金币 ×${modifier.goldMul}`;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        if (this.selected.has(modifier.id)) this.selected.delete(modifier.id);
        else this.selected.add(modifier.id);
        button.setAttribute('aria-pressed', String(this.selected.has(modifier.id)));
        const descriptions = this.getSelectedModifiers().map(item => `${item.name}：${item.desc}`);
        document.getElementById('knife-modifier-hint').textContent = descriptions.join('；') || '可叠加，挑战越险，所得越丰。';
      });
      return button;
    }));
  }

  recordResult() {
    if (this.result) return;
    const player = this.game.player;
    const milestones = this.progress.recordGame(player.kills, this.game.wave);
    const lines = [
      `存活 ${this.game.getTimeStr()} · 到达第 ${this.game.wave} 波`,
      `击败 ${player.kills} 人 · 修炼至 ${player.level} 级`,
      `造成 ${formatNumber(player.totalDmgDealt)} 伤害 · 获得 ${player.goldEarned || 0} 金币`,
      ...milestones.map(item => `新成就：${item.label}（${item.desc}）`),
    ];
    this.result = Object.freeze({ description: lines.join('\n') });
    this.reportResult();
  }

  reportResult() {
    const { player, wave, activeModifiers } = this.game;
    const detail = { wave, level: player.level, time: this.game.getTimeStr() };
    updateLeaderboard('knife', player.kills, detail);
    if (activeModifiers.length) {
      const key = 'knife_' + activeModifiers.map(item => item.id).sort().join('_');
      updateLeaderboard(key, player.kills, { ...detail, mods: activeModifiers.map(item => item.name).join('+') });
    }
    const stats = { knife_max_wave: wave, knife_max_kills: player.kills,
      knife_kills: player.kills, knife_run_gold: player.goldEarned || 0 };
    Object.entries(stats).forEach(([key, value]) => CrossGameAchievements.trackStat(key, value));
  }

  showShop() {
    this.overlay.dataset.view = 'shop';
    this.main.hidden = true;
    this.shop.hidden = false;
    const gold = this.progress.getGold();
    document.getElementById('knife-shop-gold').textContent = formatNumber(gold);
    document.getElementById('knife-shop-items').replaceChildren(...this.upgrades.map(upgrade => this.shopItem(upgrade, gold)));
    document.getElementById('perm-shop-close').focus({ preventScroll: true });
  }

  shopItem(upgrade, gold) {
    const level = this.progress.getPermLevel(upgrade.id);
    const maxed = level >= upgrade.maxLv;
    const cost = this.upgradeCost(upgrade, level);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'perm-shop-item';
    button.disabled = maxed || gold < cost;
    const content = [upgrade.icon, `${upgrade.name} ${level} / ${upgrade.maxLv}`, upgrade.desc,
      maxed ? '已满级' : `${cost} 金币${gold < cost ? ' · 金币不足' : ''}`];
    content.forEach((text, index) => {
      const span = document.createElement('span');
      if (index === 0) span.appendChild(createKnifeIcon(upgrade.id));
      else span.textContent = text;
      button.appendChild(span);
    });
    button.addEventListener('click', () => this.buyUpgrade(upgrade.id));
    return button;
  }

  buyUpgrade(id) {
    try {
      if (!this.progress.buyPermUpgrade(id)) {
        showToast('金币不足或强化已满级', 'info');
        this.showShop();
        return;
      }
      showToast('强化成功，下次出山生效', 'success');
      this.showShop();
    } catch (error) {
      console.error('[KnifeGame] purchase failed:', error);
      showToast(`强化未保存：${error.message}`, 'error');
    }
  }
}
