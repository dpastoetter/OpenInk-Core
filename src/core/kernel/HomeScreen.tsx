import { memo } from 'preact/compat';
import { useMemo, useCallback, useState, useEffect, useRef } from 'preact/hooks';
import type { AppDescriptor } from '../../types/plugin';
import { getAppIcon } from '@core/icons/app-icons';
import { isSafeLegacySvg } from '../utils/safe-svg';
import type { ThemeService } from '../services/theme';

interface HomeScreenProps {
  apps: AppDescriptor[];
  onLaunch: (app: AppDescriptor) => void;
  theme: ThemeService;
}

function sortByName(apps: AppDescriptor[], order: 'a-z' | 'z-a'): AppDescriptor[] {
  const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name));
  return order === 'z-a' ? sorted.reverse() : sorted;
}

/** Apps list: alphabetical (or Z–A) but Settings always last. */
function sortAppsWithSettingsLast(apps: AppDescriptor[], order: 'a-z' | 'z-a'): AppDescriptor[] {
  const sorted = sortByName(apps, order);
  const settings = sorted.filter((a) => a.id === 'settings');
  const rest = sorted.filter((a) => a.id !== 'settings');
  return [...rest, ...settings];
}

const AppTile = memo(function AppTile({
  app,
  onLaunch,
}: {
  app: AppDescriptor;
  onLaunch: (app: AppDescriptor) => void;
}) {
  const IconComponent = getAppIcon(app.id);
  const handleActivate = useCallback(
    (e: Event) => {
      if (e.type === 'touchend') (e as TouchEvent).preventDefault();
      onLaunch(app);
    },
    [app, onLaunch]
  );
  return (
    <li>
      <button
        type="button"
        class="app-tile"
        data-app-id={app.id}
        aria-label={`Open ${app.name}`}
        onClick={handleActivate}
        onTouchEnd={handleActivate}
      >
        <span class="app-tile-icon" aria-hidden="true">
          {IconComponent
            ? <IconComponent className="app-tile-icon-svg" aria-hidden={true} />
            : isSafeLegacySvg(app.iconLegacySvg)
              ? <span class="app-tile-icon-svg" dangerouslySetInnerHTML={{ __html: app.iconLegacySvg! }} />
              : (app.iconFallback ?? app.icon ?? '◻')}
        </span>
        <span class="app-tile-name">{app.name}</span>
      </button>
    </li>
  );
});

const HomeScreenInner = function HomeScreen({ apps, onLaunch, theme }: HomeScreenProps) {
  const s = theme.getSettings();
  const [showGamesSection, setShowGamesSection] = useState(s.showGamesSection);
  const [sortOrder, setSortOrder] = useState(s.sortOrder);
  const ref = useRef({ showGamesSection: s.showGamesSection, sortOrder: s.sortOrder });
  useEffect(() => {
    return theme.subscribe((next) => {
      if (next.showGamesSection !== ref.current.showGamesSection) {
        ref.current.showGamesSection = next.showGamesSection;
        setShowGamesSection(next.showGamesSection);
      }
      if (next.sortOrder !== ref.current.sortOrder) {
        ref.current.sortOrder = next.sortOrder;
        setSortOrder(next.sortOrder);
      }
    });
  }, [theme]);

  const games = useMemo(
    () => sortByName(apps.filter((a) => a.category === 'game'), sortOrder),
    [apps, sortOrder]
  );
  const appsOnly = useMemo(
    () => sortAppsWithSettingsLast(apps.filter((a) => a.category !== 'game'), sortOrder),
    [apps, sortOrder]
  );

  return (
    <div class="home-screen">
      <section class="home-category">
        <h2 class="home-category-title">Apps</h2>
        <ul class="app-grid">
          {appsOnly.map((app) => (
            <AppTile key={app.id} app={app} onLaunch={onLaunch} />
          ))}
        </ul>
      </section>
      {showGamesSection && (
        <section class="home-category">
          <h2 class="home-category-title">Games</h2>
          <ul class="app-grid">
            {games.map((app) => (
              <AppTile key={app.id} app={app} onLaunch={onLaunch} />
            ))}
          </ul>
        </section>
      )}
      <footer class="home-footer" aria-label="Product name">OpenInk - Designed for E-Ink Devices</footer>
    </div>
  );
};

export const HomeScreen = memo(HomeScreenInner);
