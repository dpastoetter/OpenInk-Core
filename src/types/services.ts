import type { GlobalSettings } from './settings';

/** Async key/value storage (e.g. localStorage-backed). Keys are namespaced by the implementation. */
export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

/** HTTP client wrapper (fetch with CORS/credentials defaults; fetchText/fetchJson helpers). */
export interface NetworkService {
  fetch(url: string, options?: RequestInit): Promise<Response>;
  fetchText(url: string): Promise<string>;
  fetchJson<T>(url: string): Promise<T>;
}

/** Current theme/settings applied to the document; read-only for apps. Subscribe for updates. */
export interface ThemeService {
  getSettings(): GlobalSettings;
  subscribe(listener: (settings: GlobalSettings) => void): () => void;
  applySettings(settings: GlobalSettings): void;
}

/** Persisted global settings; get/set/load. Updates are applied to the theme and persisted. */
export interface SettingsService {
  get(): GlobalSettings;
  set(partial: Partial<GlobalSettings>): Promise<void>;
  load(): Promise<GlobalSettings>;
}
