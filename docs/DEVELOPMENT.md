# Development Guide

This document covers how to run, build, test, and work with the codebase day to day.

## Prerequisites

- **Node.js** (LTS, e.g. 18 or 20)
- **npm** (comes with Node)

## Commands

| Command | Description |
|--------|--------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server (e.g. http://localhost:5173) |
| `npm run build` | TypeScript compile + Vite production build → `dist/` |
| `npm run preview` | Serve the `dist/` build locally to test production |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |

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
│       └── html.ts           # stripHtml and other helpers
└── apps/                     # App plugins
    ├── registry.ts           # registerAllApps(), APPS list
    ├── settings/
    ├── finance/
    ├── games/
    ├── news/
    ├── reddit/
    ├── notes/
    ├── dictionary/
    └── …

docs/                         # Documentation
├── ARCHITECTURE.md           # High-level design (this repo)
├── DEVELOPMENT.md            # This file
└── plugins.md               # How to add and implement apps
```

## Adding a new app

1. Create `src/apps/<app-id>/index.tsx` and implement `WebOSApp` (see [docs/plugins.md](plugins.md)).
2. In `src/apps/registry.ts`, import the app and add it to the `APPS` array.
3. The app will appear on the home screen; no further wiring is needed.

## Adding a new service

1. Define the interface in `src/types/services.ts` if other code needs to depend on it.
2. Implement the service in `src/core/services/<name>.ts` and export a factory (e.g. `createXxxService()`).
3. In `main.tsx`, create the service and add it to the object passed to `<Shell services={...} />`.
4. Extend `AppContext` in `src/types/plugin.ts` so that `context.services` includes the new service.

## Code style and conventions

- **TypeScript**: Strict mode; avoid `any`. Use types from `@types/plugin` and `@types/services` for app and service code.
- **Preact**: Functional components and hooks. Use `h` from `preact` for JSX.
- **Imports**: Prefer `@core/...` for core code (see `vite.config.ts` aliases). Apps use relative imports for types (`../../types/plugin`) and `@core` for UI/utils.
- **CSS**: Global styles in `index.css`; use semantic class names (e.g. `.app-header`, `.list`, `.btn`) and CSS variables (e.g. `var(--space)`, `var(--fg)`). No CSS modules or Tailwind in this project.
- **Naming**: `camelCase` for functions/variables; `PascalCase` for components and types. Files: `kebab-case` or component name (e.g. `HomeScreen.tsx`).

## Testing

- **Vitest** is used for unit tests; config in `vite.config.ts` (test section).
- Tests live next to source (e.g. `registry.test.ts` next to `registry.ts`) or in a `*.test.ts` / `*.test.tsx` file.
- Run `npm test` before committing if you changed core or app logic.

## Build and deploy

- `npm run build` produces `dist/` (static assets). Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages, etc.).
- If the app is served from a subpath (e.g. `/browserOS/`), set `base: '/browserOS/'` in `vite.config.ts` and rebuild.
- The app uses the History API; the server must serve `index.html` for all routes (SPA fallback).

## Documentation

- **ARCHITECTURE.md** – How the shell, plugins, and services fit together.
- **plugins.md** – Step-by-step app plugin implementation and use of context/services.
- **README.md** – Quick start, commands, and links to the docs above.
