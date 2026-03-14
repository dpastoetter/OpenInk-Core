import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { formatTimeWithSecondsLegacy } from '@core/utils/date';

const TIMER_PRESETS = [5, 10, 15, 25, 30, 45, 60];

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimerCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* World clock (embedded) */
interface WorldClockZone {
  id: string;
  label: string;
  offsetMinutes: number;
}

const DEFAULT_ZONES: WorldClockZone[] = [
  { id: 'utc', label: 'UTC', offsetMinutes: 0 },
  { id: 'new-york', label: 'New York', offsetMinutes: -300 },
  { id: 'london', label: 'London', offsetMinutes: 0 },
  { id: 'berlin', label: 'Berlin', offsetMinutes: 60 },
  { id: 'tokyo', label: 'Tokyo', offsetMinutes: 540 },
];

function parseWorldClockZones(json: string | undefined): WorldClockZone[] {
  if (!json || !json.trim()) return [...DEFAULT_ZONES];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [...DEFAULT_ZONES];
    const out: WorldClockZone[] = [];
    for (const x of arr) {
      if (x && typeof x === 'object' && typeof (x as WorldClockZone).id === 'string' && typeof (x as WorldClockZone).label === 'string' && typeof (x as WorldClockZone).offsetMinutes === 'number') {
        out.push({ id: (x as WorldClockZone).id, label: (x as WorldClockZone).label, offsetMinutes: (x as WorldClockZone).offsetMinutes });
      }
    }
    return out.length ? out : [...DEFAULT_ZONES];
  } catch {
    return [...DEFAULT_ZONES];
  }
}

function worldClockZonesToJson(zones: WorldClockZone[]): string {
  return JSON.stringify(zones);
}

function formatTimeForZone(offsetMinutes: number): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const local = new Date(utc + offsetMinutes * 60000);
  if (typeof import.meta.env.LEGACY !== 'undefined' && import.meta.env.LEGACY) return formatTimeWithSecondsLegacy(local);
  return local.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function slug(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 32) || 'zone';
}

