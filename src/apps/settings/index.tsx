import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import type { GlobalSettings, PixelOpticsPreset, FontSize, ThemePreset, Appearance } from '../../types/settings';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const OPTICS_OPTIONS: { value: PixelOpticsPreset; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'highContrastText', label: 'High contrast text' },
  { value: 'lowGhosting', label: 'Low ghosting' },
];

const FONT_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const THEME_OPTIONS: { value: ThemePreset; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'highContrast', label: 'High contrast' },
];

const APPEARANCE_OPTIONS: { value: Appearance; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function SettingsApp(context: AppContext): AppInstance {
  function SettingsUI() {
    const settingsSvc = context.services.settings;
    const [settings, setSettings] = useState<GlobalSettings>(() => settingsSvc.get());

    useEffect(() => {
      setSettings(settingsSvc.get());
    }, [settingsSvc]);

    const update = (partial: Partial<GlobalSettings>) => {
      const next = { ...settings, ...partial };
      setSettings(next);
      settingsSvc.set(partial);
    };

    return (
      <div class="settings-app">
        <section class="panel">
          <h2 class="panel-title">Pixel optics</h2>
          {OPTICS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              class={`btn ${settings.pixelOptics === opt.value ? 'btn-active' : ''}`}
              onClick={() => update({ pixelOptics: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </section>
        <section class="panel">
          <h2 class="panel-title">Font size</h2>
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              class={`btn ${settings.fontSize === opt.value ? 'btn-active' : ''}`}
              onClick={() => update({ fontSize: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </section>
        <section class="panel">
          <h2 class="panel-title">Theme</h2>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              class={`btn ${settings.theme === opt.value ? 'btn-active' : ''}`}
              onClick={() => update({ theme: opt.value })}
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
            >
              {opt.label}
            </button>
          ))}
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
