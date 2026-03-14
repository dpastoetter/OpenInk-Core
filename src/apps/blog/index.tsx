import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { PageNav } from '@core/ui/PageNav';
import { stripHtml } from '@core/utils/html';
import { sanitizeUrl } from '@core/utils/url';
import { getCorsProxyUrl, getDefaultCacheTtlMs } from '@core/constants';
import { AppHeaderActionsContext } from '@core/kernel/AppHeaderActionsContext';

const CACHE_KEY = 'blog:cache';
const NEWS_CACHE_KEY = 'news:cache';

const DEFAULT_NEWS_FEEDS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://www.theguardian.com/world/rss',
  'https://feeds.npr.org/1001/rss.xml',
  'https://www.reutersagency.com/feed/?best-topics=world',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://www.wired.com/feed/rss',
  'https://techcrunch.com/feed/',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://www.theguardian.com/technology/rss',
  'https://feeds.bbci.co.uk/news/technology/rss.xml',
];

function sourceNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host.includes('bbci.co.uk')) return host.includes('technology') ? 'BBC Technology' : 'BBC News';
    if (host.includes('theguardian.com')) return u.pathname.includes('technology') ? 'Guardian Tech' : 'Guardian';
    if (host.includes('npr.org')) return 'NPR';
    if (host.includes('reutersagency.com')) return 'Reuters';
    if (host.includes('aljazeera.com')) return 'Al Jazeera';
    if (host.includes('wired.com')) return 'Wired';
    if (host.includes('techcrunch.com')) return 'TechCrunch';
    if (host.includes('arstechnica.com')) return 'Ars Technica';
    return host.split('.')[0] ? host.split('.')[0][0].toUpperCase() + host.split('.')[0].slice(1) : host;
  } catch {
    return 'News';
  }
}

export interface BlogFeed {
  id: string;
  name: string;
  url: string;
}

const DEFAULT_FEEDS: BlogFeed[] = [
  { id: 'hackernews', name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { id: 'wired', name: 'Wired', url: 'https://www.wired.com/feed/rss' },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { id: 'arstechnica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
];

function parseBlogFeeds(json: string | undefined): BlogFeed[] {
  if (!json || !json.trim()) return [...DEFAULT_FEEDS];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [...DEFAULT_FEEDS];
    const out: BlogFeed[] = [];
    for (const x of arr) {
      if (x && typeof x === 'object' && typeof (x as BlogFeed).id === 'string' && typeof (x as BlogFeed).name === 'string' && typeof (x as BlogFeed).url === 'string') {
        const u = (x as BlogFeed).url.trim();
        if (u) out.push({ id: (x as BlogFeed).id, name: (x as BlogFeed).name, url: u });
      }
    }
    return out.length ? out : [...DEFAULT_FEEDS];
  } catch {
    return [...DEFAULT_FEEDS];
  }
}

function blogFeedsToJson(feeds: BlogFeed[]): string {
  return JSON.stringify(feeds);
}

function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').replace(/\./g, '-').slice(0, 24) || 'feed';
  } catch {
    return 'feed';
  }
}

interface BlogItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

interface CachedBlogFeed {
  url: string;
  items: BlogItem[];
  fetchedAt: number;
}

function parseRss(xml: string, source: string): BlogItem[] {
  const items: BlogItem[] = [];
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const entries = doc.querySelectorAll('item');
  entries.forEach((el) => {
    items.push({
      title: el.querySelector('title')?.textContent?.trim() ?? '',
      link: el.querySelector('link')?.textContent?.trim() ?? '',
      pubDate: el.querySelector('pubDate')?.textContent?.trim() ?? '',
      description: el.querySelector('description')?.textContent?.trim() ?? '',
      source,
    });
  });
  return items;
}

/** Get feed title from RSS/Atom XML. */
function getFeedTitleFromXml(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const rssTitle = doc.querySelector('channel > title')?.textContent?.trim();
  if (rssTitle) return rssTitle;
  const atomTitle = doc.querySelector('feed > title')?.textContent?.trim();
  return atomTitle ?? null;
}

/** Normalize input to a URL (prepend https if needed). */
function toUrl(input: string): string {
  const s = input.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s;
}

const ITEMS_PER_PAGE = 10;
const NEWS_ITEMS_PER_PAGE = 5;

interface PanelBackRef {
  canGoBack: () => boolean;
  goBack: () => void;
}

