import type { Direction, Entity, GameState, MapId } from '../game/types';

export const TILE_SIZE = 32;
// Every PNG is drawn at 3x so it stays sharp under camera zoom; WorldScene
// still draws each one at TILE_SIZE, inside its own cell.
export const ART_SIZE = TILE_SIZE * 3;

export const ASSET_PATHS = {
  'terrain-village-floor': 'assets/terrain/village-floor.png',
  'terrain-village-wall': 'assets/terrain/village-wall.png',
  'terrain-dungeon-floor': 'assets/terrain/dungeon-floor.png',
  'terrain-dungeon-wall': 'assets/terrain/dungeon-wall.png',
  'player-north': 'assets/characters/player-north.png',
  'player-south': 'assets/characters/player-south.png',
  'player-east': 'assets/characters/player-east.png',
  'player-west': 'assets/characters/player-west.png',
  'npc-village-guide': 'assets/characters/npc-village-guide.png',
  'npc-warden': 'assets/characters/npc-warden.png',
  'npc-scout': 'assets/characters/npc-scout.png',
  'npc-scribe': 'assets/characters/npc-scribe.png',
  'npc-subject': 'assets/characters/npc-subject.png',
  'npc-elder': 'assets/characters/npc-elder.png',
  'npc-guard': 'assets/characters/npc-guard.png',
  'npc-child': 'assets/characters/npc-child.png',
  'npc-smith': 'assets/characters/npc-smith.png',
  'npc-armorer': 'assets/characters/npc-armorer.png',
  'npc-merchant': 'assets/characters/npc-merchant.png',
  'enemy-ruin-guard': 'assets/enemies/ruin-guard.png',
  'enemy-ruin-sentinel': 'assets/enemies/ruin-sentinel.png',
  'enemy-core-guardian': 'assets/enemies/core-guardian.png',
  'stairs-up': 'assets/interactables/stairs-up.png',
  'stairs-down': 'assets/interactables/stairs-down.png',
  'stairs-sealed': 'assets/interactables/stairs-sealed.png',
  'recovery-waystone': 'assets/interactables/recovery-waystone.png',
  'clue-runes': 'assets/interactables/clue-runes.png',
  'shortcut-gate-closed': 'assets/interactables/shortcut-gate-closed.png',
  'shortcut-gate-open': 'assets/interactables/shortcut-gate-open.png',
  'chest-relic-closed': 'assets/interactables/chest-relic-closed.png',
  'chest-relic-open': 'assets/interactables/chest-relic-open.png',
} as const;

export type AssetKey = keyof typeof ASSET_PATHS;

export const PORTRAIT_SIZE = 64;

// Panel-only busts for the hero card and the dialogue, shop and fight cards,
// keyed by the map sprite they stand in for. They never reach the map grid,
// so they are larger than a tile; a sprite without one shows itself.
// docs/art/style-guide.md has the prompt that generated them.
export const PORTRAIT_PATHS: Partial<Record<AssetKey, string>> = {
  'player-south': 'assets/portraits/hero.png',
  'npc-village-guide': 'assets/portraits/npc-village-guide.png',
  'npc-warden': 'assets/portraits/npc-warden.png',
  'npc-scout': 'assets/portraits/npc-scout.png',
  'npc-scribe': 'assets/portraits/npc-scribe.png',
  'npc-subject': 'assets/portraits/npc-subject.png',
  'npc-elder': 'assets/portraits/npc-elder.png',
  'npc-guard': 'assets/portraits/npc-guard.png',
  'npc-child': 'assets/portraits/npc-child.png',
  'npc-smith': 'assets/portraits/npc-smith.png',
  'npc-armorer': 'assets/portraits/npc-armorer.png',
  'npc-merchant': 'assets/portraits/npc-merchant.png',
  'enemy-ruin-guard': 'assets/portraits/enemy-ruin-guard.png',
  'enemy-ruin-sentinel': 'assets/portraits/enemy-ruin-sentinel.png',
  'enemy-core-guardian': 'assets/portraits/enemy-core-guardian.png',
};

// `edge` is the colour WorldScene outlines walls with, matched to each wall
// tile's own mortar so the outline reads as part of the art.
type TerrainAssets = Readonly<{
  floor: AssetKey;
  wall: AssetKey;
  edge: number;
}>;

const VILLAGE: TerrainAssets = {
  floor: 'terrain-village-floor',
  wall: 'terrain-village-wall',
  edge: 0x4a3520,
};
const DUNGEON: TerrainAssets = {
  floor: 'terrain-dungeon-floor',
  wall: 'terrain-dungeon-wall',
  edge: 0x07080d,
};

const TERRAIN_BY_MAP: Record<MapId, TerrainAssets> = {
  village: VILLAGE,
  floor1: DUNGEON,
  floor2: DUNGEON,
  floor3: DUNGEON,
  floor4: DUNGEON,
  floor5: DUNGEON,
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

export function resolvePortraitPath(assetKey: AssetKey): string {
  return PORTRAIT_PATHS[assetKey] ?? ASSET_PATHS[assetKey];
}

export function runtimeAssetFilePath(assetKey: AssetKey): string {
  return `public/${ASSET_PATHS[assetKey]}`;
}
