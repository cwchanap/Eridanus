import { describe, expect, it } from 'vitest';
import { findEntityById } from './content';
import { createInitialGameState } from './state';
import { attemptMove } from './movement';
import { interactWithEntity } from './actions';
import { loadGame } from './save';
import { buildJournalView } from './journal';
import type { GameState } from './types';
import type { LeadId } from './journal';

function main(
  overrides: Partial<
    Pick<
      GameState,
      'factIds' | 'itemIds' | 'defeatedEnemyIds' | 'openedRewardIds'
    >
  >,
): LeadId {
  return buildJournalView({ ...createInitialGameState(), ...overrides }).main
    .lead;
}

const warden = findEntityById('village-warden');
if (!warden || warden.kind !== 'npc') throw new Error('village-warden missing');

describe('restoration ending', () => {
  it('persists the ending fact and completes the main lead after a reload', () => {
    const state = {
      ...createInitialGameState(),
      defeatedEnemyIds: ['floor3-core-guardian'],
      openedRewardIds: ['floor3-restoration-core'],
      itemIds: ['tower-restoration-core'],
    };
    const ending = interactWithEntity(state, warden, warden.tile);
    expect(ending.ok).toBe(true);
    if (!ending.ok) return;
    expect(ending.effect).toEqual({
      kind: 'dialogue',
      speaker: warden.name,
      lineId: 'warden-restoration-ending',
    });
    expect(
      ending.state.factIds.filter((id) => id === 'main-village-restored'),
    ).toHaveLength(1);

    const storage: Storage = {
      getItem: () => JSON.stringify(ending.state),
      setItem() {},
      removeItem() {},
      clear() {},
      key: () => null,
      get length() {
        return 0;
      },
    };
    const reloaded = loadGame(storage);
    expect(reloaded).toEqual({ kind: 'loaded', state: ending.state });
    if (reloaded.kind !== 'loaded') return;
    expect(reloaded.state.factIds).toContain('main-village-restored');
    expect(buildJournalView(reloaded.state).main.lead).toBe('story-complete');
  });

  it('adds no second ending flag when the final record precedes the warden', () => {
    const state = {
      ...createInitialGameState(),
      defeatedEnemyIds: ['floor3-core-guardian'],
      openedRewardIds: ['floor3-restoration-core'],
      itemIds: ['tower-restoration-core'],
      factIds: ['floor3-keeper-final-record-read'],
    };
    const ending = interactWithEntity(state, warden, warden.tile);
    expect(ending.ok).toBe(true);
    if (!ending.ok) return;
    expect(ending.effect).toMatchObject({
      lineId: 'warden-restoration-ending-ledger',
    });
    expect(ending.state.factIds).toEqual([
      'floor3-keeper-final-record-read',
      'main-missing-person-lead',
      'main-village-restored',
    ]);
  });

  it('resolves the ledger lead when the final record is read before the scribe intro', () => {
    const before = {
      ...createInitialGameState(),
      factIds: ['floor3-keeper-final-record-read'],
    };
    expect(buildJournalView(before).optional).toEqual([]);

    const after = {
      ...before,
      factIds: ['floor3-keeper-final-record-read', 'optional-ledger-lead'],
    };
    expect(
      buildJournalView(after).optional.find((entry) => entry.id === 'ledger')
        ?.lead,
    ).toBe('ledger-resolved');
  });
});

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

  it('keeps the earlier main lead when depth facts exist without the sigil', () => {
    expect(
      buildJournalView({
        ...createInitialGameState(),
        factIds: ['main-missing-person-lead', 'floor1-depth-stairs-used'],
      }).main.lead,
    ).toBe('find-sigil');
  });

  it('requires the used depth stair with the carried sigil to select search-floor2', () => {
    expect(
      buildJournalView({
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil'],
      }).main.lead,
    ).toBe('descend');
    expect(
      buildJournalView({
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil'],
        factIds: ['floor1-depth-stairs-used'],
      }).main.lead,
    ).toBe('search-floor2');
  });

  it('advances the main lead to investigate-deeper once the subject returns', () => {
    expect(
      buildJournalView({
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil'],
        factIds: ['floor1-depth-stairs-used', 'main-subject-returned'],
      }).main.lead,
    ).toBe('investigate-deeper');
  });

  it('advances the heirloom lead through the return stair and the opened reward', () => {
    expect(
      buildJournalView({
        ...createInitialGameState(),
        factIds: ['optional-heirloom-lead', 'floor1-treasury-return-used'],
      }).optional.find((candidate) => candidate.id === 'heirloom')?.lead,
    ).toBe('heirloom-claim-treasury');
    expect(
      buildJournalView({
        ...createInitialGameState(),
        factIds: ['optional-heirloom-lead', 'floor1-treasury-return-used'],
        openedRewardIds: ['floor1-future-treasury'],
      }).optional.find((candidate) => candidate.id === 'heirloom')?.lead,
    ).toBe('heirloom-resolved');
  });

  it('resolves the route lead from the return stair fact', () => {
    expect(
      buildJournalView({
        ...createInitialGameState(),
        factIds: [
          'optional-route-lead',
          'floor1-route-mark-seen',
          'floor1-treasury-return-used',
        ],
      }).optional.find((candidate) => candidate.id === 'route')?.lead,
    ).toBe('route-resolved');
  });

  it('advances the ledger lead after the Floor 2 paired-release evidence', () => {
    expect(
      buildJournalView({
        ...createInitialGameState(),
        factIds: ['optional-ledger-lead', 'floor2-paired-release-ledger-read'],
        itemIds: ['ledger-fragment-1'],
      }).optional.find((candidate) => candidate.id === 'ledger')?.lead,
    ).toBe('ledger-follow-deeper-record');
  });

  it('reflects the treasury traversal and reward in the heirloom and route leads immediately', () => {
    const start = {
      ...createInitialGameState(),
      mapId: 'floor2' as const,
      tile: { x: 4, y: 3 },
      factIds: ['optional-heirloom-lead', 'optional-route-lead'],
    };
    const traveled = attemptMove(start, 'north');
    expect(traveled.ok).toBe(true);
    if (!traveled.ok) return;
    const view = buildJournalView(traveled.state);
    expect(view.optional.find((entry) => entry.id === 'heirloom')?.lead).toBe(
      'heirloom-claim-treasury',
    );
    expect(view.optional.find((entry) => entry.id === 'route')?.lead).toBe(
      'route-resolved',
    );

    const rewarded = attemptMove(traveled.state, 'west');
    expect(rewarded.ok).toBe(true);
    if (!rewarded.ok) return;
    expect(
      buildJournalView(rewarded.state).optional.find(
        (entry) => entry.id === 'heirloom',
      )?.lead,
    ).toBe('heirloom-resolved');
  });

  it('pins the final-story main precedence above the earlier leads', () => {
    expect(main({ factIds: ['main-subject-returned'] })).toBe(
      'investigate-deeper',
    );
    expect(
      main({ factIds: ['main-subject-returned', 'floor2-depth-stairs-used'] }),
    ).toBe('reach-heart-chamber');
    expect(
      main({
        factIds: ['main-subject-returned', 'floor2-depth-stairs-used'],
        defeatedEnemyIds: ['floor3-core-guardian'],
      }),
    ).toBe('claim-restoration-core');
    expect(main({ itemIds: ['tower-restoration-core'] })).toBe(
      'return-restoration-core',
    );
    expect(
      main({
        itemIds: ['tower-restoration-core'],
        factIds: ['main-village-restored'],
      }),
    ).toBe('story-complete');
  });

  it('resolves the ledger lead from the final record regardless of evidence order', () => {
    const early = {
      ...createInitialGameState(),
      factIds: [
        'floor2-paired-release-ledger-read',
        'floor3-keeper-final-record-read',
        'optional-ledger-lead',
      ],
      itemIds: ['ledger-fragment-1'],
    };
    const late = {
      ...createInitialGameState(),
      factIds: ['optional-ledger-lead', 'floor3-keeper-final-record-read'],
    };
    expect(
      buildJournalView(early).optional.find((c) => c.id === 'ledger')?.lead,
    ).toBe('ledger-resolved');
    expect(
      buildJournalView(late).optional.find((c) => c.id === 'ledger')?.lead,
    ).toBe('ledger-resolved');
  });

  it('advances optional leads even when discoveries precede their intro facts', () => {
    const view = buildJournalView({
      ...createInitialGameState(),
      factIds: [
        'floor1-treasury-return-used',
        'floor2-paired-release-ledger-read',
        'optional-heirloom-lead',
        'optional-route-lead',
        'optional-ledger-lead',
      ],
      openedRewardIds: ['floor1-future-treasury'],
    });
    expect(view.optional.find((c) => c.id === 'heirloom')?.lead).toBe(
      'heirloom-resolved',
    );
    expect(view.optional.find((c) => c.id === 'route')?.lead).toBe(
      'route-resolved',
    );
    expect(view.optional.find((c) => c.id === 'ledger')?.lead).toBe(
      'ledger-follow-deeper-record',
    );
  });
});
