# E-ink refactoring guide

This doc makes the AI and developers better at refactoring for **low-spec e-ink devices** (e.g. Amazon Kindle, Kobo). Use it together with [KINDLE-COMPATIBILITY.md](KINDLE-COMPATIBILITY.md).

## Kindle-first principles (always apply)

Treat Kindle as a **low-power, e-ink, old-browser target**: optimize for **reliable reading**, not app-like behavior. When readability, compatibility, and speed conflict with visual richness or framework convenience, **choose the version that is simplest and most reliable on Kindle.**

- **Reading-first** – Optimize for reliable reading; browser support is limited and modern interactive pages often degrade badly.
- **Works without JS** – Core content, links, and forms must work in plain HTML first; script only as optional enhancement.
- **Pre-render where possible** – Pre-rendered or server-rendered HTML is more dependable than client-side rendering on constrained Kindle browsers.
- **Conservative JS** – Transpile to legacy syntax; avoid depending on newer APIs; older engines may only handle older ECMAScript reliably.
- **Remove UI complexity** – No carousels, sticky chrome, popovers, animated menus, hover-only controls, or decorative effects that add repaint cost without helping reading.
- **Single-column, text-first** – Visible links, simple section flow; avoid extra taps, rerenders, and nested navigation.
- **Basic, resilient CSS** – Simple layout, strong contrast, large tap areas, readable typography, stable spacing; avoid advanced responsive tricks or motion-heavy styling.
- **Cut page weight** – Minimize scripts, inline only critical CSS, compress images, avoid unnecessary fonts; prefer text labels over icon-only controls.
- **Explicit fallbacks** – Static tables instead of dynamic grids, numbered pagination instead of infinite scroll, clear `<noscript>` for optional features.

## Goals

- **Lightweight** – Minimal JS parse time, small DOM, no unnecessary assets on legacy.
- **Responsive** – Works on small e-ink viewports; viewport and layout scale without fixed positioning.
- **Readable** – High contrast, system fonts, no animations (avoids ghosting).
- **Fast first paint** – Don’t block on storage or network before showing UI; defer non-critical work.

## Refactoring checklist

Before landing changes that affect the legacy build or shared UI:

1. **CSS**
   - [ ] No `position: fixed` or `sticky` in legacy (or in `index-legacy.css`).
   - [ ] No new `transition`/`animation` that legacy would rely on (legacy disables them).
   - [ ] New layout: use flexbox for legacy; add margin fallbacks if using `gap`.
   - [ ] If adding fullscreen/overlay UI, keep it out of `index-legacy.css` (or omit for legacy).

2. **JS / runtime**
   - [ ] Date/time in legacy path: use `@core/utils/date` (e.g. `formatTimeLegacy`), not `Intl`/`toLocaleString` options.
   - [ ] No `alert`/`confirm`/`prompt`; use in-app modals or inline UI.
   - [ ] First paint: render with defaults first; load settings/storage in background.
   - [ ] Prefer discrete timers (e.g. 60s) over `requestAnimationFrame` for legacy updates.

3. **DOM and assets**
   - [ ] Touch targets ≥ 52px for tappable elements.
   - [ ] Legacy: prefer text or simple symbols over SVG/emoji where it reduces DOM/parse cost (e.g. status bar theme: "L"/"D").
   - [ ] Icons: legacy uses `iconLegacySvg` / `iconFallback` and `app-icons-legacy` (no Heroicons in legacy bundle).

4. **HTML / entry**
   - [ ] Legacy HTML: minimal critical CSS inline; lightweight “Loading…” placeholder (no heavy images).
   - [ ] Viewport: `width=device-width`, `viewport-fit=cover` for small/notched screens.
   - [ ] Prefer pre-rendered or server-rendered HTML where it improves reliability on Kindle; avoid client-only content for core reading.
   - [ ] Core content, links, and forms usable without JS where feasible; use `<noscript>` or static fallbacks for optional features.

## Patterns

| Goal              | Do                                                                 | Avoid (legacy)                    |
|-------------------|--------------------------------------------------------------------|-----------------------------------|
| Decision rule     | Simplest, most reliable on Kindle; reading over app-like behavior  | Visual richness over compatibility |
| Content           | Pre-render / server-render; core usable without JS                 | Client-only core; script required to read |
| Date/time         | `formatTimeLegacy(d)`, `formatDateLegacy(d)` from `@core/utils/date` | `Intl.*`, `toLocaleString` opts  |
| Layout            | Single-column, text-first; flexbox, margin between siblings        | CSS Grid, `gap` without fallback, nested nav |
| Overlays          | In-flow panels / modals                                            | `position: fixed`, sticky, popovers |
| Theme toggle      | Text "L"/"D" or simple char                                        | SVG/emoji in status bar           |
| First load        | Render shell with defaults → then `settings.load()`                 | Await storage before first render |
| Icons (legacy)    | `iconLegacySvg`, `iconFallback`, text labels                        | Heroicons, icon-only controls     |
| Lists/nav         | Static tables, numbered pagination, visible links                  | Dynamic grids, infinite scroll    |

## Where legacy is defined

- **Entry:** `src/legacy-entry.ts` → `index-legacy.css` + `main`.
- **Build:** `vite.legacy-single.config.ts` → single IIFE, Babel (Chrome 44).
- **HTML:** `public/legacy.html` + `scripts/generate-legacy-html.mjs` → `dist/legacy.html`.
- **Conditionals:** `import.meta.env.LEGACY` and `html.legacy-browser` in CSS.

When in doubt, see [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md) and keep legacy minimal and predictable.
