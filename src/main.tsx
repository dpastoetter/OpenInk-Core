import { h, render } from 'preact';
import { createStorageService } from './core/services/storage';
import { createNetworkService } from './core/services/network';
import { createThemeService } from './core/services/theme';
import { createSettingsService } from './core/services/settings';
import { Shell } from './core/kernel/shell';
import { registerAllApps } from './apps/registry';
import { DEFAULT_SETTINGS } from './types/settings';
import './index.css';

const storage = createStorageService();
const network = createNetworkService();
const theme = createThemeService(DEFAULT_SETTINGS);
const settings = createSettingsService(storage, theme);

registerAllApps();

async function init() {
  await settings.load();
  const root = document.getElementById('root');
  if (root) {
    render(
      <Shell
        services={{
          storage,
          network,
          theme,
          settings,
        }}
      />,
      root
    );
  }
}

init();
