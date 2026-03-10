# Kindle / E-ink browser compatibility

OpenInk follows [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) for the legacy build (Kindle, Kobo, and other e-ink browsers). The main site redirects Kindle/no-ESM to **legacy.html** (see [DEVELOPMENT.md](DEVELOPMENT.md)).

## Radical split: legacy.html = simple only (no full app)

- **legacy.html** is the default legacy page. It **does not load the full app**. Zero external scripts: only inline HTML, inline CSS, and one inline `onclick` (calculator). **Guaranteed to render on Kindle.** Contains: ReKindle-style frame (gray body, white box), title "OpenInk", small calculator (Add), link to "Try full app (legacy-full.html)", link to "Static page (legacy-static.html)".
- **legacy-full.html** is where the full app is attempted: async load of `openink-legacy-single.js`, 8s fallback, "Back to simple version" (legacy.html). Use this URL only if you want to try the full app on a device that might support it; if it fails, open legacy.html again.
- **legacy-minimal.html** is identical to legacy.html (for existing bookmarks).
- **legacy-static.html** has no JavaScript; use to confirm the server is serving files.
- **Redirect:** The main index redirects to `legacy.html`, so Kindle users always land on the simple page that works. They can then tap "Try full app" to open legacy-full.html.

## If the Kindle shows a blank screen or legacy-static forwards to legacy

1. **You opened legacy-static.html but were sent to legacy.html:** That means your host is serving `index.html` for every URL (SPA fallback). The app now skips redirecting when the URL is already `legacy.html` or `legacy-static.html`, so you should see a short message instead of being forwarded. To actually serve the legacy pages:
   - **Deploy the full `dist/`** so `legacy.html`, `legacy-full.html`, `legacy-static.html`, and `legacy-minimal.html` exist.
   - **Netlify:** The repo includes `public/_redirects` so all four legacy HTML files are served as files. If you add a catch-all (e.g. `/* /index.html 200`), put it *after* those two lines.
   - **Other hosts (Vercel, etc.):** Configure rewrites so `legacy.html` and `legacy-static.html` are not rewritten to `index.html`.
   - **GitHub Pages:** Deploy the whole `dist/` folder; by default each file is served, so no extra config unless you use a custom 404 that serves index.
2. **Confirm the right file is served:** Open `legacy-static.html`; you should see "OpenInk" and "This page does not use JavaScript". Open **legacy.html** for the simple version (calculator; always works). To try the full app, open **legacy-full.html**.
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
- **Mario game** – Discrete tick (200 ms), no requestAnimationFrame; Left / Right / Jump buttons with large tap targets; keyboard arrows + Space on desktop. Blocky graphics with `image-rendering: pixelated` for e-ink.

## Quick tips for Kindle users

- **Bookmark `legacy.html` directly** (e.g. `https://yoursite.com/legacy.html`) so the Kindle opens the legacy page without going through the main index and redirect. Fewer requests and less chance of the host serving the wrong file.
- **JIT-less engine:** The Kindle browser runs JavaScript 5–10× slower than a normal phone. We avoid heavy work on startup (settings load is raced with 5s; date/time use manual formatting on legacy).
- **Date/time:** On the legacy build we use manual string formatting (`@core/utils/date`) instead of `Intl` / `toLocaleString` options, which are unreliable on Kindle (ReKindle).
- **Images:** `image-rendering: pixelated` is set on legacy for crisp edges on e-ink.

## References

- [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) – Full constraints (JIT-less engine, `Intl`/date quirks, localStorage volatile, etc.).
- [ReKindle build](https://github.com/ReKindleOS/ReKindle#-building--deployment) – Lite (Chrome 44+) and Legacy (Chrome 12+) targets.
