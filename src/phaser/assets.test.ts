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
  SPRITE_FRAMES,
  TILE_SIZE,
  isCharacter,
  resolveEntityAsset,
  resolvePlayerAsset,
  resolvePortraitPath,
  resolveTerrainAssets,
  runtimeAssetFilePath,
  spriteFrames,
  type AssetKey,
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
  introFactId: 'optional-route-lead',
};

const testEnemy: EnemyEntity = {
  kind: 'enemy',
  id: 'test-enemy',
  tile: { x: 1, y: 1 },
  assetId: 'enemy-ruin-guard',
  stats: { hp: 1, attack: 1, defense: 0, agility: 0 },
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

  it('throws a lever once its id is among the opened shortcuts', () => {
    const lever = {
      kind: 'lever' as const,
      id: 'test-lever',
      tile: { x: 1, y: 1 },
    };
    expect(resolveEntityAsset(lever, createInitialGameState())).toBe(
      'lever-off',
    );
    expect(
      resolveEntityAsset(lever, {
        ...createInitialGameState(),
        openedShortcutIds: [lever.id],
      }),
    ).toBe('lever-on');
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

        if (
          entity.kind === 'reward' ||
          entity.kind === 'latch' ||
          entity.kind === 'lever'
        ) {
          const openedState =
            entity.kind === 'reward'
              ? { ...state, openedRewardIds: [entity.id] }
              : { ...state, openedShortcutIds: [entity.id] };
          const open = resolveEntityAsset(entity, openedState);

          // A drained waystone vanishes; everything else shows its open art.
          if (entity.assetId === 'recovery-waystone') {
            expect(open, `${entity.id} should vanish once drunk`).toBeNull();
            continue;
          }
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

    const guardian = art('floor5-core-guardian');
    for (const map of Object.values(MAPS)) {
      for (const entity of map.entities) {
        if (entity.kind !== 'enemy' || entity.id === 'floor5-core-guardian')
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
        if (!['npc', 'shop', 'trader', 'enemy'].includes(entity.kind)) continue;
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

  it('names animation frames beside their sprite', () => {
    const original = SPRITE_FRAMES['npc-warden'];
    SPRITE_FRAMES['npc-warden'] = { idle: 2 };
    try {
      expect(spriteFrames('npc-warden', 'idle')).toEqual([
        {
          key: 'npc-warden-idle-1',
          path: 'assets/characters/npc-warden-idle-1.png',
        },
        {
          key: 'npc-warden-idle-2',
          path: 'assets/characters/npc-warden-idle-2.png',
        },
      ]);
      expect(spriteFrames('npc-warden', 'walk')).toEqual([]);
    } finally {
      SPRITE_FRAMES['npc-warden'] = original;
    }
    // A sprite with no entry has no frames.
    expect(spriteFrames('stairs-up', 'idle')).toEqual([]);
  });

  it('animates the hero, every npc, shopkeeper and enemy, and nothing else', () => {
    expect(isCharacter('player-north')).toBe(true);
    expect(isCharacter('stairs-up')).toBe(false);
    expect(isCharacter('chest-relic-closed')).toBe(false);
    for (const map of Object.values(MAPS)) {
      const state = { ...createInitialGameState(), mapId: map.id };
      for (const entity of map.entities) {
        const sprite = resolveEntityAsset(entity, state);
        if (!sprite) continue;
        expect(isCharacter(sprite), entity.id).toBe(
          ['npc', 'shop', 'trader', 'enemy'].includes(entity.kind),
        );
      }
    }
  });

  it('ships every animation frame at exactly one tile', () => {
    for (const key of Object.keys(SPRITE_FRAMES) as AssetKey[]) {
      expect(isCharacter(key), `${key} is not a character`).toBe(true);
      for (const motion of ['idle', 'walk'] as const) {
        if (motion === 'walk') {
          expect(
            key.startsWith('player-') || !SPRITE_FRAMES[key]?.walk,
            `${key}: only the hero walks`,
          ).toBe(true);
        }
        for (const frame of spriteFrames(key, motion)) {
          const file = resolve(`public/${frame.path}`);
          expect(existsSync(file), `${frame.key} file missing`).toBe(true);
          const png = readFileSync(file);
          expect(
            [png.readUInt32BE(16), png.readUInt32BE(20)],
            `${frame.key} must be ${ART_SIZE}px square`,
          ).toEqual([ART_SIZE, ART_SIZE]);
        }
      }
    }
  });
});
