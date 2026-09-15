import type { Entity } from '../game/types';

export const TILE_SIZE = 32;

export function resolveAssetId(entity: Entity): string {
  return entity.assetId ?? entity.kind;
}
