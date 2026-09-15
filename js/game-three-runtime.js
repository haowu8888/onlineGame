import * as THREE from './vendor/three.module.js?v=34';
import { SceneResources } from './game-three-resources.js?v=34';
import { ScenePieces } from './game-three-units.js?v=34';
import { SceneScenery } from './game-three-scenery.js?v=34';
import { SceneInput } from './game-three-input.js?v=34';
import { PALETTE, SCENE_THEMES, VIEW } from './game-three-palette.js?v=34';

export class ThreeGameScene {
  constructor({ shell, source, document, window }) {
    Object.assign(this, { shell, source, document, window });
    this.resources = new SceneResources();
    this.pieces = new ScenePieces(this.resources);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.mist);
    this.scene.fog = new THREE.Fog(PALETTE.mist, 36, 72);
    this.camera = new THREE.OrthographicCamera(-9, 9, 8.5, -8.5, VIEW.near, VIEW.far);
    this.yaw = VIEW.yaw;
    this.zoom = 1;
    this.lastRead = -Infinity;
    this.lastTime = null;
    this.frameCount = 0;
    this.failed = false;
    this.disposed = false;
    this.scene.add(this.pieces.root);
    this.addLight();
  }

  start() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.shell.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio, VIEW.pixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.input = new SceneInput({ canvas: this.shell.canvas, root: this.shell.root, camera: this.camera,
      targets: () => this.targets(), orbit: change => this.orbit(change),
      action: action => this.activate(action), announce: text => this.shell.announce(text) });
    this.motion = this.window.matchMedia('(prefers-reduced-motion: reduce)');
    this.events = new AbortController();
    this.bindLifecycle();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.shell.canvas);
    this.readState(0);
    this.resize();
    this.resume();
  }

  addLight() {
    this.scene.add(new THREE.HemisphereLight(0xd9ecec, PALETTE.pine, 1.6));
    const sun = new THREE.DirectionalLight(0xffe6bb, 2.7);
    sun.position.set(-8, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(VIEW.shadowSize, VIEW.shadowSize);
    Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 0.5, far: 55 });
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);
    this.sun = sun;
    const rim = new THREE.DirectionalLight(0xc7e4ed, 0.9);
    rim.position.set(7, 9, -6);
    this.scene.add(rim);
  }

  bindLifecycle() {
    const signal = this.events.signal;
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.hidden) this.pause();
      else this.resume();
    }, { signal });
    this.window.addEventListener('pagehide', event => event.persisted ? this.pause() : this.dispose(), { signal });
    this.window.addEventListener('pageshow', () => this.resume(), { signal });
    this.shell.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.fail(new Error('WebGL 图形上下文丢失，请保存进度后刷新页面'));
    }, { signal });
  }

  readState(time) {
    const model = this.source.read();
    this.model = model;
    const theme = SCENE_THEMES[model.theme];
    this.scene.background.setHex(theme.sky);
    this.scene.fog.color.setHex(theme.sky);
    this.sun.color.setHex(theme.light);
    const structure = JSON.stringify([model.kind, model.theme, model.tiles, model.markers]);
    if (structure !== this.structure) {
      if (this.scenery) this.scenery.dispose();
      this.scenery = new SceneScenery(model);
      this.scene.add(this.scenery.root);
      this.structure = structure;
      this.resize();
    }
    this.scenery.update(model);
    this.pieces.update(model, time);
    this.shell.mount(this.source.mount ? this.source.mount() : null);
    this.shell.update(model);
    this.scene.updateMatrixWorld(true);
  }

  activate(action) {
    try {
      this.readState(this.window.performance.now() * VIEW.secondsPerMillisecond);
      const key = JSON.stringify(action);
      const current = this.targets().find(target => JSON.stringify(target.userData.action) === key);
      if (!current) {
        this.shell.announce('当前状态已变化，请重新选择目标');
        return;
      }
      const focusedCanvas = this.document.activeElement === this.shell.canvas;
      this.source.act(action);
      if (focusedCanvas) this.shell.canvas.focus({ preventScroll: true });
      this.lastRead = -Infinity;
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  targets() {
    return [...this.pieces.targets, ...(this.scenery ? this.scenery.targets : [])];
  }

  orbit(change) {
    if (change.reset) { this.yaw = VIEW.yaw; this.zoom = 1; }
    else { this.yaw += change.yaw || 0; this.zoom *= change.zoom || 1; }
    this.resize();
  }

  resize() {
    if (!this.renderer || !this.model) return;
    const width = this.shell.canvas.clientWidth;
    const height = this.shell.canvas.clientHeight;
    this.viewportVisible = Boolean(width && height);
    if (!this.viewportVisible) return;
    const aspect = width / height;
    const worldWidth = this.model.kind === 'map' ? 14 : VIEW.width;
    const span = Math.max(VIEW.height, worldWidth / aspect) * VIEW.fitPadding / this.zoom;
    Object.assign(this.camera, { left: -span * aspect / 2, right: span * aspect / 2, top: span / 2, bottom: -span / 2 });
    const elevation = ['map', 'board', 'tower'].includes(this.model.kind) ? VIEW.elevation : 0.46;
    this.camera.position.set(Math.sin(this.yaw) * VIEW.cameraDistance * Math.cos(elevation),
      Math.sin(elevation) * VIEW.cameraDistance, Math.cos(this.yaw) * VIEW.cameraDistance * Math.cos(elevation));
    this.camera.lookAt(0, 0.7, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  frame(milliseconds) {
    if (this.failed || this.disposed) return;
    try {
      const seconds = milliseconds * VIEW.secondsPerMillisecond;
      const elapsed = this.lastTime === null ? 0 : (milliseconds - this.lastTime) * VIEW.secondsPerMillisecond;
      this.lastTime = milliseconds;
      if (milliseconds - this.lastRead >= VIEW.stateIntervalMs) {
        this.readState(seconds);
        this.lastRead = milliseconds;
      }
      if (!this.viewportVisible) return;
      this.pieces.animate(seconds, elapsed, this.motion.matches);
      this.renderer.render(this.scene, this.camera);
      this.frameCount++;
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  pause() {
    if (this.renderer) this.renderer.setAnimationLoop(null);
    this.lastTime = null;
  }

  resume() {
    if (!this.renderer || this.failed || this.disposed || this.document.hidden) return;
    this.lastTime = null;
    this.lastRead = -Infinity;
    this.renderer.setAnimationLoop(time => this.frame(time));
  }

  fail(error) {
    this.failed = true;
    this.pause();
    if (this.input) this.input.dispose();
    this.shell.fail(error);
    console.error('[GameScene] ' + this.source.id, error);
  }

  snapshot() {
    const bounds = this.shell.canvas.getBoundingClientRect();
    const info = this.renderer ? this.renderer.info : null;
    this.scene.updateMatrixWorld(true);
    return { id: this.source.id, status: this.failed ? 'failed' : 'ready', frames: this.frameCount,
      model: structuredClone(this.model), drawCalls: info ? info.render.calls : null,
      geometries: info ? info.memory.geometries : null, textures: info ? info.memory.textures : null,
      targets: this.targets().map(root => {
        const projected = root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.7, 0)).project(this.camera);
        return { key: root.userData.key, label: root.userData.label, action: { ...root.userData.action },
          x: bounds.left + (projected.x + 1) * bounds.width / 2,
          y: bounds.top + (1 - projected.y) * bounds.height / 2 };
      }) };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.pause();
    if (this.events) this.events.abort();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.input) this.input.dispose();
    if (this.scenery) this.scenery.dispose();
    this.pieces.dispose();
    this.resources.dispose();
    this.scene.traverse(object => { if (object.shadow) object.shadow.dispose(); });
    if (this.renderer) this.renderer.dispose();
  }
}
