/* 原创角色立绘：生成静态 SVG sprite，游戏运行不执行本脚本。 */
const fs = require('node:fs');
const path = require('node:path');

const COLORS = Object.freeze({
  ink: '#263b40', gold: '#cfb77a', ivory: '#f6eed9', jade: '#4f8273', blue: '#476a84',
  rust: '#ad6651', violet: '#766487', sage: '#879973', teal: '#35616b', earth: '#867058',
});
const CHARACTERS = Object.freeze([
  ['散修弟子', 'jade', 'gold', 'sword', 'bun'],
  ['山野猎人', 'earth', 'sage', 'bow', 'straw'],
  ['村庄守卫', 'blue', 'gold', 'shield', 'helmet'],
  ['草药师', 'sage', 'ivory', 'herbs', 'wrap'],
  ['符箓学徒', 'rust', 'gold', 'charm', 'bun'],
  ['采药童子', 'jade', 'ivory', 'herbs', 'child'],
  ['灵兽幼崽', 'earth', 'ivory', 'beast', 'beast'],
  ['铁匠学徒', 'earth', 'rust', 'hammer', 'wrap'],
  ['书生', 'blue', 'ivory', 'book', 'scholar'],
  ['乞丐', 'earth', 'sage', 'staff', 'rag'],
  ['护院', 'teal', 'gold', 'spear', 'helmet'],
  ['小道士', 'blue', 'ivory', 'charm', 'dao'],
  ['剑修弟子', 'teal', 'ivory', 'sword', 'bun'],
  ['体修弟子', 'rust', 'gold', 'beads', 'monk'],
  ['丹修弟子', 'jade', 'gold', 'medicine', 'dao'],
  ['符修弟子', 'violet', 'gold', 'thunder', 'bun'],
  ['灵兽师', 'rust', 'ivory', 'fox', 'wrap'],
  ['阵法师', 'blue', 'gold', 'circle', 'scholar'],
  ['御剑弟子', 'blue', 'ivory', 'blades', 'bun'],
  ['毒修弟子', 'violet', 'sage', 'poison', 'hood'],
  ['铸器师', 'teal', 'gold', 'hammer', 'wrap'],
  ['医修弟子', 'ivory', 'jade', 'medicine', 'dao'],
  ['剑仙', 'ivory', 'blue', 'blades', 'sage'],
  ['雷法真人', 'violet', 'gold', 'thunder', 'sage'],
  ['太乙真人', 'jade', 'ivory', 'staff', 'sage'],
  ['金刚尊者', 'gold', 'rust', 'beads', 'monk'],
  ['天狐仙子', 'ivory', 'rust', 'fan', 'fox'],
  ['药王', 'teal', 'gold', 'medicine', 'sage'],
  ['剑尊', 'ink', 'gold', 'blades', 'crown'],
  ['仙帝', 'ivory', 'gold', 'circle', 'emperor'],
  ['天机真人', 'blue', 'ivory', 'circle', 'sage'],
]);

function background(look) {
  const moonX = look.id % 2 ? 86 : 33;
  return `<rect width="120" height="144" rx="9" fill="#e1e7d8"/>
    <path d="M0 0h120v144H0z" fill="${look.robe}" opacity=".12"/>
    <circle cx="${moonX}" cy="35" r="24" fill="${look.trim}" opacity=".24"/>
    <circle cx="60" cy="60" r="44" fill="none" stroke="${look.trim}" stroke-width=".8" opacity=".65"/>
    <path d="m-10 108 38-47 24 24 28-48 48 71v36H0Z" fill="${look.robe}" opacity=".12"/>
    <path d="m-8 120 44-31 22 18 32-38 40 53v32H0Z" fill="${look.robe}" opacity=".14"/>
    <path d="M9 24h17m-10-5h17m53 50h24m-16-5h20" stroke="${COLORS.ivory}" stroke-width="1.4" opacity=".8"/>`;
}

