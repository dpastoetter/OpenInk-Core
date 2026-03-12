/**
 * Stockfish UCI integration for chess: FEN conversion and worker communication.
 * Worker script and WASM must be in public: /stockfish.wasm.js, /stockfish.wasm.
 */

type Piece = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p' | null;
type Board = (Piece)[][];

export interface FenState {
  castlingRights: { K: boolean; Q: boolean; k: boolean; q: boolean };
  enPassantTarget: [number, number] | null;
}

/** Convert internal board + turn (+ optional castling/en passant) to FEN. */
export function boardToFen(board: Board, turn: 'w' | 'b', state?: FenState): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let s = '';
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        if (empty > 0) {
          s += empty;
          empty = 0;
        }
        s += p;
      } else {
        empty++;
      }
    }
    if (empty > 0) s += empty;
    rows.push(s);
  }
  let castling = 'KQkq';
  if (state?.castlingRights) {
    const { K, Q, k, q } = state.castlingRights;
    castling = [K && 'K', Q && 'Q', k && 'k', q && 'q'].filter(Boolean).join('') || '-';
  }
  let ep = '-';
  if (state?.enPassantTarget) {
    const [r, c] = state.enPassantTarget;
    ep = String.fromCharCode(97 + c) + (8 - r);
  }
  return `${rows.join('/')} ${turn} ${castling} ${ep} 0 1`;
}

/** Parse UCI bestmove line to board coordinates. e.g. "bestmove e7e5" -> { from: [1,4], to: [3,4] }. */
export function parseBestMove(line: string): { from: [number, number]; to: [number, number] } | null {
  const match = /bestmove\s+([a-h][1-8])([a-h][1-8])(?:[qrbn])?/.exec(line);
  if (!match) return null;
  const fromCol = match[1].charCodeAt(0) - 97;
  const fromRow = 8 - parseInt(match[1][1], 10);
  const toCol = match[2].charCodeAt(0) - 97;
  const toRow = 8 - parseInt(match[2][1], 10);
  if (fromRow < 0 || fromRow > 7 || toRow < 0 || toRow > 7 || fromCol < 0 || fromCol > 7 || toCol < 0 || toCol > 7) return null;
  return { from: [fromRow, fromCol], to: [toRow, toCol] };
}

const STOCKFISH_URL = '/stockfish.wasm.js';

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(STOCKFISH_URL);
  return worker;
}

/** Ensure engine is ready (uci). Resolves when uciok. */
function ensureReady(worker: Worker): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : '';
      if (line.includes('uciok')) {
        worker.removeEventListener('message', onMessage);
        resolve();
      }
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage('uci');
    setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      if (initPromise === null) return;
      initPromise = null;
      reject(new Error('Stockfish init timeout'));
    }, 10000);
  });
  return initPromise;
}

/** Request best move from Stockfish. Calls onMove(with from, to) when ready; onError on failure. */
export function getStockfishMove(
  fen: string,
  skillLevel: number,
  movetimeMs: number,
  onMove: (from: [number, number], to: [number, number]) => void,
  onError: (err: Error) => void
): void {
  const w = getWorker();
  const level = Math.max(0, Math.min(20, skillLevel));
  ensureReady(w).then(() => {
    const handler = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : '';
      if (line.startsWith('bestmove')) {
        w.removeEventListener('message', handler);
        const move = parseBestMove(line);
        if (move) onMove(move.from, move.to);
        else onError(new Error('Invalid bestmove'));
      }
    };
    w.addEventListener('message', handler);
    w.postMessage(`setoption name Skill Level value ${level}`);
    w.postMessage('ucinewgame');
    w.postMessage(`position fen ${fen}`);
    w.postMessage(`go movetime ${movetimeMs}`);
    setTimeout(() => {
      w.removeEventListener('message', handler);
    }, movetimeMs + 5000);
  }).catch(onError);
}

/** Reset engine state (e.g. new game). Keeps worker alive for speed; only sends ucinewgame. */
export function resetStockfish(): void {
  if (worker) {
    worker.postMessage('ucinewgame');
  }
}

export function isStockfishAvailable(): boolean {
  return typeof WebAssembly === 'object' && typeof Worker !== 'undefined';
}
