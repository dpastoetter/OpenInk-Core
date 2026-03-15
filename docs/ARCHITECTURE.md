# Architecture

This document describes the high-level architecture of the shell, plugin system, and app lifecycle.

## Overview

The app is a **single-page application (SPA)** built with Preact and Vite. It provides a shell: a **home screen** that launches **apps** (plugins). Each app runs inside a shared **shell** that provides a global header (Home, Back, title), services (storage, network, theme, settings), and navigation.

- **No router library**: Navigation is driven by the shell state and the History API (pushState / popstate) so that the browser Back button closes the app and returns to home.
- **Plugin-based apps**: Apps are registered at startup and launched on demand; they receive a context and return an instance with a `render()` function.
- **Shared services**: Storage, network, theme, and settings are created once in `main.tsx` and passed into the shell, which injects them into every app via `AppContext`.

## Entry point and bootstrap

**`src/main.tsx`**

1. Creates the four services: storage, network, theme, settings.
2. Theme is created with `DEFAULT_SETTINGS`.
3. Calls `registerAllApps()` so all built-in apps are registered in `AppRegistry` (lazy descriptors only; app code loads on first launch).
4. Applies default settings to the document and renders `<Shell services={...} />` into `#root` immediately (fast first paint).
5. Loads persisted settings from storage in the background and applies them via `theme.applySettings()` when ready.

No app is running at this point; the shell shows the home screen.

## Shell

**`src/core/kernel/shell.tsx`**

The shell is the root UI when not on the home screen. It holds:

- **State**: `currentAppId`, `instance` (the running `AppInstance`), and optionally `appStack` (for future multi-step navigation).
- **Callbacks**: `launchApp`, `closeApp`, `goToHome`, `goHome` (History back vs direct home), and `navigate` (for path-based navigation, e.g. deep links).

**Behavior:**

- **Tap vs scroll**: The shell uses `useTapVsScrollThreshold` (in `src/core/hooks/`) to ignore click when the pointer or touch has moved beyond a small threshold, reducing accidental app launches while scrolling on touch devices (e.g. Kindle).
- **Home**: When `currentAppId === null`, the shell renders `<HomeScreen />`, which shows the grid of registered apps.
- **App open**: When the user taps an app, `launchApp(app)` is called. The shell builds an `AppContext` (navigate, closeApp, services), calls `app.launch(context)`, stores the returned `AppInstance`, and pushes a history state. The UI then shows:
  - **App header**: Home button, Back button, and a title. The title comes from `instance.getTitle?.()` or the app name. The Back button calls `instance.goBack()` if `instance.canGoBack?.()` is true, otherwise `closeApp()`.
  - **App content**: `instance.render()` is called each time the shell re-renders.

**History:**

- Opening an app does `history.pushState(...)` so the URL stays the same but the Back button has an entry.
- A `popstate` listener calls `goToHome()`, which clears the instance and shows the home screen. So browser/mouse Back closes the app.

## Plugin system

**Types**: `src/types/plugin.ts`

- **App plugin**: Descriptor for an app (`id`, `name`, `icon`, `category`, `apiVersion`, `metadata`, `launch`); type in `plugin.ts`.
- **AppContext**: Passed to `launch()`: `navigate`, `closeApp`, and `services` (storage, network, theme, settings).
- **AppInstance**: Returned by `launch()`: required `render()`, and optional `onSuspend`, `onResume`, `onDestroy`, `canGoBack`, `goBack`, `getTitle`.

**Registry**: `src/core/plugins/registry.ts`

- In-memory map of loaded apps and a lazy map (descriptor + loader) for apps not yet loaded.
- `registerApp(app)` adds an app; `registerLazy(descriptor, load)` registers a lazy app; `getApp(id)` / `getAllApps()` / `getAllAppDescriptors()` for the shell and home screen. `loadApp(id)` loads a lazy app on first launch.

**Registration**: `src/apps/registry.ts`

- Defines the `LAZY_APPS` array (descriptor + lazy loader per app) and calls `AppRegistry.registerLazy(descriptor, load)` for each in `registerAllApps()`. Apps are loaded on first launch to keep the initial bundle small.

Apps do not import each other; they are only coupled via the shared types and context.

## Services

**Storage** (`src/core/services/storage.ts`): Key/value persistence (async get/set/remove/keys) over localStorage with a prefix. Used by the settings service and by apps (e.g. news cache, reddit subs).

**Network** (`src/core/services/network.ts`): Thin wrapper around `fetch` with CORS and credentials settings; exposes `fetch`, `fetchText`, `fetchJson`. Used by apps for Reddit, News, Finance, etc.

