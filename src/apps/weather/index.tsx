import { useState, useEffect, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { getDefaultCacheTtlMs } from '@core/constants';
import { formatWeekdayShortLegacy } from '@core/utils/date';

const CACHE_KEY = 'weather:cache';
const DEFAULT_LAT = 52.52;
const DEFAULT_LON = 13.41;
const OPEN_METEO = (lat: number, lon: number) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`;
const OPEN_METEO_GEOCODE = (name: string) =>
  `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5`;
const NOMINATIM_REVERSE = (lat: number, lon: number) =>
  `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
const NOMINATIM_UA = 'LibreInkWeather/1.0';

/** Get city name from Nominatim reverse geocode response. */
function cityFromAddress(address: Record<string, string> | undefined): string {
  if (!address) return '';
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    address.state ??
    address.country ??
    ''
  );
}

/** Short labels for WMO weather codes (0–99). Good for e-ink, minimal text. */
function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 49) return 'Fog';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Showers';
  if (code <= 94) return 'Thunderstorm';
  return 'Storm';
}

/** Text labels for weather codes (Kindle/e-ink safe, no Unicode emoji). */
function weatherIcon(code: number): string {
  if (code === 0) return 'Sun';
  if (code <= 3) return 'Cld';
  if (code <= 49) return 'Fog';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 94) return 'T-storm';
  return 'Storm';
}

interface CachedWeather {
  fetchedAt: number;
  cityName?: string;
  current: { temp: number; code: number };
  daily: { date: string; code: number; max: number; min: number }[];
}

