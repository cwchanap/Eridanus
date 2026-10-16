import type { GameState } from '../game/types';

// Shown until the run records its first fact (talking to anyone or taking
// the tower stairs), so it needs no persisted "seen" flag of its own.
export function renderHowToPlay(state: GameState): string {
  if (state.factIds.length > 0) return '';
  return `<section data-testid="how-to-play" aria-label="How to play">
    <strong>How to play</strong>
    <ul>
      <li><kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> move one tile.</li>
      <li>Walk into people, chests, gates, and stairs to use them.</li>
      <li>Fights show their exact HP cost first: <kbd>Enter</kbd> to fight, <kbd>Esc</kbd> to back off.</li>
      <li>Progress saves automatically.</li>
    </ul>
    <p>Start by talking to the Warden in blue.</p>
  </section>`;
}
