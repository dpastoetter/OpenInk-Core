import { useState, useEffect, useRef } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import type {
  GlobalSettings,
  FontSize,
  Appearance,
} from '../../types/settings';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const SETTINGS_CSV_KEYS: (keyof GlobalSettings)[] = [
  'pixelOptics', 'colorMode', 'fontSize', 'theme', 'appearance', 'zoom',
  'reduceMotion', 'lineHeight', 'contentWidth', 'letterSpacing',
  'showClock', 'timeFormat', 'showAppTitle',
  'showGamesSection', 'appsPerRow', 'sortOrder',
  'defaultCacheTtl', 'offlinePreference',
  'tapTargetSize', 'focusRing', 'highContrastFocus',
  'invertColors', 'reduceFlashes', 'simpleLayout',
  'financeItems',
  'redditSubreddits',
  'blogFeeds',
  'worldClockZones',
];

function exportSettingsToCsv(settings: GlobalSettings): string {
  const header = SETTINGS_CSV_KEYS.join(',');
  const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const row = SETTINGS_CSV_KEYS.map((k) => {
    const v = settings[k];
    return escape(String(v === undefined ? '' : v));
  }).join(',');
  return `${header}\n${row}`;
}

const VALID: Partial<Record<keyof GlobalSettings, string[]>> = {
  pixelOptics: ['standard', 'highContrastText', 'lowGhosting'],
  colorMode: ['grayscale', 'color'],
  fontSize: ['small', 'medium', 'large'],
  theme: ['normal', 'highContrast'],
  appearance: ['light', 'dark'],
  reduceMotion: ['system', 'always', 'never'],
  lineHeight: ['compact', 'normal', 'relaxed'],
  contentWidth: ['narrow', 'medium', 'full'],
  letterSpacing: ['tight', 'normal', 'wide'],
  timeFormat: ['12h', '24h'],
  appsPerRow: ['auto', '2', '3', '4'],
  sortOrder: ['a-z', 'z-a'],
  defaultCacheTtl: ['30m', '6h', '24h', '7d'],
  offlinePreference: ['preferCache', 'ask', 'block'],
  tapTargetSize: ['normal', 'large', 'extraLarge'],
  focusRing: ['always', 'keyboard', 'never'],
};

function parseSettingsFromCsv(csv: string): Partial<GlobalSettings> | null {
  const lines = csv.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  const header = lines[0].split(',').map((s) => s.trim());
  const raw = lines[1];
  const values: string[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '"') {
      let v = '';
      i++;
      while (i < raw.length && (raw[i] !== '"' || raw[i + 1] === '"')) {
        v += raw[i] === '"' ? '' : raw[i];
        i++;
      }
      if (raw[i] === '"') i++;
      values.push(v);
      if (raw[i] === ',') i++;
    } else {
      const end = raw.indexOf(',', i);
      const v = end === -1 ? raw.slice(i) : raw.slice(i, end);
      values.push(v.trim());
      i = end === -1 ? raw.length : end + 1;
    }
  }
  const out: Partial<GlobalSettings> = {};
  for (let j = 0; j < header.length && j < values.length; j++) {
    const key = header[j] as keyof GlobalSettings;
    if (!SETTINGS_CSV_KEYS.includes(key)) continue;
    const val = values[j];
    if (key === 'zoom') {
      const n = Number(val);
      if (Number.isFinite(n) && n >= 0.5 && n <= 2) out.zoom = n;
    } else if (key === 'financeItems') {
      if (val && val.trim()) out.financeItems = val.trim();
    } else if (key === 'redditSubreddits') {
      if (val && val.trim()) out.redditSubreddits = val.trim();
    } else if (key === 'blogFeeds') {
      if (val && val.trim()) out.blogFeeds = val.trim();
    } else if (key === 'worldClockZones') {
      if (val && val.trim()) out.worldClockZones = val.trim();
    } else if (key === 'showClock' || key === 'showAppTitle' || key === 'showGamesSection' || key === 'highContrastFocus' || key === 'invertColors' || key === 'reduceFlashes' || key === 'simpleLayout') {
      out[key] = val === 'true';
    } else {
      const allowed = VALID[key];
      if (allowed && allowed.length && !allowed.includes(val)) continue;
      (out as Record<string, unknown>)[key] = val;
    }
  }
  return Object.keys(out).length ? out : null;
}

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
    const [importMessage, setImportMessage] = useState<string | null>(null);
    const [clearCacheMessage, setClearCacheMessage] = useState<string | null>(null);
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
          <div class="settings-row">
            <span>Simple layout (e-ink)</span>
            <button
              type="button"
              class={`btn ${settings.simpleLayout ? 'btn-active' : ''}`}
              onClick={() => update({ simpleLayout: !settings.simpleLayout })}
            >
              {settings.simpleLayout ? 'On' : 'Off'}
            </button>
          </div>
          <p class="panel-description">Hides search/filter UIs and uses larger font for e-ink.</p>
        </section>
        <section class="panel">
          <h2 class="panel-title">Data</h2>
          <p class="panel-description">Clear cached data for News, Reddit, Comics, Weather, etc.</p>
          <button type="button" class="btn" onClick={handleClearCaches}>Clear all caches</button>
          {clearCacheMessage && <p class="settings-import-message" role="status">{clearCacheMessage}</p>}
        </section>
        <section class="panel">
          <h2 class="panel-title">About</h2>
          <p class="panel-description">OpenInk v{appVersion}. Lightweight webOS-style shell for e-ink and low-spec devices.</p>
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
