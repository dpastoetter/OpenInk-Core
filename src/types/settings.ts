export type PixelOpticsPreset = 'standard' | 'highContrastText' | 'lowGhosting';
export type ColorMode = 'grayscale' | 'color';
export type FontSize = 'small' | 'medium' | 'large';
export type ThemePreset = 'normal' | 'highContrast';
export type Appearance = 'light' | 'dark';

export type ReduceMotionPreset = 'system' | 'always' | 'never';
export type LineHeightPreset = 'compact' | 'normal' | 'relaxed';
export type ContentWidthPreset = 'narrow' | 'medium' | 'full';
export type LetterSpacingPreset = 'tight' | 'normal' | 'wide';
export type TimeFormatPreset = '12h' | '24h';
export type AppsPerRowPreset = 'auto' | '2' | '3' | '4';
export type SortOrderPreset = 'a-z' | 'z-a';
export type CacheTtlPreset = '30m' | '6h' | '24h' | '7d';
export type OfflinePreferencePreset = 'preferCache' | 'ask' | 'block';
export type TapTargetSizePreset = 'normal' | 'large' | 'extraLarge';
export type FocusRingPreset = 'always' | 'keyboard' | 'never';

export interface GlobalSettings {
  pixelOptics: PixelOpticsPreset;
  colorMode: ColorMode;
  fontSize: FontSize;
  theme: ThemePreset;
  appearance: Appearance;
  /** Global zoom multiplier (e.g. 0.75–1.5). Applied to root for resolution fit. */
  zoom: number;

  reduceMotion: ReduceMotionPreset;
  lineHeight: LineHeightPreset;
  contentWidth: ContentWidthPreset;
  letterSpacing: LetterSpacingPreset;

  showClock: boolean;
  timeFormat: TimeFormatPreset;
  showAppTitle: boolean;

  showGamesSection: boolean;
  appsPerRow: AppsPerRowPreset;
  sortOrder: SortOrderPreset;

  /** Empty = use built-in CORS proxy. */
  corsProxyUrl: string;
  defaultCacheTtl: CacheTtlPreset;
  offlinePreference: OfflinePreferencePreset;

  tapTargetSize: TapTargetSizePreset;
  focusRing: FocusRingPreset;
  highContrastFocus: boolean;

  invertColors: boolean;
  reduceFlashes: boolean;
  /** Simple layout for e-ink: hide search/filter UIs, larger font. */
  simpleLayout: boolean;

  /** JSON array of { id, name, source } for Finance widget. source: 'yahoo' | 'coingecko'. */
  financeItems: string;

  /** JSON array of subreddit names (e.g. ["books","worldnews"]) for Reddit app. */
  redditSubreddits: string;

  /** JSON array of { id, name, url } for Blog app (RSS feed URLs). */
  blogFeeds: string;

  /** JSON array of { id, label, offsetMinutes } for World Clock. offsetMinutes = UTC offset in minutes (e.g. -300 = EST). */
  worldClockZones: string;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  pixelOptics: 'standard',
  colorMode: 'grayscale',
  fontSize: 'medium',
  theme: 'normal',
  appearance: 'light',
  zoom: 1,

  reduceMotion: 'system',
  lineHeight: 'normal',
  contentWidth: 'narrow',
  letterSpacing: 'normal',

  showClock: true,
  timeFormat: '24h',
  showAppTitle: true,

  showGamesSection: true,
  appsPerRow: 'auto',
  sortOrder: 'a-z',

  corsProxyUrl: '',
  defaultCacheTtl: '30m',
  offlinePreference: 'preferCache',

  tapTargetSize: 'normal',
  focusRing: 'keyboard',
  highContrastFocus: false,

  invertColors: false,
  reduceFlashes: false,
  simpleLayout: false,

  financeItems: '[{"id":"^GSPC","name":"S&P 500","source":"yahoo"},{"id":"GC=F","name":"Gold","source":"yahoo"},{"id":"bitcoin","name":"Bitcoin","source":"coingecko"},{"id":"ethereum","name":"Ethereum","source":"coingecko"}]',

  redditSubreddits: '["books","cryptocurrencies","popular","technology","wallstreetbets","worldnews"]',

  blogFeeds: '[{"id":"hackernews","name":"Hacker News","url":"https://hnrss.org/frontpage"},{"id":"wired","name":"Wired","url":"https://www.wired.com/feed/rss"},{"id":"techcrunch","name":"TechCrunch","url":"https://techcrunch.com/feed/"},{"id":"arstechnica","name":"Ars Technica","url":"https://feeds.arstechnica.com/arstechnica/index"}]',

  worldClockZones: '[{"id":"utc","label":"UTC","offsetMinutes":0},{"id":"new-york","label":"New York","offsetMinutes":-300},{"id":"london","label":"London","offsetMinutes":0},{"id":"berlin","label":"Berlin","offsetMinutes":60},{"id":"tokyo","label":"Tokyo","offsetMinutes":540}]',
};
