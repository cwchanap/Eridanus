import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { buildJournalView } from './journal';

describe('buildJournalView', () => {
  it('keeps optional quests hidden until context is learned', () => {
    const state = {
      ...createInitialGameState(),
      factIds: ['floor1-treasury-seen'],
    };
    expect(buildJournalView(state).optional).toEqual([]);
  });

  it('selects the stronger heirloom lead after the sealed approach is known', () => {
    const state = {
      ...createInitialGameState(),
      factIds: [
        'floor1-treasury-seen',
        'floor1-treasury-sealed',
        'optional-heirloom-lead',
      ],
    };
    const entry = buildJournalView(state).optional.find(
      (candidate) => candidate.id === 'heirloom',
    );
    expect(entry?.lead).toBe('heirloom-find-other-entrance');
  });

  it('selects only registered note facts as observations', () => {
    const state = {
      ...createInitialGameState(),
      factIds: ['main-missing-person-lead', 'floor1-treasury-seen'],
    };
    expect(buildJournalView(state).observationFactIds).toEqual([
      'floor1-treasury-seen',
    ]);
  });
});
