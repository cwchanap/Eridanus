import { describe, expect, it } from 'vitest';
import { resolveNpcInteraction } from './dialogue';
import { createInitialGameState } from './state';

describe('resolveNpcInteraction', () => {
  it('leads with the main hook until the depth sigil is found', () => {
    expect(
      resolveNpcInteraction('village-warden', createInitialGameState()),
    ).toEqual({ lineId: 'warden-main-lead' });
    expect(
      resolveNpcInteraction('village-warden', {
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil'],
      }),
    ).toEqual({ lineId: 'warden-sigil-found' });
  });

  it('advances the artisan line as treasury facts are learned', () => {
    expect(
      resolveNpcInteraction('village-artisan', createInitialGameState()),
    ).toEqual({ lineId: 'artisan-find-workshop' });
    expect(
      resolveNpcInteraction('village-artisan', {
        ...createInitialGameState(),
        factIds: ['floor1-treasury-seen'],
      }),
    ).toEqual({ lineId: 'artisan-workshop-seen' });
    expect(
      resolveNpcInteraction('village-artisan', {
        ...createInitialGameState(),
        factIds: ['floor1-treasury-sealed', 'optional-heirloom-lead'],
      }),
    ).toEqual({ lineId: 'artisan-find-other-entrance' });
  });

  it('advances the scout line once route marks are seen', () => {
    expect(
      resolveNpcInteraction('village-scout', createInitialGameState()),
    ).toEqual({ lineId: 'scout-find-marks' });
    expect(
      resolveNpcInteraction('village-scout', {
        ...createInitialGameState(),
        factIds: ['floor1-route-mark-seen'],
      }),
    ).toEqual({ lineId: 'scout-marks-seen' });
  });

  it('advances the scribe line once a ledger fragment is held', () => {
    expect(
      resolveNpcInteraction('village-scribe', createInitialGameState()),
    ).toEqual({ lineId: 'scribe-find-ledger' });
    expect(
      resolveNpcInteraction('village-scribe', {
        ...createInitialGameState(),
        itemIds: ['ledger-fragment-1'],
        factIds: ['optional-ledger-lead'],
      }),
    ).toEqual({ lineId: 'scribe-fragment-found' });
  });

  it('acknowledges the returned subject before the sigil lead', () => {
    expect(
      resolveNpcInteraction('village-warden', {
        ...createInitialGameState(),
        factIds: ['main-subject-returned'],
        itemIds: ['tower-depth-sigil'],
      }),
    ).toEqual({ lineId: 'warden-subject-returned' });
  });

  it('acknowledges the treasury route and later the opened treasury reward', () => {
    expect(
      resolveNpcInteraction('village-artisan', {
        ...createInitialGameState(),
        factIds: ['floor1-treasury-return-used'],
      }),
    ).toEqual({ lineId: 'artisan-treasury-route-found' });
    expect(
      resolveNpcInteraction('village-artisan', {
        ...createInitialGameState(),
        factIds: ['floor1-treasury-return-used'],
        openedRewardIds: ['floor1-future-treasury'],
      }),
    ).toEqual({ lineId: 'artisan-heirloom-recovered' });
  });

  it('resolves the lost-route thread once the return stair is used', () => {
    expect(
      resolveNpcInteraction('village-scout', {
        ...createInitialGameState(),
        factIds: ['floor1-route-mark-seen', 'floor1-treasury-return-used'],
      }),
    ).toEqual({ lineId: 'scout-route-verified' });
  });

  it('advances the scribe line after the Floor 2 ledger evidence', () => {
    expect(
      resolveNpcInteraction('village-scribe', {
        ...createInitialGameState(),
        factIds: ['optional-ledger-lead', 'floor2-paired-release-ledger-read'],
        itemIds: ['ledger-fragment-1'],
      }),
    ).toEqual({ lineId: 'scribe-floor2-ledger-read' });
  });

  it('returns the restoration ending once the core is carried, recording the outcome fact', () => {
    const coreState = {
      ...createInitialGameState(),
      itemIds: ['tower-restoration-core'],
    };

    expect(resolveNpcInteraction('village-warden', coreState)).toEqual({
      lineId: 'warden-restoration-ending',
      factId: 'main-village-restored',
    });

    expect(
      resolveNpcInteraction('village-warden', {
        ...coreState,
        factIds: ['floor3-keeper-final-record-read'],
      }),
    ).toEqual({
      lineId: 'warden-restoration-ending-ledger',
      factId: 'main-village-restored',
    });
  });

  it('reads the scribe final-ledger line once the final keeper record is known', () => {
    expect(
      resolveNpcInteraction('village-scribe', {
        ...createInitialGameState(),
        factIds: ['optional-ledger-lead', 'floor3-keeper-final-record-read'],
        itemIds: ['ledger-fragment-1'],
      }),
    ).toEqual({ lineId: 'scribe-final-ledger-read' });
  });

  it('selects the subject lines by NPC id regardless of the return fact', () => {
    expect(
      resolveNpcInteraction('floor2-missing-subject', createInitialGameState()),
    ).toEqual({ lineId: 'subject-returning' });
    expect(
      resolveNpcInteraction('floor2-missing-subject', {
        ...createInitialGameState(),
        factIds: ['main-subject-returned'],
      }),
    ).toEqual({ lineId: 'subject-returning' });
    expect(
      resolveNpcInteraction(
        'village-returned-subject',
        createInitialGameState(),
      ),
    ).toEqual({ lineId: 'subject-village' });
    expect(
      resolveNpcInteraction('village-returned-subject', {
        ...createInitialGameState(),
        factIds: ['main-subject-returned'],
      }),
    ).toEqual({ lineId: 'subject-village' });
  });
});
