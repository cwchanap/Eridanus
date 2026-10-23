import type {
  ActionEffect,
  BlockedReason,
  Entity,
  GameState,
  MapSection,
  PendingInteraction,
  Stat,
} from '../game/types';
import { findEntityById, findSectionsAt, MAPS } from '../game/content';
import { DIALOGUE_LINES } from '../game/content/dialogue';
import type { JournalView } from '../game/journal';
import {
  PORTRAIT_SIZE,
  resolveEntityAsset,
  resolvePortraitPath,
  type AssetKey,
} from '../phaser/assets';
import { renderHowToPlay } from './HowToPlay';
import { ICONS } from './icons';
import { renderJournal } from './JournalPanel';
import { renderStatus } from './StatusPanel';

export type OverlayView = Readonly<{
  state: GameState;
  mapName: string;
  pending: PendingInteraction | null;
  effect: ActionEffect | null;
  blocked: BlockedReason | null;
  journal: JournalView;
}>;

type Message = Readonly<{ tag: string; text: string }>;
type CombatPending = Extract<PendingInteraction, { kind: 'combat' }>;
type PurchasePending = Extract<PendingInteraction, { kind: 'purchase' }>;

const REASON_TEXT: Record<BlockedReason, string> = {
  wall: 'A wall blocks the way.',
  'out-of-bounds': 'You cannot go that way.',
  'interaction-pending': 'Finish the current interaction first.',
  'latch-closed-front': 'The latch only opens from the other side.',
  'combat-unwinnable': 'Your attack cannot damage this enemy.',
  'combat-lethal': 'This fight would defeat you.',
  'reward-already-taken': 'The reward has already been claimed.',
  'not-enough-gold': 'You do not have enough gold for that yet.',
};

const STAT_LABEL: Record<Stat, string> = {
  attack: 'Attack',
  defense: 'Defense',
  maxHp: 'Max HP',
};

// Enemies are named by their art: content gives them stats, not names.
const ENEMY_NAME: Partial<Record<AssetKey, string>> = {
  'enemy-ruin-guard': 'Ruin Guard',
  'enemy-ruin-sentinel': 'Ruin Sentinel',
  'enemy-core-guardian': 'Core Guardian',
};

function effectMessage(effect: ActionEffect): Message | null {
  switch (effect.kind) {
    case 'moved':
    case 'traveled':
    case 'combatPrompt':
    case 'purchasePrompt':
      return null;
    case 'clue':
      return { tag: 'Clue', text: effect.text };
    case 'reward':
      return {
        tag: 'Power up',
        text: `${STAT_LABEL[effect.stat]} increased by ${effect.amount}.`,
      };
    case 'healed':
      return { tag: 'Restored', text: `Recovered to ${effect.hp} HP.` };
    case 'latchOpened':
      return {
        tag: 'Shortcut',
        text: 'The latch opens. The shortcut is now usable from both sides.',
      };
    case 'latchGuarded':
      return {
        tag: 'Sealed',
        text: `Guards hold this latch shut. Defeat ${effect.remaining} more to open it.`,
      };
    case 'enemyDefeated':
      return {
        tag: 'Victory',
        text: `Enemy defeated. HP lost: ${effect.hpLost}.${
          effect.gold > 0 ? ` Gold found: ${effect.gold}.` : ''
        }`,
      };
    case 'purchased':
      return {
        tag: 'Purchased',
        text: `${effect.ware.label}: ${STAT_LABEL[effect.ware.stat]} increased by ${effect.ware.amount}.`,
      };
    case 'soldOut':
      return {
        tag: effect.speaker,
        text: 'Sold out. You already own everything I make.',
      };
    case 'dialogue':
      return { tag: effect.speaker, text: DIALOGUE_LINES[effect.lineId] };
    case 'itemReward':
      return { tag: 'Item', text: 'Obtained ' + effect.label + '.' };
    case 'accessLocked':
      return { tag: 'Sealed', text: effect.text };
  }
}

// Whether the message box shows a message rather than the explore hint, so
// Enter/Escape (or its close button) has something to close.
export function showsMessage(
  effect: ActionEffect | null,
  blocked: BlockedReason | null,
): boolean {
  return (
    blocked !== null || (effect !== null && effectMessage(effect) !== null)
  );
}

// Sits on the box's top-right border, opposite the nameplate tag.
const CLOSE_BUTTON = `<button type="button" class="message-close" data-action="dismiss" aria-label="Close message" aria-keyshortcuts="Escape Enter"><kbd aria-hidden="true">Esc</kbd></button>`;

