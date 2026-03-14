import type { AppDescriptor, WebOSApp } from '../types/plugin';
import { AppRegistry } from '../core/plugins/registry';
import { LEGACY_ICONS } from '../core/icons/legacy-svg';

/** Descriptor + lazy loader for each app. iconFallback = ASCII for Kindle; iconLegacySvg = simple B&W icon. */
const LAZY_APPS: { descriptor: AppDescriptor; load: () => Promise<WebOSApp> }[] = [
  { descriptor: { id: 'blog', name: 'Blog & News', icon: '📝', iconFallback: 'B', iconLegacySvg: LEGACY_ICONS.blog, category: 'reader' }, load: () => import('./blog').then((m) => m.blogApp) },
  { descriptor: { id: 'calculator', name: 'Calculator', icon: '🔢', iconFallback: '#', iconLegacySvg: LEGACY_ICONS.calculator, category: 'reader' }, load: () => import('./calculator').then((m) => m.calculatorApp) },
  { descriptor: { id: 'chess', name: 'Chess', icon: '♟️', iconFallback: 'P', iconLegacySvg: LEGACY_ICONS.chess, category: 'game' }, load: () => import('./games/chess-app').then((m) => m.chessApp) },
  { descriptor: { id: 'comics', name: 'Comics', icon: '🗞️', iconFallback: 'C', iconLegacySvg: LEGACY_ICONS.comics, category: 'reader' }, load: () => import('./comics').then((m) => m.comicsApp) },
  { descriptor: { id: 'finance', name: 'Finance', icon: '📈', iconFallback: '$', iconLegacySvg: LEGACY_ICONS.finance, category: 'network' }, load: () => import('./finance').then((m) => m.financeApp) },
  { descriptor: { id: 'minesweeper', name: 'Minesweeper', icon: '💣', iconFallback: '*', iconLegacySvg: LEGACY_ICONS.minesweeper, category: 'game' }, load: () => import('./games/minesweeper-app').then((m) => m.minesweeperApp) },
  { descriptor: { id: 'reddit', name: 'Reddit', icon: '🔴', iconFallback: 'r', iconLegacySvg: LEGACY_ICONS.reddit, category: 'network' }, load: () => import('./reddit').then((m) => m.redditApp) },
  { descriptor: { id: 'snake', name: 'Snake', icon: '🐍', iconFallback: 's', iconLegacySvg: LEGACY_ICONS.snake, category: 'game' }, load: () => import('./games/snake-app').then((m) => m.snakeApp) },
  { descriptor: { id: 'timer', name: 'Timer & Stopwatch', icon: '⏱️', iconFallback: 'T', iconLegacySvg: LEGACY_ICONS.timer, category: 'system' }, load: () => import('./timer').then((m) => m.timerApp) },
  { descriptor: { id: 'weather', name: 'Weather', icon: '🌤️', iconFallback: '~', iconLegacySvg: LEGACY_ICONS.weather, category: 'network' }, load: () => import('./weather').then((m) => m.weatherApp) },
  { descriptor: { id: 'todo', name: 'To-do', icon: '☑️', iconFallback: '✓', iconLegacySvg: LEGACY_ICONS.todo, category: 'system' }, load: () => import('./todo').then((m) => m.todoApp) },
  { descriptor: { id: 'recipes', name: 'Recipes', icon: '🍳', iconFallback: 'R', iconLegacySvg: LEGACY_ICONS.recipes, category: 'reader' }, load: () => import('./recipes').then((m) => m.recipesApp) },
  { descriptor: { id: 'pictureframe', name: 'Picture Frame', icon: '🖼️', iconFallback: '[ ]', iconLegacySvg: LEGACY_ICONS.pictureframe, category: 'system' }, load: () => import('./pictureframe').then((m) => m.pictureframeApp) },
  { descriptor: { id: 'settings', name: 'Settings', icon: '⚙️', iconFallback: '[*]', iconLegacySvg: LEGACY_ICONS.settings, category: 'system' }, load: () => import('./settings').then((m) => m.settingsApp) },
];

/** Registers all built-in apps as lazy (load on first launch). Called once at startup. */
export function registerAllApps(): void {
  LAZY_APPS.forEach(({ descriptor, load }) => AppRegistry.registerLazy(descriptor, load));
}
