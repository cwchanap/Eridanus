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

  it('blocks clues, recoveries, and active npcs', () => {
    expect(isEntityBlocking(entity('floor1-route-mark'), state)).toBe(true);
    expect(isEntityBlocking(entity('village-recovery'), state)).toBe(true);
    expect(isEntityBlocking(npc('village-warden'), state)).toBe(true);
  });

  it('never blocks a portal', () => {
    expect(isEntityBlocking(entity('village-to-floor1'), state)).toBe(false);
  });

  it('rejects a save tile standing on an active npc through the tile wrapper', () => {
    expect(
      isTileBlockedByEntity(createInitialGameState(), { x: 3, y: 7 }),
    ).toBe(true);
    expect(
      isTileBlockedByEntity(createInitialGameState(), { x: 4, y: 7 }),
    ).toBe(false);
  });
});

describe('authored content', () => {
  it('defines all current maps', () => {
    expect(Object.keys(MAPS).sort()).toEqual(['floor1', 'floor2', 'village']);
  });

  it('has no validation errors', () => {
    expect(validateContent()).toEqual([]);
  });

  it('keeps important ids resolvable', () => {
    expect(findEntityById('floor1-power-core')?.kind).toBe('reward');
    expect(findEntityById('floor1-gatekeeper')?.kind).toBe('enemy');
    expect(findEntityById('floor1-rear-latch')?.kind).toBe('latch');
  });

  it('resolves the progression lookups', () => {
    expect(findItemRewardByItemId('tower-depth-sigil')?.id).toBe(
      'floor1-depth-sigil',
    );
    expect(findSectionById('floor1-upper-gallery')?.name).toBe('Upper Gallery');
    expect(findSectionById('floor2-front-landing')?.name).toBe('Front Landing');
    expect(findSectionById('floor2-central-hall')?.name).toBe('Central Hall');
    expect(findSectionById('floor2-west-archive')?.name).toBe('West Archive');
    expect(findSectionById('floor2-east-service')?.name).toBe(
      'East Service Wing',
    );
    expect(findSectionById('floor2-rear-gallery')?.name).toBe('Rear Gallery');
  });

  const tileKey = (tile: Tile): string => `${tile.x},${tile.y}`;
  const floodFloor = (
    map: MapDefinition,
    starts: readonly Tile[],
    canStand: (tile: Tile) => boolean = (tile) =>
      map.layout[tile.y]?.[tile.x] === '.',
  ): Set<string> => {
    const reachable = new Set<string>();
    const queue = starts.filter((tile) => canStand(tile));
    while (queue.length > 0) {
      const tile = queue.pop()!;
      const key = tileKey(tile);
      if (reachable.has(key)) continue;
      reachable.add(key);
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
    const reachable = floodFloor(
      MAPS.floor2,
      [portal('floor2-front-to-floor1').tile],
      (tile) =>
        MAPS.floor2.layout[tile.y]?.[tile.x] === '.' &&
        !isTileBlockedByEntity(freshFloor2, tile),
    );

    expect(reachable.has(tileKey(portal('floor2-rear-to-floor1').tile))).toBe(
      true,
    );
    expect(
      reachable.has(tileKey(portal('floor2-treasury-to-floor1').tile)),
    ).toBe(true);
    for (const id of ['floor2-west-release', 'floor2-east-release'] as const) {
      const release = latch(id);
      expect(
        reachable.has(tileKey(tileInDirection(release.tile, release.rearSide))),
      ).toBe(true);
    }
    expect(
      hasAdjacentApproach(reachable, entity('floor2-missing-subject').tile),
    ).toBe(true);
    expect(
      hasAdjacentApproach(
        reachable,
        entity('floor2-paired-release-ledger').tile,
      ),
    ).toBe(true);
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
    expect(section?.name).toBe('Workshop Treasury');
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

  it('flags a duplicate entity id', () => {
    const maps = villageWith([
      {
        kind: 'clue',
        id: 'village-recovery',
        tile: { x: 3, y: 3 },
        text: 'duplicate id',
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'duplicate entity id: village-recovery',
    ]);
  });

  it('flags stacked entities on the same tile', () => {
    const maps = villageWith([
      {
        kind: 'clue',
        id: 'stacked-clue',
        tile: { x: 2, y: 2 },
        text: 'shares a tile',
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
        text: 'on a wall',
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
        tile: { x: 11, y: 2 },
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
        tile: { x: 11, y: 2 },
        target: { mapId: 'village', tile: { x: 4, y: 3 } },
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
          section.id === 'village-square'
            ? { ...section, bounds: { ...section.bounds, maxX: 11 } }
            : section,
        ),
      },
    };
    expect(validateContent(maps)).toEqual([
      'village: floor tiles not covered by a section: 12,5, 12,6, 12,7, 12,8',
    ]);
  });

  it('flags village-square bounds excluding the initial tile', () => {
    const maps = {
      ...MAPS,
      village: {
        ...village,
        sections: village.sections.map((section) => {
          if (section.id === 'village-square')
            return { ...section, bounds: { ...section.bounds, maxY: 7 } };
          if (section.id === 'village-north-path')
            return { ...section, bounds: { ...section.bounds, maxY: 8 } };
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
        tile: { x: 3, y: 3 },
        text: 'points nowhere',
        factId: 'not-a-fact',
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'typo-clue: unknown fact id: not-a-fact',
    ]);
  });

  it('flags an unknown lock item id', () => {
    const maps = villageWith([
      {
        kind: 'portal',
        id: 'village-to-floor1',
        tile: { x: 11, y: 2 },
        target: { mapId: 'village', tile: { x: 4, y: 3 } },
        lock: {
          requiresItemId: 'no-such-item',
          lockedText: 'sealed',
          lockedFactId: 'main-missing-person-lead',
        },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'village-to-floor1: unknown lock item id: no-such-item',
      'village-to-floor1: reciprocal portal missing',
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
            tile: { x: 20, y: 13 },
            assetId: 'chest-relic-closed',
            grant: 'item',
            itemId: 'tower-depth-sigil',
            label: 'Duplicate Sigil',
          },
        ],
      },
    };
    expect(validateContent(maps)).toEqual([
      'duplicate item id: tower-depth-sigil',
    ]);
  });
});
