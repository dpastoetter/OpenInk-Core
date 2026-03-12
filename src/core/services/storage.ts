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

/** In-memory storage when localStorage is missing or throws (e.g. Kindle). */
function createMemoryStorage(): StorageService {
  const map = new Map<string, string>();
  return {
    async get<T>(key: string): Promise<T | null> {
      if (!validateKey(key)) return null;
      try {
        const raw = map.get(PREFIX + key);
        if (raw == null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      if (!validateKey(key)) return;
      try {
        map.set(PREFIX + key, JSON.stringify(value));
      } catch { /* ignore */ }
    },
    async remove(key: string): Promise<void> {
      if (!validateKey(key)) return;
      map.delete(PREFIX + key);
    },
    async keys(prefixFilter?: string): Promise<string[]> {
      const out: string[] = [];
      for (const k of map.keys()) {
        if (!k.startsWith(PREFIX)) continue;
        const bare = k.slice(PREFIX.length);
        if (!validateKey(bare)) continue;
        if (!prefixFilter || bare.startsWith(prefixFilter)) out.push(bare);
      }
      return out;
    },
  };
}

/** Simple wrapper around localStorage; falls back to in-memory when localStorage throws (e.g. Kindle). */
export function createStorageService(): StorageService {
  let storage: Storage | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.getItem('_');
      storage = localStorage;
    }
  } catch {
    storage = null;
  }
  if (!storage) return createMemoryStorage();

  const prefixed = (key: string) => PREFIX + key;

  return {
    async get<T>(key: string): Promise<T | null> {
      if (!validateKey(key)) return null;
      try {
        const raw = storage!.getItem(prefixed(key));
        if (raw == null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      if (!validateKey(key)) return;
      try {
        storage!.setItem(prefixed(key), JSON.stringify(value));
      } catch { /* ignore */ }
    },

    async remove(key: string): Promise<void> {
      if (!validateKey(key)) return;
      try {
        storage!.removeItem(prefixed(key));
      } catch { /* ignore */ }
    },

    async keys(prefixFilter?: string): Promise<string[]> {
      const out: string[] = [];
      try {
        for (let i = 0; i < storage!.length; i++) {
          const k = storage!.key(i);
          if (k?.startsWith(PREFIX)) {
            const bare = k.slice(PREFIX.length);
            if (!validateKey(bare)) continue;
            if (!prefixFilter || bare.startsWith(prefixFilter)) out.push(bare);
          }
        }
      } catch { /* ignore */ }
      return out;
    },
  };
}
