(function (root) {
  'use strict';
  const DEFAULT_FPS = 60;
  const MILLISECONDS_PER_SECOND = 1000;
  const TIME_TOLERANCE = 1e-7;

  function createFixedStepper({ update, fps = DEFAULT_FPS }) {
    if (!Number.isFinite(fps) || fps <= 0) throw new RangeError('fps must be a positive finite number');
    const step = MILLISECONDS_PER_SECOND / fps;
    let previousTime = null;
    let accumulated = 0;
    return Object.freeze({
      tick(timestamp) {
        if (previousTime === null) {
          previousTime = timestamp;
          return;
        }
        accumulated += timestamp - previousTime;
        previousTime = timestamp;
        while (accumulated + TIME_TOLERANCE >= step) {
          update();
          accumulated -= step;
        }
      },
      reset() {
        previousTime = null;
        accumulated = 0;
      },
    });
  }

  const api = Object.freeze({ createFixedStepper });
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.KnifeClock = api;
})(globalThis);
