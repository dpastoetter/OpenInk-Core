import { h } from 'preact';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { RacingGame } from './racing';

function RacingApp(_context: AppContext): AppInstance {
  return {
    render: () => (
      <div class="game-view">
        <RacingGame />
      </div>
    ),
    getTitle: () => 'Racing',
  };
}

export const racingApp = {
  id: 'racing',
  name: 'Racing',
  icon: '🏎️',
  category: 'game' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: {},
  launch: RacingApp,
};
