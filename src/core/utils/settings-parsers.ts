/**
 * Parse a JSON string as an array and filter with a type guard. Returns defaultVal on parse error or invalid input.
 */
export function parseJsonArray<T>(
  json: string | undefined,
  defaultVal: T[],
  guard: (x: unknown) => x is T
): T[] {
  if (!json || !String(json).trim()) return defaultVal;
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return defaultVal;
    const out: T[] = [];
    for (const x of raw) {
      if (guard(x)) out.push(x);
    }
    return out.length ? out : defaultVal;
  } catch {
    return defaultVal;
  }
}

export interface BlogFeedInput {
  id: string;
  name: string;
  url: string;
}

export function isBlogFeed(x: unknown): x is BlogFeedInput {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof (x as BlogFeedInput).id === 'string' &&
    typeof (x as BlogFeedInput).name === 'string' &&
    typeof (x as BlogFeedInput).url === 'string' &&
    ((x as BlogFeedInput).url as string).trim() !== ''
  );
}

export interface RedditSubredditInput {
  /** Subreddit name (e.g. "books") */
  name?: string;
}

/** Accept string (legacy) or { name: string }; return array of subreddit name strings. */
export function parseRedditSubreddits(json: string | undefined): string[] {
  if (!json || !String(json).trim()) return [];
  try {
    const raw = JSON.parse(json) as unknown;
    if (Array.isArray(raw)) {
      return raw
        .map((x) => (typeof x === 'string' ? x : (x as RedditSubredditInput)?.name))
        .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
        .map((s) => s.trim());
    }
    return [];
  } catch {
    return [];
  }
}

export interface FinanceItemInput {
  id: string;
  name: string;
  source: 'yahoo' | 'coingecko';
}

export function isFinanceItem(x: unknown): x is FinanceItemInput {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof (x as FinanceItemInput).id === 'string' &&
    typeof (x as FinanceItemInput).name === 'string' &&
    ((x as FinanceItemInput).source === 'yahoo' || (x as FinanceItemInput).source === 'coingecko')
  );
}

export interface WorldClockZoneInput {
  id: string;
  label: string;
  offsetMinutes: number;
}

export function isWorldClockZone(x: unknown): x is WorldClockZoneInput {
  return (
    x !== null &&
    typeof x === 'object' &&
    typeof (x as WorldClockZoneInput).id === 'string' &&
    typeof (x as WorldClockZoneInput).label === 'string' &&
    typeof (x as WorldClockZoneInput).offsetMinutes === 'number'
  );
}
