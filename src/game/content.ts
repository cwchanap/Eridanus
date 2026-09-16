import { floor1 } from './content/floor1';
import { floor2 } from './content/floor2';
import { village } from './content/village';
import type { Entity, MapDefinition, MapId, Tile } from './types';

export const MAPS: Record<MapId, MapDefinition> = { village, floor1, floor2 };

export function isInBounds(mapId: MapId, tile: Tile): boolean {
  const map = MAPS[mapId];
  if (map.layout.length === 0) return false;
  return (
    tile.y >= 0 &&
    tile.y < map.layout.length &&
    tile.x >= 0 &&
    tile.x < map.layout[0]!.length
  );
}

export function isLayoutFloor(mapId: MapId, tile: Tile): boolean {
  return isInBounds(mapId, tile) && MAPS[mapId].layout[tile.y]![tile.x] === '.';
}

export function getEntityAt(mapId: MapId, tile: Tile): Entity | undefined {
  return MAPS[mapId].entities.find(
    (entity) => entity.tile.x === tile.x && entity.tile.y === tile.y,
  );
}

export function findEntityById(id: string): Entity | undefined {
  return Object.values(MAPS)
    .flatMap((map) => map.entities)
    .find((entity) => entity.id === id);
}

export function validateContent(
  maps: Record<MapId, MapDefinition> = MAPS,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const floorOn = (map: MapDefinition, tile: Tile): boolean => {
    if (map.layout.length === 0) return false;
    return (
      tile.y >= 0 &&
      tile.y < map.layout.length &&
      tile.x >= 0 &&
      tile.x < map.layout[0]!.length &&
      map.layout[tile.y]![tile.x] === '.'
    );
  };

  for (const map of Object.values(maps)) {
    const width = map.layout[0]?.length ?? 0;
    if (width === 0 || map.layout.some((row) => row.length !== width))
      errors.push(`${map.id}: layout must be rectangular`);
    if (map.layout.some((row) => /[^#.]/.test(row)))
      errors.push(`${map.id}: layout contains an invalid tile`);

    for (const entity of map.entities) {
      if (ids.has(entity.id)) errors.push(`duplicate entity id: ${entity.id}`);
      ids.add(entity.id);
      if (!floorOn(map, entity.tile))
        errors.push(`${entity.id}: entity tile must be floor`);

      if (entity.kind === 'portal') {
        if (!floorOn(maps[entity.target.mapId], entity.target.tile)) {
          errors.push(`${entity.id}: portal target must be floor`);
          continue;
        }
        const back = maps[entity.target.mapId].entities.find(
          (candidate) =>
            candidate.tile.x === entity.target.tile.x &&
            candidate.tile.y === entity.target.tile.y,
        );
        if (
          back?.kind !== 'portal' ||
          back.target.mapId !== map.id ||
          back.target.tile.x !== entity.tile.x ||
          back.target.tile.y !== entity.tile.y
        )
          errors.push(`${entity.id}: reciprocal portal missing`);
      }
    }
  }

  return errors;
}
