/**
 * Post-build: generate dist/legacy.html for Kindle and other browsers that
 * fail on any type="module" script. Legacy page loads only classic scripts
 * (polyfills + legacy entry via System.import).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

const html = fs.readFileSync(indexPath, 'utf8');

// Extract legacy script URLs from the built index.html
const polyfillMatch = html.match(/id="vite-legacy-polyfill"[^>]+src="([^"]+)"/);
const entryMatch = html.match(/id="vite-legacy-entry"[^>]+data-src="([^"]+)"/);

if (!polyfillMatch || !entryMatch) {
  console.warn('generate-legacy-html: could not find legacy script URLs in index.html');
  process.exit(0);
}

const polyfillSrc = polyfillMatch[1];
const entrySrc = entryMatch[1];
const cssMatch = html.match(/href="(\/assets\/index-[^"]+\.css)"/);
const cssHref = cssMatch ? cssMatch[1] : '/assets/index.css';

const legacyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#ffffff" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://corsproxy.io https://api.coingecko.com https://nominatim.openstreetmap.org https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.dictionaryapi.dev; font-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" />
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <link rel="icon" type="image/svg+xml" href="/openink-logo.svg" />
  <link rel="manifest" href="/manifest.json" />
  <title>OpenInk</title>
  <link rel="stylesheet" crossorigin href="${cssHref}">
</head>
<body>
  <div id="root"></div>
  <noscript><p style="padding:1rem;font-family:system-ui,sans-serif;">OpenInk needs JavaScript.</p></noscript>
  <script crossorigin src="${polyfillSrc}"></script>
  <script>System.import("${entrySrc}");</script>
  <script>
    setTimeout(function() {
      var root = document.getElementById('root');
      if (root && root.children.length === 0) {
        root.innerHTML = '<p style="padding:1.5rem;font-family:system-ui,sans-serif;">Loading… If this persists, try another browser.</p>';
      }
    }, 15000);
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'legacy.html'), legacyHtml);
console.log('Generated dist/legacy.html for Kindle / no-ESM browsers');