import { useState, useCallback, useEffect } from 'preact/hooks';
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
  { id: 'pf-1b', name: 'Star', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#1a1a2e"/><polygon points="16,2 18,12 28,12 20,18 23,28 16,22 9,28 12,18 4,12 14,12" fill="#fef3c7"/></svg>') },
  { id: 'pf-2b', name: 'Flower', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#ecfdf5"/><circle cx="16" cy="16" r="4" fill="#fbbf24"/><circle cx="16" cy="10" r="3" fill="#f472b6"/><circle cx="22" cy="14" r="3" fill="#f472b6"/><circle cx="22" cy="20" r="3" fill="#f472b6"/><circle cx="16" cy="24" r="3" fill="#f472b6"/><circle cx="10" cy="20" r="3" fill="#f472b6"/><circle cx="10" cy="14" r="3" fill="#f472b6"/><rect x="15" y="24" width="2" height="6" fill="#15803d"/></svg>') },
  { id: 'pf-3b', name: 'House', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#93c5fd"/><polygon points="16,4 4,14 4,28 28,28 28,14" fill="#fef3c7"/><rect x="14" y="18" width="4" height="10" fill="#78350f"/><rect x="6" y="14" width="4" height="4" fill="#93c5fd"/><rect x="22" y="14" width="4" height="4" fill="#93c5fd"/></svg>') },
  { id: 'pf-4b', name: 'Cloud', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#7dd3fc"/><ellipse cx="16" cy="18" rx="10" ry="6" fill="#f8fafc"/><ellipse cx="10" cy="16" rx="6" ry="5" fill="#f8fafc"/><ellipse cx="22" cy="16" rx="6" ry="5" fill="#f8fafc"/></svg>') },
  { id: 'pf-5b', name: 'Boat', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#0ea5e9"/><polygon points="6,24 8,18 24,18 26,24" fill="#78716c"/><rect x="15" y="8" width="2" height="12" fill="#a8a29e"/><polygon points="16,6 20,14 16,20 12,14" fill="#fef3c7"/><path d="M4 26 L28 26" stroke="#1e3a5f" stroke-width="2"/></svg>') },
  { id: 'pf-6b', name: 'Heart', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#fce7f3"/><path d="M16 26 C16 26 4 18 4 12 C4 8 8 6 12 6 C14 6 16 8 16 8 C16 8 18 6 20 6 C24 6 28 8 28 12 C28 18 16 26 16 26 Z" fill="#e11d48"/></svg>') },
  { id: 'pf-7b', name: 'Leaf', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#dcfce7"/><path d="M16 4 Q28 12 24 28 Q16 20 8 28 Q4 14 16 4 Z" fill="#16a34a"/><path d="M16 6 L16 26" stroke="#15803d" stroke-width="1" fill="none"/></svg>') },
  { id: 'pf-8b', name: 'Umbrella', src: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"><rect width="32" height="32" fill="#94a3b8"/><path d="M16 4 C8 4 4 12 4 18 L16 18 L28 18 C28 12 24 4 16 4 Z" fill="#f472b6"/><rect x="15" y="18" width="2" height="10" fill="#78716c"/><line x1="16" y1="28" x2="16" y2="32" stroke="#64748b" stroke-width="1"/></svg>') },
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
  { id: 'pf-57', name: 'Rooftop', src: 'https://picsum.photos/seed/rooftop1/1200/800' },
  { id: 'pf-58', name: 'Pier', src: 'https://picsum.photos/seed/pier1/1200/800' },
  { id: 'pf-59', name: 'Cottage', src: 'https://picsum.photos/seed/cottage1/1200/800' },
  { id: 'pf-60', name: 'Windmill', src: 'https://picsum.photos/seed/windmill1/1200/800' },
  { id: 'pf-61', name: 'Cliffs', src: 'https://picsum.photos/seed/cliffs2/1200/800' },
  { id: 'pf-62', name: 'Island', src: 'https://picsum.photos/seed/island1/1200/800' },
  { id: 'pf-63', name: 'Ridge', src: 'https://picsum.photos/seed/ridge1/1200/800' },
  { id: 'pf-64', name: 'Mist', src: 'https://picsum.photos/seed/mist1/1200/800' },
  { id: 'pf-65', name: 'Autumn', src: 'https://picsum.photos/seed/autumn1/1200/800' },
  { id: 'pf-66', name: 'Spring', src: 'https://picsum.photos/seed/spring1/1200/800' },
  { id: 'pf-67', name: 'Winter', src: 'https://picsum.photos/seed/winter1/1200/800' },
  { id: 'pf-68', name: 'Summer', src: 'https://picsum.photos/seed/summer1/1200/800' },
  { id: 'pf-69', name: 'Bay', src: 'https://picsum.photos/seed/bay1/1200/800' },
  { id: 'pf-70', name: 'Meadows', src: 'https://picsum.photos/seed/meadows2/1200/800' },
];

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
    const [fullscreen, setFullscreen] = useState(false);
    const current = usePictures[Math.min(currentIndex, usePictures.length - 1)] ?? usePictures[0];

    useEffect(() => {
      if (usePictures.length > 0 && currentIndex >= usePictures.length) {
        setCurrentIndex(usePictures.length - 1);
      }
    }, [usePictures.length, currentIndex]);

    const openFullscreen = useCallback(() => {
      setFullscreen(true);
    }, []);

    const closeFullscreen = useCallback(() => {
      setFullscreen(false);
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
