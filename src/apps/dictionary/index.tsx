import { useState, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const API_URL = (word: string) =>
  `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`;
const CACHE_PREFIX = 'dictionary:';

interface DictMeaning {
  partOfSpeech?: string;
  definitions?: { definition?: string; example?: string }[];
}

interface DictEntry {
  word?: string;
  phonetic?: string;
  meanings?: DictMeaning[];
}

function DictionaryApp(context: AppContext): AppInstance {
  const { network, storage } = context.services;

  function DictionaryUI() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<DictEntry[] | null>(null);

    const search = useCallback(async () => {
      const w = query.trim().toLowerCase();
      if (!w) return;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const cacheKey = CACHE_PREFIX + encodeURIComponent(w).slice(0, 200);
        const cached = await storage.get<DictEntry[]>(cacheKey);
        if (cached) {
          setResult(cached);
          setLoading(false);
          return;
        }
        const data = await network.fetchJson<DictEntry[]>(API_URL(w));
        setResult(Array.isArray(data) ? data : [data]);
        await storage.set(cacheKey, Array.isArray(data) ? data : [data]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Not found');
      } finally {
        setLoading(false);
      }
    }, [query, network, storage]);

    return (
      <div class="dictionary-app">
        <p class="widget-hint">Look up a word. Results are cached for offline.</p>
        <div class="dictionary-search">
          <input
            type="text"
            class="input dictionary-input"
            placeholder="Word"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            aria-label="Word to look up"
          />
          <button type="button" class="btn" onClick={search} disabled={loading}>
            Look up
          </button>
        </div>
        {loading && <p>Loading…</p>}
        {error && <p class="browser-error">{error}</p>}
        {result && result.length > 0 && (
          <div class="dictionary-result">
            <p class="dictionary-word">{result[0].word} {result[0].phonetic && <span class="dictionary-phonetic">{result[0].phonetic}</span>}</p>
            {result[0].meanings?.slice(0, 4).map((m, i) => (
              <div key={i} class="dictionary-meaning">
                <strong>{m.partOfSpeech}</strong>
                <ul class="dictionary-defs">
                  {m.definitions?.slice(0, 3).map((d, j) => (
                    <li key={j}>
                      {d.definition}
                      {d.example && <span class="dictionary-example"> — {d.example}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return {
    render: () => <DictionaryUI />,
    getTitle: () => 'Dictionary',
  };
}

export const dictionaryApp = {
  id: 'dictionary',
  name: 'Dictionary',
  icon: '📖',
  category: 'reader' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: DictionaryApp,
};