function TimerStopwatchApp(context: AppContext): AppInstance {
  type Mode = 'stopwatch' | 'timer' | 'worldclock';
  const { settings } = context.services;

  function CombinedUI() {
    const [mode, setMode] = useState<Mode>('stopwatch');

    return (
      <div class="timer-stopwatch-app">
        <div class="timer-stopwatch-tabs">
          <button
            type="button"
            class={`btn ${mode === 'stopwatch' ? 'btn-active' : ''}`}
            onClick={() => setMode('stopwatch')}
          >
            Stopwatch
          </button>
          <button
            type="button"
            class={`btn ${mode === 'timer' ? 'btn-active' : ''}`}
            onClick={() => setMode('timer')}
          >
            Timer
          </button>
          <button
            type="button"
            class={`btn ${mode === 'worldclock' ? 'btn-active' : ''}`}
            onClick={() => setMode('worldclock')}
          >
            World clock
          </button>
        </div>
        {mode === 'stopwatch' && <StopwatchPanel />}
        {mode === 'timer' && <TimerPanel />}
        {mode === 'worldclock' && <WorldClockPanel settings={settings} />}
      </div>
    );
  }

  function StopwatchPanel() {
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      if (!running) return;
      intervalRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [running]);

    const reset = useCallback(() => {
      setRunning(false);
      setElapsed(0);
    }, []);

    return (
      <>
        <p class="widget-hint">Elapsed time. 1s updates for e-ink.</p>
        <p class="timer-display" aria-live="polite">
          {formatElapsed(elapsed)}
        </p>
        <div class="timer-actions">
          <button type="button" class="btn" onClick={() => setRunning((r) => !r)}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button type="button" class="btn" onClick={reset}>
            Reset
          </button>
        </div>
      </>
    );
  }

  function TimerPanel() {
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [remaining, setRemaining] = useState(0);
    const [running, setRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      if (!running) return;
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [running]);

    const start = useCallback((minutes: number) => {
      const sec = Math.max(0, Math.min(99 * 60 + 59, minutes * 60));
      setTotalSeconds(sec);
      setRemaining(sec);
      setRunning(sec > 0);
    }, []);

    const toggle = useCallback(() => {
      if (remaining === 0) return;
      setRunning((r) => !r);
    }, [remaining]);

    const reset = useCallback(() => {
      setRunning(false);
      setRemaining(totalSeconds);
    }, [totalSeconds]);

    const done = remaining === 0 && totalSeconds > 0;

    return (
      <>
        <p class="timer-hint">Countdown timer. No sound — good for reading sessions.</p>
        {totalSeconds === 0 ? (
          <>
            <p class="timer-label">Choose minutes</p>
            <div class="timer-presets">
              {TIMER_PRESETS.map((m) => (
                <button key={m} type="button" class="btn" onClick={() => start(m)}>
                  {m} min
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p class="timer-display" aria-live="polite">
              {done ? 'Done' : formatTimerCountdown(remaining)}
            </p>
            {!done && (
              <div class="timer-actions">
                <button type="button" class="btn" onClick={toggle}>
                  {running ? 'Pause' : 'Resume'}
                </button>
                <button type="button" class="btn" onClick={reset}>
                  Reset
                </button>
              </div>
            )}
            {done && (
              <button type="button" class="btn" onClick={() => start(Math.floor(totalSeconds / 60))}>
                Start again
              </button>
            )}
          </>
        )}
      </>
    );
  }

  return {
    render: () => <CombinedUI />,
    getTitle: () => 'Timer & Stopwatch',
  };
}

interface WorldClockPanelProps {
  settings: { get: () => { worldClockZones: string }; set: (v: { worldClockZones: string }) => void };
}

function WorldClockPanel({ settings }: WorldClockPanelProps) {
  const [zones, setZones] = useState<WorldClockZone[]>(() => parseWorldClockZones(settings.get().worldClockZones));
  const [editMode, setEditMode] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addOffsetHours, setAddOffsetHours] = useState('');
  const [, setTick] = useState(0);

  const persistZones = useCallback(
    (next: WorldClockZone[]) => {
      setZones(next);
      settings.set({ worldClockZones: worldClockZonesToJson(next) });
    },
    [settings]
  );

  const removeZone = (zone: WorldClockZone) => {
    persistZones(zones.filter((z) => z.id !== zone.id));
  };

  const addZone = () => {
    const label = addLabel.trim();
    if (!label) return;
    const hours = Number(addOffsetHours.trim());
    if (!Number.isFinite(hours) || hours < -14 || hours > 14) return;
    const offsetMinutes = Math.round(hours * 60);
    const id = slug(label) || 'zone-' + Date.now().toString(36);
    if (zones.some((z) => z.id === id)) return;
    persistZones([...zones, { id, label, offsetMinutes }]);
    setAddLabel('');
    setAddOffsetHours('');
  };

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const localOffset = -new Date().getTimezoneOffset();
  const displayZones = [{ id: '_local', label: 'Local', offsetMinutes: localOffset }, ...zones];

  return (
    <div class="worldclock-app">
      <p class="widget-hint">Clocks update every second. No network.</p>
      <div class="timer-stopwatch-tabs" style="margin-bottom: 0.5rem;">
        <button
          type="button"
          class="btn"
          onClick={() => setEditMode((e) => !e)}
          aria-label={editMode ? 'Done editing' : 'Edit zones'}
          title={editMode ? 'Done' : 'Edit'}
        >
          {editMode ? 'Done' : 'Edit zones'}
        </button>
      </div>
      {editMode && (
        <div class="worldclock-add">
          <input
            type="text"
            class="input worldclock-add-label"
            placeholder="Label (e.g. Tokyo)"
            value={addLabel}
            onInput={(e) => setAddLabel((e.target as HTMLInputElement).value)}
          />
          <input
            type="text"
            class="input worldclock-add-offset"
            placeholder="UTC offset (hours, e.g. 9 or -5)"
            value={addOffsetHours}
            onInput={(e) => setAddOffsetHours((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && addZone()}
          />
          <button type="button" class="btn" onClick={addZone}>
            Add
          </button>
        </div>
      )}
      <ul class="worldclock-list" aria-live="polite">
        {displayZones.map((z) => (
          <li key={z.id} class="worldclock-row">
            <span class="worldclock-label">{z.label}</span>
            <span class="worldclock-time">{formatTimeForZone(z.offsetMinutes)}</span>
            {editMode && z.id !== '_local' && (
              <button
                type="button"
                class="btn btn-small worldclock-delete"
                onClick={() => removeZone(z)}
                aria-label={`Remove ${z.label}`}
                title="Remove"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const timerApp = {
  id: 'timer',
  name: 'Timer & Stopwatch',
  icon: '⏱️',
  category: 'system' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: TimerStopwatchApp,
};
