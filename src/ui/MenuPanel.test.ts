import { describe, expect, it } from 'vitest';
import { buildJournalView } from '../game/journal';
import { createInitialGameState } from '../game/state';
import { MESSAGES } from '../i18n/messages';
import { renderMenu, type MenuPrefs } from './MenuPanel';

const m = MESSAGES.en;
const state = createInitialGameState();
const journal = buildJournalView(state);
const prefs: MenuPrefs = {
  open: true,
  tab: 'quests',
  muted: false,
  locale: 'en',
};

describe('renderMenu', () => {
  it('keeps every tab in the page and shows only the chosen one', () => {
    const html = renderMenu(state, journal, m, prefs);
    expect(html).toContain(
      'data-panel="hero" aria-labelledby="menu-tab-hero" hidden',
    );
    expect(html).toContain(
      'data-panel="notes" aria-labelledby="menu-tab-notes" hidden',
    );
    expect(html).toContain(
      'data-panel="quests" aria-labelledby="menu-tab-quests">',
    );
    expect(html).toContain('data-tab="quests" aria-selected="true"');
  });

  it('stays in the page, hidden, while closed', () => {
    const html = renderMenu(state, journal, m, { ...prefs, open: false });
    expect(html).toContain('data-testid="menu" data-open="false"');
    expect(html).toContain('data-lead="seek-warden"');
  });

  it('labels the sound toggle from the mute preference', () => {
    expect(renderMenu(state, journal, m, prefs)).toContain(
      'data-muted="false"',
    );
    expect(renderMenu(state, journal, m, { ...prefs, muted: true })).toContain(
      'data-muted="true"',
    );
  });

  it('shows the current language on the button that cycles it', () => {
    const html = renderMenu(state, journal, MESSAGES.ja, {
      ...prefs,
      locale: 'ja',
    });
    expect(html).toContain('data-action="next-locale" data-locale="ja"');
    expect(html).toContain(`aria-label="${MESSAGES.ja.ui.language}: 日本語"`);
  });
});
