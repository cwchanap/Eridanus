import { describe, expect, it } from 'vitest';
import { MAPS, findEntityById, validateContent } from './content';
import { village } from './content/village';
import type { Entity, MapDefinition, MapId } from './types';

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
        tile: { x: 9, y: 2 },
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
        tile: { x: 9, y: 2 },
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
        sections: [
          {
            id: 'village-square',
            name: 'Village Square',
            bounds: { minX: 1, maxX: 9, minY: 1, maxY: 6 },
          },
        ],
      },
    };
    expect(validateContent(maps)).toEqual([
      'village: floor tiles not covered by a section: 10,1, 10,2, 10,3, 10,4, 10,5, 10,6',
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

  it('flags an npc without dialogue and an unknown lock item', () => {
    const maps = villageWith([
      {
        kind: 'npc',
        id: 'village-mystery',
        tile: { x: 3, y: 3 },
        name: 'Mystery',
        introFactId: 'main-missing-person-lead',
      },
      {
        kind: 'portal',
        id: 'village-to-floor1',
        tile: { x: 9, y: 2 },
        target: { mapId: 'village', tile: { x: 4, y: 3 } },
        lock: {
          requiresItemId: 'no-such-item',
          lockedText: 'sealed',
          lockedFactId: 'main-missing-person-lead',
        },
      },
    ]);
    expect(validateContent(maps)).toEqual([
      'village-mystery: npc has no dialogue lines',
      'village-to-floor1: unknown lock item id: no-such-item',
      'village-to-floor1: reciprocal portal missing',
    ]);
  });
});
