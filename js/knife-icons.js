const PATHS = Object.freeze({
  blade: '<path d="M24 3h5l-1 5-15 15-5-5Z"/><path d="m8 15 9 9M11 22l-6 7M24 7 12 19"/>',
  shadow: '<circle cx="13" cy="10" r="5"/><path d="M3 27v-4a10 10 0 0 1 20 0v4M24 6a5 5 0 0 1 0 9m2 4a8 8 0 0 1 3 8"/>',
  shield: '<path d="m16 3 11 4v9c0 7-11 13-11 13S5 23 5 16V7Z"/><path d="m10 15 4 4 8-9"/>',
  wind: '<path d="M4 11h18a4 4 0 1 0-4-4M3 17h23a3 3 0 1 1-3 3M7 23h8a3 3 0 1 1-3 3"/>',
  swirl: '<path d="M27 13a11 11 0 1 0-11 14 8 8 0 1 0-8-8 5 5 0 1 0 5-5 2 2 0 1 0 2 2"/>',
  thunder: '<path d="M18 2 6 18h9l-1 12L27 13h-9Z"/>',
  heart: '<path d="M16 28 5 16C-3 5 11-1 16 9 21-1 35 5 27 16Z"/><path d="M7 16h5l3-6 4 11 3-5h4"/>',
  clock: '<circle cx="16" cy="17" r="11"/><path d="M12 2h8m-4 8v8l5 3M7 6 4 9"/>',
  burst: '<path d="m16 2 3 9 8-5-4 9 7 3-9 3 3 9-8-6-8 6 3-9-9-3 7-3-4-9 8 5Z"/>',
  gem: '<path d="m10 4-7 8 13 17 13-17-7-8Z"/><path d="M3 12h26M10 4l-1 8 7 17 7-17-1-8M9 12l7-8 7 8"/>',
  eye: '<path d="M2 16s5-10 14-10 14 10 14 10-5 10-14 10S2 16 2 16Z"/><circle cx="16" cy="16" r="5"/><path d="M16 1v3m0 24v3"/>',
  book: '<path d="M16 7C12 3 6 3 3 4v22c4-2 9-1 13 3 4-4 9-5 13-3V4c-3-1-9-1-13 3Zm0 0v22M7 11l5 1m-5 5 5 1m8-6 5-1m-5 7 5-1"/>',
  lotus: '<path d="M16 3c-10 9-7 16 0 21 7-5 10-12 0-21ZM16 24C4 22 2 15 3 9c7 0 11 6 13 15Zm0 0c12-2 14-9 13-15-7 0-11 6-13 15ZM7 29h18"/>',
});

const GROUPS = Object.freeze({
  blade: ['sword_qi', 'blade_count', 'blade_len', 'blade_dmg', 'skill_sword_qi', 'perm_atk', 'bless_dmg'],
  shadow: ['shadow_clone', 'skill_shadow'],
  shield: ['golden_bell', 'skill_bell', 'thorns', 'max_hp', 'perm_hp', 'perm_shield', 'bless_guard'],
  wind: ['move_speed', 'agile_move', 'perm_speed', 'bless_speed'],
  swirl: ['whirlwind', 'blade_speed', 'skill_whirlwind', 'bless_blade'],
  thunder: ['thunder', 'skill_thunder'],
  heart: ['lifesteal', 'skill_lifesteal', 'vampire_blade', 'heal', 'bless_heal'],
  clock: ['time_slow', 'skill_time_slow', 'bless_combo'],
  burst: ['blade_burst', 'skill_blade_burst', 'bless_rebirth'],
  gem: ['magnet', 'perm_pickup', 'bless_magnet'],
  eye: ['crit', 'perm_crit'],
  book: ['enlightenment', 'bless_wisdom'],
  lotus: ['bless_focus'],
});
const ICONS = Object.freeze(Object.fromEntries(Object.entries(GROUPS).flatMap(([key, ids]) => ids.map(id => [id, PATHS[key]]))));

export function createKnifeIcon(id) {
  if (!Object.hasOwn(ICONS, id)) throw new RangeError(`未定义的武学图标：${id}`);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const attributes = { viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
  Object.entries(attributes).forEach(([name, value]) => svg.setAttribute(name, value));
  svg.innerHTML = ICONS[id];
  return svg;
}
