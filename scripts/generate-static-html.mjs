/**
 * Generate static.html: pure HTML/CSS, no JavaScript framework.
 * For e-ink and no-JS: large fonts, simple layout, no search/filters.
 * Single link to full app (index.html). Run after legacy build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const APP_LIST = [
  { id: 'blog', name: 'Blog' },
  { id: 'calculator', name: 'Calculator' },
  { id: 'chess', name: 'Chess' },
  { id: 'comics', name: 'Comics' },
  { id: 'dictionary', name: 'Dictionary' },
  { id: 'finance', name: 'Finance' },
  { id: 'minesweeper', name: 'Minesweeper' },
  { id: 'news', name: 'News' },
  { id: 'reddit', name: 'Reddit' },
  { id: 'stopwatch', name: 'Stopwatch' },
  { id: 'snake', name: 'Snake' },
  { id: 'timer', name: 'Timer' },
  { id: 'weather', name: 'Weather' },
  { id: 'worldclock', name: 'World clock' },
  { id: 'todo', name: 'To-do' },
  { id: 'recipes', name: 'Recipes' },
  { id: 'pictureframe', name: 'Picture Frame' },
  { id: 'settings', name: 'Settings' },
];

const staticCss = [
  'body{margin:0;padding:1.5rem;background:#fff;color:#000;font-family:Arial,Verdana,Geneva,sans-serif;font-size:1.35rem;line-height:1.5;max-width:28rem;margin:0 auto;box-sizing:border-box}',
  'a{color:#000;text-decoration:underline}',
  'a:focus{outline:2px solid #000}',
  'h1{font-size:1.75rem;margin:0 0 1rem}',
  'p{margin:0 0 1rem}',
  '.apps{list-style:none;margin:0;padding:0}',
  '.apps li{margin-bottom:0.75rem}',
  '.apps a{display:block;padding:0.5rem 0;font-size:1.25rem}',
  '.full-app{margin-top:1.5rem;padding-top:1rem;border-top:2px solid #000}',
  '.full-app a{font-size:1.35rem;font-weight:bold}',
].join('');

const appLinks = APP_LIST.map((a) => `        <li><a href="index.html">${escapeHtml(a.name)}</a></li>`).join('\n');

const staticHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#ffffff">
<title>OpenInk – Simple view</title>
<style>${staticCss}</style>
</head>
<body>
<h1>OpenInk</h1>
<p>Simple view. No search, no filters. Large text for e-ink. This page uses no JavaScript.</p>
<p>To use apps (Blog, Weather, etc.), open the full app below. The full app needs JavaScript.</p>
<ul class="apps">
${appLinks}
</ul>
<div class="full-app">
  <p><a href="index.html">Open full app</a></p>
</div>
</body>
</html>
`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
fs.writeFileSync(path.join(distDir, 'static.html'), staticHtml);
console.log('Generated dist/static.html (static, no-JS e-ink friendly page).');
