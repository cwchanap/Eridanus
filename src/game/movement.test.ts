import { describe, expect, it } from 'vitest';
import { attemptMove } from './movement';
import { findEntityById, getEntityAt, isLayoutFloor } from './content';
import { tileInDirection } from './geometry';
import type { Direction, GameState, Tile } from './types';

const OPPOSITE: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

const entityTile = (id: string): Tile => {
  const found = findEntityById(id);
  if (!found) throw new Error(`missing entity: ${id}`);
  return found.tile;
};

// The tile on one side of an entity, and the move from it onto the entity.
const beside = (id: string, side: Direction) => ({
  tile: tileInDirection(entityTile(id), side),
  move: OPPOSITE[side],
});

const portalTarget = (id: string) => {
  const found = findEntityById(id);
  if (found?.kind !== 'portal') throw new Error(`${id} is not a portal`);
  return found.target;
};

const latchEntity = findEntityById('floor1-rear-latch');
if (latchEntity?.kind !== 'latch' || !('rearSide' in latchEntity))
  throw new Error('floor1-rear-latch missing');
const rearSide = latchEntity.rearSide;
const latchFront = beside(latchEntity.id, OPPOSITE[rearSide]);

const base: GameState = {
  mapId: 'floor1',
  tile: latchFront.tile,
  player: { hp: 30, attack: 10, defense: 2, gold: 0 },
  openedRewardIds: [],
  defeatedEnemyIds: [],
  openedShortcutIds: [],
  itemIds: [],
  factIds: [],
  discoveredSectionIds: [],
  trades: 0,
};

