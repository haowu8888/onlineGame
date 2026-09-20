import * as THREE from './vendor/three.module.js?v=38';
import { ARENA } from './knife-three-config.js?v=38';
import { ArenaStage } from './knife-three-stage.js?v=38';
import { ArenaActors } from './knife-three-actors.js?v=38';
import { ArenaEffects } from './knife-three-effects.js?v=38';
import { ArenaLabels } from './knife-three-labels.js?v=38';

export class KnifeArena {
  constructor({ canvas, labels }) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 160);
    this.camera.position.set(0, ARENA.cameraHeight, ARENA.cameraDepth);
    this.camera.lookAt(0, 0, 0);
    this.stage = new ArenaStage(this.scene);
    this.actors = new ArenaActors(this.scene);
    this.effects = new ArenaEffects(this.scene);
    this.labels = new ArenaLabels({ canvas: labels, camera: this.camera });
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.canvas.dispatchEvent(new CustomEvent('arena-render-error', {
        bubbles: true, detail: new Error('3D 图形上下文丢失，请保存进度并刷新页面。'),
      }));
    });
  }

  resize({ width, height }) {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, ARENA.maxPixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    const vertical = ARENA.viewHeight;
    const aspect = width / height;
    this.portrait = aspect < 1;
    this.camera.left = -vertical * aspect / 2;
    this.camera.right = vertical * aspect / 2;
    this.camera.top = vertical / 2;
    this.camera.bottom = -vertical / 2;
    this.camera.updateProjectionMatrix();
    this.labels.resize({ width, height, pixelRatio });
  }

  isMotionEnabled() {
    return !this.reducedMotion.matches && document.documentElement.dataset.animations !== 'off';
  }

  render(game, { showDamage = true, timestamp = performance.now() } = {}) {
    const playing = Boolean(game.player);
    this.configureView(playing);
    const motion = this.isMotionEnabled();
    const zoom = playing ? 1 : ARENA.menuZoom;
    if (this.camera.zoom !== zoom) {
      this.camera.zoom = zoom;
      this.camera.updateProjectionMatrix();
    }
    const time = motion ? (playing ? game.totalFrames / ARENA.framesPerSecond : timestamp / 1000) : 0;
    const punch = motion ? game.impactPower : 0;
    const center = playing
      ? { x: game.cameraX + ARENA.viewportWidth / 2 - (motion ? game.shakeX : 0) - Math.cos(game.impactAngle) * punch,
        y: game.cameraY + ARENA.viewportHeight / 2 - (motion ? game.shakeY : 0) - Math.sin(game.impactAngle) * punch }
      : this.menuCenter(zoom);
    this.stage.update({ center, terrain: game.terrain?.id || 'plain', time });
    this.actors.render({ game, center, time });
    this.effects.render({ game, center, time, motion });
    this.renderer.render(this.scene, this.camera);
    this.labels.render({ game, center, showDamage, motion });
  }

  menuCenter(zoom) {
    const distance = ARENA.viewHeight / zoom * ARENA.pixelsPerUnit * 0.3;
    if (this.portrait) {
      const length = Math.hypot(this.camera.position.x, this.camera.position.z);
      return { x: distance * this.camera.position.x / length, y: distance * this.camera.position.z / length };
    }
    const offset = -(this.camera.right - this.camera.left) / zoom * ARENA.pixelsPerUnit * ARENA.menuHeroOffset;
    const matrix = this.camera.matrixWorld.elements;
    return { x: offset * matrix[0], y: offset * matrix[2] };
  }

  configureView(playing) {
    if (this.viewPlaying === playing) return;
    this.viewPlaying = playing;
    if (playing) this.camera.position.set(0, ARENA.cameraHeight, ARENA.cameraDepth);
    else this.camera.position.set(12, 18, 24);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
  }

  getDiagnostics() {
    return {
      engine: 'Three.js r' + THREE.REVISION,
      frames: this.renderer.info.render.frame,
      draws: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }

  dispose() {
    this.effects.dispose();
    this.actors.dispose();
    this.stage.dispose();
    this.renderer.dispose();
  }
}
