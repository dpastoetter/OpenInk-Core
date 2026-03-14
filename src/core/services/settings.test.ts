import { describe, it, expect } from 'vitest';
import { createStorageService } from './storage';
import type { ThemeService } from './theme';
import { createSettingsService } from './settings';
import { DEFAULT_SETTINGS } from '../../types/settings';

function createMockTheme(): ThemeService {
  let settings = { ...DEFAULT_SETTINGS };
  return {
    getSettings: () => ({ ...settings }),
    subscribe: () => () => {},
    applySettingsMinimal: (s) => { settings = s; },
    applySettings: (s) => { settings = s; },
  };
}

describe('SettingsService', () => {
  it('load returns default settings when nothing stored', async () => {
    const storage = createStorageService();
    const theme = createMockTheme();
    const settings = createSettingsService(storage, theme);
    const loaded = await settings.load();
    expect(loaded.pixelOptics).toBe(DEFAULT_SETTINGS.pixelOptics);
    expect(loaded.colorMode).toBe(DEFAULT_SETTINGS.colorMode);
  });

  it('set persists and updates theme', async () => {
    const storage = createStorageService();
    const theme = createMockTheme();
    const settings = createSettingsService(storage, theme);
    await settings.load();
    await settings.set({ colorMode: 'color' });
    expect(settings.get().colorMode).toBe('color');
    const stored = await storage.get<typeof DEFAULT_SETTINGS>('global-settings');
    expect(stored?.colorMode).toBe('color');
  });
});
