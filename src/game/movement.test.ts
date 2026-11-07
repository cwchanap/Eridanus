import { describe, expect, it } from 'vitest';
import { attemptMove } from './movement';
import { dispatchInput } from './session';
import {
  findEntityById,
  getEntityAt,
  isLayoutFloor,
  isTileBlockedByEntity,
} from './content';
import { tileInDirection } from './geometry';
import { buildJournalView } from './journal';
import { createInitialGameState } from './state';
import type { Direction, GameState, Rng, SessionState, Tile } from './types';

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
  player: { hp: 30, attack: 10, defense: 2, agility: 5, gold: 0 },
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

  const floor5Deep = beside('floor5-depth-to-floor6', 'west');

  it('the floor5 deep stair stays sealed until the village is restored', () => {
    const sealed = {
      ...base,
      mapId: 'floor5' as const,
      tile: floor5Deep.tile,
      openedRewardIds: ['floor5-heart-waystone'],
    };
    const result = attemptMove(sealed, floor5Deep.move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({
      kind: 'accessLocked',
      entityId: 'floor5-depth-to-floor6',
    });
    expect(result.state.mapId).toBe('floor5');
    expect(result.state.tile).toEqual(floor5Deep.tile);
    expect(result.state.factIds).toContain('floor5-deep-stair-seen');
    expect(result.state.factIds).not.toContain('main-village-restored');
  });

  it('the restored deep stair travels to floor six and records its fact', () => {
    const released = {
      ...base,
      mapId: 'floor5' as const,
      tile: floor5Deep.tile,
      openedRewardIds: ['floor5-heart-waystone'],
      factIds: ['main-village-restored'],
    };
    const result = attemptMove(released, floor5Deep.move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor6' });
    expect(result.state).toMatchObject(portalTarget('floor5-depth-to-floor6'));
    expect(result.state.factIds).toContain('floor5-depth-stairs-used');
    expect(result.state.discoveredSectionIds).toEqual(['floor6-inlet']);
  });

  it('a sluice pad carries the step to its paired tank', () => {
    const onPad = {
      ...base,
      mapId: 'floor6' as const,
      tile: { x: 5, y: 8 },
      defeatedEnemyIds: ['floor6-inlet-darter'],
    };
    const result = attemptMove(onPad, 'north');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor6' });
    expect(result.state).toMatchObject({
      mapId: 'floor6',
      tile: { x: 1, y: 7 },
    });
    expect(result.state.discoveredSectionIds).toEqual(['floor6-north-tank']);
  });

  it('the floor6 inlet stair returns to the floor five sanctum', () => {
    const { tile, move } = beside('floor6-to-floor5', 'west');
    const onFloor6 = { ...base, mapId: 'floor6' as const, tile };
    const result = attemptMove(onFloor6, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor5' });
    expect(result.state).toMatchObject(portalTarget('floor6-to-floor5'));
    expect(result.state.discoveredSectionIds).toContain('floor5-sanctum');
  });

  it('the floor six depth stair travels to floor seven and records its fact', () => {
    const { tile, move } = beside('floor6-to-floor7', 'south');
    const onFloor6 = { ...base, mapId: 'floor6' as const, tile };
    const result = attemptMove(onFloor6, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor7' });
    expect(result.state).toMatchObject(portalTarget('floor6-to-floor7'));
    expect(result.state.factIds).toContain('floor6-depth-stairs-used');
    expect(result.state.discoveredSectionIds).toEqual([
      'floor7-north-west-wing',
    ]);
  });

  it('the floor seven arrival stair returns to the floor six outflow', () => {
    const { tile, move } = beside('floor7-to-floor6', 'south');
    const onFloor7 = { ...base, mapId: 'floor7' as const, tile };
    const result = attemptMove(onFloor7, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor6' });
    expect(result.state).toMatchObject(portalTarget('floor7-to-floor6'));
    expect(result.state.discoveredSectionIds).toContain('floor6-outflow');
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

  const bellLever = (wing: string) => `floor7-${wing}-lever`;
  const pullBell = (
    state: GameState,
    wing: string,
    side: Direction,
  ): GameState => {
    const { tile, move } = beside(bellLever(wing), side);
    const result = attemptMove({ ...state, tile }, move);
    if (!result.ok || result.effect.kind !== 'leverPulled')
      throw new Error(`could not pull ${bellLever(wing)}`);
    return result.state;
  };
  const onFloor7: GameState = { ...base, mapId: 'floor7' };

  it('a bell lever swings the next wing lever with it', () => {
    const { tile, move } = beside(bellLever('north-west'), 'north');
    const result = attemptMove({ ...onFloor7, tile }, move);
    expect(result.ok && result.effect).toEqual({
      kind: 'leverPulled',
      id: bellLever('north-west'),
      thrown: true,
      linked: 1,
    });
    expect(result.ok && [...result.state.openedShortcutIds].sort()).toEqual([
      bellLever('north-east'),
      bellLever('north-west'),
    ]);
  });

  it('the reliquary hatch opens once two opposite bell levers are pulled', () => {
    const { tile, move } = beside('floor7-reliquary-hatch', 'north');
    const below = { ...onFloor7, tile };
    expect(attemptMove(below, move)).toEqual({
      ok: true,
      state: below,
      effect: {
        kind: 'latchWired',
        id: 'floor7-reliquary-hatch',
        thrown: 0,
        total: 4,
      },
    });
    const pulled = pullBell(
      pullBell(onFloor7, 'north-west', 'north'),
      'south-east',
      'south',
    );
    expect([...pulled.openedShortcutIds].sort()).toEqual([
      bellLever('north-east'),
      bellLever('north-west'),
      bellLever('south-east'),
      bellLever('south-west'),
    ]);
    const result = attemptMove({ ...pulled, tile }, move);
    expect(result.ok && result.effect).toEqual({
      kind: 'latchOpened',
      id: 'floor7-reliquary-hatch',
    });
    const inARow = (
      [
        ['north-west', 'north'],
        ['north-east', 'east'],
        ['south-east', 'south'],
        ['south-west', 'west'],
      ] as const
    ).reduce((state, [wing, side]) => pullBell(state, wing, side), onFloor7);
    expect(attemptMove({ ...inARow, tile }, move)).toMatchObject({
      ok: true,
      effect: { kind: 'latchWired', thrown: 0, total: 4 },
    });
  });

  it('the floor seven depth stair travels to floor eight and records its fact', () => {
    const { tile, move } = beside('floor7-to-floor8', 'north');
    const onFloor7 = { ...base, mapId: 'floor7' as const, tile };
    const result = attemptMove(onFloor7, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor8' });
    expect(result.state).toMatchObject(portalTarget('floor7-to-floor8'));
    expect(result.state.factIds).toContain('floor7-depth-stairs-used');
    expect(result.state.discoveredSectionIds).toEqual(['floor8-west-tangle']);
  });

  it('the floor eight arrival stair returns to the floor seven reliquary', () => {
    const { tile, move } = beside('floor8-to-floor7', 'west');
    const onFloor8 = { ...base, mapId: 'floor8' as const, tile };
    const result = attemptMove(onFloor8, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor7' });
    expect(result.state).toMatchObject(portalTarget('floor8-to-floor7'));
    expect(result.state.discoveredSectionIds).toContain('floor7-reliquary');
  });

  it('the rift stair stays barred without the rift key and travels with it', () => {
    const { tile, move } = beside('floor8-to-floor9', 'east');
    const sealed = { ...base, mapId: 'floor8' as const, tile };
    const locked = attemptMove(sealed, move);
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    expect(locked.effect).toEqual({
      kind: 'accessLocked',
      entityId: 'floor8-to-floor9',
    });
    expect(locked.state.mapId).toBe('floor8');
    expect(locked.state.tile).toEqual(tile);
    expect(locked.state.factIds).toContain('floor8-depth-seal-seen');
    expect(locked.state.itemIds).toEqual([]);

    const carrying = { ...sealed, itemIds: ['rift-key'] };
    const open = attemptMove(carrying, move);
    expect(open.ok).toBe(true);
    if (!open.ok) return;
    expect(open.effect).toEqual({ kind: 'traveled', mapId: 'floor9' });
    expect(open.state).toMatchObject(portalTarget('floor8-to-floor9'));
    expect(open.state.factIds).toContain('floor8-depth-stairs-used');
    expect(open.state.discoveredSectionIds).toEqual(['floor9-top-band']);
  });

  it('the floor nine return stair climbs to the floor eight lower tangle', () => {
    const { tile, move } = beside('floor9-to-floor8', 'east');
    const onFloor9 = { ...base, mapId: 'floor9' as const, tile };
    const result = attemptMove(onFloor9, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor8' });
    expect(result.state).toMatchObject(portalTarget('floor9-to-floor8'));
    expect(result.state.discoveredSectionIds).toEqual(['floor8-lower-tangle']);
  });

  it('the floor eight landing stair drops to the sealed underpass', () => {
    const { tile, move } = beside('floor8-to-landing', 'south');
    const onFloor8 = { ...base, mapId: 'floor8' as const, tile };
    const result = attemptMove(onFloor8, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor9' });
    expect(result.state).toMatchObject(portalTarget('floor8-to-landing'));
    expect(result.state.discoveredSectionIds).toEqual(['floor9-underpass']);
  });

  it('the west underpass stair climbs back to the floor eight lower tangle', () => {
    const { tile, move } = beside('floor9-underpass-west', 'north');
    const onFloor9 = { ...base, mapId: 'floor9' as const, tile };
    const result = attemptMove(onFloor9, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor8' });
    expect(result.state).toMatchObject(portalTarget('floor9-underpass-west'));
    expect(result.state.discoveredSectionIds).toEqual(['floor8-lower-tangle']);
  });

  it('the east underpass stair climbs to the floor eight east gallery', () => {
    const { tile, move } = beside('floor9-underpass-east', 'east');
    const onFloor9 = { ...base, mapId: 'floor9' as const, tile };
    const result = attemptMove(onFloor9, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor8' });
    expect(result.state).toMatchObject(portalTarget('floor9-underpass-east'));
    expect(result.state.discoveredSectionIds).toEqual(['floor8-east-gallery']);
  });

  it('the gallery landing stair drops back to the underpass', () => {
    const { tile, move } = beside('floor8-from-landing', 'west');
    const onFloor8 = { ...base, mapId: 'floor8' as const, tile };
    const result = attemptMove(onFloor8, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor9' });
    expect(result.state).toMatchObject(portalTarget('floor8-from-landing'));
    expect(result.state.discoveredSectionIds).toEqual(['floor9-underpass']);
  });

  it('the bridge gate is barred from the west and lifts from the east', () => {
    const front = { ...base, mapId: 'floor8' as const, tile: { x: 16, y: 13 } };
    expect(attemptMove(front, 'east')).toEqual({
      ok: false,
      reason: 'latch-closed-front',
    });
    const rear = { ...base, mapId: 'floor8' as const, tile: { x: 18, y: 13 } };
    const result = attemptMove(rear, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({
      kind: 'latchOpened',
      id: 'floor8-bridge-gate',
    });
    expect(result.state.tile).toEqual({ x: 18, y: 13 });
    expect(result.state.openedShortcutIds).toContain('floor8-bridge-gate');
    const onto = attemptMove(result.state, 'west');
    expect(onto.ok && onto.state.tile).toEqual({ x: 17, y: 13 });
  });

  it('reaches the east rift key through the floor nine underpass while its stair is still locked', () => {
    const routeMoves = (state: GameState, to: Tile): readonly Direction[] => {
      const key = (tile: Tile) => `${tile.x},${tile.y}`;
      const came = new Map<string, { from: Tile; move: Direction }>();
      const queue: Tile[] = [state.tile];
      const seen = new Set([key(state.tile)]);
      while (queue.length > 0) {
        const tile = queue.shift()!;
        if (tile.x === to.x && tile.y === to.y) {
          const moves: Direction[] = [];
          let current = tile;
          for (
            let step = came.get(key(current));
            step;
            step = came.get(key(current))
          ) {
            moves.unshift(step.move);
            current = step.from;
          }
          return moves;
        }
        for (const [move, dx, dy] of [
          ['west', -1, 0],
          ['east', 1, 0],
          ['north', 0, -1],
          ['south', 0, 1],
        ] as const) {
          const next = { x: tile.x + dx, y: tile.y + dy };
          if (
            seen.has(key(next)) ||
            !isLayoutFloor(state.mapId, next) ||
            isTileBlockedByEntity(state, next) ||
            getEntityAt(state.mapId, next)?.kind === 'portal'
          )
            continue;
          seen.add(key(next));
          came.set(key(next), { from: tile, move });
          queue.push(next);
        }
      }
      throw new Error(`no route from ${key(state.tile)} to ${key(to)}`);
    };
    const allLands: Rng = () => 0;
    let session: SessionState = {
      game: {
        ...base,
        mapId: 'floor8',
        tile: { x: 3, y: 1 },
        player: { hp: 600, attack: 45, defense: 45, agility: 5, gold: 0 },
        discoveredSectionIds: ['floor8-west-tangle'],
      },
      pending: null,
    };
    const step = (direction: Direction) => {
      const result = dispatchInput(
        session,
        { kind: 'move', direction },
        allLands,
      );
      if (!result.ok)
        throw new Error(
          `step blocked (${result.reason}) at ${session.game.tile.x},${session.game.tile.y} moving ${direction}`,
        );
      session = result.session;
      return result;
    };
    const replay = (moves: readonly Direction[]) => {
      for (const move of moves)
        expect(step(move).effect).toEqual({ kind: 'moved' });
    };
    const route = (to: Tile) => replay(routeMoves(session.game, to));
    const fight = (
      move: Direction,
      enemyId: string,
      hpLost: number,
      gold: number,
    ) => {
      expect(step(move).effect).toMatchObject({
        kind: 'combatPrompt',
        enemyId,
      });
      expect(session.pending).toMatchObject({ kind: 'combat', enemyId });
      const won = dispatchInput(session, { kind: 'confirm' }, allLands);
      expect(won.ok).toBe(true);
      if (!won.ok) return;
      session = won.session;
      expect(won.effect).toMatchObject({
        kind: 'enemyDefeated',
        enemyId,
        hpLost,
        gold,
      });
      expect(session.pending).toBeNull();
      expect(session.game.defeatedEnemyIds).toContain(enemyId);
    };
    const game = () => session.game;

    route({ x: 3, y: 11 });
    fight('south', 'floor8-west-lancer', 55, 20);
    expect(game().player.hp).toBe(545);

    route({ x: 4, y: 15 });
    expect(step('west').effect).toEqual({
      kind: 'accessLocked',
      entityId: 'floor8-to-floor9',
    });
    expect(game().tile).toEqual({ x: 4, y: 15 });
    expect(game().factIds).toContain('floor8-depth-seal-seen');
    expect(game().itemIds).toEqual([]);

    route({ x: 11, y: 23 });
    fight('west', 'floor8-stair-guard', 35, 20);
    expect(game().player.hp).toBe(510);
    route({ x: 9, y: 22 });
    expect(step('north').effect).toEqual({
      kind: 'traveled',
      mapId: 'floor9',
    });
    expect(game().tile).toEqual({ x: 1, y: 3 });
    expect(game().discoveredSectionIds).toContain('floor9-underpass');

    route({ x: 6, y: 1 });
    expect(step('west').effect).toEqual({
      kind: 'traveled',
      mapId: 'floor8',
    });
    expect(game().tile).toEqual({ x: 31, y: 1 });
    expect(game().discoveredSectionIds).toContain('floor8-east-gallery');

    route({ x: 25, y: 11 });
    fight('east', 'floor8-rift-knight', 104, 32);
    expect(game().player.hp).toBe(406);
    expect(step('east').effect).toEqual({ kind: 'moved' });
    expect(game().tile).toEqual({ x: 26, y: 11 });
    expect(step('east').effect).toEqual({
      kind: 'itemReward',
      itemId: 'rift-key',
    });
    expect(game().itemIds).toContain('rift-key');

    route({ x: 18, y: 13 });
    expect(step('west').effect).toEqual({
      kind: 'latchOpened',
      id: 'floor8-bridge-gate',
    });
    expect(game().tile).toEqual({ x: 18, y: 13 });
    expect(game().openedShortcutIds).toContain('floor8-bridge-gate');

    route({ x: 4, y: 15 });
    expect(step('west').effect).toEqual({
      kind: 'traveled',
      mapId: 'floor9',
    });
    expect(game().tile).toEqual({ x: 1, y: 5 });
    expect(game().factIds).toContain('floor8-depth-stairs-used');
    expect(game().discoveredSectionIds).toContain('floor9-top-band');

    expect(step('east').effect).toEqual({ kind: 'moved' });
    expect(game().tile).toEqual({ x: 2, y: 5 });
    expect(step('west').effect).toEqual({
      kind: 'traveled',
      mapId: 'floor8',
    });
    expect(game().tile).toEqual({ x: 3, y: 15 });
    expect(game().discoveredSectionIds).toContain('floor8-lower-tangle');
    expect(game().defeatedEnemyIds).toEqual([
      'floor8-west-lancer',
      'floor8-stair-guard',
      'floor8-rift-knight',
    ]);
    expect(game().player.hp).toBe(406);
    expect(game().player.gold).toBe(72);
  });

  it('the floor nine depth stair travels to floor ten and records its fact', () => {
    const { tile, move } = beside('floor9-to-floor10', 'east');
    const onFloor9 = {
      ...base,
      mapId: 'floor9' as const,
      tile,
      defeatedEnemyIds: ['floor9-crossways-warden'],
    };
    const result = attemptMove(onFloor9, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor10' });
    expect(result.state).toMatchObject(portalTarget('floor9-to-floor10'));
    expect(result.state.factIds).toContain('floor9-depth-stairs-used');
    expect(result.state.discoveredSectionIds).toEqual(['floor10-trunk']);
  });

  it('the floor ten arrival stair climbs back to the floor nine crossways', () => {
    const { tile, move } = beside('floor10-to-floor9', 'south');
    const onFloor10 = { ...base, mapId: 'floor10' as const, tile };
    const result = attemptMove(onFloor10, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'floor9' });
    expect(result.state).toMatchObject(portalTarget('floor10-to-floor9'));
    expect(result.state.discoveredSectionIds).toEqual(['floor9-bottom-band']);
  });

  it('keeps the village heartwood lift shut until the heartwood is carried', () => {
    const { tile, move } = beside('village-lift-to-floor10', 'west');
    const locked = attemptMove({ ...createInitialGameState(), tile }, move);
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    expect(locked.effect).toEqual({
      kind: 'accessLocked',
      entityId: 'village-lift-to-floor10',
    });
    expect(locked.state.mapId).toBe('village');
    expect(locked.state.tile).toEqual(tile);
    expect(locked.state.factIds).toContain('village-heartwood-lift-seen');
    expect(locked.state.itemIds).toEqual([]);

    const open = attemptMove(
      { ...createInitialGameState(), tile, itemIds: ['tower-heartwood'] },
      move,
    );
    expect(open.ok).toBe(true);
    if (!open.ok) return;
    expect(open.effect).toEqual({ kind: 'traveled', mapId: 'floor10' });
    expect(open.state).toMatchObject(portalTarget('village-lift-to-floor10'));
    expect(open.state.discoveredSectionIds).toContain('floor10-heart');
  });

  it('rides the floor ten lift home without the heartwood', () => {
    const { tile, move } = beside('floor10-lift-to-village', 'south');
    const onFloor10 = { ...base, mapId: 'floor10' as const, tile };
    const result = attemptMove(onFloor10, move);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'traveled', mapId: 'village' });
    expect(result.state).toMatchObject(portalTarget('floor10-lift-to-village'));
    expect(result.state.discoveredSectionIds).toContain('village-tower-road');
  });

  it('the floor ten heart hatch opens from either side once both wardens fall', () => {
    for (const side of ['north', 'south'] as const) {
      const { tile, move } = beside('floor10-heart-hatch', side);
      const held = { ...base, mapId: 'floor10' as const, tile };
      expect(attemptMove(held, move)).toEqual({
        ok: true,
        state: held,
        effect: {
          kind: 'latchGuarded',
          id: 'floor10-heart-hatch',
          remaining: 2,
        },
      });
      const one = { ...held, defeatedEnemyIds: ['floor10-west-warden'] };
      expect(attemptMove(one, move)).toEqual({
        ok: true,
        state: one,
        effect: {
          kind: 'latchGuarded',
          id: 'floor10-heart-hatch',
          remaining: 1,
        },
      });
      const both = {
        ...held,
        defeatedEnemyIds: ['floor10-west-warden', 'floor10-east-warden'],
      };
      const opened = attemptMove(both, move);
      expect(opened.ok).toBe(true);
      if (!opened.ok) continue;
      expect(opened.effect).toEqual({
        kind: 'latchOpened',
        id: 'floor10-heart-hatch',
      });
      expect(opened.state.tile).toEqual(tile);
      expect(opened.state.openedShortcutIds).toContain('floor10-heart-hatch');
    }
  });

  it('clears the floor ten route and carries the heartwood home to the warden', () => {
    const routeMoves = (state: GameState, to: Tile): readonly Direction[] => {
      const key = (tile: Tile) => `${tile.x},${tile.y}`;
      const came = new Map<string, { from: Tile; move: Direction }>();
      const queue: Tile[] = [state.tile];
      const seen = new Set([key(state.tile)]);
      while (queue.length > 0) {
        const tile = queue.shift()!;
        if (tile.x === to.x && tile.y === to.y) {
          const moves: Direction[] = [];
          let current = tile;
          for (
            let step = came.get(key(current));
            step;
            step = came.get(key(current))
          ) {
            moves.unshift(step.move);
            current = step.from;
          }
          return moves;
        }
        for (const [move, dx, dy] of [
          ['west', -1, 0],
          ['east', 1, 0],
          ['north', 0, -1],
          ['south', 0, 1],
        ] as const) {
          const next = { x: tile.x + dx, y: tile.y + dy };
          if (
            seen.has(key(next)) ||
            !isLayoutFloor(state.mapId, next) ||
            isTileBlockedByEntity(state, next) ||
            getEntityAt(state.mapId, next)?.kind === 'portal'
          )
            continue;
          seen.add(key(next));
          came.set(key(next), { from: tile, move });
          queue.push(next);
        }
      }
      throw new Error(`no route from ${key(state.tile)} to ${key(to)}`);
    };
    const allLands: Rng = () => 0;
    let session: SessionState = {
      game: {
        ...base,
        mapId: 'floor10',
        tile: { x: 15, y: 2 },
        player: { hp: 600, attack: 49, defense: 47, agility: 5, gold: 0 },
        discoveredSectionIds: ['floor10-trunk'],
      },
      pending: null,
    };
    const step = (direction: Direction) => {
      const result = dispatchInput(
        session,
        { kind: 'move', direction },
        allLands,
      );
      if (!result.ok)
        throw new Error(
          `step blocked (${result.reason}) at ${session.game.tile.x},${session.game.tile.y} moving ${direction}`,
        );
      session = result.session;
      return result;
    };
    const replay = (moves: readonly Direction[]) => {
      for (const move of moves)
        expect(step(move).effect).toEqual({ kind: 'moved' });
    };
    const route = (to: Tile) => replay(routeMoves(session.game, to));
    const fight = (
      move: Direction,
      enemyId: string,
      hpLost: number,
      gold: number,
    ) => {
      expect(step(move).effect).toMatchObject({
        kind: 'combatPrompt',
        enemyId,
      });
      expect(session.pending).toMatchObject({ kind: 'combat', enemyId });
      const won = dispatchInput(session, { kind: 'confirm' }, allLands);
      expect(won.ok).toBe(true);
      if (!won.ok) return;
      session = won.session;
      expect(won.effect).toMatchObject({
        kind: 'enemyDefeated',
        enemyId,
        hpLost,
        gold,
      });
      expect(session.pending).toBeNull();
      expect(session.game.defeatedEnemyIds).toContain(enemyId);
    };
    const game = () => session.game;

    route({ x: 5, y: 11 });
    fight('south', 'floor10-middle-guard', 40, 22);
    expect(game().player.hp).toBe(560);
    expect(step('south').effect).toEqual({ kind: 'moved' });
    expect(step('south').effect).toEqual({
      kind: 'reward',
      stat: 'defense',
      amount: 2,
    });
    expect(game().player.defense).toBe(49);

    route({ x: 17, y: 16 });
    expect(step('south').effect).toEqual({
      kind: 'reward',
      stat: 'hp',
      amount: 80,
    });
    expect(game().player.hp).toBe(640);

    route({ x: 11, y: 8 });
    expect(step('south').effect).toEqual({
      kind: 'clue',
      clueId: 'floor10-taproot-notice',
    });
    expect(game().tile).toEqual({ x: 11, y: 8 });

    route({ x: 1, y: 15 });
    fight('south', 'floor10-west-ambusher', 36, 26);
    expect(game().player.hp).toBe(604);
    expect(step('south').effect).toEqual({ kind: 'moved' });
    expect(game().tile).toEqual({ x: 1, y: 16 });

    route({ x: 1, y: 22 });
    expect(step('south').effect).toEqual({
      kind: 'reward',
      stat: 'hp',
      amount: 110,
    });
    expect(game().player.hp).toBe(714);

    route({ x: 7, y: 23 });
    fight('east', 'floor10-west-warden', 56, 38);
    expect(game().player.hp).toBe(658);
    expect(step('east').effect).toEqual({ kind: 'moved' });
    expect(step('east').effect).toEqual({
      kind: 'reward',
      stat: 'hp',
      amount: 10,
    });
    expect(game().player.hp).toBe(668);

    route({ x: 23, y: 15 });
    fight('west', 'floor10-east-darter', 21, 22);
    expect(game().player.hp).toBe(647);
    expect(step('west').effect).toEqual({ kind: 'moved' });
    expect(step('west').effect).toEqual({
      kind: 'reward',
      stat: 'defense',
      amount: 1,
    });
    expect(game().player.defense).toBe(50);

    route({ x: 27, y: 12 });
    fight('south', 'floor10-east-lancer', 45, 26);
    expect(game().player.hp).toBe(602);
    expect(step('south').effect).toEqual({ kind: 'moved' });

    route({ x: 29, y: 18 });
    expect(step('south').effect).toEqual({
      kind: 'reward',
      stat: 'hp',
      amount: 60,
    });
    expect(game().player.hp).toBe(662);

    route({ x: 29, y: 23 });
    fight('east', 'floor10-east-warden', 48, 38);
    expect(game().player.hp).toBe(614);
    expect(step('east').effect).toEqual({ kind: 'moved' });
    expect(step('east').effect).toEqual({
      kind: 'reward',
      stat: 'hp',
      amount: 10,
    });
    expect(game().player.hp).toBe(624);

    route({ x: 31, y: 19 });
    fight('south', 'floor10-east-spurlancer', 45, 26);
    expect(game().player.hp).toBe(579);
    expect(step('south').effect).toEqual({ kind: 'moved' });
    expect(step('south').effect).toEqual({
      kind: 'reward',
      stat: 'attack',
      amount: 1,
    });
    expect(game().player.attack).toBe(50);

    route({ x: 19, y: 14 });
    fight('south', 'floor10-middle-ravager', 0, 19);
    expect(game().player.hp).toBe(579);
    expect(step('south').effect).toEqual({ kind: 'moved' });

    route({ x: 20, y: 17 });
    expect(step('east').effect).toEqual({
      kind: 'reward',
      stat: 'attack',
      amount: 1,
    });
    expect(game().player.attack).toBe(51);

    route({ x: 15, y: 17 });
    expect(step('south').effect).toEqual({
      kind: 'latchOpened',
      id: 'floor10-heart-hatch',
    });
    expect(game().openedShortcutIds).toContain('floor10-heart-hatch');
    expect(step('south').effect).toEqual({ kind: 'moved' });
    expect(step('south').effect).toEqual({ kind: 'moved' });
    expect(game().tile).toEqual({ x: 15, y: 19 });
    expect(game().discoveredSectionIds).toContain('floor10-heart');

    route({ x: 14, y: 21 });
    expect(step('east').effect).toEqual({
      kind: 'reward',
      stat: 'hp',
      amount: 170,
    });
    expect(game().player.hp).toBe(749);

    route({ x: 15, y: 19 });
    fight('east', 'floor10-taproot', 130, 60);
    expect(game().player.hp).toBe(619);
    expect(step('east').effect).toEqual({ kind: 'moved' });
    expect(game().tile).toEqual({ x: 16, y: 19 });

    route({ x: 16, y: 23 });
    expect(step('west').effect).toEqual({
      kind: 'itemReward',
      itemId: 'tower-heartwood',
    });
    expect(game().itemIds).toContain('tower-heartwood');

    route({ x: 21, y: 20 });
    expect(step('north').effect).toEqual({
      kind: 'traveled',
      mapId: 'village',
    });
    expect(game().tile).toEqual({ x: 11, y: 1 });
    expect(game().discoveredSectionIds).toContain('village-tower-road');

    route({ x: 15, y: 10 });
    expect(step('north').effect).toEqual({
      kind: 'dialogue',
      speakerId: 'village-warden',
      lineId: 'warden-heartwood-ending',
    });
    expect(
      game().factIds.filter((id) => id === 'main-heartwood-returned'),
    ).toHaveLength(1);
    expect(game().factIds).toContain('main-missing-person-lead');
    expect(buildJournalView(game()).main.lead).toBe('taproot-quieted');
    expect(game().defeatedEnemyIds).toEqual([
      'floor10-middle-guard',
      'floor10-west-ambusher',
      'floor10-west-warden',
      'floor10-east-darter',
      'floor10-east-lancer',
      'floor10-east-warden',
      'floor10-east-spurlancer',
      'floor10-middle-ravager',
      'floor10-taproot',
    ]);
    expect(game().player.hp).toBe(619);
    expect(game().player.gold).toBe(277);
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
