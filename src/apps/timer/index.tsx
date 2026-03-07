import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const PRESETS = [5, 10, 15, 25, 30, 45, 60];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TimerApp(context: AppContext): AppInstance {
  function TimerUI() {
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [remaining, setRemaining] = useState(0);
    const [running, setRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      if (!running) return;
      /* 1s tick: low frequency for e-ink / low-spec. */
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
      <div class="timer-app">
        <p class="timer-hint">Countdown timer. No sound — good for reading sessions.</p>
        {totalSeconds === 0 ? (
          <>
            <p class="timer-label">Choose minutes</p>
            <div class="timer-presets">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  class="btn"
                  onClick={() => start(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p class="timer-display" aria-live="polite">
              {done ? 'Done' : formatTime(remaining)}
            </p>
            {!done && (
              <div class="timer-actions">
                <button type="button" class="btn" onClick={toggle}>
                  {running ? 'Pause' : 'Resume'}
                </button>
                <button type="button" class="btn" onClick={reset}>Reset</button>
              </div>
            )}
            {done && (
              <button type="button" class="btn" onClick={() => start(Math.floor(totalSeconds / 60))}>
                Start again
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return {
    render: () => <TimerUI />,
    getTitle: () => 'Timer',
  };
}

export const timerApp = {
  id: 'timer',
  name: 'Timer',
  icon: '⏱️',
  category: 'system' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: TimerApp,
};
