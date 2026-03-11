import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { WebOSApp, AppInstance, AppContext, AppDescriptor } from '../../types/plugin';
import { AppRegistry } from '../plugins/registry';
import { HomeScreen } from './HomeScreen';
import { StatusBar } from '../ui/StatusBar';
import { AppHeaderActionsContext } from './AppHeaderActionsContext';
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
  const [_appStack, setAppStack] = useState<string[]>([]);
  const [loadingAppId, setLoadingAppId] = useState<string | null>(null);
  const instanceRef = useRef<AppInstance | null>(null);
  instanceRef.current = instance;

  const closeApp = useCallback(() => {
    if (instanceRef.current?.onDestroy) instanceRef.current.onDestroy();
    setInstance(null);
    setCurrentAppId(null);
    setAppStack([]);
  }, []);

  const goToHome = useCallback(() => {
    if (instanceRef.current?.onSuspend) instanceRef.current.onSuspend();
    if (instanceRef.current?.onDestroy) instanceRef.current.onDestroy();
    setInstance(null);
    setCurrentAppId(null);
    setAppStack([]);
  }, []);

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
      if (instanceRef.current?.onDestroy) instanceRef.current.onDestroy();
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
      setLoadingAppId(null);
      if (window.history?.pushState) {
        window.history.pushState({ [HISTORY_STATE_KEY]: true, appId: app.id }, '', window.location.href);
      }
    },
    [services, navigate, closeApp]
  );

  const launchAppById = useCallback(
    async (appId: string) => {
      setLoadingAppId(appId);
      try {
        const app = await AppRegistry.loadApp(appId);
        if (app) launchApp(app);
      } catch {
        // load failed
      } finally {
        setLoadingAppId(null);
      }
    },
    [launchApp]
  );

  const goHome = useCallback(() => {
    if (currentAppId !== null && window.history?.back) {
      window.history.back();
    } else {
      goToHome();
    }
  }, [currentAppId, goToHome]);

  const showHome = currentAppId === null && !loadingAppId;
  const currentApp = currentAppId ? AppRegistry.getApp(currentAppId) : null;
  const [showAppTitle, setShowAppTitle] = useState(() => services.theme.getSettings().showAppTitle);
  useEffect(() => {
    return services.theme.subscribe((s) => setShowAppTitle(s.showAppTitle));
  }, [services.theme]);
  const headerTitle = showAppTitle ? (instance?.getTitle?.() ?? currentApp?.name ?? currentAppId ?? '') : '';
  const [headerActions, setHeaderActions] = useState<VNode | null>(null);
  useEffect(() => {
    setHeaderActions(null);
  }, [currentAppId]);
  const appDescriptors = useMemo(() => AppRegistry.getAllAppDescriptors(), []);
  const handleLaunch = useCallback((d: AppDescriptor) => launchAppById(d.id), [launchAppById]);

  return (
    <div class="shell">
      <StatusBar theme={services.theme} settings={services.settings} />
      <main class="shell-main" role="main">
        {showHome ? (
          <HomeScreen apps={appDescriptors} onLaunch={handleLaunch} theme={services.theme} />
        ) : loadingAppId ? (
          <div class="shell-loading" role="status" aria-live="polite">
            <p>Loading…</p>
          </div>
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
              {headerActions != null && <div class="app-header-actions">{headerActions}</div>}
            </header>
            <div class="app-content">
              <AppHeaderActionsContext.Provider value={setHeaderActions}>
                {instance.render()}
              </AppHeaderActionsContext.Provider>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
