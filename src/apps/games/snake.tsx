import { useState, useCallback, useEffect, useRef } from 'preact/hooks';

const COLS = 15;
const ROWS = 15;
const TICK_MS = 320;

type Dir = 'up' | 'down' | 'left' | 'right';

function pos(r: number, c: number): string {
  return `${r},${c}`;
}

function randomCell(): { r: number; c: number } {
  return { r: Math.floor(Math.random() * ROWS), c: Math.floor(Math.random() * COLS) };
}

function spawnFood(snake: { r: number; c: number }[]): { r: number; c: number } {
  const set = new Set(snake.map((s) => pos(s.r, s.c)));
  let f = randomCell();
  while (set.has(pos(f.r, f.c))) f = randomCell();
  return f;
}

const INITIAL_SNAKE: { r: number; c: number }[] = [
  { r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) },
  { r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) - 1 },
  { r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) - 2 },
];

export function SnakeGame() {
  const [snake, setSnake] = useState<{ r: number; c: number }[]>(() => INITIAL_SNAKE);
  const [food, setFood] = useState<{ r: number; c: number }>(() => spawnFood(INITIAL_SNAKE));
  const [nextDir, setNextDir] = useState<Dir>('right');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    const start = INITIAL_SNAKE;
    setSnake(start);
    setFood(spawnFood(start));
    setNextDir('right');
    setGameOver(false);
    setScore(0);
    setPaused(false);
  }, []);

  const tick = useCallback(() => {
    if (gameOver || paused) return;
    const head = snake[0];
    const d = nextDir;
    const nr = head.r + (d === 'up' ? -1 : d === 'down' ? 1 : 0);
    const nc = head.c + (d === 'left' ? -1 : d === 'right' ? 1 : 0);
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
      setGameOver(true);
      return;
    }
    const bodySet = new Set(snake.map((s) => pos(s.r, s.c)));
    if (bodySet.has(pos(nr, nc))) {
      setGameOver(true);
      return;
    }
    const newHead = { r: nr, c: nc };
    const ate = nr === food.r && nc === food.c;
    if (ate) {
      const newSnake = [newHead, ...snake];
      setSnake(newSnake);
      setFood(spawnFood(newSnake));
      setScore((sc) => sc + 1);
    } else {
      setSnake([newHead, ...snake.slice(0, -1)]);
    }
  }, [gameOver, paused, nextDir, snake, food]);

  useEffect(() => {
    if (gameOver) return;
    tickRef.current = setInterval(tick, TICK_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [gameOver, tick]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (gameOver) {
        if (e.key === ' ' || e.key === 'Enter') reset();
        return;
      }
      const key = e.key;
      if (key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (key === 'ArrowUp' && nextDir !== 'down') setNextDir('up');
      else if (key === 'ArrowDown' && nextDir !== 'up') setNextDir('down');
      else if (key === 'ArrowLeft' && nextDir !== 'right') setNextDir('left');
      else if (key === 'ArrowRight' && nextDir !== 'left') setNextDir('right');
    },
    [gameOver, nextDir, reset]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const snakeSet = new Set(snake.map((s) => pos(s.r, s.c)));
  const foodKey = pos(food.r, food.c);

  const setDirSafe = useCallback(
    (d: Dir) => {
      if (gameOver) return;
      const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
      if (d !== opposite[nextDir]) setNextDir(d);
    },
    [gameOver, nextDir]
  );

  const onDirTap = (e: Event, d: Dir) => {
    if (e.type === 'touchend') (e as TouchEvent).preventDefault();
    setDirSafe(d);
  };

  return (
    <div class="snake-game">
      <div class="snake-header">
        <span class="snake-score">Score: {score}</span>
        {paused && <span class="snake-paused">Paused</span>}
        {gameOver && <span class="snake-gameover">Game over</span>}
      </div>
      <div class="snake-board">
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const key = pos(r, c);
            const isSnake = snakeSet.has(key);
            const isHead = snake.length > 0 && snake[0].r === r && snake[0].c === c;
            const isFood = key === foodKey;
            let cellClass = 'snake-cell';
            if (isHead) cellClass += ' snake-head';
            else if (isSnake) cellClass += ' snake-body';
            else if (isFood) cellClass += ' snake-food';
            return <div key={key} class={cellClass} aria-hidden="true" />;
          })
        )}
      </div>
      {gameOver ? (
        <div class="snake-actions">
          <button type="button" class="btn" onClick={reset}>
            Play again
          </button>
        </div>
      ) : (
        <>
          <div class="snake-dpad" role="group" aria-label="Direction">
            <button type="button" class="btn snake-dpad-btn" onClick={(e) => onDirTap(e, 'up')} onTouchEnd={(e) => onDirTap(e, 'up')} aria-label="Up">
              ↑
            </button>
            <div class="snake-dpad-mid">
              <button type="button" class="btn snake-dpad-btn" onClick={(e) => onDirTap(e, 'left')} onTouchEnd={(e) => onDirTap(e, 'left')} aria-label="Left">
                ←
              </button>
              <button type="button" class="btn snake-dpad-btn snake-dpad-center" onClick={() => setPaused((p) => !p)} onTouchEnd={(e) => { (e as TouchEvent).preventDefault(); setPaused((p) => !p); }} aria-label={paused ? 'Resume' : 'Pause'}>
                {paused ? '▶' : '‖'}
              </button>
              <button type="button" class="btn snake-dpad-btn" onClick={(e) => onDirTap(e, 'right')} onTouchEnd={(e) => onDirTap(e, 'right')} aria-label="Right">
                →
              </button>
            </div>
            <button type="button" class="btn snake-dpad-btn" onClick={(e) => onDirTap(e, 'down')} onTouchEnd={(e) => onDirTap(e, 'down')} aria-label="Down">
              ↓
            </button>
          </div>
          <p class="snake-hint">Arrow keys or tap buttons. Space to pause.</p>
        </>
      )}
    </div>
  );
}
