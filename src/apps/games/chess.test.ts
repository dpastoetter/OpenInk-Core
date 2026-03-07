import { describe, it, expect } from 'vitest';

/** Replicate getMoves logic for tests (no React). */
function getMoves(board: string[][], row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const white = piece === piece.toUpperCase();
  const out: [number, number][] = [];

  const canMove = (r: number, c: number): boolean => {
    if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
    const target = board[r][c];
    if (!target) return true;
    return (target === target.toUpperCase()) !== white;
  };

  const add = (r: number, c: number) => {
    if (canMove(r, c)) out.push([r, c]);
  };

  const p = piece.toLowerCase();
  if (p === 'p') {
    const dir = white ? -1 : 1;
    add(row + dir, col);
    if ((white && row === 6) || (!white && row === 1)) add(row + 2 * dir, col);
    if (board[row + dir]?.[col - 1] && (board[row + dir][col - 1] === board[row + dir][col - 1].toUpperCase()) !== white) add(row + dir, col - 1);
    if (board[row + dir]?.[col + 1] && (board[row + dir][col + 1] === board[row + dir][col + 1].toUpperCase()) !== white) add(row + dir, col + 1);
  } else if (p === 'k') {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(row + dr, col + dc);
  }
  return out;
}

describe('Chess move validation', () => {
  it('white pawn from e2 has two moves (e3, e4)', () => {
    const board = Array(8).fill(null).map(() => Array(8).fill(''));
    board[6][4] = 'P'; // e2
    const moves = getMoves(board, 6, 4);
    expect(moves.some(([r, c]) => r === 5 && c === 4)).toBe(true);
    expect(moves.some(([r, c]) => r === 4 && c === 4)).toBe(true);
    expect(moves.length).toBe(2);
  });

  it('white king in corner has three moves', () => {
    const board = Array(8).fill(null).map(() => Array(8).fill(''));
    board[7][0] = 'K';
    const moves = getMoves(board, 7, 0);
    expect(moves.length).toBe(3);
  });
});
