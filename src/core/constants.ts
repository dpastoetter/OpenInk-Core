/**
 * Shared constants for low-spec e-ink build.
 * Single source for CORS and cache TTLs to keep policy consistent and bundle small.
 */

/** CORS proxy used for cross-origin requests (Reddit, News, Comics, Finance). */
export const CORS_PROXY = 'https://corsproxy.io/?';

/** Cache TTL: 30 minutes (feeds, weather, comics RSS). */
export const CACHE_TTL_SHORT_MS = 30 * 60 * 1000;

/** Cache TTL: 24 hours (long-lived API cache, e.g. comics RSS). */
export const CACHE_TTL_DAY_MS = 24 * 60 * 60 * 1000;

/** Resolve CORS proxy URL from settings (empty = use default). */
export function getCorsProxyUrl(corsProxyUrl: string | undefined): string {
  const u = (corsProxyUrl ?? '').trim();
  return u.length > 0 ? (u.endsWith('?') ? u : u + '?') : CORS_PROXY;
}

/** Default cache TTL in ms from settings preset. */
export function getDefaultCacheTtlMs(preset: '30m' | '6h' | '24h' | '7d'): number {
  switch (preset) {
    case '30m': return 30 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return CACHE_TTL_SHORT_MS;
  }
}