function boundsArea({ bounds }: MapSection): number {
  return (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
}

function renderLocation(state: GameState, mapName: string): string {
  // Nested sections overlap (a treasury inside its wing), so the tightest
  // bounds name the spot the player actually stands in.
  const [area] = [...findSectionsAt(state.mapId, state.tile)].sort(
    (a, b) => boundsArea(a) - boundsArea(b),
  );
  return `<header class="location" aria-label="Location">
    <h2 data-testid="map-name" data-map-id="${state.mapId}">${mapName}</h2>
    <p class="location-area">${area?.name ?? ''}</p>
  </header>`;
}

function renderPortrait(assetKey: AssetKey | null, tone: string): string {
  return assetKey
    ? `<div class="portrait" data-tone="${tone}"><img src="${resolvePortraitPath(assetKey)}" alt="" width="${PORTRAIT_SIZE}" height="${PORTRAIT_SIZE}"></div>`
    : '';
}

function entityAsset(
  entity: Entity | undefined,
  state: GameState,
): AssetKey | null {
  return entity ? resolveEntityAsset(entity, state) : null;
}

// Dialogue effects carry the speaker's name, so the portrait comes from the
// NPC or shopkeeper with that name on the current map.
function speakerPortrait(speaker: string, state: GameState): string {
  const npc = MAPS[state.mapId].entities.find(
    (entity) =>
      (entity.kind === 'npc' || entity.kind === 'shop') &&
      entity.name === speaker,
  );
  return renderPortrait(entityAsset(npc, state), 'npc');
}

function effectPortrait(effect: ActionEffect, state: GameState): string {
  if (effect.kind === 'dialogue' || effect.kind === 'soldOut')
    return speakerPortrait(effect.speaker, state);
  if (effect.kind === 'enemyDefeated')
    return renderPortrait(
      entityAsset(findEntityById(effect.enemyId), state),
      'defeated',
    );
  return '';
}

// A refused input while the prompt is open renders below the card, not
// inside it: the card's contents and height stay fixed, so .log-body's
// top-pinning keeps Fight/Cancel from shifting mid-prompt.
function renderEncounter(pending: CombatPending, state: GameState): string {
  const enemy = findEntityById(pending.enemyId);
  const assetKey = entityAsset(enemy, state);
  const portrait = renderPortrait(assetKey, 'enemy');
  const stats =
    enemy?.kind === 'enemy'
      ? `<p class="encounter-stats"><span>HP ${enemy.stats.hp}</span><span>ATK ${enemy.stats.attack}</span><span>DEF ${enemy.stats.defense}</span></p>`
      : '';
  const name = (assetKey && ENEMY_NAME[assetKey]) ?? 'Enemy';
  const hpAfter = state.player.hp - pending.preview.hpLoss;
  return `<section class="encounter" data-testid="combat-prompt" aria-label="Combat">
    ${portrait}
    <div class="encounter-info">
      <div class="encounter-head"><span class="message-tag">${name}</span>${stats}</div>
      <p class="encounter-cost"><span data-testid="combat-hp-loss">HP loss: ${pending.preview.hpLoss}</span> <span class="encounter-after">leaves you at ${hpAfter}/${state.player.maxHp}</span></p>
    </div>
    <div class="encounter-actions">
      ${promptButtons(`${ICONS.sword}Fight`, 'Cancel')}
    </div>
  </section>`;
}

function promptButtons(confirm: string, cancel: string): string {
  return `<button type="button" class="button button-fight" data-action="confirm" aria-keyshortcuts="Enter">${confirm} <kbd aria-hidden="true">Enter</kbd></button>
      <button type="button" class="button" data-action="cancel" aria-keyshortcuts="Escape">${cancel} <kbd aria-hidden="true">Esc</kbd></button>`;
}

const STAT_SHORT: Record<Stat, string> = {
  attack: 'ATK',
  defense: 'DEF',
  maxHp: 'Max HP',
};

// The shop counter shares the encounter card's frame, so the box keeps its
// size and Buy/Leave sit where Fight/Cancel do.
function renderPurchase(pending: PurchasePending, state: GameState): string {
  const shop = findEntityById(pending.shopId);
  const name = shop?.kind === 'shop' ? shop.name : 'Shop';
  const { ware } = pending;
  const short = state.player.gold < ware.price;
  return `<section class="encounter" data-kind="shop" data-testid="purchase-prompt" aria-label="Shop">
    ${renderPortrait(entityAsset(shop, state), 'npc')}
    <div class="encounter-info">
      <div class="encounter-head"><span class="message-tag">${name}</span><p class="encounter-stats"><span>${ware.label}</span><span>${STAT_SHORT[ware.stat]} +${ware.amount}</span></p></div>
      <p class="encounter-cost"><span data-testid="purchase-price">Price: ${ware.price} gold</span> <span class="encounter-after">${
        short
          ? `you have ${state.player.gold}`
          : `leaves you ${state.player.gold - ware.price}`
      }</span></p>
    </div>
    <div class="encounter-actions">
      ${promptButtons(`${ICONS.coin}Buy`, 'Leave')}
    </div>
  </section>`;
}

function renderMessage(view: OverlayView): string {
  const { state, pending, effect, blocked } = view;
  const blockedHtml = blocked
    ? `<div class="message message-blocked" data-testid="blocked-reason" data-reason="${blocked}"><p class="message-text">${REASON_TEXT[blocked]}</p></div>`
    : '';
  // prompt must stay reachable (Fight/Cancel clickable) even while blocked,
  // or a failed input while pending soft-locks the interaction
  if (pending)
    return (
      (pending.kind === 'combat'
        ? renderEncounter(pending, state)
        : renderPurchase(pending, state)) + blockedHtml
    );
  if (blocked) return blockedHtml + CLOSE_BUTTON;
  const message = effect && effectMessage(effect);
  if (effect && message) {
    return `<div class="message" data-testid="effect" data-effect="${effect.kind}"${
      effect.kind === 'dialogue' ? ` data-line="${effect.lineId}"` : ''
    }${
      effect.kind === 'latchGuarded'
        ? ` data-remaining="${effect.remaining}"`
        : ''
    }>${effectPortrait(effect, state)}<div class="message-body"><span class="message-tag">${message.tag}</span><p class="message-text">${message.text}</p></div></div>${CLOSE_BUTTON}`;
  }
  return `<p class="log-hint"><span class="keys"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></span> Explore. Walk into anything to interact with it.</p>`;
}

const SCROLLING_PANELS = ['.journal-body', '.hud-left'] as const;

export type SoundToggle = { readonly muted: boolean; toggleMuted(): void };

export class InteractionOverlay {
  // Whether the journal is folded is a view preference, not game state, so
  // it is never saved. The last view is kept so J can re-render on its own.
  private journalOpen = true;
  private view: OverlayView | null = null;
  // Scroll positions outlive the DOM: a folded journal has no .journal-body
  // to read on the next render, so they are kept here, not re-read each time.
  private readonly scrollTops = new Map<string, number>();

  constructor(
    private readonly root: HTMLElement,
    private readonly onConfirm: () => void,
    private readonly onCancel: () => void,
    private readonly sound: SoundToggle,
  ) {
    window.addEventListener('keydown', (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
        return;
      const key = event.key.toLowerCase();
      if (key === 'j') this.toggleJournal();
      if (key === 'm') this.toggleSound();
    });
  }

  private toggleSound(): void {
    if (!this.view) return;
    const toggle = '[data-action="toggle-sound"]';
    const hadFocus = document.activeElement?.matches(toggle) ?? false;
    this.sound.toggleMuted();
    this.render(this.view);
    if (hadFocus) this.root.querySelector<HTMLElement>(toggle)?.focus();
  }

  private toggleJournal(): void {
    // No view means the invalid-save screen, which has no journal.
    if (!this.view) return;
    const toggle = '[data-action="toggle-journal"]';
    const hadFocus = document.activeElement?.matches(toggle) ?? false;
    this.journalOpen = !this.journalOpen;
    this.render(this.view);
    // The render replaces the button, so hand focus to its replacement.
    if (hadFocus) this.root.querySelector<HTMLElement>(toggle)?.focus();
  }

  render(view: OverlayView): void {
    const { state, mapName, pending, journal } = view;
    this.view = view;
    // Every render replaces the panels, so keep their scroll positions.
    for (const selector of SCROLLING_PANELS) {
      const panel = this.root.querySelector(selector);
      if (panel) this.scrollTops.set(selector, panel.scrollTop);
    }
    this.root.innerHTML = `
      <div class="hud-left">
        ${renderStatus(state, pending?.kind === 'combat' ? pending.preview.hpLoss : 0)}
        ${renderHowToPlay(state)}
      </div>
      ${renderLocation(state, mapName)}
      ${renderJournal(journal, this.journalOpen, this.sound.muted)}
      <section class="panel log" data-testid="interaction" aria-label="Messages"><div class="log-body">${renderMessage(view)}</div></section>`;
    for (const selector of SCROLLING_PANELS) {
      const panel = this.root.querySelector(selector);
      if (panel) panel.scrollTop = this.scrollTops.get(selector) ?? 0;
    }
    this.root
      .querySelector<HTMLButtonElement>('[data-action="confirm"]')
      ?.addEventListener('click', () => this.onConfirm());
    // Closing a message is a cancel with nothing pending, like Escape.
    for (const action of ['cancel', 'dismiss'])
      this.root
        .querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
        ?.addEventListener('click', () => this.onCancel());
    this.root
      .querySelector<HTMLButtonElement>('[data-action="toggle-journal"]')
      ?.addEventListener('click', () => this.toggleJournal());
    this.root
      .querySelector<HTMLButtonElement>('[data-action="toggle-sound"]')
      ?.addEventListener('click', () => this.toggleSound());
  }

  renderInvalidSave(onReset: () => void): void {
    this.view = null;
    this.root.innerHTML = `
      <section class="panel invalid-save" data-testid="invalid-save" aria-label="Invalid save">
        <h2 class="panel-title">Save data is invalid.</h2>
        <p>The saved run in this browser can't be loaded. Reset it to start a fresh run.</p>
        <button type="button" class="button button-fight" data-action="reset">Reset save</button>
      </section>`;
    this.root
      .querySelector<HTMLButtonElement>('[data-action="reset"]')
      ?.addEventListener('click', () => onReset());
  }
}
