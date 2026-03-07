# Building and Registering App Plugins

This document explains how to add a new app to the webOS-style shell and how to use shared services and global settings.

## How to create a new app

1. **Create a folder** under `src/apps/<app-id>/` (e.g. `src/apps/myapp/`).

2. **Implement the plugin interface** in `index.tsx`:

   - Export an object that satisfies `WebOSApp` from `../../types/plugin`:
     - `id`: unique string (e.g. `"myapp"`)
     - `name`: human-readable label
     - `icon`: optional string (character or icon id)
     - `category`: optional `"system"` | `"game"` | `"reader"` | `"network"` or custom
     - `apiVersion`: set to `PLUGIN_API_VERSION` from `../../types/plugin`
     - `metadata`: optional `{ permissions?: string[]; requiresNetwork?: boolean }`
     - `launch`: function that receives `AppContext` and returns an `AppInstance`

   - `AppInstance` must have:
     - `render`: () => JSX (Preact VNode)
     - Optional: `onSuspend`, `onResume`, `onDestroy`, `getTitle`, `canGoBack`, `goBack` (see below)

3. **Register the app** in `src/apps/registry.ts`:

   - Import your app: `import { myappApp } from './myapp';`
   - Add it to the `APPS` array: `const APPS: WebOSApp[] = [ ..., myappApp ];`

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

Global classes like `.panel-title`, `.list`, `.btn`, `.btn-nav` are defined in `src/index.css` and keep the look consistent across apps.

## Example plugins

See **Notes** (`src/apps/notes/index.tsx`) for a minimal app with list/detail and in-app back. See **Dictionary** (`src/apps/dictionary/index.tsx`) for a simple search-and-fetch app. For dynamic title and back stack, see **Reddit** (`src/apps/reddit/index.tsx`) or **News** (`src/apps/news/index.tsx`).

## Type safety

Use the types from `src/types/plugin.ts` and `src/types/services.ts`. Your `launch` function will be checked against `AppContext` and `AppInstance`, and the registry expects `WebOSApp`, so you get compile-time checks when adding a new app.
