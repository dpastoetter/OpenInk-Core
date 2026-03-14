import { useState, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { PageNav } from '@core/ui/PageNav';
import { getCorsProxyUrl, getDefaultCacheTtlMs } from '@core/constants';
import { sanitizeUrl, isSafeUrl } from '@core/utils/url';

const COMICSRSS_BASE = 'https://www.comicsrss.com/rss/';
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
  const backRef: { current: { canGoBack: () => boolean; goBack: () => void } | null } = { current: null };

  function ComicsUI() {
    const [rssFeedSlug, setRssFeedSlug] = useState<string | null>(null);
    const [rssFeedName, setRssFeedName] = useState('');
    const [rssItems, setRssItems] = useState<RssComicItem[]>([]);
    const [rssIndex, setRssIndex] = useState(0);
    const [rssLoading, setRssLoading] = useState(false);
    const [rssError, setRssError] = useState<string | null>(null);

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

    backRef.current = {
      canGoBack: () => rssFeedSlug != null,
      goBack: () => setRssFeedSlug(null),
    };

    // Feed list (no strip selected yet)
    if (!rssFeedSlug) {
      return (
        <div class="comics-app">
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
          <p>Loading {rssFeedName}…</p>
        </div>
      );
    }

    if (rssError && rssItems.length === 0) {
      return (
        <div class="comics-app">
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
    canGoBack: () => backRef.current?.canGoBack?.() ?? false,
    goBack: () => backRef.current?.goBack?.(),
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
