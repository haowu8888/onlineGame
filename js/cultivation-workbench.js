(function(root) {
  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function createStage(area) {
    const stage = makeElement('section', 'retreat-stage');
    stage.setAttribute('aria-label', '洞天修炼');
    stage.innerHTML = `<div class="retreat-heading"><span class="retreat-kicker">洞天 · 静修</span>
      <h2 id="retreat-name"></h2><span class="retreat-realm" id="retreat-realm"></span></div>
      <div class="retreat-seal" aria-hidden="true">修<br>心</div>`;
    const visual = area.querySelector('.meditation-visual');
    visual.textContent = '';
    visual.setAttribute('aria-hidden', 'true');
    const artwork = document.createElement('img');
    artwork.src = '../assets/cultivation-retreat.svg';
    artwork.alt = '';
    artwork.width = 800;
    artwork.height = 420;
    visual.append(artwork);
    const controls = makeElement('div', 'retreat-controls');
    controls.append(area.querySelector('#cult-info'), area.querySelector('.cultivation-actions'));
    stage.append(visual, controls);
    return stage;
  }

  function createGoal(area) {
    const goal = area.querySelector('.breakthrough-area');
    goal.classList.add('retreat-goal');
    const heading = makeElement('div', 'retreat-goal-heading');
    heading.innerHTML = `<span class="retreat-kicker">下一重境界</span><h3 id="retreat-next-realm"></h3>
      <p class="retreat-readiness" id="retreat-readiness" role="status"></p>`;
    const progress = makeElement('div', 'retreat-exp');
    progress.innerHTML = `<div class="retreat-progress-label"><span>修为</span><strong id="retreat-exp-text"></strong></div>
      <div class="progress-bar"><div class="progress-fill" id="retreat-exp-fill"></div></div>`;
    goal.prepend(heading, progress);
    const estimate = makeElement('p', 'retreat-estimate');
    estimate.id = 'retreat-estimate';
    const breakthrough = goal.querySelector('#btn-breakthrough');
    if (breakthrough) goal.insertBefore(estimate, breakthrough);
    const paths = makeElement('div', 'retreat-paths');
    paths.innerHTML = `<button class="retreat-text-button" data-retreat-tab="battle">历练积累悟道 <span aria-hidden="true">↗</span></button>
      <button class="retreat-text-button" data-retreat-tab="world">寻访世界机缘 <span aria-hidden="true">↗</span></button>`;
    goal.append(paths);
    return goal;
  }

  function bindActions(options) {
    const { panel, onNavigate, onClaim } = options;
    panel.querySelectorAll('[data-retreat-tab]').forEach(button => {
      button.addEventListener('click', () => onNavigate(button.dataset.retreatTab));
    });
    const quests = panel.querySelector('.quest-grid');
    if (quests) quests.addEventListener('click', event => {
      const button = event.target.closest('.quest-claim-btn');
      if (button) onClaim(Number(button.dataset.quest));
    });
  }

  function mount(options) {
    const area = options.panel.querySelector('.cultivation-area');
    const stage = createStage(area);
    const goal = createGoal(area);
    const footer = makeElement('div', 'retreat-footer');
    Array.from(area.children).filter(node => node !== goal).forEach(node => footer.append(node));
    area.classList.add('cultivation-workbench');
    area.replaceChildren(stage, goal, footer);
    bindActions(options);
  }

  function updateGoal(options) {
    const { panel, model, formatNumber, formatDuration } = options;
    panel.querySelector('#retreat-name').textContent = options.name;
    panel.querySelector('#retreat-realm').textContent = options.realmName;
    panel.querySelector('#retreat-next-realm').textContent = model.nextRealmName;
    const readiness = panel.querySelector('#retreat-readiness');
    const label = model.ready ? '修为与悟道已齐备' : '积累修为，参悟天地';
    const readinessText = model.complete ? '已至仙途之巅' : label;
    if (readiness.textContent !== readinessText) readiness.textContent = readinessText;
    panel.querySelector('.retreat-goal').classList.toggle('is-ready', model.ready);
    panel.querySelector('#retreat-exp-text').textContent = `${formatNumber(model.exp)} / ${formatNumber(model.expRequired)}`;
    panel.querySelector('#retreat-exp-fill').style.width = `${model.expProgress}%`;
    panel.querySelector('.retreat-exp').hidden = model.complete;
    const estimate = panel.querySelector('#retreat-estimate');
    if (!estimate) return;
    if (model.ready) { estimate.textContent = '可以尝试突破，丹药可提高成功率。'; return; }
    const action = model.meditating ? '按当前打坐速度，约' : '继续打坐后，预计';
    estimate.textContent = model.secondsToReady === null
      ? '当前修炼速度无法满足突破条件。'
      : `${action} ${formatDuration(model.secondsToReady)} 备齐突破条件。`;
  }

  function updateQuestCard(options) {
    const { card, quest, index, status } = options;
    card.classList.toggle('completable', status === 'ready');
    card.classList.toggle('claimed', status === 'claimed');
    const oldAction = card.querySelector('.quest-claim-btn, .quest-status');
    if (status === card.dataset.questState) return;
    card.dataset.questState = status;
    if (oldAction) oldAction.remove();
    if (status === 'active') return;
    if (status === 'claimed') { card.append(makeElement('span', 'quest-status', '已领取')); return; }
    const button = makeElement('button', 'btn btn-gold btn-xs quest-claim-btn', '领取奖励');
    button.type = 'button';
    button.dataset.quest = String(index);
    button.setAttribute('aria-label', `领取${quest.name}奖励`);
    card.append(button);
  }

  function updateQuests(options) {
    const { panel, quests, questStatus } = options;
    panel.querySelectorAll('.quest-card').forEach((card, index) => {
      const quest = quests[index];
      if (quest) updateQuestCard({ card, quest, index, status: questStatus(quest) });
    });
  }

  function selectChoice(options) {
    const { container, option } = options;
    container.querySelectorAll('button').forEach(button => {
      const selected = button === option;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  root.CultivationWorkbench = { mount, updateGoal, updateQuests, selectChoice };
})(window);
