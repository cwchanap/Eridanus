import { describe, expect, it } from 'vitest';
import { dispatchInput } from './session';
import type { SessionState } from './types';

const pending: SessionState = {
  game: {
    mapId: 'floor1',
    tile: { x: 12, y: 5 },
    player: { hp: 30, maxHp: 30, attack: 12, defense: 2 },
    openedRewardIds: ['floor1-power-core'],
    defeatedEnemyIds: [],
    openedShortcutIds: [],
    itemIds: [],
    factIds: [],
    discoveredSectionIds: ['floor1-proof'],
  },
  pending: {
    kind: 'combat',
    enemyId: 'floor1-gatekeeper',
    preview: { winnable: true, hitsNeeded: 3, hpLoss: 10 },
  },
};

describe('dispatchInput', () => {
  it('blocks movement while combat pending', () => {
    expect(
      dispatchInput(pending, { kind: 'move', direction: 'north' }),
    ).toEqual({ ok: false, session: pending, reason: 'interaction-pending' });
  });

  it('cancel clears only pending state', () => {
    expect(dispatchInput(pending, { kind: 'cancel' })).toEqual({
      ok: true,
      session: { ...pending, pending: null },
      effect: null,
    });
  });

  it('fight resolves enemy and clears prompt', () => {
    const result = dispatchInput(pending, { kind: 'fight' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.pending).toBeNull();
    expect(result.session.game.player.hp).toBe(20);
    expect(result.session.game.defeatedEnemyIds).toEqual(['floor1-gatekeeper']);
  });
});