function WeatherApp(context: AppContext): AppInstance {
  const { network, storage, settings } = context.services;
  const titleRef: { current: string } = { current: 'Weather' };

  function WeatherUI() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<CachedWeather | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const setWeatherData = useCallback((next: CachedWeather) => {
      setData(next);
      titleRef.current = next.cityName ? `Weather · ${next.cityName}` : 'Weather';
    }, []);

    const fetchWeatherForCity = useCallback(async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      try {
        const geoRes = await network.fetchJson<{ results?: { name: string; latitude: number; longitude: number; country?: string }[] }>(
          OPEN_METEO_GEOCODE(trimmed)
        );
        const first = geoRes.results?.[0];
        if (!first) {
          setError('City not found');
          setLoading(false);
          return;
        }
        const { name, latitude: lat, longitude: lon, country } = first;
        const cityName = country ? `${name}, ${country}` : name;

        const res = await network.fetchJson<{
          current?: { temperature_2m?: number; weather_code?: number };
          daily?: {
            time?: string[];
            weather_code?: number[];
            temperature_2m_max?: number[];
            temperature_2m_min?: number[];
          };
        }>(OPEN_METEO(lat, lon));

        const cur = res.current;
        const daily = res.daily;
        const current = cur?.temperature_2m != null && cur?.weather_code != null
          ? { temp: cur.temperature_2m, code: cur.weather_code }
          : null;
        const times = daily?.time ?? [];
        const codes = daily?.weather_code ?? [];
        const maxs = daily?.temperature_2m_max ?? [];
        const mins = daily?.temperature_2m_min ?? [];
        const dailySlice = times.slice(0, 4).map((date, i) => ({
          date,
          code: codes[i] ?? 0,
          max: maxs[i] ?? 0,
          min: mins[i] ?? 0,
        }));

        const next: CachedWeather = {
          fetchedAt: Date.now(),
          cityName,
          current: current ?? { temp: 0, code: 0 },
          daily: dailySlice,
        };
        await storage.set(CACHE_KEY, next);
        setWeatherData(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, [network, storage, setWeatherData]);

    const fetchWeather = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const cacheTtl = getDefaultCacheTtlMs(settings.get().defaultCacheTtl);
        const cached = await storage.get<CachedWeather>(CACHE_KEY);
        if (cached && Date.now() - cached.fetchedAt < cacheTtl) {
          setData(cached);
          titleRef.current = cached.cityName ? `Weather · ${cached.cityName}` : 'Weather';
          setLoading(false);
          return;
        }

        let lat = DEFAULT_LAT;
        let lon = DEFAULT_LON;
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                maximumAge: 600000,
                enableHighAccuracy: false,
              });
            });
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
          } catch {
            /* use defaults */
          }
        }

        let cityName = '';
        try {
          const revRes = await network.fetch(NOMINATIM_REVERSE(lat, lon), {
            headers: { 'User-Agent': NOMINATIM_UA },
          });
          const rev = await revRes.json() as { address?: Record<string, string> };
          cityName = cityFromAddress(rev?.address) ?? '';
        } catch {
          /* continue without city name */
        }

        const res = await network.fetchJson<{
          current?: { temperature_2m?: number; weather_code?: number };
          daily?: {
            time?: string[];
            weather_code?: number[];
            temperature_2m_max?: number[];
            temperature_2m_min?: number[];
          };
        }>(OPEN_METEO(lat, lon));

        const cur = res.current;
        const daily = res.daily;
        const current = cur?.temperature_2m != null && cur?.weather_code != null
          ? { temp: cur.temperature_2m, code: cur.weather_code }
          : null;
        const times = daily?.time ?? [];
        const codes = daily?.weather_code ?? [];
        const maxs = daily?.temperature_2m_max ?? [];
        const mins = daily?.temperature_2m_min ?? [];
        const dailySlice = times.slice(0, 4).map((date, i) => ({
          date,
          code: codes[i] ?? 0,
          max: maxs[i] ?? 0,
          min: mins[i] ?? 0,
        }));

        const next: CachedWeather = {
          fetchedAt: Date.now(),
          cityName,
          current: current ?? { temp: 0, code: 0 },
          daily: dailySlice,
        };
        await storage.set(CACHE_KEY, next);
        setData(next);
        titleRef.current = cityName ? `Weather · ${cityName}` : 'Weather';
      } catch (e) {
        const cached = await storage.get<CachedWeather>(CACHE_KEY);
        if (cached) {
          setData(cached);
          titleRef.current = cached.cityName ? `Weather · ${cached.cityName}` : 'Weather';
        }
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }, [network, storage]);

    useEffect(() => {
      fetchWeather();
    }, [fetchWeather]);

    const onSearch = () => fetchWeatherForCity(searchQuery);

    return (
      <div class="weather-app">
        <p class="widget-hint">Search city. Forecast cached for offline.</p>
        <div class="weather-search">
          <input
            type="text"
            class="input weather-search-input"
            placeholder="Search city…"
            value={searchQuery}
            onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            aria-label="City search"
          />
          <button type="button" class="btn" onClick={onSearch} disabled={loading}>
            Search
          </button>
        </div>
        {loading && !data && <p class="widget-meta">Loading…</p>}
        {error && <p class="browser-error">{error}</p>}
        {data && (
          <>
            {data.cityName && <h2 class="weather-city">{data.cityName}</h2>}
            <div class="weather-current">
              <span class="weather-temp">{Math.round(data.current.temp)}°</span>
              <div class="weather-current-meta">
                <span class="weather-icon" aria-hidden="true">{weatherIcon(data.current.code)}</span>
                <span class="weather-desc">{weatherLabel(data.current.code)}</span>
              </div>
            </div>
            <ul class="weather-forecast" role="list" aria-label="Daily forecast">
              {data.daily.map((day) => (
                <li key={day.date} class="weather-forecast-row">
                  <span class="weather-day">{formatWeekdayShortLegacy(new Date(day.date))}</span>
                  <span class="weather-day-icon" aria-hidden="true">{weatherIcon(day.code)}</span>
                  <span class="weather-day-range">{Math.round(day.min)}° – {Math.round(day.max)}°</span>
                </li>
              ))}
            </ul>
            <div class="weather-actions">
              <button type="button" class="btn" onClick={fetchWeather} disabled={loading}>
                Refresh
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return {
    render: () => <WeatherUI />,
    getTitle: () => titleRef.current,
  };
}

export const weatherApp = {
  id: 'weather',
  name: 'Weather',
  icon: '🌤️',
  iconFallback: '~',
  category: 'network' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: WeatherApp,
};