function BlogNewsApp(context: AppContext): AppInstance {
  const modeRef = useRef<'blog' | 'news'>('blog');
  const blogBackRef = useRef<PanelBackRef | null>(null);
  const newsBackRef = useRef<PanelBackRef | null>(null);

  function CombinedUI() {
    const [mode, setMode] = useState<'blog' | 'news'>('blog');
    modeRef.current = mode;
    return (
      <div class="blog-news-app">
        <div class="timer-stopwatch-tabs">
          <button type="button" class={`btn ${mode === 'blog' ? 'btn-active' : ''}`} onClick={() => setMode('blog')}>
            Blog
          </button>
          <button type="button" class={`btn ${mode === 'news' ? 'btn-active' : ''}`} onClick={() => setMode('news')}>
            News
          </button>
        </div>
        {mode === 'blog' && <BlogPanel context={context} backRef={blogBackRef} />}
        {mode === 'news' && <NewsPanel context={context} backRef={newsBackRef} />}
      </div>
    );
  }

  return {
    render: () => <CombinedUI />,
    getTitle: () => 'Blog & News',
    canGoBack: () => (modeRef.current === 'blog' ? blogBackRef.current?.canGoBack() : newsBackRef.current?.canGoBack()) ?? false,
    goBack: () => {
      if (modeRef.current === 'blog') blogBackRef.current?.goBack();
      else newsBackRef.current?.goBack();
    },
  };
}

