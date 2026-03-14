import { useState, useEffect, useCallback, useContext } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { getCorsProxyUrl } from '@core/constants';
import { AppHeaderActionsContext } from '@core/kernel/AppHeaderActionsContext';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3/simple/price';
const YAHOO_CHART = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
const YAHOO_SEARCH = (q: string) =>
  `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8`;
const EURUSD_SYMBOL = 'EURUSD=X';

type Currency = 'USD' | 'EUR';
type Source = 'yahoo' | 'coingecko';

export interface FinanceItem {
  id: string;
  name: string;
  source: Source;
}

interface FinanceRow extends FinanceItem {
  priceUsd: number | null;
  priceEur: number | null;
  change24hUsd: number | null;
  change24hEur: number | null;
  error?: string;
}

const DEFAULT_ITEMS: FinanceItem[] = [
  { id: '^GSPC', name: 'S&P 500', source: 'yahoo' },
  { id: 'GC=F', name: 'Gold', source: 'yahoo' },
  { id: 'bitcoin', name: 'Bitcoin', source: 'coingecko' },
  { id: 'ethereum', name: 'Ethereum', source: 'coingecko' },
];

function parseFinanceItems(json: string | undefined): FinanceItem[] {
  if (!json || !json.trim()) return [...DEFAULT_ITEMS];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [...DEFAULT_ITEMS];
    const out: FinanceItem[] = [];
    for (const x of arr) {
      if (x && typeof x === 'object' && typeof (x as FinanceItem).id === 'string' && typeof (x as FinanceItem).name === 'string' && ((x as FinanceItem).source === 'yahoo' || (x as FinanceItem).source === 'coingecko')) {
        out.push({ id: (x as FinanceItem).id, name: (x as FinanceItem).name, source: (x as FinanceItem).source });
      }
    }
    return out.length ? out : [...DEFAULT_ITEMS];
  } catch {
    return [...DEFAULT_ITEMS];
  }
}

/** Legacy-safe number with decimals (no Intl). */
function formatNumberLegacy(n: number, minDec: number, maxDec: number): string {
  return n.toFixed(Math.min(maxDec, Math.max(minDec, 0)));
}

