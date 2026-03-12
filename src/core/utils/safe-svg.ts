/**
 * Allow only SVG markup that cannot run script or event handlers.
 * Use for iconLegacySvg (build-time constants from LEGACY_ICONS). Do not use for user/API content.
 */
export function isSafeLegacySvg(html: unknown): html is string {
  if (typeof html !== 'string' || html.length > 8000) return false;
  const s = html.trim();
  if (!s.startsWith('<svg')) return false;
  const lower = s.toLowerCase();
  if (lower.includes('<script') || lower.includes('</script>')) return false;
  if (/\bon\w+\s*=/.test(s)) return false;
  if (/javascript\s*:|data\s*:|vbscript\s*:/i.test(s)) return false;
  return true;
}
