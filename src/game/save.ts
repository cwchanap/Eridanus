import {
  findEntityById,
  findItemRewardByItemId,
  findSectionById,
  getEntityAt,
  isLayoutFloor,
  MAPS,
} from './content';
import { hasFact } from './content/facts';
import { createInitialGameState } from './state';
import type { GameState, Tile } from './types';

const SAVE_KEY = 'eridanus.save';

export type LoadResult =
  | { kind: 'fresh'; state: GameState }
  | { kind: 'loaded'; state: GameState }
  | {
      kind: 'invalid';
      reason: 'malformed-json' | 'invalid-shape' | 'invalid-content';
    };

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function hasValidShape(state: unknown): state is GameState {
  if (typeof state !== 'object' || state === null) return false;
  const record = state as Record<string, unknown>;
  if (typeof record['mapId'] !== 'string') return false;
  const tile = record['tile'];
  if (typeof tile !== 'object' || tile === null) return false;
  const tileRecord = tile as Record<string, unknown>;
  if (!Number.isInteger(tileRecord['x']) || !Number.isInteger(tileRecord['y']))
    return false;
  const player = record['player'];
  if (typeof player !== 'object' || player === null) return false;
  const playerRecord = player as Record<string, unknown>;
  for (const stat of ['hp', 'maxHp', 'attack', 'defense'] as const) {
    const value = playerRecord[stat];
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  }
  return (
    isStringArray(record['openedRewardIds']) &&
    isStringArray(record['defeatedEnemyIds']) &&
    isStringArray(record['openedShortcutIds']) &&
    isStringArray(record['itemIds']) &&
    isStringArray(record['factIds']) &&
    isStringArray(record['discoveredSectionIds'])
  );
}

function isTileOccupiedByBlockingEntity(state: GameState, tile: Tile): boolean {
  const entity = getEntityAt(state.mapId, tile);
  if (!entity) return false;
  switch (entity.kind) {
    case 'reward':
      return !state.openedRewardIds.includes(entity.id);
    case 'enemy':
      return !state.defeatedEnemyIds.includes(entity.id);
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

function hasValidContent(state: GameState): boolean {
  if (!Object.hasOwn(MAPS, state.mapId)) return false;
  if (!isLayoutFloor(state.mapId, state.tile)) return false;
  if (
    !state.openedRewardIds.every((id) => findEntityById(id)?.kind === 'reward')
  )
    return false;
  if (
    !state.defeatedEnemyIds.every((id) => findEntityById(id)?.kind === 'enemy')
  )
    return false;
  if (
    !state.openedShortcutIds.every((id) => findEntityById(id)?.kind === 'latch')
  )
    return false;
  if (!state.factIds.every(hasFact)) return false;
  if (!state.discoveredSectionIds.every((id) => findSectionById(id)))
    return false;

  for (const itemId of state.itemIds) {
    const reward = findItemRewardByItemId(itemId);
    if (!reward || !state.openedRewardIds.includes(reward.id)) return false;
  }

  for (const openedId of state.openedRewardIds) {
    const reward = findEntityById(openedId);
    if (
      reward?.kind === 'reward' &&
      reward.grant === 'item' &&
      !state.itemIds.includes(reward.itemId)
    )
      return false;
  }

  return !isTileOccupiedByBlockingEntity(state, state.tile);
}

export function saveGame(storage: Storage, state: GameState): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage: Storage): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { kind: 'fresh', state: createInitialGameState() };
  }
  if (raw === null) return { kind: 'fresh', state: createInitialGameState() };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'malformed-json' };
  }
  if (!hasValidShape(parsed))
    return { kind: 'invalid', reason: 'invalid-shape' };
  if (!hasValidContent(parsed))
    return { kind: 'invalid', reason: 'invalid-content' };
  return { kind: 'loaded', state: parsed };
}

export function resetGame(storage: Storage): GameState {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // Storage may be unavailable; still return a playable fresh state.
  }
  return createInitialGameState();
}
