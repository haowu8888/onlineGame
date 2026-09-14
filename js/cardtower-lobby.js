(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardTowerLobby = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ASCENSION_DESCRIPTIONS = Object.freeze([
    '敌人正常强度', '敌人生命 +10%，卡牌奖励 -1', '敌人生命 +20%，卡牌奖励 -1',
    '敌人生命 +30%，卡牌奖励 -1，首领额外行动', '敌人生命 +40%，卡牌奖励 -1，首领额外行动',
    '敌人生命 +50%，卡牌奖励 -2，首领额外行动', '敌人生命 +60%，卡牌奖励 -2，首领额外行动',
    '敌人生命 +70%，卡牌奖励 -2，首领双倍行动', '敌人生命 +80%，卡牌奖励 -2，首领双倍行动',
    '敌人生命 +90%，卡牌奖励 -2，首领双倍行动', '敌人生命 +100%，卡牌奖励 -2，首领双倍行动',
  ]);
  const CLASS_SIGILS = Object.freeze({ sword: 'blade', talisman: 'seal', body: 'shield' });

  function classCard(character, options) {
    const { escape: escapeHtml, sigil } = options;
    return '<button type="button" class="ct-class-card" data-class="' + character.id + '">'
      + '<span class="ct-class-art">' + sigil(CLASS_SIGILS[character.id]) + '</span>'
      + '<strong>' + escapeHtml(character.name) + '</strong><span class="ct-class-description">'
      + escapeHtml(character.desc) + '</span><span class="ct-class-passive">'
      + escapeHtml(character.passive) + '</span><span class="ct-class-hp">初始生命 '
      + character.statMod.hp + '</span><span class="ct-class-enter">以此道入塔 →</span></button>';
  }

  function difficulty(maximum) {
    if (!maximum) return '<p class="ct-class-difficulty">普通试炼 · 首次通关后解锁飞升难度</p>';
    const choices = Array.from({ length: maximum + 1 }, (_, index) =>
      '<option value="' + index + '">' + (index ? '飞升 ' + index : '普通试炼') + '</option>').join('');
    return '<label class="ct-ascension-label">试炼难度<select id="ct-ascension">' + choices
      + '</select></label><p id="ct-ascension-description" class="ct-class-difficulty">'
      + ASCENSION_DESCRIPTIONS[0] + '</p>';
  }

  function open(options) {
    const { document, classes, maximumAscension, onChoose } = options;
    const dialog = document.createElement('dialog');
    dialog.className = 'ct-class-dialog';
    dialog.setAttribute('aria-labelledby', 'ct-class-title');
    dialog.innerHTML = '<header class="ct-class-heading"><div><p>入塔之前</p><h2 id="ct-class-title">选择你的修炼之道</h2>'
      + '</div><button type="button" class="btn btn-outline btn-sm" data-close>返回</button></header>'
      + '<p class="ct-class-intro">三种起始牌组，三种破阵方式。被动效果会在每个回合生效。</p>'
      + '<div class="ct-class-grid">' + classes.map(character => classCard(character, options)).join('') + '</div>'
      + difficulty(maximumAscension);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('#ct-ascension')?.addEventListener('change', event => {
      dialog.querySelector('#ct-ascension-description').textContent = ASCENSION_DESCRIPTIONS[Number(event.target.value)];
    });
    dialog.querySelectorAll('[data-class]').forEach(button => button.addEventListener('click', () => {
      const ascension = Number(dialog.querySelector('#ct-ascension')?.value || 0);
      const choice = button.dataset.class;
      dialog.close();
      onChoose({ character: choice, ascension });
    }));
    dialog.showModal();
  }

  return Object.freeze({ open });
});
