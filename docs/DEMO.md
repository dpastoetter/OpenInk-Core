# E-ink demo

The e-ink demo is a standalone page that runs the OpenInk app inside a mock e-ink reader for testing and presentation.

## How to open

- **Dev:** After `npm run dev`, open `http://localhost:5173/demo/eink-demo.html`
- **Production:** Deploy the built app and open `https://your-domain.com/demo/eink-demo.html` (the file is in `public/demo/`, so it is copied to `dist/demo/` on build)

## What it does

- **Same app:** The page embeds the OpenInk app in an iframe (same origin). You get the full app: home screen, all widgets, zoom, theme.
- **B&W:** A grayscale + contrast filter is applied to the iframe so it looks like a monochrome e-ink screen.
- **Device frame:** A dark bezel wraps the “screen” to suggest a reader device.
- **Resize:** Drag the bottom-right corner of the screen to change the reader size (no separate width/height inputs).
- **Simulated refresh:** E-ink panels don’t update on every tap; they refresh in batches. The demo mimics this with a black full-screen flash:
  - **On navigation:** The app sends a message on each navigation (open app, go home, etc.). The demo counts these and runs the refresh **after a random 3–4 navigations**, not on every click.
  - **Auto-refresh:** Optional “Auto-refresh every 3s” runs the same black flash on a timer.

## Controls (below the device)

| Control | Description |
|--------|-------------|
| **Refresh duration (ms)** | How long the black phase lasts (200–900 ms). Affects how long the screen stays black before fading back to content. |
| **Auto-refresh every 3s** | When checked, triggers the refresh animation every 3 seconds. |

## Technical notes

- The app is loaded at `/` in the iframe. The shell sends `postMessage({ type: 'openink-refresh' })` to the parent when the view changes (see `src/core/kernel/shell.tsx`). The demo listens and throttles to 3–4 clicks before running the refresh.
- The overlay is a div with `opacity: 0` by default; `runRefresh()` fades it to black then back to transparent. No class toggling, to avoid flicker.
- Resize is done with a single timeout loop: mousedown on the handle, mousemove to update size, mouseup to stop. Size is clamped (200–900 px width, 266–1200 px height).
- The demo is plain HTML/CSS/JS in `public/demo/eink-demo.html`. It does not use the app’s build; it only needs the app to be served from the same origin so the iframe can load it.

## Files

- `public/demo/eink-demo.html` – Single file: markup, styles, and script. Shipped as-is; no bundling.
