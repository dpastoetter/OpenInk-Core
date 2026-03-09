# Kindle / E-ink browser compatibility

OpenInk follows [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) for the legacy build (Kindle, Kobo, and other e-ink browsers). The legacy bundle is loaded when the user is redirected to `legacy.html` (see [DEVELOPMENT.md](DEVELOPMENT.md)).

## Legacy loader (legacy.html)

- **Designed to never be blank:** Critical inline `<style>` in the head forces `body` and `#root` to be visible (no dependency on external CSS). The first element in the body is a canary line ("OpenInk") so something always shows. No CSP on legacy (old WebKit can mis-handle CSP and show a blank page). Main stylesheet is loaded at the end of the body so first paint does not wait for it.
- **Blocking script tags:** A blocking `<script src="polyfill.js">` then an inline script runs `System.import(entry)`. Scripts are wrapped in try/catch so a single throw does not leave the page broken.
- **Mounted flag:** After the app renders, it sets `window.__openinkMounted = true`. The 12s fallback timer is cleared when `System.import(entry)` resolves.
- **12s timeout fallback:** If the app has not mounted within 12 seconds, the loader replaces the content with a static message and a "Try again" link.
- **Startup timeout:** In the app, `settings.load()` is raced with a 5s timeout so slow or hanging localStorage (e.g. on Kindle) does not block the first render.

## If the Kindle shows a blank screen

1. **Confirm the right file is served:** Open `legacy-static.html` on the Kindle (same host, same path, e.g. `https://yoursite.com/legacy-static.html`). That page has no JavaScript. If you see "OpenInk" and "This page does not use JavaScript", the server is fine and the issue is with running the app scripts on legacy.html.
2. **Deploy the full `dist/`:** Ensure `dist/legacy.html` and `dist/legacy-static.html` are deployed. If your host rewrites all routes to `index.html` (SPA mode), add an exception so `legacy.html` and `legacy-static.html` are served as static files.
3. **Base path:** If you deploy under a subpath (e.g. `https://user.github.io/OpenInk-WebOS/`), set `base: '/OpenInk-WebOS/'` in `vite.config.ts` before building so script and style URLs in legacy.html resolve correctly.

## What we do

- **Target: Chromium 75** – Legacy build uses `@vitejs/plugin-legacy` with `targets: ['chrome 75', ...]`. Optional chaining (`?.`) and nullish coalescing (`??`) are transpiled away.
- **No flexbox `gap`** – We use margin-based fallbacks in CSS; modern browsers get `gap` via `@supports (gap: 1px)`. Grid `gap` is used where supported.
- **No animations/transitions on legacy** – `legacy.html` sets `class="legacy-browser"` on `<html>`. Our CSS disables `transition` and `animation` for `html.legacy-browser *` to avoid e-ink ghosting.
- **System fonts only** – No web fonts. On legacy we use `Arial, Verdana, "Courier New", serif, sans-serif` (ReKindle-style).
- **No Unicode emoji on legacy** – App launcher icons use `iconFallback` (ASCII/symbol) when `import.meta.env.LEGACY` is true. Weather icons use text labels (Sun, Cld, Rain, etc.) in the legacy build.
- **No `alert` / `confirm` / `prompt`** – We do not use them; use custom modals if needed.
- **No `position: sticky` / `fixed`** – We avoid them to prevent checkerboarding on e-ink.
- **Touch targets** – Minimum `--tap-min: 52px` for tap areas.

## References

- [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) – Full constraints (JIT-less engine, `Intl`/date quirks, localStorage volatile, etc.).
- [ReKindle build](https://github.com/ReKindleOS/ReKindle#-building--deployment) – Lite (Chrome 44+) and Legacy (Chrome 12+) targets.
