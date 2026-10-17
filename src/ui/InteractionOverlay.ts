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
  ASSET_PATHS,
  resolveEntityAsset,
  type AssetKey,
} from '../phaser/assets';
import { renderHowToPlay } from './HowToPlay';
import { ICONS } from './icons';
import { renderJournal, renderPlaces } from './JournalPanel';
import { renderItems, renderStatus } from './StatusPanel';

export type OverlayView = Readonly<{
  state: GameState;
  mapName: string;
  pending: PendingInteraction | null;
  effect: ActionEffect | null;
  blocked: BlockedReason | null;
  journal: JournalView;
}>;

type Message = Readonly<{ tag: string; text: string }>;

const REASON_TEXT: Record<BlockedReason, string> = {
  wall: 'A wall blocks the way.',
  'out-of-bounds': 'You cannot go that way.',
  'interaction-pending': 'Finish the current interaction first.',
  'latch-closed-front': 'The latch only opens from the other side.',
  'combat-unwinnable': 'Your attack cannot damage this enemy.',
  'combat-lethal': 'This fight would defeat you.',
  'reward-already-taken': 'The reward has already been claimed.',
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
        text: 'The rear latch opens. The shortcut is now usable from both sides.',
      };
    case 'enemyDefeated':
      return {
        tag: 'Victory',
        text: `Enemy defeated. HP lost: ${effect.hpLost}.`,
      };
    case 'dialogue':
      return { tag: effect.speaker, text: DIALOGUE_LINES[effect.lineId] };
    case 'itemReward':
      return { tag: 'Item', text: 'Obtained ' + effect.label + '.' };
    case 'accessLocked':
      return { tag: 'Sealed', text: effect.text };
  }
}

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
    ? `<div class="portrait" data-tone="${tone}"><img src="${ASSET_PATHS[assetKey]}" alt="" width="64" height="64"></div>`
    : '';
}

function entityAsset(
  entity: Entity | undefined,
  state: GameState,
): AssetKey | null {
  return entity ? resolveEntityAsset(entity, state) : null;
}

// Dialogue effects carry the speaker's name, so the portrait comes from the
// NPC with that name on the current map.
function speakerPortrait(speaker: string, state: GameState): string {
  const npc = MAPS[state.mapId].entities.find(
    (entity) => entity.kind === 'npc' && entity.name === speaker,
  );
  return renderPortrait(entityAsset(npc, state), 'npc');
}

function effectPortrait(effect: ActionEffect, state: GameState): string {
  if (effect.kind === 'dialogue') return speakerPortrait(effect.speaker, state);
  if (effect.kind === 'enemyDefeated')
    return renderPortrait(
      entityAsset(findEntityById(effect.enemyId), state),
      'defeated',
    );
  return '';
}

// A refused input while the prompt is open (blockedHtml) renders inside the
// card, so the message box keeps its height.
function renderEncounter(
  pending: PendingInteraction,
  state: GameState,
  blockedHtml: string,
): string {
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
      ${blockedHtml}
    </div>
    <div class="encounter-actions">
      <button type="button" class="button button-fight" data-action="fight" aria-keyshortcuts="Enter">${ICONS.sword}Fight <kbd aria-hidden="true">Enter</kbd></button>
      <button type="button" class="button" data-action="cancel" aria-keyshortcuts="Escape">Cancel <kbd aria-hidden="true">Esc</kbd></button>
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
  if (pending) return renderEncounter(pending, state, blockedHtml);
  if (blocked) return blockedHtml;
  const message = effect && effectMessage(effect);
  if (effect && message) {
    return `<div class="message" data-testid="effect" data-effect="${effect.kind}"${
      effect.kind === 'dialogue' ? ` data-line="${effect.lineId}"` : ''
    }>${effectPortrait(effect, state)}<div class="message-body"><span class="message-tag">${message.tag}</span><p class="message-text">${message.text}</p></div></div>`;
  }
  return `<p class="log-hint"><span class="keys"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></span> Explore. Walk into anything to interact with it.</p>`;
}

const SCROLLING_PANELS = ['[data-testid="journal"]', '.places'] as const;

export class InteractionOverlay {
  constructor(
    private readonly root: HTMLElement,
    private readonly onFight: () => void,
    private readonly onCancel: () => void,
  ) {}

  render(view: OverlayView): void {
    const { state, mapName, journal } = view;
    // Every render replaces the panels, so keep their scroll positions.
    const scrollTops = SCROLLING_PANELS.map(
      (selector) => this.root.querySelector(selector)?.scrollTop ?? 0,
    );
    this.root.innerHTML = `
      <aside class="sidebar">
        ${renderStatus(state)}
        ${renderItems(state)}
        ${renderHowToPlay(state)}
        ${renderPlaces(journal)}
      </aside>
      ${renderLocation(state, mapName)}
      <section class="panel log" data-testid="interaction" aria-label="Messages"><div class="log-body">${renderMessage(view)}</div></section>
      ${renderJournal(journal)}`;
    SCROLLING_PANELS.forEach((selector, index) => {
      const panel = this.root.querySelector(selector);
      if (panel) panel.scrollTop = scrollTops[index] ?? 0;
    });
    this.root
      .querySelector<HTMLButtonElement>('[data-action="fight"]')
      ?.addEventListener('click', () => this.onFight());
    this.root
      .querySelector<HTMLButtonElement>('[data-action="cancel"]')
      ?.addEventListener('click', () => this.onCancel());
  }

  renderInvalidSave(onReset: () => void): void {
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
