# Repository Guidelines

## Project Structure

- `index.html`: Portal/home page.
- `games/`: Individual game entry pages (e.g. `games/cultivation.html`).
- `js/`: Game logic and shared utilities (`js/shared.js`, `js/portal.js`, `js/*.js` per game).
  - `js/cultivation-recovery.js`, `js/cardcollect-progression.js`: pure-logic modules extracted from games. They use a UMD wrapper (attach to `window` in the browser, `module.exports` under Node) so they can be unit-tested. Follow this pattern when extracting more logic.
  - `js/game-scene-*.js`: read-only game view models and adapters to existing gameplay actions. `js/game-three-*.js`: shared Three.js rendering, picking, camera controls, and resource lifecycle for the six non-knife games. Register the game source in its entry point; do not duplicate gameplay rules in the renderer. Scenery is layered: the backdrop (landscape, garden, tower yard) is rebuilt only when the scene kind or theme changes; the layout (tiles, routes, markers) is rebuilt as progress changes. Both layers share the runtime's geometry and material cache and own only their merged geometries and label textures.
  - `js/canvas-shapes.js`: Canvas 2D helpers (rounded rectangles with a fallback for browsers without `roundRect`) shared by both label renderers.
- `css/`: Shared + per-game styles (`css/shared.css`, `css/*.css`).
- `icons/`: PWA icons (`icon-192.png`, `icon-512.png`, `maskable-*.png`).
- `manifest.json`, `sw.js`, `sw-assets.js`, `sw-runtime.js`, `offline.html`: PWA manifest, service worker lifecycle, precache manifest, fetch strategies, and offline fallback page.
- `serve.ts` / `main.ts`: Deno static server for local/dev and Deno Deploy.
- `tests/`: Node unit tests (`*.test.js`, zero dependencies, `node:assert`). `tests/run.js` runs them all.
- `scripts/check-sw-assets.js`: verifies `sw-assets.js` `PWA_ASSETS.core` covers page resources and their recursive module dependencies, including versioned URLs.
- `docs/superpowers/`: design spec and phased implementation plans.

## Development Commands

- Run locally: `deno run --allow-net --allow-read serve.ts` (or `npm run serve`)
  - Serves the project root; `/` maps to `index.html`.
- Run tests: `npm test` (= unit tests + SW precache check). No `npm install` needed.
- Hard-refresh SW during dev (browser): DevTools → Application → Service Workers → “Unregister”, then reload.

## Coding Style & Naming

- Indentation: 2 spaces in HTML/CSS/JS.
- JavaScript: prefer browser-native APIs and `textContent` over `innerHTML`.
  - User-authorized exception: all seven games use locally bundled Three.js 0.186.0 (`js/vendor/three.module.js`, MIT license in `js/vendor/LICENSE.three`). Keep this version pinned; do not introduce a CDN runtime dependency.
  - Knife game and renderer modules use native ES modules. Shared utilities retain browser-global/UMD compatibility. Compose dependencies in entry points and keep individual modules focused.
  - If `innerHTML` is necessary, **escape user-controlled fields** with `escapeHtml()` from `js/shared.js`.
- File naming: keep existing patterns (`cardbattle.js`, `cardbattle.css`, matching `games/cardbattle.html`).

## PWA / Service Worker Rules

- When changing worker behavior or deployed assets, bump `CACHE_VERSION` and update `PWA_ASSETS.core` in `sw-assets.js`.
- Every local resource URL referenced by a page or its module imports **must** be precached; `node scripts/check-sw-assets.js` verifies the full dependency graph. Preserve query strings in cache keys.
- Same-origin non-HTML requests carrying a `?v=` query are served straight from the static precache when present (no background revalidation); anything else keeps the stale-while-revalidate path. This is why every deployed asset change needs a version bump, never an in-place overwrite.
- Explicitly precache SVG resources referenced by runtime-generated markup (character portraits, terrain and card sigils); the dependency checker cannot infer arbitrary JavaScript string construction. Verify these assets in an actual offline game session.
- Versioned page JS/CSS URLs and every transitive game ES-module import use `?v=38` to prevent an existing v37 worker from mixing new HTML with stale scripts. Keep these versions and matching precache entries synchronized.
- Worker installation must fail atomically when a required local resource cannot be cached. Activate updates through the visible user update action; do not force-refresh active games.
- Keep `offline.html` lightweight and same-origin (so it can be reliably cached). The SW injects a `<base>` tag when serving it for nested paths, so keep its links relative to the site root.
- External assets: only whitelisted CDN resources should be cached.

## Testing / Verification

- Automated: `npm test` runs `tests/*.test.js` and the SW precache check. Add a `tests/<module>.test.js` whenever you extract pure logic into a UMD module.
- Manual (before merging):
  - Portal loads and navigates to all `games/*.html`.
  - Basic gameplay loads for each game (no console errors).
  - Offline behavior: after one online visit, reload with network disabled (portal and cached pages should work; otherwise `offline.html` appears).

## Commit & PR Guidelines

- Commits are short and direct (examples in history: `修复`, `优化`, `新增游戏 + 玩法优化`).
- PRs should include: a brief summary, what pages/features changed, and screenshots/GIFs for UI changes.
