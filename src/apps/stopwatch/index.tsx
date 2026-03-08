import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function StopwatchApp(_context: AppContext): AppInstance {
  function StopwatchUI() {
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      if (!running) return;
      /* 1s tick: low frequency for e-ink / Kindle. */
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
      <div class="stopwatch-app">
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
      </div>
    );
  }

  return {
    render: () => <StopwatchUI />,
    getTitle: () => 'Stopwatch',
  };
}

export const stopwatchApp = {
  id: 'stopwatch',
  name: 'Stopwatch',
  icon: '⏲️',
  category: 'system' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: StopwatchApp,
};
