import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';

function createPuzzle(): { puzzle: number[][]; solution: number[][] } {
  const grid = Array(9).fill(null).map(() => Array(9).fill(0));
  function valid(r: number, c: number, n: number): boolean {
    for (let i = 0; i < 9; i++) if (grid[r][i] === n || grid[i][c] === n) return false;
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (grid[br + i][bc + j] === n) return false;
    return true;
  }
  function solve(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const opts = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const n of opts) {
          if (!valid(r, c, n)) continue;
          grid[r][c] = n;
          if (solve()) return true;
          grid[r][c] = 0;
        }
        return false;
      }
    }
    return true;
  }
  solve();
  const solution = grid.map((r) => [...r]);
  const puzzle = grid.map((row) => row.map((v) => (Math.random() > 0.4 ? v : 0)));
  return { puzzle, solution };
}

export function SudokuGame() {
  const [state, setState] = useState(() => createPuzzle());
  const { puzzle, solution } = state;
  const [cells, setCells] = useState<number[][]>(() => puzzle.map((r) => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const initialFixed = puzzle.map((r) => r.map((v) => v !== 0));

  const setCell = useCallback((r: number, c: number, value: number) => {
    if (initialFixed[r][c]) return;
    setCells((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = value;
      return next;
    });
  }, []);

  const handleNumber = (n: number) => {
    if (!selected) return;
    setCell(selected[0], selected[1], n);
  };

  const newGame = () => {
    const next = createPuzzle();
    setState(next);
    setCells(next.puzzle.map((r) => [...r]));
    setSelected(null);
  };

  const solved = cells.every((row, r) => row.every((v, c) => v === solution[r][c]));

  return (
    <div class="sudoku-game">
      <p class="sudoku-status">{solved ? 'Solved!' : 'Select a cell, then tap a number'}</p>
      <div class="sudoku-grid">
        {cells.map((row, r) =>
          row.map((v, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              class={`sudoku-cell ${selected?.[0] === r && selected?.[1] === c ? 'sudoku-selected' : ''} ${initialFixed[r][c] ? 'sudoku-fixed' : ''}`}
              onClick={() => setSelected([r, c])}
            >
              {v || ''}
            </button>
          ))
        )}
      </div>
      <div class="sudoku-numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" class="btn" onClick={() => handleNumber(n)}>{n}</button>
        ))}
        <button type="button" class="btn" onClick={() => selected && setCell(selected[0], selected[1], 0)}>Clear</button>
      </div>
      <button type="button" class="btn" onClick={newGame}>New game</button>
    </div>
  );
}
