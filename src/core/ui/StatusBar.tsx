import { memo } from 'preact/compat';
import { useState, useEffect, useRef } from 'preact/hooks';
import type { ThemeService } from '../services/theme';
import type { SettingsService } from '../services/settings';
import { formatTimeLegacy, formatTimeLegacy12h } from '../utils/date';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

interface StatusBarProps {
  theme: ThemeService;
  settings: SettingsService;
}

const isLegacy = typeof import.meta.env.LEGACY !== 'undefined' && import.meta.env.LEGACY;

function formatTime(d: Date, timeFormat: '12h' | '24h'): string {
  return timeFormat === '12h' ? formatTimeLegacy12h(d) : formatTimeLegacy(d);
}

/** Clock updates every 60s to keep e-ink / low-spec refresh and CPU minimal. */
function useClock(timeFormat: '12h' | '24h') {
  const [time, setTime] = useState(() => formatTime(new Date(), timeFormat));
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date(), timeFormat)), 60_000);
    return () => clearInterval(id);
  }, [timeFormat]);
  return time;
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

function StatusBarInner({ theme, settings }: StatusBarProps) {
  const s = theme.getSettings();
  const [showClock, setShowClock] = useState(s.showClock);
  const [timeFormat, setTimeFormat] = useState(s.timeFormat);
  const time = useClock(timeFormat);
  const [appearance, setAppearance] = useState<'light' | 'dark'>(s.appearance);
  const [zoom, setZoom] = useState(s.zoom);
  const ref = useRef({ appearance: s.appearance, zoom: s.zoom, showClock: s.showClock, timeFormat: s.timeFormat });

  useEffect(() => {
    return theme.subscribe((next) => {
      if (next.appearance !== ref.current.appearance) {
        ref.current.appearance = next.appearance;
        setAppearance(next.appearance);
      }
      if (next.zoom !== ref.current.zoom) {
        ref.current.zoom = next.zoom;
        setZoom(next.zoom);
      }
      if (next.showClock !== ref.current.showClock) {
        ref.current.showClock = next.showClock;
        setShowClock(next.showClock);
      }
      if (next.timeFormat !== ref.current.timeFormat) {
        ref.current.timeFormat = next.timeFormat;
        setTimeFormat(next.timeFormat);
      }
    });
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
      <span class="status-bar-left">OpenInk</span>
      {showClock ? (
        <span class="status-bar-center" aria-label="Current time">
          {time}
        </span>
      ) : (
        <span class="status-bar-center" aria-hidden="true" />
      )}
      <span class="status-bar-right">
        <button
          type="button"
          class="btn btn-status btn-status-zoom"
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Zoom out"
        >
          <StatusBarZoomOut />
        </button>
        <button
          type="button"
          class="btn btn-status btn-status-zoom"
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Zoom in"
        >
          <StatusBarZoomIn />
        </button>
        <button
          type="button"
          class="btn btn-status btn-status-theme"
          onClick={toggleAppearance}
          aria-label={`Switch to ${appearance === 'light' ? 'dark' : 'light'} mode`}
        >
          {isLegacy ? (appearance === 'light' ? 'D' : 'L') : (appearance === 'light' ? <StatusBarSun /> : <StatusBarMoon />)}
        </button>
      </span>
    </header>
  );
}

export const StatusBar = memo(StatusBarInner);
