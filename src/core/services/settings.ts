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

    async set(partial: Partial<GlobalSettings>) {
      current = { ...current, ...partial };
      theme.applySettings(current);
      await storage.set(SETTINGS_KEY, current);
    },

    async load(): Promise<GlobalSettings> {
      const stored = await storage.get<GlobalSettings>(SETTINGS_KEY);
      if (stored) current = { ...DEFAULT_SETTINGS, ...stored };
      theme.applySettings(current);
      return current;
    },
  };
}
