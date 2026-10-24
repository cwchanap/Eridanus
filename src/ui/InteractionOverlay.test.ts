import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../i18n/messages';
import { showsMessage } from './InteractionOverlay';

const m = MESSAGES.en;

describe('showsMessage', () => {
  it('is true for a message Enter/Escape can close', () => {
    expect(
      showsMessage({ kind: 'clue', clueId: 'floor1-route-mark' }, null, m),
    ).toBe(true);
    expect(showsMessage(null, 'wall', m)).toBe(true);
  });

  it('is false while the box shows only the explore hint', () => {
    expect(showsMessage(null, null, m)).toBe(false);
    expect(showsMessage({ kind: 'moved' }, null, m)).toBe(false);
  });
});
