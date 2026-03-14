import { useState, useCallback, useEffect, useRef, useContext, useMemo } from 'preact/hooks';
import { AppHeaderActionsContext } from '@core/kernel/AppHeaderActionsContext';
import { GameBoardResize } from './GameBoardResize';

const COLS = 15;
const ROWS = 15;
const TICK_MS = 320;

const SNAKE_BOARD_MIN = 200;
const SNAKE_BOARD_MAX = 420;
const SNAKE_BOARD_STEP = 40;
const SNAKE_BOARD_DEFAULT = 300;

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
  const [boardSizePx, setBoardSizePx] = useState(SNAKE_BOARD_DEFAULT);
  const tickCallbackRef = useRef<() => void>(() => {});
  const setHeaderActions = useContext(AppHeaderActionsContext);

  useEffect(() => {
    if (!setHeaderActions) return;
    setHeaderActions(
      <GameBoardResize
        min={SNAKE_BOARD_MIN}
        max={SNAKE_BOARD_MAX}
        step={SNAKE_BOARD_STEP}
        valuePx={boardSizePx}
        onDecrease={() => setBoardSizePx((s) => Math.max(SNAKE_BOARD_MIN, s - SNAKE_BOARD_STEP))}
        onIncrease={() => setBoardSizePx((s) => Math.min(SNAKE_BOARD_MAX, s + SNAKE_BOARD_STEP))}
      />
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, boardSizePx]);

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
    tickCallbackRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (gameOver) return;
    const id = setInterval(() => tickCallbackRef.current(), TICK_MS);
    return () => clearInterval(id);
  }, [gameOver]);

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

  const snakeSet = useMemo(() => new Set(snake.map((s) => pos(s.r, s.c))), [snake]);
  const foodKey = pos(food.r, food.c);
  const boardStyle = useMemo(
    () => ({ width: boardSizePx + 'px', height: boardSizePx + 'px', maxHeight: boardSizePx + 'px' }),
    [boardSizePx]
  );

  const setDirSafe = useCallback(
    (d: Dir) => {
      if (gameOver) return;
      const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
      if (d !== opposite[nextDir]) setNextDir(d);
    },
    [gameOver, nextDir]
  );

  const onDirTap = (e: Event, d: Dir) => {
    if (e.type === 'touchstart') (e as TouchEvent).preventDefault();
    setDirSafe(d);
  };

  return (
    <div class="snake-game">
      <div class="snake-header">
        <span class="snake-score">Score: {score}</span>
        {paused && <span class="snake-paused">Paused</span>}
        {gameOver && <span class="snake-gameover">Game over</span>}
      </div>
      <div class="snake-main">
        <div class="snake-board" style={boardStyle}>
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
        {!gameOver && (
          <div class="snake-dpad" role="group" aria-label="Direction">
            <button type="button" class="btn snake-dpad-btn" onClick={(e) => onDirTap(e, 'up')} onTouchStart={(e) => onDirTap(e, 'up')} aria-label="Up">↑</button>
            <div class="snake-dpad-mid">
              <button type="button" class="btn snake-dpad-btn" onClick={(e) => onDirTap(e, 'left')} onTouchStart={(e) => onDirTap(e, 'left')} aria-label="Left">←</button>
              <button type="button" class="btn snake-dpad-btn snake-dpad-center" onClick={() => setPaused((p) => !p)} onTouchStart={(e) => { (e as TouchEvent).preventDefault(); setPaused((p) => !p); }} aria-label={paused ? 'Resume' : 'Pause'}>{paused ? '▶' : '‖'}</button>
              <button type="button" class="btn snake-dpad-btn" onClick={(e) => onDirTap(e, 'right')} onTouchStart={(e) => onDirTap(e, 'right')} aria-label="Right">→</button>
            </div>
            <button type="button" class="btn snake-dpad-btn" onClick={(e) => onDirTap(e, 'down')} onTouchStart={(e) => onDirTap(e, 'down')} aria-label="Down">↓</button>
          </div>
        )}
      </div>
      {gameOver ? (
        <div class="snake-actions">
          <button type="button" class="btn snake-play-again" onClick={reset} aria-label="Play again" title="Play again">
            ↻
          </button>
        </div>
      ) : (
        <p class="snake-hint">Arrow keys or tap buttons. Space to pause.</p>
      )}
    </div>
  );
}
