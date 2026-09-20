import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAPS } from '../game/content';
import { createInitialGameState } from '../game/state';
import type { EnemyEntity, NpcEntity, RewardEntity } from '../game/types';
import {
  ASSET_PATHS,
  TILE_SIZE,
  resolveEntityAsset,
  resolvePlayerAsset,
  resolveTerrainAssets,
  runtimeAssetFilePath,
} from './assets';

const testReward: RewardEntity = {
  kind: 'reward',
  id: 'test-reward',
  tile: { x: 1, y: 1 },
  assetId: 'chest-relic-closed',
  grant: 'stat',
  stat: 'attack',
  amount: 1,
};

const testNpc: NpcEntity = {
  kind: 'npc',
  id: 'village-warden',
  tile: { x: 1, y: 1 },
  name: 'Guide',
  introFactId: 'optional-route-lead',
};

const testEnemy: EnemyEntity = {
  kind: 'enemy',
  id: 'test-enemy',
  tile: { x: 1, y: 1 },
  assetId: 'enemy-ruin-guard',
  stats: { hp: 1, attack: 1, defense: 0 },
};

describe('asset seam', () => {
  it('keeps the 32px logical tile and maps every current map terrain', () => {
    expect(TILE_SIZE).toBe(32);
    expect(resolveTerrainAssets('village')).toEqual({
      floor: 'terrain-village-floor',
      wall: 'terrain-village-wall',
    });
    expect(resolveTerrainAssets('floor1')).toEqual({
      floor: 'terrain-dungeon-floor',
      wall: 'terrain-dungeon-wall',
    });
    expect(resolveTerrainAssets('floor2')).toEqual({
      floor: 'terrain-dungeon-floor',
      wall: 'terrain-dungeon-wall',
    });
  });

  it('uses the open variant for an opened reward', () => {
    expect(resolveEntityAsset(testReward, createInitialGameState())).toBe(
      'chest-relic-closed',
    );
    expect(
      resolveEntityAsset(testReward, {
        ...createInitialGameState(),
        openedRewardIds: [testReward.id],
      }),
    ).toBe('chest-relic-open');
  });

  it('uses the open variant for an opened latch bound by default', () => {
    const latch = {
      kind: 'latch' as const,
      id: 'test-latch',
      tile: { x: 1, y: 1 },
      rearSide: 'east' as const,
    };
    expect(resolveEntityAsset(latch, createInitialGameState())).toBe(
      'shortcut-gate-closed',
    );
    expect(
      resolveEntityAsset(latch, {
        ...createInitialGameState(),
        openedShortcutIds: [latch.id],
      }),
    ).toBe('shortcut-gate-open');
  });

  it('keeps texture selection independent of runtime activity', () => {
    expect(resolveEntityAsset(testEnemy, createInitialGameState())).toBe(
      'enemy-ruin-guard',
    );
    expect(
      resolveEntityAsset(testEnemy, {
        ...createInitialGameState(),
        defeatedEnemyIds: [testEnemy.id],
      }),
    ).toBe('enemy-ruin-guard');
  });

  it('falls back to guide art for an npc without an explicit asset', () => {
    expect(resolveEntityAsset(testNpc, createInitialGameState())).toBe(
      'npc-village-guide',
    );
  });

  it('fails closed for an unknown explicit id', () => {
    expect(
      resolveEntityAsset(
        { ...testEnemy, assetId: 'typo-not-in-catalog' },
        createInitialGameState(),
      ),
    ).toBeNull();
    // Inherited Object.prototype names must not count as catalog keys.
    expect(
      resolveEntityAsset(
        { ...testEnemy, assetId: 'toString' },
        createInitialGameState(),
      ),
    ).toBeNull();
  });

  it('does not invent art for an unbound directional portal', () => {
    const portal = {
      kind: 'portal' as const,
      id: 'test-portal',
      tile: { x: 1, y: 1 },
      target: { mapId: 'floor1' as const, tile: { x: 1, y: 1 } },
    };
    expect(resolveEntityAsset(portal, createInitialGameState())).toBeNull();
  });

  it('resolves every current entity including open-state variants', () => {
    for (const map of Object.values(MAPS)) {
      const state = { ...createInitialGameState(), mapId: map.id };

      for (const entity of map.entities) {
        if (entity.assetId !== undefined) {
          expect(
            Object.hasOwn(ASSET_PATHS, entity.assetId),
            `${entity.id} has unknown assetId ${entity.assetId}`,
          ).toBe(true);
        }

        const closed = resolveEntityAsset(entity, state);
        expect(closed, `${entity.id} should resolve while live`).not.toBeNull();
        if (closed) {
          expect(
            Object.hasOwn(ASSET_PATHS, closed),
            `${entity.id} resolved outside catalog`,
          ).toBe(true);
        }

        if (entity.kind === 'reward' || entity.kind === 'latch') {
          const openedState =
            entity.kind === 'reward'
              ? { ...state, openedRewardIds: [entity.id] }
              : { ...state, openedShortcutIds: [entity.id] };
          const open = resolveEntityAsset(entity, openedState);

          expect(open, `${entity.id} has no open art`).not.toBeNull();
          expect(open, `${entity.id} open art is identical to closed`).not.toBe(
            closed,
          );
          if (open) {
            expect(
              Object.hasOwn(ASSET_PATHS, open),
              `${entity.id} open art outside catalog`,
            ).toBe(true);
          }
        }

        if (entity.kind === 'enemy') {
          expect(
            resolveEntityAsset(entity, {
              ...state,
              defeatedEnemyIds: [entity.id],
            }),
          ).toBe('enemy-ruin-guard');
        }
      }
    }
  });

  it('maps exactly four presentation-only player facings', () => {
    expect(resolvePlayerAsset('north')).toBe('player-north');
    expect(resolvePlayerAsset('south')).toBe('player-south');
    expect(resolvePlayerAsset('east')).toBe('player-east');
    expect(resolvePlayerAsset('west')).toBe('player-west');
  });

  it('keeps every catalog URL under /assets', () => {
    for (const path of Object.values(ASSET_PATHS)) {
      expect(path).toMatch(/^\/assets\//);
    }
  });

  it('ships catalog files at bounded runtime dimensions', () => {
    const keys = Object.keys(ASSET_PATHS) as (keyof typeof ASSET_PATHS)[];

    for (const key of keys) {
      const file = resolve(runtimeAssetFilePath(key));
      expect(existsSync(file), `${key} file missing`).toBe(true);

      const png = readFileSync(file);
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);

      if (key.startsWith('terrain-')) {
        expect([width, height], `${key} must be exactly one tile`).toEqual([
          32, 32,
        ]);
      } else {
        expect(width, `${key} wider than two tiles`).toBeLessThanOrEqual(64);
        expect(height, `${key} taller than two tiles`).toBeLessThanOrEqual(64);
      }
    }
  });
});
