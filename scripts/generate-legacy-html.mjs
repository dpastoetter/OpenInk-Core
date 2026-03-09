/**
 * Post-build: generate dist/legacy.html for Kindle and other browsers that
 * fail on type="module". Uses blocking script tags (no dynamic injection) so
 * legacy browsers execute in order. CSP allows 'unsafe-inline' so inline
 * loader runs. 12s timeout shows fallback if app never mounts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

const html = fs.readFileSync(indexPath, 'utf8');

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

const FALLBACK_MSG =
  'OpenInk did not start on this device. If it keeps happening, use a phone or computer.';
const TRY_AGAIN = '<a href="#" onclick="location.reload();return false;" style="color:#333;text-decoration:underline;">Try again</a>';

const initialContent = `
  <div style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;max-width:28em;margin:0 auto;">
    <h1 style="font-size:1.35rem;margin:0 0 0.5rem;">OpenInk</h1>
    <p style="margin:0 0 0.75rem;font-size:0.9rem;color:#666;">Loading app…</p>
    <p style="margin:0 0 1rem;color:#555;">If nothing loads, use a phone or computer for the full app:</p>
    <ul style="margin:0 0 1rem;padding-left:1.25rem;">
      <li>Calculator</li><li>Weather</li><li>News</li><li>Timer</li><li>Settings</li><li>Games</li>
    </ul>
    <p style="margin:0;">${TRY_AGAIN}</p>
  </div>`.replace(/\n\s+/g, ' ').trim();

// CSP: script-src must include 'unsafe-inline' so inline loader scripts run (Kindle/CSP).
const legacyHtml = `<!DOCTYPE html>
<html lang="en" class="legacy-browser">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#ffffff" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://corsproxy.io https://api.coingecko.com https://nominatim.openstreetmap.org https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.dictionaryapi.dev; font-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" />
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <link rel="icon" type="image/svg+xml" href="/openink-logo.svg" />
  <link rel="manifest" href="/manifest.json" />
  <title>OpenInk</title>
  <link rel="stylesheet" crossorigin href="${cssHref}">
</head>
<body>
  <div id="root">${initialContent}</div>
  <noscript><p style="padding:1rem;font-family:Arial,Verdana,sans-serif;">OpenInk needs JavaScript.</p></noscript>
  <script>
    (function(){
      var root = document.getElementById('root');
      var fallbackMsg = ${JSON.stringify(FALLBACK_MSG)};
      var tryAgain = ${JSON.stringify(TRY_AGAIN)};
      function showFallback(msg){
        if (root) root.innerHTML = '<p style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;">' + msg + ' ' + tryAgain + '</p>';
      }
      window.__openinkFallback = showFallback;
      window.onerror = function(){ showFallback('OpenInk could not start.'); return true; };
      var t = setTimeout(function(){
        if (window.__openinkMounted) return;
        showFallback(fallbackMsg);
      }, 12000);
      window.__openinkFallbackTimer = t;
    })();
  </script>
  <script src="${polyfillSrc}" crossorigin="anonymous"></script>
  <script>
    (function(){
      var root = document.getElementById('root');
      var entrySrc = ${JSON.stringify(entrySrc)};
      var tryAgain = ${JSON.stringify(TRY_AGAIN)};
      function showErr(msg){
        if (root) root.innerHTML = '<p style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;">' + msg + ' ' + tryAgain + '</p>';
      }
      if (typeof System === 'undefined') {
        showErr('OpenInk could not load (missing polyfill).');
        return;
      }
      try {
        System.import(entrySrc).then(function(){
          if (window.__openinkFallbackTimer) clearTimeout(window.__openinkFallbackTimer);
        }).catch(function(){
          showErr('OpenInk could not load. Use a phone or computer.');
        });
      } catch (e) {
        showErr('OpenInk could not start.');
      }
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'legacy.html'), legacyHtml);
console.log('Generated dist/legacy.html for Kindle / no-ESM browsers');