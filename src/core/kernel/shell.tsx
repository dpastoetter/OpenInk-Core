import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
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

/** Ignore click if pointer/touch moved more than this (px) — reduces accidental taps while scrolling on Kindle. */
const TAP_VS_SCROLL_THRESHOLD_PX = 24;

/** Memoized so app tree only re-renders when instance changes, not on every Shell re-render (e.g. header title/actions). */
const AppContentArea = memo(function AppContentArea({
  instance,
  setHeaderActions,
}: {
  instance: AppInstance;
  setHeaderActions: (node: VNode | null) => void;
}) {
  return (
    <AppHeaderActionsContext.Provider value={setHeaderActions}>
      {instance.render()}
    </AppHeaderActionsContext.Provider>
  );
});

export function Shell({ services }: ShellProps) {
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [instance, setInstance] = useState<AppInstance | null>(null);
  const [_appStack, setAppStack] = useState<string[]>([]);
  const [loadingAppId, setLoadingAppId] = useState<string | null>(null);
  const instanceRef = useRef<AppInstance | null>(null);
  instanceRef.current = instance;

  useEffect(() => {
    const state = { startX: 0, startY: 0, moved: false, pointerId: null as number | null, touchActive: false };
    const checkMoved = (clientX: number, clientY: number) => {
      const dx = clientX - state.startX;
      const dy = clientY - state.startY;
      if (Math.hypot(dx, dy) > TAP_VS_SCROLL_THRESHOLD_PX) state.moved = true;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.moved = false;
      state.pointerId = e.pointerId;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (state.pointerId !== null && e.pointerId === state.pointerId) checkMoved(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === state.pointerId) state.pointerId = null;
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        state.startX = e.changedTouches[0].clientX;
        state.startY = e.changedTouches[0].clientY;
        state.moved = false;
        state.touchActive = true;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (state.touchActive && e.changedTouches.length > 0)
        checkMoved(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };
    const onTouchEnd = () => {
      state.touchActive = false;
    };
    const onClick = (e: MouseEvent) => {
      if (state.moved) {
        e.preventDefault();
        e.stopPropagation();
      }
      state.moved = false;
    };
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

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
      // #region agent log
      let inst: AppInstance;
      try {
        inst = app.launch(context);
        fetch('http://127.0.0.1:7647/ingest/0cc433dc-bc56-4722-8dcd-55136a56519b', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fbf877' }, body: JSON.stringify({ sessionId: 'fbf877', location: 'shell.tsx:launchApp', message: 'launchApp ok', data: { appId: app.id, hasRender: !!(inst as AppInstance).render }, hypothesisId: 'LAUNCH', timestamp: Date.now() }) }).catch(() => {});
      } catch (e) {
        fetch('http://127.0.0.1:7647/ingest/0cc433dc-bc56-4722-8dcd-55136a56519b', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fbf877' }, body: JSON.stringify({ sessionId: 'fbf877', location: 'shell.tsx:launchApp', message: 'launchApp throw', data: { appId: app.id, error: e instanceof Error ? e.message : String(e) }, hypothesisId: 'LAUNCH', timestamp: Date.now() }) }).catch(() => {});
        throw e;
      }
      // #endregion
      setInstance(inst!);
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
      // #region agent log
      fetch('http://127.0.0.1:7647/ingest/0cc433dc-bc56-4722-8dcd-55136a56519b', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fbf877' }, body: JSON.stringify({ sessionId: 'fbf877', location: 'shell.tsx:launchAppById', message: 'launchAppById start', data: { appId }, hypothesisId: 'LOAD', timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      setLoadingAppId(appId);
      try {
        const app = await AppRegistry.loadApp(appId);
        // #region agent log
        fetch('http://127.0.0.1:7647/ingest/0cc433dc-bc56-4722-8dcd-55136a56519b', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fbf877' }, body: JSON.stringify({ sessionId: 'fbf877', location: 'shell.tsx:launchAppById', message: 'loadApp resolved', data: { appId, hasApp: !!app }, hypothesisId: 'LOAD', timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        if (app) launchApp(app);
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7647/ingest/0cc433dc-bc56-4722-8dcd-55136a56519b', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fbf877' }, body: JSON.stringify({ sessionId: 'fbf877', location: 'shell.tsx:launchAppById', message: 'launchAppById catch', data: { appId, error: e instanceof Error ? e.message : String(e) }, hypothesisId: 'LOAD', timestamp: Date.now() }) }).catch(() => {});
        // #endregion
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
  const showAppTitleRef = useRef(showAppTitle);
  showAppTitleRef.current = showAppTitle;
  const themeUnsubRef = useRef<(() => void) | undefined>(undefined);
  const appContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    appContentRef.current?.scrollTo(0, 0);
  }, [currentAppId]);
  useEffect(() => {
    const t = setTimeout(() => {
      themeUnsubRef.current = services.theme.subscribe((s) => {
        if (s.showAppTitle !== showAppTitleRef.current) {
          showAppTitleRef.current = s.showAppTitle;
          setShowAppTitle(s.showAppTitle);
        }
      });
      const sync = services.theme.getSettings();
      showAppTitleRef.current = sync.showAppTitle;
      setShowAppTitle(sync.showAppTitle);
    }, 400);
    return () => {
      clearTimeout(t);
      themeUnsubRef.current?.();
      themeUnsubRef.current = undefined;
    };
  }, [services.theme]);
  const headerTitle = showAppTitle ? (instance?.getTitle?.() ?? currentApp?.name ?? currentAppId ?? '') : '';
  const [headerActions, setHeaderActions] = useState<VNode | null>(null);
  useEffect(() => {
    setHeaderActions(null);
  }, [currentAppId]);
  const appDescriptors = useMemo(() => AppRegistry.getAllAppDescriptors(), []);
  const handleLaunch = useCallback((d: AppDescriptor) => launchAppById(d.id), [launchAppById]);

  const handleBack = useCallback(() => {
    if (instance?.canGoBack?.() && instance?.goBack) instance.goBack();
    else closeApp();
  }, [instance, closeApp]);

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
              <button type="button" class="btn btn-nav" onClick={handleBack} aria-label="Back">
                Back
              </button>
              {headerTitle && <h1 class="app-header-title">{headerTitle}</h1>}
              {headerActions != null && <div class="app-header-actions">{headerActions}</div>}
            </header>
            <div ref={appContentRef} class="app-content">
              <AppContentArea instance={instance} setHeaderActions={setHeaderActions} />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
