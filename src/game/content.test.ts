import { describe, expect, it } from 'vitest';
import {
  MAPS,
  findEntityById,
  findItemRewardByItemId,
  findSectionById,
  findSectionsAt,
  getActiveEntities,
  isEntityBlocking,
  isEntityPresent,
  isTileBlockedByEntity,
  validateContent,
} from './content';
import { equippedWares } from './equipment';
import { createInitialGameState } from './state';
import { tileInDirection } from './geometry';
import { village } from './content/village';
import type {
  EnemyEntity,
  Entity,
  MapDefinition,
  MapId,
  NpcEntity,
  NpcId,
  PortalEntity,
  RewardEntity,
  ShopEntity,
  Stat,
  Tile,
  TraderEntity,
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
      'floor10',
      'floor2',
      'floor3',
      'floor4',
      'floor5',
      'floor6',
      'floor7',
      'floor8',
      'floor9',
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
    canCross?: (portal: PortalEntity) => boolean,
  ): Set<string> => {
    const startTiles = starts.filter((tile) => canStand(tile));
    const arrivals = new Set(startTiles.map(tileKey));
    const portals = new Map(
      map.entities
        .filter((entity): entity is PortalEntity => entity.kind === 'portal')
        .map((entity) => [tileKey(entity.tile), entity]),
    );
    const reachable = new Set<string>();
    const disembarked = new Set<string>();
    const queue = [...startTiles];
    while (queue.length > 0) {
      const tile = queue.pop()!;
      const key = tileKey(tile);
      const isArrival = arrivals.has(key);
      if (reachable.has(key) && (!isArrival || disembarked.has(key))) continue;
      reachable.add(key);
      const portal = portals.get(key);
      // A portal is a destination, never a corridor: an open portal carries
      // the step off the map, and a locked one refuses the step outright
      // (the player stays on the previous tile), so the flood stops there
      // either way. Arrival starts are the exception — the flood disembarks
      // from them.
      if (portal) {
        const twin = portal.target.tile;
        if (
          canCross?.(portal) &&
          portal.target.mapId === map.id &&
          canStand(twin) &&
          !arrivals.has(tileKey(twin))
        ) {
          arrivals.add(tileKey(twin));
          queue.push(twin);
        }
        if (!isArrival) continue;
      }
      disembarked.add(key);
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

  it('places the deep stair and the moved waystone in the floor five sanctum', () => {
    expect(entity('floor5-heart-waystone').tile).toEqual({ x: 10, y: 9 });
    const stair = portal('floor5-depth-to-floor6');
    expect(stair.tile).toEqual({ x: 11, y: 9 });
    expect(stair.target).toEqual({
      mapId: 'floor6',
      tile: { x: 5, y: 15 },
    });
    expect(stair.lock).toEqual({
      kind: 'fact',
      requiresFactId: 'main-village-restored',
      lockedFactId: 'floor5-deep-stair-seen',
    });
    expect(portal('floor6-to-floor5').target).toEqual({
      mapId: 'floor5',
      tile: { x: 11, y: 9 },
    });
  });

  it('pairs every floor six sluice pad with its twin tank', () => {
    const pads = MAPS.floor6.entities.filter(
      (entity): entity is PortalEntity =>
        entity.kind === 'portal' && entity.id.endsWith('-pad'),
    );
    expect(pads).toHaveLength(16);
    for (const pad of pads) {
      expect(pad.target.mapId, pad.id).toBe('floor6');
      const twin = MAPS.floor6.entities.find(
        (other) =>
          other.tile.x === pad.target.tile.x &&
          other.tile.y === pad.target.tile.y,
      );
      expect(twin?.kind, pad.id).toBe('portal');
      if (twin?.kind !== 'portal') continue;
      expect(twin.target, pad.id).toEqual({
        mapId: 'floor6',
        tile: pad.tile,
      });
    }
  });

  it('labels each floor six pad and the stair with its own tank only', () => {
    const homeByEntity: Record<string, string> = {
      'floor6-to-floor5': 'floor6-inlet',
      'floor6-inlet-pad': 'floor6-inlet',
      'floor6-north-tank-pad': 'floor6-north-tank',
      'floor6-inlet-east-pad': 'floor6-inlet',
      'floor6-settling-west-pad': 'floor6-settling-tank',
      'floor6-settling-north-pad': 'floor6-settling-tank',
      'floor6-sluice-south-pad': 'floor6-sluice-house',
      'floor6-settling-south-pad': 'floor6-settling-tank',
      'floor6-south-north-pad': 'floor6-south-tank',
      'floor6-south-west-pad': 'floor6-south-tank',
      'floor6-silt-pad': 'floor6-silt-pit',
      'floor6-south-east-pad': 'floor6-south-tank',
      'floor6-pump-west-pad': 'floor6-pump-room',
      'floor6-pump-north-pad': 'floor6-pump-room',
      'floor6-east-tank-pad': 'floor6-east-tank',
      'floor6-sluice-east-pad': 'floor6-sluice-house',
      'floor6-outflow-pad': 'floor6-outflow',
    };
    for (const [id, home] of Object.entries(homeByEntity))
      expect(
        findSectionsAt('floor6', entity(id).tile).map(({ id }) => id),
        id,
      ).toEqual([home]);
  });

  it('places every floor six floor tile in exactly one section', () => {
    for (let y = 0; y < MAPS.floor6.layout.length; y++) {
      const row = MAPS.floor6.layout[y]!;
      for (let x = 0; x < row.length; x++)
        if (row[x] === '.')
          expect(findSectionsAt('floor6', { x, y }).length, `${x},${y}`).toBe(
            1,
          );
    }
  });

  it('confines the floor six flood to the inlet without the sluice pads', () => {
    const everything = MAPS.floor6.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor6' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
    };
    const reachable = floodFloor(
      MAPS.floor6,
      [portal('floor6-to-floor5').tile],
      (tile) =>
        MAPS.floor6.layout[tile.y]?.[tile.x] === '.' &&
        !isTileBlockedByEntity(state, tile),
    );
    const inletIds = [
      'floor6-inlet-pad',
      'floor6-inlet-east-pad',
      'floor6-to-floor5',
      'floor6-inlet-waystone',
      'floor6-pad-notice',
      'floor6-inlet-mite',
      'floor6-inlet-cache',
      'floor6-inlet-guard',
      'floor6-inlet-darter',
    ];
    for (const entity of MAPS.floor6.entities) {
      const found =
        entity.kind === 'clue'
          ? [
              { x: entity.tile.x - 1, y: entity.tile.y },
              { x: entity.tile.x + 1, y: entity.tile.y },
              { x: entity.tile.x, y: entity.tile.y - 1 },
              { x: entity.tile.x, y: entity.tile.y + 1 },
            ].some((tile) => reachable.has(tileKey(tile)))
          : reachable.has(tileKey(entity.tile));
      expect(found, entity.id).toBe(inletIds.includes(entity.id));
    }
  });

  it('reaches all nine floor six tanks through the unlocked sluice pads', () => {
    const everything = MAPS.floor6.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor6' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
      factIds: ['main-village-restored'],
    };
    const reachable = floodFloor(
      MAPS.floor6,
      [portal('floor6-to-floor5').tile],
      (tile) =>
        MAPS.floor6.layout[tile.y]?.[tile.x] === '.' &&
        !isTileBlockedByEntity(state, tile),
      (portal) =>
        !portal.lock ||
        (portal.lock.kind === 'fact'
          ? state.factIds.includes(portal.lock.requiresFactId)
          : state.itemIds.includes(portal.lock.requiresItemId)),
    );
    for (const entity of MAPS.floor6.entities) {
      const found =
        entity.kind === 'clue'
          ? [
              { x: entity.tile.x - 1, y: entity.tile.y },
              { x: entity.tile.x + 1, y: entity.tile.y },
              { x: entity.tile.x, y: entity.tile.y - 1 },
              { x: entity.tile.x, y: entity.tile.y + 1 },
            ].some((tile) => reachable.has(tileKey(tile)))
          : reachable.has(tileKey(entity.tile));
      expect(found, entity.id).toBe(true);
    }
    expect(MAPS.floor6.sections).toHaveLength(9);
  });

  it('keeps a tank sealed off when its sluice pad is locked', () => {
    const sealed: MapDefinition = {
      ...MAPS.floor6,
      entities: MAPS.floor6.entities.map((entity) =>
        entity.id === 'floor6-inlet-pad' && entity.kind === 'portal'
          ? {
              ...entity,
              lock: {
                kind: 'fact' as const,
                requiresFactId: 'main-village-restored',
                lockedFactId: 'floor5-deep-stair-seen',
              },
            }
          : entity,
      ),
    };
    const everything = MAPS.floor6.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor6' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
      factIds: [] as readonly string[],
    };
    const canStand = (tile: Tile) =>
      sealed.layout[tile.y]?.[tile.x] === '.' &&
      !isTileBlockedByEntity(state, tile);
    const padCrossable = (portal: PortalEntity) =>
      !portal.lock ||
      (portal.lock.kind === 'fact'
        ? state.factIds.includes(portal.lock.requiresFactId)
        : state.itemIds.includes(portal.lock.requiresItemId));
    const reachable = floodFloor(
      sealed,
      [portal('floor6-to-floor5').tile],
      canStand,
      padCrossable,
    );
    for (const id of [
      'floor6-north-tank-pad',
      'floor6-north-darter',
      'floor6-north-mite',
      'floor6-north-cache',
      'floor6-north-store',
    ])
      expect(reachable.has(tileKey(entity(id).tile)), id).toBe(false);
    for (const id of [
      'floor6-outflow-sentinel',
      'floor6-sluice-waystone',
      'floor6-silt-cache',
      'floor6-pump-warden',
      'floor6-east-twinblade',
      'floor6-south-ambusher',
      'floor6-settling-bulwark',
    ])
      expect(reachable.has(tileKey(entity(id).tile)), id).toBe(true);
  });

  it('pairs the floor six descent stair with the floor seven arrival', () => {
    const stair = portal('floor6-to-floor7');
    expect(stair.tile).toEqual({ x: 29, y: 5 });
    expect(stair.target).toEqual({
      mapId: 'floor7',
      tile: { x: 1, y: 1 },
    });
    expect(stair.factId).toBe('floor6-depth-stairs-used');
    const arrival = portal('floor7-to-floor6');
    expect(arrival.tile).toEqual({ x: 1, y: 1 });
    expect(arrival.target).toEqual({
      mapId: 'floor6',
      tile: { x: 29, y: 5 },
    });
  });

  it('labels each floor seven threshold with its own area only', () => {
    const homeByEntity: Record<string, string> = {
      'floor7-to-floor6': 'floor7-north-west-wing',
      'floor7-wing-guard': 'floor7-north-west-wing',
      'floor7-north-east-bulwark': 'floor7-north-east-wing',
      'floor7-south-west-bulwark': 'floor7-south-west-wing',
      'floor7-south-east-door-guard': 'floor7-south-east-wing',
      'floor7-reliquary-hatch': 'floor7-reliquary',
    };
    for (const [id, home] of Object.entries(homeByEntity))
      expect(
        findSectionsAt('floor7', entity(id).tile).map(({ id }) => id),
        id,
      ).toEqual([home]);
  });

  it('places every floor seven floor tile in exactly one section', () => {
    for (let y = 0; y < MAPS.floor7.layout.length; y++) {
      const row = MAPS.floor7.layout[y]!;
      for (let x = 0; x < row.length; x++)
        if (row[x] === '.')
          expect(findSectionsAt('floor7', { x, y }).length, `${x},${y}`).toBe(
            1,
          );
    }
  });

  it('gates the floor seven reliquary behind its required fights', () => {
    const map = MAPS.floor7;
    const flood = (ids: readonly string[], shortcuts: readonly string[]) => {
      const state = {
        ...createInitialGameState(),
        mapId: 'floor7' as const,
        defeatedEnemyIds: ids,
        openedRewardIds: ids,
        openedShortcutIds: shortcuts,
      };
      return floodFloor(
        map,
        [portal('floor7-to-floor6').tile],
        (tile) =>
          map.layout[tile.y]?.[tile.x] === '.' &&
          !isTileBlockedByEntity(state, tile),
      );
    };
    const reliquary = tileKey({ x: 15, y: 17 });
    const cleared = [
      'floor7-wing-guard',
      'floor7-south-east-door-guard',
      'floor7-south-east-warden',
    ];
    expect(flood([], []).has(reliquary)).toBe(false);
    expect(flood(cleared, []).has(reliquary)).toBe(false);
    expect(flood(cleared, ['floor7-reliquary-hatch']).has(reliquary)).toBe(
      true,
    );
  });

  it('reaches every floor seven entity once the floor is cleared', () => {
    const everything = MAPS.floor7.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor7' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
    };
    const reachable = floodFloor(
      MAPS.floor7,
      [portal('floor7-to-floor6').tile],
      (tile) =>
        MAPS.floor7.layout[tile.y]?.[tile.x] === '.' &&
        !isTileBlockedByEntity(state, tile),
    );
    for (const entity of MAPS.floor7.entities) {
      const found =
        entity.kind === 'clue' || entity.kind === 'lever'
          ? hasAdjacentApproach(reachable, entity.tile)
          : reachable.has(tileKey(entity.tile));
      expect(found, entity.id).toBe(true);
    }
    expect(MAPS.floor7.sections).toHaveLength(6);
  });

  it('pairs the floor seven descent stair with the floor eight arrival', () => {
    const stair = portal('floor7-to-floor8');
    expect(stair.tile).toEqual({ x: 15, y: 17 });
    expect(stair.target).toEqual({
      mapId: 'floor8',
      tile: { x: 3, y: 1 },
    });
    expect(stair.factId).toBe('floor7-depth-stairs-used');
    const arrival = portal('floor8-to-floor7');
    expect(arrival.tile).toEqual({ x: 3, y: 1 });
    expect(arrival.target).toEqual({
      mapId: 'floor7',
      tile: { x: 15, y: 17 },
    });
  });

  it('pairs the rift stairs and the underpass with their twins', () => {
    const locked = portal('floor8-to-floor9');
    expect(locked.tile).toEqual({ x: 3, y: 15 });
    expect(locked.target).toEqual({
      mapId: 'floor9',
      tile: { x: 1, y: 5 },
    });
    expect(locked.lock).toEqual({
      kind: 'item',
      requiresItemId: 'rift-key',
      lockedFactId: 'floor8-depth-seal-seen',
    });
    expect(locked.factId).toBe('floor8-depth-stairs-used');
    const back = portal('floor9-to-floor8');
    expect(back.tile).toEqual({ x: 1, y: 5 });
    expect(back.target).toEqual({
      mapId: 'floor8',
      tile: { x: 3, y: 15 },
    });
    const west = portal('floor8-to-landing');
    expect(west.tile).toEqual({ x: 9, y: 21 });
    expect(west.target).toEqual({
      mapId: 'floor9',
      tile: { x: 1, y: 3 },
    });
    const westBack = portal('floor9-underpass-west');
    expect(westBack.tile).toEqual({ x: 1, y: 3 });
    expect(westBack.target).toEqual({
      mapId: 'floor8',
      tile: { x: 9, y: 21 },
    });
    const east = portal('floor8-from-landing');
    expect(east.tile).toEqual({ x: 31, y: 1 });
    expect(east.target).toEqual({
      mapId: 'floor9',
      tile: { x: 5, y: 1 },
    });
    const eastBack = portal('floor9-underpass-east');
    expect(eastBack.tile).toEqual({ x: 5, y: 1 });
    expect(eastBack.target).toEqual({
      mapId: 'floor8',
      tile: { x: 31, y: 1 },
    });
  });

  it('labels each floor eight threshold with its own area only', () => {
    const homeByEntity: Record<string, string> = {
      'floor8-to-floor7': 'floor8-west-tangle',
      'floor8-west-waystone': 'floor8-west-tangle',
      'floor8-west-lancer': 'floor8-west-tangle',
      'floor8-to-floor9': 'floor8-lower-tangle',
      'floor8-to-landing': 'floor8-lower-tangle',
      'floor8-bridge-gate': 'floor8-rift-bridge',
      'floor8-from-landing': 'floor8-east-gallery',
      'floor8-rift-key': 'floor8-east-gallery',
    };
    for (const [id, home] of Object.entries(homeByEntity))
      expect(
        findSectionsAt('floor8', entity(id).tile).map(({ id }) => id),
        id,
      ).toEqual([home]);
  });

  it('labels each floor nine threshold with its own area only', () => {
    const homeByEntity: Record<string, string> = {
      'floor9-underpass-west': 'floor9-underpass',
      'floor9-underpass-east': 'floor9-underpass',
      'floor9-to-floor8': 'floor9-top-band',
      'floor9-crossings-notice': 'floor9-top-band',
      'floor9-top-ravager': 'floor9-top-band',
      'floor9-middle-waystone': 'floor9-middle-band',
      'floor9-middle-ambusher': 'floor9-middle-band',
      'floor9-bottom-waystone': 'floor9-bottom-band',
      'floor9-crossways-warden': 'floor9-bottom-band',
    };
    for (const [id, home] of Object.entries(homeByEntity))
      expect(
        findSectionsAt('floor9', entity(id).tile).map(({ id }) => id),
        id,
      ).toEqual([home]);
  });

  it('places every floor eight floor tile in exactly one section', () => {
    for (let y = 0; y < MAPS.floor8.layout.length; y++) {
      const row = MAPS.floor8.layout[y]!;
      for (let x = 0; x < row.length; x++)
        if (row[x] === '.')
          expect(findSectionsAt('floor8', { x, y }).length, `${x},${y}`).toBe(
            1,
          );
    }
  });

  it('places every floor nine floor tile in exactly one section', () => {
    for (let y = 0; y < MAPS.floor9.layout.length; y++) {
      const row = MAPS.floor9.layout[y]!;
      for (let x = 0; x < row.length; x++)
        if (row[x] === '.')
          expect(findSectionsAt('floor9', { x, y }).length, `${x},${y}`).toBe(
            1,
          );
    }
  });

  it('gates the floor eight underpass stair behind its required fights', () => {
    const map = MAPS.floor8;
    const flood = (ids: readonly string[]) => {
      const state = {
        ...createInitialGameState(),
        mapId: 'floor8' as const,
        defeatedEnemyIds: ids,
        openedRewardIds: ids,
        openedShortcutIds: ids,
      };
      return floodFloor(
        map,
        [portal('floor8-to-floor7').tile],
        (tile) =>
          map.layout[tile.y]?.[tile.x] === '.' &&
          !isTileBlockedByEntity(state, tile),
      );
    };
    const stairApproach = tileKey({ x: 4, y: 15 });
    const landing = tileKey(portal('floor8-to-landing').tile);
    expect(flood([]).has(stairApproach)).toBe(false);
    expect(flood([]).has(landing)).toBe(false);
    expect(flood(['floor8-west-lancer']).has(stairApproach)).toBe(true);
    expect(flood(['floor8-west-lancer']).has(landing)).toBe(false);
    expect(
      flood(['floor8-west-lancer', 'floor8-stair-guard']).has(landing),
    ).toBe(true);
  });

  it('holds the floor eight east half beyond the barred bridge', () => {
    const map = MAPS.floor8;
    const flood = (shortcuts: readonly string[]) => {
      const everything = map.entities.map(({ id }) => id);
      const state = {
        ...createInitialGameState(),
        mapId: 'floor8' as const,
        defeatedEnemyIds: everything,
        openedRewardIds: everything,
        openedShortcutIds: shortcuts,
      };
      return floodFloor(
        map,
        [portal('floor8-to-floor7').tile],
        (tile) =>
          map.layout[tile.y]?.[tile.x] === '.' &&
          !isTileBlockedByEntity(state, tile),
      );
    };
    const eastTiles = [
      'floor8-from-landing',
      'floor8-east-waystone',
      'floor8-rift-knight',
      'floor8-rift-key',
      'floor8-gallery-warden',
      'floor8-gallery-guard',
    ].map((id) => tileKey(entity(id).tile));
    const barred = flood(
      map.entities
        .filter(({ id }) => id !== 'floor8-bridge-gate')
        .map(({ id }) => id),
    );
    for (const tile of eastTiles) expect(barred.has(tile), tile).toBe(false);
    const open = flood(
      map.entities
        .filter(({ id }) => id !== 'floor8-bridge-gate')
        .map(({ id }) => id)
        .concat('floor8-bridge-gate'),
    );
    for (const tile of eastTiles) expect(open.has(tile), tile).toBe(true);
  });

  it('reaches every floor eight entity once the floor is cleared', () => {
    const everything = MAPS.floor8.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor8' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
    };
    const reachable = floodFloor(
      MAPS.floor8,
      [portal('floor8-to-floor7').tile, portal('floor8-from-landing').tile],
      (tile) =>
        MAPS.floor8.layout[tile.y]?.[tile.x] === '.' &&
        !isTileBlockedByEntity(state, tile),
    );
    for (const entity of MAPS.floor8.entities) {
      const found =
        entity.kind === 'clue'
          ? hasAdjacentApproach(reachable, entity.tile)
          : reachable.has(tileKey(entity.tile));
      expect(found, entity.id).toBe(true);
    }
    expect(MAPS.floor8.sections).toHaveLength(4);
  });

  it('crosses each floor nine band through any one of its three guards', () => {
    const map = MAPS.floor9;
    const flood = (ids: readonly string[]) => {
      const state = {
        ...createInitialGameState(),
        mapId: 'floor9' as const,
        defeatedEnemyIds: ids,
        openedRewardIds: ids,
        openedShortcutIds: ids,
      };
      return floodFloor(
        map,
        [portal('floor9-to-floor8').tile],
        (tile) =>
          map.layout[tile.y]?.[tile.x] === '.' &&
          !isTileBlockedByEntity(state, tile),
      );
    };
    const middle = tileKey({ x: 1, y: 11 });
    const bottom = tileKey({ x: 3, y: 20 });
    const descent = tileKey({ x: 25, y: 17 });
    expect(flood([]).has(middle)).toBe(false);
    for (const crossing of [
      'floor9-top-bulwark',
      'floor9-top-darter',
      'floor9-top-ravager',
    ])
      expect(flood([crossing]).has(middle), crossing).toBe(true);
    expect(flood(['floor9-top-ravager']).has(bottom)).toBe(false);
    for (const crossing of [
      'floor9-middle-ambusher',
      'floor9-middle-twin-crossing',
      'floor9-middle-lancer',
    ]) {
      expect(
        flood(['floor9-top-ravager', crossing]).has(bottom),
        crossing,
      ).toBe(true);
      expect(
        flood(['floor9-top-ravager', crossing]).has(descent),
        `${crossing} without the warden`,
      ).toBe(false);
      expect(
        flood(['floor9-top-ravager', crossing, 'floor9-crossways-warden']).has(
          descent,
        ),
        `${crossing} with the warden`,
      ).toBe(true);
    }
  });

  it('seals the floor nine underpass off from the crossways', () => {
    const everything = MAPS.floor9.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor9' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
    };
    const canStand = (tile: Tile) =>
      MAPS.floor9.layout[tile.y]?.[tile.x] === '.' &&
      !isTileBlockedByEntity(state, tile);
    const main = floodFloor(
      MAPS.floor9,
      [portal('floor9-to-floor8').tile],
      canStand,
    );
    for (const id of ['floor9-underpass-west', 'floor9-underpass-east'])
      expect(main.has(tileKey(portal(id).tile)), id).toBe(false);
    const strip = floodFloor(
      MAPS.floor9,
      [portal('floor9-underpass-west').tile],
      canStand,
    );
    expect(strip.has(tileKey(portal('floor9-underpass-east').tile))).toBe(true);
    expect(strip.has(tileKey(portal('floor9-to-floor8').tile))).toBe(false);
  });

  it('reaches every floor nine entity once the floor is cleared', () => {
    const everything = MAPS.floor9.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor9' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
    };
    const canStand = (tile: Tile) =>
      MAPS.floor9.layout[tile.y]?.[tile.x] === '.' &&
      !isTileBlockedByEntity(state, tile);
    const main = floodFloor(
      MAPS.floor9,
      [portal('floor9-to-floor8').tile],
      canStand,
    );
    const strip = floodFloor(
      MAPS.floor9,
      [portal('floor9-underpass-west').tile],
      canStand,
    );
    const underpass = new Set([
      'floor9-underpass-west',
      'floor9-underpass-east',
    ]);
    for (const entity of MAPS.floor9.entities) {
      const source = underpass.has(entity.id) ? strip : main;
      const found =
        entity.kind === 'clue'
          ? hasAdjacentApproach(source, entity.tile)
          : source.has(tileKey(entity.tile));
      expect(found, entity.id).toBe(true);
    }
    expect(MAPS.floor9.sections).toHaveLength(4);
  });

  it('pairs the floor nine descent stair with the floor ten arrival', () => {
    const stair = portal('floor9-to-floor10');
    expect(stair.tile).toEqual({ x: 25, y: 17 });
    expect(stair.target).toEqual({
      mapId: 'floor10',
      tile: { x: 15, y: 1 },
    });
    expect(stair.factId).toBe('floor9-depth-stairs-used');
    const arrival = portal('floor10-to-floor9');
    expect(arrival.tile).toEqual({ x: 15, y: 1 });
    expect(arrival.target).toEqual({
      mapId: 'floor9',
      tile: { x: 25, y: 17 },
    });
  });

  it('pairs the heartwood lift between floor ten and the village', () => {
    const lift = portal('village-lift-to-floor10');
    expect(lift.tile).toEqual({ x: 11, y: 1 });
    expect(lift.target).toEqual({
      mapId: 'floor10',
      tile: { x: 21, y: 19 },
    });
    expect(lift.lock).toEqual({
      kind: 'item',
      requiresItemId: 'tower-heartwood',
      lockedFactId: 'village-heartwood-lift-seen',
    });
    const back = portal('floor10-lift-to-village');
    expect(back.tile).toEqual({ x: 21, y: 19 });
    expect(back.lock).toBeUndefined();
    expect(back.target).toEqual({
      mapId: 'village',
      tile: { x: 11, y: 1 },
    });
  });

  it('labels each floor ten threshold with its own area only', () => {
    const homeByEntity: Record<string, string> = {
      'floor10-to-floor9': 'floor10-trunk',
      'floor10-taproot-notice': 'floor10-upper-roots',
      'floor10-heart-hatch': 'floor10-trunk',
      'floor10-middle-cache': 'floor10-middle-root',
      'floor10-west-waystone': 'floor10-west-root',
      'floor10-east-waystone': 'floor10-east-root',
      'floor10-heart-waystone': 'floor10-heart',
      'floor10-taproot': 'floor10-heart',
      'floor10-heartwood': 'floor10-heart',
      'floor10-lift-to-village': 'floor10-heart',
    };
    for (const [id, home] of Object.entries(homeByEntity))
      expect(
        findSectionsAt('floor10', entity(id).tile).map(({ id }) => id),
        id,
      ).toEqual([home]);
  });

  it('places every floor ten floor tile in exactly one section', () => {
    for (let y = 0; y < MAPS.floor10.layout.length; y++) {
      const row = MAPS.floor10.layout[y]!;
      for (let x = 0; x < row.length; x++)
        if (row[x] === '.')
          expect(findSectionsAt('floor10', { x, y }).length, `${x},${y}`).toBe(
            1,
          );
    }
  });

  it('hangs the floor ten heart hatch on both root wardens', () => {
    const hatch = latch('floor10-heart-hatch');
    expect(hatch.tile).toEqual({ x: 15, y: 18 });
    expect('guardIds' in hatch && hatch.guardIds).toEqual([
      'floor10-west-warden',
      'floor10-east-warden',
    ]);
    const taproot = entity('floor10-taproot');
    if (taproot.kind !== 'enemy') throw new Error('floor10-taproot missing');
    expect(taproot.stats).toEqual({
      hp: 96,
      attack: 59,
      defense: 41,
      agility: 3,
      firstStrike: true,
      pierce: 4,
    });
    expect(findItemRewardByItemId('tower-heartwood')?.id).toBe(
      'floor10-heartwood',
    );
  });

  it('holds the floor ten heart until both wardens fall and the hatch opens', () => {
    const map = MAPS.floor10;
    const flood = (ids: readonly string[]) => {
      const state = {
        ...createInitialGameState(),
        mapId: 'floor10' as const,
        defeatedEnemyIds: ids,
        openedRewardIds: ids,
        openedShortcutIds: ids,
      };
      return floodFloor(
        map,
        [portal('floor10-to-floor9').tile],
        (tile) =>
          map.layout[tile.y]?.[tile.x] === '.' &&
          !isTileBlockedByEntity(state, tile),
      );
    };
    const heart = [
      'floor10-heart-waystone',
      'floor10-taproot',
      'floor10-heartwood',
      'floor10-lift-to-village',
    ].map((id) => tileKey(entity(id).tile));
    const clearedOutside = map.entities
      .map(({ id }) => id)
      .filter((id) => id !== 'floor10-heart-hatch');
    const barred = flood(clearedOutside);
    for (const tile of heart) expect(barred.has(tile), tile).toBe(false);
    const open = flood([...clearedOutside, 'floor10-heart-hatch']);
    for (const tile of heart) expect(open.has(tile), tile).toBe(true);
  });

  it('reaches every floor ten entity once the floor is cleared', () => {
    const everything = MAPS.floor10.entities.map(({ id }) => id);
    const state = {
      ...createInitialGameState(),
      mapId: 'floor10' as const,
      defeatedEnemyIds: everything,
      openedRewardIds: everything,
      openedShortcutIds: everything,
    };
    const reachable = floodFloor(
      MAPS.floor10,
      [portal('floor10-to-floor9').tile],
      (tile) =>
        MAPS.floor10.layout[tile.y]?.[tile.x] === '.' &&
        !isTileBlockedByEntity(state, tile),
    );
    for (const entity of MAPS.floor10.entities) {
      const found =
        entity.kind === 'clue'
          ? hasAdjacentApproach(reachable, entity.tile)
          : reachable.has(tileKey(entity.tile));
      expect(found, entity.id).toBe(true);
    }
    expect(MAPS.floor10.sections).toHaveLength(6);
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
      floor8: 'floor8-to-floor7',
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

describe('the floors one-to-five spending budget', () => {
  const cleared = [
    MAPS.village,
    MAPS.floor1,
    MAPS.floor2,
    MAPS.floor3,
    MAPS.floor4,
    MAPS.floor5,
  ].flatMap((map) => map.entities);
  const enemies = cleared.filter(
    (candidate): candidate is EnemyEntity => candidate.kind === 'enemy',
  );
  const chests = cleared.filter(
    (candidate): candidate is RewardEntity & { grant: 'stat' } =>
      candidate.kind === 'reward' && candidate.grant === 'stat',
  );
  const grants = (stat: Stat): number =>
    chests
      .filter((chest) => chest.stat === stat)
      .reduce((total, chest) => total + chest.amount, 0);
  const wares = cleared
    .filter((candidate): candidate is ShopEntity => candidate.kind === 'shop')
    .flatMap((shop) => shop.wares);
  const trader = cleared.find(
    (candidate): candidate is TraderEntity => candidate.kind === 'trader',
  );
  if (!trader) throw new Error('no trader authored');
  const worn = equippedWares(wares.map((ware) => ware.itemId));
  const priceAt = (made: number) => trader.basePrice + trader.priceStep * made;
  const purse =
    enemies.reduce((total, enemy) => total + enemy.gold, 0) -
    wares.reduce((total, ware) => total + ware.price, 0) -
    Array.from({ length: 8 }, (_, made) => priceAt(made)).reduce(
      (total, price) => total + price,
      0,
    );

  it('drops all its gold from exactly 118 enemies', () => {
    expect(enemies).toHaveLength(118);
    expect(enemies.reduce((total, enemy) => total + enemy.gold, 0)).toBe(1054);
  });

  it('grants +22 attack and +30 defense from its chests', () => {
    expect(grants('attack')).toBe(22);
    expect(grants('defense')).toBe(30);
  });

  it('sells nine wares for 400 gold, the last pair worn worth +7/+7', () => {
    expect(wares).toHaveLength(9);
    expect(wares.reduce((total, ware) => total + ware.price, 0)).toBe(400);
    expect(worn.weapon).toMatchObject({ stat: 'attack', amount: 7 });
    expect(worn.armor).toMatchObject({ stat: 'defense', amount: 7 });
  });

  it('prices eight trades at 30 through 100, leaving 134 gold', () => {
    expect(Array.from({ length: 8 }, (_, made) => priceAt(made))).toEqual([
      30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    expect(purse).toBe(134);
  });

  it('lands the four-and-four split on 43 attack and 43 defense', () => {
    const base = createInitialGameState().player;
    expect(base.attack + grants('attack') + worn.weapon!.amount + 4).toBe(43);
    expect(base.defense + grants('defense') + worn.armor!.amount + 4).toBe(43);
  });

  it('leaves a ninth trade affordable to correct a short stat', () => {
    expect(priceAt(8)).toBe(110);
    expect(purse).toBeGreaterThanOrEqual(priceAt(8));
    const base = createInitialGameState().player;
    const attack = base.attack + grants('attack') + worn.weapon!.amount;
    const defense = base.defense + grants('defense') + worn.armor!.amount;
    expect({ attack: attack + 5, defense: defense + 3 }).toEqual({
      attack: 44,
      defense: 42,
    });
    expect({ attack: attack + 5, defense: defense + 4 }).toEqual({
      attack: 44,
      defense: 43,
    });
    expect({ attack: attack + 3, defense: defense + 5 }).toEqual({
      attack: 42,
      defense: 44,
    });
    expect({ attack: attack + 4, defense: defense + 5 }).toEqual({
      attack: 43,
      defense: 44,
    });
  });

  it('banks 656 hp against the 652 the full clear spends', () => {
    const pool =
      createInitialGameState().player.hp +
      grants('hp') +
      (worn.accessory?.stat === 'hp' ? worn.accessory.amount : 0);
    expect(pool).toBe(656);
    expect(pool - 652).toBe(4);
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

  it('flags an enemy with negative pierce', () => {
    const maps = villageWith([
      {
        kind: 'enemy',
        id: 'bad-pierce',
        tile: { x: 9, y: 3 },
        stats: { hp: 10, attack: 5, defense: 0, agility: 3, pierce: -1 },
        gold: 1,
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'bad-pierce: pierce must not be negative',
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
