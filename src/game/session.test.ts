import { describe, expect, it } from 'vitest';
import { dispatchInput } from './session';
import type { Rng, SessionState } from './types';

// Every roll lands, so a fight plays out as its forecast says.
const hits: Rng = () => 0;

const pending: SessionState = {
  game: {
    mapId: 'floor1',
    tile: { x: 12, y: 5 },
    player: { hp: 30, attack: 12, defense: 2, agility: 5, gold: 0 },
    openedRewardIds: ['floor1-power-core'],
    defeatedEnemyIds: [],
    openedShortcutIds: [],
    itemIds: [],
    factIds: [],
    discoveredSectionIds: ['floor1-lower-loop'],
    trades: 0,
  },
  pending: {
    kind: 'combat',
    enemyId: 'floor1-gatekeeper',
    preview: {
      winnable: true,
      hitsNeeded: 3,
      hpLoss: 9,
      heroHit: 1,
      enemyHit: 0.9,
    },
  },
};

describe('dispatchInput', () => {
  it('blocks movement while combat pending', () => {
    expect(
      dispatchInput(pending, { kind: 'move', direction: 'north' }, hits),
    ).toEqual({ ok: false, session: pending, reason: 'interaction-pending' });
  });

  it('cancel clears only pending state', () => {
    expect(dispatchInput(pending, { kind: 'cancel' }, hits)).toEqual({
      ok: true,
      session: { ...pending, pending: null },
      effect: null,
    });
  });

  it('fight resolves enemy and clears prompt', () => {
    const result = dispatchInput(pending, { kind: 'confirm' }, hits);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.pending).toBeNull();
    expect(result.session.game.player.hp).toBe(20);
    expect(result.session.game.defeatedEnemyIds).toEqual(['floor1-gatekeeper']);
  });
});
