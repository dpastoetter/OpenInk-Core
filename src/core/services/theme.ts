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
      const root = document.documentElement;
      root.dataset.pixelOptics = next.pixelOptics;
      root.dataset.colorMode = next.colorMode;
      root.dataset.fontSize = next.fontSize;
      root.dataset.theme = next.theme;
      root.dataset.appearance = next.appearance;
      listeners.forEach((l) => l(settings));
    },
  };
}
