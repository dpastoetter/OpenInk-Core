/**
 * Post-build: generate index.html (single-page app for Kindle/e-ink).
 * Static HTML/CSS; critical CSS inlined, non-critical CSS deferred (media=print → all).
 * Main JS loaded with defer; minified by build. Test on Kindle UA: Mozilla/5.0 (Kindle; ... WebKit/... Kindle/...).[web:14]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');
const singleLegacyPath = path.join(assetsDir, 'openink-legacy-single.js');
const singleCssPath = path.join(assetsDir, 'openink-legacy-single.css');

const useSingleScript = fs.existsSync(singleLegacyPath);
const cssHref = fs.existsSync(singleCssPath) ? 'assets/openink-legacy-single.css' : '';

const FALLBACK_MSG = 'LibreInk did not start. Try again or use another device.';
const TRY_AGAIN = '<a href="#" onclick="location.reload();return false;" style="color:#333;text-decoration:underline;">Try again</a>';

const FALLBACK_TIMEOUT_MS = 22000;
const SCRIPT_LOADED_WAIT_MS = 6000;
const SCRIPT_MOUNT_TIMEOUT_MS = 18000;

const criticalStyle = [
  'body{margin:0;padding:0;height:100vh;width:100vw;overflow:hidden;background:#e5e5e5;color:#000;font-family:Geneva,Verdana,sans-serif;display:flex;align-items:center;justify-content:center;position:fixed;inset:0;box-sizing:border-box}',
  '#root{display:block !important;visibility:visible !important;opacity:1 !important;background:#fff;border:2px solid #000;box-shadow:4px 4px 0 #000;width:95%;max-width:600px;min-height:200px;max-height:90vh;overflow-y:auto;flex-shrink:0;-webkit-overflow-scrolling:touch}',
].join('');
const initialContent = `<div style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;max-width:28em;margin:0 auto;"><img src="/openink-logo.svg" alt="" width="40" height="40" style="display:block;margin:0 auto 0.5rem;vertical-align:middle"><h1 style="font-size:1.35rem;margin:0 0 0.5rem;">LibreInk</h1><p style="margin:0 0 0.75rem;font-size:0.9rem;color:#666;">Loading…</p><p style="margin:0;">${TRY_AGAIN}</p></div>`;

const legacyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#ffffff">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self'; base-uri 'self'; form-action 'self'">
<link rel="icon" type="image/svg+xml" href="/openink-logo.svg">
<title>LibreInk</title>
<link rel="preload" href="assets/openink-legacy-single.js" as="script">
<style>${criticalStyle}</style>
</head>
<body>
<div id="root">${initialContent}</div>
<noscript><p style="padding:1rem;font-family:Arial,Verdana,sans-serif;">LibreInk needs JavaScript.</p></noscript>
<script>
// --- Critical: global fallback and timeout (ES5, inline) ---
(function(){
  function setFallback(root, msg) {
    if (!root) return;
    root.style.display = 'block';
    root.style.visibility = 'visible';
    root.style.opacity = '1';
    try {
      root.textContent = '';
      var p = document.createElement('p');
      p.style.cssText = 'padding:1.5rem;font-family:Arial,Verdana,sans-serif;margin:0;';
      p.appendChild(document.createTextNode(msg));
      p.appendChild(document.createTextNode(' '));
      var tryAgain = document.createElement('a');
      tryAgain.href = '#';
      tryAgain.textContent = 'Try again';
      tryAgain.style.color = '#333';
      tryAgain.style.textDecoration = 'underline';
      tryAgain.onclick = function() { location.reload(); return false; };
      p.appendChild(tryAgain);
      root.appendChild(p);
    } catch (e) {
      root.innerHTML = '<p style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;margin:0;">Something went wrong. <a href="#" onclick="location.reload();return false;">Try again</a></p>';
    }
  }
  try {
    var root = document.getElementById('root');
    var fallbackMsg = ${JSON.stringify(FALLBACK_MSG)};
    window.__openinkFallback = function(msg) { setFallback(root, msg || fallbackMsg); };
    window.onerror = function(msg, url, line, col, err) { try { window.__openinkMounted = true; var errMsg = (window.__openinkError && String(window.__openinkError)) || (err && err.message) || msg || 'LibreInk could not start.'; setFallback(root, errMsg); } catch(x) {} return true; };
    if (typeof window.addEventListener === 'function') window.addEventListener('unhandledrejection', function(e) { try { if (window.__openinkMounted) return; window.__openinkMounted = true; var errMsg = (e && e.reason != null) ? String(e.reason) : 'App failed to start.'; if (window.__openinkFallback) window.__openinkFallback(errMsg); } catch(x) {} });
    var t = setTimeout(function(){
      if (window.__openinkMounted) return;
      var r = document.getElementById('root');
      if (r) setFallback(r, fallbackMsg);
    }, ${FALLBACK_TIMEOUT_MS});
    window.__openinkFallbackTimer = t;
  } catch(e) {}
})();
</script>
${useSingleScript ? `<script src="assets/openink-legacy-single.js" defer></script>\n<script>
(function(){
  setTimeout(function(){
    if (window.__openinkMounted) return;
    if (window.__openinkFallback) window.__openinkFallback(${JSON.stringify(FALLBACK_MSG)});
  }, ${SCRIPT_MOUNT_TIMEOUT_MS});
})();
</script>` : '<script>if (window.__openinkFallback) window.__openinkFallback("App not built. Run npm run build.");</script>'}
${cssHref ? `<link rel="stylesheet" href="${cssHref}" crossorigin="anonymous" media="print" onload="this.media='all'">\n<noscript><link rel="stylesheet" href="${cssHref}" crossorigin="anonymous"></noscript>` : ''}
</body>
</html>
`;

if (!useSingleScript) {
  console.error('assets/openink-legacy-single.js not found. Run the legacy build first.');
  process.exit(1);
}

fs.writeFileSync(path.join(distDir, 'index.html'), legacyHtml);
console.log('Generated dist/index.html (single-page app).');
