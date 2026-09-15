import * as THREE from './vendor/three.module.js?v=34';
import { SceneResources, connection } from './game-three-resources.js?v=34';
import { island, tree, pavilion, pagoda, halo } from './game-three-props.js?v=34';
import { SceneLabel } from './game-three-labels.js?v=34';
import { landscape, terrace, lantern } from './game-three-landscape.js?v=34';
import { bakeStaticMeshes } from './game-three-batch.js?v=34';
import { PALETTE as P, SCENE_THEMES } from './game-three-palette.js?v=34';

const RING_TICKS = 48;
const TAU = Math.PI * 2;
const TILE_COLORS = Object.freeze({
  plains: 0x9eb891, forest: 0x71927b, mountain: 0x9caaad, water: P.water,
  town: 0xc6bba0, city: 0xc6bba0, sect: 0xa7bda9, ruins: 0x8d919b,
  cave: 0x909997, mist: 0xa6adb7, forbidden: 0x766c8b, fog: 0x77899b,
  desert: 0xd1bc8d,
});

export class SceneScenery {
  constructor(model) {
    this.resources = new SceneResources();
    this.root = new THREE.Group();
    this.targets = [];
    this.labels = [];
    this.ticks = [];
    this.build(model);
    this.batchDecorations();
  }

  batchDecorations() {
    const decorations = new THREE.Group();
    for (const child of [...this.root.children]) {
      if (child.userData.action || this.ticks.includes(child)) continue;
      let hasLabels = false;
      child.traverse(object => { if (object.isSprite) hasLabels = true; });
      if (!hasLabels) decorations.add(child);
    }
    this.root.add(bakeStaticMeshes(decorations, resource => this.resources.own(resource)));
  }

  build(model) {
    this.theme = SCENE_THEMES[model.theme];
    this.root.add(landscape(this.resources, this.theme));
    if (model.kind === 'map') this.buildMap(model);
    else if (model.kind === 'tower') this.buildTower(model);
    else if (model.kind === 'board') this.buildBoard();
    else this.buildGarden(model);
    model.markers.forEach(marker => this.marker(marker));
  }

  buildGarden(model) {
    const r = this.resources;
    this.root.add(island(r, { width: 16, depth: 13, color: this.theme.ground }));
    this.root.add(pavilion(r, { x: 3.8, z: -4.4, scale: 1.15 }));
    this.root.add(tree(r, { x: -5.2, z: -2.5, scale: 1.45, color: this.theme.foliage }));
    this.root.add(tree(r, { x: 5.8, z: 1, scale: 0.8, color: this.theme.foliage }));
    this.root.add(tree(r, { x: -6.2, z: 2.4, scale: 0.55 }));
    if (model.kind === 'roster') this.root.add(terrace(r, { width: 12.5, depth: 4.5, color: this.theme.stone }));
    else this.root.add(r.mesh({ kind: 'cylinder', color: this.theme.stone, size: [5.1, 0.22, 5.1], at: [0, 0.015, 0] }));
    this.root.add(lantern(r, { x: -2.8, z: 1.5 }), lantern(r, { x: 2.8, z: 1.5 }));
    if (model.progress !== undefined) {
      this.root.add(halo(r, { radius: 2.05, color: P.pine }));
      this.createProgressRing();
    }
    if (model.kind === 'roster') this.addFormation();
    const stones = [[-2, -2.8], [-1.1, -3], [-0.3, -3.1], [0.5, -3.1]];
    stones.forEach(([x, z]) => this.root.add(r.mesh({ color: P.paper, size: [0.7, 0.08, 0.7], at: [x, 0.03, z] })));
  }

  addFormation() {
    for (const x of [-4, -2, 0, 2, 4]) {
      const base = halo(this.resources, { radius: 0.76, color: P.gold, y: 0.06 });
      base.position.x = x;
      this.root.add(base);
    }
  }

  createProgressRing() {
    for (let index = 0; index < RING_TICKS; index++) {
      const angle = index / RING_TICKS * TAU;
      const tick = this.resources.mesh({ color: P.gold, size: [0.06, 0.055, 0.22],
        at: [Math.sin(angle) * 1.85, 0.16, Math.cos(angle) * 1.85], rotation: [0, angle, 0],
        material: { emissive: P.gold, emissiveIntensity: 0.25 }, shadow: false });
      this.ticks.push(tick);
      this.root.add(tick);
    }
  }

  buildBoard() {
    const r = this.resources;
    this.root.add(island(r, { width: 20, depth: 17, color: this.theme.ground }));
    this.root.add(terrace(r, { width: 14.4, depth: 11.6, color: this.theme.stone }));
    for (const radius of [2.9, 3.05, 5.3]) {
      const ring = halo(r, { radius, color: P.pine, y: 0.053 });
      this.root.add(ring);
    }
    for (const x of [-7.7, 7.7]) {
      this.root.add(tree(r, { x, z: -4, scale: 1.15, color: this.theme.foliage }));
      this.root.add(lantern(r, { x: x * 0.87, z: 4.5 }));
    }
    this.root.add(pavilion(r, { x: 0, z: -9.5, scale: 1.2 }));
  }

