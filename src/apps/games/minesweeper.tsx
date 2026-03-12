import { useState, useCallback, useEffect, useContext } from 'preact/hooks';
import { AppHeaderActionsContext } from '@core/kernel/AppHeaderActionsContext';
import { GameBoardResize } from './GameBoardResize';

const ROWS = 9;
const COLS = 9;
const MINES = 10;

const BOARD_SIZE_MIN = 240;
const BOARD_SIZE_MAX = 480;
const BOARD_SIZE_STEP = 40;
const BOARD_SIZE_DEFAULT = 320;

function createGrid(): { mine: boolean; revealed: boolean; flagged: boolean; count: number }[][] {
  const grid = Array(ROWS).fill(null).map(() =>
    Array(COLS).fill(null).map(() => ({ mine: false, revealed: false, flagged: false, count: 0 }))
  );
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!grid[r][c].mine) {
      grid[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (grid[r + dr]?.[c + dc]?.mine) n++;
      grid[r][c].count = n;
    }
  }
  return grid;
}

export function MinesweeperGame() {
  const [grid, setGrid] = useState(() => createGrid());
  const [lost, setLost] = useState(false);
  const [won, setWon] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [boardSizePx, setBoardSizePx] = useState(BOARD_SIZE_DEFAULT);
  const setHeaderActions = useContext(AppHeaderActionsContext);

  useEffect(() => {
    if (!setHeaderActions) return;
    setHeaderActions(
      <GameBoardResize
        min={BOARD_SIZE_MIN}
        max={BOARD_SIZE_MAX}
        step={BOARD_SIZE_STEP}
        valuePx={boardSizePx}
        onDecrease={() => setBoardSizePx((s) => Math.max(BOARD_SIZE_MIN, s - BOARD_SIZE_STEP))}
        onIncrease={() => setBoardSizePx((s) => Math.min(BOARD_SIZE_MAX, s + BOARD_SIZE_STEP))}
      />
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, boardSizePx]);

  const reveal = useCallback((r: number, c: number) => {
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged) return;
    if (cell.mine) {
      setLost(true);
      setGrid((g) => g.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c || cell.mine ? { ...cell, revealed: true } : cell))));
      return;
    }
    const next = grid.map((row) => row.map((c) => ({ ...c })));
    function flood(sr: number, sc: number) {
      if (sr < 0 || sr >= ROWS || sc < 0 || sc >= COLS) return;
      const cell = next[sr][sc];
      if (cell.revealed || cell.flagged || cell.mine) return;
      cell.revealed = true;
      if (cell.count === 0) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(sr + dr, sc + dc);
      }
    }
    flood(r, c);
    setGrid(next);
    const revealed = next.flat().filter((x) => x.revealed).length;
    if (revealed === ROWS * COLS - MINES) setWon(true);
  }, [grid]);

  const toggleFlag = (r: number, c: number) => {
    if (grid[r][c].revealed || lost || won) return;
    setGrid((g) => g.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? { ...cell, flagged: !cell.flagged } : cell)));
  };

  const reset = () => {
    setGrid(createGrid());
    setLost(false);
    setWon(false);
  };

  const onCell = (r: number, c: number) => {
    if (flagMode) toggleFlag(r, c);
    else reveal(r, c);
  };

  return (
    <div class="minesweeper-game">
      <div class="minesweeper-flag-row">
        <button type="button" class={`btn minesweeper-flag-btn ${flagMode ? 'btn-active' : ''}`} onClick={() => setFlagMode((f) => !f)}>Flag</button>
      </div>
      <div class="minesweeper-grid" style={{ width: boardSizePx + 'px', height: boardSizePx + 'px', maxHeight: 'none' }}>
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              class={`minesweeper-cell ${cell.revealed ? 'revealed' : ''} ${cell.flagged ? 'flagged' : ''}`}
              onClick={() => onCell(r, c)}
              disabled={lost || won}
            >
              {!cell.revealed ? (cell.flagged ? '⚑' : '') : cell.mine ? '✱' : cell.count || ''}
            </button>
          ))
        )}
      </div>
      <div class="minesweeper-footer">
        <span class="minesweeper-status">{lost ? 'Game over' : won ? 'You win!' : flagMode ? 'Flag mode' : 'Tap to reveal'}</span>
        <button type="button" class="btn" onClick={reset}>New game</button>
      </div>
    </div>
  );
}
