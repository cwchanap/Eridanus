import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/state';
import { MESSAGES } from '../i18n/messages';
import { renderHowToPlay } from './HowToPlay';

describe('renderHowToPlay', () => {
  it('shows the controls on a fresh run', () => {
    expect(renderHowToPlay(createInitialGameState(), MESSAGES.en)).toContain(
      'data-testid="how-to-play"',
    );
  });

  it('disappears once the run records its first fact', () => {
    expect(
      renderHowToPlay(
        {
          ...createInitialGameState(),
          factIds: ['main-missing-person-lead'],
        },
        MESSAGES.en,
      ),
    ).toBe('');
  });

  it('wraps the key names in kbd tags whatever the language', () => {
    for (const m of Object.values(MESSAGES)) {
      const html = renderHowToPlay(createInitialGameState(), m);
      expect(html).toContain('<kbd>Enter</kbd>');
      expect(html).toContain('<kbd>Esc</kbd>');
    }
  });
});
