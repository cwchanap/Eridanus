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

  it('acknowledges the returned subject before the sigil lead', () => {
    expect(
      resolveNpcDialogue('village-warden', {
        ...createInitialGameState(),
        factIds: ['main-subject-returned'],
        itemIds: ['tower-depth-sigil'],
      }),
    ).toBe('warden-subject-returned');
  });

  it('acknowledges the treasury route and later the opened treasury reward', () => {
    expect(
      resolveNpcDialogue('village-artisan', {
        ...createInitialGameState(),
        factIds: ['floor1-treasury-return-used'],
      }),
    ).toBe('artisan-treasury-route-found');
    expect(
      resolveNpcDialogue('village-artisan', {
        ...createInitialGameState(),
        factIds: ['floor1-treasury-return-used'],
        openedRewardIds: ['floor1-future-treasury'],
      }),
    ).toBe('artisan-heirloom-recovered');
  });

  it('resolves the lost-route thread once the return stair is used', () => {
    expect(
      resolveNpcDialogue('village-scout', {
        ...createInitialGameState(),
        factIds: ['floor1-route-mark-seen', 'floor1-treasury-return-used'],
      }),
    ).toBe('scout-route-verified');
  });

  it('advances the scribe line after the Floor 2 ledger evidence', () => {
    expect(
      resolveNpcDialogue('village-scribe', {
        ...createInitialGameState(),
        factIds: ['optional-ledger-lead', 'floor2-paired-release-ledger-read'],
        itemIds: ['ledger-fragment-1'],
      }),
    ).toBe('scribe-floor2-ledger-read');
  });

  it('selects the subject lines by NPC id regardless of the return fact', () => {
    expect(
      resolveNpcDialogue('floor2-missing-subject', createInitialGameState()),
    ).toBe('subject-returning');
    expect(
      resolveNpcDialogue('floor2-missing-subject', {
        ...createInitialGameState(),
        factIds: ['main-subject-returned'],
      }),
    ).toBe('subject-returning');
    expect(
      resolveNpcDialogue('village-returned-subject', createInitialGameState()),
    ).toBe('subject-village');
    expect(
      resolveNpcDialogue('village-returned-subject', {
        ...createInitialGameState(),
        factIds: ['main-subject-returned'],
      }),
    ).toBe('subject-village');
  });
});
