import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,eur&include_24hr_change=true';
const CORS_PROXY = 'https://corsproxy.io/?';
const YAHOO_CHART = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
const EURUSD_SYMBOL = 'EURUSD=X';

type Currency = 'USD' | 'EUR';

interface FinanceRow {
  id: string;
  name: string;
  priceUsd: number | null;
  priceEur: number | null;
  change24hUsd: number | null;
  change24hEur: number | null;
  error?: string;
}

function formatPrice(n: number, currency: Currency): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  const locale = currency === 'EUR' ? 'de-DE' : 'en-US';
  if (n >= 1e6) return `${symbol}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${symbol}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${symbol}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
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

function FinanceApp(context: AppContext): AppInstance {
  const { network } = context.services;

  function FinanceUI() {
    const [rows, setRows] = useState<FinanceRow[]>([
      { id: 'sp500', name: 'S&P 500', priceUsd: null, priceEur: null, change24hUsd: null, change24hEur: null },
      { id: 'gold', name: 'Gold', priceUsd: null, priceEur: null, change24hUsd: null, change24hEur: null },
      { id: 'bitcoin', name: 'Bitcoin', priceUsd: null, priceEur: null, change24hUsd: null, change24hEur: null },
      { id: 'ethereum', name: 'Ethereum', priceUsd: null, priceEur: null, change24hUsd: null, change24hEur: null },
    ]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<Currency>('USD');

    const fetchData = useCallback(async () => {
      setLoading(true);
      setError(null);
      const next: FinanceRow[] = [
        { id: 'sp500', name: 'S&P 500', priceUsd: null, priceEur: null, change24hUsd: null, change24hEur: null },
        { id: 'gold', name: 'Gold', priceUsd: null, priceEur: null, change24hUsd: null, change24hEur: null },
        { id: 'bitcoin', name: 'Bitcoin', priceUsd: null, priceEur: null, change24hUsd: null, change24hEur: null },
        { id: 'ethereum', name: 'Ethereum', priceUsd: null, priceEur: null, change24hUsd: null, change24hEur: null },
      ];

      type CoinGeckoRow = { usd?: number; eur?: number; usd_24h_change?: number; eur_24h_change?: number };
      try {
        const [cryptoRes, sp500Res, goldRes, eurUsdRes] = await Promise.all([
          network.fetchJson<{ bitcoin?: CoinGeckoRow; ethereum?: CoinGeckoRow }>(COINGECKO_URL),
          network.fetch(CORS_PROXY + encodeURIComponent(YAHOO_CHART('^GSPC'))).then((r) => r.json()).catch(() => null),
          network.fetch(CORS_PROXY + encodeURIComponent(YAHOO_CHART('GC=F'))).then((r) => r.json()).catch(() => null),
          network.fetch(CORS_PROXY + encodeURIComponent(YAHOO_CHART(EURUSD_SYMBOL))).then((r) => r.json()).catch(() => null),
        ]);

        const eurUsdMeta = eurUsdRes?.chart?.result?.[0]?.meta;
        const eurUsdRate = eurUsdMeta?.regularMarketPrice as number | undefined;
        const eurUsdPrev = (eurUsdMeta?.chartPreviousClose ?? eurUsdMeta?.previousClose) as number | undefined;
        const usdToEur = typeof eurUsdRate === 'number' && eurUsdRate > 0 ? (usd: number) => usd / eurUsdRate : null;
        const hasEurUsdRates =
          typeof eurUsdRate === 'number' && eurUsdRate > 0 && typeof eurUsdPrev === 'number' && eurUsdPrev > 0;

        if (cryptoRes?.bitcoin?.usd != null) {
          next[2].priceUsd = cryptoRes.bitcoin.usd;
          if (cryptoRes.bitcoin.eur != null) next[2].priceEur = cryptoRes.bitcoin.eur;
          if (typeof cryptoRes.bitcoin.usd_24h_change === 'number') next[2].change24hUsd = cryptoRes.bitcoin.usd_24h_change;
          if (typeof cryptoRes.bitcoin.eur_24h_change === 'number') next[2].change24hEur = cryptoRes.bitcoin.eur_24h_change;
        }
        if (cryptoRes?.ethereum?.usd != null) {
          next[3].priceUsd = cryptoRes.ethereum.usd;
          if (cryptoRes.ethereum.eur != null) next[3].priceEur = cryptoRes.ethereum.eur;
          if (typeof cryptoRes.ethereum.usd_24h_change === 'number') next[3].change24hUsd = cryptoRes.ethereum.usd_24h_change;
          if (typeof cryptoRes.ethereum.eur_24h_change === 'number') next[3].change24hEur = cryptoRes.ethereum.eur_24h_change;
        }

        const spMeta = sp500Res?.chart?.result?.[0]?.meta;
        const spPrice = spMeta?.regularMarketPrice as number | undefined;
        const spPrev = (spMeta?.chartPreviousClose ?? spMeta?.previousClose) as number | undefined;
        if (typeof spPrice === 'number' && typeof spPrev === 'number' && spPrev !== 0) {
          next[0].priceUsd = spPrice;
          if (usdToEur) next[0].priceEur = usdToEur(spPrice);
          next[0].change24hUsd = ((spPrice - spPrev) / spPrev) * 100;
          if (hasEurUsdRates) {
            const prevEur = spPrev / eurUsdPrev;
            const currEur = spPrice / eurUsdRate;
            next[0].change24hEur = ((currEur - prevEur) / prevEur) * 100;
          }
        }

        const goldMeta = goldRes?.chart?.result?.[0]?.meta;
        const goldPrice = goldMeta?.regularMarketPrice as number | undefined;
        const goldPrev = (goldMeta?.chartPreviousClose ?? goldMeta?.previousClose) as number | undefined;
        if (typeof goldPrice === 'number' && typeof goldPrev === 'number' && goldPrev !== 0) {
          next[1].priceUsd = goldPrice;
          if (usdToEur) next[1].priceEur = usdToEur(goldPrice);
          next[1].change24hUsd = ((goldPrice - goldPrev) / goldPrev) * 100;
          if (hasEurUsdRates) {
            const prevEur = goldPrev / eurUsdPrev;
            const currEur = goldPrice / eurUsdRate;
            next[1].change24hEur = ((currEur - prevEur) / prevEur) * 100;
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
        setRows(next);
      }
    }, [network]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    return (
      <div class="finance-app">
        {loading && <p>Loading…</p>}
        {error && <p class="browser-error">{error}</p>}
        <ul class="finance-list">
          {rows.map((r) => {
            const price = currency === 'EUR' ? r.priceEur : r.priceUsd;
            const priceStr = price != null ? formatPrice(price, currency) : '—';
            const changePct = currency === 'EUR' ? r.change24hEur : r.change24hUsd;
            const absChange =
              changePct != null && price != null ? (changePct / 100) * price : undefined;
            return (
              <li key={r.id} class="finance-row">
                <span class="finance-name">{r.name}</span>
                <span class="finance-right">
                  {changePct != null && (
                    <span class={`finance-change ${changePct >= 0 ? 'finance-change-up' : 'finance-change-down'}`}>
                      {formatChange24h(changePct, absChange, currency)}
                    </span>
                  )}
                  <span class="finance-price">{priceStr}</span>
                </span>
              </li>
            );
          })}
        </ul>
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
