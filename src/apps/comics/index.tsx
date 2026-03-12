import { useState, useEffect, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { PageNav } from '@core/ui/PageNav';
import { getCorsProxyUrl, getDefaultCacheTtlMs } from '@core/constants';
import { sanitizeUrl, isSafeUrl } from '@core/utils/url';

const XKCD_JSON = (num: number) => `https://xkcd.com/${num}/info.0.json`;
const XKCD_LATEST = 'https://xkcd.com/info.0.json';
const COMICSRSS_BASE = 'https://www.comicsrss.com/rss/';
const CACHE_PREFIX_XKCD = 'comics:xkcd:';
const CACHE_PREFIX_RSS = 'comics:rss:';

/** Curated Comics RSS feeds (comicsrss.com). Slug => feed URL. */
const COMICS_RSS_FEEDS: { slug: string; name: string }[] = [
  { slug: 'dilbert', name: 'Dilbert' },
  { slug: 'babyblues', name: 'Baby Blues' },
  { slug: 'garfield', name: 'Garfield' },
  { slug: 'peanuts', name: 'Peanuts' },
  { slug: 'calvinandhobbes', name: 'Calvin and Hobbes' },
  { slug: 'bc', name: 'B.C.' },
  { slug: 'adamathome', name: 'Adam@Home' },
  { slug: 'agnes', name: 'Agnes' },
  { slug: 'arloandjanis', name: 'Arlo and Janis' },
  { slug: 'doonesbury', name: 'Doonesbury' },
  { slug: 'beetlebailey', name: 'Beetle Bailey' },
  { slug: 'blondie', name: 'Blondie' },
  { slug: 'hagarcartoons', name: 'Hagar the Horrible' },
  { slug: 'zits', name: 'Zits' },
  { slug: 'pickles', name: 'Pickles' },
];

interface XkcdComic {
  num: number;
  title: string;
  img: string;
  alt: string;
  year: string;
  month: string;
  day: string;
  transcript?: string;
}

interface RssComicItem {
  title: string;
  link: string;
  pubDate: string;
  imgUrl: string | null;
}

/** Extract first img src from HTML description. Returns only https URLs. */
function extractImgFromDescription(html: string): string | null {
  if (!html || typeof html !== 'string') return null;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    const src = img?.getAttribute('src')?.trim();
    if (src && src.startsWith('https://')) return src;
  } catch {
    /* ignore */
  }
  return null;
}

function parseComicsRss(xml: string): RssComicItem[] {
  const items: RssComicItem[] = [];
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  doc.querySelectorAll('item').forEach((el) => {
    const title = el.querySelector('title')?.textContent?.trim() ?? '';
    const link = el.querySelector('link')?.textContent?.trim() ?? '';
    const pubDate = el.querySelector('pubDate')?.textContent?.trim() ?? '';
    const descRaw = el.querySelector('description')?.textContent?.trim() ?? '';
    const imgUrl = extractImgFromDescription(descRaw);
    items.push({ title, link, pubDate, imgUrl });
  });
  return items;
}

