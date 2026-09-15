import { describe, expect, it } from 'vitest';
import { findEntityById } from '../game/content';
import { resolveAssetId, TILE_SIZE } from './assets';

describe('asset seam', () => {
  it('locks tile size and defaults asset id to entity kind', () => {
    const reward = findEntityById('floor1-power-core');
    if (!reward) throw new Error('reward missing');
    expect(TILE_SIZE).toBe(32);
    expect(resolveAssetId(reward)).toBe('reward');
  });
});
