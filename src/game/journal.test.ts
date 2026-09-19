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

  it('advances the main lead through the warden fact and the carried sigil', () => {
    expect(buildJournalView(createInitialGameState()).main.lead).toBe(
      'seek-warden',
    );
    expect(
      buildJournalView({
        ...createInitialGameState(),
        factIds: ['main-missing-person-lead'],
      }).main.lead,
    ).toBe('find-sigil');
    expect(
      buildJournalView({
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil'],
      }).main.lead,
    ).toBe('descend');
  });

  it('keys the main descend lead on the carried sigil, not depth facts', () => {
    expect(
      buildJournalView({
        ...createInitialGameState(),
        factIds: ['floor1-depth-seal-seen', 'floor1-depth-stairs-used'],
      }).main.lead,
    ).toBe('seek-warden');
    expect(
      buildJournalView({
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil'],
      }).main.lead,
    ).toBe('descend');
  });

  it('keys the ledger later-pages lead on the carried ledger fragment', () => {
    const state = {
      ...createInitialGameState(),
      factIds: ['optional-ledger-lead'],
      itemIds: ['ledger-fragment-1'],
    };
    const entry = buildJournalView(state).optional.find(
      (candidate) => candidate.id === 'ledger',
    );
    expect(entry?.lead).toBe('ledger-find-later-pages');
  });
});
