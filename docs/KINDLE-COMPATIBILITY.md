# Kindle / E-ink browser compatibility

OpenInk follows [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) for the legacy build (Kindle, Kobo, and other e-ink browsers). The legacy bundle is loaded when the user is redirected to `legacy.html` (see [DEVELOPMENT.md](DEVELOPMENT.md)).

## Legacy loader (legacy.html)

- **ReKindle-aligned first paint:** Critical inline `<style>` makes the page match ReKindle from first paint: body is desktop gray (`#e5e5e5`), centered with flex, `image-rendering: pixelated`, `overflow: hidden`; `#root` is the "window" (white, 2px black border, 4px 4px 0 black shadow, max-width 600px). Fonts: Geneva, Verdana, sans-serif. No CSP on legacy (old WebKit can mis-handle it). Main stylesheet loads at the end of body so first paint does not depend on it.
- **Fallback/error via DOM:** When the app does not load or a script throws, the loader shows a message using `createElement` and `createTextNode` (no `innerHTML` for the message text) so old WebKit that mishandles `innerHTML` still shows the "Try again" text. If `appendChild` fails, it falls back to one safe `innerHTML` string.
- **Blocking script tags:** A blocking `<script src="polyfill.js">` then an inline script runs `System.import(entry)`. Scripts are wrapped in try/catch so a single throw does not leave the page broken.
- **Mounted flag:** After the app renders, it sets `window.__openinkMounted = true`. The 12s fallback timer is cleared when `System.import(entry)` resolves.
- **12s timeout fallback:** If the app has not mounted within 12 seconds, the loader replaces the content with a static message and a "Try again" link.
- **Startup timeout:** In the app, `settings.load()` is raced with a 5s timeout so slow or hanging localStorage (e.g. on Kindle) does not block the first render.

## If the Kindle shows a blank screen or legacy-static forwards to legacy

1. **You opened legacy-static.html but were sent to legacy.html:** That means your host is serving `index.html` for every URL (SPA fallback). The app now skips redirecting when the URL is already `legacy.html` or `legacy-static.html`, so you should see a short message instead of being forwarded. To actually serve the legacy pages:
   - **Deploy the full `dist/`** so `legacy.html` and `legacy-static.html` exist in the deployed output.
   - **Netlify:** The repo includes `public/_redirects` (copied to `dist/`) so `/legacy.html` and `/legacy-static.html` are served as files. If you add a catch-all (e.g. `/* /index.html 200`), put it *after* those two lines.
   - **Other hosts (Vercel, etc.):** Configure rewrites so `legacy.html` and `legacy-static.html` are not rewritten to `index.html`.
   - **GitHub Pages:** Deploy the whole `dist/` folder; by default each file is served, so no extra config unless you use a custom 404 that serves index.
2. **Confirm the right file is served:** After fixing the host, open `legacy-static.html`. You should see "OpenInk" and "This page does not use JavaScript". If you see that, the server is correct; then try `legacy.html` for the app.
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

## Quick tips for Kindle users

- **Bookmark `legacy.html` directly** (e.g. `https://yoursite.com/legacy.html`) so the Kindle opens the legacy page without going through the main index and redirect. Fewer requests and less chance of the host serving the wrong file.
- **JIT-less engine:** The Kindle browser runs JavaScript 5–10× slower than a normal phone. We avoid heavy work on startup (settings load is raced with 5s; date/time use manual formatting on legacy).
- **Date/time:** On the legacy build we use manual string formatting (`@core/utils/date`) instead of `Intl` / `toLocaleString` options, which are unreliable on Kindle (ReKindle).
- **Images:** `image-rendering: pixelated` is set on legacy for crisp edges on e-ink.

## References

- [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) – Full constraints (JIT-less engine, `Intl`/date quirks, localStorage volatile, etc.).
- [ReKindle build](https://github.com/ReKindleOS/ReKindle#-building--deployment) – Lite (Chrome 44+) and Legacy (Chrome 12+) targets.
