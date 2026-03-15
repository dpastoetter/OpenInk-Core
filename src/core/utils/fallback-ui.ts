/** Default message when the app fails to load (e.g. unsupported browser / Kindle). */
export const LOAD_ERROR_MESSAGE =
  'LibreInk could not load. Your browser may not be fully supported (e.g. Kindle). Try a different browser or device.';

/**
 * Renders a plain-text fallback message into a root element using DOM APIs only (no innerHTML).
 * Use for init/load errors so we never inject markup from variables.
 */
export function setRootFallback(root: HTMLElement, message: string): void {
  root.textContent = '';
  const p = root.ownerDocument.createElement('p');
  p.style.cssText = 'padding:1rem;font-family:system-ui,sans-serif;font-size:1rem;';
  p.textContent = message;
  root.appendChild(p);
}
