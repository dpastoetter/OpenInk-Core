import { render } from 'preact';
import { createStorageService } from './core/services/storage';
import { createNetworkService } from './core/services/network';
import { createThemeService } from './core/services/theme';
import { createSettingsService } from './core/services/settings';
import { setRootFallback, LOAD_ERROR_MESSAGE } from './core/utils/fallback-ui';
import { Shell } from './core/kernel/shell';
import { registerAllApps } from './apps/registry';
import { DEFAULT_SETTINGS } from './types/settings';
import './index.css';

// Register PWA service worker only on http/https; skip on Kindle/Silk and similar browsers that show "invalid protocol" or don't support SW.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isKindleOrRestricted = /\b(Kindle|Silk|Oasis)\b/i.test(ua);
const canUseSW =
  import.meta.env.PROD &&
  !isKindleOrRestricted &&
  'serviceWorker' in navigator &&
  (location.protocol === 'https:' || (location.protocol === 'http:' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')));
if (canUseSW) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
}

const storage = createStorageService();
const network = createNetworkService();
const theme = createThemeService(DEFAULT_SETTINGS);
const settings = createSettingsService(storage, theme);

registerAllApps();

function renderShell(root: HTMLElement) {
  render(
    <Shell
      services={{
        storage,
        network,
        theme,
        settings,
      }}
    />,
    root
  );
  // Signal to legacy.html loader that the app mounted (so it doesn't show static fallback).
  if (typeof window !== 'undefined') (window as unknown as { __openinkMounted?: boolean }).__openinkMounted = true;
}

async function init() {
  const root = document.getElementById('root');
  if (!root) return;
  try {
    // Timeout so Kindle/slow localStorage does not block render (ReKindle: localStorage can be slow/volatile).
    const loadTimeout = 5000;
    await Promise.race([
      settings.load(),
      new Promise<void>((resolve) => setTimeout(resolve, loadTimeout)),
    ]);
    renderShell(root);
  } catch {
    // Signal mounted so legacy-full.html doesn't overwrite with "OpenInk did not start" (e.g. Kindle).
    if (typeof window !== 'undefined') (window as unknown as { __openinkMounted?: boolean }).__openinkMounted = true;
    const win = typeof window !== 'undefined' ? (window as unknown as { __openinkFallback?: (msg: string) => void }) : null;
    if (win?.__openinkFallback) win.__openinkFallback(LOAD_ERROR_MESSAGE);
    else setRootFallback(root, LOAD_ERROR_MESSAGE);
  }
}

// Only skip init when the URL is legacy *and* we're the modern bundle (server served index.html for legacy URL). When we're the legacy bundle (LEGACY), we're always on legacy.html and must run init().
const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
const isLegacyPath = /legacy(-static)?\.html$/i.test(pathname);
const isLegacyBundle = typeof import.meta.env.LEGACY !== 'undefined' && import.meta.env.LEGACY;
if (isLegacyPath && !isLegacyBundle) {
  // Modern bundle running with legacy URL = wrong file served; leave the inline message.
} else {
  init().catch(() => {});
}
