import { describe, expect, it } from 'vitest';
import { renderJournal } from './JournalPanel';
import type { JournalView } from '../game/journal';

const view: JournalView = {
  main: { id: 'main', lead: 'seek-warden' },
  optional: [{ id: 'heirloom', lead: 'heirloom-find-other-entrance' }],
  sections: [{ id: 'floor1-upper-gallery', name: 'Upper Gallery' }],
  observationFactIds: ['floor1-treasury-sealed'],
};

describe('renderJournal', () => {
  it('renders the stable markup contract for a literal view', () => {
    const html = renderJournal(view);
    expect(html).toContain('data-testid="journal"');
    expect(html).toContain('data-lead="heirloom-find-other-entrance"');
    expect(html).toContain('data-section="floor1-upper-gallery"');
    expect(html).toContain('data-note="floor1-treasury-sealed"');
  });
});
