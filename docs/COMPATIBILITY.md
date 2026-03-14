# Kindle / E-ink browser compatibility

OpenInk follows [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) for the build (Kindle, Kobo, and other e-ink browsers). There is a single app page: **index.html** loads the full app via `openink-legacy-single.js`.

## index.html = the app

- **index.html** is the only entry. It loads the full app (widgets, home screen, all apps) via `assets/openink-legacy-single.js`. ReKindle-style frame (gray body, white box). If the app does not start within ~22 seconds, a fallback message with "Try again" is shown.

## If the Kindle shows a blank screen

1. **Server is serving the wrong file:** Deploy the full `dist/` so `index.html` and `dist/assets/openink-legacy-single.js` (and `.css`) exist. Ensure your host serves `index.html` at `/` and does not rewrite routes in a way that breaks asset paths.
2. **Base path:** If you deploy under a subpath (e.g. `https://user.github.io/OpenInk-WebOS/`), set `base: '/OpenInk-WebOS/'` in `vite.legacy-single.config.ts` (and in the generate script if you customise it) so script and style URLs resolve correctly.

## What we do

- **Single legacy bundle** – IIFE `openink-legacy-single.js` built with Babel (Chrome 44 target). Optional chaining and nullish coalescing are transpiled.
- **No flexbox `gap`** – We use margin-based fallbacks in CSS; modern browsers get `gap` via `@supports (gap: 1px)`.
- **No CSS Grid on legacy** – The app launcher grid uses flexbox (fixed-width tiles, 6rem) so tiles don't span the full screen.
- **Higher contrast (normal theme)** – For e-ink readability, the normal theme uses stronger contrast: near-black text and dark borders in light mode, bright text and clearer borders in dark mode.
- **No animations/transitions** – `index.html` sets `class="legacy-browser"` on `<html>`. Our CSS disables `transition` and `animation` for `html.legacy-browser *` to avoid e-ink ghosting.
- **System fonts only** – No web fonts. We use `Arial, Verdana, "Courier New", serif, sans-serif` (ReKindle-style).
- **No Unicode emoji on legacy** – App launcher icons use inline SVG (`iconLegacySvg`) when available; otherwise `iconFallback` (ASCII/symbol). Weather icons use text labels (Sun, Cld, Rain, etc.).
- **No `alert` / `confirm` / `prompt`** – We do not use them; use custom modals if needed.
- **No `position: sticky` / `fixed`** – We avoid them to prevent checkerboarding on e-ink.
- **Touch targets** – Minimum `--tap-min: 52px` for tap areas.
- **Chess vs computer** – Stockfish (WASM) is attempted when Workers and WebAssembly are available; the worker is kept alive across games (no re-init). On Kindle/legacy the built-in fallback engine is used so vs computer still works.

## Quick tips for Kindle users

- **Bookmark the main URL** (e.g. `https://yoursite.com/`) so the Kindle opens the app with one request.
- **JIT-less engine:** The Kindle browser runs JavaScript 5–10× slower than a normal phone (ReKindle: V8 Ignition interpreter only). We avoid blocking the main thread before first paint: the shell renders immediately with no theme DOM work; theme and storage load run after first paint (e.g. `requestAnimationFrame` then deferred settings load).
- **Date/time:** We use manual string formatting (`@core/utils/date`) instead of `Intl` / `toLocaleString` options, which are unreliable on Kindle (ReKindle).
- **Images:** `image-rendering: pixelated` is set for crisp edges on e-ink.

## Performance (ReKindle-aligned)

- **First paint first:** No `theme.applySettings()` or storage read before the first frame; theme is applied in the next animation frame so the shell can paint immediately.
- **No heavy work on load:** Avoid large data parsing or heavy computation in the initial script; app code is lazy-loaded when the user opens an app.
- **CSS:** Main stylesheet is loaded with `media="print"` and switched to `all` in `onload` so it does not block parsing or first paint.

## References

- [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) – Full constraints (JIT-less engine, `Intl`/date quirks, localStorage volatile, etc.).
- [ReKindle build](https://github.com/ReKindleOS/ReKindle#-building--deployment) – Lite (Chrome 44+) and Legacy (Chrome 12+) targets.
