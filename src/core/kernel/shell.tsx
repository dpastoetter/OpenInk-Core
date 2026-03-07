import { h } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import type { WebOSApp, AppInstance, AppContext } from '../../types/plugin';
import { AppRegistry } from '../plugins/registry';
import { HomeScreen } from './HomeScreen';
import { StatusBar } from '../ui/StatusBar';
import type { StorageService } from '../services/storage';
import type { NetworkService } from '../services/network';
import type { ThemeService } from '../services/theme';
import type { SettingsService } from '../services/settings';

export interface ShellServices {
  storage: StorageService;
  network: NetworkService;
  theme: ThemeService;
  settings: SettingsService;
}

interface ShellProps {
  services: ShellServices;
}

const HISTORY_STATE_KEY = 'openInk';

export function Shell({ services }: ShellProps) {
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [instance, setInstance] = useState<AppInstance | null>(null);
  const [appStack, setAppStack] = useState<string[]>([]);

  const closeApp = useCallback(() => {
    if (instance?.onDestroy) instance.onDestroy();
    setInstance(null);
    setCurrentAppId(null);
    setAppStack([]);
  }, [instance]);

  const goToHome = useCallback(() => {
    if (instance?.onSuspend) instance.onSuspend();
    if (instance?.onDestroy) instance.onDestroy();
    setInstance(null);
    setCurrentAppId(null);
    setAppStack([]);
  }, [instance]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history) return;
    if (window.history.state?.[HISTORY_STATE_KEY] === undefined) {
      window.history.replaceState({ [HISTORY_STATE_KEY]: true, appId: null }, '', window.location.href);
    }
    const onPopState = () => {
      goToHome();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [goToHome]);

  const navigate = useCallback((path: string) => {
    if (path.startsWith('/')) path = path.slice(1);
    const [appId] = path.split('/');
    const app = AppRegistry.getApp(appId);
    if (app) {
      setCurrentAppId(appId);
      setAppStack((prev) => (prev[prev.length - 1] === appId ? prev : [...prev, appId]));
    }
  }, []);

  const launchApp = useCallback(
    (app: WebOSApp) => {
      if (instance?.onDestroy) instance.onDestroy();
      const context: AppContext = {
        navigate,
        closeApp,
        services: {
          storage: services.storage,
          network: services.network,
          theme: services.theme,
          settings: services.settings,
        },
      };
      const inst = app.launch(context);
      setInstance(inst);
      setCurrentAppId(app.id);
      setAppStack([app.id]);
      if (window.history?.pushState) {
        window.history.pushState({ [HISTORY_STATE_KEY]: true, appId: app.id }, '', window.location.href);
      }
    },
    [services, navigate, closeApp, instance]
  );

  const goHome = useCallback(() => {
    if (currentAppId !== null && window.history?.back) {
      window.history.back();
    } else {
      goToHome();
    }
  }, [currentAppId, goToHome]);

  const showHome = currentAppId === null;
  const currentApp = currentAppId ? AppRegistry.getApp(currentAppId) : null;
  const headerTitle = instance?.getTitle?.() ?? currentApp?.name ?? currentAppId ?? '';
  const apps = useMemo(() => AppRegistry.getAllApps(), []);

  return (
    <div class="shell">
      <StatusBar theme={services.theme} settings={services.settings} />
      <main class="shell-main" role="main">
        {showHome ? (
          <HomeScreen apps={apps} onLaunch={launchApp} />
        ) : instance ? (
          <div class="app-container">
            <header class="app-header">
              <button type="button" class="btn btn-nav" onClick={goHome} aria-label="Home">
                Home
              </button>
              <button
                type="button"
                class="btn btn-nav"
                onClick={() => (instance?.canGoBack?.() && instance?.goBack ? instance.goBack() : closeApp())}
                aria-label="Back"
              >
                Back
              </button>
              {headerTitle && <h1 class="app-header-title">{headerTitle}</h1>}
            </header>
            <div class="app-content">{instance.render()}</div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
