import type { Blow } from '../game/combat';
import type {
  ActionEffect,
  BlockedReason,
  Entity,
  GameState,
  MapSection,
  PendingInteraction,
} from '../game/types';
import { findEntityById, findSectionsAt } from '../game/content';
import { equippedWares } from '../game/equipment';
import { tradePrice } from '../game/shop';
import type { JournalView } from '../game/journal';
import { nextLocale, type Locale } from '../i18n/locale';
import { MESSAGES, pick, type Messages } from '../i18n/messages';
import {
  PORTRAIT_SIZE,
  resolveEntityAsset,
  resolvePortraitPath,
  type AssetKey,
} from '../phaser/assets';
import { keyDirection } from '../phaser/keys';
import { renderHowToPlay } from './HowToPlay';
import { ICONS } from './icons';
import { renderQuestTracker } from './JournalPanel';
import { MENU_TABS, renderMenu, type MenuTab } from './MenuPanel';
import { renderStatus } from './StatusPanel';

export type OverlayView = Readonly<{
  state: GameState;
  locale: Locale;
  pending: PendingInteraction | null;
  effect: ActionEffect | null;
  blocked: BlockedReason | null;
  journal: JournalView;
  // The blow a playing battle is showing (main.ts), in place of any prompt
  // or message.
  battle: BattleView | null;
}>;

// The blow on show, and the enemy's HP as of the last blow to land.
export type BattleView = Readonly<{
  enemyId: string;
  blow: Blow;
  enemyHp: number;
}>;

type Message = Readonly<{ tag: string; text: string }>;
type CombatPending = Extract<PendingInteraction, { kind: 'combat' }>;
type PurchasePending = Extract<PendingInteraction, { kind: 'purchase' }>;
type TradePending = Extract<PendingInteraction, { kind: 'trade' }>;

function effectMessage(effect: ActionEffect, m: Messages): Message | null {
  switch (effect.kind) {
    case 'moved':
    case 'traveled':
    case 'combatPrompt':
    case 'purchasePrompt':
    case 'tradePrompt':
      return null;
    case 'clue':
      return { tag: m.tags.clue, text: pick(m.clues, effect.clueId) };
    case 'reward':
      return {
        tag: m.tags.powerUp,
        text: m.effects.statUp(m.statNames[effect.stat], effect.amount),
      };
    case 'latchOpened':
      return { tag: m.tags.shortcut, text: m.effects.latchOpened };
    case 'latchGuarded':
      return {
        tag: m.tags.sealed,
        text: m.effects.latchGuarded(effect.remaining),
      };
    case 'latchWired':
      return {
        tag: m.tags.sealed,
        text: m.effects.latchWired(effect.thrown, effect.total),
      };
    case 'leverPulled':
      return {
        tag: m.tags.lever,
        text: m.effects.leverPulled(effect.thrown, effect.linked),
      };
    case 'enemyDefeated':
      return {
        tag: m.tags.victory,
        text: m.effects.victory(effect.hpLost, effect.gold),
      };
    case 'purchased':
      return {
        tag: m.tags.purchased,
        text: m.effects.purchased(
          pick(m.items, effect.ware.itemId),
          m.statNames[effect.ware.stat],
          effect.ware.amount,
        ),
      };
    case 'traded':
      return {
        tag: m.tags.traded,
        text: m.effects.statUp(
          m.statNames[effect.offer.stat],
          effect.offer.amount,
        ),
      };
    case 'soldOut':
      return { tag: pick(m.shops, effect.shopId), text: m.effects.soldOut };
    case 'dialogue':
      return {
        tag: m.npcs[effect.speakerId],
        text: m.dialogue[effect.lineId],
      };
    case 'itemReward':
      return {
        tag: m.tags.item,
        text: m.effects.obtained(pick(m.items, effect.itemId)),
      };
    case 'accessLocked':
      return { tag: m.tags.sealed, text: pick(m.access, effect.entityId) };
  }
}

// Whether the message box shows a message rather than nothing, so
// Enter/Escape (or its close button) has something to close.
export function showsMessage(
  effect: ActionEffect | null,
  blocked: BlockedReason | null,
  m: Messages,
): boolean {
  return (
    blocked !== null || (effect !== null && effectMessage(effect, m) !== null)
  );
}

