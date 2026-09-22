import type { Direction, Entity, GameState, MapId } from '../game/types';

export const TILE_SIZE = 32;

export const ASSET_PATHS = {
  'terrain-village-floor': '/assets/terrain/village-floor.png',
  'terrain-village-wall': '/assets/terrain/village-wall.png',
  'terrain-dungeon-floor': '/assets/terrain/dungeon-floor.png',
  'terrain-dungeon-wall': '/assets/terrain/dungeon-wall.png',
  'player-north': '/assets/characters/player-north.png',
  'player-south': '/assets/characters/player-south.png',
  'player-east': '/assets/characters/player-east.png',
  'player-west': '/assets/characters/player-west.png',
  'npc-village-guide': '/assets/characters/npc-village-guide.png',
  'enemy-ruin-guard': '/assets/enemies/ruin-guard.png',
  'stairs-up': '/assets/interactables/stairs-up.png',
  'stairs-down': '/assets/interactables/stairs-down.png',
  'recovery-waystone': '/assets/interactables/recovery-waystone.png',
  'clue-runes': '/assets/interactables/clue-runes.png',
  'shortcut-gate-closed': '/assets/interactables/shortcut-gate-closed.png',
  'shortcut-gate-open': '/assets/interactables/shortcut-gate-open.png',
  'chest-relic-closed': '/assets/interactables/chest-relic-closed.png',
  'chest-relic-open': '/assets/interactables/chest-relic-open.png',
} as const;

export type AssetKey = keyof typeof ASSET_PATHS;

type TerrainAssets = Readonly<{ floor: AssetKey; wall: AssetKey }>;

const TERRAIN_BY_MAP: Record<MapId, TerrainAssets> = {
  village: { floor: 'terrain-village-floor', wall: 'terrain-village-wall' },
  floor1: { floor: 'terrain-dungeon-floor', wall: 'terrain-dungeon-wall' },
  floor2: { floor: 'terrain-dungeon-floor', wall: 'terrain-dungeon-wall' },
  floor3: { floor: 'terrain-dungeon-floor', wall: 'terrain-dungeon-wall' },
};

const PLAYER_BY_DIRECTION: Record<Direction, AssetKey> = {
  north: 'player-north',
  south: 'player-south',
  east: 'player-east',
  west: 'player-west',
};

const OPEN_VARIANT: Partial<Record<AssetKey, AssetKey>> = {
  'chest-relic-closed': 'chest-relic-open',
  'shortcut-gate-closed': 'shortcut-gate-open',
};

function explicitAsset(assetId: string | undefined): AssetKey | null {
  if (assetId === undefined) return null;
  return Object.hasOwn(ASSET_PATHS, assetId) ? (assetId as AssetKey) : null;
}

function baseEntityAsset(entity: Entity): AssetKey | null {
  if (entity.assetId !== undefined) {
    return explicitAsset(entity.assetId);
  }
  if (entity.kind === 'recovery') return 'recovery-waystone';
  if (entity.kind === 'latch') return 'shortcut-gate-closed';
  if (entity.kind === 'npc') return 'npc-village-guide';
  return null;
}

export function resolveTerrainAssets(mapId: MapId): TerrainAssets {
  return TERRAIN_BY_MAP[mapId];
}

export function resolvePlayerAsset(direction: Direction): AssetKey {
  return PLAYER_BY_DIRECTION[direction];
}

export function resolveEntityAsset(
  entity: Entity,
  state: GameState,
): AssetKey | null {
  const base = baseEntityAsset(entity);
  if (!base) return null;

  const opened =
    (entity.kind === 'reward' && state.openedRewardIds.includes(entity.id)) ||
    (entity.kind === 'latch' && state.openedShortcutIds.includes(entity.id));

  return opened ? (OPEN_VARIANT[base] ?? base) : base;
}

export function runtimeAssetFilePath(assetKey: AssetKey): string {
  return `public${ASSET_PATHS[assetKey]}`;
}
