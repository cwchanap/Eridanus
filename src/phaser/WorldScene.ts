import Phaser from 'phaser';
import { MAPS } from '../game/content';
import type { Direction, InputCommand, SessionState } from '../game/types';
import {
  ASSET_PATHS,
  TILE_SIZE,
  resolveEntityAsset,
  resolvePlayerAsset,
  resolveTerrainAssets,
} from './assets';

export type WorldSceneDeps = {
  getSession: () => SessionState;
  onInput: (input: InputCommand) => void;
};

const DIRECTIONS = [
  { key: 'UP', direction: 'north' },
  { key: 'DOWN', direction: 'south' },
  { key: 'LEFT', direction: 'west' },
  { key: 'RIGHT', direction: 'east' },
] as const;

export class WorldScene extends Phaser.Scene {
  private readonly deps: WorldSceneDeps;
  private playerFacing: Direction = 'south';

  constructor(deps: WorldSceneDeps) {
    super('world');
    this.deps = deps;
  }

  preload(): void {
    for (const [assetKey, path] of Object.entries(ASSET_PATHS)) {
      this.load.image(assetKey, path);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');
    const keyboard = this.input.keyboard;
    if (keyboard) {
      for (const { key, direction } of DIRECTIONS) {
        // Event listeners never miss sub-frame taps, unlike JustDown polling.
        keyboard.on(`keydown-${key}`, () => {
          this.playerFacing = direction;
          this.deps.onInput({ kind: 'move', direction });
        });
      }
    }
    this.refresh();
  }

  refresh(): void {
    const state = this.deps.getSession().game;
    const map = MAPS[state.mapId];
    this.children.removeAll(true);

    const terrain = resolveTerrainAssets(state.mapId);
    for (let y = 0; y < map.layout.length; y++) {
      for (let x = 0; x < map.layout[y]!.length; x++) {
        const isWall = map.layout[y]![x] === '#';
        const texture = isWall ? terrain.wall : terrain.floor;
        this.add
          .image(x * TILE_SIZE, y * TILE_SIZE, texture)
          .setOrigin(0)
          .setDisplaySize(TILE_SIZE, TILE_SIZE);
      }
    }

    for (const entity of map.entities) {
      const assetKey = resolveEntityAsset(entity, state);
      if (!assetKey) continue;

      this.add
        .image(
          (entity.tile.x + 0.5) * TILE_SIZE,
          (entity.tile.y + 1) * TILE_SIZE,
          assetKey,
        )
        .setOrigin(0.5, 1);
    }

    const player = this.add
      .image(
        (state.tile.x + 0.5) * TILE_SIZE,
        (state.tile.y + 1) * TILE_SIZE,
        resolvePlayerAsset(this.playerFacing),
      )
      .setOrigin(0.5, 1);

    this.cameras.main.startFollow(player, true);
    this.cameras.main.setBounds(
      0,
      0,
      map.layout[0]!.length * TILE_SIZE,
      map.layout.length * TILE_SIZE,
    );
  }
}
