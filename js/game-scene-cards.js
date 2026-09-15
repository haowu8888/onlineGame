(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CardSceneModels = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const UNIT_SPACING = 2;
  const HAND_SPACING = 1.4;
  const TEAM_SIZE = 5;
  const centered = (index, count, spacing) => (index - (count - 1) / 2) * spacing;

  function fieldUnits({ field, side, selected, eligible }) {
    return field.map((unit, index) => ({ key: side + '-' + index + '-' + unit.name,
      name: unit.name, side, hp: unit.hp, maxHp: unit.maxHp, atk: unit.atk,
      role: unit.taunt ? 'guard' : 'sword', selected: side === 'player' && index === selected,
      x: centered(index, field.length, UNIT_SPACING), z: side === 'enemy' ? -1.8 : 1.6,
      action: eligible(index) ? { type: side + '-unit', index } : null }));
  }

  function battle({ state, tactics, selected, spell, animating, maxField }) {
    const model = { kind: 'board', theme: 'cardbattle', title: '灵卡演武',
      caption: '选择对手，布阵开战', units: [], cards: [], markers: [] };
    if (!state) return model;
    const targets = tactics.selectionTargets({ state, spell, minionIndex: selected });
    const canAct = state.phase === 'player' && !state.gameOver && !animating;
    const player = fieldUnits({ field: state.playerField, side: 'player', selected,
      eligible: index => canAct && (spell ? targets.player.includes(index) : state.playerField[index].canAttack) });
    const enemy = fieldUnits({ field: state.enemyField, side: 'enemy', selected,
      eligible: index => canAct && targets.enemy.includes(index) });
    const masters = [
      { key: 'enemy-master', name: state.enemyName, side: 'enemy', role: 'sage', x: 0, z: -4.7,
        hp: state.enemyHP, maxHp: state.enemyMaxHP, action: canAct && targets.master ? { type: 'enemy-master' } : null },
      { key: 'player-master', name: '我方仙师', side: 'player', role: 'sage', x: -5.8, z: 4.8,
        hp: state.playerHP, maxHp: state.playerMaxHP },
    ];
    const cards = state.playerHand.map((card, index) => ({ key: 'hand-' + index + '-' + card.name,
      name: card.name, cost: card.cost, type: card.type,
      x: centered(index, state.playerHand.length, HAND_SPACING), z: 5,
      action: tactics.cardStatus({ card, state, animating, maxField }).playable ? { type: 'hand', index } : null }));
    const selection = tactics.selectionText({ state, spell, minionIndex: selected });
    return { ...model, title: '第 ' + state.turn + ' 回合 · ' + (canAct ? '你的回合' : '等待对手'),
      caption: selection ? selection.instruction : '点选手牌出牌，点选己方弟子后选择攻击目标',
      units: [...masters, ...enemy, ...player], cards };
  }

  function collectUnit({ unit, index, count, side, readyUltimateIds, focusedEnemyId, running }) {
    const ultimateReady = running && unit.alive && readyUltimateIds.includes(unit.id);
    const action = side === 'enemy' ? (running && unit.alive ? { type: 'focus-enemy', id: unit.id } : null)
      : (ultimateReady ? { type: 'ultimate', id: unit.id } : null);
    return { key: side + '-' + unit.id, name: unit.name, side, hp: unit.hp,
      maxHp: unit.maxHp, atk: unit.atk, role: unit.role, level: unit.level,
      x: centered(index, count, UNIT_SPACING), z: side === 'enemy' ? -2.2 : 1.5,
      dead: unit.alive === false, selected: side === 'enemy' ? unit.id === focusedEnemyId : ultimateReady, action };
  }

  function collection({ state, roster, battleState, selectedSlot, readyUltimateIds, focusedEnemyId }) {
    const model = { kind: 'roster', theme: 'cardcollect', title: '仙友列阵',
      caption: '点选阵位换将 · 秘境战斗中点选发光仙友释放大招', cards: [], markers: [] };
    if (battleState) return { ...model, kind: 'board', inBattle: true,
      title: '第 ' + battleState.chapter + ' 章 · 第 ' + battleState.wave + ' 波',
      caption: '点选敌人锁定目标 · 仙友发光时点选释放大招',
      units: ['player', 'enemy'].flatMap(side => {
        const field = side === 'player' ? battleState.allies : battleState.enemies;
        return field.map((unit, index) => collectUnit({ unit, index, count: field.length, side,
          readyUltimateIds, focusedEnemyId, running: battleState.running }));
      }) };
    const byId = new Map(roster.map(card => [card.id, card]));
    const units = state.team.flatMap((id, index) => {
      if (id === null) return [];
      const card = byId.get(id);
      if (!card) throw new Error('阵容角色未在名册中找到：' + id);
      return [{ key: 'roster-' + id, name: card.name, side: 'player', role: card.role,
        level: card.level, atk: card.atk, hp: card.hp, maxHp: card.hp,
        x: centered(index, TEAM_SIZE, UNIT_SPACING), z: 0, selected: index === selectedSlot,
        action: { type: 'slot', index } }];
    });
    return { ...model, units, markers: state.team.flatMap((id, index) => id !== null ? [] : [{
      key: 'empty-' + index, name: '空阵位', x: centered(index, TEAM_SIZE, UNIT_SPACING), z: 0,
      action: { type: 'slot', index },
    }]) };
  }

  function towerRoute({ state, canSelect, nodeMeta, tactics }) {
    const rows = tactics.route({ state, canSelect }).filter(row => row.currentAct);
    const tiles = rows.flatMap((row, rowIndex) => row.nodes.map((node, index) => ({
      key: node.id, name: nodeMeta[node.type].name, detail: node.title, type: node.type,
      x: (node.lane - 1) * 3.6, z: ((rows.length - 1) / 2 - rowIndex) * 2.4,
      completed: node.completed, selected: node.selected,
      action: node.selectable ? { type: 'tower-node', id: node.id } : null,
      next: [...node.nextIds],
    })));
    return { kind: 'tower', theme: 'cardtower', title: rows[0].actName,
      caption: state.victory ? '此塔已通 · 道途由你开辟' : '点选发光节点前进 · 战斗、奇遇与休整由你选择',
      units: [], cards: [], markers: [], tiles };
  }

  function tower({ state, battle: combat, tactics, canSelect, nodeMeta, started }) {
    if (!started) return { kind: 'tower', theme: 'cardtower', title: '斩仙浮屠',
      caption: '选择职业，开启攀塔之旅', units: [], cards: [], markers: [], tiles: [] };
    if (!combat.inBattle) return towerRoute({ state, canSelect, nodeMeta, tactics });
    const canAct = combat.playerTurn && !state.gameOver && combat.enemies.length > 0;
    const enemies = combat.enemies.map((enemy, index) => ({ key: 'enemy-' + index + '-' + enemy.name,
      name: enemy.name, side: 'enemy', hp: enemy.hp, maxHp: enemy.maxHp,
      role: enemy.isBoss ? 'boss' : 'guard', x: centered(index, combat.enemies.length, 3), z: -2,
      detail: combat.getEnemyIntent(enemy).label }));
    const cards = state.hand.map((card, index) => {
      const cost = combat.getEffectiveCost(card);
      return { key: card.uid, name: card.name, cost, type: card.type,
        x: centered(index, state.hand.length, HAND_SPACING), z: 4.5,
        action: tactics.cardStatus({ card, cost, energy: state.energy, handSize: state.hand.length, canAct }).playable
          ? { type: 'tower-card', id: card.uid } : null };
    });
    return { kind: 'board', theme: 'cardtower', title: '第 ' + combat.turn + ' 回合',
      caption: canAct ? '点选手牌出招 · 高处显示敌方下一步意图' : '敌方行动中', cards, markers: [],
      units: [...enemies, { key: 'player', name: '攀塔修士', side: 'player', role: state.chosenClass,
        x: 0, z: 1, hp: state.hp, maxHp: state.maxHp }] };
  }

  return Object.freeze({ battle, collection, tower, towerRoute });
});
