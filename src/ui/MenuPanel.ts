import type { JournalView } from '../game/journal';
import type { GameState } from '../game/types';
import { LOCALE_CODES, LOCALE_NAMES, type Locale } from '../i18n/locale';
import type { Messages } from '../i18n/messages';
import { ICONS } from './icons';
import { renderItems } from './ItemsPanel';
import { renderNotes, renderQuests } from './JournalPanel';
import { renderHeroSheet } from './StatusPanel';

export const MENU_TABS = ['hero', 'items', 'quests', 'notes'] as const;
export type MenuTab = (typeof MENU_TABS)[number];

// The overlay's own view preferences, never saved with the run: whether the
// menu is open and on which tab, whether sound is muted, and the language.
export type MenuPrefs = Readonly<{
  open: boolean;
  tab: MenuTab;
  muted: boolean;
  locale: Locale;
}>;

function tabLabel(tab: MenuTab, m: Messages): string {
  switch (tab) {
    case 'hero':
      return m.ui.hero;
    case 'items':
      return m.ui.items;
    case 'quests':
      return m.ui.quests;
    case 'notes':
      return m.ui.notes;
  }
}

function tabBody(
  tab: MenuTab,
  state: GameState,
  journal: JournalView,
  m: Messages,
): string {
  switch (tab) {
    case 'hero':
      return renderHeroSheet(state, m);
    case 'items':
      return renderItems(state, m);
    case 'quests':
      return renderQuests(journal, m);
    case 'notes':
      return renderNotes(journal, m);
  }
}

// One button that steps through the languages, read as the language the
// page is in now.
function renderLanguageButton(m: Messages, locale: Locale): string {
  const label = `${m.ui.language}: ${LOCALE_NAMES[locale]}`;
  return `<button type="button" class="chip-button" data-action="next-locale" data-locale="${locale}" aria-label="${label}" title="${label}"><span lang="${locale}">${LOCALE_CODES[locale]}</span></button>`;
}

// Every tab is always in the page, the closed menu and the tabs not on show
// merely hidden, so the e2e journeys can count leads, notes and items
// without opening it.
export function renderMenu(
  state: GameState,
  journal: JournalView,
  m: Messages,
  { open, tab, muted, locale }: MenuPrefs,
): string {
  const tabs = MENU_TABS.map(
    (id) =>
      `<button type="button" role="tab" class="menu-tab" id="menu-tab-${id}" data-action="menu-tab" data-tab="${id}" aria-selected="${id === tab}" aria-controls="menu-panel-${id}" tabindex="${id === tab ? 0 : -1}">${tabLabel(id, m)}</button>`,
  ).join('');
  const panels = MENU_TABS.map(
    (id) =>
      `<div role="tabpanel" class="menu-panel" id="menu-panel-${id}" data-panel="${id}" aria-labelledby="menu-tab-${id}"${id === tab ? '' : ' hidden'}>${tabBody(id, state, journal, m)}</div>`,
  ).join('');
  const soundLabel = muted ? m.ui.unmute : m.ui.mute;
  return `<div class="menu-backdrop" data-testid="menu" data-open="${open}" data-tab="${tab}"${open ? '' : ' hidden'}>
    <section class="panel menu" role="dialog" aria-modal="true" aria-label="${m.ui.menu}">
      <div class="menu-head">
        <div class="menu-tabs" role="tablist">${tabs}</div>
        <button type="button" class="chip-button" data-action="close-menu" aria-label="${m.ui.closeMenu}" aria-keyshortcuts="Escape"><kbd aria-hidden="true">Esc</kbd></button>
      </div>
      <div class="menu-body">${panels}</div>
      <div class="menu-foot">
        ${renderLanguageButton(m, locale)}
        <button type="button" class="chip-button" data-action="toggle-sound" data-muted="${muted}" aria-label="${soundLabel}" title="${soundLabel}" aria-keyshortcuts="M">${muted ? ICONS.muted : ICONS.sound}<kbd aria-hidden="true">M</kbd></button>
      </div>
    </section>
  </div>`;
}
