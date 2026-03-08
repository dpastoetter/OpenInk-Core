import { useState, useEffect } from 'preact/hooks';
import type { ThemeService } from '../services/theme';
import type { SettingsService } from '../services/settings';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

interface StatusBarProps {
  theme: ThemeService;
  settings: SettingsService;
}

/** Clock updates every 60s to keep e-ink / low-spec refresh and CPU minimal. */
function useClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function StatusBar({ theme, settings }: StatusBarProps) {
  const time = useClock();
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() => theme.getSettings().appearance);
  const [zoom, setZoom] = useState(() => theme.getSettings().zoom);

  useEffect(() => {
    return theme.subscribe((s) => {
      setAppearance(s.appearance);
      setZoom(s.zoom);
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

  const bulbOff = (
    <svg class="status-bar-bulb status-bar-bulb-off" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M9 21h6M12 3a6 6 0 0 1 4.5 9.75A4 4 0 0 0 15 18H9a4 4 0 0 0-.5-5.25A6 6 0 0 1 12 3z" />
    </svg>
  );
  const bulbOn = (
    <svg class="status-bar-bulb status-bar-bulb-on" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 18h6M9 21h6M12 3a6 6 0 0 1 4.5 9.75A4 4 0 0 0 15 18H9a4 4 0 0 0-.5-5.25A6 6 0 0 1 12 3z" />
    </svg>
  );

  return (
    <header class="status-bar" role="banner">
      <span class="status-bar-left">OpenInk</span>
      <span class="status-bar-center" aria-label="Current time">
        {time}
      </span>
      <span class="status-bar-right">
        <button
          type="button"
          class="btn btn-status btn-status-zoom"
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          class="btn btn-status btn-status-zoom"
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          class="btn btn-status btn-status-theme"
          onClick={toggleAppearance}
          aria-label={`Switch to ${appearance === 'light' ? 'dark' : 'light'} mode`}
        >
          {appearance === 'light' ? bulbOff : bulbOn}
        </button>
      </span>
    </header>
  );
}
