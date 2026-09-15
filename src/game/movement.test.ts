import { describe, expect, it } from 'vitest';
import { attemptMove } from './movement';
import type { GameState } from './types';

const base: GameState = {
  mapId: 'floor1',
  tile: { x: 6, y: 5 },
  player: { hp: 30, maxHp: 30, attack: 10, defense: 2 },
  openedRewardIds: [],
  defeatedEnemyIds: [],
  openedShortcutIds: [],
};

describe('attemptMove', () => {
  it('blocks closed latch from front', () => {
    expect(attemptMove(base, 'east')).toEqual({
      ok: false,
      reason: 'latch-closed-front',
    });
  });

  it('opens latch from rear without moving onto it', () => {
    const rear = { ...base, tile: { x: 8, y: 5 } };
    const result = attemptMove(rear, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual({ x: 8, y: 5 });
    expect(result.state.openedShortcutIds).toContain('floor1-rear-latch');
  });

  it('walks through open latch', () => {
    const open = { ...base, openedShortcutIds: ['floor1-rear-latch'] };
    const result = attemptMove(open, 'east');
    expect(result.ok && result.state.tile).toEqual({ x: 7, y: 5 });
  });

  it('steps on portal and travels', () => {
    const state = { ...base, mapId: 'village' as const, tile: { x: 8, y: 2 } };
    const result = attemptMove(state, 'east');
    expect(result.ok && result.state).toMatchObject({
      mapId: 'floor1',
      tile: { x: 2, y: 9 },
    });
  });
});
