const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadESModule } = require('./helpers/esm-loader.js');

const fixture = Object.freeze({
  center: Object.freeze({ x: 960, y: 720 }), start: 27, tip: 94, pixels: 24,
  angleStep: 0.12, frameCount: 12, lifeStep: 0.08,
});
const modules = Promise.all([
  loadESModule('js/vendor/three.module.js'), loadESModule('js/knife-three-trails.js'),
]).then(results => results.map(result => result.namespace));

function bladesAt(frame, count) {
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const angle = frame * fixture.angleStep + index * Math.PI * 2 / count;
    return Object.freeze({
      x1: fixture.center.x + Math.cos(angle) * fixture.start,
      y1: fixture.center.y + Math.sin(angle) * fixture.start,
      x2: fixture.center.x + Math.cos(angle) * fixture.tip,
      y2: fixture.center.y + Math.sin(angle) * fixture.tip,
    });
  }));
}

function sample(count = 4, frameCount = fixture.frameCount) {
  const segments = Object.freeze(Array.from({ length: frameCount }, (_, frame) => {
    const life = 1 - (frameCount - frame) * fixture.lifeStep;
    return bladesAt(frame, count).map(blade => Object.freeze({ ...blade, life }));
  }).flat());
  return { segments, blades: bladesAt(frameCount - 1, count), center: fixture.center };
}

function values(trails, name) {
  const attribute = trails.geometry.getAttribute(name);
  return Array.from(attribute.array.slice(0, trails.count * attribute.itemSize));
}

test('刀光来自真实历史；最新端点和生命值明确，输入保持不变', async () => {
  const [, { trailSnapshots }] = await modules;
  const input = sample();
  const before = JSON.stringify(input);
  const frames = trailSnapshots(input.segments, input.blades);
  assert.equal(frames.length, fixture.frameCount);
  assert.equal(frames.at(-1).life, 1);
  assert.equal(frames.at(-1).blades, input.blades);
  assert.equal(JSON.stringify(input), before);
  const moved = trailSnapshots(input.segments, bladesAt(fixture.frameCount, 4));
  assert.equal(moved.length, fixture.frameCount + 1);
});

test('增加或减少刀数时不会连接旧索引；保留同数量的最新完整帧', async () => {
  const [, { trailSnapshots }] = await modules;
  const old = sample(2, 3);
  assert.equal(trailSnapshots(old.segments, bladesAt(3, 3)).length, 0);
  const newest = sample(3, 2);
  const merged = [...old.segments, ...newest.segments];
  const frames = trailSnapshots(merged, newest.blades);
  assert.equal(frames.length, 2);
  assert.ok(frames.every(frame => frame.blades.length === 3));
  const incomplete = [old.segments[0], ...newest.segments];
  assert.equal(trailSnapshots(incomplete, newest.blades).length, 2);
});

test('弧带始终位于刀尖，几何有限且每把刀分别连接', async () => {
  const [THREE, { BladeTrails }] = await modules;
  const trails = new BladeTrails(new THREE.Scene());
  trails.render(sample());
  const positions = values(trails, 'position');
  assert.ok(positions.every(Number.isFinite));
  const trackVertices = trails.count / 4;
  const tipRadius = fixture.tip / fixture.pixels;
  for (let vertex = 0; vertex < trails.count; vertex++) {
    const radius = Math.hypot(positions[vertex * 3], positions[vertex * 3 + 2]);
    assert.ok(radius > tipRadius * 0.89 && radius < tipRadius * 1.02, `radius ${radius}`);
  }
  for (let track = 0; track < 4; track++) {
    const offset = track * trackVertices * 3;
    const angle = Math.atan2(positions[offset + 2], positions[offset]);
    const expected = track * Math.PI * 2 / 4;
    assert.ok(Math.abs(Math.sin(angle - expected)) < 0.00001);
    assert.ok(Math.cos(angle - expected) > 0);
  }
  assert.equal(trails.material.transparent, true);
  assert.equal(trails.material.depthWrite, false);
  assert.equal(trails.material.blending, THREE.NormalBlending);
  trails.dispose();
});

test('两侧透明，弧带中线沿历史时间渐显，无实心扇面', async () => {
  const [THREE, { BladeTrails }] = await modules;
  const trails = new BladeTrails(new THREE.Scene());
  trails.render(sample(1));
  const colors = values(trails, 'color');
  const alphas = colors.filter((_, index) => index % 4 === 3);
  assert.ok(alphas.every(value => value >= 0 && value <= 0.50001));
  let previous = 0;
  for (let vertex = 0; vertex < trails.count; vertex += 12) {
    assert.equal(alphas[vertex], 0);
    assert.equal(alphas[vertex + 1], 0);
    assert.equal(alphas[vertex + 8], 0);
    assert.equal(alphas[vertex + 11], 0);
    assert.ok(alphas[vertex + 5] >= previous);
    previous = alphas[vertex + 5];
  }
  assert.ok(previous > 0.49);
  trails.dispose();
});

test('暂停重绘稳定，清空不留残影，扩容释放旧几何且不积累节点', async () => {
  const [THREE, { BladeTrails }] = await modules;
  const scene = new THREE.Scene();
  const trails = new BladeTrails(scene);
  trails.render(sample(1, 3));
  const geometry = trails.geometry;
  let oldDisposals = 0;
  geometry.addEventListener('dispose', () => oldDisposals++);
  const input = sample(8);
  trails.render(input);
  assert.equal(oldDisposals, 1);
  const before = values(trails, 'position');
  const colors = values(trails, 'color');
  for (let frame = 0; frame < 120; frame++) trails.render(input);
  assert.deepEqual(values(trails, 'position'), before);
  assert.deepEqual(values(trails, 'color'), colors);
  assert.equal(scene.children.length, 1);
  assert.ok(trails.count <= trails.capacity);
  trails.render({ segments: [], blades: [], center: fixture.center });
  assert.equal(trails.mesh.visible, false);
  assert.equal(trails.geometry.drawRange.count, 0);
  let finalDisposals = 0;
  trails.geometry.addEventListener('dispose', () => finalDisposals++);
  trails.material.addEventListener('dispose', () => finalDisposals++);
  trails.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(finalDisposals, 2);
});
