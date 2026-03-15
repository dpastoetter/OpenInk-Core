# Building and Registering App Plugins

This document explains how to add a new app to the shell and how to use shared services and global settings.

## How to create a new app

1. **Create a folder** under `src/apps/<app-id>/` (e.g. `src/apps/myapp/`).

2. **Implement the plugin interface** in `index.tsx`:

   - Export an object that satisfies the app plugin interface from `../../types/plugin`:
     - `id`: unique string (e.g. `"myapp"`)
     - `name`: human-readable label
     - `icon`: optional string (character or icon id)
     - `iconFallback`: optional string for legacy/Kindle when emoji are unreliable (e.g. `"?"`, `"*"`)
     - `iconLegacySvg`: optional inline SVG string for the legacy app launcher (see `src/core/icons/legacy-svg.ts`)
     - `category`: optional `"system"` | `"game"` | `"reader"` | `"network"` or custom
     - `apiVersion`: set to `PLUGIN_API_VERSION` from `../../types/plugin`
     - `metadata`: optional `{ permissions?: string[]; requiresNetwork?: boolean }`
     - `launch`: function that receives `AppContext` and returns an `AppInstance`

   - `AppInstance` must have:
     - `render`: () => JSX (Preact VNode)
     - Optional: `onSuspend`, `onResume`, `onDestroy`, `getTitle`, `canGoBack`, `goBack` (see below)

3. **Register the app** in `src/apps/registry.ts`:

   - Add a descriptor and lazy loader to the `LAZY_APPS` array (e.g. `load: () => import('./myapp').then(m => m.myappApp)`). The registry calls `registerAllApps()` at startup to register each app from `LAZY_APPS`.

4. **Run the project** and your app will appear on the home screen.

## Shell header and in-app back

The shell shows a header with **Home**, **Back**, and a **title** when an app is open.

- **`getTitle(): string`** – If your app returns this from its instance, the shell uses it as the header title (e.g. "Markets", "r/technology"). Otherwise the app name is used. Update the returned value when the user navigates within your app (e.g. from subreddit list to a post) so the header always reflects the current view.
- **`canGoBack(): boolean`** – If this returns `true`, the shell’s Back button calls `goBack()` instead of closing the app.
- **`goBack()`** – Called when the user taps Back and `canGoBack()` is true. Use it to pop your internal state (e.g. close a thread and show the subreddit list).

Implement these so that Back navigates within the app first; when there is nothing left to go back to, `canGoBack()` should return `false` and Back will close the app.

## AppContext and shared services

Inside `launch(context: AppContext)` you receive:

- **`context.navigate(path: string)`** – Navigate to a path (e.g. another app or in-app route).
- **`context.closeApp()`** – Close the current app and return to home.
- **`context.services`**:
  - **`storage`** – Key/value persistence (`get`, `set`, `remove`, `keys`). Use a prefix like `myapp:` for your keys.
  - **`network`** – `fetch`, `fetchText`, `fetchJson` with basic error handling.
  - **`theme`** – `getSettings()` and `subscribe(listener)` for global theme/settings.
  - **`settings`** – `get()` for current global settings, `set(partial)` to update (persisted).

## Respecting global settings

- **Pixel optics** – Applied via `document.documentElement.dataset.pixelOptics` (`standard`, `highContrastText`, `lowGhosting`). Your CSS can react to `[data-pixel-optics="..."]` if needed; usually the global styles are enough.
- **Color mode** – `data-color-mode` is `grayscale` or `color`. Use CSS variables (`--fg`, `--bg`, `--accent`) so the shell theme drives your app.
- **Font size** – `data-font-size` (`small` | `medium` | `large`). Prefer `em`/rem so root font size affects your app.
- **Theme** – `data-theme` (e.g. `normal`, `highContrast`). Prefer semantic colors (`var(--fg)`, `var(--bg)`) instead of hardcoded values.

Read current values from `context.services.settings.get()` or `context.services.theme.getSettings()` and avoid starting timers or heavy re-renders; keep updates minimal for e-ink.

## Shared UI and utilities

- **`@core/ui/PageNav`** – Pagination controls (Previous / Next and "Page X of Y"). Use for list or article pagination.
- **`@core/ui/Button`**, **`@core/ui/List`** – Optional; you can also use plain `<button class="btn">` and `<ul class="list">` with the global CSS in `index.css`.
- **`@core/utils/html`** – `stripHtml(html)` returns plain text from HTML (safe for user content). Useful for RSS descriptions or Reddit/API HTML bodies.

Global classes like `.panel-title`, `.list`, `.btn`, `.btn-nav` are defined in `src/index.css` and keep the look consistent across apps. Use `.widget-hint` for short in-app help text (e.g. "Search recipes by name. Results from TheMealDB, cached offline."); style is muted and compact.

## Feed / RSS apps

Blog, News, and Comics share a common pattern: CORS proxy and cache TTL from `context.services.settings.get()`, cache keys in storage, and RSS/Atom parsing. Use **`@core/utils/rss`** for `parseRssItems(xml, source)` and `getFeedTitleFromXml(xml)`, and **`src/types/feed.ts`** for the shared `RssItem` type. Proxy and cache helpers are in **`@core/constants`** (`getCorsProxyUrl`, `getDefaultCacheTtlMs`).

## Header actions (e.g. board zoom)

Games that need resizable boards (Chess, Snake, Sudoku, Minesweeper) use the shared **GameBoardResize** component and inject it into the shell header via **AppHeaderActionsContext**. In your app, call `useContext(AppHeaderActionsContext)` to get `setHeaderActions`; pass a VNode (e.g. `<GameBoardResize min={…} max={…} valuePx={…} onDecrease={…} onIncrease={…} />`) and clear it on unmount with `setHeaderActions(null)`. See `src/apps/games/snake.tsx` or `chess.tsx` for the pattern.

## Example plugins

- **Dictionary** (`src/apps/dictionary/index.tsx`) – Simple search-and-fetch app.
- **Reddit** / **News** (`src/apps/reddit/index.tsx`, `news/index.tsx`) – Dynamic title and back stack (getTitle, canGoBack, goBack).
- **Recipes** (`src/apps/recipes/index.tsx`) – Search, list, detail view with back navigation and cached results.
- **Picture Frame** (`src/apps/pictureframe/index.tsx`) – Fullscreen overlay via `createPortal(..., document.body)`, wake lock, custom images from URL or browse.

## Type safety

Use the types from `src/types/plugin.ts` and `src/types/services.ts`. Your `launch` function will be checked against `AppContext` and `AppInstance`, and the registry expects the app plugin interface, so you get compile-time checks when adding a new app.
