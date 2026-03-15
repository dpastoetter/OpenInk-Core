import { memo } from 'preact/compat';
import { useState, useEffect, useRef } from 'preact/hooks';
import type { ThemeService } from '../services/theme';
import type { SettingsService } from '../services/settings';
import { formatTimeLegacy, formatTimeLegacy12h, formatDateDDMMYY } from '../utils/date';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

interface StatusBarProps {
  theme: ThemeService;
  settings: SettingsService;
  onOpenSettings?: () => void;
}

const isLegacy = typeof import.meta.env.LEGACY !== 'undefined' && import.meta.env.LEGACY;

function formatTime(d: Date, timeFormat: '12h' | '24h'): string {
  return timeFormat === '12h' ? formatTimeLegacy12h(d) : formatTimeLegacy(d);
}

/** Display time: device time + offset (for Kindles that show UTC or miss summer/winter time). */
function getDisplayDate(offsetHours: number): Date {
  if (offsetHours === 0) return new Date();
  return new Date(Date.now() + offsetHours * 3600000);
}

/** Clock updates every 60s to keep e-ink / low-spec refresh and CPU minimal. Returns { date: dd.mm.yy, time }. */
function useClock(timeFormat: '12h' | '24h', clockOffsetHours: number) {
  const getDisplay = () => getDisplayDate(clockOffsetHours);
  const [display, setDisplay] = useState(() => {
    const d = getDisplay();
    return { date: formatDateDDMMYY(d), time: formatTime(d, timeFormat) };
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = getDisplay();
      setDisplay({ date: formatDateDDMMYY(d), time: formatTime(d, timeFormat) });
    }, 60_000);
    return () => clearInterval(id);
  }, [timeFormat, clockOffsetHours]);
  return display;
}

const statusBarIconProps = { width: 20, height: 20, 'aria-hidden': true as const, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function StatusBarZoomOut() {
  return (
    <svg class="status-bar-icon" viewBox="0 0 24 24" {...statusBarIconProps}>
      <path d="M5 12h14" />
    </svg>
  );
}
function StatusBarZoomIn() {
  return (
    <svg class="status-bar-icon" viewBox="0 0 24 24" {...statusBarIconProps}>
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}
function StatusBarSun() {
  return (
    <svg class="status-bar-icon" viewBox="0 0 24 24" {...statusBarIconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}
function StatusBarMoon() {
  return (
    <svg class="status-bar-icon" viewBox="0 0 24 24" {...statusBarIconProps}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function StatusBarSettings() {
  return (
    <svg class="status-bar-icon" viewBox="0 0 24 24" {...statusBarIconProps}>
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StatusBarInner({ theme, settings, onOpenSettings }: StatusBarProps) {
  const s = theme.getSettings();
  const [themeState, setThemeState] = useState({
    showClock: s.showClock,
    timeFormat: s.timeFormat,
    clockOffsetHours: s.clockOffsetHours ?? 0,
    appearance: s.appearance as 'light' | 'dark',
    zoom: s.zoom,
  });
  const { showClock, clockOffsetHours, appearance, zoom } = themeState;
  const clock = useClock('24h', clockOffsetHours);
  const ref = useRef(themeState);
  ref.current = themeState;

  const unsubRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    unsubRef.current = theme.subscribe((next) => {
      const nextState = {
        appearance: next.appearance as 'light' | 'dark',
        zoom: next.zoom,
        showClock: next.showClock,
        timeFormat: next.timeFormat,
        clockOffsetHours: next.clockOffsetHours ?? 0,
      };
      if (
        nextState.appearance !== ref.current.appearance ||
        nextState.zoom !== ref.current.zoom ||
        nextState.showClock !== ref.current.showClock ||
        nextState.timeFormat !== ref.current.timeFormat ||
        nextState.clockOffsetHours !== ref.current.clockOffsetHours
      ) {
        ref.current = nextState;
        setThemeState(nextState);
      }
    });
    const sync = theme.getSettings();
    setThemeState({
      appearance: sync.appearance as 'light' | 'dark',
      zoom: sync.zoom,
      showClock: sync.showClock,
      timeFormat: sync.timeFormat,
      clockOffsetHours: sync.clockOffsetHours ?? 0,
    });
    return () => {
      unsubRef.current?.();
      unsubRef.current = undefined;
    };
  }, [theme]);

  const toggleAppearance = () => {
    const next = appearance === 'light' ? 'dark' : 'light';
    settings.set({ appearance: next });
  };

  const zoomOut = () => {
    const next = Math.max(ZOOM_MIN, Math.round((zoom - ZOOM_STEP) * 10) / 10);
    settings.set({ zoom: next });
  };
  const zoomIn = () => {
    const next = Math.min(ZOOM_MAX, Math.round((zoom + ZOOM_STEP) * 10) / 10);
    settings.set({ zoom: next });
  };

  return (
    <header class="status-bar" role="banner">
      {showClock ? (
        <span class="status-bar-left status-bar-clock" aria-label="Current date">
          {clock.date}
        </span>
      ) : (
        <span class="status-bar-left" aria-hidden="true" />
      )}
      {showClock ? (
        <span class="status-bar-center status-bar-clock" aria-label="Current time">
          {clock.time}
        </span>
      ) : (
        <span class="status-bar-center" aria-hidden="true" />
      )}
      <span class="status-bar-right">
        <button
          type="button"
          class="btn btn-status btn-status-zoom"
          onClick={zoomOut}
          onTouchEnd={(e) => { if (zoom > ZOOM_MIN) { e.preventDefault(); zoomOut(); } }}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Zoom out"
        >
          <StatusBarZoomOut />
        </button>
        <button
          type="button"
          class="btn btn-status btn-status-zoom"
          onClick={zoomIn}
          onTouchEnd={(e) => { if (zoom < ZOOM_MAX) { e.preventDefault(); zoomIn(); } }}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Zoom in"
        >
          <StatusBarZoomIn />
        </button>
        <button
          type="button"
          class="btn btn-status btn-status-theme"
          onClick={toggleAppearance}
          onTouchEnd={(e) => { e.preventDefault(); toggleAppearance(); }}
          aria-label={`Switch to ${appearance === 'light' ? 'dark' : 'light'} mode`}
        >
          {isLegacy ? (appearance === 'light' ? 'D' : 'L') : (appearance === 'light' ? <StatusBarSun /> : <StatusBarMoon />)}
        </button>
        {onOpenSettings && (
          <button
            type="button"
            class="btn btn-status btn-status-settings"
            onClick={onOpenSettings}
            onTouchEnd={(e) => { e.preventDefault(); onOpenSettings(); }}
            aria-label="Settings"
          >
            <StatusBarSettings />
          </button>
        )}
      </span>
    </header>
  );
}

export const StatusBar = memo(StatusBarInner);
