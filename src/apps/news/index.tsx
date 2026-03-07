import { h } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { PageNav } from '@core/ui/PageNav';
import { stripHtml } from '@core/utils/html';

const CACHE_KEY = 'news:cache';
const CORS_PROXY = 'https://corsproxy.io/?';

const DEFAULT_FEEDS = [
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

/** Human-readable source name from feed URL. */
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

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  content?: string;
}

interface CachedFeed {
  url: string;
  items: NewsItem[];
  fetchedAt: number;
}

const CACHE_TTL = 1000 * 60 * 30; // 30 min

function parseRss(xml: string, source: string): NewsItem[] {
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

const ITEMS_PER_PAGE = 5;

function NewsApp(context: AppContext): AppInstance {
  const { storage, network } = context.services;
  const titleRef: { current: string } = { current: 'Headlines' };
  const backRef: {
    current: { setSelected: (item: NewsItem | null) => void; setArticlePage: (p: number) => void } | null;
  } = { current: null };

  function NewsUI() {
    const [feeds] = useState<string[]>(DEFAULT_FEEDS);
    const [items, setItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<NewsItem | null>(null);
    const [articlePage, setArticlePage] = useState(1);
    const [listPage, setListPage] = useState(1);
    backRef.current = { setSelected, setArticlePage };
    titleRef.current = selected ? selected.title : 'Headlines';

    const loadFeeds = useCallback(async () => {
      setLoading(true);
      setError(null);
      const all: NewsItem[] = [];
      let lastError: string | null = null;
      for (const url of feeds) {
        const sourceName = sourceNameFromUrl(url);
        try {
          const cached = await storage.get<CachedFeed>(CACHE_KEY + ':' + url);
          if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
            const withSource = cached.items.map((it) => ({ ...it, source: it.source ?? sourceName }));
            all.push(...withSource);
            continue;
          }
          const proxyUrl = CORS_PROXY + encodeURIComponent(url);
          const xml = await network.fetchText(proxyUrl);
          const parsed = parseRss(xml, sourceName);
          await storage.set(CACHE_KEY + ':' + url, { url, items: parsed, fetchedAt: Date.now() });
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
    }, [feeds, storage, network]);

    useEffect(() => {
      loadFeeds();
    }, [loadFeeds]);

    const totalListPages = useMemo(() => Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE)), [items.length]);
    const listItems = useMemo(
      () => items.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE),
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
        <div class="news-actions">
          <button type="button" class="btn" onClick={loadFeeds} disabled={loading}>
            Refresh
          </button>
        </div>
        <ul class="list">
          {listItems.length === 0 && !loading && <li><p class="news-meta">No headlines. Try Refresh.</p></li>}
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

  return {
    render: () => <NewsUI />,
    getTitle: () => titleRef.current,
    canGoBack: () => titleRef.current !== 'Headlines',
    goBack: () => {
      backRef.current?.setSelected(null);
      backRef.current?.setArticlePage(1);
    },
  };
}

export const newsApp = {
  id: 'news',
  name: 'News',
  icon: '📑',
  category: 'reader' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: NewsApp,
};
