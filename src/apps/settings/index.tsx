import { useState, useEffect, useRef } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import type { GlobalSettings, PixelOpticsPreset, ColorMode, FontSize, ThemePreset, Appearance } from '../../types/settings';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const SETTINGS_CSV_KEYS: (keyof GlobalSettings)[] = ['pixelOptics', 'colorMode', 'fontSize', 'theme', 'appearance', 'zoom'];

function exportSettingsToCsv(settings: GlobalSettings): string {
  const header = SETTINGS_CSV_KEYS.join(',');
  const row = SETTINGS_CSV_KEYS.map((k) => String(settings[k])).join(',');
  return `${header}\n${row}`;
}

const VALID: Record<keyof GlobalSettings, string[]> = {
  pixelOptics: ['standard', 'highContrastText', 'lowGhosting'],
  colorMode: ['grayscale', 'color'],
  fontSize: ['small', 'medium', 'large'],
  theme: ['normal', 'highContrast'],
  appearance: ['light', 'dark'],
  zoom: [], // number, validated separately
};

function parseSettingsFromCsv(csv: string): Partial<GlobalSettings> | null {
  const lines = csv.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  const header = lines[0].split(',').map((s) => s.trim());
  const values = lines[1].split(',').map((s) => s.trim());
  const out: Partial<GlobalSettings> = {};
  for (let i = 0; i < header.length && i < values.length; i++) {
    const key = header[i] as keyof GlobalSettings;
    if (!SETTINGS_CSV_KEYS.includes(key)) continue;
    const val = values[i];
    if (key === 'zoom') {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0.5 || n > 2) continue;
      out.zoom = n;
    } else {
      const allowed = VALID[key];
      if (allowed && allowed.length && !allowed.includes(val)) continue;
      (out as Record<string, string>)[key] = val;
    }
  }
  return Object.keys(out).length ? out : null;
}

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
    const [importMessage, setImportMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      setSettings(settingsSvc.get());
    }, [settingsSvc]);

    const update = (partial: Partial<GlobalSettings>) => {
      const next = { ...settings, ...partial };
      setSettings(next);
      settingsSvc.set(partial);
    };

    const handleExport = () => {
      const csv = exportSettingsToCsv(settingsSvc.get());
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openink-settings-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
      setImportMessage(null);
      fileInputRef.current?.click();
    };

    const handleImportFile = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const parsed = parseSettingsFromCsv(text);
        if (parsed) {
          settingsSvc.set(parsed).then(() => {
            setSettings(settingsSvc.get());
            setImportMessage('Settings restored.');
          }).catch(() => setImportMessage('Could not save.'));
        } else {
          setImportMessage('Invalid or unsupported CSV.');
        }
      };
      reader.readAsText(file, 'UTF-8');
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
        <section class="panel">
          <h2 class="panel-title">Export / Import</h2>
          <p class="panel-description">Export your settings to a CSV file or restore from a previously exported file.</p>
          <button type="button" class="btn" onClick={handleExport}>
            Export settings (CSV)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-hidden="true"
            style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;"
            onChange={handleImportFile}
          />
          <button type="button" class="btn" onClick={handleImportClick}>
            Import settings (CSV)
          </button>
          {importMessage && <p class="settings-import-message" role="status">{importMessage}</p>}
        </section>
        <section class="panel">
          <h2 class="panel-title">Demo</h2>
          <a href="/demo/eink-demo.html" class="btn">E-ink demo</a>
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
