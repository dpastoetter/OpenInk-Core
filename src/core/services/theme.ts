import type { GlobalSettings } from '../../types/settings';

export type ThemeListener = (settings: GlobalSettings) => void;

export interface ThemeService {
  getSettings(): GlobalSettings;
  subscribe(listener: ThemeListener): () => void;
  /** Called by SettingsService when settings change; not by apps directly. */
  applySettings(settings: GlobalSettings): void;
}

/** Holds current theme state and notifies subscribers; actual CSS is applied via document classes. */
export function createThemeService(initial: GlobalSettings): ThemeService {
  let settings = initial;
  const listeners = new Set<ThemeListener>();

  return {
    getSettings: () => ({ ...settings }),

    subscribe(listener: ThemeListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    applySettings(next: GlobalSettings) {
      settings = next;
      try {
        const root = document.documentElement;
        if (root) {
          root.setAttribute('data-pixel-optics', next.pixelOptics);
          root.setAttribute('data-color-mode', next.colorMode);
          root.setAttribute('data-font-size', next.fontSize);
          root.setAttribute('data-theme', next.theme);
          root.setAttribute('data-appearance', next.appearance);
          root.setAttribute('data-reduce-motion', next.reduceMotion);
          root.setAttribute('data-line-height', next.lineHeight);
          root.setAttribute('data-content-width', next.contentWidth);
          root.setAttribute('data-letter-spacing', next.letterSpacing);
          root.setAttribute('data-tap-target-size', next.tapTargetSize);
          root.setAttribute('data-focus-ring', next.focusRing);
          root.setAttribute('data-high-contrast-focus', next.highContrastFocus ? 'true' : 'false');
          root.setAttribute('data-invert-colors', next.invertColors ? 'true' : 'false');
          root.setAttribute('data-reduce-flashes', next.reduceFlashes ? 'true' : 'false');
          root.setAttribute('data-apps-per-row', next.appsPerRow);
          const zoom = Math.max(0.5, Math.min(2, Number(next.zoom) || 1));
          root.style.setProperty('--zoom', String(zoom));
          const tapMin = next.tapTargetSize === 'extraLarge' ? 60 : next.tapTargetSize === 'large' ? 52 : 44;
          root.style.setProperty('--tap-min', `${tapMin}px`);
          const contentMaxWidth = next.contentWidth === 'full' ? '100%' : next.contentWidth === 'medium' ? '40rem' : '28rem';
          root.style.setProperty('--content-max-width', contentMaxWidth);
        }
        // Defer notifications so subscribers update in one tick (fewer reflows on e-ink)
        const snapshot = settings;
        const list = Array.from(listeners);
        if (typeof queueMicrotask !== 'undefined') {
          queueMicrotask(() => { list.forEach((l) => l(snapshot)); });
        } else {
          setTimeout(() => { list.forEach((l) => l(snapshot)); }, 0);
        }
      } catch {
        // Old browsers (e.g. Kindle) may not support setAttribute or setProperty
      }
    },
  };
}
