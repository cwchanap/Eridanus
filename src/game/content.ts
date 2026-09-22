import { floor1 } from './content/floor1';
import { floor2 } from './content/floor2';
import { village } from './content/village';
import { hasFact } from './content/facts';
import { createInitialGameState } from './state';
import type {
  Entity,
  GameState,
  MapDefinition,
  MapId,
  MapSection,
  RewardEntity,
  Tile,
} from './types';

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

export function isEntityPresent(entity: Entity, state: GameState): boolean {
  if (entity.kind === 'enemy')
    return !state.defeatedEnemyIds.includes(entity.id);
  if (entity.kind === 'npc' && entity.presence) {
    const known = state.factIds.includes(entity.presence.factId);
    return entity.presence.when === 'known' ? known : !known;
  }
  return true;
}

export function getActiveEntities(state: GameState): readonly Entity[] {
  return MAPS[state.mapId].entities.filter((entity) =>
    isEntityPresent(entity, state),
  );
}

export function getActiveEntityAt(
  state: GameState,
  tile: Tile,
): Entity | undefined {
  return getActiveEntities(state).find(
    (entity) => entity.tile.x === tile.x && entity.tile.y === tile.y,
  );
}

export function isEntityBlocking(entity: Entity, state: GameState): boolean {
  if (!isEntityPresent(entity, state)) return false;
  switch (entity.kind) {
    case 'reward':
      return !state.openedRewardIds.includes(entity.id);
    case 'enemy':
      return true;
    case 'latch':
      return !state.openedShortcutIds.includes(entity.id);
    case 'clue':
    case 'recovery':
    case 'npc':
      return true;
    case 'portal':
      return false;
  }
}

export function isTileBlockedByEntity(state: GameState, tile: Tile): boolean {
  const entity = getActiveEntityAt(state, tile);
  return entity !== undefined && isEntityBlocking(entity, state);
}

export function findSectionById(id: string): MapSection | undefined {
  return Object.values(MAPS)
    .flatMap((map) => map.sections)
    .find((section) => section.id === id);
}

export function findItemRewardByItemId(
  itemId: string,
): RewardEntity | undefined {
  const entity = Object.values(MAPS)
    .flatMap((map) => map.entities)
    .find(
      (candidate) =>
        candidate.kind === 'reward' &&
        candidate.grant === 'item' &&
        candidate.itemId === itemId,
    );
  return entity?.kind === 'reward' && entity.grant === 'item'
    ? entity
    : undefined;
}

export function validateContent(
  maps: Record<MapId, MapDefinition> = MAPS,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const sectionIds = new Set<string>();
  const itemIds = new Set<string>();
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

  const square = maps.village.sections.find(
    (section) => section.id === 'village-square',
  );
  if (!square) errors.push('village: missing village-square section');
  else if (
    square.bounds.minX <= square.bounds.maxX &&
    square.bounds.minY <= square.bounds.maxY
  ) {
    const start = createInitialGameState().tile;
    const { minX, maxX, minY, maxY } = square.bounds;
    const inside =
      start.x >= minX && start.x <= maxX && start.y >= minY && start.y <= maxY;
    if (!inside)
      errors.push('village-square: section bounds exclude the initial tile');
  }

  const knownItemIds = new Set<string>();
  for (const map of Object.values(maps)) {
    for (const entity of map.entities) {
      if (entity.kind === 'reward' && entity.grant === 'item')
        knownItemIds.add(entity.itemId);
    }
  }

  for (const map of Object.values(maps)) {
    const width = map.layout[0]?.length ?? 0;
    const height = map.layout.length;
    if (width === 0 || map.layout.some((row) => row.length !== width))
      errors.push(`${map.id}: layout must be rectangular`);
    if (map.layout.some((row) => /[^#.]/.test(row)))
      errors.push(`${map.id}: layout contains an invalid tile`);

    const covered = new Set<string>();
    for (const section of map.sections) {
      if (sectionIds.has(section.id))
        errors.push(`duplicate section id: ${section.id}`);
      sectionIds.add(section.id);
      const { minX, maxX, minY, maxY } = section.bounds;
      if (minX > maxX || minY > maxY)
        errors.push(`${section.id}: section bounds are inverted`);
      else if (minX < 0 || minY < 0 || maxX >= width || maxY >= height)
        errors.push(`${section.id}: section bounds leave the layout`);
      for (const factId of section.factIds ?? []) {
        if (!hasFact(factId))
          errors.push(`${section.id}: unknown fact id: ${factId}`);
      }
      for (let y = section.bounds.minY; y <= section.bounds.maxY; y++) {
        for (let x = section.bounds.minX; x <= section.bounds.maxX; x++)
          covered.add(`${x},${y}`);
      }
    }
    const uncovered: string[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (map.layout[y]![x] === '.' && !covered.has(`${x},${y}`))
          uncovered.push(`${x},${y}`);
      }
    }
    if (uncovered.length > 0)
      errors.push(
        `${map.id}: floor tiles not covered by a section: ${uncovered.join(', ')}`,
      );

    const occupied = new Set<string>();
    for (const entity of map.entities) {
      if (ids.has(entity.id)) errors.push(`duplicate entity id: ${entity.id}`);
      ids.add(entity.id);
      const tileKey = `${entity.tile.x},${entity.tile.y}`;
      if (occupied.has(tileKey))
        errors.push(`${entity.id}: entity tile already occupied`);
      occupied.add(tileKey);
      if (!floorOn(map, entity.tile))
        errors.push(`${entity.id}: entity tile must be floor`);

      if (entity.kind === 'npc') {
        if (entity.presence && !hasFact(entity.presence.factId))
          errors.push(
            `${entity.id}: unknown presence fact id: ${entity.presence.factId}`,
          );
        if (!hasFact(entity.introFactId))
          errors.push(
            `${entity.id}: unknown intro fact id: ${entity.introFactId}`,
          );
      }
      if (entity.kind === 'clue' && entity.factId && !hasFact(entity.factId))
        errors.push(`${entity.id}: unknown fact id: ${entity.factId}`);
      if (entity.kind === 'reward' && entity.grant === 'item') {
        if (itemIds.has(entity.itemId))
          errors.push(`duplicate item id: ${entity.itemId}`);
        itemIds.add(entity.itemId);
      }

      if (entity.kind === 'portal') {
        if (entity.factId && !hasFact(entity.factId))
          errors.push(`${entity.id}: unknown fact id: ${entity.factId}`);
        if (entity.lock) {
          if (!hasFact(entity.lock.lockedFactId))
            errors.push(
              `${entity.id}: unknown lock fact id: ${entity.lock.lockedFactId}`,
            );

          switch (entity.lock.kind) {
            case 'item':
              if (!knownItemIds.has(entity.lock.requiresItemId))
                errors.push(
                  `${entity.id}: unknown lock item id: ${entity.lock.requiresItemId}`,
                );
              break;
            case 'fact':
              if (!hasFact(entity.lock.requiresFactId))
                errors.push(
                  `${entity.id}: unknown lock fact id: ${entity.lock.requiresFactId}`,
                );
              break;
          }
        }
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
