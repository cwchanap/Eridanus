import { describe, expect, it } from 'vitest';
import {
  MAPS,
  findEntityById,
  findItemRewardByItemId,
  findSectionById,
  getActiveEntities,
  isEntityBlocking,
  isEntityPresent,
  isTileBlockedByEntity,
  validateContent,
} from './content';
import { createInitialGameState } from './state';
import { tileInDirection } from './geometry';
import { village } from './content/village';
import type {
  Entity,
  MapDefinition,
  MapId,
  NpcEntity,
  NpcId,
  Tile,
} from './types';

const entity = (id: string): Entity => {
  const found = findEntityById(id);
  if (!found) throw new Error(`missing entity: ${id}`);
  return found;
};

const npc = (id: NpcId): NpcEntity => {
  const found = entity(id);
  if (found.kind !== 'npc') throw new Error(`${id} is not an npc`);
  return found;
};

describe('runtime entity presence', () => {
  const state = createInitialGameState();

  it('keeps an npc without presence always present', () => {
    expect(isEntityPresent(npc('village-warden'), state)).toBe(true);
  });

  it('gates an npc with a known presence on the fact', () => {
    const gated: NpcEntity = {
      ...npc('village-warden'),
      presence: { factId: 'floor1-treasury-seen', when: 'known' },
    };
    expect(isEntityPresent(gated, state)).toBe(false);
    expect(
      isEntityPresent(gated, { ...state, factIds: ['floor1-treasury-seen'] }),
    ).toBe(true);
  });

  it('gates an npc with an unknown presence on the absence of the fact', () => {
    const gated: NpcEntity = {
      ...npc('village-warden'),
      presence: { factId: 'floor1-treasury-seen', when: 'unknown' },
    };
    expect(isEntityPresent(gated, state)).toBe(true);
    expect(
      isEntityPresent(gated, { ...state, factIds: ['floor1-treasury-seen'] }),
    ).toBe(false);
  });

  it('excludes defeated enemies from the active entities', () => {
    const active = getActiveEntities({
      ...state,
      mapId: 'floor1',
      defeatedEnemyIds: ['floor1-gatekeeper'],
    });
    expect(active.some((e) => e.id === 'floor1-gatekeeper')).toBe(false);
    expect(active.some((e) => e.id === 'floor1-west-sentry')).toBe(true);
  });
});

describe('isEntityBlocking', () => {
  const state = createInitialGameState();

  it('blocks an unopened reward and not an opened one', () => {
    const reward = entity('floor1-power-core');
    expect(isEntityBlocking(reward, state)).toBe(true);
    expect(
      isEntityBlocking(reward, {
        ...state,
        openedRewardIds: ['floor1-power-core'],
      }),
    ).toBe(false);
  });

  it('blocks an active enemy while a defeated enemy is inactive', () => {
    const enemy = entity('floor1-gatekeeper');
    expect(isEntityBlocking(enemy, state)).toBe(true);
    expect(
      isEntityBlocking(enemy, {
        ...state,
        defeatedEnemyIds: ['floor1-gatekeeper'],
      }),
    ).toBe(false);
  });

  it('blocks a closed latch and not an opened one', () => {
    const latch = entity('floor1-rear-latch');
    expect(isEntityBlocking(latch, state)).toBe(true);
    expect(
      isEntityBlocking(latch, {
        ...state,
        openedShortcutIds: ['floor1-rear-latch'],
      }),
    ).toBe(false);
  });

  it('blocks clues, undrunk waystones, and active npcs', () => {
    expect(isEntityBlocking(entity('floor1-route-mark'), state)).toBe(true);
    expect(isEntityBlocking(entity('village-waystone'), state)).toBe(true);
    expect(isEntityBlocking(npc('village-warden'), state)).toBe(true);
  });

  it('never blocks a portal', () => {
    expect(isEntityBlocking(entity('village-to-floor1'), state)).toBe(false);
  });

  it('rejects a save tile standing on an active npc through the tile wrapper', () => {
    expect(
      isTileBlockedByEntity(createInitialGameState(), { x: 15, y: 9 }),
    ).toBe(true);
    expect(
      isTileBlockedByEntity(createInitialGameState(), { x: 14, y: 9 }),
    ).toBe(false);
  });
});

