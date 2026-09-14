import { ACTOR_RIG } from './knife-three-actor-pose.js?v=33';

export const ACTOR_PALETTE = Object.freeze({
  ivory: 0xfff1d4, vermilion: 0xce4334, ink: 0x24333a,
  skin: 0xf8c18e, brass: 0xd9aa57, steel: 0xd5e9e3,
});

const BASE_OUTFIT = Object.freeze({
  kind: 'pawn', width: 0.94, stoop: 0, robe: 0xb85440, hem: 0x984435,
  trim: 0xf1cea0, belt: 0x624236, cape: null, hood: null, skin: ACTOR_PALETTE.skin,
  boots: 0x34343a, fists: false, sword: 0.82,
});

const OUTFITS = Object.freeze({
  '小喽啰': {},
  '剑客': { kind: 'swordsman', robe: 0x7460b2, hem: 0x5b4989, trim: 0xd7c9ed, cape: 0x503f78, sword: 1.4 },
  '弓手': { kind: 'archer', robe: 0x527f47, hem: 0x40673e, trim: 0xd8d995, hood: 0x628d51, cape: 0x6d9357, sword: 0 },
  '壮汉': { kind: 'brute', width: 1.38, robe: 0xb77a42, hem: 0x805a38, trim: 0xebbc7c, fists: true, sword: 0 },
  '忍者': { kind: 'ninja', width: 0.88, stoop: -0.12, robe: 0x374357, hem: 0x2b3748, trim: 0xa65a52, hood: 0x303a4d, sword: 0.6 },
  '影刺客': { kind: 'ninja', width: 0.92, stoop: -0.1, robe: 0x514267, hem: 0x3f3254, trim: 0xbca5d5, hood: 0x3b304d, cape: 0x655077, sword: 0.75 },
  '铁盾兵': { kind: 'shield', width: 1.15, robe: 0x657b7b, hem: 0x455959, trim: 0xdfb966, sword: 0.82 },
});

function bossOutfit(entity) {
  const iron = entity.name.includes('金刚');
  const poison = entity.name.includes('毒');
  const sword = entity.name.includes('剑仙');
  return {
    kind: 'boss', width: iron ? 1.42 : 1.24, robe: poison ? 0x915578 : sword ? 0x49677d : 0x9f5140,
    hem: poison ? 0x693c65 : 0x593e3c, trim: 0xf1cc7b, belt: 0x3c3037,
    cape: poison ? 0x59375c : 0x703c3b, fists: iron, sword: iron ? 0 : 1.5,
  };
}

export function outfitFor({ entity, hero, clone }) {
  if (hero) return {
    ...BASE_OUTFIT, kind: 'hero', width: 1.04, robe: clone ? 0xb1d6e7 : ACTOR_PALETTE.ivory,
    hem: clone ? 0x8baac8 : 0xeadbbd, trim: 0xd4bc8f, belt: ACTOR_PALETTE.vermilion,
    cape: clone ? 0x8396b4 : 0xe0d4b9, sword: 0,
  };
  return { ...BASE_OUTFIT, ...(entity.isBoss ? bossOutfit(entity) : OUTFITS[entity.name]) };
}

function drawTailoring(painter, outfit) {
  const { width, stoop, trim, belt } = outfit;
  painter.put('detail', { y: 0.89 + stoop, sx: 0.68 * width, sy: 0.15, sz: 0.53, color: belt });
  painter.put('detail', { x: 0.09, y: 0.89 + stoop, z: 0.292, sx: 0.15, sy: 0.13, sz: 0.065, color: ACTOR_PALETTE.brass });
  painter.put('detail', { x: -0.04, y: 1.23 + stoop, z: 0.27, sx: 0.095, sy: 0.64, sz: 0.035, rz: 0.62, color: trim });
  painter.put('detail', { x: 0.11, y: 1.34 + stoop, z: 0.27, sx: 0.095, sy: 0.39, sz: 0.035, rz: -0.62, color: trim });
  if (outfit.cape) painter.put('cloth', {
    y: 1.07 + stoop, z: -0.29, sx: width * 0.94, sy: outfit.kind === 'boss' ? 1.24 : 0.92,
    rx: 0.2 + painter.motion.sway, color: outfit.cape,
  });
}

function drawHero(painter) {
  painter.put('hat', { y: ACTOR_RIG.hatY, z: -0.12, rx: -0.16, color: ACTOR_PALETTE.ink });
  painter.put('detail', { y: 1.53, z: 0.04, sx: 0.62, sy: 0.17, sz: 0.52, color: ACTOR_PALETTE.vermilion });
  painter.put('detail', { x: -0.2, y: 1.45, z: 0.31, sx: 0.2, sy: 0.2, sz: 0.13, rz: 0.2, color: 0xb8342c });
  painter.put('cloth', { x: 0.3, y: 1.08, z: -0.43, sx: 0.23, sy: 0.8, rx: 0.23 + painter.motion.sway, rz: -0.13, color: ACTOR_PALETTE.vermilion });
  painter.put('cloth', { x: 0.03, y: 1.21, z: -0.46, sx: 0.16, sy: 0.64, rx: 0.2 - painter.motion.sway, rz: 0.12, color: 0xe86548 });
  painter.put('detail', { x: -0.32, y: 1.1, z: -0.4, sx: 0.115, sy: 1.08, sz: 0.1, rz: -0.28, color: ACTOR_PALETTE.ink });
  painter.put('detail', { x: -0.49, y: 1.64, z: -0.4, sx: 0.3, sy: 0.06, sz: 0.16, rz: -0.28, color: ACTOR_PALETTE.brass });
}

