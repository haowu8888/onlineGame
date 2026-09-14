(function(root) {
  const ICONS = new Set(['mountain', 'forest', 'ruins', 'town', 'sect', 'water', 'desert', 'forbidden', 'mist', 'plains']);
  const RECENT_EVENTS = 3;
  const QUICK_REST_TIMES = 2;
  const KEY_DIRECTIONS = Object.freeze({
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
  });

  function terrainIcon(name) {
    if (!ICONS.has(name)) throw new Error(`Unknown terrain icon: ${name}`);
    return `<svg class="atlas-terrain-icon" viewBox="0 0 48 48" aria-hidden="true"><use href="../assets/guigu-terrain.svg#${name}"></use></svg>`;
  }

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createMovement(options) {
    const { directions, onMove, getPosition } = options;
    const controls = createElement('div', 'atlas-movement');
    controls.innerHTML = '<div class="atlas-direction-heading"><span>移动一格</span><span id="atlas-step-cost"></span></div>';
    const pad = createElement('div', 'atlas-direction-pad');
    directions.forEach(direction => {
      const button = createElement('button', 'atlas-direction', direction.arrow);
      button.type = 'button';
      button.dataset.dx = direction.x;
      button.dataset.dy = direction.y;
      button.dataset.direction = direction.label;
      button.style.gridColumn = direction.x + 2;
      button.style.gridRow = direction.y + 2;
      button.addEventListener('click', () => {
        const position = getPosition();
        onMove({ x: position.x + direction.x, y: position.y + direction.y });
      });
      pad.append(button);
    });
    const center = createElement('span', 'atlas-direction-center', '此处');
    center.setAttribute('aria-hidden', 'true');
    pad.append(center);
    controls.append(pad);
    return controls;
  }

  function createActions(options) {
    const actions = createElement('div', 'atlas-local-actions');
    const items = [
      { id: 'explore', label: '探索此地', days: options.costs.explore },
      { id: 'gather', label: '采集材料', days: options.costs.explore },
      { id: 'rest', label: '休养恢复', days: options.costs.rest * QUICK_REST_TIMES },
      { id: 'meditate', label: '静坐修炼', days: options.costs.meditate },
    ];
    items.forEach(item => {
      const button = createElement('button', 'atlas-local-action');
      button.type = 'button';
      const duration = `${item.id === 'rest' ? '最多 ' : ''}${item.days} 天`;
      button.append(createElement('span', '', item.label), createElement('small', '', duration));
      button.addEventListener('click', () => options.onAction(item.id));
      actions.append(button);
    });
    return actions;
  }

  function createRoute(onStep) {
    const route = createElement('section', 'atlas-route');
    route.setAttribute('aria-label', '行路计划');
    route.innerHTML = `<div class="atlas-section-label">行路计划</div><h3 id="atlas-destination">选择目的地</h3>
      <p id="atlas-route-summary" role="status"></p><p id="atlas-route-next"></p>
      <button class="btn btn-gold" id="atlas-route-step" type="button" disabled>在地图上选择目标</button>`;
    route.querySelector('button').addEventListener('click', onStep);
    return route;
  }

  function createLegend(terrain) {
    const details = createElement('details', 'atlas-legend');
    details.append(createElement('summary', '', '地形图例'));
    const items = createElement('div', 'atlas-legend-items');
    terrain.forEach(type => {
      const item = createElement('span', `atlas-legend-item terrain-${type.cls}`);
      item.innerHTML = terrainIcon(type.cls);
      item.append(document.createTextNode(type.name));
      items.append(item);
    });
    details.append(items);
    return details;
  }

  function bindKeyboard(grid) {
    grid.addEventListener('keydown', event => {
      const cell = event.target.closest('.map-cell');
      if (!cell) return;
      const delta = KEY_DIRECTIONS[event.key];
      if (!delta && event.key !== 'Home') return;
      event.preventDefault();
      const x = Number(cell.dataset.x) + (delta ? delta[0] : 0);
      const y = Number(cell.dataset.y) + (delta ? delta[1] : 0);
      const next = event.key === 'Home' ? grid.querySelector('.player')
        : grid.querySelector(`[data-x="${x}"][data-y="${y}"]`);
      if (next && !next.disabled && !next.hidden) next.focus();
    });
    grid.addEventListener('focusin', event => {
      grid.querySelectorAll('.map-cell').forEach(cell => { cell.tabIndex = cell === event.target ? 0 : -1; });
    });
  }

  function mount(options) {
    const { panel } = options;
    const chart = panel.querySelector('.atlas-chart');
    const heading = createElement('div', 'atlas-chart-heading');
    heading.innerHTML = `<div><strong>八荒舆图</strong><span id="atlas-explored"></span></div>
      <div class="atlas-view-switch" aria-label="地图视野"><button type="button" data-atlas-scale="near" aria-pressed="true">附近</button>
      <button type="button" data-atlas-scale="full" aria-pressed="false">全图</button></div>`;
    panel.dataset.atlasScale = 'near';
    heading.querySelectorAll('[data-atlas-scale]').forEach(button => {
      button.addEventListener('click', () => {
        panel.dataset.atlasScale = button.dataset.atlasScale;
        heading.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        options.onViewportChange();
      });
    });
    chart.prepend(heading);
    const caption = createElement('p', 'atlas-chart-caption', '点相邻地块移动 · 点远处地块规划路线');
    chart.append(caption, createLegend(options.terrain));
    const sidebar = panel.querySelector('.atlas-sidebar');
    const detail = panel.querySelector('#map-detail-sidebar');
    sidebar.insertBefore(createActions(options), detail);
    sidebar.insertBefore(createRoute(options.onStep), detail);
    sidebar.insertBefore(createMovement(options), detail);
    const journal = createElement('section', 'atlas-journal');
    journal.innerHTML = '<h3>山海纪事</h3><ol id="atlas-journal-list"></ol>';
    panel.append(journal);
    bindKeyboard(panel.querySelector('.map-grid'));
  }

  function updateRoute(options) {
    const { panel, state, terrain, path, selected, stepDays } = options;
    const destination = panel.querySelector('#atlas-destination');
    const summary = panel.querySelector('#atlas-route-summary');
    const next = panel.querySelector('#atlas-route-next');
    const button = panel.querySelector('#atlas-route-step');
    button.disabled = !path || path.length === 0 || state.dead;
    if (!selected) {
      destination.textContent = '下一站，去哪里';
      summary.textContent = '选择一处已探索的地块，查看路线与行路耗时。';
      next.textContent = '';
      button.textContent = '在地图上选择目标';
      return;
    }
    const cell = state.map[selected.y][selected.x];
    destination.textContent = `${cell.locName || terrain[cell.terrain].name} · ${selected.x}, ${selected.y}`;
    if (!path || path.length === 0) {
      summary.textContent = path ? '已在目的地，可以探索、采集或休养。' : '已知地图尚未连通，先探索周边区域。';
      next.textContent = '';
      button.textContent = path ? '已到达' : '暂无可用路线';
      return;
    }
    const danger = Math.max(...path.map(point => terrain[state.map[point.y][point.x].terrain].danger));
    summary.textContent = `${path.length} 步 · 行路 ${path.length * stepDays} 天 · 沿途危险 ${danger}`;
    const first = path[0];
    const firstCell = state.map[first.y][first.x];
    next.textContent = `下一步：${firstCell.locName || terrain[firstCell.terrain].name}（${first.x}, ${first.y}） · 遭遇另计`;
    button.textContent = `前往下一格 · ${stepDays} 天`;
  }

  function updateDirections(options) {
    const { panel, state, terrain, stepDays } = options;
    panel.querySelector('#atlas-step-cost').textContent = `${stepDays} 天 / 格`;
    panel.querySelectorAll('.atlas-direction').forEach(button => {
      const x = state.position.x + Number(button.dataset.dx);
      const y = state.position.y + Number(button.dataset.dy);
      const explored = Boolean(state.fog[y] && state.fog[y][x]);
      button.disabled = !explored || state.dead;
      const name = explored ? terrain[state.map[y][x].terrain].name : '未探索区域';
      const label = `向${button.dataset.direction}移动：${name}`;
      button.setAttribute('aria-label', label);
      button.title = label;
    });
  }

  function updateChart(options) {
    const { panel, state, path, selected, viewport } = options;
    const route = new Set((path || []).map(point => `${point.x},${point.y}`));
    const grid = panel.querySelector('.map-grid');
    grid.style.setProperty('--atlas-columns', viewport.columns);
    const focused = grid.contains(document.activeElement) ? document.activeElement : grid.querySelector('.player');
    panel.querySelectorAll('.map-cell').forEach(cell => {
      const x = Number(cell.dataset.x), y = Number(cell.dataset.y);
      cell.hidden = x < viewport.left || y < viewport.top || x >= viewport.left + viewport.columns || y >= viewport.top + viewport.rows;
      cell.classList.toggle('on-route', route.has(`${x},${y}`));
      cell.classList.toggle('route-destination', Boolean(selected && selected.x === x && selected.y === y));
      cell.tabIndex = cell === focused ? 0 : -1;
    });
    const discovered = state.fog.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    const total = state.map.reduce((sum, row) => sum + row.length, 0);
    panel.querySelector('#atlas-explored').textContent = `已探索 ${discovered} / ${total}`;
  }

  function updateJournal(options) {
    const list = options.panel.querySelector('#atlas-journal-list');
    const events = options.state.worldLog.slice(0, RECENT_EVENTS);
    list.replaceChildren();
    if (!events.length) { list.append(createElement('li', 'atlas-journal-empty', '行路尚未留下纪事。')); return; }
    events.forEach(event => {
      const item = createElement('li', '');
      item.append(createElement('time', '', `第 ${event.year} 年`), createElement('span', '', event.text));
      list.append(item);
    });
  }

  function update(options) {
    updateRoute(options);
    updateDirections(options);
    updateChart(options);
    updateJournal(options);
  }

  root.GuiguAtlas = { mount, update, terrainIcon };
})(window);