// Sits on the box's top-right border, opposite the nameplate tag.
function closeButton(m: Messages): string {
  return `<button type="button" class="message-close" data-action="dismiss" aria-label="${m.ui.closeMessage}" aria-keyshortcuts="Escape Enter"><kbd aria-hidden="true">Esc</kbd></button>`;
}

function boundsArea({ bounds }: MapSection): number {
  return (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
}

function renderLocation(state: GameState, m: Messages): string {
  // Nested sections overlap (a treasury inside its wing), so the tightest
  // bounds name the spot the player actually stands in.
  const [area] = [...findSectionsAt(state.mapId, state.tile)].sort(
    (a, b) => boundsArea(a) - boundsArea(b),
  );
  return `<header class="location" aria-label="${m.ui.location}">
    <h2 data-testid="map-name" data-map-id="${state.mapId}">${m.maps[state.mapId]}</h2>
    <p class="location-area">${area ? pick(m.sections, area.id) : ''}</p>
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

function effectPortrait(effect: ActionEffect, state: GameState): string {
  if (effect.kind === 'dialogue')
    return renderPortrait(
      entityAsset(findEntityById(effect.speakerId), state),
      'npc',
    );
  if (effect.kind === 'soldOut')
    return renderPortrait(
      entityAsset(findEntityById(effect.shopId), state),
      'npc',
    );
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
function renderEncounter(
  pending: CombatPending,
  state: GameState,
  m: Messages,
): string {
  const enemy = findEntityById(pending.enemyId);
  const assetKey = entityAsset(enemy, state);
  const portrait = renderPortrait(assetKey, 'enemy');
  const { hp, attack, defense } = m.statLabels;
  const stats =
    enemy?.kind === 'enemy'
      ? `<p class="encounter-stats"><span>${hp} ${enemy.stats.hp}</span><span>${attack} ${enemy.stats.attack}</span><span>${defense} ${enemy.stats.defense}</span></p>`
      : '';
  const name = assetKey ? pick(m.enemies, assetKey, m.ui.enemy) : m.ui.enemy;
  const hpAfter = state.player.hp - pending.preview.hpLoss;
  return `<section class="encounter" data-testid="combat-prompt" aria-label="${m.ui.combat}">
    ${portrait}
    <div class="encounter-info">
      <div class="encounter-head"><span class="message-tag">${name}</span>${stats}</div>
      <p class="encounter-cost"><span data-testid="combat-hp-loss">${m.ui.hpLoss(pending.preview.hpLoss)}</span> <span class="encounter-after">${m.ui.leavesYouAt(hpAfter)}</span></p>
    </div>
    <div class="encounter-actions">
      ${promptButtons(`${ICONS.sword}${m.ui.fight}`, m.ui.cancel)}
    </div>
  </section>`;
}

// The encounter card again while the fight plays: the enemy's HP draining
// blow by blow, and a Skip button where Fight/Cancel were.
function renderBattle(
  battle: BattleView,
  state: GameState,
  m: Messages,
): string {
  const enemy = findEntityById(battle.enemyId);
  const assetKey = entityAsset(enemy, state);
  const name = assetKey ? pick(m.enemies, assetKey, m.ui.enemy) : m.ui.enemy;
  const { blow, enemyHp } = battle;
  const maxHp = enemy?.kind === 'enemy' ? enemy.stats.hp : enemyHp;
  const left = maxHp > 0 ? Math.round((enemyHp / maxHp) * 100) : 0;
  return `<section class="encounter" data-kind="battle" data-testid="battle" aria-label="${m.ui.combat}">
    ${renderPortrait(assetKey, 'enemy')}
    <div class="encounter-info">
      <div class="encounter-head"><span class="message-tag">${name}</span><p class="encounter-stats"><span data-testid="battle-enemy-hp" data-hp="${enemyHp}">${m.statLabels.hp} ${enemyHp}/${maxHp}</span></p></div>
      <div class="battle-bar" aria-hidden="true"><span style="width: ${left}%"></span></div>
      <p class="encounter-cost" data-blow="${blow.by}">${blow.by === 'hero' ? m.ui.youStrike(blow.damage) : m.ui.enemyStrikes(blow.damage)}</p>
    </div>
    <div class="encounter-actions">
      <button type="button" class="button" data-action="skip" aria-keyshortcuts="Enter Escape">${m.ui.skip} <kbd aria-hidden="true">Enter</kbd></button>
    </div>
  </section>`;
}

function cancelButton(label: string): string {
  return `<button type="button" class="button" data-action="cancel" aria-keyshortcuts="Escape">${label} <kbd aria-hidden="true">Esc</kbd></button>`;
}

function promptButtons(confirm: string, cancel: string): string {
  return `<button type="button" class="button button-fight" data-action="confirm" aria-keyshortcuts="Enter">${confirm} <kbd aria-hidden="true">Enter</kbd></button>
      ${cancelButton(cancel)}`;
}

// The shop counter shares the encounter card's frame, so the box keeps its
// size and Buy/Leave sit where Fight/Cancel do.
function renderPurchase(
  pending: PurchasePending,
  state: GameState,
  m: Messages,
): string {
  const shop = findEntityById(pending.shopId);
  const { ware } = pending;
  const short = state.player.gold < ware.price;
  // A ware replaces the one worn in its slot, so show the step up.
  const worn = equippedWares(state.itemIds)[ware.slot];
  const before = worn?.stat === ware.stat ? worn.amount : undefined;
  const from = before === undefined ? '' : `+${before} → `;
  const bonusAttrs = `${before === undefined ? '' : ` data-before="${before}"`} data-after="${ware.amount}"`;
  return `<section class="encounter" data-kind="shop" data-testid="purchase-prompt" aria-label="${m.ui.shop}">
    ${renderPortrait(entityAsset(shop, state), 'npc')}
    <div class="encounter-info">
      <div class="encounter-head"><span class="message-tag">${pick(m.shops, pending.shopId, m.ui.shop)}</span><p class="encounter-stats"><span>${pick(m.items, ware.itemId)}</span><span data-testid="purchase-bonus"${bonusAttrs}>${m.statLabels[ware.stat]} ${from}+${ware.amount}</span></p></div>
      <p class="encounter-cost"><span data-testid="purchase-price">${m.ui.price(ware.price)}</span> <span class="encounter-after">${
        short
          ? m.ui.youHave(state.player.gold)
          : m.ui.leavesYou(state.player.gold - ware.price)
      }</span></p>
    </div>
    <div class="encounter-actions">
      ${promptButtons(`${ICONS.coin}${m.ui.buy}`, m.ui.leave)}
    </div>
  </section>`;
}

// The trader's card is the shop's, with one Buy button per offer (keys 1, 2,
// 3) in place of Buy; they all cost the same, so the price sits once above
// them and the buttons say only what they add. Leave joins them in one row
// rather than a column of its own, which a narrow card has no width for.
function renderTrade(
  pending: TradePending,
  state: GameState,
  m: Messages,
): string {
  const trader = findEntityById(pending.traderId);
  if (trader?.kind !== 'trader') return '';
  const price = tradePrice(trader, state);
  const { gold } = state.player;
  const choices = trader.offers
    .map((offer, index) => {
      const key = index + 1;
      return `<button type="button" class="button button-fight" data-action="choose" data-index="${index}" data-stat="${offer.stat}" aria-keyshortcuts="${key}">${ICONS.coin}${m.statLabels[offer.stat]} +${offer.amount} <kbd aria-hidden="true">${key}</kbd></button>`;
    })
    .join('');
  return `<section class="encounter" data-kind="shop" data-testid="trade-prompt" aria-label="${m.ui.trade}">
    ${renderPortrait(entityAsset(trader, state), 'npc')}
    <div class="encounter-info">
      <div class="encounter-head"><span class="message-tag">${pick(m.shops, pending.traderId, m.ui.shop)}</span></div>
      <p class="encounter-cost"><span data-testid="trade-price">${m.ui.price(price)}</span> <span class="encounter-after">${
        gold < price ? m.ui.youHave(gold) : m.ui.leavesYou(gold - price)
      }</span></p>
      <div class="encounter-choices">${choices}${cancelButton(m.ui.leave)}</div>
    </div>
  </section>`;
}

function renderPrompt(
  pending: PendingInteraction,
  state: GameState,
  m: Messages,
): string {
  switch (pending.kind) {
    case 'combat':
      return renderEncounter(pending, state, m);
    case 'purchase':
      return renderPurchase(pending, state, m);
    case 'trade':
      return renderTrade(pending, state, m);
  }
}

function renderMessage(view: OverlayView, m: Messages): string {
  const { state, pending, effect, blocked, battle } = view;
  if (battle) return renderBattle(battle, state, m);
  const blockedHtml = blocked
    ? `<div class="message message-blocked" data-testid="blocked-reason" data-reason="${blocked}"><p class="message-text">${m.reasons[blocked]}</p></div>`
    : '';
  // prompt must stay reachable (Fight/Cancel clickable) even while blocked,
  // or a failed input while pending soft-locks the interaction
  if (pending) return renderPrompt(pending, state, m) + blockedHtml;
  if (blocked) return blockedHtml + closeButton(m);
  const message = effect && effectMessage(effect, m);
  if (effect && message) {
    return `<div class="message" data-testid="effect" data-effect="${effect.kind}"${effectAttributes(effect)}>${effectPortrait(effect, state)}<div class="message-body"><span class="message-tag">${message.tag}</span><p class="message-text">${message.text}</p></div></div>${closeButton(m)}`;
  }
  return '';
}

// Stable attributes the e2e journeys read back instead of authored prose.
function effectAttributes(effect: ActionEffect): string {
  if (effect.kind === 'dialogue') return ` data-line="${effect.lineId}"`;
  if (effect.kind === 'latchGuarded')
    return ` data-remaining="${effect.remaining}"`;
  if (effect.kind === 'latchWired')
    return ` data-thrown="${effect.thrown}" data-total="${effect.total}"`;
  if (effect.kind === 'leverPulled') return ` data-thrown="${effect.thrown}"`;
  return '';
}

const SCROLLING_PANELS = ['.menu-body', '.hud-left'] as const;

export type SoundToggle = { readonly muted: boolean; toggleMuted(): void };

export class InteractionOverlay {
  // The menu (open, and on which tab) is a view preference, not game state,
  // so it is never saved. The last view is kept so the menu's keys can
  // re-render on their own.
  private menuOpen = false;
  private menuTab: MenuTab = 'hero';
  private view: OverlayView | null = null;
  // Scroll positions outlive the DOM: every render replaces the panels.
  private readonly scrollTops = new Map<string, number>();

  constructor(
    private readonly root: HTMLElement,
    private readonly onConfirm: () => void,
    private readonly onCancel: () => void,
    private readonly onChoose: (index: number) => void,
    private readonly sound: SoundToggle,
    private readonly onLocaleChange: (locale: Locale) => void,
  ) {
    // Capture runs before the scene's own window listener, so an open menu
    // keeps every key from the map: no step, prompt or skip goes on under it.
    window.addEventListener('keydown', (event) => this.handleKey(event), true);
  }

  private handleKey(event: KeyboardEvent): void {
    // Enter on a focused HUD button (Tab reaches the Menu button) presses
    // that button; the scene would otherwise take it as Fight or Buy.
    const onButton =
      event.target instanceof HTMLButtonElement &&
      this.root.contains(event.target);
    if (this.menuOpen || (onButton && event.key === 'Enter'))
      event.stopPropagation();
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() === 'm') this.toggleSound();
    if (!this.menuOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu();
      return;
    }
    // Left and right (or A and D) step through the tabs.
    const direction = keyDirection(event);
    if (direction === 'west' || direction === 'east') {
      event.preventDefault();
      const step = direction === 'east' ? 1 : MENU_TABS.length - 1;
      const index = MENU_TABS.indexOf(this.menuTab);
      this.showTab(MENU_TABS[(index + step) % MENU_TABS.length]!);
    }
  }

  // Escape opens the menu when nothing else takes it (WorldScene), or its
  // HUD button does.
  openMenu(): void {
    // No view means the invalid-save screen, which has no menu.
    if (!this.view || this.menuOpen) return;
    this.menuOpen = true;
    this.render(this.view);
    this.focusTab();
  }

  private closeMenu(): void {
    if (!this.view) return;
    this.menuOpen = false;
    this.render(this.view);
  }

  private showTab(tab: MenuTab): void {
    if (!this.view) return;
    this.menuTab = tab;
    // A new tab reads from its top: the render keeps the scroll it finds.
    const body = this.root.querySelector('.menu-body');
    if (body) body.scrollTop = 0;
    this.render(this.view);
    this.focusTab();
  }

  private focusTab(): void {
    this.root
      .querySelector<HTMLElement>(
        `[data-action="menu-tab"][aria-selected="true"]`,
      )
      ?.focus();
  }

  private toggleSound(): void {
    if (!this.view) return;
    this.sound.toggleMuted();
    this.render(this.view);
  }

  render(view: OverlayView): void {
    const { state, locale, pending, journal } = view;
    const m = MESSAGES[locale];
    this.view = view;
    // Every render replaces the panels, so keep their scroll positions and,
    // inside the menu, which control had focus.
    for (const selector of SCROLLING_PANELS) {
      const panel = this.root.querySelector(selector);
      if (panel) this.scrollTops.set(selector, panel.scrollTop);
    }
    const focused = menuFocus(this.root);
    const message = renderMessage(view, m);
    // An open menu makes the HUD under it inert, so Tab can't reach a
    // prompt's Fight or Buy button behind it.
    this.root.innerHTML = `
      <div class="hud-layer"${this.menuOpen ? ' inert' : ''}>
        <div class="hud-left">
          ${renderStatus(state, m, pending?.kind === 'combat' ? pending.preview.hpLoss : 0)}
          ${renderHowToPlay(state, m)}
        </div>
        ${renderLocation(state, m)}
        ${renderQuestTracker(journal, m)}
        <section class="panel log" data-testid="interaction" aria-label="${m.ui.messages}"${message ? '' : ' hidden'}><div class="log-body">${message}</div></section>
      </div>
      ${renderMenu(state, journal, m, { open: this.menuOpen, tab: this.menuTab, muted: this.sound.muted, locale })}`;
    for (const selector of SCROLLING_PANELS) {
      const panel = this.root.querySelector(selector);
      if (panel) panel.scrollTop = this.scrollTops.get(selector) ?? 0;
    }
    if (focused) this.root.querySelector<HTMLElement>(focused)?.focus();
    this.root
      .querySelector<HTMLButtonElement>('[data-action="confirm"]')
      ?.addEventListener('click', () => this.onConfirm());
    for (const button of this.root.querySelectorAll<HTMLButtonElement>(
      '[data-action="choose"]',
    ))
      button.addEventListener('click', () =>
        this.onChoose(Number(button.dataset.index)),
      );
    // Closing a message is a cancel with nothing pending, like Escape.
    for (const action of ['cancel', 'dismiss'])
      this.root
        .querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
        ?.addEventListener('click', () => this.onCancel());
    // Skip is a cancel mid-battle. The battle redraws the card every blow,
    // which can swap the button between a press and its release and lose
    // the click, so a pointer skips on press; a keyboard click (detail 0)
    // still counts.
    const skip = this.root.querySelector<HTMLButtonElement>(
      '[data-action="skip"]',
    );
    skip?.addEventListener('pointerdown', (event) => {
      if (event.button === 0) this.onCancel();
    });
    skip?.addEventListener('click', (event) => {
      if (event.detail === 0) this.onCancel();
    });
    this.bindMenu();
  }

  private bindMenu(): void {
    const on = (action: string, handler: (button: HTMLElement) => void) => {
      for (const button of this.root.querySelectorAll<HTMLElement>(
        `[data-action="${action}"]`,
      ))
        button.addEventListener('click', () => handler(button));
    };
    on('open-menu', () => this.openMenu());
    on('close-menu', () => this.closeMenu());
    on('menu-tab', (button) => this.showTab(button.dataset.tab as MenuTab));
    on('toggle-sound', () => this.toggleSound());
    on('next-locale', () => {
      if (this.view) this.onLocaleChange(nextLocale(this.view.locale));
    });
    // A click on the dimmed map around the menu closes it.
    const backdrop = this.root.querySelector<HTMLElement>('.menu-backdrop');
    backdrop?.addEventListener('click', (event) => {
      if (event.target === backdrop) this.closeMenu();
    });
  }

  renderInvalidSave(locale: Locale, onReset: () => void): void {
    const { ui } = MESSAGES[locale];
    this.view = null;
    this.root.innerHTML = `
      <section class="panel invalid-save" data-testid="invalid-save" aria-label="${ui.invalidSave}">
        <h2 class="panel-title">${ui.invalidSaveTitle}</h2>
        <p>${ui.invalidSaveBody}</p>
        <button type="button" class="button button-fight" data-action="reset">${ui.resetSave}</button>
      </section>`;
    this.root
      .querySelector<HTMLButtonElement>('[data-action="reset"]')
      ?.addEventListener('click', () => onReset());
  }
}

// The control inside the menu that has focus, as a selector its
// replacement will match after the next render.
function menuFocus(root: HTMLElement): string | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !active.closest('.menu')) return null;
  if (!root.contains(active) || !active.dataset.action) return null;
  const tab = active.dataset.tab ? `[data-tab="${active.dataset.tab}"]` : '';
  return `[data-action="${active.dataset.action}"]${tab}`;
}
