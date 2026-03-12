import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { isSafeUrl, sanitizeUrl } from '@core/utils/url';

const STORAGE_KEY = 'pictureframe:custom';

interface PictureItem {
  id: string;
  src: string;
  name: string;
}

interface CustomPicture {
  id: string;
  url: string;
  name: string;
}

const PREINSTALLED_GRAPHICS: PictureItem[] = [
  { id: 'pf-1', name: 'Sun', src: '/pictureframe/1-sun.svg' },
  { id: 'pf-2', name: 'Mountain', src: '/pictureframe/2-mountain.svg' },
  { id: 'pf-3', name: 'Tree', src: '/pictureframe/3-tree.svg' },
  { id: 'pf-4', name: 'Moon', src: '/pictureframe/4-moon.svg' },
  { id: 'pf-5', name: 'Ocean', src: 'https://picsum.photos/seed/ocean2/1200/800' },
  { id: 'pf-6', name: 'Forest', src: 'https://picsum.photos/seed/forest2/1200/800' },
  { id: 'pf-7', name: 'Sunset', src: 'https://picsum.photos/seed/sunset2/1200/800' },
  { id: 'pf-8', name: 'Lake', src: 'https://picsum.photos/seed/lake2/1200/800' },
  { id: 'pf-9', name: 'Canyon', src: 'https://picsum.photos/seed/canyon2/1200/800' },
  { id: 'pf-10', name: 'Waterfall', src: 'https://picsum.photos/seed/waterfall2/1200/800' },
  { id: 'pf-11', name: 'Desert', src: 'https://picsum.photos/seed/desert2/1200/800' },
  { id: 'pf-12', name: 'Coast', src: 'https://picsum.photos/seed/coast2/1200/800' },
  { id: 'pf-13', name: 'Hills', src: 'https://picsum.photos/seed/hills2/1200/800' },
  { id: 'pf-14', name: 'Valley', src: 'https://picsum.photos/seed/valley1/1200/800' },
  { id: 'pf-15', name: 'River', src: 'https://picsum.photos/seed/river1/1200/800' },
  { id: 'pf-16', name: 'Beach', src: 'https://picsum.photos/seed/beach1/1200/800' },
  { id: 'pf-17', name: 'City skyline', src: 'https://picsum.photos/seed/skyline1/1200/800' },
  { id: 'pf-18', name: 'City street', src: 'https://picsum.photos/seed/citystreet1/1200/800' },
  { id: 'pf-19', name: 'Bridge', src: 'https://picsum.photos/seed/bridge1/1200/800' },
  { id: 'pf-20', name: 'Landmark', src: 'https://picsum.photos/seed/landmark1/1200/800' },
  { id: 'pf-21', name: 'Harbour', src: 'https://picsum.photos/seed/harbour1/1200/800' },
  { id: 'pf-22', name: 'Mountain peak', src: 'https://picsum.photos/seed/peak1/1200/800' },
  { id: 'pf-23', name: 'Aurora', src: 'https://picsum.photos/seed/aurora2/1200/800' },
  { id: 'pf-24', name: 'Tropical', src: 'https://picsum.photos/seed/tropical2/1200/800' },
];

const PICSUM_LIST_URL = 'https://picsum.photos/v2/list?page=1&limit=20';

function buildAllPictures(custom: CustomPicture[]): PictureItem[] {
  const customItems: PictureItem[] = custom
    .map((c) => ({ id: c.id, src: sanitizeUrl(c.url), name: c.name }))
    .filter((x) => x.src.length > 0);
  return [...PREINSTALLED_GRAPHICS, ...customItems];
}

const WAKE_DURATIONS = [
  { value: 0, label: '1 hour', ms: 60 * 60 * 1000 },
  { value: 1, label: '3 hours', ms: 3 * 60 * 60 * 1000 },
  { value: 2, label: '5 hours', ms: 5 * 60 * 60 * 1000 },
  { value: 3, label: '12 hours', ms: 12 * 60 * 60 * 1000 },
  { value: 4, label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: 5, label: 'Forever', ms: 0 },
] as const;

