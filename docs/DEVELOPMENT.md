# Development Guide

This document covers how to run, build, test, and work with the codebase day to day.

## Prerequisites

- **Node.js** (LTS, e.g. 18 or 20)
- **npm** (comes with Node)

## Commands

| Command | Description |
|--------|--------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server (e.g. http://localhost:5173). Listens on all interfaces so you can use your machine’s LAN IP (e.g. http://192.168.1.x:5173) from other devices. |
| `npm run build` | TypeScript compile + Vite production build → `dist/` |
| `npm run preview` | Serve the `dist/` build locally to test production |
| `npm run lint` | Run ESLint on `src/` (TypeScript + jsx-a11y) |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run screenshot` | After `npm run build`, starts preview and captures home screen (light/dark), Reddit widget, and Chess in-game to `docs/screenshots/`. Requires Playwright (`npx playwright install chromium`; use `PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright` if needed). |

## Project structure

```
src/
├── main.tsx                 # Entry: create services, register apps, render Shell
├── index.css                 # Global styles and design tokens
├── types/                    # Shared TypeScript types
│   ├── plugin.ts             # WebOSApp, AppContext, AppInstance
│   ├── settings.ts           # GlobalSettings, defaults
│   └── services.ts           # Service interfaces (storage, network, theme, settings)
├── core/
│   ├── kernel/               # Shell and home screen
│   │   ├── shell.tsx         # App container, header, history
│   │   └── HomeScreen.tsx    # App grid and launch
│   ├── plugins/
│   │   └── registry.ts       # App registry (register / getApp / getAllApps)
│   ├── icons/
│   │   ├── app-icons.tsx     # Lucide icons (aliased to app-icons-legacy in build)
│   │   ├── app-icons-legacy.ts  # No Lucide; uses legacy-svg / fallback only
│   │   └── legacy-svg.ts     # Inline SVG icons for legacy/Kindle launcher
│   ├── services/             # Service implementations
│   │   ├── storage.ts
│   │   ├── network.ts
│   │   ├── theme.ts
│   │   └── settings.ts
│   ├── ui/                   # Shared UI components
│   │   ├── StatusBar.tsx
│   │   ├── PageNav.tsx
│   │   ├── Button.tsx
│   │   └── List.tsx
│   └── utils/
│       ├── html.ts           # stripHtml
│       ├── url.ts            # isSafeUrl, sanitizeUrl
│       ├── safe-svg.ts       # isSafeLegacySvg (app tile icons)
│       ├── date.ts           # formatTimeLegacy, etc.
│       └── fallback-ui.ts    # setRootFallback (no innerHTML)
└── apps/                     # App plugins
    ├── registry.ts           # registerAllApps(), LAZY_APPS
    ├── settings/
    ├── finance/
    ├── games/                # Chess (Stockfish + fallback), Snake, Sudoku, Minesweeper; GameBoardResize for board zoom
    ├── news/
    ├── reddit/
    ├── dictionary/
    ├── todo/
    ├── recipes/
    ├── pictureframe/
    └── …

public/
└── …

scripts/
└── generate-legacy-html.mjs   # Post-build: generates dist/index.html (single-page app)

docs/                         # Documentation
├── ARCHITECTURE.md           # High-level design (this repo)
├── DEVELOPMENT.md            # This file
├── COMPATIBILITY.md   # Kindle/e-ink constraints and legacy behaviour
├── plugins.md                # How to add and implement apps
├── SECURITY.md               # Security and deployment checklist
└── screenshots/              # legacy-home-light.png, legacy-home-dark.png, reddit-widget.png, chess-widget.png
```

## Adding a new app

1. Create `src/apps/<app-id>/index.tsx` and implement `WebOSApp` (see [docs/plugins.md](plugins.md)).
2. In `src/apps/registry.ts`, add a descriptor and lazy loader to the `LAZY_APPS` array (e.g. `load: () => import('./your-app').then(m => m.yourApp)`).
3. The app will appear on the home screen; no further wiring is needed.

## Adding a new service

1. Define the interface in `src/types/services.ts` if other code needs to depend on it.
2. Implement the service in `src/core/services/<name>.ts` and export a factory (e.g. `createXxxService()`).
3. In `main.tsx`, create the service and add it to the object passed to `<Shell services={...} />`.
4. Extend `AppContext` in `src/types/plugin.ts` so that `context.services` includes the new service.

## Code style and conventions

- **TypeScript**: Strict mode; avoid `any`. Use types from `@types/plugin` and `@types/services` for app and service code.
- **Preact**: Functional components and hooks. JSX is transformed by the Preact preset; you don’t need to import `h`.
- **Imports**: Prefer `@core/...` for core code (see `vite.config.ts` aliases). Apps use relative imports for types (`../../types/plugin`) and `@core` for UI/utils.
- **CSS**: Global styles in `index.css`; use semantic class names (e.g. `.app-header`, `.list`, `.btn`) and CSS variables (e.g. `var(--space)`, `var(--fg)`). No CSS modules or Tailwind in this project.
- **Naming**: `camelCase` for functions/variables; `PascalCase` for components and types. Files: `kebab-case` or component name (e.g. `HomeScreen.tsx`).

## Testing

- **Vitest** is used for unit tests; config in `vite.config.ts` (test section).
- Tests live next to source (e.g. `registry.test.ts` next to `registry.ts`) or in a `*.test.ts` / `*.test.tsx` file.
- Run `npm test` before committing if you changed core or app logic.

## Build and deploy

- `npm run build` produces `dist/` (static assets). Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages, etc.). To preview the build on your LAN, run `npm run preview -- --host`.
- If the app is served from a subpath (e.g. `/browserOS/`), set `base: '/browserOS/'` in `vite.config.ts` and rebuild.
- The app uses the History API; the server must serve `index.html` for all routes (SPA fallback).
- **Kindle / e-ink:** The app is a single page. `npm run build` produces `dist/index.html` and `dist/assets/openink-legacy-single.js` (and CSS). The bundle is built with Babel (Chrome 44 target). If the app does not mount within ~22 seconds, a fallback with "Try again" is shown. Deploy the full `dist/`. See [COMPATIBILITY.md](COMPATIBILITY.md) and [ReKindle COMPATIBILITY.md](https://github.com/ReKindleOS/ReKindle/blob/main/COMPATIBILITY.md).

## Documentation

- **ARCHITECTURE.md** – How the shell, plugins, and services fit together.
- **COMPATIBILITY.md** – Kindle/e-ink constraints (ReKindle-style): legacy loader, static fallback, no flex gap, no emoji, no animations on legacy, system fonts, etc.
- **plugins.md** – Step-by-step app plugin implementation and use of context/services.
- **SECURITY.md** – Security measures and deployment checklist for public sites.
- **README.md** – Quick start, commands, and links to the docs above.
- **CONTRIBUTING.md** – How to run, test, and contribute.

## Current tooling

- **ESLint** – `eslint.config.js` with TypeScript and jsx-a11y; run with `npm run lint`.
- **PWA** – [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) generates a service worker (Workbox) for offline caching; registration in `main.tsx` (production only). Manifest: [public/manifest.json](public/manifest.json).
- **Build** – The only production build is the legacy bundle: `npm run build` runs `vite build --config vite.legacy-single.config.ts`, producing `dist/assets/openink-legacy-single.js` (and CSS). Then `scripts/generate-legacy-html.mjs` writes `dist/index.html`, which loads that bundle. Target is Chrome 44 (Babel). Dev server (`npm run dev`) uses the default Vite config; production deploy uses the legacy single bundle only.

## Performance (legacy / Kindle)

The legacy bundle and runtime are tuned for low-spec e-ink devices:

- **Fast first paint** – The app renders immediately with default theme/settings; stored settings are loaded in the background and applied when ready (no blocking on `localStorage` before first frame).
- **Smaller legacy bundle** – Lucide is not included in the legacy build. The legacy launcher uses `app-icons-legacy.ts` (aliased in `vite.legacy-single.config.ts`), so tiles use inline SVG from `legacy-svg.ts` or fallback text only; this keeps the IIFE bundle smaller and parse/execution faster.
- **Stable Shell callbacks** – `launchApp`, `closeApp`, and `goToHome` are stabilized with a ref to the current app instance, so child components (e.g. HomeScreen) receive stable props and avoid unnecessary re-renders when switching apps.
- **Clock and theme** – On legacy, the status bar clock uses a simple formatter and updates every 60 seconds to limit reflows; theme is applied via `setAttribute` on the document so high-contrast works without extra layout.
- **CSS** – Legacy uses `html.legacy-browser` scoping: no transitions/animations, system fonts, grayscale, and flex-based app grid (no CSS Grid). See `index.css` and [COMPATIBILITY.md](COMPATIBILITY.md).

## Possible improvements

Ideas for future work (not required for current scope):

- **Testing** – More unit tests for apps; consider a small E2E pass for the shell (e.g. Playwright) if the app grows.
- **Accessibility** – jsx-a11y is enabled; a pass with axe or similar could catch gaps (focus order, landmarks, reduced-motion coverage).
- **i18n** – All UI strings are currently English; if the project targets multiple locales, introduce a small i18n layer and extract strings.
- **Dependency updates** – Run `npm audit` and upgrade dependencies (especially Vite and dev tools) periodically; see [docs/SECURITY.md](SECURITY.md).
