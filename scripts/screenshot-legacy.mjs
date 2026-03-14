/**
 * Takes screenshots of the app home screen (light/dark), Reddit widget, and Chess in-game; saves to docs/screenshots/.
 * Uses typical e-ink display format/resolution (Kindle Paperwhite 11th gen 6.8" at 1/3 scale: 412×549).
 * Requires: npm run build, then npm run screenshot (starts preview, captures, exits).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const screenshotsDir = path.join(rootDir, 'docs', 'screenshots');
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(`${baseUrl}/`, { method: 'HEAD' });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return false;
}

async function main() {
  const distDir = path.join(rootDir, 'dist');
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('Run npm run build first (dist/index.html not found).');
    process.exit(1);
  }

  let playwright;
  try {
    playwright = await import('playwright');
  } catch (e) {
    console.error('Playwright not found. Install with: npm install -D playwright');
    process.exit(1);
  }

  const preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    cwd: rootDir,
    stdio: 'pipe',
    shell: true,
  });
  preview.stderr?.on('data', (d) => process.stderr.write(d));
  preview.stdout?.on('data', (d) => process.stdout.write(d));

  const killPreview = () => {
    try {
      preview.kill('SIGTERM');
    } catch (_) {}
  };
  process.on('exit', killPreview);
  process.on('SIGINT', () => { killPreview(); process.exit(130); });

  if (!(await waitForServer())) {
    console.error('Preview server did not become ready in time.');
    killPreview();
    process.exit(1);
  }

  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await playwright.chromium.launch({ headless: true });
  // Typical e-ink display format/resolution: Kindle Paperwhite 11th gen (6.8") 1236×1648 → 1/3 scale 412×549
  const context = await browser.newContext({
    viewport: { width: 412, height: 549 },
    deviceScaleFactor: 1,
  });

  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('.home-screen', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Persist apps-per-row 3 and reload so home screen renders 3 columns
    await page.evaluate(() => {
      const key = 'webos:global-settings';
      try {
        const raw = localStorage.getItem(key);
        const current = raw ? JSON.parse(raw) : {};
        current.appsPerRow = '3';
        localStorage.setItem(key, JSON.stringify(current));
      } catch (_) {}
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('.home-screen', { timeout: 15000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(screenshotsDir, 'legacy-home-light.png'),
      type: 'png',
    });
    console.log('Saved docs/screenshots/legacy-home-light.png');

    const themeBtn = await page.$('button[aria-label="Switch to dark mode"]');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, 'legacy-home-dark.png'),
        type: 'png',
      });
      console.log('Saved docs/screenshots/legacy-home-dark.png');
    }

    // Reddit widget
    const redditTile = await page.$('button[data-app-id="reddit"]');
    if (redditTile) {
      await redditTile.click();
      await page.waitForSelector('.reddit-app', { timeout: 15000 }).catch(() => null);
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(screenshotsDir, 'reddit-widget.png'),
        type: 'png',
      });
      console.log('Saved docs/screenshots/reddit-widget.png');
      const homeBtn = await page.$('button[aria-label="Home"]');
      if (homeBtn) {
        await homeBtn.click();
        await page.waitForSelector('.home-screen', { timeout: 5000 });
        await page.waitForTimeout(500);
      }
    }

    // Chess widget (inside a game: open Chess, start vs Computer, wait for board)
    const chessTile = await page.$('button[data-app-id="chess"]');
    if (chessTile) {
      await chessTile.click();
      await page.waitForSelector('.chess-game', { timeout: 15000 }).catch(() => null);
      await page.waitForTimeout(600);
      const vsComputerBtn = page.locator('button').filter({ hasText: /vs Computer/i }).first();
      if (await vsComputerBtn.count() > 0) {
        await vsComputerBtn.click();
        await page.waitForSelector('.chess-board', { timeout: 10000 }).catch(() => null);
        await page.waitForTimeout(800);
      }
      await page.screenshot({
        path: path.join(screenshotsDir, 'chess-widget.png'),
        type: 'png',
      });
      console.log('Saved docs/screenshots/chess-widget.png');
    }
  } finally {
    await browser.close();
    killPreview();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
