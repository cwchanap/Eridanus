// Decorative inline SVG icons. Each is aria-hidden so it never changes a
// label's accessible name or an element's text content.
function icon(className: string, body: string): string {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

export const ICONS = {
  heart: icon(
    'icon-heart',
    '<path d="M12 20.6s-7.9-4.8-9.6-9.7C1.2 7.4 3.5 4 7 4c2.1 0 3.8 1.2 5 3 1.2-1.8 2.9-3 5-3 3.5 0 5.8 3.4 4.6 6.9-1.7 4.9-9.6 9.7-9.6 9.7z"/>',
  ),
  sword: icon(
    'icon-sword',
    '<path d="M21 3l-.8 4.6-9.4 9.4-3.8-3.8L16.4 3.8z"/><path d="M4.6 12.4l7 7-1.4 1.4-7-7z"/><path d="M6.4 16.4l1.2 1.2-3.3 3.3a.85.85 0 01-1.2-1.2z"/>',
  ),
  shield: icon(
    'icon-shield',
    '<path d="M12 2.4l7.8 2.8v6.1c0 5-3.3 9-7.8 10.8-4.5-1.8-7.8-5.8-7.8-10.8V5.2z"/><path class="icon-cut" d="M12 5.2v14.4c3.2-1.6 5.2-4.6 5.2-8.3V7.1z"/>',
  ),
  relic: icon(
    'icon-relic',
    '<path d="M7 3.5h10l4.2 5.6L12 20.7 2.8 9.1z"/><path class="icon-cut" d="M2.8 9.1h18.4L12 20.7z"/>',
  ),
  coin: icon(
    'icon-coin',
    '<circle cx="12" cy="12" r="9"/><path class="icon-cut" d="M12 6.5l1.6 3.9 4.1.3-3.1 2.7 1 4-3.6-2.2-3.6 2.2 1-4-3.1-2.7 4.1-.3z"/>',
  ),
} as const;
