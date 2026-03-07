import { h } from 'preact';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { SudokuGame } from './sudoku';

function SudokuApp(_context: AppContext): AppInstance {
  return {
    render: () => (
      <div class="game-view">
        <SudokuGame />
      </div>
    ),
    getTitle: () => 'Sudoku',
  };
}

export const sudokuApp = {
  id: 'sudoku',
  name: 'Sudoku',
  icon: '🔢',
  category: 'game' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: SudokuApp,
};
