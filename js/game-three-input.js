import * as THREE from './vendor/three.module.js?v=38';

const INPUT = Object.freeze({ dragPixels: 7, radiansPerPixel: 0.006, zoomStep: 1.18, turnStep: Math.PI / 8 });

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function pickSceneTarget({ x, y, camera, targets }) {
  if (!targets.length) return null;
  ray.setFromCamera(pointer.set(x, y), camera);
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
    this.hover = null;
    this.hoverFrame = null;
    this.selectedKey = null;
    const signal = this.events.signal;
    this.canvas.addEventListener('pointerdown', event => this.pointerDown(event), { signal });
    this.canvas.addEventListener('pointermove', event => this.pointerMove(event), { signal });
    this.canvas.addEventListener('pointerup', event => this.pointerUp(event), { signal });
    ['pointercancel', 'lostpointercapture'].forEach(type => {
      this.canvas.addEventListener(type, event => this.cancelPointer(event), { signal });
    });
    this.canvas.addEventListener('pointerleave', () => this.clearHover(), { signal });
    this.canvas.addEventListener('keydown', event => this.keyDown(event), { signal });
    this.root.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => this.changeView(button.dataset.view), { signal });
    });
  }

  pointerDown(event) {
    if (event.button !== 0 || event.isPrimary === false || this.down) return;
    this.clearHover();
    this.down = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      lastX: event.clientX, dragged: false };
    this.canvas.setPointerCapture(event.pointerId);
  }

  // 悬停拾取要对整个场景做射线检测，连续的指针移动合并到下一动画帧只检测一次。
  pointerMove(event) {
    if (event.isPrimary === false) return;
    if (!this.down) {
      this.hover = { clientX: event.clientX, clientY: event.clientY };
      if (this.hoverFrame === null) this.hoverFrame = requestAnimationFrame(() => this.updateHover());
      return;
    }
    if (event.pointerId !== this.down.pointerId) return;
    const delta = Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y);
    if (delta > INPUT.dragPixels) this.down.dragged = true;
    if (this.down.dragged) this.orbit({ yaw: (event.clientX - this.down.lastX) * INPUT.radiansPerPixel });
    this.down.lastX = event.clientX;
  }

  updateHover() {
    this.hoverFrame = null;
    if (this.down || !this.hover) return;
    const hit = this.hit(this.hover);
    const cursor = hit ? 'pointer' : 'grab';
    if (this.canvas.style.cursor !== cursor) this.canvas.style.cursor = cursor;
    if (hit) this.announce(hit.userData.label);
  }

  pointerUp(event) {
    const down = this.down;
    if (!down || event.pointerId !== down.pointerId) return;
    this.cancelPointer(event);
    if (down.dragged) return;
    const hit = this.hit(event);
    if (hit) this.activate(hit);
  }

  cancelPointer(event) {
    if (!this.down || this.down.pointerId !== event.pointerId) return;
    this.down = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  }

  clearHover() {
    if (this.hoverFrame !== null) cancelAnimationFrame(this.hoverFrame);
    this.hoverFrame = null;
    this.hover = null;
    this.canvas.style.cursor = 'grab';
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
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const targets = this.targets();
    if (!targets.length) return;
    const index = targets.findIndex(target => target.userData.key === this.selectedKey);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) this.activate(targets[Math.max(0, index)]);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = targets[this.nextIndex(event.key, index, targets.length)];
    this.selectedKey = next.userData.key;
    this.announce(next.userData.label + '，按回车执行');
  }

  nextIndex(key, index, count) {
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    const direction = key === 'ArrowLeft' ? -1 : 1;
    if (index < 0) return direction < 0 ? count - 1 : 0;
    return (index + direction + count) % count;
  }

  changeView(view) {
    const operations = {
      left: { yaw: -INPUT.turnStep }, right: { yaw: INPUT.turnStep },
      in: { zoom: INPUT.zoomStep }, out: { zoom: 1 / INPUT.zoomStep }, reset: { reset: true },
    };
    this.orbit(operations[view]);
  }

  dispose() {
    if (this.down) this.cancelPointer(this.down);
    this.clearHover();
    this.events.abort();
  }
}
