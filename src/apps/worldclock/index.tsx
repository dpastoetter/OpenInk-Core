import { useState, useEffect, useRef } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';

/** Offset in minutes from UTC. e.g. -300 = EST (UTC-5). Local is computed at render. */
const FIXED_ZONES: { label: string; offsetMinutes: number }[] = [
  { label: 'UTC', offsetMinutes: 0 },
  { label: 'New York', offsetMinutes: -300 },
  { label: 'London', offsetMinutes: 0 },
  { label: 'Berlin', offsetMinutes: 60 },
  { label: 'Tokyo', offsetMinutes: 540 },
];

function formatTime(offsetMinutes: number): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const local = new Date(utc + offsetMinutes * 60000);
  return local.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function WorldClockApp(_context: AppContext): AppInstance {
  function WorldClockUI() {
    const [, setTick] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      /* 1s tick so seconds stay in sync; could use 60s for even lower CPU. */
      intervalRef.current = setInterval(() => setTick((n) => n + 1), 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, []);

    const localOffset = -new Date().getTimezoneOffset();
    const zones = [{ label: 'Local', offsetMinutes: localOffset }, ...FIXED_ZONES];

    return (
      <div class="worldclock-app">
        <p class="widget-hint">Clocks update every second. No network.</p>
        <ul class="worldclock-list" aria-live="polite">
          {zones.map((z) => (
            <li key={z.label} class="worldclock-row">
              <span class="worldclock-label">{z.label}</span>
              <span class="worldclock-time">{formatTime(z.offsetMinutes)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return {
    render: () => <WorldClockUI />,
    getTitle: () => 'World clock',
  };
}

export const worldclockApp = {
  id: 'worldclock',
  name: 'World clock',
  icon: '🌐',
  category: 'system' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: WorldClockApp,
};
