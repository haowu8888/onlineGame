/* 角色册与五人阵位；事件回调由游戏入口注入。 */
(function (root) {
  'use strict';
  const QUALITY_CSS = Object.freeze({ '凡': 'fan', '灵': 'ling', '仙': 'xian', '圣': 'sheng' });
  const SORT_LABELS = Object.freeze({ quality: '品质', atk: '攻击', hp: '生命' });

  function portraitMarkup(id, className = 'cc-portrait') {
    return `<svg class="${className}" viewBox="0 0 120 144" aria-hidden="true" focusable="false">
      <use href="../assets/cardcollect/portraits.svg?v=38#character-${id}"></use></svg>`;
  }

  function portrait(card, escape) {
    return `<div class="cc-character-art" aria-hidden="true">${portraitMarkup(card.id)}
      <span class="cc-art-rarity">${escape(card.quality)}</span>
      <span class="cc-role-stamp">${escape(card.roleLabel)}</span></div>`;
  }

  function statsLine(card) {
    return `<div class="cc-card-attributes"><span>攻击 <b>${card.atk}</b></span><span>生命 <b>${card.hp}</b></span></div>`;
  }

  function teamSlot({ card, index, selected, escape }) {
    const number = String(index + 1).padStart(2, '0');
    if (!card) return `<div class="cc-team-slot cc-empty-slot ${selected ? 'selected' : ''}" data-slot="${index}">
      <span class="cc-seat-label">阵位 ${number}</span>
      <button class="cc-empty-select" data-select-slot="${index}" aria-pressed="${selected}" aria-label="选择阵位 ${index + 1}">
        <span aria-hidden="true">＋</span><b>待君入阵</b><small>选择候选角色</small>
      </button></div>`;
    const quality = QUALITY_CSS[card.quality];
    return `<article class="cc-team-slot filled quality-border-${quality} ${selected ? 'selected' : ''}" data-slot="${index}" data-char-id="${card.id}">
      <span class="cc-seat-label">阵位 ${number}</span>
      <button class="cc-team-inspect" data-inspect="${card.id}" aria-label="查看${escape(card.name)}详情">
        ${portrait(card, escape)}<span class="card-name">${escape(card.name)}</span>
        <span class="card-quality quality-${quality}">${escape(card.quality)}品 <span>· 等级 ${card.level}</span></span>
        ${statsLine(card)}
      </button>
      <div class="cc-seat-actions"><button data-select-slot="${index}" aria-pressed="${selected}">${selected ? '已选阵位' : '换将'}</button>
        <button data-remove="${index}" aria-label="让${escape(card.name)}下阵">下阵</button></div>
    </article>`;
  }

  function bindTeamActions({ slots, onSelectSlot, onRemove, onInspect }) {
    slots.onclick = event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.selectSlot !== undefined) onSelectSlot(Number(button.dataset.selectSlot));
      if (button.dataset.remove !== undefined) onRemove(Number(button.dataset.remove));
      if (button.dataset.inspect !== undefined) onInspect(Number(button.dataset.inspect));
    };
  }

  function renderSummary({ cards, team, model }) {
    const total = model.summarize({ cards, team });
    document.getElementById('team-summary').innerHTML = `
      <div><span>出战仙友</span><strong>${total.count}<small> / ${model.TEAM_SIZE}</small></strong></div>
      <div><span>合计攻击</span><strong>${total.atk}</strong></div>
      <div><span>合计生命</span><strong>${total.hp}</strong></div>
      <p>攻击 ${total.roles.ATK} · 防御 ${total.roles.DEF} · 辅助 ${total.roles.SUP}<br><small>含装备属性，阵法加成于战斗生效</small></p>`;
  }

  function renderTeam(options) {
    const { cards, team, selectedSlot, escape, formations } = options;
    const byId = new Map(cards.map(card => [card.id, card]));
    const slots = document.getElementById('team-slots');
    slots.classList.toggle('is-empty', team.every(id => id === null));
    slots.innerHTML = team.map((id, index) => teamSlot({ card: byId.get(id), index, selected: selectedSlot === index, escape })).join('');
    bindTeamActions({ slots, ...options });
    renderSummary(options);
    document.getElementById('team-formations').innerHTML = formations.length
      ? `<span class="cc-formation-label">已激活</span>${formations.map(f => `<span class="cc-formation-tag">${f.icon} ${escape(f.name)} <small>${escape(f.desc)}</small></span>`).join('')}`
      : '<span class="cc-formation-label">阵法未激活</span><span class="cc-formation-hint">搭配不同职业，或集齐五位仙友，即可触发阵法。</span>';
    const quick = document.getElementById('btn-auto-team');
    quick.textContent = `按${SORT_LABELS[options.sortMode]}上阵`;
    quick.disabled = cards.length === 0;
    quick.onclick = options.onAutoTeam;
    document.getElementById('btn-clear-team').disabled = team.every(id => id === null);
    document.getElementById('btn-clear-team').onclick = options.onClear;
    document.getElementById('cc-roster-sort').onchange = event => options.onSort(event.target.value);
    document.getElementById('cc-roster-sort').value = options.sortMode;
    const explore = document.getElementById('btn-team-chapter');
    explore.textContent = cards.length ? '前往秘境 →' : '前往召唤 →';
    explore.onclick = cards.length ? options.onExplore : options.onSummon;
    explore.disabled = cards.length > 0 && team.every(id => id === null);
  }

  function comparison(card, current, model) {
    if (!current || current.id === card.id) return '';
    const delta = model.compareCards(card, current);
    return `<div class="cc-card-comparison" aria-label="替换后的属性变化">${['atk', 'hp'].map(key =>
      `<span class="${delta[key] > 0 ? 'positive' : delta[key] < 0 ? 'negative' : ''}">${key === 'atk' ? '攻击' : '生命'} ${delta[key] > 0 ? '+' : ''}${delta[key]}</span>`).join('')}</div>`;
  }

  function benchCard({ card, team, current, target, model, escape }) {
    const teamIndex = team.indexOf(card.id);
    const quality = QUALITY_CSS[card.quality];
    const action = current ? '替换入阵' : target >= 0 ? '加入阵容' : '选择阵位';
    return `<article class="cc-bench-card quality-border-${quality} ${teamIndex >= 0 ? 'in-team' : ''}" data-char-id="${card.id}">
      <div class="cc-card-topline"><span class="quality-${quality}">${escape(card.quality)}品</span><span>等级 ${card.level}</span></div>
      ${portrait(card, escape)}<h4 class="card-name">${escape(card.name)}</h4>
      <p class="cc-card-skill" title="${escape(card.skillDesc)}">${escape(card.skillName)}</p>
      ${statsLine(card)}${teamIndex < 0 ? comparison(card, current, model) : ''}
      <div class="cc-card-actions">${teamIndex >= 0 ? `<span>阵位 ${teamIndex + 1}</span>` : `<button data-place="${card.id}">${action}</button>`}
        <button data-inspect="${card.id}" aria-label="查看${escape(card.name)}详情">详情</button></div>
    </article>`;
  }

  function renderEmpty({ list, hasCards, onSummon, onResetFilter }) {
    list.innerHTML = `<div class="cc-roster-empty"><span aria-hidden="true">✧</span>
      <h4>${hasCards ? '这个职业还没有仙友' : '第一位仙友，尚待结缘'}</h4>
      <p>${hasCards ? '换个职业查看已有角色，或前往召唤结识新仙友。' : '前往召唤获得角色，再将他们编入五人阵容。'}</p>
      <div>${hasCards ? '<button class="btn btn-outline btn-sm" data-reset-filter>查看全部</button>' : ''}
      <button class="btn btn-gold" data-summon>前往召唤</button></div></div>`;
    list.querySelector('[data-summon]').onclick = onSummon;
    const reset = list.querySelector('[data-reset-filter]');
    if (reset) reset.onclick = onResetFilter;
  }

  function renderBench(options) {
    const { cards, team, selectedSlot, filter, sortMode, model, escape } = options;
    const filtered = model.sortCards(cards.filter(card => filter === 'all' || card.role === filter), sortMode);
    const list = document.getElementById('bench-list');
    const target = selectedSlot === null ? team.indexOf(null) : selectedSlot;
    const current = target < 0 ? null : cards.find(card => card.id === team[target]);
    document.getElementById('cc-roster-count').textContent = `${filtered.length} 位候选 · 已拥有 ${cards.length} 位`;
    const hint = document.getElementById('cc-replace-hint');
    hint.textContent = current ? `正在比较阵位 ${target + 1} · ${current.name}，选择候选即可替换。`
      : target >= 0 ? `选择角色，加入阵位 ${target + 1}。` : '五位仙友已就位。点击阵位「换将」，比较候选的属性变化。';
    const cancel = document.getElementById('cc-cancel-slot');
    cancel.hidden = selectedSlot === null;
    cancel.onclick = () => options.onSelectSlot(null);
    if (!filtered.length) { renderEmpty({ list, hasCards: cards.length > 0, ...options }); return; }
    list.innerHTML = filtered.map(card => benchCard({ card, team, current, target, model, escape })).join('');
    list.onclick = event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.place !== undefined) options.onPlace(Number(button.dataset.place));
      if (button.dataset.inspect !== undefined) options.onInspect(Number(button.dataset.inspect));
    };
  }

  function renderPool({ characters, rates, escape }) {
    document.getElementById('gacha-showcase').innerHTML = Object.entries(rates).map(([quality, rate]) => {
      const card = characters.find(character => character.quality === quality);
      return `<article class="cc-pool-card quality-border-${QUALITY_CSS[quality]}">
        <span class="cc-pool-quality quality-${QUALITY_CSS[quality]}">${escape(quality)}品 <b>${Math.round(rate * 100)}%</b></span>
        <div class="cc-character-art" aria-hidden="true">${portraitMarkup(card.id)}</div>
        <strong>${escape(card.name)}</strong><small>卡池示例</small></article>`;
    }).join('');
    document.querySelector('.cc-gacha-rates').textContent = '基础概率：' + Object.entries(rates)
      .map(([quality, rate]) => `${quality}品 ${Math.round(rate * 100)}%`).join(' · ');
  }

  root.CardCollectRosterView = Object.freeze({ renderTeam, renderBench, renderPool, portraitMarkup });
})(globalThis);