describe('authored content', () => {
  it('defines all current maps', () => {
    expect(Object.keys(MAPS).sort()).toEqual([
      'floor1',
      'floor2',
      'floor3',
      'floor4',
      'floor5',
      'village',
    ]);
  });

  it('has no validation errors', () => {
    expect(validateContent()).toEqual([]);
  });

  it('keeps important ids resolvable', () => {
    expect(findEntityById('floor1-power-core')?.kind).toBe('reward');
    expect(findEntityById('floor1-gatekeeper')?.kind).toBe('enemy');
    expect(findEntityById('floor1-rear-latch')?.kind).toBe('latch');
    expect(findEntityById('floor3-heart-sentinel')?.kind).toBe('enemy');
    expect(findEntityById('floor5-core-guardian')?.kind).toBe('enemy');
    expect(findEntityById('floor5-restoration-core')?.kind).toBe('reward');
    expect(findEntityById('floor3-heart-shortcut')?.kind).toBe('latch');
    expect(findEntityById('floor3-heart-waystone')?.kind).toBe('reward');
    expect(findEntityById('floor3-keeper-final-record')?.kind).toBe('clue');
  });

  it('resolves the progression lookups', () => {
    expect(findItemRewardByItemId('tower-depth-sigil')?.id).toBe(
      'floor1-depth-sigil',
    );
    for (const id of [
      'floor1-upper-gallery',
      'floor2-front-landing',
      'floor2-central-hall',
      'floor2-west-archive',
      'floor2-east-service',
      'floor2-service-corridor',
      'floor2-reading-room',
    ])
      expect(findSectionById(id)?.id).toBe(id);
  });

  const tileKey = (tile: Tile): string => `${tile.x},${tile.y}`;
  const floodFloor = (
    map: MapDefinition,
    starts: readonly Tile[],
    canStand: (tile: Tile) => boolean = (tile) =>
      map.layout[tile.y]?.[tile.x] === '.',
  ): Set<string> => {
    const startTiles = starts.filter((tile) => canStand(tile));
    const startKeys = new Set(startTiles.map(tileKey));
    const portals = new Set(
      map.entities
        .filter((entity) => entity.kind === 'portal')
        .map((entity) => tileKey(entity.tile)),
    );
    const reachable = new Set<string>();
    const queue = [...startTiles];
    while (queue.length > 0) {
      const tile = queue.pop()!;
      const key = tileKey(tile);
      if (reachable.has(key)) continue;
      reachable.add(key);
      // A portal is a destination, never a corridor: an open portal carries
      // the step off the map, and a locked one refuses the step outright
      // (the player stays on the previous tile), so the flood stops there
      // either way. Arrival starts are the exception — the flood disembarks
      // from them.
      if (portals.has(key) && !startKeys.has(key)) continue;
      for (const next of [
        { x: tile.x - 1, y: tile.y },
        { x: tile.x + 1, y: tile.y },
        { x: tile.x, y: tile.y - 1 },
        { x: tile.x, y: tile.y + 1 },
      ]) {
        if (canStand(next) && !reachable.has(tileKey(next))) queue.push(next);
      }
    }
    return reachable;
  };
  const hasAdjacentApproach = (reachable: Set<string>, tile: Tile): boolean =>
    [
      { x: tile.x - 1, y: tile.y },
      { x: tile.x + 1, y: tile.y },
      { x: tile.x, y: tile.y - 1 },
      { x: tile.x, y: tile.y + 1 },
    ].some((approach) => reachable.has(tileKey(approach)));
  const portal = (id: string) => {
    const found = entity(id);
    if (found.kind !== 'portal') throw new Error(`${id} is not a portal`);
    return found;
  };
  const latch = (id: string) => {
    const found = entity(id);
    if (found.kind !== 'latch') throw new Error(`${id} is not a latch`);
    return found;
  };

  it('flood-fills the village from the initial tile', () => {
    const villageReachable = floodFloor(village, [
      createInitialGameState().tile,
    ]);
    for (const entity of village.entities) {
      expect(villageReachable.has(tileKey(entity.tile))).toBe(true);
    }
  });

  it('reaches the required floor two route through the runtime blocking rule', () => {
    // Fresh required-state snapshot: nothing opened or defeated, the missing
    // subject still present because main-subject-returned is unknown.
    const freshFloor2 = {
      ...createInitialGameState(),
      mapId: 'floor2' as const,
    };
    const flood = (state: typeof freshFloor2) =>
      floodFloor(
        MAPS.floor2,
        [portal('floor2-front-to-floor1').tile],
        (tile) =>
          MAPS.floor2.layout[tile.y]?.[tile.x] === '.' &&
          !isTileBlockedByEntity(state, tile),
      );
    const rearStair = tileKey(portal('floor2-rear-to-floor1').tile);

    // The service guard holds the way on; the ledger waits on the landing.
    const fresh = flood(freshFloor2);
    expect(
      hasAdjacentApproach(fresh, entity('floor2-paired-release-ledger').tile),
    ).toBe(true);
    expect(
      hasAdjacentApproach(fresh, entity('floor2-service-guard').tile),
    ).toBe(true);
    expect(fresh.has(rearStair)).toBe(false);

    // Past the guard and the mites up the last aisle: the rear stair, and
    // the east sentry both releases answer to.
    const serviced = {
      ...freshFloor2,
      defeatedEnemyIds: [
        'floor2-service-guard',
        'floor2-stack-mite-1',
        'floor2-stack-mite-2',
        'floor2-stack-mite-3',
      ],
    };
    const pastGuard = flood(serviced);
    expect(pastGuard.has(rearStair)).toBe(true);
    expect(
      hasAdjacentApproach(pastGuard, entity('floor2-east-sentry').tile),
    ).toBe(true);
    expect(
      hasAdjacentApproach(pastGuard, entity('floor2-missing-subject').tile),
    ).toBe(false);

    // Through the releases: the missing subject and the stair warden.
    const released = flood({
      ...serviced,
      defeatedEnemyIds: [...serviced.defeatedEnemyIds, 'floor2-east-sentry'],
      openedShortcutIds: ['floor2-west-release', 'floor2-east-release'],
    });
    expect(
      hasAdjacentApproach(released, entity('floor2-missing-subject').tile),
    ).toBe(true);
    expect(
      hasAdjacentApproach(released, entity('floor2-stair-warden').tile),
    ).toBe(true);
  });

  it('reaches the required floor three route through the runtime blocking rule', () => {
    // Fresh required-state snapshot: hatch shut, levers up, optional enemies
    // undefeated, rewards unopened, story facts already recorded.
    const freshFloor3 = {
      ...createInitialGameState(),
      mapId: 'floor3' as const,
      factIds: ['main-subject-returned', 'floor2-depth-stairs-used'],
    };
    const flood = (state: typeof freshFloor3) =>
      floodFloor(
        MAPS.floor3,
        [portal('floor3-to-floor2').tile],
        (tile) =>
          MAPS.floor3.layout[tile.y]?.[tile.x] === '.' &&
          !isTileBlockedByEntity(state, tile),
      );
    const heart = findSectionById('floor3-heart');
    expect(heart).toBeDefined();
    if (!heart) return;
    const heartTiles: Tile[] = [];
    for (let y = heart.bounds.minY; y <= heart.bounds.maxY; y++)
      for (let x = heart.bounds.minX; x <= heart.bounds.maxX; x++)
        heartTiles.push({ x, y });

    const fresh = flood(freshFloor3);
    for (const tile of heartTiles)
      expect(fresh.has(tileKey(tile)), `${tile.x},${tile.y}`).toBe(false);
    expect(
      hasAdjacentApproach(fresh, entity('floor3-vault-route-mark').tile),
    ).toBe(true);
    const vault = findSectionById('floor3-hidden-vault');
    const archive = findSectionById('floor3-keeper-archive');
    expect(vault?.bounds.maxX).toBeLessThan(6);
    expect(archive?.bounds.minX).toBeGreaterThan(15);
    expect(entity('floor3-keeper-final-record').tile.x).toBeGreaterThan(15);

    // The heart hatch is wired to three levers, one of them at the archive's
    // crown behind the archive sentry.
    const shortcut = latch('floor3-heart-shortcut');
    const leverIds = 'leverIds' in shortcut ? shortcut.leverIds : [];
    expect(leverIds).toEqual([
      'floor3-west-lever',
      'floor3-gallery-lever',
      'floor3-crown-lever',
    ]);
    const cleared = {
      ...freshFloor3,
      defeatedEnemyIds: [
        'floor3-east-prowler',
        'floor3-spine-crawler-1',
        'floor3-spine-crawler-2',
        'floor3-archive-guard',
        'floor3-archive-crawler-1',
        'floor3-archive-crawler-2',
        'floor3-archive-sentry',
      ],
      openedRewardIds: ['floor3-gallery-cache'],
    };
    const route = flood(cleared);
    for (const id of leverIds)
      expect(hasAdjacentApproach(route, entity(id).tile), id).toBe(true);
    expect(
      hasAdjacentApproach(route, entity('floor3-keeper-final-record').tile),
    ).toBe(true);
    expect(route.has(tileKey(tileInDirection(shortcut.tile, 'south')))).toBe(
      true,
    );
    for (const tile of heartTiles)
      expect(route.has(tileKey(tile)), `${tile.x},${tile.y}`).toBe(false);

    // Once opened, the hatch is the way into the Heart Approach.
    const hatchOpen = {
      ...cleared,
      openedShortcutIds: [...leverIds, shortcut.id],
    };
    const reachableOpen = flood(hatchOpen);
    expect(
      reachableOpen.has(tileKey(tileInDirection(shortcut.tile, 'north'))),
    ).toBe(true);
    expect(
      hasAdjacentApproach(reachableOpen, entity('floor3-heart-sentinel').tile),
    ).toBe(true);
    // The heart sentinel alone holds the stair down to Floor 4.
    expect(reachableOpen.has(tileKey(portal('floor3-to-floor4').tile))).toBe(
      false,
    );
    const reachableAfter = flood({
      ...hatchOpen,
      defeatedEnemyIds: [
        ...hatchOpen.defeatedEnemyIds,
        'floor3-heart-sentinel',
      ],
    });
    expect(reachableAfter.has(tileKey(portal('floor3-to-floor4').tile))).toBe(
      true,
    );
  });

  // Each deeper floor is fought through: from its arrival stair, nothing
  // defeated, the way on is out of reach; clearing the required route's
  // guards and chests opens it.
  for (const { mapId, from, to, cleared, opened } of [
    {
      mapId: 'floor4',
      from: 'floor4-to-floor3',
      to: 'floor4-to-floor5',
      cleared: [
        'floor4-west-gate-guard',
        'floor4-west-hand-1',
        'floor4-west-hand-2',
        'floor4-west-foreman',
        'floor4-west-works-cache',
        'floor4-east-gate-guard',
        'floor4-east-hand-1',
        'floor4-east-hand-2',
        'floor4-east-foreman',
        'floor4-east-works-cache',
        'floor4-forge-warden',
        'floor4-stair-warden',
      ],
      opened: ['floor4-foundry-gate'],
    },
    {
      mapId: 'floor5',
      from: 'floor5-to-floor4',
      to: 'floor5-lift-to-village',
      cleared: [
        'floor5-west-warden',
        'floor5-west-warden-cache',
        'floor5-south-gate-guard',
        'floor5-south-warden',
        'floor5-east-warden',
        'floor5-core-guardian',
        'floor5-restoration-core',
      ],
      opened: ['floor5-sanctum-seal'],
    },
  ] as const) {
    it(`gates ${mapId}'s way on behind its required fights`, () => {
      const map = MAPS[mapId];
      const flood = (ids: readonly string[], shortcuts: readonly string[]) => {
        const state = {
          ...createInitialGameState(),
          mapId,
          defeatedEnemyIds: ids,
          openedRewardIds: ids,
          openedShortcutIds: shortcuts,
        };
        return floodFloor(
          map,
          [portal(from).tile],
          (tile) =>
            map.layout[tile.y]?.[tile.x] === '.' &&
            !isTileBlockedByEntity(state, tile),
        );
      };
      expect(flood([], []).has(tileKey(portal(to).tile))).toBe(false);
      expect(flood(cleared, []).has(tileKey(portal(to).tile))).toBe(false);
      expect(flood(cleared, opened).has(tileKey(portal(to).tile))).toBe(true);
    });
  }

  it('reaches every floor five entity once the floor is cleared', () => {
    const everything = MAPS.floor5.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor5' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
    };
    const reachable = floodFloor(
      MAPS.floor5,
      [portal('floor5-to-floor4').tile],
      (tile) =>
        MAPS.floor5.layout[tile.y]?.[tile.x] === '.' &&
        !isTileBlockedByEntity(state, tile),
    );
    for (const entity of MAPS.floor5.entities)
      expect(
        reachable.has(tileKey(entity.tile)) ||
          hasAdjacentApproach(reachable, entity.tile),
        entity.id,
      ).toBe(true);
  });

  it('lets only the old shaft into the sealed blocks on floors 2 to 4', () => {
    // Fully cleared, with every hatch open except the rear latches (those
    // open only from the sealed side), no other stair reaches a shaft stair.
    for (const mapId of ['floor2', 'floor3', 'floor4'] as const) {
      const map = MAPS[mapId];
      const ids = map.entities.map(({ id }) => id);
      const state = {
        ...createInitialGameState(),
        mapId,
        defeatedEnemyIds: ids,
        openedRewardIds: ids,
        openedShortcutIds: map.entities
          .filter((entity) => !('rearSide' in entity))
          .map(({ id }) => id),
      };
      const stairs = map.entities.filter((entity) => entity.kind === 'portal');
      const isShaft = (id: string) => id.startsWith(`${mapId}-shaft-`);
      const reachable = floodFloor(
        map,
        stairs.filter(({ id }) => !isShaft(id)).map(({ tile }) => tile),
        (tile) =>
          map.layout[tile.y]?.[tile.x] === '.' &&
          !isTileBlockedByEntity(state, tile),
      );
      const shafts = stairs.filter(({ id }) => isShaft(id));
      expect(shafts.length, mapId).toBeGreaterThan(0);
      for (const shaft of shafts)
        expect(reachable.has(tileKey(shaft.tile)), shaft.id).toBe(false);
    }
    // The shaft's bottom hatch on Floor 5 answers to both vault keepers.
    const hatch = latch('floor5-shaft-hatch');
    expect('guardIds' in hatch && hatch.guardIds).toEqual([
      'floor5-west-vault-keeper',
      'floor5-east-vault-keeper',
    ]);
  });

  it('opens every latch only by clearing its guards or from another floor', () => {
    // A rear latch's rear side must lie beyond the floor's front stair:
    // walking in from it, latches shut, never reaches that side.
    const frontStair: Partial<Record<MapId, string>> = {
      floor1: 'floor1-to-village',
      floor2: 'floor2-front-to-floor1',
      floor3: 'floor3-to-floor2',
    };
    for (const map of Object.values(MAPS)) {
      for (const candidate of map.entities) {
        if (candidate.kind !== 'latch' || !('rearSide' in candidate)) continue;
        const { rearSide } = candidate;
        const front = frontStair[map.id];
        expect(front, `${map.id} front stair`).toBeDefined();
        if (!front) continue;
        const reachable = floodFloor(
          map,
          [portal(front).tile],
          (tile) =>
            map.layout[tile.y]?.[tile.x] === '.' &&
            !map.entities.some(
              (other) =>
                other.kind === 'latch' &&
                other.tile.x === tile.x &&
                other.tile.y === tile.y,
            ),
        );
        expect(
          reachable.has(tileKey(tileInDirection(candidate.tile, rearSide))),
          candidate.id,
        ).toBe(false);
      }
    }
  });

  it('keeps the treasury pocket sealed from ordinary floor one entries', () => {
    const reachable = floodFloor(MAPS.floor1, [
      portal('floor1-to-village').tile,
      portal('floor1-rear-to-floor2').tile,
    ]);
    expect(reachable.has(tileKey(entity('floor1-future-treasury').tile))).toBe(
      false,
    );
    expect(
      reachable.has(tileKey(entity('floor1-treasury-to-floor2').tile)),
    ).toBe(false);
    for (const entity of MAPS.floor1.entities) {
      if (
        entity.id === 'floor1-future-treasury' ||
        entity.id === 'floor1-treasury-to-floor2'
      )
        continue;
      expect(reachable.has(tileKey(entity.tile)), entity.id).toBe(true);
    }
  });

  it('opens the sealed treasury through the new reciprocal pocket stair', () => {
    const pocketPortal = portal('floor1-treasury-to-floor2');
    const floor2Side = portal('floor2-treasury-to-floor1');
    expect(pocketPortal.target).toEqual({
      mapId: 'floor2',
      tile: floor2Side.tile,
    });
    expect(floor2Side.target).toEqual({
      mapId: 'floor1',
      tile: pocketPortal.tile,
    });
    expect(floor2Side.factId).toBe('floor1-treasury-return-used');

    const inside = floodFloor(MAPS.floor1, [pocketPortal.tile]);
    expect(inside.has(tileKey(entity('floor1-future-treasury').tile))).toBe(
      true,
    );

    const section = findSectionById('floor1-workshop-treasury');
    if (!section) return;
    const inBounds = (tile: Tile): boolean =>
      tile.x >= section.bounds.minX &&
      tile.x <= section.bounds.maxX &&
      tile.y >= section.bounds.minY &&
      tile.y <= section.bounds.maxY;
    expect(inBounds(pocketPortal.tile)).toBe(true);
    expect(inBounds(entity('floor1-future-treasury').tile)).toBe(true);
  });
});

