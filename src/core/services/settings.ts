import type { GlobalSettings } from '../../types/settings';
import { DEFAULT_SETTINGS } from '../../types/settings';
import type { StorageService } from './storage';
import type { ThemeService } from './theme';

const SETTINGS_KEY = 'global-settings';

export interface SettingsService {
  get(): GlobalSettings;
  set(partial: Partial<GlobalSettings>): Promise<void>;
  load(): Promise<GlobalSettings>;
}

export function createSettingsService(
  storage: StorageService,
  theme: ThemeService
): SettingsService {
  let current: GlobalSettings = { ...DEFAULT_SETTINGS };

  return {
    get: () => ({ ...current }),

    set(partial: Partial<GlobalSettings>) {
      current = { ...current, ...partial };
      theme.applySettings(current);
      return storage.set(SETTINGS_KEY, current).catch(() => {});
    },

    async load(): Promise<GlobalSettings> {
      try {
        const stored = await storage.get<GlobalSettings>(SETTINGS_KEY);
        if (stored) current = { ...DEFAULT_SETTINGS, ...stored };
        theme.applySettings(current);
      } catch {
        current = { ...DEFAULT_SETTINGS };
        try {
          theme.applySettings(current);
        } catch { /* ignore */ }
      }
      return current;
    },
  };
}
