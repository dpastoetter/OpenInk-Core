# webOS-style E-ink Shell

A minimal, plugin-based “webOS-style” environment for low-spec e-ink devices. It provides a home screen, launcher, and a set of built-in apps that run inside a shared shell.

### Light and dark mode

| Light mode | Dark mode |
|------------|-----------|
| ![OpenInk home screen — light mode](docs/screenshots/light-mode.png) | ![OpenInk home screen — dark mode](docs/screenshots/dark-mode.png) |

Toggle appearance from the status bar (light bulb icon). The same Apps and Games launcher is available in both themes.

## Tech stack

- **TypeScript** (strict, no implicit any)
- **Preact** (lightweight React alternative)
- **Vite** (build and dev server)
- **Plain CSS** (no Tailwind or CSS-in-JS)

## Running the project

```bash
npm install
npm run dev
```

Then open the URL shown (e.g. `http://localhost:5173`) in a browser.

**Build for production:**

```bash
npm run build
npm run preview   # optional: preview the built app
```

**Tests:**

```bash
npm test
```

## Adding a new app / plugin

1. Create a folder under `src/apps/<app-id>/` and implement the `WebOSApp` interface (see `src/apps/notes/` or `src/apps/dictionary/`).
2. Register the app in `src/apps/registry.ts` with `AppRegistry.registerApp(yourApp)`.

Full steps and how to use shared services and respect global settings are in **[docs/plugins.md](docs/plugins.md)**.

## Built-in apps (v1)

- **Settings** – Pixel optics, font size, theme, appearance.
- **Calculator** – Basic arithmetic; offline.
- **Games** – Chess (local 2p or vs computer), Sudoku, Minesweeper, Racing (discrete-tick, e-ink friendly).
- **News** – RSS reader with multiple sources, CORS proxy, source labels, date-sorted mix.
- **Reddit** – Read-only subreddit and post list with paginated comments.
- **Weather**, **Timer**, **Dictionary**, **Finance** – Widgets and utilities.

## Performance & e-ink (low-spec first)

The site is tuned for **slow hardware, grayscale e-ink, and low refresh rates**:

- **No animation loops** – No `requestAnimationFrame`; updates are discrete (StatusBar 60s, Timer 1s, Racing 500ms).
- **Reduced motion** – When `prefers-reduced-motion: reduce`, all transitions and decorative shadows are disabled to cut repaints.
- **Containment** – Shell, app content, and home sections use `contain: layout style` to limit reflow/repaint scope.
- **Light JS** – Memoized app lists and paginated slices; event delegation on the home grid; minimal work per render.
- **Readability** – Large tap targets (`--tap-min`), high-contrast theme option, grayscale-first palette.

## Known limitations (e-ink and low-spec)

- **Refresh rate** – UI avoids rapid updates and heavy animations; transitions are minimal or instant.
- **Grayscale** – Default theme is monochrome; color mode adds subtle accents only.
- **Touch** – Large tap targets; no drag gestures; pagination instead of infinite scroll where applicable.
- **Performance** – No animation libraries; DOM kept simple; apps should avoid continuous timers and heavy re-renders.
- **Browser app** – Reader mode uses heuristic extraction; CORS may block some sites; no iframe sandbox in this version.
- **Reddit/News** – Require network; rate limits and CORS apply; offline fallback is limited to cached data.

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** – High-level design: shell, plugin system, services, and data flow.
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** – Development workflow, project structure, adding services, testing, and deploy.
- **[docs/plugins.md](docs/plugins.md)** – How to build and register app plugins, use context and services, and optional shell integration (getTitle, canGoBack, goBack).

## Project structure

- `src/core/kernel/` – Shell, home screen, app lifecycle.
- `src/core/plugins/` – Plugin registry.
- `src/core/services/` – Storage, network, theme, settings.
- `src/core/ui/` – Core UI (StatusBar, PageNav, Button, List).
- `src/core/utils/` – Shared helpers (e.g. stripHtml).
- `src/apps/` – App plugins (e.g. settings, finance, games, news, reddit, notes, dictionary).
- `src/types/` – Shared types and plugin API.
