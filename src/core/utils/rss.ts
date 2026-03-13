import type { RssItem } from '../../types/feed';

/**
 * Parse RSS/Atom XML into a list of feed items. Uses <item> elements (RSS) or <entry> (Atom).
 * Each item gets title, link, pubDate/updated, description/summary/content, and the given source label.
 */
export function parseRssItems(xml: string, source: string): RssItem[] {
  const items: RssItem[] = [];
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
  if (items.length > 0) return items;
  const atomEntries = doc.querySelectorAll('entry');
  atomEntries.forEach((el) => {
    const linkEl = el.querySelector('link[href]');
    const link = linkEl?.getAttribute('href') ?? el.querySelector('link')?.textContent?.trim() ?? '';
    const summary = el.querySelector('summary')?.textContent?.trim() ?? el.querySelector('content')?.textContent?.trim() ?? '';
    items.push({
      title: el.querySelector('title')?.textContent?.trim() ?? '',
      link,
      pubDate: el.querySelector('updated')?.textContent?.trim() ?? el.querySelector('published')?.textContent?.trim() ?? '',
      description: summary,
      source,
    });
  });
  return items;
}

/** Get feed title from RSS (channel > title) or Atom (feed > title). */
export function getFeedTitleFromXml(xml: string): string | null {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const rssTitle = doc.querySelector('channel > title')?.textContent?.trim();
  if (rssTitle) return rssTitle;
  const atomTitle = doc.querySelector('feed > title')?.textContent?.trim();
  return atomTitle ?? null;
}
