/**
 * Post-build: generate legacy pages for Kindle and no-ESM browsers.
 *
 * RADICAL: legacy.html = NO app bundle. Only inline HTML/CSS and one inline
 * script (calculator). Guaranteed to render. Full app is at legacy-full.html.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

const singleLegacyPath = path.join(distDir, 'assets', 'openink-legacy-single.js');
const useSingleScript = fs.existsSync(singleLegacyPath);

let cssHref = '/assets/index.css';
let polyfillSrc = '';
let entrySrc = '';

if (useSingleScript) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const cssMatch = html.match(/href="(\/assets\/index-[^"]+\.css)"/);
  if (cssMatch) cssHref = cssMatch[1];
} else {
  const html = fs.readFileSync(indexPath, 'utf8');
  const polyfillMatch = html.match(/id="vite-legacy-polyfill"[^>]+src="([^"]+)"/);
  const entryMatch = html.match(/id="vite-legacy-entry"[^>]+data-src="([^"]+)"/);
  const cssMatch = html.match(/href="(\/assets\/index-[^"]+\.css)"/);
  if (cssMatch) cssHref = cssMatch[1];
  if (!polyfillMatch || !entryMatch) {
    polyfillSrc = '';
    entrySrc = '';
  } else {
    polyfillSrc = polyfillMatch[1];
    entrySrc = entryMatch[1];
  }
}

const FALLBACK_MSG =
  'OpenInk did not start. Use a phone or computer, or go back to legacy.html (simple version).';
const TRY_AGAIN =
  '<a href="#" onclick="location.reload();return false;" style="color:#333;text-decoration:underline;">Try again</a>';

// ReKindle-aligned: gray body, white "window" (#root).
const criticalStyle = [
  'body{margin:0;background:#e5e5e5;color:#000;min-height:100vh;font-family:Geneva,Verdana,sans-serif;display:flex;align-items:center;justify-content:center}',
  '#root{background:#fff;border:2px solid #000;box-shadow:4px 4px 0 #000;width:95%;max-width:600px;min-height:200px;padding:1.5rem;box-sizing:border-box}',
  '.mcalc input,.mcalc button{font-size:1rem;padding:0.5rem;margin:0.25rem}',
].join('');

// --- legacy.html: ZERO external scripts. Only inline HTML/CSS + one inline onclick. Always works. ---
const legacyMinimalContent = `<!DOCTYPE html>
<html lang="en" class="legacy-browser">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#ffffff">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<link rel="icon" type="image/svg+xml" href="/openink-logo.svg">
<title>OpenInk</title>
<style>${criticalStyle}</style>
</head>
<body class="legacy-browser">
<div id="root">
<h1 style="font-size:1.35rem;margin:0 0 0.5rem;">OpenInk</h1>
<p style="margin:0 0 1rem;color:#666;">Simple version — no full app. Works on Kindle and old browsers.</p>
<div class="mcalc">
<input type="text" id="mcalc-a" value="0" size="6" aria-label="First number"> +
<input type="text" id="mcalc-b" value="0" size="6" aria-label="Second number"> =
<output id="mcalc-out" style="margin-left:0.25rem;">0</output>
<button type="button" onclick="var a=document.getElementById('mcalc-a');var b=document.getElementById('mcalc-b');var o=document.getElementById('mcalc-out');var x=parseFloat(a.value)||0;var y=parseFloat(b.value)||0;o.textContent=x+y;">Add</button>
</div>
<p style="margin:1.5rem 0 0.5rem;"><a href="legacy-full.html" style="color:#333;text-decoration:underline;">Try full app (legacy-full.html)</a></p>
<p style="margin:0;"><a href="legacy-static.html" style="color:#333;text-decoration:underline;">Static page (no JS)</a></p>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'legacy.html'), legacyMinimalContent);

// --- legacy-full.html: tries to load the full app (async). Fallback links back to legacy.html ---
const fullCriticalStyle = [
  'body{margin:0;background:#e5e5e5;color:#000;min-height:100vh;font-family:Geneva,Verdana,sans-serif;image-rendering:pixelated;overflow:hidden;display:flex;align-items:center;justify-content:center}',
  '#root{display:block !important;visibility:visible !important;opacity:1 !important;background:#fff;border:2px solid #000;box-shadow:4px 4px 0 #000;width:95%;max-width:600px;min-height:200px}',
].join('');
const fullInitialContent = `<div style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;max-width:28em;margin:0 auto;"><img src="/openink-logo.svg" alt="" width="40" height="40" style="display:block;margin:0 auto 0.5rem;vertical-align:middle"><h1 style="font-size:1.35rem;margin:0 0 0.5rem;">OpenInk</h1><p style="margin:0 0 0.75rem;font-size:0.9rem;color:#666;">Loading full app...</p><p style="margin:0 0 0.5rem;color:#555;">If nothing loads, go back to <a href="legacy.html" style="color:#333;text-decoration:underline;">legacy.html</a> (simple version).</p><p style="margin:0;">${TRY_AGAIN}</p></div>`;

const legacyFullHtml = `<!DOCTYPE html>
<html lang="en" class="legacy-browser">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#ffffff">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<link rel="icon" type="image/svg+xml" href="/openink-logo.svg">
<title>OpenInk (full app)</title>
<style>${fullCriticalStyle}</style>
</head>
<body class="legacy-browser">
<div id="root">${fullInitialContent}</div>
<noscript><p style="padding:1rem;font-family:Arial,Verdana,sans-serif;">OpenInk needs JavaScript. Use <a href="legacy.html">legacy.html</a> for the simple version.</p></noscript>
<script>
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
      var back = document.createElement('a');
      back.href = 'legacy.html';
      back.textContent = 'Back to simple version';
      back.style.color = '#333';
      back.style.textDecoration = 'underline';
      p.appendChild(back);
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
      root.innerHTML = '<p style="padding:1.5rem;font-family:Arial,Verdana,sans-serif;margin:0;">' + msg + ' <a href="legacy.html" style="color:#333;text-decoration:underline;">Back to simple</a> <a href="#" onclick="location.reload();return false;">Try again</a></p>';
    }
  }
  try {
    var root = document.getElementById('root');
    var fallbackMsg = ${JSON.stringify(FALLBACK_MSG)};
    window.__openinkFallback = function(msg) { setFallback(root, msg || fallbackMsg); };
    window.onerror = function() { try { setFallback(root, 'OpenInk could not start.'); } catch(x) {} return true; };
    var t = setTimeout(function(){
      if (window.__openinkMounted) return;
      var r = document.getElementById('root');
      if (r) setFallback(r, fallbackMsg);
    }, 8000);
    window.__openinkFallbackTimer = t;
  } catch(e) {}
})();
</script>
${useSingleScript
  ? `<script>
(function(){
  try {
    var s = document.createElement('script');
    s.src = '/assets/openink-legacy-single.js';
    s.async = false;
    s.onerror = function() { if (window.__openinkFallback) window.__openinkFallback('Could not load app.'); };
    document.body.appendChild(s);
  } catch(e) { if (window.__openinkFallback) window.__openinkFallback('Could not load app.'); }
})();
</script>`
  : polyfillSrc && entrySrc ? `<script src="${polyfillSrc}" crossorigin="anonymous"></script>
<script>
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
      var back = document.createElement('a');
      back.href = 'legacy.html';
      back.textContent = 'Back to simple version';
      back.style.color = '#333';
      back.style.textDecoration = 'underline';
      p.appendChild(back);
      root.appendChild(p);
    } catch (e) { root.innerHTML = '<p style="padding:1.5rem;">' + msg + ' <a href="legacy.html">Back to simple</a></p>'; }
  }
  try {
    var root = document.getElementById('root');
    var entrySrc = ${JSON.stringify(entrySrc)};
    if (typeof System === 'undefined') { setFallback(root, 'Could not load (missing polyfill).'); return; }
    System.import(entrySrc).then(function(){ if (window.__openinkFallbackTimer) clearTimeout(window.__openinkFallbackTimer); }).catch(function(){ setFallback(root, 'Could not load app.'); });
  } catch (e) { var r = document.getElementById('root'); if (r) setFallback(r, 'OpenInk could not start.'); }
})();
</script>` : '<script>if (window.__openinkFallback) window.__openinkFallback("Full app not built. Use legacy.html.");</script>'}
<link rel="stylesheet" href="${cssHref}" crossorigin="anonymous">
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'legacy-full.html'), legacyFullHtml);

// Static page: no JS at all.
const staticHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/openink-logo.svg">
<title>OpenInk (no JS)</title>
<style>body{margin:0;background:#fff;color:#000;font-family:Arial,Verdana,sans-serif;padding:1.5rem;max-width:28em;margin:0 auto;}</style>
</head>
<body>
<img src="/openink-logo.svg" alt="" width="40" height="40" style="display:block;margin:0 auto 0.5rem;">
<h1>OpenInk</h1>
<p>This page does not use JavaScript. If you see this on your Kindle, the server is working.</p>
<p><a href="legacy.html">legacy.html</a> — simple version (calculator). <a href="legacy-full.html">legacy-full.html</a> — full app.</p>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, 'legacy-static.html'), staticHtml);

// legacy-minimal.html = same as legacy.html (for bookmarks)
fs.writeFileSync(path.join(distDir, 'legacy-minimal.html'), legacyMinimalContent);

console.log('Generated dist/legacy.html (simple, no bundle), dist/legacy-full.html (full app), dist/legacy-static.html, dist/legacy-minimal.html');