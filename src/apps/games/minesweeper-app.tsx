import { h } from 'preact';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { MinesweeperGame } from './minesweeper';

function MinesweeperApp(_context: AppContext): AppInstance {
  return {
    render: () => (
      <div class="game-view">
        <MinesweeperGame />
      </div>
    ),
    getTitle: () => 'Minesweeper',
  };
}

export const minesweeperApp = {
  id: 'minesweeper',
  name: 'Minesweeper',
  icon: '💣',
  category: 'game' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: MinesweeperApp,
};