function BlogPanel({
  context,
  backRef,
}: {
  context: AppContext;
  backRef: preact.RefObject<PanelBackRef | null>;
}) {
  const { storage, network, settings } = context.services;
  const titleRef: { current: string } = { current: 'Blogs' };
  const internalBackRef: {
    current: {
      setSelectedFeed: (f: BlogFeed | null) => void;
      setSelectedItem: (item: BlogItem | null) => void;
      selectedItem: BlogItem | null;
      selectedFeed: BlogFeed | null;
    } | null;
  } = { current: null };

  function BlogUI() {
    const [feeds, setFeeds] = useState<BlogFeed[]>(() => parseBlogFeeds(settings.get().blogFeeds));
    const [editMode, setEditMode] = useState(false);
    const [searchAddInput, setSearchAddInput] = useState('');
    const [discoverResults, setDiscoverResults] = useState<{ name: string; url: string }[] | null>(null);
    const [discoverLoading, setDiscoverLoading] = useState(false);
    const [discoverError, setDiscoverError] = useState<string | null>(null);
    const [selectedFeed, setSelectedFeed] = useState<BlogFeed | null>(null);
    const [items, setItems] = useState<BlogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<BlogItem | null>(null);
    const [articlePage, setArticlePage] = useState(1);
    const [listPage, setListPage] = useState(1);
    const setHeaderActions = useContext(AppHeaderActionsContext);

    internalBackRef.current = { setSelectedFeed, setSelectedItem, selectedItem, selectedFeed };
    titleRef.current = selectedItem ? selectedItem.title : selectedFeed ? selectedFeed.name : 'Blogs';

    useEffect(() => {
      backRef.current = {
        canGoBack: () => !!selectedItem || !!selectedFeed,
        goBack: () => {
          if (selectedItem) setSelectedItem(null);
          else if (selectedFeed) setSelectedFeed(null);
        },
      };
      return () => {
        backRef.current = null;
      };
    }, [selectedItem, selectedFeed, backRef]);

    const persistFeeds = useCallback(
      (next: BlogFeed[]) => {
        setFeeds(next);
        settings.set({ blogFeeds: blogFeedsToJson(next) });
      },
      [settings]
    );

    const removeFeed = (feed: BlogFeed) => {
      persistFeeds(feeds.filter((f) => f.id !== feed.id));
      if (selectedFeed?.id === feed.id) setSelectedFeed(null);
    };

    const discover = useCallback(async () => {
      const url = toUrl(searchAddInput);
      if (!url) return;
      setDiscoverLoading(true);
      setDiscoverError(null);
      setDiscoverResults(null);
      const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const text = await network.fetchText(proxyUrl);
        const trimmed = text.trim();
        if (/^\s*<\?xml|^\s*<rss|^\s*<feed\s/i.test(trimmed)) {
          const title = getFeedTitleFromXml(text) || slugFromUrl(url);
          setDiscoverResults([{ name: title, url }]);
        } else {
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const links = doc.querySelectorAll('link[rel="alternate"]');
          const found: { name: string; url: string }[] = [];
          const base = url;
          links.forEach((el) => {
            const type = (el.getAttribute('type') || '').toLowerCase();
            const href = el.getAttribute('href');
            if (!href || (type !== 'application/rss+xml' && type !== 'application/atom+xml')) return;
            try {
              const absolute = new URL(href, base).href;
              if (!found.some((f) => f.url === absolute)) found.push({ name: slugFromUrl(absolute), url: absolute });
            } catch {
              /* skip invalid */
            }
          });
          if (found.length) setDiscoverResults(found);
          else setDiscoverError('No RSS/Atom feed link found on this page.');
        }
      } catch (e) {
        setDiscoverError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setDiscoverLoading(false);
      }
    }, [searchAddInput, network, settings]);

    const addFeedByUrl = useCallback(
      (name: string, url: string) => {
        const id = slugFromUrl(url).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 32) || 'feed-' + Date.now();
        if (feeds.some((f) => f.id === id || f.url === url)) return;
        persistFeeds([...feeds, { id, name, url }]);
        setSearchAddInput('');
        setDiscoverResults(null);
        setDiscoverError(null);
      },
      [feeds, persistFeeds]
    );

    const addFeed = useCallback(async () => {
      const url = toUrl(searchAddInput);
      if (!url) return;
      if (discoverResults?.length) {
        const match = discoverResults.find((r) => r.url === url);
        if (match) {
          addFeedByUrl(match.name, match.url);
          return;
        }
        addFeedByUrl(discoverResults[0].name, discoverResults[0].url);
        return;
      }
      const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
      let name = slugFromUrl(url);
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const text = await network.fetchText(proxyUrl);
        const title = getFeedTitleFromXml(text);
        if (title) name = title;
      } catch {
        /* use slug */
      }
      addFeedByUrl(name, url);
    }, [searchAddInput, discoverResults, network, settings, addFeedByUrl]);

    useEffect(() => {
      if (!setHeaderActions) return;
      if (selectedFeed != null) {
        setHeaderActions(null);
        return () => setHeaderActions(null);
      }
      const node = (
        <button
          type="button"
          class="btn"
          onClick={() => setEditMode((e) => !e)}
          aria-label={editMode ? 'Done editing' : 'Edit feeds'}
          title={editMode ? 'Done' : 'Edit'}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      );
      setHeaderActions(node);
      return () => setHeaderActions(null);
    }, [setHeaderActions, selectedFeed, editMode]);

    const loadFeed = useCallback(async (feed: BlogFeed) => {
      setLoading(true);
      setError(null);
      const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
      const cacheTtl = getDefaultCacheTtlMs(settings.get().defaultCacheTtl);
      const cacheKey = CACHE_KEY + ':' + encodeURIComponent(feed.url).slice(0, 500);
      try {
        const cached = await storage.get<CachedBlogFeed>(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < cacheTtl) {
          setItems(cached.items);
          setLoading(false);
          return;
        }
        const proxyUrl = proxy + encodeURIComponent(feed.url);
        const xml = await network.fetchText(proxyUrl);
        const parsed = parseRss(xml, feed.name);
        await storage.set(cacheKey, { url: feed.url, items: parsed, fetchedAt: Date.now() });
        setItems(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load feed');
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, [storage, network, settings]);

    useEffect(() => {
      if (selectedFeed) loadFeed(selectedFeed);
    }, [selectedFeed, loadFeed]);

    const totalListPages = useMemo(() => Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE)), [items.length]);
    const listItems = useMemo(
      () => items.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE),
      [items, listPage]
    );

    // Article view (selected item)
    if (selectedItem) {
      const body = stripHtml(selectedItem.description || '');
      const paragraphs = body ? body.split(/\n+/).filter((p) => p.trim()) : [];
      const totalPages = Math.max(1, Math.ceil(paragraphs.length / 3));
      const page = Math.min(articlePage, totalPages);
      const start = (page - 1) * 3;
      const pageParas = paragraphs.slice(start, start + 3);

      return (
        <div class="blog-article">
          <p class="blog-meta">{selectedItem.source} · {selectedItem.pubDate}</p>
          <div class="blog-article-body">
            {pageParas.length > 0 ? pageParas.map((p, i) => <p key={i}>{p}</p>) : <p class="blog-meta">No content.</p>}
          </div>
          {(() => {
            const safeLink = typeof selectedItem.link === 'string' ? sanitizeUrl(selectedItem.link) : '';
            return safeLink ? (
              <p class="blog-link">
                <a href={safeLink} target="_blank" rel="noopener noreferrer">Open article</a>
              </p>
            ) : null;
          })()}
          {totalPages > 1 && (
            <PageNav current={page} total={totalPages} onPrev={() => setArticlePage((p) => Math.max(1, p - 1))} onNext={() => setArticlePage((p) => Math.min(totalPages, p + 1))} />
          )}
        </div>
      );
    }

    // Feed posts list
    if (selectedFeed) {
      if (loading && items.length === 0) return <p>Loading…</p>;
      if (error && items.length === 0) return <p class="browser-error">{error}</p>;

      return (
        <div class="blog-app">
          {error && items.length > 0 && <p class="blog-error-hint">{error}</p>}
          <div class="blog-actions">
            <button type="button" class="btn" onClick={() => loadFeed(selectedFeed)} disabled={loading}>
              Refresh
            </button>
          </div>
          <ul class="list">
            {listItems.length === 0 && !loading && <li><p class="blog-meta">No posts. Try Refresh.</p></li>}
            {listItems.map((item, i) => (
              <li key={item.link || i}>
                <button type="button" onClick={() => setSelectedItem(item)}>
                  <strong>{item.title}</strong>
                  <br />
                  <small class="blog-meta">{item.source} · {item.pubDate}</small>
                </button>
              </li>
            ))}
          </ul>
          <PageNav current={listPage} total={totalListPages} onPrev={() => setListPage((p) => Math.max(1, p - 1))} onNext={() => setListPage((p) => Math.min(totalListPages, p + 1))} />
        </div>
      );
    }

    // Feed list (home)
    return (
      <div class="blog-app">
        <div class="blog-add blog-search-add-bar">
          <input
            type="text"
            class="input blog-add-input"
            placeholder="Feed URL or site URL (e.g. https://wired.com/feed/rss or wired.com)"
            value={searchAddInput}
            onInput={(e) => setSearchAddInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && addFeed()}
          />
          <button type="button" class="btn" onClick={discover} disabled={discoverLoading || !searchAddInput.trim()}>
            {discoverLoading ? '…' : 'Discover'}
          </button>
          <button type="button" class="btn" onClick={addFeed} disabled={!searchAddInput.trim()}>
            Add
          </button>
        </div>
        {discoverError && <p class="blog-add-error">{discoverError}</p>}
        {discoverResults && discoverResults.length > 0 && (
          <ul class="blog-discover-results">
            {discoverResults.map((r) => (
              <li key={r.url} class="blog-discover-item">
                <span>{r.name}</span>
                <button type="button" class="btn btn-small" onClick={() => addFeedByUrl(r.name, r.url)}>Add</button>
              </li>
            ))}
          </ul>
        )}
        <p class="blog-hint">Pick a feed:</p>
        <ul class="list blog-feed-list">
          {feeds.map((feed) => (
            <li key={feed.id} class="blog-feed-item">
              <button type="button" onClick={() => setSelectedFeed(feed)}>{feed.name}</button>
              {editMode && (
                <button
                  type="button"
                  class="btn btn-small blog-feed-delete"
                  onClick={() => removeFeed(feed)}
                  aria-label={`Remove ${feed.name}`}
                  title="Remove"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <BlogUI />;
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

interface CachedNewsFeed {
  url: string;
  items: NewsItem[];
  fetchedAt: number;
}

function parseNewsRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const entries = doc.querySelectorAll('item');
  entries.forEach((el) => {
    items.push({
      title: el.querySelector('title')?.textContent?.trim() ?? '',
      link: el.querySelector('link')?.textContent?.trim() ?? '',
      pubDate: el.querySelector('pubDate')?.textContent?.trim() ?? '',
      description: el.querySelector('description')?.textContent?.trim() ?? '',
      source,
    });
  });
  return items;
}

function NewsPanel({
  context,
  backRef,
}: {
  context: AppContext;
  backRef: preact.RefObject<PanelBackRef | null>;
}) {
  const { storage, network, settings } = context.services;

  function NewsUI() {
    const [feeds] = useState<string[]>(DEFAULT_NEWS_FEEDS);
    const [items, setItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<NewsItem | null>(null);
    const [articlePage, setArticlePage] = useState(1);
    const [listPage, setListPage] = useState(1);

    const loadFeeds = useCallback(async () => {
      setLoading(true);
      setError(null);
      const all: NewsItem[] = [];
      let lastError: string | null = null;
      const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
      const cacheTtl = getDefaultCacheTtlMs(settings.get().defaultCacheTtl);
      for (const url of feeds) {
        const sourceName = sourceNameFromUrl(url);
        try {
          const cacheKey = NEWS_CACHE_KEY + ':' + encodeURIComponent(url).slice(0, 500);
          const cached = await storage.get<CachedNewsFeed>(cacheKey);
          if (cached && Date.now() - cached.fetchedAt < cacheTtl) {
            const withSource = cached.items.map((it) => ({ ...it, source: it.source ?? sourceName }));
            all.push(...withSource);
            continue;
          }
          const proxyUrl = proxy + encodeURIComponent(url);
          const xml = await network.fetchText(proxyUrl);
          const parsed = parseNewsRss(xml, sourceName);
          await storage.set(cacheKey, { url, items: parsed, fetchedAt: Date.now() });
          all.push(...parsed);
        } catch (e) {
          lastError = e instanceof Error ? e.message : 'Failed to load feed';
        }
      }
      const byDate = [...all].sort((a, b) => {
        const tA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const tB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return tB - tA;
      });
      setItems(byDate.slice(0, 50));
      setError(all.length === 0 ? lastError : null);
      setLoading(false);
    }, [feeds, storage, network, settings]);

    useEffect(() => {
      loadFeeds();
    }, [loadFeeds]);

    useEffect(() => {
      backRef.current = {
        canGoBack: () => selected != null,
        goBack: () => {
          setSelected(null);
          setArticlePage(1);
        },
      };
      return () => {
        backRef.current = null;
      };
    }, [selected, backRef]);

    const totalListPages = useMemo(() => Math.max(1, Math.ceil(items.length / NEWS_ITEMS_PER_PAGE)), [items.length]);
    const listItems = useMemo(
      () => items.slice((listPage - 1) * NEWS_ITEMS_PER_PAGE, listPage * NEWS_ITEMS_PER_PAGE),
      [items, listPage]
    );

    if (selected) {
      const body = stripHtml(selected.description || '');
      const paragraphs = body ? body.split(/\n+/).filter((p) => p.trim()) : [];
      const totalPages = Math.max(1, Math.ceil(paragraphs.length / 3));
      const page = Math.min(articlePage, totalPages);
      const start = (page - 1) * 3;
      const pageParas = paragraphs.slice(start, start + 3);

      return (
        <div class="news-article">
          <p class="news-meta">{selected.source} · {selected.pubDate}</p>
          <div class="news-article-body">
            {pageParas.length > 0 ? pageParas.map((p, i) => <p key={i}>{p}</p>) : <p class="news-meta">No content.</p>}
          </div>
          {totalPages > 1 && (
            <PageNav current={page} total={totalPages} onPrev={() => setArticlePage((p) => Math.max(1, p - 1))} onNext={() => setArticlePage((p) => Math.min(totalPages, p + 1))} />
          )}
        </div>
      );
    }

    if (loading && items.length === 0) return <p>Loading…</p>;
    if (error && items.length === 0) return <p class="browser-error">{error}</p>;

    return (
      <div class="news-app">
        {error && items.length > 0 && <p class="news-error-hint">{error}</p>}
        <ul class="list">
          {listItems.length === 0 && !loading && <li><p class="news-meta">No headlines. Reload the page to refresh.</p></li>}
          {listItems.map((item, i) => (
            <li key={item.link || i}>
              <button type="button" onClick={() => setSelected(item)}>
                <strong>{item.title}</strong>
                <br />
                <small class="news-meta">{item.source} · {item.pubDate}</small>
              </button>
            </li>
          ))}
        </ul>
        <PageNav current={listPage} total={totalListPages} onPrev={() => setListPage((p) => Math.max(1, p - 1))} onNext={() => setListPage((p) => Math.min(totalListPages, p + 1))} />
      </div>
    );
  }

  return <NewsUI />;
}

export const blogApp = {
  id: 'blog',
  name: 'Blog & News',
  icon: '📝',
  iconFallback: 'B',
  category: 'reader' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: BlogNewsApp,
};
