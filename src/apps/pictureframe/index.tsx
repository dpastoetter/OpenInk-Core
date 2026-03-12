import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { sanitizeUrl } from '@core/utils/url';

const isLegacy = typeof import.meta.env.LEGACY !== 'undefined' && import.meta.env.LEGACY;

interface PictureItem {
  id: string;
  src: string;
  name: string;
}

/** Legacy/Kindle: only local SVGs, no network, no heavy decode. Prevents crashes on e-ink. */
const LEGACY_GRAPHICS: PictureItem[] = [
  { id: 'pf-1', name: 'Sun', src: '/pictureframe/1-sun.svg' },
  { id: 'pf-2', name: 'Mountain', src: '/pictureframe/2-mountain.svg' },
  { id: 'pf-3', name: 'Tree', src: '/pictureframe/3-tree.svg' },
  { id: 'pf-4', name: 'Moon', src: '/pictureframe/4-moon.svg' },
];

/** Full list: local SVGs + external (modern only). */
const PREINSTALLED_GRAPHICS: PictureItem[] = [
  ...LEGACY_GRAPHICS,
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
  { id: 'pf-25', name: 'Cathedral', src: 'https://picsum.photos/seed/cathedral1/1200/800' },
  { id: 'pf-26', name: 'Tower', src: 'https://picsum.photos/seed/tower1/1200/800' },
  { id: 'pf-27', name: 'Monument', src: 'https://picsum.photos/seed/monument1/1200/800' },
  { id: 'pf-28', name: 'Palace', src: 'https://picsum.photos/seed/palace1/1200/800' },
  { id: 'pf-29', name: 'City square', src: 'https://picsum.photos/seed/square1/1200/800' },
  { id: 'pf-30', name: 'Park', src: 'https://picsum.photos/seed/park1/1200/800' },
  { id: 'pf-31', name: 'Lighthouse', src: 'https://picsum.photos/seed/lighthouse1/1200/800' },
  { id: 'pf-32', name: 'Castle', src: 'https://picsum.photos/seed/castle1/1200/800' },
  { id: 'pf-33', name: 'Downtown', src: 'https://picsum.photos/seed/downtown1/1200/800' },
  { id: 'pf-34', name: 'Seaside', src: 'https://picsum.photos/seed/seaside1/1200/800' },
  { id: 'pf-35', name: 'Vineyard', src: 'https://picsum.photos/seed/vineyard1/1200/800' },
  { id: 'pf-36', name: 'Alps', src: 'https://picsum.photos/seed/alps1/1200/800' },
];

const WAKE_DURATIONS = [
  { value: 0, label: '1 hour', ms: 60 * 60 * 1000 },
  { value: 1, label: '3 hours', ms: 3 * 60 * 60 * 1000 },
  { value: 2, label: '5 hours', ms: 5 * 60 * 60 * 1000 },
  { value: 3, label: '12 hours', ms: 12 * 60 * 60 * 1000 },
  { value: 4, label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: 5, label: 'Forever', ms: 0 },
] as const;

function PictureFrameApp(_context: AppContext): AppInstance {
  const allPictures = isLegacy
    ? LEGACY_GRAPHICS
    : PREINSTALLED_GRAPHICS.map((p) => ({
        ...p,
        src: p.src.startsWith('http') ? sanitizeUrl(p.src) || p.src : p.src,
      })).filter((p) => p.src.length > 0);

  function PictureFrameUI() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [wakeDurationIndex, setWakeDurationIndex] = useState(0);
    const [wakeActive, setWakeActive] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [wakeUnsupported, setWakeUnsupported] = useState(false);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasWakeLock = !isLegacy && typeof navigator !== 'undefined' && 'wakeLock' in navigator;
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

    if (!isLegacy && fullscreen && typeof document !== 'undefined' && document.body && current) {
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
              loading="lazy"
              decoding="async"
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
        {!isLegacy && (
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
        )}
        {!isLegacy && wakeUnsupported && (
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
