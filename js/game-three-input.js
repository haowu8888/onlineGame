import * as THREE from './vendor/three.module.js?v=34';

const INPUT = Object.freeze({ dragPixels: 7, radiansPerPixel: 0.006, zoomStep: 1.18, turnStep: Math.PI / 8 });

export function pickSceneTarget({ x, y, camera, targets }) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(x, y), camera);
  const allowed = new Set(targets);
  for (const hit of ray.intersectObjects(targets, true)) {
    let target = hit.object;
    while (target && !allowed.has(target)) target = target.parent;
    if (target) return target;
  }
  return null;
}

export class SceneInput {
  constructor(options) {
    Object.assign(this, options);
    this.events = new AbortController();
    this.down = null;
    this.selectedKey = null;
    const signal = this.events.signal;
    this.canvas.addEventListener('pointerdown', event => this.pointerDown(event), { signal });
    this.canvas.addEventListener('pointermove', event => this.pointerMove(event), { signal });
    this.canvas.addEventListener('pointerup', event => this.pointerUp(event), { signal });
    this.canvas.addEventListener('pointercancel', () => { this.down = null; }, { signal });
    this.canvas.addEventListener('keydown', event => this.keyDown(event), { signal });
    this.root.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => this.changeView(button.dataset.view), { signal });
    });
  }

  pointerDown(event) {
    if (event.button !== 0) return;
    this.down = { x: event.clientX, y: event.clientY, lastX: event.clientX, dragged: false };
    this.canvas.setPointerCapture(event.pointerId);
  }

  pointerMove(event) {
    if (!this.down) {
      const hit = this.hit(event);
      this.canvas.style.cursor = hit ? 'pointer' : 'grab';
      if (hit) this.announce(hit.userData.label);
      return;
    }
    const delta = Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y);
    if (delta > INPUT.dragPixels) this.down.dragged = true;
    if (this.down.dragged) this.orbit({ yaw: (event.clientX - this.down.lastX) * INPUT.radiansPerPixel });
    this.down.lastX = event.clientX;
  }

  pointerUp(event) {
    const down = this.down;
    this.down = null;
    if (!down || down.dragged) return;
    const hit = this.hit(event);
    if (hit) this.activate(hit);
  }

  hit(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return pickSceneTarget({ x: (event.clientX - bounds.left) / bounds.width * 2 - 1,
      y: 1 - (event.clientY - bounds.top) / bounds.height * 2, camera: this.camera, targets: this.targets() });
  }

  activate(target) {
    this.selectedKey = target.userData.key;
    this.announce(target.userData.label);
    this.action(target.userData.action);
  }

  keyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const targets = this.targets();
    if (!targets.length) return;
    const index = targets.findIndex(target => target.userData.key === this.selectedKey);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activate(targets[Math.max(0, index)]);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const next = targets[(index + direction + targets.length) % targets.length];
    this.selectedKey = next.userData.key;
    this.announce(next.userData.label + '，按回车执行');
  }

  changeView(view) {
    const operations = {
      left: { yaw: -INPUT.turnStep }, right: { yaw: INPUT.turnStep },
      in: { zoom: INPUT.zoomStep }, out: { zoom: 1 / INPUT.zoomStep }, reset: { reset: true },
    };
    this.orbit(operations[view]);
  }

  dispose() {
    this.events.abort();
  }
}
