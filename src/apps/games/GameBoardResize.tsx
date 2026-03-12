/**
 * Shared resize controls for game boards (Chess, Snake, Sudoku, Minesweeper).
 * Renders − / size label / + in the app header for consistent board sizing.
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
    <div class="chess-board-zoom" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        class="btn btn-status btn-status-zoom"
        onClick={onDecrease}
        aria-label="Smaller board"
        disabled={valuePx <= min}
      >
        −
      </button>
      <span class="chess-board-zoom-label">{valuePx}px</span>
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