function drawHeadwear(painter, outfit) {
  const y = ACTOR_RIG.headY + outfit.stoop;
  if (outfit.hood) painter.put('hood', { y: y + 0.045, z: -0.025, color: outfit.hood });
  if (outfit.kind === 'ninja') {
    painter.put('detail', { y: y - 0.13, z: 0.32, sx: 0.62, sy: 0.25, sz: 0.13, color: outfit.hood });
    painter.put('detail', { y: y + 0.18, z: 0.31, sx: 0.6, sy: 0.085, sz: 0.055, color: outfit.trim });
    painter.put('cloth', { x: -0.15, y: y - 0.12, z: -0.31, sx: 0.13, sy: 0.5, rx: 0.3 + painter.motion.sway, rz: -0.3, color: outfit.trim });
    return;
  }
  if (outfit.kind === 'shield') {
    painter.put('hat', { y: y + 0.24, sx: 0.6, sy: 0.8, sz: 0.62, color: 0x647b7c });
    return;
  }
  if (!outfit.hood && outfit.kind !== 'hero') {
    painter.put('armor', { y: y + 0.36, z: -0.08, sx: 0.3, sy: 0.32, sz: 0.26, color: ACTOR_PALETTE.ink });
    painter.put('detail', { y: y + 0.19, z: 0.27, sx: 0.58, sy: 0.075, sz: 0.09, color: outfit.belt });
  }
}

function drawSword(painter, { side, length, reverse = false }) {
  const hand = painter.arm(side);
  const angle = hand.rx + (reverse ? Math.PI + 0.22 : -0.3);
  const center = length * 0.5 + 0.12;
  painter.put('steel', {
    x: hand.x, y: hand.y + Math.cos(angle) * center, z: hand.z + Math.sin(angle) * center,
    sy: length, rx: angle, rz: hand.rz, color: ACTOR_PALETTE.steel,
  });
  painter.put('detail', { x: hand.x, y: hand.y, z: hand.z, sx: 0.085, sy: 0.22, sz: 0.09, rx: angle, color: 0x523b35 });
  painter.put('detail', {
    x: hand.x, y: hand.y + Math.cos(angle) * 0.12, z: hand.z + Math.sin(angle) * 0.12,
    sx: 0.3, sy: 0.055, sz: 0.13, rx: angle, color: ACTOR_PALETTE.brass,
  });
}

function drawArcher(painter) {
  const hand = painter.arm(-1);
  painter.put('bow', { x: hand.x - 0.035, y: hand.y + 0.08, z: hand.z + 0.035, ry: Math.PI, color: 0x80582e });
  painter.put('detail', { x: hand.x - 0.035, y: hand.y + 0.08, z: hand.z + 0.035, sx: 0.018, sy: 1.22, sz: 0.018, color: 0xe4d7a9 });
  painter.put('torso', { x: 0.26, y: 1.12, z: -0.4, sx: 0.28, sy: 0.95, sz: 0.52, rz: -0.14, color: 0x725232 });
  [-1, 0, 1].forEach(index => {
    painter.put('detail', { x: 0.26 + index * 0.075, y: 1.58, z: -0.43, sx: 0.025, sy: 0.55, sz: 0.025, color: 0xd5b87b });
    painter.put('detail', { x: 0.26 + index * 0.075, y: 1.83, z: -0.43, sx: 0.075, sy: 0.13, sz: 0.035, color: 0xe5e3ca });
  });
}

function drawShield(painter, outfit) {
  const x = -0.6 * outfit.width;
  painter.put('shield', { x, y: 1, z: 0.37, ry: 0.13, color: 0x536d73 });
  painter.put('detail', { x, y: 1.02, z: 0.48, sx: 0.095, sy: 0.76, sz: 0.035, color: ACTOR_PALETTE.brass });
  painter.put('armor', { x, y: 1.05, z: 0.5, sx: 0.28, sy: 0.28, sz: 0.13, color: 0xe6c677 });
}

function drawArmor(painter, outfit) {
  if (!['boss', 'shield'].includes(outfit.kind)) return;
  [-1, 1].forEach(side => painter.put('armor', {
    x: side * 0.53 * outfit.width, y: 1.43, z: 0,
    sx: 0.66, sy: 0.39, sz: 0.73, rz: side * 0.18, color: outfit.trim,
  }));
  if (outfit.kind !== 'boss') return;
  painter.put('detail', { y: 2.01, sx: 0.67, sy: 0.14, sz: 0.57, color: ACTOR_PALETTE.brass });
  [-1, 1].forEach(side => {
    painter.put('horn', { x: side * 0.31, y: 2.29, z: -0.03, rz: side * -0.46, color: 0xf0d5a5 });
    painter.put('horn', { x: side * 0.77 * outfit.width, y: 1.61, sx: 0.7, sy: 0.75, sz: 0.7, rz: side * -0.7, color: outfit.trim });
  });
  painter.put('horn', { y: 2.2, z: 0.23, sx: 0.55, sy: 0.56, sz: 0.55, color: ACTOR_PALETTE.brass });
}

export function drawWardrobe(painter, outfit) {
  drawTailoring(painter, outfit);
  drawHeadwear(painter, outfit);
  drawArmor(painter, outfit);
  if (outfit.kind === 'hero') drawHero(painter);
  if (outfit.kind === 'archer') drawArcher(painter);
  if (outfit.kind === 'shield') drawShield(painter, outfit);
  if (outfit.sword) drawSword(painter, { side: 1, length: outfit.sword, reverse: outfit.kind === 'ninja' });
  if (outfit.kind === 'ninja') drawSword(painter, { side: -1, length: outfit.sword, reverse: true });
}