describe('validateContent failure branches', () => {
  // Village-only record: the real portal targets floor1 and cannot resolve in
  // a single-map record, so it is dropped and cases add their own entities.
  // floor1/floor2 are never looked up because every injected portal targets
  // 'village', so the Record cast is safe.
  const villageWith = (
    extra: readonly Entity[],
  ): Record<MapId, MapDefinition> =>
    ({
      village: {
        ...village,
        entities: [
          ...village.entities.filter((entity) => entity.kind !== 'portal'),
          ...extra,
        ],
      },
    }) as unknown as Record<MapId, MapDefinition>;

  it('flags a non-rectangular layout', () => {
    const maps = {
      ...MAPS,
      village: { ...village, layout: [...village.layout, '#####'] },
    };
    expect(validateContent(maps)).toEqual([
      'village: layout must be rectangular',
    ]);
  });

  it('flags an invalid layout tile', () => {
    const maps = {
      ...MAPS,
      village: {
        ...village,
        layout: village.layout.map((row, y) =>
          y === 1 ? `#x${row.slice(2)}` : row,
        ),
      },
    };
    expect(validateContent(maps)).toEqual([
      'village: layout contains an invalid tile',
    ]);
  });

  it('flags a trader with no offers, no price or an empty offer', () => {
    const maps = villageWith([
      {
        kind: 'trader',
        id: 'bad-trader',
        tile: { x: 9, y: 3 },
        offers: [],
        basePrice: 0,
        priceStep: 5,
      },
      {
        kind: 'trader',
        id: 'bad-offer-trader',
        tile: { x: 10, y: 3 },
        offers: [{ stat: 'attack', amount: 0 }],
        basePrice: 5,
        priceStep: 5,
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'bad-trader: trader has no offers',
      'bad-trader: base price must be positive',
      'bad-offer-trader: offer amounts must be positive',
    ]);
  });

  it('flags a duplicate entity id', () => {
    const maps = villageWith([
      {
        kind: 'clue',
        id: 'village-waystone',
        tile: { x: 9, y: 3 },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'duplicate entity id: village-waystone',
    ]);
  });

  it('flags stacked entities on the same tile', () => {
    const maps = villageWith([
      {
        kind: 'clue',
        id: 'stacked-clue',
        tile: { x: 16, y: 8 },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'stacked-clue: entity tile already occupied',
    ]);
  });

  it('flags an entity standing on a wall', () => {
    const maps = villageWith([
      {
        kind: 'clue',
        id: 'wall-clue',
        tile: { x: 0, y: 1 },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'wall-clue: entity tile must be floor',
    ]);
  });

  it('flags a portal targeting a wall', () => {
    // (0,0) of the village layout is a wall.
    const maps = villageWith([
      {
        kind: 'portal',
        id: 'village-to-floor1',
        tile: { x: 23, y: 1 },
        target: { mapId: 'village', tile: { x: 0, y: 0 } },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'village-to-floor1: portal target must be floor',
    ]);
  });

  it('flags a non-reciprocal portal', () => {
    const maps = villageWith([
      {
        kind: 'portal',
        id: 'village-to-floor1',
        tile: { x: 23, y: 1 },
        target: { mapId: 'village', tile: { x: 9, y: 3 } },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'village-to-floor1: reciprocal portal missing',
    ]);
  });

  it('flags a duplicate section id', () => {
    const maps = {
      ...MAPS,
      village: {
        ...village,
        sections: [...village.sections, { ...village.sections[0]! }],
      },
    };
    expect(validateContent(maps)).toEqual([
      'duplicate section id: village-square',
    ]);
  });

  it('flags inverted section bounds', () => {
    const maps = {
      ...MAPS,
      village: {
        ...village,
        sections: [
          {
            id: 'village-square',
            name: 'Village Square',
            bounds: { minX: 10, maxX: 1, minY: 1, maxY: 6 },
          },
        ],
      },
    };
    expect(validateContent(maps)).toEqual([
      'village-square: section bounds are inverted',
      expect.stringContaining('village: floor tiles not covered by a section'),
    ]);
  });

  it('flags an uncovered floor tile', () => {
    const maps = {
      ...MAPS,
      village: {
        ...village,
        sections: village.sections.map((section) =>
          section.id === 'village-barrow-path'
            ? { ...section, bounds: { ...section.bounds, minX: 2 } }
            : section,
        ),
      },
    };
    expect(validateContent(maps)).toEqual([
      'village: floor tiles not covered by a section: 1,17, 1,18, 1,19',
    ]);
  });

  it('flags village-square bounds excluding the initial tile', () => {
    const maps = {
      ...MAPS,
      village: {
        ...village,
        sections: village.sections.map((section) => {
          if (section.id === 'village-square')
            return { ...section, bounds: { ...section.bounds, maxX: 14 } };
          if (section.id === 'village-crypt-lane')
            return { ...section, bounds: { ...section.bounds, minX: 15 } };
          return section;
        }),
      },
    };
    expect(validateContent(maps)).toEqual([
      'village-square: section bounds exclude the initial tile',
    ]);
  });

  it('flags an unknown fact id on a clue', () => {
    const maps = villageWith([
      {
        kind: 'clue',
        id: 'typo-clue',
        tile: { x: 9, y: 3 },
        factId: 'not-a-fact',
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'typo-clue: unknown fact id: not-a-fact',
    ]);
  });

  it('flags a guarded latch whose guard is not an enemy on its map', () => {
    const maps = villageWith([
      {
        kind: 'latch',
        id: 'typo-latch',
        tile: { x: 9, y: 3 },
        guardIds: ['village-warden', 'floor3-archive-sentry'],
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'typo-latch: guard village-warden is not an enemy here',
      'typo-latch: guard floor3-archive-sentry is not an enemy here',
    ]);
  });

  it('flags a guarded latch without guards', () => {
    const maps = villageWith([
      { kind: 'latch', id: 'bare-latch', tile: { x: 9, y: 3 }, guardIds: [] },
    ]);
    expect(validateContent(maps)).toEqual([
      'bare-latch: guarded latch has no guards',
    ]);
  });

  it('flags an unknown lock item id', () => {
    const maps = villageWith([
      {
        kind: 'portal',
        id: 'village-to-floor1',
        tile: { x: 23, y: 1 },
        target: { mapId: 'village', tile: { x: 9, y: 3 } },
        lock: {
          kind: 'item',
          requiresItemId: 'no-such-item',
          lockedFactId: 'main-missing-person-lead',
        },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'village-to-floor1: unknown lock item id: no-such-item',
      'village-to-floor1: reciprocal portal missing',
    ]);
  });

  it('flags an unknown lock fact id', () => {
    const maps = villageWith([
      {
        kind: 'portal',
        id: 'fact-locked-portal',
        tile: { x: 8, y: 3 },
        target: { mapId: 'village', tile: { x: 9, y: 3 } },
        lock: {
          kind: 'fact',
          requiresFactId: 'not-a-fact',
          lockedFactId: 'main-missing-person-lead',
        },
      },
      {
        kind: 'portal',
        id: 'fact-locked-portal-back',
        tile: { x: 9, y: 3 },
        target: { mapId: 'village', tile: { x: 8, y: 3 } },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'fact-locked-portal: unknown lock requirement fact id: not-a-fact',
    ]);
  });

  it('flags an unknown locked fact id', () => {
    const maps = villageWith([
      {
        kind: 'portal',
        id: 'fact-locked-portal',
        tile: { x: 8, y: 3 },
        target: { mapId: 'village', tile: { x: 9, y: 3 } },
        lock: {
          kind: 'fact',
          requiresFactId: 'main-missing-person-lead',
          lockedFactId: 'not-a-fact',
        },
      },
      {
        kind: 'portal',
        id: 'fact-locked-portal-back',
        tile: { x: 9, y: 3 },
        target: { mapId: 'village', tile: { x: 8, y: 3 } },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'fact-locked-portal: unknown locked fact id: not-a-fact',
    ]);
  });

  it('flags an npc presence fact that does not exist', () => {
    const maps = {
      ...MAPS,
      village: {
        ...village,
        entities: village.entities.map((e) =>
          e.kind === 'npc' && e.id === 'village-warden'
            ? {
                ...e,
                presence: { factId: 'not-a-fact', when: 'known' } as const,
              }
            : e,
        ),
      },
    };
    expect(validateContent(maps)).toEqual([
      'village-warden: unknown presence fact id: not-a-fact',
    ]);
  });

  it('flags a duplicate item id', () => {
    const maps: Record<MapId, MapDefinition> = {
      ...MAPS,
      floor1: {
        ...MAPS.floor1,
        entities: [
          ...MAPS.floor1.entities,
          {
            kind: 'reward',
            id: 'floor1-duplicate-sigil',
            tile: { x: 13, y: 14 },
            assetId: 'chest-relic-closed',
            grant: 'item',
            itemId: 'tower-depth-sigil',
          },
        ],
      },
    };
    expect(validateContent(maps)).toEqual([
      'duplicate item id: tower-depth-sigil',
    ]);
  });
});
