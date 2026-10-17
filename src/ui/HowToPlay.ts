import type { GameState } from '../game/types';

// Shown until the run records its first fact (talking to anyone or taking
// the tower stairs), so it needs no persisted "seen" flag of its own.
export function renderHowToPlay(state: GameState): string {
  if (state.factIds.length > 0) return '';
  return `<section class="panel how-to-play" data-testid="how-to-play" aria-label="How to play">
    <h2 class="panel-title">How to play</h2>
    <ul>
      <li><span class="keys"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></span> move one tile.</li>
      <li>Walk into people, chests, gates, and stairs to use them.</li>
      <li>Fights show their exact HP cost first: <kbd>Enter</kbd> to fight, <kbd>Esc</kbd> to back off.</li>
      <li>Progress saves automatically.</li>
    </ul>
    <p class="how-to-play-tip">Start by talking to the Warden in blue.</p>
  </section>`;
}
