# Kindle / E-ink browser compatibility

OpenInk follows [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) for the legacy build (Kindle, Kobo, and other e-ink browsers). The legacy bundle is loaded when the user is redirected to `legacy.html` (see [DEVELOPMENT.md](DEVELOPMENT.md)).

## Legacy loader (legacy.html)

- **Blocking script order:** The polyfill script loads first (blocking), then an inline script runs `System.import(entry)` so the app runs only after SystemJS is available.
- **Mounted flag:** After the app renders, it sets `window.__openinkMounted = true` so the loader knows the app started.
- **Static fallback:** If the app does not mount within 12 seconds, the loader replaces the "Loading…" content with a static HTML message (OpenInk title, app list, "use a phone or computer") so the user is never stuck in a loading loop.
- **Startup timeout:** In the app, `settings.load()` is raced with a 5s timeout so slow or hanging localStorage (e.g. on Kindle) does not block the first render.

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
