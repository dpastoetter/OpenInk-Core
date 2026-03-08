import { useState, useCallback, useEffect, useRef } from 'preact/hooks';

const LANES = 3;
const ROWS = 6; // row 0 = player; rows 1-5 = track (obstacles move down)
/** Discrete ticks only — no requestAnimationFrame; e-ink / low-spec friendly. */
const TICK_MS = 500;

interface Obstacle {
  lane: number;
  row: number;
}

function spawnObstacle(): Obstacle {
  return { lane: Math.floor(Math.random() * LANES), row: ROWS - 1 };
}

export function RacingGame() {
  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playing, setPlaying] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerLaneRef = useRef(playerLane);
  playerLaneRef.current = playerLane;

  const startGame = useCallback(() => {
    setPlayerLane(1);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setPlaying(true);
  }, []);

  const moveLeft = useCallback(() => {
    if (gameOver) return;
    setPlayerLane((l) => (l > 0 ? l - 1 : l));
  }, [gameOver]);

  const moveRight = useCallback(() => {
    if (gameOver) return;
    setPlayerLane((l) => (l < LANES - 1 ? l + 1 : l));
  }, [gameOver]);

  useEffect(() => {
    if (!playing || gameOver) return;
    tickRef.current = setInterval(() => {
      setObstacles((obs) => {
        const moved = obs.map((o) => ({ lane: o.lane, row: o.row - 1 }));
        const collision = moved.some((o) => o.row === 0 && o.lane === playerLaneRef.current);
        if (collision) {
          if (tickRef.current) clearInterval(tickRef.current);
          tickRef.current = null;
          setGameOver(true);
          return moved;
        }
        setScore((s) => s + 1);
        const filtered = moved.filter((o) => o.row >= 0);
        return [...filtered, spawnObstacle()];
      });
    }, TICK_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [playing, gameOver, playerLane]);

  // Sync gameOver so interval is cleared when collision happens (state update is async)
  useEffect(() => {
    if (gameOver && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [gameOver]);

  if (!playing) {
    return (
      <div class="racing-game">
        <p class="racing-intro">Dodge obstacles. Move left or right. One tick per step — no smooth animation (e-ink friendly).</p>
        <p class="racing-meta">Score = ticks survived.</p>
        <button type="button" class="btn" onClick={startGame}>
          Start race
        </button>
      </div>
    );
  }

  const obstacleSet = new Set(obstacles.map((o) => `${o.lane},${o.row}`));

  return (
    <div class="racing-game">
      <p class="racing-score" aria-live="polite">
        Score: {score} {gameOver ? '— Game over' : ''}
      </p>
      <div class="racing-track" role="img" aria-label={`Racing track. Player in lane ${playerLane + 1}. ${obstacles.length} obstacles.`}>
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} class="racing-row">
            {Array.from({ length: LANES }, (_, lane) => {
              const isPlayer = row === 0 && lane === playerLane;
              const hasObstacle = obstacleSet.has(`${lane},${row}`);
              return (
                <div
                  key={`${row}-${lane}`}
                  class={`racing-cell ${isPlayer ? 'racing-player' : ''} ${hasObstacle ? 'racing-obstacle' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div class="racing-controls">
        <button type="button" class="btn" onClick={moveLeft} disabled={gameOver} aria-label="Move left">
          ← Left
        </button>
        <button type="button" class="btn" onClick={moveRight} disabled={gameOver} aria-label="Move right">
          Right →
        </button>
      </div>
      {gameOver && (
        <button type="button" class="btn" onClick={startGame}>
          Play again
        </button>
      )}
    </div>
  );
}
