import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAPS, findEntityById } from '../game/content';
import { createInitialGameState } from '../game/state';
import type { EnemyEntity, NpcEntity, RewardEntity } from '../game/types';
import {
  ART_SIZE,
  ASSET_PATHS,
  PORTRAIT_PATHS,
  PORTRAIT_SIZE,
  TILE_SIZE,
  resolveEntityAsset,
  resolvePlayerAsset,
  resolvePortraitPath,
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
  gold: 0,
};

describe('asset seam', () => {
  it('keeps the 32px logical tile and maps every current map terrain', () => {
    expect(TILE_SIZE).toBe(32);
    expect(resolveTerrainAssets('village')).toEqual({
      floor: 'terrain-village-floor',
      wall: 'terrain-village-wall',
      edge: 0x4a3520,
    });
    expect(resolveTerrainAssets('floor1')).toEqual({
      floor: 'terrain-dungeon-floor',
      wall: 'terrain-dungeon-wall',
      edge: 0x07080d,
    });
    expect(resolveTerrainAssets('floor2')).toEqual({
      floor: 'terrain-dungeon-floor',
      wall: 'terrain-dungeon-wall',
      edge: 0x07080d,
    });
    expect(resolveTerrainAssets('floor3')).toEqual({
      floor: 'terrain-dungeon-floor',
      wall: 'terrain-dungeon-wall',
      edge: 0x07080d,
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
          ).toBe(closed);
        }
      }
    }
  });

  it('gives each npc identity and the floor three guardian distinct art', () => {
    const state = createInitialGameState();
    const art = (id: string) => {
      const entity = findEntityById(id);
      if (!entity) throw new Error(`missing ${id}`);
      return resolveEntityAsset(entity, state);
    };

    const villagers = [
      'village-warden',
      'village-artisan',
      'village-scout',
      'village-scribe',
      'village-returned-subject',
      'village-elder',
      'village-guard',
      'village-child',
      'village-weapon-shop',
      'village-armor-shop',
      'village-item-shop',
    ].map(art);
    expect(new Set(villagers).size).toBe(villagers.length);
    // Same person before and after the rescue.
    expect(art('floor2-missing-subject')).toBe(art('village-returned-subject'));

    const guardian = art('floor3-core-guardian');
    for (const map of Object.values(MAPS)) {
      for (const entity of map.entities) {
        if (entity.kind !== 'enemy' || entity.id === 'floor3-core-guardian')
          continue;
        expect(resolveEntityAsset(entity, state), entity.id).not.toBe(guardian);
      }
    }
  });

  it('maps exactly four presentation-only player facings', () => {
    expect(resolvePlayerAsset('north')).toBe('player-north');
    expect(resolvePlayerAsset('south')).toBe('player-south');
    expect(resolvePlayerAsset('east')).toBe('player-east');
    expect(resolvePlayerAsset('west')).toBe('player-west');
  });

  it('keeps every catalog URL relative under assets/', () => {
    for (const key of Object.keys(
      ASSET_PATHS,
    ) as (keyof typeof ASSET_PATHS)[]) {
      const path = ASSET_PATHS[key];
      expect(path, `${key} must not be root-absolute`).not.toMatch(/^\//);
      expect(path, `${key} must live under assets/`).toMatch(/^assets\//);
    }
  });

  it('ships every catalog file at exactly one tile', () => {
    const keys = Object.keys(ASSET_PATHS) as (keyof typeof ASSET_PATHS)[];

    for (const key of keys) {
      const file = resolve(runtimeAssetFilePath(key));
      expect(existsSync(file), `${key} file missing`).toBe(true);

      const png = readFileSync(file);
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);

      // A square source drawn at TILE_SIZE fills exactly its own grid cell.
      expect([width, height], `${key} must be ${ART_SIZE}px square`).toEqual([
        ART_SIZE,
        ART_SIZE,
      ]);
    }
  });

  it('gives the hero and every npc, shopkeeper and enemy a portrait', () => {
    expect(resolvePortraitPath('player-south')).toBe(
      PORTRAIT_PATHS['player-south'],
    );
    for (const map of Object.values(MAPS)) {
      const state = { ...createInitialGameState(), mapId: map.id };
      for (const entity of map.entities) {
        if (!['npc', 'shop', 'enemy'].includes(entity.kind)) continue;
        const sprite = resolveEntityAsset(entity, state);
        expect(sprite && PORTRAIT_PATHS[sprite], entity.id).toBeTruthy();
      }
    }
  });

  it('falls back to the sprite where no portrait exists', () => {
    expect(resolvePortraitPath('stairs-up')).toBe(ASSET_PATHS['stairs-up']);
  });

  it('ships every portrait as a square panel image', () => {
    for (const [key, path] of Object.entries(PORTRAIT_PATHS)) {
      expect(path, `${key} must live under assets/portraits/`).toMatch(
        /^assets\/portraits\//,
      );
      const file = resolve(`public/${path}`);
      expect(existsSync(file), `${key} portrait missing`).toBe(true);

      const png = readFileSync(file);
      expect(
        [png.readUInt32BE(16), png.readUInt32BE(20)],
        `${key} portrait size`,
      ).toEqual([PORTRAIT_SIZE, PORTRAIT_SIZE]);
    }
  });
});
