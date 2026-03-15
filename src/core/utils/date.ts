/**
 * Legacy-safe date/time formatting (Kindle/ReKindle: Intl and toLocaleString
 * options are unreliable; use manual string building).
 */

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** Time as HH:MM (24h). Safe on legacy/Kindle. */
export function formatTimeLegacy(d: Date): string {
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/** Time as h:MM AM/PM (12h). Safe on legacy/Kindle. */
export function formatTimeLegacy12h(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return h12 + ':' + pad2(m) + (am ? ' AM' : ' PM');
}

/** Time as HH:MM:SS (24h). Safe on legacy/Kindle. */
export function formatTimeWithSecondsLegacy(d: Date): string {
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

/** Date as M/D/YYYY. Safe on legacy/Kindle. */
export function formatDateLegacy(d: Date): string {
  return d.getMonth() + 1 + '/' + d.getDate() + '/' + d.getFullYear();
}

/** Date as dd.mm.yyyy. Safe on legacy/Kindle. */
export function formatDateDDMMYY(d: Date): string {
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear();
}

/** Weekday as short label (Sun, Mon, ...). Safe on legacy/Kindle. */
export function formatWeekdayShortLegacy(d: Date): string {
  return WEEKDAY_SHORT[d.getDay()] ?? '?';
}

/** Date + time short (e.g. M/D/YYYY HH:MM). Safe on legacy/Kindle. */
export function formatDateTimeLegacy(d: Date): string {
  return formatDateLegacy(d) + ' ' + formatTimeLegacy(d);
}
