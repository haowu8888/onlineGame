export function dist(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function angle(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

export function lineCircleIntersect(line, circle) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0 ? 0
    : Math.max(0, Math.min(1, ((circle.x - line.x1) * dx + (circle.y - line.y1) * dy) / lengthSquared));
  const x = line.x1 + projection * dx;
  const y = line.y1 + projection * dy;
  return (x - circle.x) ** 2 + (y - circle.y) ** 2 <= circle.radius ** 2;
}

export function compactAlive(entities) {
  return entities.filter(entity => entity.alive);
}
