/**
 * Post-build: generate dist/legacy.html for Kindle and other browsers that
 * fail on type="module". Designed so the screen is NEVER blank:
 * - No CSP (old WebKit can mis-handle it and blank the page).
 * - Critical inline styles in head so content is visible without any external CSS.
 * - Canary line first in body so something shows even if #root is broken.
 * - Main stylesheet loaded at end of body so first paint does not depend on it.
 * - Blocking script order: polyfill then System.import(entry); 12s timeout fallback.
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
const TRY_AGAIN =
  '<a href="#" onclick="location.reload();return false;" style="color:#333;text-decoration:underline;">Try again</a>';

// All visible content uses inline styles so nothing depends on external CSS for first paint.
const initialContent = `<div style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;max-width:28em;margin:0 auto;"><h1 style="font-size:1.35rem;margin:0 0 0.5rem;">OpenInk</h1><p style="margin:0 0 0.75rem;font-size:0.9rem;color:#666;">Loading app...</p><p style="margin:0 0 1rem;color:#555;">If nothing loads, use a phone or computer for the full app.</p><ul style="margin:0 0 1rem;padding-left:1.25rem;"><li>Calculator</li><li>Weather</li><li>News</li><li>Timer</li><li>Settings</li><li>Games</li></ul><p style="margin:0;">${TRY_AGAIN}</p></div>`;

// Critical: ensure body and #root are visible even if external CSS never loads (Kindle/old WebKit).
const criticalStyle = `body{margin:0;background:#fff;color:#000;min-height:100vh;font-family:Arial,Verdana,sans-serif}#root{display:block !important;visibility:visible !important;opacity:1 !important}#legacy-canary{margin:0;padding:0.5rem 1rem;font-size:14px;background:#fff;color:#000;border-bottom:1px solid #ccc}`;

const legacyHtml = `<!DOCTYPE html>
<html lang="en" class="legacy-browser">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#ffffff">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<title>OpenInk</title>
<style>${criticalStyle}</style>
</head>
<body>
<p id="legacy-canary">OpenInk</p>
<div id="root">${initialContent}</div>
<noscript><p style="padding:1rem;font-family:Arial,Verdana,sans-serif;">OpenInk needs JavaScript.</p></noscript>
<script>
(function(){
  try {
    var root = document.getElementById('root');
    var fallbackMsg = ${JSON.stringify(FALLBACK_MSG)};
    var tryAgain = ${JSON.stringify(TRY_AGAIN)};
    function showFallback(msg){
      if (root) root.innerHTML = '<p style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;">' + msg + ' ' + tryAgain + '</p>';
    }
    window.__openinkFallback = showFallback;
    window.onerror = function(){ try { showFallback('OpenInk could not start.'); } catch(e) {} return true; };
    var t = setTimeout(function(){
      if (window.__openinkMounted) return;
      try { showFallback(fallbackMsg); } catch(e) {}
    }, 12000);
    window.__openinkFallbackTimer = t;
  } catch(e) {}
})();
</script>
<script src="${polyfillSrc}" crossorigin="anonymous"></script>
<script>
(function(){
  try {
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
    System.import(entrySrc).then(function(){
      if (window.__openinkFallbackTimer) clearTimeout(window.__openinkFallbackTimer);
    }).catch(function(){
      showErr('OpenInk could not load. Use a phone or computer.');
    });
  } catch (e) {
    try {
      var r = document.getElementById('root');
      if (r) r.innerHTML = '<p style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;">OpenInk could not start. <a href="#" onclick="location.reload();return false;">Try again</a></p>';
    } catch(x) {}
  }
})();
</script>
<link rel="stylesheet" href="${cssHref}" crossorigin="anonymous">
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'legacy.html'), legacyHtml);

// Minimal static page: no scripts. If Kindle shows this but not legacy.html, the issue is JS.
const staticHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenInk (no JS)</title>
<style>body{margin:0;background:#fff;color:#000;font-family:Arial,Verdana,sans-serif;padding:1.5rem;max-width:28em;margin:0 auto;}</style>
</head>
<body>
<h1>OpenInk</h1>
<p>This page does not use JavaScript. If you see this on your Kindle, the server is working.</p>
<p>For the full app, open <a href="legacy.html">legacy.html</a> (requires JavaScript). If that page stays blank, your browser may not support the app.</p>
<p>Use a phone or computer for the full experience.</p>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'legacy-static.html'), staticHtml);

console.log('Generated dist/legacy.html and dist/legacy-static.html for Kindle / no-ESM browsers');