import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { ChessGame } from './chess';

function ChessApp(_context: AppContext): AppInstance {
  return {
    render: () => (
      <div class="game-view">
        <ChessGame />
      </div>
    ),
    getTitle: () => 'Chess',
  };
}

export const chessApp = {
  id: 'chess',
  name: 'Chess',
  icon: '♟️',
  category: 'game' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: ChessApp,
};
