import { describe, expect, it } from 'vitest';
import { attemptMove } from './movement';
import type { Direction, GameState } from './types';

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

  it('walks onto collected reward tile', () => {
    const collected = {
      ...base,
      tile: { x: 8, y: 5 },
      openedRewardIds: ['floor1-power-core'],
    };
    const result = attemptMove(collected, 'east');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual({ x: 9, y: 5 });
    expect(result.effect).toEqual({ kind: 'moved' });
  });

  it('steps on portal and travels', () => {
    const state = { ...base, mapId: 'village' as const, tile: { x: 8, y: 2 } };
    const result = attemptMove(state, 'east');
    expect(result.ok && result.state).toMatchObject({
      mapId: 'floor1',
      tile: { x: 2, y: 9 },
    });
  });

  it('blocks walking into a wall', () => {
    const besideWall = { ...base, tile: { x: 1, y: 1 } };
    expect(attemptMove(besideWall, 'north')).toEqual({
      ok: false,
      reason: 'wall',
    });
  });

  it('blocks movement out of map bounds', () => {
    // All authored layouts have wall borders, so reaching the bounds check
    // requires standing on a border tile; construct that state directly.
    const onBorder = {
      ...base,
      mapId: 'village' as const,
      tile: { x: 0, y: 1 },
    };
    expect(attemptMove(onBorder, 'west')).toEqual({
      ok: false,
      reason: 'out-of-bounds',
    });
  });

  it('bumps undefeated enemy into a prompt without durable mutation', () => {
    const beforeGatekeeper = { ...base, tile: { x: 12, y: 5 } };
    const result = attemptMove(beforeGatekeeper, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect.kind).toBe('combatPrompt');
    expect(result.state).toBe(beforeGatekeeper);
  });

  it('leaves the passed-in state untouched on blocked results', () => {
    const cases: ReadonlyArray<readonly [GameState, Direction]> = [
      [base, 'east'],
      [{ ...base, tile: { x: 1, y: 1 } }, 'north'],
      [{ ...base, mapId: 'village', tile: { x: 0, y: 1 } }, 'west'],
    ];
    for (const [state, direction] of cases) {
      const snapshot = structuredClone(state);
      const result = attemptMove(state, direction);
      expect(result.ok).toBe(false);
      expect(state).toEqual(snapshot);
    }
  });
});