**Theme** (`src/core/services/theme.ts`): Holds current global settings in memory and applies them to the document via `setAttribute` (e.g. `data-theme`, `data-appearance`, `data-pixel-optics`) and `style.setProperty` for zoom, so legacy/Kindle browsers without full `dataset` support still get high-contrast and appearance. Exposes `getSettings()` and `subscribe(listener)`. Updated only by the settings service when the user changes settings.

**Settings** (`src/core/services/settings.ts`): Persisted global settings. `get()` returns current in-memory settings; `set(partial)` merges, persists via storage, and calls `theme.applySettings()`. `load()` reads from storage and applies to theme (used at startup).

Settings and theme are separate so that theme is the single source of “what is applied to the DOM” and settings is the source of “what the user chose and what is saved.”

## UI layers

- **Status bar** (`src/core/ui/StatusBar.tsx`): Top bar with branding, clock, and Light/Dark toggle. Subscribes to theme for appearance.
- **Home screen** (`src/core/kernel/HomeScreen.tsx`): Grid of app tiles; sorts by category and name; calls `onLaunch(app)` when a tile is tapped.
- **App header**: Rendered by the shell (Home, Back, title, optional header actions). Title is dynamic via `getTitle()`. Apps can inject custom header controls (e.g. board zoom for games) via **AppHeaderActionsContext** (`setHeaderActions`).
- **App content**: The result of `instance.render()`; each app owns its layout and uses shared CSS classes (e.g. `.list`, `.btn`, `.panel-title`) and optional core components like `PageNav`.

Core UI components live in `src/core/ui/` (e.g. `PageNav`, `Button`, `List`). Apps may use them or use plain HTML with the same CSS classes; many list-based apps use raw `<ul class="list">` with global CSS, so `List` is optional.

## Data flow

- **Launch**: User taps app → Shell `launchApp` → `app.launch(context)` → instance stored → shell re-renders → header + `instance.render()`.
- **Back (in-app)**: User taps Back and `canGoBack()` is true → Shell calls `instance.goBack()` → app updates its own state (e.g. close thread) → shell re-renders → `getTitle()` and `render()` reflect new state.
- **Back (exit)**: User taps Back and `canGoBack()` is false, or user uses browser Back → `closeApp` / `goToHome` → instance cleared → home screen shown.
- **Settings change**: User changes a setting in the Settings app → `settings.set(partial)` → storage updated, `theme.applySettings()` → DOM and theme subscribers (e.g. StatusBar) update.

## Utilities and shared code

- **`src/core/utils/html.ts`**: `stripHtml(html)` for safe plain-text extraction from HTML (used by Reddit and News).
- **`src/core/utils/url.ts`**: `isSafeUrl(url)` and `sanitizeUrl(url)` for safe links and image URLs (https/http only).
- **`src/core/utils/safe-svg.ts`**: `isSafeLegacySvg(html)` to allow only SVG markup without script or event handlers; used for app tile icons in the shell.
- **`src/core/utils/fallback-ui.ts`**: `setRootFallback(root, message)` for init/load errors (DOM only, no innerHTML from variables).
- **`src/core/utils/rss.ts`**: `parseRssItems(xml, source)` and `getFeedTitleFromXml(xml)` for RSS/Atom feeds; shared by Blog, News, and optionally Comics. Item shape is `RssItem` in `src/types/feed.ts`.
- **`src/core/utils/settings-parsers.ts`**: `parseJsonArray` and type guards for parsing settings JSON (e.g. blog feeds, finance items, world clock zones).
- **`src/apps/games/`**: Chess (move generation, Stockfish worker + fallback engine), Snake, Sudoku, Minesweeper. Shared **GameBoardResize** component provides − / size / + controls in the app header for all four games. Chess uses `stockfish-worker.ts` for UCI/FEN; the Stockfish worker is kept alive across games (reset sends `ucinewgame` only). A simple fallback engine is used when Stockfish is unavailable (e.g. legacy/Kindle).
- **`src/types/`**: Shared TypeScript types (plugin, settings, services). Implementations live in `core/services` and are re-exported or used via interfaces.

## Build and runtime

- **Vite** bundles the app; aliases (`@core`, `@apps`, `@types`) point into `src/`. The result is static HTML/JS/CSS; no server-side rendering.
- **Runtime**: One shell, one active app instance at a time. Apps are registered lazily (see `LAZY_APPS` in `src/apps/registry.ts`) and loaded on first launch via dynamic import. The legacy build (Kindle) inlines all app code into a single IIFE; the same lazy API is used but the bundle is one file.
