export const PALETTE = Object.freeze({
  ink: 0x0b2837, pine: 0x244f4d, jade: 0x82c3ae, gold: 0xcba96e,
  mist: 0xb7ced0, coral: 0xb75f52, stone: 0x77938c, paper: 0xe6e9de,
  water: 0x326d81, bark: 0x695148, leaf: 0x487464, purple: 0x827aa2,
});

export const SCENE_THEMES = Object.freeze({
  cultivation: { sky: 0x9dbbbc, ground: 0x648d7e, stone: 0xb7c2ae, foliage: 0x356955, light: 0xffe6bb },
  lifesim: { sky: 0xc8d4c8, ground: 0x82936c, stone: 0xd2ccb6, foliage: 0xc88987, light: 0xffe8c5 },
  guigu: { sky: 0x8eafba, ground: 0x5c8275, stone: 0xa8b9ad, foliage: 0x356b5b, light: 0xeaf4db },
  cardtower: { sky: 0x46596c, ground: 0x384b59, stone: 0x829198, foliage: 0xa06552, light: 0xf1c390 },
  cardbattle: { sky: 0x90adb2, ground: 0x527978, stone: 0x9eb4ae, foliage: 0x467566, light: 0xe3eee0 },
  cardcollect: { sky: 0x777f9c, ground: 0x4b637b, stone: 0xa7b6bf, foliage: 0xc3a3bb, light: 0xe4e8ff },
});

export const VIEW = Object.freeze({
  height: 10.8, width: 13.8, near: 0.1, far: 150, cameraDistance: 28,
  elevation: 0.65, yaw: -0.06, shadowSize: 1024, pixelRatio: 2,
  stateIntervalMs: 100, fitPadding: 1.04, secondsPerMillisecond: 0.001,
});

export const MOTION = Object.freeze({
  breathingRate: 2.1, breathingAmount: 0.025, damageDuration: 0.45,
  damageScale: 0.12, glowRate: 2.4, haloSpeed: 0.18, moveRate: 8,
});
