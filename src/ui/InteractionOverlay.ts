import type {
  ActionEffect,
  BlockedReason,
  GameState,
  PendingInteraction,
} from '../game/types';

export type OverlayView = Readonly<{
  state: GameState;
  mapName: string;
  pending: PendingInteraction | null;
  effect: ActionEffect | null;
  blocked: BlockedReason | null;
}>;

const REASON_TEXT: Record<BlockedReason, string> = {
  wall: 'A wall blocks the way.',
  'out-of-bounds': 'You cannot go that way.',
  'interaction-pending': 'Finish the current interaction first.',
  'latch-closed-front': 'The latch only opens from the other side.',
  'combat-unwinnable': 'Your attack cannot damage this enemy.',
  'combat-lethal': 'This fight would defeat you.',
  'reward-already-taken': 'The reward has already been claimed.',
};

function effectText(effect: ActionEffect): string {
  switch (effect.kind) {
    case 'moved':
    case 'traveled':
    case 'combatPrompt':
      return '';
    case 'clue':
      return effect.text;
    case 'reward':
      return `${effect.stat.toUpperCase()} increased by ${effect.amount}.`;
    case 'healed':
      return `Recovered to ${effect.hp} HP.`;
    case 'latchOpened':
      return 'The rear latch opens. The shortcut is now usable from both sides.';
    case 'enemyDefeated':
      return `Enemy defeated. HP lost: ${effect.hpLost}.`;
  }
}

export class InteractionOverlay {
  constructor(
    private readonly root: HTMLElement,
    private readonly onFight: () => void,
    private readonly onCancel: () => void,
  ) {}

  render(view: OverlayView): void {
    const { state, mapName, pending, effect, blocked } = view;
    const blockedHtml = blocked
      ? `<div data-testid="blocked-reason" data-reason="${blocked}">${REASON_TEXT[blocked]}</div>`
      : '';
    let transient = '';
    if (pending) {
      // prompt must stay reachable (Fight/Cancel clickable) even while blocked,
      // or a failed input while pending soft-locks the interaction
      transient = `${blockedHtml}<section data-testid="combat-prompt">
        <span data-testid="combat-hp-loss">HP loss: ${pending.preview.hpLoss}</span>
        <button type="button" data-action="fight">Fight</button>
        <button type="button" data-action="cancel">Cancel</button>
      </section>`;
    } else if (blocked) {
      transient = blockedHtml;
    } else if (effect) {
      const text = effectText(effect);
      if (text)
        transient = `<div data-testid="effect" data-effect="${effect.kind}">${text}</div>`;
    }
    this.root.innerHTML = `
      <section data-testid="hud" aria-label="Player status">
        <span data-testid="map-name">${mapName}</span>
        <span data-stat="hp">HP ${state.player.hp}/${state.player.maxHp}</span>
        <span data-stat="attack">ATK ${state.player.attack}</span>
        <span data-stat="defense">DEF ${state.player.defense}</span>
        <div data-testid="interaction">${transient}</div>
      </section>`;
    this.root
      .querySelector<HTMLButtonElement>('[data-action="fight"]')
      ?.addEventListener('click', () => this.onFight());
    this.root
      .querySelector<HTMLButtonElement>('[data-action="cancel"]')
      ?.addEventListener('click', () => this.onCancel());
  }

  renderInvalidSave(onReset: () => void): void {
    this.root.innerHTML = `
      <section data-testid="invalid-save" aria-label="Invalid save">
        <span>Save data is invalid.</span>
        <button type="button" data-action="reset">Reset save</button>
      </section>`;
    this.root
      .querySelector<HTMLButtonElement>('[data-action="reset"]')
      ?.addEventListener('click', () => onReset());
  }
}
