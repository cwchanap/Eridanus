import { describe, expect, it } from 'vitest';
import { renderJournal } from './JournalPanel';
import type { JournalView } from '../game/journal';

const view: JournalView = {
  main: { id: 'main', lead: 'seek-warden' },
  optional: [
    { id: 'heirloom', lead: 'heirloom-find-other-entrance' },
    { id: 'route', lead: 'route-resolved' },
  ],
  sections: [{ id: 'floor1-upper-gallery', name: 'Upper Gallery' }],
  observationFactIds: ['floor1-treasury-sealed'],
};

describe('renderJournal', () => {
  it('renders the stable markup contract for a literal view', () => {
    const html = renderJournal(view);
    expect(html).toContain('data-testid="journal"');
    expect(html).toContain('data-lead="seek-warden"');
    expect(html).toContain('data-lead="heirloom-find-other-entrance"');
    expect(html).toContain('data-note="floor1-treasury-sealed"');
  });

  it('marks only resolved leads as resolved', () => {
    const html = renderJournal(view);
    expect(html).toContain('data-lead="route-resolved" data-resolved');
    expect(html).not.toContain(
      'data-lead="heirloom-find-other-entrance" data-resolved',
    );
  });

  it('leaves out empty side-lead and note groups', () => {
    const html = renderJournal({
      ...view,
      optional: [],
      observationFactIds: [],
    });
    expect(html).not.toContain('Side leads');
    expect(html).not.toContain('Notes');
  });

  it('lists every discovered section under places found', () => {
    expect(renderJournal(view)).toContain(
      'data-section="floor1-upper-gallery"',
    );
  });

  it('folds down to its title bar and toggle when closed', () => {
    const html = renderJournal(view, false);
    expect(html).toContain('data-testid="journal"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-lead=');
    expect(html).not.toContain('data-section=');
  });
});
