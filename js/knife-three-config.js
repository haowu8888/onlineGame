export const ARENA = Object.freeze({
  background: 0xa8c5bb,
  floor: 0x98ac86,
  jade: 0x5dddc4,
  gold: 0xffd584,
  vermilion: 0xe85f48,
  ink: 0x263747,
  pixelsPerUnit: 24,
  cameraHeight: 30,
  cameraDepth: 27,
  menuZoom: 1.08,
  menuHeroOffset: 0.23,
  viewportWidth: 800,
  viewportHeight: 600,
  viewHeight: 21,
  tileSize: 4,
  tileRadius: 8,
  maxPixelRatio: 2,
  shadowSize: 2048,
  weaponHeight: 1.05,
  groundHeight: 0,
  hitFlashFrames: 4,
  framesPerSecond: 60,
});

export function worldPosition(entity, camera) {
  return {
    x: (entity.x - camera.x) / ARENA.pixelsPerUnit,
    z: (entity.y - camera.y) / ARENA.pixelsPerUnit,
  };
}