function PictureFrameApp(context: AppContext): AppInstance {
  const { storage, network } = context.services;

  function PictureFrameUI() {
    const [custom, setCustom] = useState<CustomPicture[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [wakeDurationIndex, setWakeDurationIndex] = useState(0);
    const [wakeActive, setWakeActive] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [wakeUnsupported, setWakeUnsupported] = useState(false);
    const [addUrl, setAddUrl] = useState('');
    const [browseResults, setBrowseResults] = useState<Array<{ id: string; download_url: string; author: string }>>([]);
    const [browseLoading, setBrowseLoading] = useState(false);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

    useEffect(() => {
      storage.get<CustomPicture[]>(STORAGE_KEY).then((data) => {
        if (Array.isArray(data) && data.length > 0) setCustom(data);
        setLoaded(true);
      });
    }, [storage]);

    const persistCustom = useCallback(
      (next: CustomPicture[]) => {
        setCustom(next);
        storage.set(STORAGE_KEY, next);
      },
      [storage]
    );

    const allPictures = buildAllPictures(custom);
    const current = allPictures[Math.min(currentIndex, allPictures.length - 1)] ?? allPictures[0];

    useEffect(() => {
      if (allPictures.length > 0 && currentIndex >= allPictures.length) {
        setCurrentIndex(allPictures.length - 1);
      }
    }, [allPictures.length, currentIndex]);

    const releaseWakeLock = useCallback(async () => {
      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch { /* wake lock release can fail if already released */ }
        wakeLockRef.current = null;
      }
      setWakeActive(false);
    }, []);

    const requestWakeLockOnly = useCallback(async () => {
      try {
        const sentinel = await (navigator as Navigator & { wakeLock: { request(t: string): Promise<WakeLockSentinel> } }).wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setWakeActive(true);
      } catch { /* wake lock not supported or denied */ }
    }, []);

    const startFullscreen = useCallback(async () => {
      if (!hasWakeLock) {
        setWakeUnsupported(true);
        return;
      }
      setWakeUnsupported(false);
      await releaseWakeLock();
      try {
        await requestWakeLockOnly();
        setFullscreen(true);
        const duration = WAKE_DURATIONS[wakeDurationIndex];
        if (duration.ms > 0) {
          releaseTimerRef.current = setTimeout(() => {
            releaseWakeLock();
          }, duration.ms);
        }
      } catch {
        setWakeUnsupported(true);
      }
    }, [hasWakeLock, wakeDurationIndex, releaseWakeLock, requestWakeLockOnly]);

    const closeFullscreen = useCallback(() => {
      setFullscreen(false);
      releaseWakeLock();
    }, [releaseWakeLock]);

    useEffect(() => {
      if (!hasWakeLock || !wakeActive) return;
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible' && wakeLockRef.current === null) {
          const duration = WAKE_DURATIONS[wakeDurationIndex];
          if (duration.ms === 0) requestWakeLockOnly();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [hasWakeLock, wakeActive, wakeDurationIndex, requestWakeLockOnly]);

    useEffect(() => {
      return () => {
        if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
        if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
      };
    }, []);

    const prev = () => setCurrentIndex((i) => (i === 0 ? allPictures.length - 1 : i - 1));
    const next = () => setCurrentIndex((i) => (i === allPictures.length - 1 ? 0 : i + 1));

    const addByUrl = useCallback(() => {
      const url = addUrl.trim();
      if (!url || !isSafeUrl(url)) return;
      const newItem: CustomPicture = {
        id: `pf-custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        url,
        name: `Custom ${custom.length + 1}`,
      };
      persistCustom([...custom, newItem]);
      setAddUrl('');
    }, [addUrl, custom, persistCustom]);

    const addFromBrowse = useCallback(
      (url: string, name: string) => {
        const safe = sanitizeUrl(url);
        if (!safe) return;
        const newItem: CustomPicture = {
          id: `pf-custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          url: safe,
          name: name || 'Photo',
        };
        persistCustom([...custom, newItem]);
      },
      [custom, persistCustom]
    );

    const removeCustom = useCallback(
      (id: string) => {
        const nextList = custom.filter((c) => c.id !== id);
        persistCustom(nextList);
        const newLen = PREINSTALLED_GRAPHICS.length + nextList.length;
        setCurrentIndex((i) => Math.min(i, Math.max(0, newLen - 1)));
      },
      [custom, persistCustom]
    );

    const searchBrowse = useCallback(async () => {
      setBrowseLoading(true);
      setBrowseResults([]);
      try {
        const list = await network.fetchJson<Array<{ id: string; download_url: string; author: string }>>(PICSUM_LIST_URL);
        setBrowseResults(Array.isArray(list) ? list : []);
      } catch {
        setBrowseResults([]);
      } finally {
        setBrowseLoading(false);
      }
    }, [network]);

    if (!loaded) {
      return (
        <div class="pictureframe-app">
          <p class="pictureframe-loading">Loading…</p>
        </div>
      );
    }

    if (fullscreen && typeof document !== 'undefined' && current) {
      const fullscreenEl = (
        <div class="pictureframe-fullscreen" role="dialog" aria-label="Picture frame full screen">
          <button
            type="button"
            class="pictureframe-fullscreen-close"
            onClick={closeFullscreen}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={current.src}
            alt={current.name}
            class="pictureframe-fullscreen-img"
          />
        </div>
      );
      return createPortal(fullscreenEl, document.body);
    }

    return (
      <div class="pictureframe-app">
        <div class="pictureframe-display">
          {current && (
            <img
              src={current.src}
              alt={current.name}
              class="pictureframe-img"
            />
          )}
        </div>
        <div class="pictureframe-controls">
          <button type="button" class="btn pictureframe-nav" onClick={prev} aria-label="Previous">
            ‹
          </button>
          <span class="pictureframe-name">{current?.name ?? '—'}</span>
          <button type="button" class="btn pictureframe-nav" onClick={next} aria-label="Next">
            ›
          </button>
        </div>
        <div class="pictureframe-add">
          <label class="pictureframe-add-label" htmlFor="pictureframe-url">Add picture</label>
          <div class="pictureframe-add-url">
            <input
              id="pictureframe-url"
              type="url"
              class="input pictureframe-input"
              placeholder="Paste image URL"
              value={addUrl}
              onInput={(e) => setAddUrl((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && addByUrl()}
              aria-label="Image URL"
            />
            <button type="button" class="btn" onClick={addByUrl}>
              Add
            </button>
          </div>
          <div class="pictureframe-browse">
            <button
              type="button"
              class="btn btn-secondary"
              onClick={searchBrowse}
              disabled={browseLoading}
            >
              {browseLoading ? 'Loading…' : 'Browse sample photos'}
            </button>
            {browseResults.length > 0 && (
              <div class="pictureframe-browse-grid">
                {browseResults.map((p) => {
                  const safeSrc = sanitizeUrl(p.download_url);
                  return (
                    <div key={p.id} class="pictureframe-browse-item">
                      {safeSrc ? <img src={safeSrc} alt={p.author} class="pictureframe-browse-thumb" /> : null}
                      <button
                        type="button"
                        class="btn btn-small"
                        onClick={() => addFromBrowse(p.download_url, p.author)}
                      >
                        Add
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {custom.length > 0 && (
            <div class="pictureframe-custom-list">
              <span class="pictureframe-custom-label">Your pictures:</span>
              {custom.map((c) => (
                <span key={c.id} class="pictureframe-custom-item">
                  {c.name}
                  <button type="button" class="btn btn-small btn-ghost" onClick={() => removeCustom(c.id)} aria-label="Remove">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div class="pictureframe-wake">
          <label class="pictureframe-wake-label" htmlFor="pictureframe-wake-duration">Keep screen on</label>
          <select
            id="pictureframe-wake-duration"
            class="input pictureframe-select"
            value={wakeDurationIndex}
            onChange={(e) => setWakeDurationIndex(Number((e.target as HTMLSelectElement).value))}
            aria-label="Duration"
          >
            {WAKE_DURATIONS.map((d, i) => (
              <option key={d.value} value={i}>
                {d.label}
              </option>
            ))}
          </select>
          {wakeActive && !fullscreen ? (
            <button type="button" class="btn btn-secondary" onClick={releaseWakeLock}>
              Cancel
            </button>
          ) : (
            <button
              type="button"
              class="btn"
              onClick={startFullscreen}
              disabled={!hasWakeLock}
            >
              Start
            </button>
          )}
        </div>
        {wakeUnsupported && (
          <p class="pictureframe-unsupported">Keep-awake not supported in this browser.</p>
        )}
      </div>
    );
  }

  return {
    render: () => <PictureFrameUI />,
    getTitle: () => 'Picture Frame',
  };
}

export const pictureframeApp = {
  id: 'pictureframe',
  name: 'Picture Frame',
  icon: '🖼️',
  iconFallback: '[ ]',
  category: 'system' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: PictureFrameApp,
};
