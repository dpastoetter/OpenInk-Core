import { useState, useEffect, useCallback, useMemo, useContext } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { PageNav } from '@core/ui/PageNav';
import { stripHtml } from '@core/utils/html';
import { sanitizeUrl } from '@core/utils/url';
import { getCorsProxyUrl, getDefaultCacheTtlMs } from '@core/constants';
import { parseRssItems, getFeedTitleFromXml } from '@core/utils/rss';
import { parseJsonArray, isBlogFeed } from '@core/utils/settings-parsers';
import type { BlogFeedInput } from '@core/utils/settings-parsers';
import type { RssItem } from '../../types/feed';
import { AppHeaderActionsContext } from '@core/kernel/AppHeaderActionsContext';

const CACHE_KEY = 'blog:cache';

export type BlogFeed = BlogFeedInput;

const DEFAULT_FEEDS: BlogFeed[] = [
  { id: 'hackernews', name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { id: 'wired', name: 'Wired', url: 'https://www.wired.com/feed/rss' },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { id: 'arstechnica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
];

function parseBlogFeeds(json: string | undefined): BlogFeed[] {
  return parseJsonArray(json, [...DEFAULT_FEEDS], isBlogFeed).map((x) => ({
    id: x.id,
    name: x.name,
    url: x.url.trim(),
  }));
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

interface CachedBlogFeed {
  url: string;
  items: RssItem[];
  fetchedAt: number;
}

/** Normalize input to a URL (prepend https if needed). */
function toUrl(input: string): string {
  const s = input.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s;
}

const ITEMS_PER_PAGE = 10;

function BlogApp(context: AppContext): AppInstance {
  const { storage, network, settings } = context.services;
  const titleRef: { current: string } = { current: 'Blogs' };
  const backRef: {
    current: {
      setSelectedFeed: (f: BlogFeed | null) => void;
      setSelectedItem: (item: RssItem | null) => void;
      selectedItem: RssItem | null;
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
    const [items, setItems] = useState<RssItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<RssItem | null>(null);
    const [articlePage, setArticlePage] = useState(1);
    const [listPage, setListPage] = useState(1);
    const setHeaderActions = useContext(AppHeaderActionsContext);

    backRef.current = { setSelectedFeed, setSelectedItem, selectedItem, selectedFeed };
    titleRef.current = selectedItem ? selectedItem.title : selectedFeed ? selectedFeed.name : 'Blogs';

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
        const parsed = parseRssItems(xml, feed.name);
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

  return {
    render: () => <BlogUI />,
    getTitle: () => titleRef.current,
    canGoBack: () => {
      const c = backRef.current;
      return c != null && (c.selectedItem != null || c.selectedFeed != null);
    },
    goBack: () => {
      const c = backRef.current;
      if (!c) return;
      if (c.selectedItem != null) c.setSelectedItem(null);
      else if (c.selectedFeed != null) c.setSelectedFeed(null);
    },
  };
}

export const blogApp = {
  id: 'blog',
  name: 'Blog',
  icon: '📝',
  iconFallback: 'B',
  category: 'reader' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: BlogApp,
};
