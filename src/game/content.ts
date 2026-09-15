import { floor1 } from './content/floor1';
import { floor2 } from './content/floor2';
import { village } from './content/village';
import type { Entity, MapDefinition, MapId, Tile } from './types';

export const MAPS: Record<MapId, MapDefinition> = { village, floor1, floor2 };

export function isInBounds(mapId: MapId, tile: Tile): boolean {
  const map = MAPS[mapId];
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

export function validateContent(): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const map of Object.values(MAPS)) {
    const width = map.layout[0]?.length ?? 0;
    if (width === 0 || map.layout.some((row) => row.length !== width))
      errors.push(`${map.id}: layout must be rectangular`);

    for (const entity of map.entities) {
      if (ids.has(entity.id)) errors.push(`duplicate entity id: ${entity.id}`);
      ids.add(entity.id);
      if (!isLayoutFloor(map.id, entity.tile))
        errors.push(`${entity.id}: entity tile must be floor`);

      if (entity.kind === 'portal') {
        if (!isLayoutFloor(entity.target.mapId, entity.target.tile)) {
          errors.push(`${entity.id}: portal target must be floor`);
          continue;
        }
        const back = getEntityAt(entity.target.mapId, entity.target.tile);
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
