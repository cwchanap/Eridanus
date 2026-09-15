import type { GameState } from '../game/types';

export class InteractionOverlay {
  constructor(private readonly root: HTMLElement) {}

  renderHud(state: GameState, mapName: string): void {
    this.root.innerHTML = `
      <section data-testid="hud" aria-label="Player status">
        <span data-testid="map-name">${mapName}</span>
        <span data-stat="hp">HP ${state.player.hp}/${state.player.maxHp}</span>
        <span data-stat="attack">ATK ${state.player.attack}</span>
        <span data-stat="defense">DEF ${state.player.defense}</span>
        <div data-testid="interaction"></div>
      </section>`;
  }
}
