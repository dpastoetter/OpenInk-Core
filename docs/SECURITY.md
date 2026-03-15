# Security

This document describes security measures for running LibreInk as a public website.

## Client-side (application)

- **No secrets in the bundle** – The app uses only public APIs and a CORS proxy. No API keys or tokens are embedded; do not add any.
- **Untrusted content** – Data from Reddit, News, and other APIs is sanitized with `stripHtml()` (DOMParser-based, no `innerHTML` with untrusted input). Rendered content is plain text or Preact-escaped. Init/load error messages use `setRootFallback()` (DOM APIs only, no `innerHTML` from variables). App tile icons (legacy SVG) are only injected when `isSafeLegacySvg()` passes (no `<script>`, no event handlers).
- **URL safety** – Links and image URLs from APIs (e.g. RSS, Comics) are validated with `isSafeUrl()` / `sanitizeUrl()`; only `https:` and `http:` are allowed. This prevents `javascript:` or `data:` from being used in `href` or `img src`.
- **Storage** – `localStorage` is used only for user preferences and cache (theme, weather, dictionary, news cache). No credentials or sensitive data are stored. Storage keys are validated (safe charset, max length); use `encodeURIComponent()` for URL- or user-derived key segments.
- **CSP** – `index.html` sets a Content-Security-Policy to restrict script/style sources and limit `connect-src` to the app origin and the APIs the app calls. Adjust `connect-src` if you add new backend or proxy domains.
- **Headers** – `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` are set via meta tags.

## Deployment (HTTPS and server headers)

For a public site you should:

1. **Serve over HTTPS** so traffic is encrypted and CSP can be enforced.
2. **Set security headers at the server** (they override or complement the meta tags; mirroring CSP in response headers ensures policy applies even if HTML is cached or proxied):
   - `Content-Security-Policy` (same or stricter than the one in `index.html`)
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY` or `SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` to disable unneeded features (e.g. camera, microphone) if your host supports it

3. **Keep dependencies updated** – Run `npm audit` periodically. The current advisory affects the **development** server (esbuild/Vite dev); the production build is static files and not affected. Upgrade Vite when a fixed version is available without breaking your setup.

## Third-party services

- **CORS proxy (corsproxy.io)** – Used for Reddit and News. Requests go through the proxy; do not send sensitive data in URLs.
- **APIs** – Coingecko, Open-Meteo, Nominatim, Dictionary API, Reddit, RSS feeds. All are read-only; the app does not send user credentials to them.

## Reporting issues

If you find a security issue, please report it responsibly (e.g. via a private channel to the maintainer rather than a public issue).
