import * as THREE from './vendor/three.module.js?v=33';
import { ARENA } from './knife-three-config.js?v=33';
import { createGround } from './knife-three-ground.js?v=33';
import { createNature, updatePetals, revealNearbyActors } from './knife-three-nature.js?v=33';

const TERRAIN_COLORS = Object.freeze({
  plain: [0x739069, 0x8a9d88, 0xa8c5bb],
  lava: [0x78675a, 0x9f8a77, 0xbaab9a],
  ice: [0xacccd0, 0xc5d6d2, 0xb6d0d2],
});

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xddeff1, 0x799382, 2.0));
  const sun = new THREE.DirectionalLight(0xffe5c2, 2.4);
  sun.position.set(-12, 26, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(ARENA.shadowSize, ARENA.shadowSize);
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, far: 85 });
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.00008;
  sun.shadow.radius = 3;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xdcebf0, 0.9);
  rim.position.set(8, 12, 16);
  scene.add(rim);
}

export class ArenaStage {
  constructor(scene) {
    this.scene = new THREE.Group();
    scene.add(this.scene);
    this.ground = createGround();
    this.nature = createNature();
    this.scene.add(this.ground.group, this.nature.group);
    addLights(this.scene);
    scene.background = new THREE.Color(ARENA.background);
    scene.fog = new THREE.Fog(ARENA.background, 52, 105);
    this.world = scene;
    this.terrain = '';
  }

  update({ center, terrain, time, origin = { x: 0, y: 0 } }) {
    const unit = ARENA.pixelsPerUnit;
    const x = (origin.x - center.x) / unit;
    const z = (origin.y - center.y) / unit;
    this.ground.court.position.set(x, 0, z);
    this.nature.group.position.set(x, 0, z);
    this.ground.meadowMaterial.map.offset.set(center.x / unit / 100, -center.y / unit / 100);
    updatePetals(this.nature.leaves, time);
    revealNearbyActors(this.nature.foliage, { x: -x, z: -z });
    if (this.terrain === terrain) return;
    this.terrain = terrain;
    const [meadow, stone, mist] = TERRAIN_COLORS[terrain];
    this.ground.meadowMaterial.color.setHex(meadow);
    this.ground.stoneMaterial.color.setHex(stone);
    this.world.background.setHex(mist);
    this.world.fog.color.setHex(mist);
  }

  dispose() {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
      if (object.shadow) object.shadow.dispose();
      if (object.isInstancedMesh) object.dispose();
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => {
      if (material.map) textures.add(material.map);
      material.dispose();
    });
    textures.forEach(texture => texture.dispose());
    this.scene.removeFromParent();
  }
}