function sword({ x = 22, y = 15, rotate = -14, scale = 1 } = {}) {
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
    <path d="m0 0-3 12v56h6V12Z" fill="#ede9d9" stroke="#577079" stroke-width=".8"/>
    <path d="M0 9v59" stroke="#a7bbc1" stroke-width="1"/>
    <path d="M-8 68H8M0 69v14" stroke="${COLORS.gold}" stroke-width="3"/>
    <path d="M0 84q9 5 5 16" fill="none" stroke="${COLORS.rust}" stroke-width="2"/>
  </g>`;
}

function rearAccessory(look) {
  if (look.gear === 'sword') return sword();
  if (look.gear === 'blades') return sword({ x: 17, y: 31, rotate: -18 }) + sword({ x: 97, y: 4, rotate: 13 });
  if (look.gear === 'bow') return '<path d="M97 32q-33 48 0 92l-12-46Z" fill="none" stroke="#987744" stroke-width="3"/><path d="m103 34-18 44-13 41" fill="none" stroke="#ede9d9"/>';
  if (look.gear === 'spear') return '<path d="M23 143V39" stroke="#927249" stroke-width="4"/><path d="m23 12-7 26 7 9 7-9Z" fill="#c2d1cb"/><path d="m24 44 18 4-15 15" fill="#b56554"/>';
  if (look.gear === 'staff') return '<path d="m96 147-3-124q-4-11-11-1" fill="none" stroke="#857052" stroke-width="5" stroke-linecap="round"/>';
  if (look.gear === 'thunder') return '<path d="m93 12-14 34 18-7-15 30 28-38-20 6 13-25Z" fill="#d7bd7e" opacity=".7"/>';
  return '';
}

function robe(look) {
  return `<path d="M19 145 25 100Q31 84 49 80h22q19 4 25 20l8 45Z" fill="${look.robe}" stroke="${COLORS.ink}" stroke-width="1"/>
    <path d="m25 99 13-10 9 24-12 32H17Zm70 0-13-10-9 24 12 32h18Z" fill="${look.trim}" opacity=".22"/>
    <path d="m49 77-8 10 20 30 20-30-10-10-11 10Z" fill="${COLORS.ivory}"/>
    <path d="m49 77 21 31-9 9-20-30Z" fill="${look.trim}"/>
    <path d="m71 77-22 47 8 20h10l-8-19 22-38Z" fill="${look.trim}"/>
    <path d="m49 81 20 28m8-27-22 45" fill="none" stroke="${COLORS.ivory}" stroke-width="1" opacity=".8"/>
    <path d="M31 133h58v10H31z" fill="${COLORS.ink}"/><path d="M55 132h11v11H55z" fill="${look.trim}"/>
    <path d="m30 109 9 4-5 17-8-3m64-18-9 4 5 17 8-3" fill="none" stroke="${look.trim}" stroke-width="2"/>`;
}

function face(look) {
  const elder = look.head === 'sage';
  const longHair = ['sage', 'fox', 'crown', 'emperor'].includes(look.head);
  const skin = look.id % 3 === 0 ? '#d8a582' : '#e6b997';
  const hair = elder || look.head === 'fox' ? '#e9e4cf' : '#263b40';
  return `${longHair ? `<path d="M42 38q18-19 36 0l6 70-13-12-11-51-11 51-13 12Z" fill="${hair}"/>` : ''}
    <path d="M52 70h16v14l-8 7-8-7Z" fill="#c99476"/>
    <ellipse cx="44" cy="56" rx="4" ry="6" fill="${skin}"/><ellipse cx="76" cy="56" rx="4" ry="6" fill="${skin}"/>
    <path d="M44 40q16-17 32 0l-1 19q-1 14-15 20-14-6-15-20Z" fill="${skin}"/>
    <path d="M68 35q11 5 7 25-2 11-15 19l10-19Z" fill="#c89476" opacity=".36"/>
    <path d="m49 52 7-1m8 0 7 1" stroke="${elder ? '#e9e4cf' : '#3b4140'}" stroke-width="${look.head === 'fox' ? 1 : 2}" stroke-linecap="round"/>
    <path d="${look.head === 'fox' ? 'm49 57 6 1m10 0 6-1' : 'M50 58h5m10 0h5'}" stroke="#313b3d" stroke-width="1.8" stroke-linecap="round"/>
    ${look.head === 'fox' ? '<path d="M47 64h7m12 0h7" stroke="#c47c75" stroke-width="3" opacity=".5"/>' : ''}
    <path d="m60 58-1 7h3m-7 5q5 3 10 0" fill="none" stroke="#a87060" stroke-width="1.1"/>
    ${look.head !== 'monk' ? `<path d="M43 50q-7-21 10-25 9-6 19 1 10 6 6 26l-6-16q-12 11-23 1l-3 19Z" fill="${hair}"/>` : ''}
    ${elder ? `<path d="m48 66 12 7 12-7-4 24-9 10-7-10Z" fill="${hair}"/><path d="m50 68 10-3 10 3m-10 5-1 20" fill="none" stroke="#d0d6c8"/>` : ''}`;
}

function headwear(look) {
  const { head, trim, robe: cloth } = look;
  const styles = {
    bun: `<ellipse cx="60" cy="22" rx="8" ry="7" fill="#263b40"/><path d="M51 22h18" stroke="${trim}" stroke-width="3"/><path d="m68 23 16 25" stroke="${trim}" stroke-width="2"/>`,
    wrap: `<path d="M43 34q16-8 33 0v7q-17-7-33 0Z" fill="${trim}"/><path d="m75 34 10 29-7-9" fill="${trim}"/>`,
    rag: '<path d="M42 33q20-4 34 2v7q-20-7-34-1Z" fill="#c6baa0"/><path d="M48 66h7m-4 3h6" stroke="#9a8165" stroke-width="1.3"/>',
    straw: '<path d="M23 43 59 16 99 44 59 49Z" fill="#c0a46b" stroke="#85764f"/><path d="m59 16-8 31m8-31 17 30m-37-6 43 1" fill="none" stroke="#e2cc96" stroke-width="1.3"/>',
    helmet: `<path d="M40 49V36q20-26 40 0v13l-8-10H48Z" fill="${cloth}" stroke="${trim}" stroke-width="2"/><path d="M57 21h6v22h-6z" fill="${trim}"/><path d="M39 40h42" stroke="${trim}" stroke-width="3"/>`,
    scholar: `<path d="M43 36V19h34v17l-17-4Z" fill="#31454b"/><path d="M43 27 29 23v13l14-2m34-7 14-4v13l-14-2" fill="${cloth}"/><path d="M43 36h34" stroke="${trim}" stroke-width="2"/>`,
    dao: `<path d="m51 25 1-11h16l1 11Z" fill="${cloth}" stroke="${trim}"/><path d="M60 15v14M44 39h32" stroke="${trim}" stroke-width="2"/>`,
    child: '<circle cx="42" cy="32" r="8" fill="#263b40"/><circle cx="78" cy="32" r="8" fill="#263b40"/><path d="m37 37 8-7m30 0 8 7" stroke="#b87f62" stroke-width="3"/>',
    hood: `<path d="M37 74V36Q60 2 83 36v38l-9-9 2-25-16-11-16 11 2 25Z" fill="${cloth}" stroke="#414754" stroke-width="2"/><path d="m44 65 16-4 16 4-16 14Z" fill="#4b5653"/>`,
    fox: '<path d="m40 36-6-24 18 12m16 0 18-12-6 24" fill="#f2e9d5" stroke="#b47965" stroke-width="2"/><path d="m59 43 2-5 2 5-2 5Z" fill="#bf6a62"/>',
    monk: '<path d="M58 38h4m-2-2v4" stroke="#a5664c"/><path d="M36 86q24 27 49 0" fill="none" stroke="#8c5d40" stroke-width="5" stroke-dasharray="1 7" stroke-linecap="round"/>',
    sage: `<path d="M52 26q-1-13 8-14 9 1 8 14Z" fill="#e9e4cf"/><path d="M49 23h23" stroke="${trim}" stroke-width="3"/>`,
    crown: `<path d="m43 32-1-16 10 7 8-16 8 16 10-7-1 16Z" fill="${trim}" stroke="#9c824e"/><path d="m60 16-3 8 3 5 3-5Z" fill="#6aaba2"/>`,
    emperor: '<path d="M37 22h46v8H37Zm10 8h26v8H47Z" fill="#c8a65e" stroke="#947044"/><path d="M41 29v22m9-20v23m20-23v23m9-25v22" stroke="#d8c790" stroke-width="1.5"/><circle cx="60" cy="28" r="3" fill="#448476"/>',
  };
  return styles[head];
}

function foreground(look) {
  const gold = COLORS.gold;
  const items = {
    herbs: '<path d="M60 131V96m0 21-14-10m14-2 12-10m-12 34 15-14" fill="none" stroke="#54816a" stroke-width="3"/><path d="M48 109q-15-16-11-20 18 1 18 21m10-3q0-18 16-18 0 15-16 18m0 15q8-16 20-10-5 13-20 10" fill="#7ba277"/>',
    book: '<path d="M36 102q13-5 24 2 11-7 24-2v24q-13-5-24 2-11-7-24-2Z" fill="#ece4c9" stroke="#74867e" stroke-width="1.3"/><path d="M60 104v24m-18-17 13 2m-13 5 13 2m10-10 13-2m-13 9 13-2" stroke="#85988b" fill="none"/>',
    charm: `<path d="m51 96 24 4-7 35-24-4Z" fill="${gold}" stroke="#96774c"/><path d="m57 101-4 7 10-1-7 11 9 1-9 9m-5-18 14 2m-18 12 14 2" fill="none" stroke="#ab6551" stroke-width="2"/>`,
    medicine: '<path d="M53 103h14l-1 8q15 11 7 24H47q-8-13 7-24Z" fill="#81a18e" stroke="#49786b" stroke-width="1.4"/><path d="M53 100h14v7H53z" fill="#d4b572"/><path d="M52 117h16v12H52z" fill="#eee5c9"/><path d="M56 123h8m-4-4v8" stroke="#78937b" stroke-width="1.5"/>',
    poison: '<path d="M55 96h11v12q13 12 8 27H46q-4-15 10-27Z" fill="#547c67" stroke="#344c4d"/><path d="M53 96h16v7H53z" fill="#b5a573"/><path d="M48 121q14-7 24 0v11H48Z" fill="#a8bc71"/><circle cx="62" cy="114" r="3" fill="#c9d58d"/>',
    hammer: '<path d="m50 139 23-48" stroke="#967250" stroke-width="5"/><path d="m57 88 8-10 23 13-3 10-15-2Z" fill="#72918e" stroke="#365259" stroke-width="1.5"/><path d="m63 86 19 11" stroke="#acc2b8"/>',
    shield: '<path d="m37 105 23-10 23 10-3 25-20 12-20-12Z" fill="#577b83" stroke="#cfb77a" stroke-width="2"/><path d="M60 98v40m-19-29h39" stroke="#cfb77a" stroke-width="1.2"/>',
    circle: `<circle cx="60" cy="117" r="20" fill="#e5d9ae" stroke="${gold}" stroke-width="3"/><circle cx="60" cy="117" r="14" fill="none" stroke="#738985"/><path d="M60 103a7 7 0 0 1 0 14 7 7 0 0 0 0 14 14 14 0 0 1 0-28Z" fill="#406a6d"/><circle cx="60" cy="110" r="2" fill="#e5d9ae"/><circle cx="60" cy="124" r="2" fill="#406a6d"/>`,
    fan: '<path d="M59 135 29 113q31-31 63 0Z" fill="#e9d9c8" stroke="#b98172"/><path d="m59 135-18-28m18 28-5-34m5 34 10-34m-10 34 23-28" stroke="#b79a80"/><path d="m44 113 8-3m15-1 9 2" stroke="#ac6d68"/>',
    fox: '<path d="m72 130-5-21 10 5 15-10-3 27-14 6Z" fill="#e7c69b" stroke="#a77d59"/><path d="m72 117 6 6 10-7-4 15-6 3Z" fill="#f3e7ce"/><path d="m74 123 3 1m6-2 3-1m-8 6h3" stroke="#394748" stroke-width="1.5"/>',
  };
  if (look.gear === 'beads') return '<path d="M44 109q17 14 31 0" fill="none" stroke="#d0ab6d" stroke-width="6" stroke-dasharray="1 8" stroke-linecap="round"/><path d="m57 112 4-7 4 7v18h-8Z" fill="#d8a582"/>';
  if (look.gear === 'thunder') return items.charm;
  if (Object.hasOwn(items, look.gear)) return items[look.gear];
  return `<path d="m37 120 15 4m31-4-14 4" stroke="#dfb394" stroke-width="7" stroke-linecap="round"/><path d="M52 124h16" stroke="${gold}" stroke-width="3"/>`;
}

function beast() {
  return `<path d="M72 127q44-9 28-51-2 21-24 24" fill="#bf9970" stroke="#8c775d"/>
    <path d="M33 143q-5-30 12-47h31q19 18 16 47Z" fill="#c5a47e"/>
    <path d="m36 70-9-43 28 17q15-5 24 4l20-15-7 41q7 25-27 39-35-8-29-43Z" fill="#c5a47e" stroke="#8c775d" stroke-width="1.5"/>
    <path d="m38 65-6-29 17 17m32 0 12-12-6 24" fill="#d7b6a0"/>
    <path d="m41 76 21 9 25-6-9 22-16 8-17-15Z" fill="#eee5cd"/>
    <path d="m45 73 10 3m17 1 9-3" stroke="#364443" stroke-width="3" stroke-linecap="round"/>
    <path d="m57 86 11 1-6 7Z" fill="#3b4542"/><path d="M62 93v4m0 0-5 3m5-3 6 2" stroke="#867a63" fill="none"/>
    <path d="m43 111 36 1-4 10H46Z" fill="#567d73"/><circle cx="61" cy="121" r="5" fill="#d8bd78"/>
    <path d="M43 130v13m37-13v13" stroke="#aa8765" stroke-width="8" stroke-linecap="round"/>`;
}

function portrait(entry, index) {
  const [name, robeColor, trimColor, gear, head] = entry;
  const look = { id: index + 1, name, robe: COLORS[robeColor], trim: COLORS[trimColor], gear, head };
  const figure = gear === 'beast' ? beast() : rearAccessory(look) + robe(look) + face(look) + headwear(look) + foreground(look);
  return `<symbol id="character-${look.id}" viewBox="0 0 120 144"><title>${name}</title>`
    + (background(look) + figure).replace(/\s*\n\s*/g, '') + '</symbol>';
}

const target = path.resolve(__dirname, '../assets/cardcollect/portraits.svg');
fs.mkdirSync(path.dirname(target), { recursive: true });
const source = '<svg xmlns="http://www.w3.org/2000/svg">\n'
  + CHARACTERS.map(portrait).join('\n') + '\n</svg>\n';
fs.writeFileSync(target, source);
const preview = path.resolve(__dirname, '../.tmp/third-round/portraits.html');
const cards = CHARACTERS.map(([name], index) => `<figure><svg viewBox="0 0 120 144"><use href="../../assets/cardcollect/portraits.svg?v=33#character-${index + 1}"/></svg><figcaption>${name}</figcaption></figure>`);
fs.mkdirSync(path.dirname(preview), { recursive: true });
fs.writeFileSync(preview, `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>仙卡录 · 角色立绘校验</title>
  <style>body{margin:0;padding:24px;background:#dce6de;color:#294a51;font:14px Microsoft YaHei,sans-serif}
  main{display:grid;grid-template-columns:repeat(8,1fr);gap:20px}figure{margin:0;text-align:center}
  svg{display:block;width:100%;height:180px}figcaption{padding-top:5px}</style><main>${cards.join('')}</main></html>`);
console.log(`已生成 ${CHARACTERS.length} 位角色立绘：${target}`);
