/* 手札的 DOM 展示；不改变人物成长、事件或存档。 */
(function (root) {
  'use strict';
  const RECENT_COUNT = 6;
  const ATTR_BAR_SCALE = 10;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function attributeRow({ key, label, value }) {
    const row = element('div', 'ls-attr-bar');
    row.dataset.attr = key;
    const track = element('div', 'ls-attr-fill-bg');
    const fill = element('div', `ls-attr-fill ${key}`);
    fill.style.width = `${Math.min(100, value * ATTR_BAR_SCALE)}%`;
    track.appendChild(fill);
    row.append(element('span', 'ls-attr-name', label), track, element('span', 'ls-attr-num', value));
    return row;
  }

  function mount({ container, data, stages, model, labels }) {
    container.querySelector('.ls-attr-bars').replaceChildren(...Object.entries(labels)
      .map(([key, label]) => attributeRow({ key, label, value: data.attrs[key] })));
    const heading = element('header', 'ls-journal-head');
    const title = element('div', 'ls-journal-title');
    title.append(element('p', 'ls-kicker', '一世一卷 · 仙途手札'), element('h1', '', `${data.name}的人生`));
    const age = element('div', 'ls-age-seal');
    age.append(element('strong', '', data.age), element('span', '', '岁'));
    heading.append(title, age);
    const timeline = element('ol', 'ls-yearline');
    timeline.setAttribute('aria-label', '人生阶段');
    model.getTimeline(data.age, stages).forEach(stage => {
      const item = element('li', stage.current ? 'current' : stage.passed ? 'passed' : '');
      if (stage.current) item.setAttribute('aria-current', 'step');
      item.append(element('b', '', stage.name), element('span', '', `${stage.minAge}岁起`));
      timeline.appendChild(item);
    });
    const layout = element('div', 'ls-life-layout');
    const sheet = element('aside', 'ls-state-column');
    sheet.setAttribute('aria-label', '人物状态');
    const event = container.querySelector('.ls-event-area');
    const recent = container.querySelector('.ls-log-area');
    [...container.children].forEach(node => { if (node !== event && node !== recent) sheet.appendChild(node); });
    layout.append(sheet, event, recent);
    container.replaceChildren(heading, timeline, layout);
  }

  function refreshStats({ container, data, maxLife, realmName }) {
    Object.entries(data.attrs).forEach(([key, value]) => {
      const row = container.querySelector(`[data-attr="${key}"]`);
      if (!row) return;
      row.querySelector('.ls-attr-num').textContent = value;
      row.querySelector('.ls-attr-fill').style.width = `${Math.min(100, value * ATTR_BAR_SCALE)}%`;
    });
    const gold = container.querySelector('[data-stat="gold"]');
    const realm = container.querySelector('[data-stat="realm"]');
    if (gold) gold.textContent = data.gold;
    if (realm) realm.textContent = realmName;
    const lifeLabel = container.querySelector('.ls-life-bar-label');
    const lifeFill = container.querySelector('.ls-life-bar-fill');
    if (!lifeLabel || !lifeFill) return;
    const percent = Math.min(100, data.age / maxLife * 100);
    lifeLabel.firstElementChild.textContent = `寿命 ${data.age} / ${maxLife}岁`;
    lifeLabel.lastElementChild.textContent = `${percent.toFixed(0)}%`;
    lifeFill.style.width = `${percent}%`;
    lifeFill.classList.toggle('low', percent > 80);
  }

  function showChanges({ container, before, after, labels, model }) {
    const changes = model.getChanges({ before, after, labels });
    const panel = element('div', 'ls-result-deltas');
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-label', '本次属性变化');
    if (!changes.length) panel.appendChild(element('span', 'ls-delta-neutral', '属性与金币未改变'));
    changes.forEach(change => {
      const item = element('span', `ls-delta ${change.delta > 0 ? 'positive' : 'negative'}`);
      item.append(element('span', '', change.label), element('b', '', `${change.delta > 0 ? '+' : ''}${change.delta}`));
      item.title = `${change.before} → ${change.value}`;
      panel.appendChild(item);
    });
    const result = container.querySelector('.ls-event-result');
    if (result) result.after(panel);
    else container.prepend(panel);
  }

  function logRow(entry) {
    const row = element('li', 'ls-journal-entry');
    row.append(element('span', 'ls-journal-age', entry.age === null ? '纪事' : `${entry.age}岁`));
    row.append(element('p', '', entry.text));
    return row;
  }

  function renderRecent({ container, logs, model, onOpen }) {
    const area = container.querySelector('.ls-log-area');
    if (!area) return;
    const heading = element('div', 'ls-log-heading');
    const button = element('button', 'btn btn-outline btn-sm', `查阅手札 · ${logs.length}`);
    button.id = 'btn-history';
    button.type = 'button';
    button.addEventListener('click', onOpen);
    heading.append(element('h2', '', '近日纪事'), button);
    const list = element('ol', 'ls-recent-list');
    model.parseLogs(logs).slice(-RECENT_COUNT).reverse().forEach(entry => list.appendChild(logRow(entry)));
    area.replaceChildren(heading, list);
  }

  function historyControls(stages) {
    const controls = element('div', 'ls-history-controls');
    const searchLabel = element('label', '', '查找纪事');
    const search = element('input', 'ls-history-search');
    search.type = 'search';
    search.placeholder = '事件、人物或年岁';
    searchLabel.appendChild(search);
    const stageLabel = element('label', '', '人生阶段');
    const select = element('select', 'ls-history-stage');
    select.appendChild(new Option('全部阶段', 'all'));
    stages.forEach((stage, index) => select.appendChild(new Option(stage.name, index)));
    stageLabel.appendChild(select);
    controls.append(searchLabel, stageLabel);
    return { controls, search, select };
  }

  function openHistory({ logs, stages, model, Focus, onClose }) {
    const entries = model.parseLogs(logs);
    const overlay = element('div', 'modal-overlay ls-history-overlay');
    overlay.id = 'history-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ls-history-title');
    const panel = element('section', 'modal ls-history-panel');
    const heading = element('div', 'ls-history-heading');
    const title = element('h2', '', '人生手札');
    title.id = 'ls-history-title';
    const closeButton = element('button', 'btn btn-outline btn-sm', '关闭');
    closeButton.id = 'close-history';
    heading.append(title, closeButton);
    const { controls, search, select } = historyControls(stages);
    const count = element('p', 'ls-history-count');
    count.setAttribute('role', 'status');
    const list = element('ol', 'ls-history-list');
    const note = element('p', 'ls-history-note', '存档保留最近 50 条；本次游玩的更早纪事可在离开前查阅。');
    panel.append(heading, controls, count, list, note);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    const focus = new Focus(overlay);
    const close = () => { focus.destroy(); overlay.remove(); onClose?.(); };
    const render = () => {
      const stage = select.value === 'all' ? null : stages[Number(select.value)];
      const filtered = model.filterEntries(entries, { query: search.value, stage });
      count.textContent = `找到 ${filtered.length} 条 · 共 ${entries.length} 条纪事`;
      list.replaceChildren(...filtered.slice().reverse().map(logRow));
      if (!filtered.length) list.appendChild(element('li', 'ls-history-empty', '没有符合条件的纪事'));
    };
    search.addEventListener('input', render);
    select.addEventListener('change', render);
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    render();
    focus.open();
    return close;
  }

  root.LifeJournalView = Object.freeze({ mount, refreshStats, showChanges, renderRecent, openHistory });
})(globalThis);
