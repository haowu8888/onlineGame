const UNIT = 24;
const COLLISION_EPSILON = 1e-7;

export const SCENERY = Object.freeze([
  { kind: 'maple', x: -12.8, z: -8.6, scale: 1.05, radius: 0.34 },
  { kind: 'maple', x: 12.6, z: -8.5, scale: 1.2, radius: 0.38 },
  { kind: 'maple', x: 16.4, z: 7.8, scale: 0.95, radius: 0.32 },
  { kind: 'pine', x: -17.5, z: 4.5, scale: 1.15, radius: 0.34 },
  { kind: 'pine', x: -10.8, z: -17.5, scale: 1.1, radius: 0.34 },
  { kind: 'pine', x: 8.4, z: -18.5, scale: 1.35, radius: 0.4 },
  { kind: 'pine', x: 18.4, z: -3.5, scale: 1.15, radius: 0.34 },
  { kind: 'maple', x: -8.5, z: 16, scale: 0.85, radius: 0.32 },
  { kind: 'rock', x: -12.7, z: 5.4, scale: 0.8, radius: 0.64 },
  { kind: 'rock', x: 10.8, z: 10.5, scale: 1.0, radius: 0.8 },
  { kind: 'rock', x: -9.2, z: -12.5, scale: 1.0, radius: 0.8 },
  { kind: 'rock', x: 15.1, z: -8, scale: 0.65, radius: 0.52 },
  { kind: 'lantern', x: -8.6, z: -8.6, scale: 1, radius: 0.5 },
  { kind: 'lantern', x: 8.6, z: -8.6, scale: 1, radius: 0.5 },
  { kind: 'lantern', x: -8.6, z: 8.6, scale: 1, radius: 0.5 },
  { kind: 'lantern', x: 8.6, z: 8.6, scale: 1, radius: 0.5 },
  { kind: 'pillar', x: -3.2, z: -14, scale: 1, radius: 0.35 },
  { kind: 'pillar', x: 3.2, z: -14, scale: 1, radius: 0.35 },
].map(item => Object.freeze(item)));

export function sceneryObstacles(origin) {
  return SCENERY.map(item => Object.freeze({
    x: origin.x + item.x * UNIT, y: origin.y + item.z * UNIT, radius: item.radius * UNIT,
  }));
}

export function resolveObstacles(entity, obstacles) {
  const point = { x: entity.x, y: entity.y };
  if (outsideObstacles(point, entity.radius, obstacles)) return point;
  const circles = obstacles.map(obstacle => ({ ...obstacle, radius: obstacle.radius + entity.radius }));
  const candidates = circles.map(circle => closestBoundary(point, circle));
  for (let index = 0; index < circles.length; index++) {
    for (let other = index + 1; other < circles.length; other++) {
      candidates.push(...circleIntersections(circles[index], circles[other]));
    }
  }
  const available = candidates.filter(candidate => outsideObstacles(candidate, 0, circles));
  if (!available.length) throw new Error('障碍几何无法生成有效落点');
  return available.reduce((nearest, candidate) =>
    distanceSquared(candidate, point) < distanceSquared(nearest, point) ? candidate : nearest);
}

function outsideObstacles(point, radius, obstacles) {
  return obstacles.every(obstacle => Math.hypot(point.x - obstacle.x, point.y - obstacle.y)
    >= radius + obstacle.radius - COLLISION_EPSILON);
}

function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function closestBoundary(point, circle) {
  const dx = point.x - circle.x, dy = point.y - circle.y;
  const distance = Math.hypot(dx, dy);
  return { x: circle.x + (distance ? dx / distance : 1) * circle.radius,
    y: circle.y + (distance ? dy / distance : 0) * circle.radius };
}

function circleIntersections(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  if (!distance || distance > a.radius + b.radius || distance < Math.abs(a.radius - b.radius)) return [];
  const along = (a.radius ** 2 - b.radius ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, a.radius ** 2 - along ** 2));
  const x = a.x + dx / distance * along, y = a.y + dy / distance * along;
  return [{ x: x - dy / distance * height, y: y + dx / distance * height },
    { x: x + dy / distance * height, y: y - dx / distance * height }];
}

// 连续位移先抵达接触点，再保留可行的切向分量，击退不会穿心后弹到另一侧。
export function resolveMovement(entity, previous, obstacles) {
  let point = resolveObstacles({ ...previous, radius: entity.radius }, obstacles);
  let movement = { x: entity.x - previous.x, y: entity.y - previous.y };
  let remaining = obstacles;
  const normals = [];
  while (remaining.length) {
    const contact = firstContact({ point, movement, radius: entity.radius, obstacles: remaining });
    if (!contact) break;
    point = { x: point.x + movement.x * contact.time, y: point.y + movement.y * contact.time };
    normals.push(contact.normal);
    movement = allowedMovement({ x: movement.x * (1 - contact.time), y: movement.y * (1 - contact.time) }, normals);
    // 已接触圆的外侧切平面始终保留；每个障碍最多处理一次，无重试次数限制。
    remaining = remaining.filter(obstacle => obstacle !== contact.obstacle);
  }
  return { x: point.x + movement.x, y: point.y + movement.y };
}

function firstContact(options) {
  if (options.movement.x === 0 && options.movement.y === 0) return null;
  let first = null;
  for (const obstacle of options.obstacles) {
    const contact = obstacleContact(options, obstacle);
    if (contact && (!first || contact.time < first.time)) first = contact;
  }
  return first;
}

function obstacleContact({ point, movement, radius }, obstacle) {
  const dx = point.x - obstacle.x, dy = point.y - obstacle.y;
  const approach = dx * movement.x + dy * movement.y;
  if (approach >= -COLLISION_EPSILON) return null;
  const lengthSquared = movement.x ** 2 + movement.y ** 2;
  const gap = dx ** 2 + dy ** 2 - (radius + obstacle.radius) ** 2;
  const discriminant = approach ** 2 - lengthSquared * gap;
  if (discriminant < 0) return null;
  const time = Math.max(0, (-approach - Math.sqrt(discriminant)) / lengthSquared);
  if (time > 1) return null;
  const nx = dx + movement.x * time, ny = dy + movement.y * time;
  const length = Math.hypot(nx, ny);
  return { obstacle, time, normal: { x: nx / length, y: ny / length } };
}

function allowedMovement(movement, normals) {
  const allowed = candidate => normals.every(normal =>
    candidate.x * normal.x + candidate.y * normal.y >= -COLLISION_EPSILON);
  if (allowed(movement)) return movement;
  let nearest = { x: 0, y: 0 };
  for (const normal of normals) {
    const component = movement.x * normal.x + movement.y * normal.y;
    const candidate = { x: movement.x - normal.x * component, y: movement.y - normal.y * component };
    if (allowed(candidate) && distanceSquared(candidate, movement) < distanceSquared(nearest, movement)) nearest = candidate;
  }
  return nearest;
}
