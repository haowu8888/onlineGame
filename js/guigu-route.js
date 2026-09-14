(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GuiguRoute = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const FEED_SPEED_PER_POINT = 0.0015;
  const MAX_FEED_SPEED = 0.15;
  const MAX_MOUNT_SPEED = 0.7;
  const MIN_TRAVEL_DAYS = 1;
  const NEARBY_MAP_SIZE = 9;
  const DIRECTIONS = Object.freeze([
    { x: -1, y: -1, label: '西北', arrow: '↖' },
    { x: 0, y: -1, label: '北', arrow: '↑' },
    { x: 1, y: -1, label: '东北', arrow: '↗' },
    { x: -1, y: 0, label: '西', arrow: '←' },
    { x: 1, y: 0, label: '东', arrow: '→' },
    { x: -1, y: 1, label: '西南', arrow: '↙' },
    { x: 0, y: 1, label: '南', arrow: '↓' },
    { x: 1, y: 1, label: '东南', arrow: '↘' },
  ].map(direction => Object.freeze(direction)));

  function isInBounds(fog, position) {
    const { x, y } = position;
    return Number.isInteger(x) && Number.isInteger(y)
      && y >= 0 && y < fog.length && x >= 0 && x < fog[y].length;
  }

  function neighbors(fog, position) {
    return DIRECTIONS.map(direction => ({ x: position.x + direction.x, y: position.y + direction.y }))
      .filter(cell => isInBounds(fog, cell) && fog[cell.y][cell.x]);
  }

  function positionKey(position) {
    return `${position.x},${position.y}`;
  }

  function reconstructPath(previous, destination) {
    const path = [];
    let cell = destination;
    while (previous.get(positionKey(cell)) !== null) {
      path.push({ ...cell });
      cell = previous.get(positionKey(cell));
    }
    return path.reverse();
  }

  function getKnownRoute(options) {
    const { fog, start, destination } = options;
    if (!isInBounds(fog, start) || !isInBounds(fog, destination)) {
      throw new RangeError('Route coordinates must be inside the map');
    }
    if (!fog[destination.y][destination.x]) return null;
    const queue = [{ ...start }];
    const previous = new Map([[positionKey(start), null]]);
    const destinationKey = positionKey(destination);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      if (positionKey(current) === destinationKey) return reconstructPath(previous, current);
      neighbors(fog, current).forEach(cell => {
        const key = positionKey(cell);
        if (previous.has(key)) return;
        previous.set(key, current);
        queue.push(cell);
      });
    }
    return null;
  }

  function getStepDays(options) {
    const { baseDays, mount, feed } = options;
    if (!mount) return baseDays;
    const extra = Math.min(MAX_FEED_SPEED, feed * FEED_SPEED_PER_POINT);
    const speed = Math.min(MAX_MOUNT_SPEED, mount.speedBonus + extra);
    return Math.max(MIN_TRAVEL_DAYS, Math.round(baseDays * (1 - speed)));
  }

  function getViewport(options) {
    const { map, position, overview } = options;
    const columns = overview ? map[0].length : Math.min(NEARBY_MAP_SIZE, map[0].length);
    const rows = overview ? map.length : Math.min(NEARBY_MAP_SIZE, map.length);
    const left = Math.max(0, Math.min(map[0].length - columns, position.x - Math.floor(columns / 2)));
    const top = Math.max(0, Math.min(map.length - rows, position.y - Math.floor(rows / 2)));
    return { left, top, columns, rows };
  }

  return { DIRECTIONS, isInBounds, getKnownRoute, getStepDays, getViewport };
});
