/**
 * Entry for the single-file legacy (ES5) build. Ensures regenerator-runtime
 * is loaded before the app so async/await works on old engines (e.g. Kindle).
 */
import 'regenerator-runtime/runtime';
import './main';
