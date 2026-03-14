/**
 * Minimal ES5 polyfills for Kindle/legacy build. Only patches if missing.
 * Loaded first in legacy-entry so the rest of the app can rely on these.
 */
(function (g: unknown) {
  if (typeof g !== 'object' || g === null) return;
  var win = g as Window & typeof globalThis;

  // Object.assign (ES2015) – used by Preact and others
  if (typeof (win as Window & { Object: { assign?: unknown } }).Object.assign !== 'function') {
    (win as Window & { Object: { assign: (t: object, ...s: object[]) => object } }).Object.assign = function (
      t: object,
      ...rest: object[]
    ) {
      if (t == null) throw new TypeError('Cannot convert undefined or null to object');
      var to = Object(t);
      for (var i = 0; i < rest.length; i++) {
        var next = rest[i];
        if (next != null) {
          for (var k in next) {
            if (Object.prototype.hasOwnProperty.call(next, k)) (to as Record<string, unknown>)[k] = (next as Record<string, unknown>)[k];
          }
        }
      }
      return to;
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : undefined);
