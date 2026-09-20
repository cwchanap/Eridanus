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
  const westRelease = findEntityById('floor2-west-release');
  const eastRelease = findEntityById('floor2-east-release');
  if (!westRelease || westRelease.kind !== 'latch')
    throw new Error('floor2-west-release missing');
  if (!eastRelease || eastRelease.kind !== 'latch')
    throw new Error('floor2-east-release missing');

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
      tile: { x: 8, y: 10 },
    });
    expect(result.state.itemIds).toEqual(['tower-depth-sigil']);
  });

  it('descending the rear floor2 stair records the rear stair fact', () => {
    const state = { ...base, mapId: 'floor2' as const, tile: { x: 15, y: 1 } };
    const result = attemptMove(state, 'east');
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

  for (const release of [westRelease, eastRelease]) {
    const rear = tileInDirection(release.tile, release.rearSide);
    const front = tileInDirection(
      release.tile,
      release.rearSide === 'east' ? 'west' : 'east',
    );
    const frontMove: Direction = release.rearSide;
    const rearMove: Direction = release.rearSide === 'east' ? 'west' : 'east';

    it(`blocks ${release.id} from the front`, () => {
      const atFront = { ...base, mapId: 'floor2' as const, tile: front };
      expect(attemptMove(atFront, frontMove)).toEqual({
        ok: false,
        reason: 'latch-closed-front',
      });
    });

    it(`opens ${release.id} from the rear where the player stands`, () => {
      const atRear = { ...base, mapId: 'floor2' as const, tile: rear };
      const result = attemptMove(atRear, rearMove);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.tile).toEqual(rear);
      expect(result.state.openedShortcutIds).toEqual([release.id]);
    });

    it(`an opened ${release.id} is traversable both ways without duplicating its id`, () => {
      const open = {
        ...base,
        mapId: 'floor2' as const,
        tile: front,
        openedShortcutIds: [release.id],
      };
      const enter = attemptMove(open, frontMove);
      expect(enter.ok).toBe(true);
      if (!enter.ok) return;
      expect(enter.state.tile).toEqual(release.tile);
      const exit = attemptMove(enter.state, frontMove);
      expect(exit.ok).toBe(true);
      if (!exit.ok) return;
      expect(exit.state.tile).toEqual(rear);
      const back = attemptMove(exit.state, rearMove);
      expect(back.ok).toBe(true);
      if (!back.ok) return;
      expect(back.state.tile).toEqual(release.tile);
      const leave = attemptMove(back.state, rearMove);
      expect(leave.ok).toBe(true);
      if (!leave.ok) return;
      expect(leave.state.tile).toEqual(front);
      expect(leave.state.openedShortcutIds).toEqual([release.id]);
    });
  }

  it('opens both floor2 releases in either order', () => {
    const westFirst = attemptMove(
      { ...base, mapId: 'floor2' as const, tile: { x: 6, y: 6 } },
      'west',
    );
    expect(westFirst.ok).toBe(true);
    if (!westFirst.ok) return;
    const thenEast = attemptMove(
      { ...westFirst.state, tile: { x: 11, y: 6 } },
      'east',
    );
    expect(thenEast.ok).toBe(true);
    if (!thenEast.ok) return;
    expect(thenEast.state.openedShortcutIds).toHaveLength(2);
    expect(thenEast.state.openedShortcutIds).toEqual(
      expect.arrayContaining(['floor2-west-release', 'floor2-east-release']),
    );

    const eastFirst = attemptMove(
      { ...base, mapId: 'floor2' as const, tile: { x: 11, y: 6 } },
      'east',
    );
    expect(eastFirst.ok).toBe(true);
    if (!eastFirst.ok) return;
    const thenWest = attemptMove(
      { ...eastFirst.state, tile: { x: 6, y: 6 } },
      'west',
    );
    expect(thenWest.ok).toBe(true);
    if (!thenWest.ok) return;
    expect(thenWest.state.openedShortcutIds).toHaveLength(2);
    expect(thenWest.state.openedShortcutIds).toEqual(
      expect.arrayContaining(['floor2-west-release', 'floor2-east-release']),
    );
  });

  it('returns through the treasury stair, records the fact, and discovers the workshop treasury', () => {
    const onFloor2 = {
      ...base,
      mapId: 'floor2' as const,
      tile: { x: 4, y: 3 },
    };
    const result = attemptMove(onFloor2, 'north');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor1' });
    expect(result.state.mapId).toBe('floor1');
    expect(result.state.tile).toEqual({ x: 17, y: 7 });
    expect(result.state.factIds).toContain('floor1-treasury-return-used');
    expect(result.state.discoveredSectionIds).toContain(
      'floor1-workshop-treasury',
    );
  });

  it('applies the treasury reward once and leaves its tile walkable', () => {
    const arrived = { ...base, tile: { x: 17, y: 7 } };
    const take = attemptMove(arrived, 'west');
    expect(take.ok).toBe(true);
    if (!take.ok) return;
    expect(take.effect).toEqual({ kind: 'reward', stat: 'defense', amount: 2 });
    expect(take.state.player.defense).toBe(4);
    expect(take.state.tile).toEqual({ x: 17, y: 7 });
    expect(take.state.openedRewardIds).toContain('floor1-future-treasury');

    const walk = attemptMove(take.state, 'west');
    expect(walk.ok).toBe(true);
    if (!walk.ok) return;
    expect(walk.effect).toEqual({ kind: 'moved' });
    expect(walk.state.tile).toEqual({ x: 16, y: 7 });
    expect(walk.state.player.defense).toBe(4);
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
