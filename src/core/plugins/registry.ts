import type { WebOSApp } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';

const apps = new Map<string, WebOSApp>();

export const AppRegistry = {
  registerApp(app: WebOSApp): void {
    if (app.apiVersion !== PLUGIN_API_VERSION) {
      console.warn(`[AppRegistry] App ${app.id} apiVersion ${app.apiVersion} !== ${PLUGIN_API_VERSION}`);
    }
    apps.set(app.id, app);
  },

  unregisterApp(id: string): void {
    apps.delete(id);
  },

  getApp(id: string): WebOSApp | undefined {
    return apps.get(id);
  },

  getAllApps(): WebOSApp[] {
    return Array.from(apps.values());
  },

  getAppsByCategory(category: string): WebOSApp[] {
    return this.getAllApps().filter((a) => a.category === category);
  },
};
