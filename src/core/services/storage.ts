const PREFIX = 'webos:';

/** Allowed key characters (alphanumeric, hyphen, underscore, colon, dot, % for encoded URLs). Prevents injection and control chars. */
const SAFE_KEY_REGEX = /^[a-zA-Z0-9_\-:.%]+$/;
const MAX_KEY_LENGTH = 512;

function validateKey(key: string): boolean {
  return typeof key === 'string' && key.length > 0 && key.length <= MAX_KEY_LENGTH && SAFE_KEY_REGEX.test(key);
}

export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

/** Simple wrapper around localStorage for low-spec; can be swapped for IndexedDB later. Keys are validated for safety. */
export function createStorageService(): StorageService {
  const prefixed = (key: string) => PREFIX + key;

  return {
    async get<T>(key: string): Promise<T | null> {
      if (!validateKey(key)) return null;
      try {
        const raw = localStorage.getItem(prefixed(key));
        if (raw == null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      if (!validateKey(key)) return;
      try {
        localStorage.setItem(prefixed(key), JSON.stringify(value));
      } catch {
        // QuotaExceeded or similar; fail silently for cache/prefs
      }
    },

    async remove(key: string): Promise<void> {
      if (!validateKey(key)) return;
      localStorage.removeItem(prefixed(key));
    },

    async keys(prefixFilter?: string): Promise<string[]> {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) {
          const bare = k.slice(PREFIX.length);
          if (!validateKey(bare)) continue;
          if (!prefixFilter || bare.startsWith(prefixFilter)) out.push(bare);
        }
      }
      return out;
    },
  };
}
