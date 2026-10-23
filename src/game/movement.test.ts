import { describe, expect, it } from 'vitest';
import { attemptMove } from './movement';
import { findEntityById } from './content';
import { tileInDirection } from './geometry';
import type { Direction, GameState } from './types';

const base: GameState = {
  mapId: 'floor1',
  tile: { x: 10, y: 8 },
  player: { hp: 30, maxHp: 30, attack: 10, defense: 2, gold: 0 },
  openedRewardIds: [],
  defeatedEnemyIds: [],
  openedShortcutIds: [],
  itemIds: [],
  factIds: [],
  discoveredSectionIds: [],
};

describe('attemptMove', () => {
  const latchEntity = findEntityById('floor1-rear-latch');
  if (
    !latchEntity ||
    latchEntity.kind !== 'latch' ||
    !('rearSide' in latchEntity)
  )
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
    const state = { ...base, mapId: 'village' as const, tile: { x: 24, y: 1 } };
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

  it('authors the depth stair lock as an item gate', () => {
    const portal = findEntityById('floor1-front-to-floor2');
    if (!portal || portal.kind !== 'portal' || !portal.lock)
      throw new Error('floor1-front-to-floor2 lock missing');
    expect(portal.lock).toEqual({
      kind: 'item',
      requiresItemId: 'tower-depth-sigil',
      lockedFactId: 'floor1-depth-seal-seen',
      lockedText: 'A crest-shaped socket seals the lower stair.',
    });
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
      tile: { x: 8, y: 11 },
    });
    expect(result.state.itemIds).toEqual(['tower-depth-sigil']);
  });

  it('the floor2 depth stair stays sealed until the subject returns', () => {
    // The sigil must not matter here: this stair is a fact lock.
    const sealed = {
      ...base,
      mapId: 'floor2' as const,
      tile: { x: 8, y: 2 },
      itemIds: ['tower-depth-sigil'],
    };
    const result = attemptMove(sealed, 'north');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({
      kind: 'accessLocked',
      text: 'The lower keeper seal will not release until the missing subject returns with the warning from below.',
    });
    expect(result.state.mapId).toBe('floor2');
    expect(result.state.tile).toEqual({ x: 8, y: 2 });
    expect(result.state.factIds).toContain('floor2-depth-seal-seen');
    expect(result.state.factIds).not.toContain('main-subject-returned');
  });

  it('the released depth stair travels to floor three and records its fact', () => {
    const released = {
      ...base,
      mapId: 'floor2' as const,
      tile: { x: 8, y: 2 },
      factIds: ['main-subject-returned'],
    };
    const result = attemptMove(released, 'north');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor3' });
    expect(result.state.mapId).toBe('floor3');
    expect(result.state.tile).toEqual({ x: 10, y: 13 });
    expect(result.state.factIds).toContain('floor2-depth-stairs-used');
  });

  it('descending the rear floor2 stair records the rear stair fact', () => {
    const state = { ...base, mapId: 'floor2' as const, tile: { x: 15, y: 2 } };
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
    const state = { ...base, mapId: 'village' as const, tile: { x: 24, y: 1 } };
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
    // The hall side and the wing side of each release.
    const hall = tileInDirection(
      release.tile,
      release.id === 'floor2-west-release' ? 'east' : 'west',
    );
    const wing = tileInDirection(
      release.tile,
      release.id === 'floor2-west-release' ? 'west' : 'east',
    );
    const toWing: Direction =
      release.id === 'floor2-west-release' ? 'west' : 'east';
    const toHall: Direction = toWing === 'west' ? 'east' : 'west';

    it(`${release.id} stays shut while its guard stands, from either side`, () => {
      for (const [tile, move] of [
        [hall, toWing],
        [wing, toHall],
      ] as const) {
        const state = { ...base, mapId: 'floor2' as const, tile };
        expect(attemptMove(state, move)).toEqual({
          ok: true,
          state,
          effect: { kind: 'latchGuarded', id: release.id, remaining: 1 },
        });
      }
    });

    it(`${release.id} opens from either side once its guard falls`, () => {
      for (const [tile, move] of [
        [hall, toWing],
        [wing, toHall],
      ] as const) {
        const cleared = {
          ...base,
          mapId: 'floor2' as const,
          tile,
          defeatedEnemyIds: ['floor2-east-sentry'],
        };
        const result = attemptMove(cleared, move);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.state.tile).toEqual(tile);
        expect(result.state.openedShortcutIds).toEqual([release.id]);
      }
    });

    it(`an opened ${release.id} is traversable both ways without duplicating its id`, () => {
      const open = {
        ...base,
        mapId: 'floor2' as const,
        tile: hall,
        openedShortcutIds: [release.id],
      };
      const enter = attemptMove(open, toWing);
      expect(enter.ok).toBe(true);
      if (!enter.ok) return;
      expect(enter.state.tile).toEqual(release.tile);
      const exit = attemptMove(enter.state, toWing);
      expect(exit.ok).toBe(true);
      if (!exit.ok) return;
      expect(exit.state.tile).toEqual(wing);
      const back = attemptMove(exit.state, toHall);
      expect(back.ok).toBe(true);
      if (!back.ok) return;
      expect(back.state.tile).toEqual(release.tile);
      const leave = attemptMove(back.state, toHall);
      expect(leave.ok).toBe(true);
      if (!leave.ok) return;
      expect(leave.state.tile).toEqual(hall);
      expect(leave.state.openedShortcutIds).toEqual([release.id]);
    });
  }

  it('the floor3 heart hatch counts its undefeated guards', () => {
    const below = { ...base, mapId: 'floor3' as const, tile: { x: 10, y: 6 } };
    expect(attemptMove(below, 'north')).toEqual({
      ok: true,
      state: below,
      effect: {
        kind: 'latchGuarded',
        id: 'floor3-heart-shortcut',
        remaining: 1,
      },
    });
    const cleared = { ...below, defeatedEnemyIds: ['floor3-archive-sentry'] };
    const result = attemptMove(cleared, 'north');
    expect(result.ok && result.effect).toEqual({
      kind: 'latchOpened',
      id: 'floor3-heart-shortcut',
    });
  });

  it('returns through the treasury stair, records the fact, and discovers the workshop treasury', () => {
    const onFloor2 = {
      ...base,
      mapId: 'floor2' as const,
      tile: { x: 4, y: 4 },
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
