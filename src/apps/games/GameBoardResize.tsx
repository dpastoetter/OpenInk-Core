/**
 * Board size controls for every game (Chess, Snake, Sudoku, Minesweeper).
 * MUST be shown in the app header for each game: − / size label / + for consistent board sizing.
 */

export interface GameBoardResizeProps {
  min: number;
  max: number;
  step: number;
  valuePx: number;
  onDecrease: () => void;
  onIncrease: () => void;
  ariaLabel?: string;
}

export function GameBoardResize({
  min,
  max,
  step: _step,
  valuePx,
  onDecrease,
  onIncrease,
  ariaLabel = 'Board size',
}: GameBoardResizeProps) {
  return (
    <div class="game-board-zoom" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        class="btn btn-status btn-status-zoom"
        onClick={onDecrease}
        aria-label="Smaller board"
        disabled={valuePx <= min}
      >
        −
      </button>
      <span class="game-board-zoom-label">{valuePx}px</span>
      <button
        type="button"
        class="btn btn-status btn-status-zoom"
        onClick={onIncrease}
        aria-label="Larger board"
        disabled={valuePx >= max}
      >
        +
      </button>
    </div>
  );
}
