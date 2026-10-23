import { describe, expect, it } from 'vitest';
import { showsMessage } from './InteractionOverlay';

describe('showsMessage', () => {
  it('is true for a message Enter/Escape can close', () => {
    expect(showsMessage({ kind: 'clue', text: 'A note.' }, null)).toBe(true);
    expect(showsMessage(null, 'wall')).toBe(true);
  });

  it('is false while the box shows only the explore hint', () => {
    expect(showsMessage(null, null)).toBe(false);
    expect(showsMessage({ kind: 'moved' }, null)).toBe(false);
  });
});
