import type { VNode } from 'preact';
import type { StorageService, NetworkService, ThemeService, SettingsService } from './services';

/**
 * Plugin API version. Apps must use this value for `apiVersion`;
 * mismatches are warned at registration.
 */
export const PLUGIN_API_VERSION = 1;

/** App category for home screen grouping and filtering. */
export type AppCategory = 'system' | 'game' | 'reader' | 'network' | string;

/** Optional metadata (permissions, network requirement, etc.). */
export interface AppMetadata {
  permissions?: string[];
  requiresNetwork?: boolean;
  [key: string]: unknown;
}

/**
 * Descriptor for an app plugin. Implement this and register via
 * AppRegistry.registerApp() to add an app to the home screen.
 */
export interface WebOSApp {
  /** Unique identifier (e.g. "reddit", "settings"). */
  id: string;
  /** Label shown on the home screen. */
  name: string;
  /** Optional icon (character or icon key). */
  icon?: string;
  /** Category for ordering/grouping (system, reader, network, game, etc.). */
  category?: AppCategory;
  /** Must equal PLUGIN_API_VERSION. */
  apiVersion: number;
  metadata?: AppMetadata;
  /** Creates the app instance; receives context and returns an AppInstance. */
  launch: (context: AppContext) => AppInstance;
}

/**
 * Context passed to each app at launch. Provides navigation, close,
 * and shared services (storage, network, theme, settings).
 */
export interface AppContext {
  /** Navigate to a path (e.g. "/other-app" or in-app route). */
  navigate: (path: string) => void;
  /** Close the app and return to home. */
  closeApp: () => void;
  services: {
    storage: StorageService;
    network: NetworkService;
    theme: ThemeService;
    settings: SettingsService;
  };
}

/**
 * Instance returned by WebOSApp.launch(). The shell calls render() to
 * show the app; optional hooks support lifecycle and in-app back.
 */
export interface AppInstance {
  /** Returns the current view (Preact VNode). */
  render: () => VNode;
  /** Called when the app is backgrounded (e.g. user goes home). */
  onSuspend?: () => void;
  /** Called when the app is resumed. */
  onResume?: () => void;
  /** Called when the app is closed (cleanup). */
  onDestroy?: () => void;
  /** If true, shell Back button calls goBack() instead of closing the app. */
  canGoBack?: () => boolean;
  /** Navigate back within the app (e.g. thread → subreddit list). */
  goBack?: () => void;
  /** Title shown in the shell header for this view. */
  getTitle?: () => string;
}
