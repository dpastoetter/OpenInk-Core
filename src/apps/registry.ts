import type { WebOSApp } from '../types/plugin';
import { AppRegistry } from '../core/plugins/registry';
import { settingsApp } from './settings';
import { financeApp } from './finance';
import { newsApp } from './news';
import { redditApp } from './reddit';
import { weatherApp } from './weather';
import { timerApp } from './timer';
import { calculatorApp } from './calculator';
import { dictionaryApp } from './dictionary';
import { chessApp } from './games/chess-app';
import { minesweeperApp } from './games/minesweeper-app';
import { racingApp } from './games/racing-app';
import { sudokuApp } from './games/sudoku-app';

/** All apps to be shown on the home screen. Alphabetical order, Settings last. */
const APPS: WebOSApp[] = [
  calculatorApp,
  chessApp,
  dictionaryApp,
  financeApp,
  minesweeperApp,
  newsApp,
  racingApp,
  redditApp,
  sudokuApp,
  timerApp,
  weatherApp,
  settingsApp,
];

/** Registers all built-in apps with the shell. Called once at startup. */
export function registerAllApps(): void {
  APPS.forEach((app) => AppRegistry.registerApp(app));
}
