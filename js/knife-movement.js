export const MOVEMENT = Object.freeze({ friction: 0.7, hurtFlashFrames: 8 });
export const DASH = Object.freeze({ duration: 10, cooldown: 240, speedMultiplier: 4, invincibleFrames: 11 });

export function movementVector(keys, joystick) {
  const x = Number(Boolean(keys.d || keys.arrowright)) - Number(Boolean(keys.a || keys.arrowleft)) + (joystick?.x ?? 0);
  const y = Number(Boolean(keys.s || keys.arrowdown)) - Number(Boolean(keys.w || keys.arrowup)) + (joystick?.y ?? 0);
  const length = Math.hypot(x, y);
  const scale = length > 1 ? 1 / length : 1;
  return { x: x * scale, y: y * scale };
}

export function idleDash() {
  return { frames: 0, cooldown: 0, direction: { x: 0, y: 0 } };
}

export function beginDash({ dash, movement, facing }) {
  if (dash.cooldown > 0 || dash.frames > 0) return null;
  const length = Math.hypot(movement.x, movement.y);
  const direction = length
    ? { x: movement.x / length, y: movement.y / length }
    : { x: Math.cos(facing), y: Math.sin(facing) };
  return { frames: DASH.duration, cooldown: DASH.cooldown, direction };
}

export function advanceDash(dash) {
  return { ...dash, frames: Math.max(0, dash.frames - 1), cooldown: Math.max(0, dash.cooldown - 1) };
}
