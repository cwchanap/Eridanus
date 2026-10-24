import type { GameState } from '../game/types';
import type { Messages } from '../i18n/messages';

// Shown until the run records its first fact (talking to anyone or taking
// the tower stairs), so it needs no persisted "seen" flag of its own.
export function renderHowToPlay(state: GameState, m: Messages): string {
  if (state.factIds.length > 0) return '';
  const { howToPlay } = m;
  return `<section class="panel how-to-play" data-testid="how-to-play" aria-label="${howToPlay.title}">
    <h2 class="panel-title">${howToPlay.title}</h2>
    <ul>
      <li><span class="keys"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></span> ${howToPlay.move}</li>
      <li>${howToPlay.interact}</li>
      <li>${howToPlay.fight('<kbd>Enter</kbd>', '<kbd>Esc</kbd>')}</li>
      <li>${howToPlay.autosave}</li>
    </ul>
    <p class="how-to-play-tip">${howToPlay.tip}</p>
  </section>`;
}
