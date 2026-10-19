import Phaser from 'phaser';
import { MAPS, findEntityById, getActiveEntities } from '../game/content';
import type { Direction, InputCommand, SessionState } from '../game/types';
import {
  ASSET_PATHS,
  TILE_SIZE,
  resolveEntityAsset,
  resolvePlayerAsset,
  resolveTerrainAssets,
} from './assets';
import { cameraBounds, fitZoom, followOffset } from './viewport';

export type WorldSceneDeps = {
  getSession: () => SessionState;
  onInput: (input: InputCommand) => void;
};

const KEY_DIRECTIONS = new Map<string, Direction>([
  ['ArrowUp', 'north'],
  ['ArrowDown', 'south'],
  ['ArrowLeft', 'west'],
  ['ArrowRight', 'east'],
]);

// The enemy an open combat prompt is about, outlined inside its own cell.
const TARGET_COLOR = 0xef6a5c;

const PROMPT_KEYS = new Map<string, InputCommand>([
  ['Enter', { kind: 'fight' }],
  ['Escape', { kind: 'cancel' }],
]);

export class WorldScene extends Phaser.Scene {
  private readonly deps: WorldSceneDeps;
  private playerFacing: Direction = 'south';
  private ready = false;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_DIRECTIONS.get(event.key);
    if (direction !== undefined) {
      event.preventDefault();
      this.playerFacing = direction;
      this.deps.onInput({ kind: 'move', direction });
      return;
    }
    // Enter/Escape only answer an open combat prompt. Forwarding them
    // otherwise would dispatch a no-op that clears the visible effect text,
    // and preventDefault stops a focused button from also firing its click.
    const command = PROMPT_KEYS.get(event.key);
    if (command === undefined || !this.deps.getSession().pending) return;
    event.preventDefault();
    this.deps.onInput(command);
  };

  constructor(deps: WorldSceneDeps) {
    super('world');
    this.deps = deps;
    // Bound here rather than in create() so presses landing during asset
    // preload still reach handleInput; refresh() stays inert until ready.
    window.addEventListener('keydown', this.handleKeyDown);
  }

  init(): void {
    // this.events is only injected once the SceneManager boots the scene,
    // so the constructor cannot register this hook.
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      window.removeEventListener('keydown', this.handleKeyDown);
    });
  }

  preload(): void {
    for (const [assetKey, path] of Object.entries(ASSET_PATHS)) {
      this.load.image(assetKey, path);
    }
  }

  create(): void {
    this.ready = true;
    // The canvas tracks the window, so the zoom and camera bounds are
    // recomputed whenever it resizes.
    this.scale.on(Phaser.Scale.Events.RESIZE, (size: Phaser.Structs.Size) => {
      this.cameras.main.setSize(size.width, size.height);
      this.refresh();
    });
    this.refresh();
  }

  refresh(): void {
    if (!this.ready) return;
    const { game: state, pending } = this.deps.getSession();
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

    const target = pending && findEntityById(pending.enemyId);
    if (target) {
      this.add
        .rectangle(
          (target.tile.x + 0.5) * TILE_SIZE,
          (target.tile.y + 0.5) * TILE_SIZE,
          TILE_SIZE - 2,
          TILE_SIZE - 2,
          TARGET_COLOR,
          0.25,
        )
        .setStrokeStyle(2, TARGET_COLOR);
    }

    for (const entity of getActiveEntities(state)) {
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

    const camera = this.cameras.main;
    // The camera is in device pixels (createGame.ts) but the HUD insets
    // are CSS pixels, so the viewport maths runs in CSS pixels and only
    // the final zoom is scaled up by the pixel ratio.
    const ratio = 1 / this.scale.zoom;
    const view = { width: camera.width / ratio, height: camera.height / ratio };
    const mapSize = {
      width: map.layout[0]!.length * TILE_SIZE,
      height: map.layout.length * TILE_SIZE,
    };
    const zoom = fitZoom(view, mapSize);
    const bounds = cameraBounds(view, mapSize, zoom);
    const offset = followOffset(view, zoom);
    camera.setZoom(zoom * ratio);
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    // Follow the centre of the hero's cell, not the sprite's bottom origin.
    camera.startFollow(
      { x: player.x, y: player.y - TILE_SIZE / 2 },
      true,
      1,
      1,
      offset.x,
      offset.y,
    );
  }
}
