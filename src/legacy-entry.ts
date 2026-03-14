/**
 * Entry for the single-file legacy (ES5) build.
 * Order: polyfills → regenerator-runtime → app. Snake is loaded here so it
 * is registered at startup and does not rely on dynamic import(), which can
 * fail on Kindle/Silk.
 */
import './legacy-polyfills';
import 'regenerator-runtime/runtime';
import { snakeApp } from './apps/games/snake-app';

declare global {
  interface Window {
    __openinkSnake?: typeof snakeApp;
  }
}
window.__openinkSnake = snakeApp;

import './main';
