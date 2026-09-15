import * as THREE from './vendor/three.module.js?v=34';

const INITIAL_CAPACITY = 32;
const CAPACITY_GROWTH = 2;

export class InstanceBatch {
  constructor({ scene, geometry, material, shadow = false }) {
    this.scene = scene;
    this.geometry = geometry;
    this.material = material;
    this.shadow = shadow;
    this.capacity = 0;
    this.count = 0;
    this.mesh = null;
    this.transform = new THREE.Object3D();
    this.color = new THREE.Color();
  }

  begin(requiredCount) {
    if (requiredCount > this.capacity) this.grow(requiredCount);
    this.count = 0;
    if (this.mesh) this.mesh.count = 0;
  }

  grow(requiredCount) {
    this.capacity = Math.max(INITIAL_CAPACITY, this.capacity * CAPACITY_GROWTH, requiredCount);
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.dispose();
    }
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = this.shadow;
    this.mesh.receiveShadow = this.shadow;
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  put({ x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0, color = 0xffffff }) {
    this.transform.position.set(x, y, z);
    this.transform.rotation.set(rx, ry, rz);
    this.transform.scale.set(sx, sy, sz);
    this.transform.updateMatrix();
    this.mesh.setMatrixAt(this.count, this.transform.matrix);
    this.mesh.setColorAt(this.count, this.color.set(color));
    this.count++;
  }

  end() {
    if (!this.mesh) return;
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}