function formatPrice(n: number, currency: Currency): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  if (n >= 1e6) return `${symbol}${(n / 1e6).toFixed(2)}M`;
  const isLegacy = typeof import.meta.env.LEGACY !== 'undefined' && import.meta.env.LEGACY;
  if (isLegacy) {
    const str = n >= 1e3 ? formatNumberLegacy(n, 2, 2) : formatNumberLegacy(n, 2, 4);
    return symbol + str;
  }
  try {
    const locale = currency === 'EUR' ? 'de-DE' : 'en-US';
    if (n >= 1e3) return `${symbol}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${symbol}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  } catch {
    return `${symbol}${n.toFixed(2)}`;
  }
}

function formatChange24h(pct: number, absoluteInCurrency?: number, currency?: Currency): string {
  const sign = pct >= 0 ? '+' : '';
  const pctStr = `${sign}${pct.toFixed(2)}%`;
  if (absoluteInCurrency != null && currency != null) {
    const absStr = formatPrice(Math.abs(absoluteInCurrency), currency);
    const signedAbs = absoluteInCurrency >= 0 ? `+${absStr}` : `−${absStr}`;
    return `${pctStr} (${signedAbs})`;
  }
  return pctStr;
}

function financeItemsToJson(items: FinanceItem[]): string {
  return JSON.stringify(items);
}

function FinanceApp(context: AppContext): AppInstance {
  const { network, settings } = context.services;

  function FinanceUI() {
    const [items, setItems] = useState<FinanceItem[]>(() => parseFinanceItems(settings.get().financeItems));
    const [rows, setRows] = useState<FinanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<Currency>('USD');
    const [searchAddInput, setSearchAddInput] = useState('');
    const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
    const [searching, setSearching] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const setHeaderActions = useContext(AppHeaderActionsContext);

    useEffect(() => {
      if (!setHeaderActions) return;
      const node = (
        <button
          type="button"
          class="btn btn-header-action"
          onClick={() => setEditMode((e) => !e)}
          aria-label={editMode ? 'Done editing' : 'Edit list'}
          title={editMode ? 'Done' : 'Edit'}
          aria-pressed={editMode}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      );
      setHeaderActions(node);
      return () => setHeaderActions(null);
    }, [setHeaderActions, editMode]);

    const persistItems = useCallback(
      (next: FinanceItem[]) => {
        setItems(next);
        settings.set({ financeItems: financeItemsToJson(next) });
      },
      [settings]
    );

    const fetchData = useCallback(async () => {
      setLoading(true);
      setError(null);
      const list = items.length ? items : parseFinanceItems(settings.get().financeItems);
      const yahooItems = list.filter((i) => i.source === 'yahoo');
      const coingeckoIds = list.filter((i) => i.source === 'coingecko').map((i) => i.id);

      const next: FinanceRow[] = list.map((i) => ({
        ...i,
        priceUsd: null,
        priceEur: null,
        change24hUsd: null,
        change24hEur: null,
      }));

      type CoinGeckoRow = { usd?: number; eur?: number; usd_24h_change?: number; eur_24h_change?: number };
      try {
        const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);

        const [eurUsdRes, ...yahooResults] = await Promise.all([
          network.fetch(proxy + encodeURIComponent(YAHOO_CHART(EURUSD_SYMBOL))).then((r) => r.json()).catch(() => null),
          ...yahooItems.map((item) =>
            network.fetch(proxy + encodeURIComponent(YAHOO_CHART(item.id))).then((r) => r.json()).catch(() => null)
          ),
        ]);

        let cryptoRes: Record<string, CoinGeckoRow> | null = null;
        if (coingeckoIds.length > 0) {
          const url = `${COINGECKO_BASE}?ids=${coingeckoIds.join(',')}&vs_currencies=usd,eur&include_24hr_change=true`;
          cryptoRes = await network.fetchJson<Record<string, CoinGeckoRow>>(url).catch(() => null);
        }

        const eurUsdMeta = eurUsdRes?.chart?.result?.[0]?.meta;
        const eurUsdRate = eurUsdMeta?.regularMarketPrice as number | undefined;
        const eurUsdPrev = (eurUsdMeta?.chartPreviousClose ?? eurUsdMeta?.previousClose) as number | undefined;
        const usdToEur = typeof eurUsdRate === 'number' && eurUsdRate > 0 ? (usd: number) => usd / eurUsdRate : null;
        const hasEurUsdRates =
          typeof eurUsdRate === 'number' && eurUsdRate > 0 && typeof eurUsdPrev === 'number' && eurUsdPrev > 0;

        let yahooIdx = 0;
        for (let rowIdx = 0; rowIdx < list.length; rowIdx++) {
          const item = list[rowIdx];
          const row = next[rowIdx];
          if (item.source === 'coingecko' && cryptoRes?.[item.id]) {
            const c = cryptoRes[item.id];
            if (c.usd != null) {
              row.priceUsd = c.usd;
              if (c.eur != null) row.priceEur = c.eur;
              if (typeof c.usd_24h_change === 'number') row.change24hUsd = c.usd_24h_change;
              if (typeof c.eur_24h_change === 'number') row.change24hEur = c.eur_24h_change;
            }
            continue;
          }
          if (item.source === 'yahoo') {
            const res = yahooResults[yahooIdx] as { chart?: { result?: { meta?: unknown }[]; error?: unknown } } | null;
            yahooIdx++;
            const meta = res?.chart?.result?.[0]?.meta as { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number } | undefined;
            const price = meta?.regularMarketPrice;
            const prev = meta?.chartPreviousClose ?? meta?.previousClose;
            if (typeof price === 'number' && typeof prev === 'number' && prev !== 0) {
              row.priceUsd = price;
              if (usdToEur) row.priceEur = usdToEur(price);
              row.change24hUsd = ((price - prev) / prev) * 100;
              if (hasEurUsdRates && eurUsdRate != null && eurUsdPrev != null) {
                const prevEur = prev / eurUsdPrev;
                const currEur = price / eurUsdRate;
                row.change24hEur = ((currEur - prevEur) / prevEur) * 100;
              }
            } else if (res?.chart?.error) {
              row.error = 'Not found';
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
        setRows(next);
      }
    }, [items, network, settings]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    const removeItem = (id: string, source: Source) => {
      const next = items.filter((i) => !(i.id === id && i.source === source));
      persistItems(next.length ? next : DEFAULT_ITEMS);
    };

    const addBySymbol = async () => {
      const raw = searchAddInput.trim();
      if (!raw) return;
      setAddError(null);
      const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
      // Try Yahoo first
      try {
        const res = await network.fetch(proxy + encodeURIComponent(YAHOO_CHART(raw))).then((r) => r.json()).catch(() => null);
        const meta = res?.chart?.result?.[0]?.meta;
        const name = meta?.shortName ?? meta?.regularMarketPrice ?? raw;
        const nameStr = typeof name === 'string' ? name : raw;
        if (meta && items.every((i) => !(i.id === raw && i.source === 'yahoo'))) {
          persistItems([...items, { id: raw, name: nameStr, source: 'yahoo' }]);
          setSearchAddInput('');
          return;
        }
      } catch {
        // ignore
      }
      // Try CoinGecko (id must be lowercase, no spaces)
      const cgId = raw.toLowerCase().replace(/\s+/g, '-');
      try {
        const url = `${COINGECKO_BASE}?ids=${cgId}&vs_currencies=usd`;
        const data = await network.fetchJson<Record<string, { usd?: number }>>(url).catch(() => null);
        if (data?.[cgId]?.usd != null && items.every((i) => !(i.id === cgId && i.source === 'coingecko'))) {
          const label = raw.charAt(0).toUpperCase() + raw.slice(1).replace(/-/g, ' ');
          persistItems([...items, { id: cgId, name: label, source: 'coingecko' }]);
          setSearchAddInput('');
          return;
        }
      } catch {
        // ignore
      }
      setAddError('Symbol or CoinGecko id not found. Try e.g. AAPL, ^GSPC, or bitcoin.');
    };

    const runSearch = async () => {
      const q = searchAddInput.trim();
      if (!q) return;
      setSearching(true);
      setSearchResults([]);
      try {
        const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
        const res = await network.fetch(proxy + encodeURIComponent(YAHOO_SEARCH(q))).then((r) => r.json()).catch(() => null);
        const quotes = (res?.quotes ?? []) as { symbol?: string; shortname?: string; longname?: string }[];
        const list = quotes
          .filter((x) => x.symbol)
          .map((x) => ({ symbol: x.symbol!, name: x.shortname || x.longname || x.symbol! }));
        setSearchResults(list);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const addSearchResult = (symbol: string, name: string) => {
      if (items.some((i) => i.id === symbol && i.source === 'yahoo')) return;
      persistItems([...items, { id: symbol, name, source: 'yahoo' }]);
    };

    return (
      <div class="finance-app">
        {loading && <p>Loading…</p>}
        {error && <p class="browser-error">{error}</p>}
        <ul class="finance-list">
          {rows.map((r) => {
            const price = currency === 'EUR' ? r.priceEur : r.priceUsd;
            const priceStr = price != null ? formatPrice(price, currency) : (r.error ?? '—');
            const changePct = currency === 'EUR' ? r.change24hEur : r.change24hUsd;
            const absChange = changePct != null && price != null ? (changePct / 100) * price : undefined;
            return (
              <li key={`${r.source}-${r.id}`} class="finance-row">
                <span class="finance-name">{r.name}</span>
                <span class="finance-right">
                  {changePct != null && (
                    <span class={`finance-change ${changePct >= 0 ? 'finance-change-up' : 'finance-change-down'}`}>
                      {formatChange24h(changePct, absChange, currency)}
                    </span>
                  )}
                  <span class="finance-price">{priceStr}</span>
                  {editMode && (
                    <button
                      type="button"
                      class="btn btn-small finance-delete"
                      onClick={() => removeItem(r.id, r.source)}
                      aria-label={`Remove ${r.name}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        <div class="finance-add-section">
          <div class="finance-add-row finance-search-add-bar">
            <input
              type="text"
              class="input finance-add-input"
              placeholder="Symbol, id, or search (e.g. AAPL, bitcoin, Apple)"
              value={searchAddInput}
              onInput={(e) => setSearchAddInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const target = (e.target as HTMLInputElement);
                if (target.value.trim()) addBySymbol();
              }}
            />
            <button type="button" class="btn" onClick={runSearch} disabled={searching || !searchAddInput.trim()}>
              {searching ? 'Searching…' : 'Search'}
            </button>
            <button type="button" class="btn" onClick={addBySymbol} disabled={!searchAddInput.trim()}>
              Add
            </button>
          </div>
          {addError && <p class="finance-add-error">{addError}</p>}
          {searchResults.length > 0 && (
            <ul class="finance-search-results">
              {searchResults.map((s) => (
                <li key={s.symbol} class="finance-search-item">
                  <span>{s.name} ({s.symbol})</span>
                  <button
                    type="button"
                    class="btn btn-small"
                    onClick={() => addSearchResult(s.symbol, s.name)}
                    disabled={items.some((i) => i.id === s.symbol && i.source === 'yahoo')}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="finance-actions">
          <button
            type="button"
            class="btn"
            onClick={() => setCurrency((c) => (c === 'USD' ? 'EUR' : 'USD'))}
            title={currency === 'USD' ? 'Show prices in EUR' : 'Show prices in USD'}
          >
            {currency === 'USD' ? 'Show in EUR' : 'Show in USD'}
          </button>
          <button type="button" class="btn" onClick={fetchData} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return { render: () => <FinanceUI />, getTitle: () => 'Markets' };
}

export const financeApp = {
  id: 'finance',
  name: 'Finance',
  icon: '📈',
  category: 'network' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: FinanceApp,
};
