import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/state';
import { renderHowToPlay } from './HowToPlay';

describe('renderHowToPlay', () => {
  it('shows the controls on a fresh run', () => {
    expect(renderHowToPlay(createInitialGameState())).toContain(
      'data-testid="how-to-play"',
    );
  });

  it('disappears once the run records its first fact', () => {
    expect(
      renderHowToPlay({
        ...createInitialGameState(),
        factIds: ['main-missing-person-lead'],
      }),
    ).toBe('');
  });
});
