/**
 * Lucide-style inline SVGs for legacy/Kindle (no external assets).
 * 24×24 viewBox, stroke/fill currentColor, SVG 1.1 safe. Matches app-icons (Lucide) semantics.
 * Security: content is build-time constant only; no <script> or event handlers. Do not inject user/API data.
 */
const S = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true">${content}</svg>`;

export const LEGACY_ICONS: Record<string, string> = {
  calculator: S(
    '<rect x="4" y="2" width="16" height="20" rx="2"/>' +
      '<line x1="8" y1="6" x2="16" y2="6"/>' +
      '<line x1="16" y1="14" x2="16" y2="18"/>' +
      '<circle cx="16" cy="10" r="0.5" fill="currentColor"/>' +
      '<circle cx="12" cy="10" r="0.5" fill="currentColor"/>' +
      '<circle cx="8" cy="10" r="0.5" fill="currentColor"/>' +
      '<circle cx="12" cy="14" r="0.5" fill="currentColor"/>' +
      '<circle cx="8" cy="14" r="0.5" fill="currentColor"/>' +
      '<circle cx="12" cy="18" r="0.5" fill="currentColor"/>' +
      '<circle cx="8" cy="18" r="0.5" fill="currentColor"/>'
  ),
  chess: S(
    '<rect x="3" y="3" width="7" height="7" rx="1"/>' +
      '<rect x="14" y="3" width="7" height="7" rx="1"/>' +
      '<rect x="14" y="14" width="7" height="7" rx="1"/>' +
      '<rect x="3" y="14" width="7" height="7" rx="1"/>'
  ),
  comics: S(
    '<path d="M12 7v14"/>' +
      '<path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'
  ),
  dictionary: S(
    '<path d="M10 2v8l3-3 3 3V2"/>' +
      '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>'
  ),
  finance: S(
    '<path d="M16 7h6v6"/>' +
      '<path d="m22 7-8.5 8.5-5-5L2 17"/>'
  ),
  minesweeper: S(
    '<circle cx="11" cy="13" r="9"/>' +
      '<path d="M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95"/>' +
      '<path d="m22 2-1.5 1.5"/>'
  ),
  blog: S(
    '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>' +
      '<path d="M14 2v5a1 1 0 0 0 1 1h5"/>' +
      '<line x1="10" y1="9" x2="8" y2="9"/>' +
      '<line x1="16" y1="13" x2="8" y2="13"/>' +
      '<line x1="16" y1="17" x2="8" y2="17"/>'
  ),
  news: S(
    '<path d="M15 18h-5"/>' +
      '<path d="M18 14h-8"/>' +
      '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/>' +
      '<rect x="10" y="6" width="8" height="4" rx="1"/>'
  ),
  reddit: S(
    '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>'
  ),
  stopwatch: S(
    '<line x1="10" y1="2" x2="14" y2="2"/>' +
      '<line x1="12" y1="14" x2="15" y2="11"/>' +
      '<circle cx="12" cy="14" r="8"/>'
  ),
  sudoku: S(
    '<line x1="3" y1="9" x2="21" y2="9"/>' +
      '<line x1="3" y1="15" x2="21" y2="15"/>' +
      '<line x1="9" y1="3" x2="9" y2="21"/>' +
      '<line x1="15" y1="3" x2="15" y2="21"/>'
  ),
  timer: S(
    '<circle cx="12" cy="12" r="10"/>' +
      '<path d="M12 6v6l4 2"/>'
  ),
  weather: S(
    '<path d="M12 2v2"/>' +
      '<path d="m4.93 4.93 1.41 1.41"/>' +
      '<path d="M20 12h2"/>' +
      '<path d="m19.07 4.93-1.41 1.41"/>' +
      '<path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/>' +
      '<path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>'
  ),
  worldclock: S(
    '<circle cx="12" cy="12" r="10"/>' +
      '<path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>' +
      '<path d="M2 12h20"/>'
  ),
  snake: S(
    '<path d="M4 12c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4"/>' +
      '<path d="M12 12c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4"/>' +
      '<circle cx="20" cy="12" r="2"/>'
  ),
  settings: S(
    '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>' +
      '<circle cx="12" cy="12" r="3"/>'
  ),
};
