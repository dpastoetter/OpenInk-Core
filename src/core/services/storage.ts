const PREFIX = 'webos:';

export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

/** Simple wrapper around localStorage for low-spec; can be swapped for IndexedDB later. */
export function createStorageService(): StorageService {
  const prefixed = (key: string) => PREFIX + key;

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const raw = localStorage.getItem(prefixed(key));
        if (raw == null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T): Promise<void> {
      localStorage.setItem(prefixed(key), JSON.stringify(value));
    },

    async remove(key: string): Promise<void> {
      localStorage.removeItem(prefixed(key));
    },

    async keys(prefixFilter?: string): Promise<string[]> {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) {
          const bare = k.slice(PREFIX.length);
          if (!prefixFilter || bare.startsWith(prefixFilter)) out.push(bare);
        }
      }
      return out;
    },
  };
}
