import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { SnakeGame } from './snake';

function SnakeApp(_context: AppContext): AppInstance {
  return {
    render: () => (
      <div class="game-view">
        <SnakeGame />
      </div>
    ),
    getTitle: () => 'Snake',
  };
}

export const snakeApp = {
  id: 'snake',
  name: 'Snake',
  icon: '🐍',
  iconFallback: 'S',
  category: 'game' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: SnakeApp,
};
