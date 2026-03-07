import { describe, it, expect, beforeEach } from 'vitest';
import { AppRegistry } from './registry';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import type { WebOSApp, AppContext, AppInstance } from '../../types/plugin';

function mockApp(id: string, name: string): WebOSApp {
  return {
    id,
    name,
    apiVersion: PLUGIN_API_VERSION,
    launch: (_ctx: AppContext): AppInstance => ({
      render: () => null as unknown as ReturnType<AppInstance['render']>,
    }),
  };
}

describe('AppRegistry', () => {
  beforeEach(() => {
    ['a', 'b', 'c'].forEach((id) => AppRegistry.unregisterApp(id));
  });

  it('registers and retrieves an app', () => {
    const app = mockApp('a', 'App A');
    AppRegistry.registerApp(app);
    expect(AppRegistry.getApp('a')).toBe(app);
    expect(AppRegistry.getAllApps()).toHaveLength(1);
  });

  it('allows unregister and no longer returns app', () => {
    AppRegistry.registerApp(mockApp('a', 'App A'));
    AppRegistry.unregisterApp('a');
    expect(AppRegistry.getApp('a')).toBeUndefined();
    expect(AppRegistry.getAllApps()).toHaveLength(0);
  });

  it('returns apps by category', () => {
    AppRegistry.registerApp({ ...mockApp('a', 'A'), category: 'game' });
    AppRegistry.registerApp({ ...mockApp('b', 'B'), category: 'reader' });
    AppRegistry.registerApp({ ...mockApp('c', 'C'), category: 'game' });
    expect(AppRegistry.getAppsByCategory('game')).toHaveLength(2);
    expect(AppRegistry.getAppsByCategory('reader')).toHaveLength(1);
  });
});
