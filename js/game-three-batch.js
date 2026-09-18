import * as THREE from './vendor/three.module.js?v=35';

function mergeMeshes(meshes) {
  const geometries = meshes.map(mesh => {
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    return geometry.applyMatrix4(mesh.matrixWorld);
  });
  const merged = new THREE.BufferGeometry();
  for (const name of Object.keys(geometries[0].attributes)) {
    const size = geometries[0].getAttribute(name).itemSize;
    const length = geometries.reduce((total, geometry) => total + geometry.getAttribute(name).array.length, 0);
    const array = new Float32Array(length);
    let offset = 0;
    for (const geometry of geometries) {
      const source = geometry.getAttribute(name).array;
      array.set(source, offset);
      offset += source.length;
    }
    merged.setAttribute(name, new THREE.BufferAttribute(array, size));
  }
  geometries.forEach(geometry => geometry.dispose());
  merged.computeBoundingSphere();
  return merged;
}

// 人物的服饰保持刚性，同材质零件合并，避免每个衣饰都产生一次绘制。
export function bakeStaticMeshes(group, own) {
  group.updateMatrixWorld(true);
  const byMaterial = new Map();
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const key = [mesh.material.id, mesh.castShadow, mesh.receiveShadow].join(':');
    if (!byMaterial.has(key)) byMaterial.set(key, []);
    byMaterial.get(key).push(mesh);
  });
  const figure = new THREE.Group();
  for (const meshes of byMaterial.values()) {
    const mesh = new THREE.Mesh(own(mergeMeshes(meshes)), meshes[0].material);
    mesh.castShadow = meshes[0].castShadow;
    mesh.receiveShadow = meshes[0].receiveShadow;
    figure.add(mesh);
  }
  return figure;
}
