import * as THREE from './vendor/three.module.js?v=34';
import { PALETTE } from './game-three-palette.js?v=34';
import { bakeStaticMeshes } from './game-three-batch.js?v=34';

export class SceneResources {
  constructor() {
    this.resources = new Set();
    this.materials = new Map();
    this.geometries = new Map();
    this.models = new Map();
  }

  own(resource) {
    this.resources.add(resource);
    return resource;
  }

  material(color, options = {}) {
    const key = color + ':' + JSON.stringify(options);
    if (!this.materials.has(key)) {
      this.materials.set(key, this.own(new THREE.MeshStandardMaterial({
        color, roughness: 0.88, metalness: 0.04, ...options,
      })));
    }
    return this.materials.get(key);
  }

  geometry(kind) {
    if (!this.geometries.has(kind)) this.geometries.set(kind, this.own(makeGeometry(kind)));
    return this.geometries.get(kind);
  }

  model(key, create) {
    if (!this.models.has(key)) this.models.set(key, bakeStaticMeshes(create(), resource => this.own(resource)));
    return this.models.get(key).clone();
  }

  mesh(options) {
    const { kind = 'box', color = PALETTE.stone, size = [1, 1, 1], at = [0, 0, 0] } = options;
    const mesh = new THREE.Mesh(this.geometry(kind), this.material(color, options.material));
    mesh.scale.set(...size);
    mesh.position.set(...at);
    mesh.castShadow = options.shadow !== false;
    mesh.receiveShadow = true;
    if (options.rotation) mesh.rotation.set(...options.rotation);
    return mesh;
  }

  dispose() {
    this.resources.forEach(resource => resource.dispose());
    this.resources.clear();
    this.materials.clear();
    this.geometries.clear();
    this.models.clear();
  }
}

function makeGeometry(kind) {
  const makers = {
    box: () => new THREE.BoxGeometry(1, 1, 1),
    cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
    cone: () => new THREE.ConeGeometry(0.5, 1, 16),
    robe: () => new THREE.LatheGeometry([[0.48, -0.5], [0.43, -0.42], [0.32, 0],
      [0.26, 0.35], [0.29, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 24),
    rock: () => new THREE.IcosahedronGeometry(0.5, 1),
    sphere: () => new THREE.SphereGeometry(0.5, 20, 16),
    roof: roofGeometry,
    torus: () => new THREE.TorusGeometry(1, 0.035, 6, 64),
    tile: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  };
  if (!makers[kind]) throw new RangeError('未知场景几何体：' + kind);
  return makers[kind]();
}

function roofGeometry() {
  const halfWidth = 0.55;
  const subdivisions = 24;
  const geometry = new THREE.PlaneGeometry(halfWidth * 2, halfWidth * 2, subdivisions, subdivisions);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index++) {
    const x = Math.abs(positions.getX(index)) / halfWidth;
    const z = Math.abs(positions.getZ(index)) / halfWidth;
    const slope = Math.max(z, Math.max(0, (x - 0.5) * 2));
    const height = (1 - slope) ** 2 * 0.46 + slope ** 8 * 0.055 + (x * z) ** 5 * 0.08;
    positions.setY(index, height);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function connection(resources, options) {
  const { from, to, color = PALETTE.gold, radius = 0.06 } = options;
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const delta = end.clone().sub(start);
  const mesh = resources.mesh({ kind: 'cylinder', color,
    at: start.clone().add(end).multiplyScalar(0.5).toArray(),
    size: [radius, delta.length(), radius], shadow: false });
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}