  buildMap(model) {
    this.root.add(island(this.resources, { width: 14, depth: 14, color: P.pine }));
    if (!model.tiles.length) this.root.add(pavilion(this.resources, { scale: 1.6 }));
    model.tiles.forEach(tile => this.mapTile(tile));
  }

  mapTile(tile) {
    const r = this.resources;
    const root = new THREE.Group();
    const color = TILE_COLORS[tile.type];
    if (color === undefined) throw new Error('未定义地形颜色：' + tile.type);
    root.add(r.mesh({ color, size: [1.62, 0.28, 1.62], at: [0, -0.04, 0] }));
    root.add(r.mesh({ color: new THREE.Color(color).multiplyScalar(0.92).getHex(),
      size: [1.68, 0.1, 1.68], at: [0, -0.19, 0] }));
    if (tile.known) this.mapDecoration(root, tile);
    if (tile.selected || tile.onRoute) root.add(halo(r, { radius: 0.65, color: P.gold, y: 0.2 }));
    root.position.set(tile.x, 0, tile.z);
    this.root.add(root);
    this.pickable(root, tile);
    if (tile.location || tile.selected) this.addLabel(root, { title: tile.name, detail: tile.selected ? '目的地' : '', height: 1.8, width: 2.2 });
  }

  mapDecoration(root, tile) {
    const r = this.resources;
    if (tile.type === 'forest') root.add(tree(r, { scale: 0.4, x: 0.35, z: -0.25 }));
    if (['mountain', 'cave', 'forbidden'].includes(tile.type)) {
      root.add(r.mesh({ kind: 'rock', color: tile.type === 'forbidden' ? P.purple : P.mist,
        size: [1.25, 1.8, 1.15], at: [0.25, 0.5, -0.25] }));
    }
    if (tile.location && !['mountain', 'cave'].includes(tile.type)) {
      root.add(pavilion(r, { x: 0.25, z: -0.25, scale: 0.27 }));
    }
  }

  buildTower(model) {
    const r = this.resources;
    this.root.add(island(r, { width: 15, depth: 17, color: 0x8997a4 }));
    this.root.add(pagoda(r, { x: 5.5, z: -2.6, scale: 0.9 }));
    if (!model.tiles.length) this.root.add(pagoda(r, { scale: 1.3 }));
    const byId = new Map(model.tiles.map(tile => [tile.key, tile]));
    model.tiles.forEach(tile => this.towerLinks(tile, byId));
    model.tiles.forEach(tile => this.towerTile(tile));
  }

  towerLinks(tile, byId) {
    tile.next.forEach(key => {
      const next = byId.get(key);
      if (!next) return;
      this.root.add(connection(this.resources, { from: [tile.x, 0.25, tile.z], to: [next.x, 0.25, next.z],
        color: tile.completed ? P.gold : P.pine, radius: 0.07 }));
    });
  }

  towerTile(tile) {
    const r = this.resources;
    const root = new THREE.Group();
    root.add(r.mesh({ kind: 'cylinder', color: tile.completed ? P.pine : P.paper,
      size: [1.5, 0.35, 1.5], at: [0, 0.15, 0] }));
    if (tile.type === 'boss') root.add(pavilion(r, { scale: 0.32, roof: P.coral }));
    else root.add(r.mesh({ kind: tile.type === 'battle' || tile.type === 'elite' ? 'cone' : 'rock',
      color: tile.type === 'elite' ? P.coral : P.gold, size: [0.45, 0.65, 0.45], at: [0, 0.65, 0] }));
    if (tile.action || tile.selected) root.add(halo(r, { radius: 0.83, color: P.gold }));
    root.position.set(tile.x, 0, tile.z);
    this.root.add(root);
    this.pickable(root, tile);
    this.addLabel(root, { title: (tile.completed ? '✓ ' : '') + tile.name, height: 1.2, width: 2 });
  }

  marker(marker) {
    const root = new THREE.Group();
    root.add(this.resources.mesh({ kind: 'cylinder', color: P.pine, size: [1.35, 0.25, 1.35], at: [0, 0.06, 0] }));
    root.add(this.resources.mesh({ kind: 'rock', color: P.gold, size: [0.35, 0.5, 0.35], at: [0, 0.5, 0] }));
    root.add(halo(this.resources, { radius: 0.73 }));
    root.position.set(marker.x, 0, marker.z);
    this.root.add(root);
    this.pickable(root, marker);
    this.addLabel(root, { title: marker.name, height: 1.35, width: 2.8 });
  }

  addLabel(root, { title, detail = '', height, width }) {
    const label = new SceneLabel();
    label.update({ title, detail, active: Boolean(root.userData.action) });
    label.sprite.position.y = height;
    label.sprite.scale.set(width, width / 3, 1);
    root.add(label.sprite);
    this.labels.push(label);
  }

  pickable(root, model) {
    root.userData.key = model.key;
    root.userData.action = model.action || null;
    root.userData.label = model.detail ? model.name + ' · ' + model.detail : model.name;
    if (model.action) this.targets.push(root);
  }

  update(model) {
    this.ticks.forEach((tick, index) => { tick.visible = index < model.progress * RING_TICKS; });
  }

  dispose() {
    this.labels.forEach(label => label.dispose());
    this.resources.dispose();
    this.root.removeFromParent();
  }
}
