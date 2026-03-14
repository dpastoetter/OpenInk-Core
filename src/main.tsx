import { render } from 'preact';
import { createStorageService } from './core/services/storage';
import { createNetworkService } from './core/services/network';
import { createThemeService } from './core/services/theme';
import { createSettingsService } from './core/services/settings';
import { setRootFallback, LOAD_ERROR_MESSAGE } from './core/utils/fallback-ui';
import { Shell } from './core/kernel/shell';
import { AppRegistry } from './core/plugins/registry';
import { registerAllApps } from './apps/registry';
import { DEFAULT_SETTINGS } from './types/settings';
import './index.css';

/** Bootstrap: single-page app (legacy build). Fast first paint: render with defaults, load stored settings in background. Loader contract: __openinkMounted / __openinkFallback for errors. */
interface LegacyWindow {
  __openinkMounted?: boolean;
  __openinkFallback?: (msg: string) => void;
  __openinkError?: string;
  __openinkSnake?: { id: string; name: string; launch: (c: unknown) => unknown; apiVersion: number; category?: string };
}

function showLegacyFallback(error: unknown): void {
  const win = typeof window !== 'undefined' ? (window as unknown as LegacyWindow) : null;
  if (!win) return;
  win.__openinkMounted = true;
  win.__openinkError = error != null ? String(error) : LOAD_ERROR_MESSAGE;
  if (win.__openinkFallback) {
    win.__openinkFallback(win.__openinkError);
  } else {
    const root = document.getElementById('root');
    if (root) setRootFallback(root, win.__openinkError);
  }
}

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

let storage: ReturnType<typeof createStorageService>;
let network: ReturnType<typeof createNetworkService>;
let theme: ReturnType<typeof createThemeService>;
let settings: ReturnType<typeof createSettingsService>;
try {
  storage = createStorageService();
  network = createNetworkService();
  theme = createThemeService(DEFAULT_SETTINGS);
  settings = createSettingsService(storage, theme);
  registerAllApps();
  const win = typeof window !== 'undefined' ? (window as unknown as LegacyWindow) : null;
  if (win?.__openinkSnake) {
    AppRegistry.registerApp(win.__openinkSnake as Parameters<typeof AppRegistry.registerApp>[0]);
    delete win.__openinkSnake;
  }

  try {
    init();
  } catch (e) {
    showLegacyFallback(e);
  }
} catch (e) {
  showLegacyFallback(e);
}

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
  if (typeof window !== 'undefined') (window as unknown as { __openinkMounted?: boolean }).__openinkMounted = true;
}

function init() {
  const root = document.getElementById('root');
  if (!root) return;
  try {
    // ReKindle: first paint with no theme DOM work — JIT-less engine is 5–10× slower; avoid blocking main thread
    renderShell(root);
    const afterFirstPaint =
      typeof requestAnimationFrame !== 'undefined'
        ? (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn))
        : (fn: () => void) => setTimeout(fn, 0);
    afterFirstPaint(() => {
      theme.applySettings(DEFAULT_SETTINGS);
      // Defer storage read so we don't block; Kindle/localStorage can be slow
      const loadSettings = () => {
        settings
          .load()
          .then((loaded) => theme.applySettings(loaded))
          .catch(() => theme.applySettings(DEFAULT_SETTINGS));
      };
      setTimeout(loadSettings, 280);
    });
  } catch (e) {
    showLegacyFallback(e);
  }
}