describe('attemptMove', () => {
  const westRelease = findEntityById('floor2-west-release');
  const eastRelease = findEntityById('floor2-east-release');
  if (!westRelease || westRelease.kind !== 'latch')
    throw new Error('floor2-west-release missing');
  if (!eastRelease || eastRelease.kind !== 'latch')
    throw new Error('floor2-east-release missing');

  it('blocks closed latch from front', () => {
    expect(attemptMove(base, latchFront.move)).toEqual({
      ok: false,
      reason: 'latch-closed-front',
    });
  });

  it('opens latch from rear without moving onto it', () => {
    const rearTile = tileInDirection(latchEntity.tile, rearSide);
    const rear = { ...base, tile: rearTile };
    const result = attemptMove(rear, OPPOSITE[rearSide]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual(rearTile);
    expect(result.state.openedShortcutIds).toContain('floor1-rear-latch');
  });

  it('walks through open latch and discovers the rear wing', () => {
    const open = { ...base, openedShortcutIds: ['floor1-rear-latch'] };
    const onto = attemptMove(open, latchFront.move);
    expect(onto.ok).toBe(true);
    if (!onto.ok) return;
    expect(onto.state.tile).toEqual(latchEntity.tile);
    const through = attemptMove(onto.state, latchFront.move);
    expect(through.ok).toBe(true);
    if (!through.ok) return;
    expect(through.state.discoveredSectionIds).toContain('floor1-rear-wing');
  });

  it('walks onto collected reward tile', () => {
    const { tile, move } = beside('floor1-depth-sigil', 'east');
    const collected = {
      ...base,
      tile,
      openedRewardIds: ['floor1-depth-sigil'],
    };
    const result = attemptMove(collected, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual(entityTile('floor1-depth-sigil'));
    expect(result.effect).toEqual({ kind: 'moved' });
  });

  const villageStair = beside('village-to-floor1', 'east');

  it('steps on portal and travels', () => {
    const state = {
      ...base,
      mapId: 'village' as const,
      tile: villageStair.tile,
    };
    const result = attemptMove(state, villageStair.move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject(portalTarget('village-to-floor1'));
  });

  const depthStair = beside('floor1-front-to-floor2', 'south');

  it('a locked portal records the seal fact and keeps the player in place', () => {
    const locked = { ...base, tile: depthStair.tile };
    const result = attemptMove(locked, depthStair.move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({
      kind: 'accessLocked',
      entityId: 'floor1-front-to-floor2',
    });
    expect(result.state.mapId).toBe('floor1');
    expect(result.state.tile).toEqual(depthStair.tile);
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
    });
  });

  it('carrying the sigil unlocks the depth stair and it stays carried', () => {
    const carrying = {
      ...base,
      tile: depthStair.tile,
      itemIds: ['tower-depth-sigil'],
    };
    const result = attemptMove(carrying, depthStair.move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject(portalTarget('floor1-front-to-floor2'));
    expect(result.state.itemIds).toEqual(['tower-depth-sigil']);
  });

  const floor2Depth = beside('floor2-depth-to-floor3', 'north');

  it('the floor2 depth stair stays sealed until the subject returns', () => {
    // The sigil must not matter here: this stair is a fact lock.
    const sealed = {
      ...base,
      mapId: 'floor2' as const,
      tile: floor2Depth.tile,
      itemIds: ['tower-depth-sigil'],
    };
    const result = attemptMove(sealed, floor2Depth.move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({
      kind: 'accessLocked',
      entityId: 'floor2-depth-to-floor3',
    });
    expect(result.state.mapId).toBe('floor2');
    expect(result.state.tile).toEqual(floor2Depth.tile);
    expect(result.state.factIds).toContain('floor2-depth-seal-seen');
    expect(result.state.factIds).not.toContain('main-subject-returned');
  });

  it('the released depth stair travels to floor three and records its fact', () => {
    const released = {
      ...base,
      mapId: 'floor2' as const,
      tile: floor2Depth.tile,
      factIds: ['main-subject-returned'],
    };
    const result = attemptMove(released, floor2Depth.move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor3' });
    expect(result.state).toMatchObject(portalTarget('floor2-depth-to-floor3'));
    expect(result.state.factIds).toContain('floor2-depth-stairs-used');
  });

  it('descending the rear floor2 stair records the rear stair fact', () => {
    const { tile, move } = beside('floor2-rear-to-floor1', 'south');
    const state = { ...base, mapId: 'floor2' as const, tile };
    const result = attemptMove(state, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject(portalTarget('floor2-rear-to-floor1'));
    expect(result.state.factIds).toContain('floor1-rear-stairs-used');
    expect(result.state.discoveredSectionIds).toContain('floor1-rear-wing');
  });

  it('arriving on floor one discovers the entry court and the treasury', () => {
    const state = {
      ...base,
      mapId: 'village' as const,
      tile: villageStair.tile,
    };
    const result = attemptMove(state, villageStair.move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject(portalTarget('village-to-floor1'));
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
    const { tile, move } = beside('floor1-gatekeeper', 'east');
    const beforeGatekeeper = { ...base, tile };
    const result = attemptMove(beforeGatekeeper, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect.kind).toBe('combatPrompt');
    expect(result.state).toBe(beforeGatekeeper);
  });

  for (const release of [westRelease, eastRelease]) {
    // Each release sits in a corridor: the two floor tiles either side.
    const sides = (['north', 'south', 'east', 'west'] as const).filter((side) =>
      isLayoutFloor('floor2', tileInDirection(release.tile, side)),
    );
    const [sideA, sideB] = sides;
    if (sides.length !== 2 || !sideA || !sideB)
      throw new Error(`${release.id} is not in a corridor`);
    const tileA = tileInDirection(release.tile, sideA);
    const tileB = tileInDirection(release.tile, sideB);
    const guards = 'guardIds' in release ? release.guardIds : [];

    it(`${release.id} stays shut while its guard stands, from either open side`, () => {
      for (const side of sides) {
        const tile = tileInDirection(release.tile, side);
        // A guard may stand on one side; that side is not open yet.
        if (getEntityAt('floor2', tile)) continue;
        const state = { ...base, mapId: 'floor2' as const, tile };
        expect(attemptMove(state, OPPOSITE[side])).toEqual({
          ok: true,
          state,
          effect: { kind: 'latchGuarded', id: release.id, remaining: 1 },
        });
      }
    });

    it(`${release.id} opens from either side once its guard falls`, () => {
      for (const side of sides) {
        const tile = tileInDirection(release.tile, side);
        const cleared = {
          ...base,
          mapId: 'floor2' as const,
          tile,
          defeatedEnemyIds: guards,
        };
        const result = attemptMove(cleared, OPPOSITE[side]);
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
        tile: tileA,
        defeatedEnemyIds: guards,
        openedShortcutIds: [release.id],
      };
      const enter = attemptMove(open, OPPOSITE[sideA]);
      expect(enter.ok).toBe(true);
      if (!enter.ok) return;
      expect(enter.state.tile).toEqual(release.tile);
      const exit = attemptMove(enter.state, sideB);
      expect(exit.ok).toBe(true);
      if (!exit.ok) return;
      expect(exit.state.tile).toEqual(tileB);
      const back = attemptMove(exit.state, OPPOSITE[sideB]);
      expect(back.ok).toBe(true);
      if (!back.ok) return;
      expect(back.state.tile).toEqual(release.tile);
      const leave = attemptMove(back.state, sideA);
      expect(leave.ok).toBe(true);
      if (!leave.ok) return;
      expect(leave.state.tile).toEqual(tileA);
      expect(leave.state.openedShortcutIds).toEqual([release.id]);
    });
  }

  it('the floor3 heart hatch counts its thrown levers', () => {
    const { tile, move } = beside('floor3-heart-shortcut', 'south');
    const below = { ...base, mapId: 'floor3' as const, tile };
    expect(attemptMove(below, move)).toEqual({
      ok: true,
      state: below,
      effect: {
        kind: 'latchWired',
        id: 'floor3-heart-shortcut',
        thrown: 0,
        total: 3,
      },
    });
    const two = {
      ...below,
      openedShortcutIds: ['floor3-west-lever', 'floor3-crown-lever'],
    };
    expect(attemptMove(two, move)).toEqual({
      ok: true,
      state: two,
      effect: {
        kind: 'latchWired',
        id: 'floor3-heart-shortcut',
        thrown: 2,
        total: 3,
      },
    });
    const all = {
      ...below,
      openedShortcutIds: [
        'floor3-west-lever',
        'floor3-gallery-lever',
        'floor3-crown-lever',
      ],
    };
    const result = attemptMove(all, move);
    expect(result.ok && result.effect).toEqual({
      kind: 'latchOpened',
      id: 'floor3-heart-shortcut',
    });
    expect(result.ok && result.state.tile).toEqual(tile);
  });

  it('pulling a lever throws it, and pulling it again pushes it back', () => {
    const { tile, move } = beside('floor3-west-lever', 'north');
    const state = { ...base, mapId: 'floor3' as const, tile };
    const down = attemptMove(state, move);
    expect(down.ok).toBe(true);
    if (!down.ok) return;
    expect(down.effect).toEqual({
      kind: 'leverPulled',
      id: 'floor3-west-lever',
      thrown: true,
      linked: 0,
    });
    expect(down.state.tile).toEqual(tile);
    expect(down.state.openedShortcutIds).toEqual(['floor3-west-lever']);
    const up = attemptMove(down.state, move);
    expect(up.ok && up.effect).toEqual({
      kind: 'leverPulled',
      id: 'floor3-west-lever',
      thrown: false,
      linked: 0,
    });
    expect(up.ok && up.state.openedShortcutIds).toEqual([]);
  });

  const gateLever = (n: number) => `floor4-gate-lever-${n}`;
  const pull = (state: GameState, id: string): GameState => {
    const { tile, move } = beside(id, 'north');
    const result = attemptMove({ ...state, tile }, move);
    if (!result.ok || result.effect.kind !== 'leverPulled')
      throw new Error(`could not pull ${id}`);
    return result.state;
  };
  const onFloor4 = { ...base, mapId: 'floor4' as const };

  it('a linked lever drags its neighbours with it', () => {
    const { tile, move } = beside(gateLever(2), 'north');
    const result = attemptMove({ ...onFloor4, tile }, move);
    expect(result.ok && result.effect).toEqual({
      kind: 'leverPulled',
      id: gateLever(2),
      thrown: true,
      linked: 2,
    });
    expect(result.ok && [...result.state.openedShortcutIds].sort()).toEqual([
      gateLever(1),
      gateLever(2),
      gateLever(3),
    ]);
    // A lever already down is pushed back up by its neighbour.
    const afterOne = pull(onFloor4, gateLever(1));
    expect([...afterOne.openedShortcutIds].sort()).toEqual([
      gateLever(1),
      gateLever(2),
    ]);
    expect(pull(afterOne, gateLever(2)).openedShortcutIds).toEqual([
      gateLever(3),
    ]);
  });

  it('the foundry gate opens once the two outer levers are pulled', () => {
    const { tile, move } = beside('floor4-foundry-gate', 'north');
    const pulled = pull(pull(onFloor4, gateLever(1)), gateLever(4));
    expect([...pulled.openedShortcutIds].sort()).toEqual(
      [1, 2, 3, 4].map(gateLever),
    );
    const result = attemptMove({ ...pulled, tile }, move);
    expect(result.ok && result.effect).toEqual({
      kind: 'latchOpened',
      id: 'floor4-foundry-gate',
    });
    // Pulling all four in a row leaves two of them up.
    const inARow = [1, 2, 3, 4].map(gateLever).reduce(pull, onFloor4);
    expect(attemptMove({ ...inARow, tile }, move)).toMatchObject({
      ok: true,
      effect: { kind: 'latchWired', thrown: 2, total: 4 },
    });
  });

  it('returns through the treasury stair, records the fact, and discovers the workshop treasury', () => {
    const { tile, move } = beside('floor2-treasury-to-floor1', 'south');
    const onFloor2 = { ...base, mapId: 'floor2' as const, tile };
    const result = attemptMove(onFloor2, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor1' });
    expect(result.state).toMatchObject(
      portalTarget('floor2-treasury-to-floor1'),
    );
    expect(result.state.factIds).toContain('floor1-treasury-return-used');
    expect(result.state.discoveredSectionIds).toContain(
      'floor1-workshop-treasury',
    );
  });

  it('applies the treasury reward once and leaves its tile walkable', () => {
    const { tile, move } = beside('floor1-future-treasury', 'east');
    const arrived = { ...base, tile };
    const take = attemptMove(arrived, move);
    expect(take.ok).toBe(true);
    if (!take.ok) return;
    expect(take.effect).toEqual({ kind: 'reward', stat: 'defense', amount: 2 });
    expect(take.state.player.defense).toBe(4);
    expect(take.state.tile).toEqual(tile);
    expect(take.state.openedRewardIds).toContain('floor1-future-treasury');

    const walk = attemptMove(take.state, move);
    expect(walk.ok).toBe(true);
    if (!walk.ok) return;
    expect(walk.effect).toEqual({ kind: 'moved' });
    expect(walk.state.tile).toEqual(entityTile('floor1-future-treasury'));
    expect(walk.state.player.defense).toBe(4);
  });

  it('leaves the passed-in state untouched on blocked results', () => {
    const cases: ReadonlyArray<readonly [GameState, Direction]> = [
      [base, latchFront.move],
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
