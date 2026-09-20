import * as THREE from './vendor/three.module.js?v=38';

const SKY = Object.freeze({ radius: 92, widthSegments: 40, heightSegments: 24,
  zenithShade: 0.65, horizonLight: 0.18, groundBlend: 0.32, horizonFalloff: 0.55 });

/* 顶部冷色、地平线暖雾与地面反光分开着色；只在切换场景主题时更新。 */
export class SceneAtmosphere {
  constructor(scene) {
    this.geometry = new THREE.SphereGeometry(SKY.radius, SKY.widthSegments, SKY.heightSegments);
    const count = this.geometry.getAttribute('position').count;
    this.colors = new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3);
    this.geometry.setAttribute('color', this.colors);
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide,
      depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
    this.theme = null;
    scene.add(this.mesh);
  }

  update({ sky, light, ground }) {
    const key = [sky, light, ground].join(':');
    if (this.theme === key) return;
    this.theme = key;
    const horizon = new THREE.Color(sky).lerp(new THREE.Color(light), SKY.horizonLight);
    const zenith = new THREE.Color(sky).multiplyScalar(SKY.zenithShade);
    const below = horizon.clone().lerp(new THREE.Color(ground), SKY.groundBlend);
    const color = new THREE.Color();
    const positions = this.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) {
      const elevation = positions.getY(index) / SKY.radius;
      const blend = Math.abs(elevation) ** SKY.horizonFalloff;
      color.copy(horizon).lerp(elevation >= 0 ? zenith : below, blend);
      this.colors.setXYZ(index, color.r, color.g, color.b);
    }
    this.colors.needsUpdate = true;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
