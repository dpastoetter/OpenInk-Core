/**
 * No-op in production. In dev, only sends when VITE_DEBUG_INGEST_URL is set
 * (e.g. in .env.local), so no credentials or endpoint IDs are committed.
 */
export function debugIngest(_payload: Record<string, unknown>): void {
  if (typeof import.meta.env.DEV !== 'boolean' || !import.meta.env.DEV) return;
  const url = import.meta.env.VITE_DEBUG_INGEST_URL;
  if (typeof url !== 'string' || url.trim() === '') return;
  try {
    const sessionId = typeof import.meta.env.VITE_DEBUG_SESSION_ID === 'string'
      ? import.meta.env.VITE_DEBUG_SESSION_ID.trim()
      : '';
    fetch(url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(sessionId && { 'X-Debug-Session-Id': sessionId }) },
      body: JSON.stringify({ ...(sessionId && { sessionId }), ..._payload, timestamp: Date.now() }),
    }).catch(() => {});
  } catch {
    /* no-op */
  }
}
