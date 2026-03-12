import { useState, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { getCorsProxyUrl } from '@core/constants';
import { sanitizeUrl } from '@core/utils/url';

const CACHE_PREFIX = 'recipes:';
const SEARCH_CACHE_PREFIX = 'recipes:search:';

interface MealSummary {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

interface MealDetail extends MealSummary {
  strInstructions: string;
  strIngredient1?: string;
  strIngredient2?: string;
  strIngredient3?: string;
  strIngredient4?: string;
  strIngredient5?: string;
  strIngredient6?: string;
  strIngredient7?: string;
  strIngredient8?: string;
  strIngredient9?: string;
  strIngredient10?: string;
  strIngredient11?: string;
  strIngredient12?: string;
  strIngredient13?: string;
  strIngredient14?: string;
  strIngredient15?: string;
  strIngredient16?: string;
  strIngredient17?: string;
  strIngredient18?: string;
  strIngredient19?: string;
  strIngredient20?: string;
  strMeasure1?: string;
  strMeasure2?: string;
  strMeasure3?: string;
  strMeasure4?: string;
  strMeasure5?: string;
  strMeasure6?: string;
  strMeasure7?: string;
  strMeasure8?: string;
  strMeasure9?: string;
  strMeasure10?: string;
  strMeasure11?: string;
  strMeasure12?: string;
  strMeasure13?: string;
  strMeasure14?: string;
  strMeasure15?: string;
  strMeasure16?: string;
  strMeasure17?: string;
  strMeasure18?: string;
  strMeasure19?: string;
  strMeasure20?: string;
}

function RecipeApp(context: AppContext): AppInstance {
  // #region agent log
  fetch('http://127.0.0.1:7647/ingest/0cc433dc-bc56-4722-8dcd-55136a56519b', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fbf877' }, body: JSON.stringify({ sessionId: 'fbf877', location: 'recipes/index.tsx', message: 'RecipeApp entered', data: {}, hypothesisId: 'LAUNCH', timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  const { network, storage } = context.services;
  const backRef: { current: { view: 'search' | 'detail'; setView: (v: 'search' | 'detail') => void; setDetailId: (id: string | null) => void } | null } = { current: null };

  // #region agent log
  const log = (message: string, data: Record<string, unknown>, hypothesisId: string) => {
    fetch('http://127.0.0.1:7647/ingest/0cc433dc-bc56-4722-8dcd-55136a56519b', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fbf877' }, body: JSON.stringify({ sessionId: 'fbf877', location: 'recipes/index.tsx', message, data, hypothesisId, timestamp: Date.now() }) }).catch(() => {});
  };
  // #endregion

  function RecipeUI() {
    const [view, setView] = useState<'search' | 'detail'>('search');
    const [, setDetailId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [meals, setMeals] = useState<MealSummary[]>([]);
    const [detail, setDetail] = useState<MealDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    backRef.current = { view, setView, setDetailId };

    const search = useCallback(async () => {
      const q = query.trim();
      if (!q) return;
      setLoading(true);
      setError(null);
      setMeals([]);
      try {
        const cacheKey = SEARCH_CACHE_PREFIX + encodeURIComponent(q).slice(0, 100);
        const cached = await storage.get<MealSummary[]>(cacheKey);
        if (cached && cached.length > 0) {
          setMeals(cached);
          setLoading(false);
          return;
        }
        const base = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`;
        const proxy = getCorsProxyUrl(context.services.settings.get().corsProxyUrl);
        const url = proxy + encodeURIComponent(base);
        // #region agent log
        log('search request', { proxy: proxy.slice(0, 40), urlLen: url.length, query: q }, 'B');
        // #endregion
        const data = await network.fetchJson<{ meals: MealSummary[] | null }>(url);
        const list = data?.meals && Array.isArray(data.meals) ? data.meals : [];
        // #region agent log
        log('search response', { mealsCount: data?.meals?.length ?? null, listLength: list.length }, 'C');
        // #endregion
        setMeals(list);
        if (list.length > 0) await storage.set(cacheKey, list);
      } catch (e) {
        // #region agent log
        log('search error', { err: e instanceof Error ? e.message : String(e) }, 'B');
        // #endregion
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, [query, network, storage, context.services.settings]);

    const loadDetail = useCallback(
      async (id: string) => {
        setView('detail');
        setDetailId(id);
        setDetail(null);
        setDetailLoading(true);
        try {
          const cacheKey = CACHE_PREFIX + id;
          const cached = await storage.get<MealDetail>(cacheKey);
          if (cached) {
            setDetail(cached);
            setDetailLoading(false);
            return;
          }
          const base = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`;
          const proxy = getCorsProxyUrl(context.services.settings.get().corsProxyUrl);
          const url = proxy + encodeURIComponent(base);
          // #region agent log
          log('loadDetail request', { id, proxy: proxy.slice(0, 40) }, 'D');
          // #endregion
          const data = await network.fetchJson<{ meals: MealDetail[] | null }>(url);
          const meal = data?.meals?.[0] ?? null;
          // #region agent log
          log('loadDetail response', { hasMeal: !!meal, strMeal: meal?.strMeal ?? null }, 'D');
          // #endregion
          setDetail(meal || null);
          if (meal) await storage.set(cacheKey, meal);
        } catch (e) {
          // #region agent log
          log('loadDetail error', { err: e instanceof Error ? e.message : String(e) }, 'D');
          // #endregion
          setError(e instanceof Error ? e.message : 'Load failed');
        } finally {
          setDetailLoading(false);
        }
      },
      [network, storage, context.services.settings]
    );

    const goBack = useCallback(() => {
      setView('search');
      setDetailId(null);
      setDetail(null);
    }, []);

    const ingredients = detail
      ? Array.from({ length: 20 }, (_, i) => {
          const d = detail as unknown as Record<string, string>;
          const ing = d[`strIngredient${i + 1}`];
          const measure = d[`strMeasure${i + 1}`];
          if (!ing || !ing.trim()) return null;
          return { ing: ing.trim(), measure: (measure || '').trim() };
        }).filter(Boolean) as { ing: string; measure: string }[]
      : [];

    // #region agent log
    log('RecipeUI render', { view }, 'E');
    // #endregion
    if (view === 'detail') {
      return (
        <div class="recipes-app">
          <button type="button" class="btn btn-secondary" onClick={goBack}>
            ← Back to search
          </button>
          {detailLoading && <p>Loading…</p>}
          {error && <p class="browser-error">{error}</p>}
          {detail && !detailLoading && (
            <div class="recipes-detail">
              <h2 class="recipes-detail-title">{detail.strMeal}</h2>
              {(() => {
                const thumb = sanitizeUrl(detail.strMealThumb);
                return thumb ? <img src={thumb} alt="" class="recipes-detail-img" loading="lazy" /> : null;
              })()}
              {ingredients.length > 0 && (
                <div class="recipes-ingredients">
                  <h3>Ingredients</h3>
                  <ul>
                    {ingredients.map((x, i) => (
                      <li key={i}>
                        {x.measure ? `${x.measure} ${x.ing}` : x.ing}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.strInstructions && (
                <div class="recipes-instructions">
                  <h3>Instructions</h3>
                  <p class="recipes-instructions-text">{detail.strInstructions}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div class="recipes-app">
        <p class="widget-hint">Search recipes by name. Results from TheMealDB, cached offline.</p>
        <div class="recipes-search">
          <input
            type="text"
            class="input recipes-input"
            placeholder="e.g. chicken, pasta"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            aria-label="Search recipes"
          />
          <button type="button" class="btn" onClick={search} disabled={loading}>
            Search
          </button>
        </div>
        {loading && <p>Loading…</p>}
        {error && <p class="browser-error">{error}</p>}
        {meals.length > 0 && (
          <ul class="recipes-list">
            {meals.map((m) => (
              <li key={m.idMeal}>
                <button
                  type="button"
                  class="recipes-list-btn"
                  onClick={() => loadDetail(m.idMeal)}
                >
                  {(() => {
                    const thumb = sanitizeUrl(m.strMealThumb);
                    return thumb ? <img src={thumb} alt="" class="recipes-list-thumb" loading="lazy" /> : null;
                  })()}
                  <span>{m.strMeal}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!loading && !error && query.trim() && meals.length === 0 && (
          <p>No recipes found. Try another search.</p>
        )}
      </div>
    );
  }

  return {
    render: () => <RecipeUI />,
    getTitle: () => {
      const currentView = backRef.current?.view ?? 'search';
      const title = currentView === 'detail' ? 'Recipe' : 'Recipes';
      // #region agent log
      log('getTitle called', { view: currentView, title }, 'A');
      // #endregion
      return title;
    },
    canGoBack: () => {
      const currentView = backRef.current?.view ?? 'search';
      const can = currentView === 'detail';
      // #region agent log
      log('canGoBack called', { view: currentView, canGoBack: can }, 'A');
      // #endregion
      return can;
    },
    goBack: () => {
      backRef.current?.setView('search');
      backRef.current?.setDetailId(null);
    },
  };
}

export const recipesApp = {
  id: 'recipes',
  name: 'Recipes',
  icon: '🍳',
  iconFallback: 'R',
  category: 'reader' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: RecipeApp,
};
