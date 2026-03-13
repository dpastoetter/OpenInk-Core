/** Shared shape for RSS/Atom feed items used by Blog, News, and Comics. */
export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}
