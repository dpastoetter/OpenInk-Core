export interface NetworkService {
  fetch(url: string, options?: RequestInit): Promise<Response>;
  fetchText(url: string): Promise<string>;
  fetchJson<T>(url: string): Promise<T>;
}

/** Wrapper around fetch with basic error handling; no heavy retry logic to keep bundle small. */
export function createNetworkService(): NetworkService {
  return {
    async fetch(url: string, options?: RequestInit): Promise<Response> {
      const res = await fetch(url, {
        ...options,
        credentials: 'omit',
        mode: 'cors',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res;
    },

    async fetchText(url: string): Promise<string> {
      const res = await this.fetch(url);
      return res.text();
    },

    async fetchJson<T>(url: string): Promise<T> {
      const res = await this.fetch(url);
      return res.json() as Promise<T>;
    },
  };
}
