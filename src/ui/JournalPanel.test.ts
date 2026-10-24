import { describe, expect, it } from 'vitest';
import { renderJournal } from './JournalPanel';
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

describe('renderJournal', () => {
  it('renders the stable markup contract for a literal view', () => {
    const html = renderJournal(view, m);
    expect(html).toContain('data-testid="journal"');
    expect(html).toContain('data-lead="seek-warden"');
    expect(html).toContain('data-lead="heirloom-find-other-entrance"');
    expect(html).toContain('data-note="floor1-treasury-sealed"');
  });

  it('marks only resolved leads as resolved', () => {
    const html = renderJournal(view, m);
    expect(html).toContain('data-lead="route-resolved" data-resolved');
    expect(html).not.toContain(
      'data-lead="heirloom-find-other-entrance" data-resolved',
    );
  });

  it('leaves out empty side-lead and note groups', () => {
    const html = renderJournal(
      {
        ...view,
        optional: [],
        observationFactIds: [],
      },
      m,
    );
    expect(html).not.toContain(m.ui.sideLeads);
    expect(html).not.toContain(m.ui.notes);
  });

  it('lists every discovered section under places found', () => {
    expect(renderJournal(view, m)).toContain(
      'data-section="floor1-upper-gallery"',
    );
  });

  it('folds down to its title bar and toggle when closed', () => {
    const html = renderJournal(view, m, { open: false });
    expect(html).toContain('data-testid="journal"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-lead=');
    expect(html).not.toContain('data-section=');
  });

  it('labels the sound toggle from the mute preference', () => {
    expect(renderJournal(view, m)).toContain('data-muted="false"');
    expect(renderJournal(view, m, { muted: true })).toContain(
      'data-muted="true"',
    );
  });

  it('shows the current language on the button that cycles it', () => {
    const html = renderJournal(view, m, { locale: 'ja' });
    expect(html).toContain('data-action="next-locale" data-locale="ja"');
    expect(html).toContain('aria-label="Language: 日本語"');
    expect(renderJournal(view, m)).toContain('data-locale="en"');
  });

  it('writes the journal in the chosen language', () => {
    const html = renderJournal(view, MESSAGES['zh-Hant'], {
      locale: 'zh-Hant',
    });
    expect(html).toContain(MESSAGES['zh-Hant'].leads['seek-warden']);
    expect(html).toContain(
      MESSAGES['zh-Hant'].sections['floor1-upper-gallery'],
    );
    expect(html).toContain('data-lead="seek-warden"');
  });
});