function ComicsApp(context: AppContext): AppInstance {
  const { network, storage, settings } = context.services;
  const titleRef: { current: string } = { current: 'Comics' };

  function ComicsUI() {
    const [source, setSource] = useState<'xkcd' | 'rss'>('xkcd');

    // xkcd state
    const [maxNum, setMaxNum] = useState<number | null>(null);
    const [currentNum, setCurrentNum] = useState<number | null>(null);
    const [comic, setComic] = useState<XkcdComic | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAlt, setShowAlt] = useState(false);

    // Comics RSS state
    const [rssFeedSlug, setRssFeedSlug] = useState<string | null>(null);
    const [rssFeedName, setRssFeedName] = useState('');
    const [rssItems, setRssItems] = useState<RssComicItem[]>([]);
    const [rssIndex, setRssIndex] = useState(0);
    const [rssLoading, setRssLoading] = useState(false);
    const [rssError, setRssError] = useState<string | null>(null);

    const fetchComic = useCallback(
      async (num: number) => {
        const cacheTtlDay = getDefaultCacheTtlMs('24h');
        const cacheKey = CACHE_PREFIX_XKCD + num;
        const cached = await storage.get<{ data: XkcdComic; fetchedAt: number }>(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < cacheTtlDay) {
          setComic(cached.data);
          setError(null);
          return;
        }
        try {
          const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
          const url = proxy + encodeURIComponent(XKCD_JSON(num));
          const data = await network.fetchJson<XkcdComic>(url);
          setComic(data);
          setError(null);
          await storage.set(cacheKey, { data, fetchedAt: Date.now() });
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load comic');
          setComic(null);
        }
      },
      [network, storage]
    );

    // xkcd: load latest on mount when source is xkcd
    useEffect(() => {
      if (source !== 'xkcd') return;
      let cancelled = false;
      (async () => {
        try {
          const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
          const url = proxy + encodeURIComponent(XKCD_LATEST);
          const latest = await network.fetchJson<XkcdComic>(url);
          if (cancelled) return;
          setMaxNum(latest.num);
          setCurrentNum(latest.num);
          setComic(latest);
          titleRef.current = `Comics · ${latest.title}`;
          await storage.set(CACHE_PREFIX_XKCD + latest.num, { data: latest, fetchedAt: Date.now() });
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [source, network, storage, settings]);

    useEffect(() => {
      if (source !== 'xkcd' || currentNum == null || currentNum === comic?.num) return;
      setLoading(true);
      fetchComic(currentNum).finally(() => setLoading(false));
    }, [source, currentNum, comic?.num, fetchComic]);

    useEffect(() => {
      if (comic) titleRef.current = `Comics · ${comic.title}`;
    }, [comic]);

    const goPrev = useCallback(() => {
      if (currentNum != null && currentNum > 1) setCurrentNum(currentNum - 1);
    }, [currentNum]);
    const goNext = useCallback(() => {
      if (maxNum != null && currentNum != null && currentNum < maxNum) setCurrentNum(currentNum + 1);
    }, [currentNum, maxNum]);

    // Comics RSS: when user selects a feed, fetch and parse
    const loadRssFeed = useCallback(
      async (slug: string, name: string) => {
        setRssFeedSlug(slug);
        setRssFeedName(name);
        setRssLoading(true);
        setRssError(null);
        const feedUrl = COMICSRSS_BASE + slug + '.rss';
        const cacheKey = CACHE_PREFIX_RSS + slug;
        try {
          const cacheTtl = getDefaultCacheTtlMs(settings.get().defaultCacheTtl);
          const cached = await storage.get<{ items: RssComicItem[]; fetchedAt: number }>(cacheKey);
          if (cached && Date.now() - cached.fetchedAt < cacheTtl) {
            setRssItems(cached.items);
            setRssIndex(0);
            titleRef.current = `Comics · ${name}`;
            setRssLoading(false);
            return;
          }
          const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
          const proxyUrl = proxy + encodeURIComponent(feedUrl);
          const xml = await network.fetchText(proxyUrl);
          const items = parseComicsRss(xml);
          setRssItems(items);
          setRssIndex(0);
          titleRef.current = `Comics · ${name}`;
          await storage.set(cacheKey, { items, fetchedAt: Date.now() });
        } catch (e) {
          setRssError(e instanceof Error ? e.message : 'Failed to load feed');
          setRssItems([]);
        } finally {
          setRssLoading(false);
        }
      },
      [network, storage, settings]
    );

    const rssGoPrev = useCallback(() => {
      if (rssIndex > 0) setRssIndex(rssIndex - 1);
    }, [rssIndex]);
    const rssGoNext = useCallback(() => {
      if (rssIndex < rssItems.length - 1) setRssIndex(rssIndex + 1);
    }, [rssIndex, rssItems.length]);

    // --- Source picker and xkcd view (unchanged) ---
    if (source === 'xkcd') {
      if (loading && !comic) {
        return (
          <div class="comics-app">
            <p class="widget-hint">Free comics. One request at a time for e-ink.</p>
            <div class="comics-source-tabs">
              <button type="button" class="btn" onClick={() => setSource('xkcd')} aria-pressed="true">xkcd</button>
              <button type="button" class="btn btn-ghost" onClick={() => setSource('rss')}>Comics RSS</button>
            </div>
            <p>Loading…</p>
          </div>
        );
      }
      if (error && !comic) {
        return (
          <div class="comics-app">
            <div class="comics-source-tabs">
              <button type="button" class="btn" onClick={() => setSource('xkcd')} aria-pressed="true">xkcd</button>
              <button type="button" class="btn btn-ghost" onClick={() => setSource('rss')}>Comics RSS</button>
            </div>
            <p class="browser-error">{error}</p>
          </div>
        );
      }
      return (
        <div class="comics-app">
          <p class="widget-hint">xkcd — freely available. Prev/Next; no animation.</p>
          <div class="comics-source-tabs">
            <button type="button" class="btn" onClick={() => setSource('xkcd')} aria-pressed="true">xkcd</button>
            <button type="button" class="btn btn-ghost" onClick={() => setSource('rss')}>Comics RSS</button>
          </div>
          {maxNum != null && currentNum != null && (
            <nav class="page-nav" aria-label="Comic navigation">
              <button
                type="button"
                class="btn btn-nav"
                onClick={goNext}
                disabled={currentNum >= maxNum}
                aria-label="Newer comic"
              >
                Newer
              </button>
              <span class="page-nav-info" aria-live="polite">
                Comic {currentNum} of {maxNum}
              </span>
              <button
                type="button"
                class="btn btn-nav"
                onClick={goPrev}
                disabled={currentNum <= 1}
                aria-label="Older comic"
              >
                Older
              </button>
            </nav>
          )}
          {comic && (
            <article class="comics-strip" aria-label={comic.title}>
              <h2 class="comics-title">{comic.title}</h2>
              <p class="comics-meta">
                #{comic.num} · {comic.year}-{comic.month}-{comic.day}
              </p>
              <div class="comics-image-wrap">
                {(() => {
                  const src = sanitizeUrl(comic.img);
                  return src ? <img src={src} alt={comic.title} title={comic.alt} class="comics-image" loading="lazy" decoding="async" /> : null;
                })()}
              </div>
              {showAlt && comic.alt && <p class="comics-alt">{comic.alt}</p>}
              <button type="button" class="btn comics-alt-btn" onClick={() => setShowAlt((s) => !s)}>
                {showAlt ? 'Hide alt text' : 'Show alt text'}
              </button>
            </article>
          )}
        </div>
      );
    }

    // --- Comics RSS: feed list or strip view ---
    if (!rssFeedSlug) {
      return (
        <div class="comics-app">
          <p class="widget-hint">Comics from comicsrss.com. Pick a strip.</p>
          <div class="comics-source-tabs">
            <button type="button" class="btn btn-ghost" onClick={() => setSource('xkcd')}>xkcd</button>
            <button type="button" class="btn" onClick={() => setSource('rss')} aria-pressed="true">Comics RSS</button>
          </div>
          <ul class="comics-feed-list" aria-label="Comic strips">
            {COMICS_RSS_FEEDS.map((f) => (
              <li key={f.slug}>
                <button type="button" class="btn comics-feed-btn" onClick={() => loadRssFeed(f.slug, f.name)}>
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (rssLoading && rssItems.length === 0) {
      return (
        <div class="comics-app">
          <div class="comics-source-tabs">
            <button type="button" class="btn btn-ghost" onClick={() => setSource('xkcd')}>xkcd</button>
            <button type="button" class="btn" onClick={() => setSource('rss')} aria-pressed="true">Comics RSS</button>
          </div>
          <p>Loading {rssFeedName}…</p>
        </div>
      );
    }

    if (rssError && rssItems.length === 0) {
      return (
        <div class="comics-app">
          <div class="comics-source-tabs">
            <button type="button" class="btn btn-ghost" onClick={() => setSource('xkcd')}>xkcd</button>
            <button type="button" class="btn" onClick={() => setSource('rss')} aria-pressed="true">Comics RSS</button>
          </div>
          <p class="browser-error">{rssError}</p>
          <button type="button" class="btn" onClick={() => setRssFeedSlug(null)}>Back to strips</button>
        </div>
      );
    }

    const currentRss = rssItems[rssIndex];
    if (!currentRss) {
      return (
        <div class="comics-app">
          <p class="widget-hint">No strips in this feed.</p>
          <button type="button" class="btn" onClick={() => setRssFeedSlug(null)}>Back to strips</button>
        </div>
      );
    }

    titleRef.current = `Comics · ${rssFeedName} · ${currentRss.title}`;

    return (
      <div class="comics-app">
        <p class="widget-hint">comicsrss.com — Prev/Next; no animation.</p>
        <div class="comics-source-tabs">
          <button type="button" class="btn btn-ghost" onClick={() => setSource('xkcd')}>xkcd</button>
          <button type="button" class="btn" onClick={() => setSource('rss')} aria-pressed="true">Comics RSS</button>
        </div>
        <button type="button" class="btn comics-back-feed" onClick={() => setRssFeedSlug(null)}>Change strip</button>
        {rssItems.length > 0 && (
          <PageNav
            current={rssIndex + 1}
            total={rssItems.length}
            onPrev={rssGoPrev}
            onNext={rssGoNext}
            label="Strip"
          />
        )}
        <article class="comics-strip" aria-label={currentRss.title}>
          <h2 class="comics-title">{currentRss.title}</h2>
          <p class="comics-meta">{currentRss.pubDate}</p>
          {currentRss.imgUrl && isSafeUrl(currentRss.imgUrl) ? (
            <div class="comics-image-wrap">
              <img
                src={currentRss.imgUrl}
                alt={currentRss.title}
                class="comics-image"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : currentRss.imgUrl ? (
            <p class="comics-no-img">Image link unavailable.</p>
          ) : (
            <p class="comics-no-img">No image in this strip.</p>
          )}
          {(() => {
            const safeLink = sanitizeUrl(currentRss.link);
            return safeLink ? (
              <a href={safeLink} target="_blank" rel="noopener noreferrer" class="comics-source-link">Source</a>
            ) : (
              <span class="comics-source-link">Source (link unavailable)</span>
            );
          })()}
        </article>
      </div>
    );
  }

  return {
    render: () => <ComicsUI />,
    getTitle: () => titleRef.current,
  };
}

export const comicsApp = {
  id: 'comics',
  name: 'Comics',
  icon: '🗞️',
  category: 'reader' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: ComicsApp,
};
