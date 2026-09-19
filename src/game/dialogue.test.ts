import { describe, expect, it } from 'vitest';
import { resolveNpcDialogue } from './dialogue';
import { createInitialGameState } from './state';

describe('resolveNpcDialogue', () => {
  it('leads with the main hook until the depth sigil is found', () => {
    expect(resolveNpcDialogue('village-warden', createInitialGameState())).toBe(
      'warden-main-lead',
    );
    expect(
      resolveNpcDialogue('village-warden', {
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil'],
      }),
    ).toBe('warden-sigil-found');
  });

  it('advances the artisan line as treasury facts are learned', () => {
    expect(
      resolveNpcDialogue('village-artisan', createInitialGameState()),
    ).toBe('artisan-find-workshop');
    expect(
      resolveNpcDialogue('village-artisan', {
        ...createInitialGameState(),
        factIds: ['floor1-treasury-seen'],
      }),
    ).toBe('artisan-workshop-seen');
    expect(
      resolveNpcDialogue('village-artisan', {
        ...createInitialGameState(),
        factIds: ['floor1-treasury-sealed', 'optional-heirloom-lead'],
      }),
    ).toBe('artisan-find-other-entrance');
  });

  it('advances the scout line once route marks are seen', () => {
    expect(resolveNpcDialogue('village-scout', createInitialGameState())).toBe(
      'scout-find-marks',
    );
    expect(
      resolveNpcDialogue('village-scout', {
        ...createInitialGameState(),
        factIds: ['floor1-route-mark-seen'],
      }),
    ).toBe('scout-marks-seen');
  });

  it('advances the scribe line once a ledger fragment is held', () => {
    expect(resolveNpcDialogue('village-scribe', createInitialGameState())).toBe(
      'scribe-find-ledger',
    );
    expect(
      resolveNpcDialogue('village-scribe', {
        ...createInitialGameState(),
        itemIds: ['ledger-fragment-1'],
        factIds: ['optional-ledger-lead'],
      }),
    ).toBe('scribe-fragment-found');
  });

  it('throws for an unknown npc', () => {
    expect(() =>
      resolveNpcDialogue('nobody', createInitialGameState()),
    ).toThrow('Unknown NPC: nobody');
  });
});
