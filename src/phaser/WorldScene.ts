import Phaser from 'phaser';
import { MAPS } from '../game/content';
import type { InputCommand, SessionState } from '../game/types';
import { TILE_SIZE, resolveAssetId } from './assets';

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
  private keys: Partial<
    Record<(typeof DIRECTIONS)[number]['direction'], Phaser.Input.Keyboard.Key>
  > = {};

  constructor(deps: WorldSceneDeps) {
    super('world');
    this.deps = deps;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');
    const keyboard = this.input.keyboard;
    if (keyboard) {
      for (const { key, direction } of DIRECTIONS) {
        this.keys[direction] = keyboard.addKey(key);
      }
    }
    this.refresh();
  }

  update(): void {
    for (const { direction } of DIRECTIONS) {
      const key = this.keys[direction];
      if (key && Phaser.Input.Keyboard.JustDown(key)) {
        this.deps.onInput({ kind: 'move', direction });
      }
    }
  }

  refresh(): void {
    const state = this.deps.getSession().game;
    const map = MAPS[state.mapId];
    this.children.removeAll(true);

    for (let y = 0; y < map.layout.length; y++) {
      for (let x = 0; x < map.layout[y]!.length; x++) {
        const isWall = map.layout[y]![x] === '#';
        this.add
          .rectangle(
            x * TILE_SIZE,
            y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
            isWall ? 0x3a3a3a : 0x181818,
          )
          .setOrigin(0);
      }
    }

    const collected = new Set(state.openedRewardIds);
    const defeated = new Set(state.defeatedEnemyIds);
    for (const entity of map.entities) {
      if (entity.kind === 'reward' && collected.has(entity.id)) continue;
      if (entity.kind === 'enemy' && defeated.has(entity.id)) continue;
      this.add
        .text(
          (entity.tile.x + 0.5) * TILE_SIZE,
          (entity.tile.y + 1) * TILE_SIZE,
          resolveAssetId(entity),
          {
            fontSize: '10px',
            color: '#ffdd66',
          },
        )
        .setOrigin(0.5, 1);
    }

    const player = this.add
      .text(
        (state.tile.x + 0.5) * TILE_SIZE,
        (state.tile.y + 0.5) * TILE_SIZE,
        '@',
        {
          fontSize: '16px',
          color: '#ffffff',
        },
      )
      .setOrigin(0.5);

    this.cameras.main.startFollow(player, true);
    this.cameras.main.setBounds(
      0,
      0,
      map.layout[0]!.length * TILE_SIZE,
      map.layout.length * TILE_SIZE,
    );
  }
}
