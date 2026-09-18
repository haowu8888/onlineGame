import * as THREE from './vendor/three.module.js?v=35';
import { roundedRect } from './canvas-shapes.js?v=35';

const LABEL = Object.freeze({ width: 512, height: 144, fontSize: 62, worldWidth: 2.2, worldHeight: 0.62 });

export class SceneLabel {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = LABEL.width;
    this.canvas.height = LABEL.height;
    this.context = this.canvas.getContext('2d');
    if (!this.context) throw new Error('无法创建场景文字画布');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.SpriteMaterial({ map: this.texture, depthTest: false, depthWrite: false });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(LABEL.worldWidth, LABEL.worldHeight, 1);
    this.sprite.renderOrder = 10;
    this.content = '';
  }

  update({ title, detail = '', active = false }) {
    const content = JSON.stringify([title, detail, active]);
    if (content === this.content) return;
    this.content = content;
    const ctx = this.context;
    ctx.clearRect(0, 0, LABEL.width, LABEL.height);
    ctx.fillStyle = active ? 'rgba(26,62,67,0.94)' : 'rgba(11,40,55,0.8)';
    roundedRect(ctx, 8, detail ? 5 : 21, LABEL.width - 16, detail ? LABEL.height - 10 : 102, 24);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 ' + LABEL.fontSize + 'px "KaiTi", "Microsoft YaHei", serif';
    ctx.fillStyle = active ? '#ffe1a6' : '#edf0e3';
    ctx.fillText(title, LABEL.width / 2, detail ? 48 : 74, LABEL.width - 40);
    if (detail) {
      ctx.font = '38px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#cbdce2';
      ctx.fillText(detail, LABEL.width / 2, 105, LABEL.width - 32);
    }
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.material.dispose();
    this.texture.dispose();
  }
}
