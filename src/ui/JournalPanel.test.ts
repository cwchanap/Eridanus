import { describe, expect, it } from 'vitest';
import { renderNotes, renderQuests, renderQuestTracker } from './JournalPanel';
import type { JournalView } from '../game/journal';
import { MESSAGES } from '../i18n/messages';

const m = MESSAGES.en;

const view: JournalView = {
  main: { id: 'main', lead: 'seek-warden' },
  optional: [
    { id: 'heirloom', lead: 'heirloom-find-other-entrance' },
    { id: 'route', lead: 'route-resolved' },
  ],
  sectionIds: ['floor1-upper-gallery'],
  observationFactIds: ['floor1-treasury-sealed'],
};

describe('renderQuestTracker', () => {
  it('shows only the main quest and the way into the menu', () => {
    const html = renderQuestTracker(view, m);
    expect(html).toContain('data-testid="quest"');
    expect(html).toContain(m.leads['seek-warden']);
    expect(html).toContain('data-action="open-menu"');
    expect(html).not.toContain(m.leads['heirloom-find-other-entrance']);
    // Leads are counted from the menu alone.
    expect(html).not.toContain('data-lead=');
  });

  it('writes the quest in the chosen language', () => {
    const zh = MESSAGES['zh-Hant'];
    expect(renderQuestTracker(view, zh)).toContain(zh.leads['seek-warden']);
  });
});

describe('renderQuests', () => {
  it('lists the main quest and every side lead', () => {
    const html = renderQuests(view, m);
    expect(html).toContain('data-lead="seek-warden"');
    expect(html).toContain('data-lead="heirloom-find-other-entrance"');
  });

  it('marks only resolved leads as resolved', () => {
    const html = renderQuests(view, m);
    expect(html).toContain('data-lead="route-resolved" data-resolved');
    expect(html).not.toContain(
      'data-lead="heirloom-find-other-entrance" data-resolved',
    );
  });

  it('leaves out an empty side-lead group', () => {
    expect(renderQuests({ ...view, optional: [] }, m)).not.toContain(
      m.ui.sideLeads,
    );
  });
});

describe('renderNotes', () => {
  it('lists notes and every discovered section', () => {
    const html = renderNotes(view, m);
    expect(html).toContain('data-note="floor1-treasury-sealed"');
    expect(html).toContain('data-section="floor1-upper-gallery"');
  });

  it('says so when nothing is noted yet', () => {
    const html = renderNotes({ ...view, observationFactIds: [] }, m);
    expect(html).toContain(m.ui.noNotes);
    expect(html).not.toContain('data-note=');
  });
});
