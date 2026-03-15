import { useState, useEffect } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import type {
  GlobalSettings,
  FontSize,
  Appearance,
} from '../../types/settings';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const FONT_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const APPEARANCE_OPTIONS: { value: Appearance; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function SettingsApp(context: AppContext): AppInstance {
  function SettingsUI() {
    const settingsSvc = context.services.settings;
    const storage = context.services.storage;
    const [settings, setSettings] = useState<GlobalSettings>(() => settingsSvc.get());
    const [clearCacheMessage, setClearCacheMessage] = useState<string | null>(null);

    useEffect(() => {
      setSettings(settingsSvc.get());
    }, [settingsSvc]);

    const update = (partial: Partial<GlobalSettings>) => {
      const next = { ...settings, ...partial };
      setSettings(next);
      settingsSvc.set(partial);
    };

    const handleClearCaches = async () => {
      setClearCacheMessage(null);
      try {
        const keys = await storage.keys();
        const appPrefixes = ['news:', 'reddit:', 'comics:', 'weather:', 'dictionary:', 'finance:'];
        let cleared = 0;
        for (const key of keys) {
          if (key === 'global-settings') continue;
          if (appPrefixes.some((p) => key.startsWith(p))) {
            await storage.remove(key);
            cleared++;
          }
        }
        setClearCacheMessage(cleared > 0 ? `Cleared ${cleared} cache entries.` : 'No app caches to clear.');
      } catch {
        setClearCacheMessage('Could not clear caches.');
      }
    };

    const appVersion = '0.1.1';

    return (
      <div class="settings-app">
        <section class="panel">
          <h2 class="panel-title">Font size</h2>
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              class={`btn ${settings.fontSize === opt.value ? 'btn-active' : ''}`}
              onClick={() => update({ fontSize: opt.value })}
              onTouchEnd={(e) => { e.preventDefault(); update({ fontSize: opt.value }); }}
            >
              {opt.label}
            </button>
          ))}
        </section>
        <section class="panel">
          <h2 class="panel-title">Appearance</h2>
          {APPEARANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              class={`btn ${settings.appearance === opt.value ? 'btn-active' : ''}`}
              onClick={() => update({ appearance: opt.value })}
              onTouchEnd={(e) => { e.preventDefault(); update({ appearance: opt.value }); }}
            >
              {opt.label}
            </button>
          ))}
        </section>
        <section class="panel">
          <h2 class="panel-title">Data</h2>
          <p class="panel-description">Clear cached data for Reddit, Comics, Weather, etc.</p>
          <button type="button" class="btn" onClick={handleClearCaches} onTouchEnd={(e) => { e.preventDefault(); handleClearCaches(); }}>Clear all caches</button>
          {clearCacheMessage && <p class="settings-import-message" role="status">{clearCacheMessage}</p>}
        </section>
        <section class="panel">
          <h2 class="panel-title">About</h2>
          <p class="panel-description">LibreInk v{appVersion}. Lightweight shell for e-ink and low-spec devices.</p>
        </section>
      </div>
    );
  }

  return {
    render: () => <SettingsUI />,
    getTitle: () => 'Settings',
  };
}

export const settingsApp = {
  id: 'settings',
  name: 'Settings',
  icon: '🔧',
  category: 'system' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { permissions: [] },
  launch: SettingsApp,
};
