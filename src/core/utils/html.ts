/**
 * Strip HTML tags and decode entities, returning plain text.
 * Uses the DOM so that entities and tags are handled correctly.
 * Safe for user content (no script execution).
 */
export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent?.trim() ?? '';
}
