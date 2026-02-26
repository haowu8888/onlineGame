# Repository Guidelines

## Project Structure

- `index.html`: Portal/home page.
- `games/`: Individual game entry pages (e.g. `games/cultivation.html`).
- `js/`: Game logic and shared utilities (`js/shared.js`, `js/portal.js`, `js/*.js` per game).
- `css/`: Shared + per-game styles (`css/shared.css`, `css/*.css`).
- `icons/`: PWA icons (`icon-192.png`, `icon-512.png`, `maskable-*.png`).
- `manifest.json`, `sw.js`, `offline.html`: PWA manifest, service worker, and offline fallback page.
- `serve.ts`: Deno static server for local/dev and simple deployments.

## Development Commands (Deno)

- Run locally: `deno run --allow-net --allow-read serve.ts`
  - Serves the project root; `/` maps to `index.html`.
- Hard-refresh SW during dev (browser): DevTools → Application → Service Workers → “Unregister”, then reload.

## Coding Style & Naming

- Indentation: 2 spaces in HTML/CSS/JS.
- JavaScript: keep it dependency-free, browser-native APIs only; prefer `textContent` over `innerHTML`.
  - If `innerHTML` is necessary, **escape user-controlled fields** with `escapeHtml()` from `js/shared.js`.
- File naming: keep existing patterns (`cardbattle.js`, `cardbattle.css`, matching `games/cardbattle.html`).

## PWA / Service Worker Rules

- When changing `sw.js`, bump `CACHE_VERSION` and update `STATIC_ASSETS` if you add/remove top-level files.
- Keep `offline.html` lightweight and same-origin (so it can be reliably cached).
- External assets: only whitelisted CDN resources should be cached.

## Testing / Verification (Manual)

No automated test suite currently.

Before merging, verify:
- Portal loads and navigates to all `games/*.html`.
- Basic gameplay loads for each game (no console errors).
- Offline behavior: after one online visit, reload with network disabled (portal and cached pages should work; otherwise `offline.html` appears).

## Commit & PR Guidelines

- Commits are short and direct (examples in history: `修复`, `优化`, `新增游戏 + 玩法优化`).
- PRs should include: a brief summary, what pages/features changed, and screenshots/GIFs for UI changes.
*** End Patch>>>{"timeout_ms":100000} انته patch tool input is wrong - apply_patch is FREEFORM not JSON. Need correct.
