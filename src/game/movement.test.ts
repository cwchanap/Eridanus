import { describe, expect, it } from 'vitest';
import { attemptMove } from './movement';
import { findEntityById } from './content';
import { tileInDirection } from './geometry';
import type { Direction, GameState } from './types';

const base: GameState = {
  mapId: 'floor1',
  tile: { x: 10, y: 8 },
  player: { hp: 30, maxHp: 30, attack: 10, defense: 2 },
  openedRewardIds: [],
  defeatedEnemyIds: [],
  openedShortcutIds: [],
  itemIds: [],
  factIds: [],
  discoveredSectionIds: [],
};

describe('attemptMove', () => {
  const latchEntity = findEntityById('floor1-rear-latch');
  if (!latchEntity || latchEntity.kind !== 'latch')
    throw new Error('floor1-rear-latch missing');
  const rearTile = tileInDirection(latchEntity.tile, latchEntity.rearSide);

  it('blocks closed latch from front', () => {
    expect(attemptMove(base, 'east')).toEqual({
      ok: false,
      reason: 'latch-closed-front',
    });
  });

  it('opens latch from rear without moving onto it', () => {
    const rear = { ...base, tile: rearTile };
    const result = attemptMove(rear, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual({ x: 12, y: 8 });
    expect(result.state.openedShortcutIds).toContain('floor1-rear-latch');
  });

  it('walks through open latch and discovers the rear wing', () => {
    const open = { ...base, openedShortcutIds: ['floor1-rear-latch'] };
    const result = attemptMove(open, 'east');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual(latchEntity.tile);
    expect(result.state.discoveredSectionIds).toContain('floor1-rear-wing');
  });

  it('walks onto collected reward tile', () => {
    const collected = {
      ...base,
      tile: { x: 8, y: 10 },
      openedRewardIds: ['floor1-depth-sigil'],
    };
    const result = attemptMove(collected, 'east');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual({ x: 9, y: 10 });
    expect(result.effect).toEqual({ kind: 'moved' });
  });

  it('steps on portal and travels', () => {
    const state = { ...base, mapId: 'village' as const, tile: { x: 12, y: 2 } };
    const result = attemptMove(state, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({
      mapId: 'floor1',
      tile: { x: 2, y: 14 },
    });
  });

  it('a locked portal records the seal fact and keeps the player in place', () => {
    const locked = { ...base, tile: { x: 9, y: 3 } };
    const result = attemptMove(locked, 'north');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({
      kind: 'accessLocked',
      text: 'A crest-shaped socket seals the lower stair.',
    });
    expect(result.state.mapId).toBe('floor1');
    expect(result.state.tile).toEqual({ x: 9, y: 3 });
    expect(result.state.factIds).toContain('floor1-depth-seal-seen');
    expect(result.state.itemIds).toEqual([]);
  });

  it('carrying the sigil unlocks the depth stair and it stays carried', () => {
    const carrying = {
      ...base,
      tile: { x: 9, y: 3 },
      itemIds: ['tower-depth-sigil'],
    };
    const result = attemptMove(carrying, 'north');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({
      mapId: 'floor2',
      tile: { x: 1, y: 8 },
    });
    expect(result.state.itemIds).toEqual(['tower-depth-sigil']);
  });

  it('descending the rear floor2 stair records the rear stair fact', () => {
    const state = { ...base, mapId: 'floor2' as const, tile: { x: 14, y: 2 } };
    const result = attemptMove(state, 'north');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({
      mapId: 'floor1',
      tile: { x: 21, y: 3 },
    });
    expect(result.state.factIds).toContain('floor1-rear-stairs-used');
    expect(result.state.discoveredSectionIds).toContain('floor1-rear-wing');
  });

  it('arriving on floor one discovers the entry court and the treasury', () => {
    const state = { ...base, mapId: 'village' as const, tile: { x: 12, y: 2 } };
    const result = attemptMove(state, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.mapId).toBe('floor1');
    expect(result.state.tile).toEqual({ x: 2, y: 14 });
    expect(result.state.discoveredSectionIds).toContain('floor1-entry-court');
    expect(result.state.factIds).toEqual(
      expect.arrayContaining([
        'village-tower-stairs-used',
        'floor1-treasury-seen',
      ]),
    );
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
    const beforeGatekeeper = { ...base, tile: { x: 14, y: 10 } };
    const result = attemptMove(beforeGatekeeper, 'east');
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
