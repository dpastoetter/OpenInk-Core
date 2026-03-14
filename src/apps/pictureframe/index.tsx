import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { sanitizeUrl } from '@core/utils/url';

interface PictureItem {
  id: string;
  src: string;
  name: string;
}

/** Inline SVG data URLs so Picture Frame works on Kindle (no path or external SVG dependency). */
function svgDataUrl(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg.trim().replace(/\s+/g, ' '));
}
const LOCAL_GRAPHICS: PictureItem[] = [
  { id: 'pf-1', name: 'Sun', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#1a1a2e"/><circle cx="16" cy="16" r="6" fill="#eaeaea"/><rect x="15" y="2" width="2" height="4" fill="#eaeaea"/><rect x="15" y="26" width="2" height="4" fill="#eaeaea"/><rect x="2" y="15" width="4" height="2" fill="#eaeaea"/><rect x="26" y="15" width="4" height="2" fill="#eaeaea"/><rect x="6" y="6" width="2" height="2" fill="#eaeaea"/><rect x="24" y="6" width="2" height="2" fill="#eaeaea"/><rect x="6" y="24" width="2" height="2" fill="#eaeaea"/><rect x="24" y="24" width="2" height="2" fill="#eaeaea"/></svg>') },
  { id: 'pf-2', name: 'Mountain', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#87ceeb"/><polygon points="0,32 8,20 16,24 24,12 32,32" fill="#4a5568"/><polygon points="4,32 12,24 20,28 28,16 32,32" fill="#2d3748"/><polygon points="0,32 6,26 14,30 22,22 32,32" fill="#1a202c"/><rect x="14" y="8" width="4" height="4" fill="#eaeaea"/></svg>') },
  { id: 'pf-3', name: 'Tree', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#1a2f1a"/><rect x="14" y="24" width="4" height="8" fill="#5d4e37"/><polygon points="16,4 6,20 26,20" fill="#2d5a27"/><polygon points="16,10 10,22 22,22" fill="#3d7a37"/><polygon points="16,14 12,24 20,24" fill="#4d9a47"/></svg>') },
  { id: 'pf-4', name: 'Moon', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#0f0f23"/><circle cx="20" cy="12" r="8" fill="#e8e4d9"/><circle cx="22" cy="10" r="8" fill="#0f0f23"/><circle cx="8" cy="26" r="1.5" fill="#6b7280"/><circle cx="24" cy="6" r="0.8" fill="#6b7280"/><circle cx="6" cy="8" r="0.6" fill="#6b7280"/></svg>') },
];

/** Full list: local SVGs + external (optional; network images can be heavy on e-ink). */
const PREINSTALLED_GRAPHICS: PictureItem[] = [
  ...LOCAL_GRAPHICS,
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
  { id: 'pf-37', name: 'Temple', src: 'https://picsum.photos/seed/temple1/1200/800' },
  { id: 'pf-38', name: 'Garden', src: 'https://picsum.photos/seed/garden2/1200/800' },
  { id: 'pf-39', name: 'Fjord', src: 'https://picsum.photos/seed/fjord1/1200/800' },
  { id: 'pf-40', name: 'Volcano', src: 'https://picsum.photos/seed/volcano1/1200/800' },
  { id: 'pf-41', name: 'Meadow', src: 'https://picsum.photos/seed/meadow1/1200/800' },
  { id: 'pf-42', name: 'Cliff', src: 'https://picsum.photos/seed/cliff1/1200/800' },
  { id: 'pf-43', name: 'Arch', src: 'https://picsum.photos/seed/arch1/1200/800' },
  { id: 'pf-44', name: 'Stadium', src: 'https://picsum.photos/seed/stadium1/1200/800' },
  { id: 'pf-45', name: 'Opera house', src: 'https://picsum.photos/seed/opera1/1200/800' },
  { id: 'pf-46', name: 'Museum', src: 'https://picsum.photos/seed/museum1/1200/800' },
  { id: 'pf-47', name: 'Fountain', src: 'https://picsum.photos/seed/fountain1/1200/800' },
  { id: 'pf-48', name: 'Cherry blossom', src: 'https://picsum.photos/seed/cherry1/1200/800' },
  { id: 'pf-49', name: 'Snow peak', src: 'https://picsum.photos/seed/snowpeak1/1200/800' },
  { id: 'pf-50', name: 'Waterfall', src: 'https://picsum.photos/seed/water2/1200/800' },
  { id: 'pf-51', name: 'Cape', src: 'https://picsum.photos/seed/cape1/1200/800' },
  { id: 'pf-52', name: 'Plaza', src: 'https://picsum.photos/seed/plaza1/1200/800' },
  { id: 'pf-53', name: 'Canal', src: 'https://picsum.photos/seed/canal1/1200/800' },
  { id: 'pf-54', name: 'Wildflowers', src: 'https://picsum.photos/seed/wildflowers1/1200/800' },
  { id: 'pf-55', name: 'Dunes', src: 'https://picsum.photos/seed/dunes1/1200/800' },
  { id: 'pf-56', name: 'Pagoda', src: 'https://picsum.photos/seed/pagoda1/1200/800' },
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
  const allPictures = PREINSTALLED_GRAPHICS.map((p) => ({
        ...p,
        src: p.src.startsWith('http') ? sanitizeUrl(p.src) || p.src : p.src,
      })).filter((p) => p.src.length > 0);
  /* Kindle/e-ink: use only local SVGs to avoid crashes and heavy decode. */
  const pictures = allPictures.filter((p) => !p.src.startsWith('http'));
  const usePictures = pictures.length > 0 ? pictures : allPictures;

  function PictureFrameUI() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [wakeDurationIndex, setWakeDurationIndex] = useState(0);
    const [wakeActive, setWakeActive] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [wakeUnsupported, setWakeUnsupported] = useState(false);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    const current = usePictures[Math.min(currentIndex, usePictures.length - 1)] ?? usePictures[0];

    useEffect(() => {
      if (usePictures.length > 0 && currentIndex >= usePictures.length) {
        setCurrentIndex(usePictures.length - 1);
      }
    }, [usePictures.length, currentIndex]);

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

    const openFullscreen = useCallback(() => {
      setFullscreen(true);
    }, []);

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

    const prev = () => setCurrentIndex((i) => (i === 0 ? usePictures.length - 1 : i - 1));
    const next = () => setCurrentIndex((i) => (i === usePictures.length - 1 ? 0 : i + 1));

    const fullscreenContent = current && (
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

    if (fullscreen && fullscreenContent) {
      if (typeof document !== 'undefined' && document.body) {
        return createPortal(fullscreenContent, document.body);
      }
      return fullscreenContent;
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
        <div class="pictureframe-fullscreen-row">
          <button type="button" class="btn" onClick={openFullscreen}>
            Full screen
          </button>
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
