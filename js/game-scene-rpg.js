(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RpgSceneModels = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MAP_RADIUS = 3;
  const TILE_SIZE = 1.7;
  const CHOICE_SPACING = 3.1;
  const CHOICE_COLUMNS = 3;
  const CHOICE_ROW_SPACING = 1.8;

  function cultivationBattle(state, battle) {
    const monster = battle.monster;
    return { kind: 'board', theme: 'cultivation', title: state.name + ' · ' + monster.name,
      caption: battle.done ? '战斗已结束 · 点选修士返回历练' : '点选妖兽攻击 · 功法、丹药与捕捉在下方面板',
      units: [
        { key: 'player', name: state.name, side: 'player', role: 'sword', x: 0, z: 1.6,
          hp: state.hp, maxHp: state.maxHp, atk: state.atk,
          action: battle.done ? { type: 'battle-back' } : null },
        { key: 'monster-' + monster.id, name: monster.name, side: 'enemy', role: 'boss', x: 0, z: -2.2,
          hp: monster.currentHp, maxHp: monster.maxHp, atk: monster.atk,
          action: battle.done ? null : { type: 'battle-attack' } },
      ], cards: [], markers: [] };
  }

  function cultivation({ state, battle, realms, meditating }) {
    const model = { kind: 'retreat', theme: 'cultivation', title: '云台问道',
      caption: '选择存档，入山修行', units: [], cards: [], markers: [], level: 0, progress: 0 };
    if (!state) return model;
    if (battle) return cultivationBattle(state, battle);
    const realm = realms[state.realm];
    const next = realms[state.realm + 1];
    const player = { key: 'player', name: state.name, side: 'player', role: 'sage',
      level: state.realm, x: 0, z: 0, meditating, action: { type: 'meditate' } };
    return { ...model, title: realm.name + ' · ' + state.name,
      caption: meditating ? '灵气归元 · 点选修士停止修炼' : '道心澄明 · 点选修士开始修炼',
      units: [player], level: state.realm, progress: next ? Math.min(1, state.exp / next.expReq) : 1 };
  }

  function lifesim({ state, realms, maxLife, choices, eventTitle }) {
    const model = { kind: 'life', theme: 'lifesim', title: '一生一境',
      caption: '写下道号，开启此生', units: [], cards: [], markers: [], level: 0, progress: 0 };
    if (!state) return model;
    const markers = choices.map((choice, index) => ({
      key: choice.key, name: choice.text,
      x: (index % CHOICE_COLUMNS - (Math.min(choices.length, CHOICE_COLUMNS) - 1) / 2) * CHOICE_SPACING,
      z: 2.7 + Math.floor(index / CHOICE_COLUMNS) * CHOICE_ROW_SPACING,
      action: { type: 'life-choice', key: choice.key },
    }));
    return { ...model, title: state.name + ' · ' + state.age + ' 岁',
      caption: eventTitle || realms[state.realm].name, age: state.age, level: state.realm,
      progress: state.age / maxLife, markers,
      units: [{ key: 'player', name: realms[state.realm].name, side: 'player', role: 'sage',
        x: 0, z: 0, level: state.realm, age: state.age }] };
  }

  function mapTile({ state, terrain, x, y }) {
    const known = Boolean(state.fog[y][x]);
    const cell = state.map[y][x];
    const kind = known ? terrain[cell.terrain] : null;
    return { key: x + ',' + y, x: (x - state.position.x) * TILE_SIZE,
      z: (y - state.position.y) * TILE_SIZE, type: known ? kind.cls : 'fog',
      name: known ? (cell.locName || kind.name) : '未探索', known,
      action: known ? { type: 'map-select', x, y } : null,
      danger: known ? kind.danger : null, location: known && Boolean(cell.locName) };
  }

  function guigu({ state, terrain, path, target, stepDays }) {
    const model = { kind: 'map', theme: 'guigu', title: '八荒行旅',
      caption: '选择存档，探索八荒', units: [], cards: [], tiles: [], links: [], markers: [] };
    if (!state) return model;
    const tiles = [];
    const startY = Math.max(0, state.position.y - MAP_RADIUS);
    const endY = Math.min(state.map.length - 1, state.position.y + MAP_RADIUS);
    for (let y = startY; y <= endY; y++) {
      const startX = Math.max(0, state.position.x - MAP_RADIUS);
      const endX = Math.min(state.map[y].length - 1, state.position.x + MAP_RADIUS);
      for (let x = startX; x <= endX; x++) tiles.push(mapTile({ state, terrain, x, y }));
    }
    const current = state.map[state.position.y][state.position.x];
    const route = (path || []).map(point => point.x + ',' + point.y);
    const caption = routeCaption({ state, path, target, stepDays });
    return { ...model, title: (current.locName || terrain[current.terrain].name) + ' · ' +
      state.position.x + ', ' + state.position.y, caption,
      tiles: tiles.map(tile => ({ ...tile, selected: target && tile.key === target.x + ',' + target.y,
        onRoute: route.includes(tile.key) })),
      units: [{ key: 'player', name: state.name, side: 'player', role: 'sword', x: 0, z: 0,
        action: route.length && !state.dead ? { type: 'map-step' } : null }],
      position: { ...state.position }, route };
  }

  function routeCaption({ state, path, target, stepDays }) {
    if (state.dead) return '此生已尽 · 可返回存档重新开始';
    if (!target) return '点选已探索地块查看路线 · 拖动可转动地图';
    if (target.x === state.position.x && target.y === state.position.y) return '已到达目的地 · 点选其他地块继续探索';
    if (!path || !path.length) return '已知区域无法到达此处，请先探索沿途地块';
    return path.length + ' 步 · 预计 ' + path.length * stepDays + ' 天 · 点选修士前进';
  }

  return Object.freeze({ cultivation, lifesim, guigu, MAP_RADIUS, TILE_SIZE });
});
