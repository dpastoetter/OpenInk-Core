import { memo } from 'preact/compat';
import { useMemo, useCallback } from 'preact/hooks';
import type { AppDescriptor } from '../../types/plugin';

interface HomeScreenProps {
  apps: AppDescriptor[];
  onLaunch: (app: AppDescriptor) => void;
}

function sortByName(apps: AppDescriptor[]): AppDescriptor[] {
  return [...apps].sort((a, b) => a.name.localeCompare(b.name));
}

/** Apps list: alphabetical but Settings always last. */
function sortAppsWithSettingsLast(apps: AppDescriptor[]): AppDescriptor[] {
  const sorted = sortByName(apps);
  const settings = sorted.filter((a) => a.id === 'settings');
  const rest = sorted.filter((a) => a.id !== 'settings');
  return [...rest, ...settings];
}

const AppTile = memo(function AppTile({ app }: { app: AppDescriptor }) {
  return (
    <li>
      <button
        type="button"
        class="app-tile"
        data-app-id={app.id}
        aria-label={`Open ${app.name}`}
      >
        <span class="app-tile-icon" aria-hidden="true">{app.icon ?? '◻'}</span>
        <span class="app-tile-name">{app.name}</span>
      </button>
    </li>
  );
});

export function HomeScreen({ apps, onLaunch }: HomeScreenProps) {
  const games = useMemo(
    () => sortByName(apps.filter((a) => a.category === 'game')),
    [apps]
  );
  const appsOnly = useMemo(
    () => sortAppsWithSettingsLast(apps.filter((a) => a.category !== 'game')),
    [apps]
  );

  const appById = useMemo(() => {
    const m = new Map<string, AppDescriptor>();
    apps.forEach((a) => m.set(a.id, a));
    return m;
  }, [apps]);

  const handleGridClick = useCallback(
    (e: Event) => {
      const el = (e.target as HTMLElement).closest?.('[data-app-id]');
      const id = el?.getAttribute?.('data-app-id');
      if (id) {
        const app = appById.get(id);
        if (app) onLaunch(app);
      }
    },
    [appById, onLaunch]
  );

  return (
    <div class="home-screen">
      <section class="home-category">
        <h2 class="home-category-title">Apps</h2>
        <ul class="app-grid" role="list" onClick={handleGridClick}>
          {appsOnly.map((app) => (
            <AppTile key={app.id} app={app} />
          ))}
        </ul>
      </section>
      <section class="home-category">
        <h2 class="home-category-title">Games</h2>
        <ul class="app-grid" role="list" onClick={handleGridClick}>
          {games.map((app) => (
            <AppTile key={app.id} app={app} />
          ))}
        </ul>
      </section>
    </div>
  );
}
