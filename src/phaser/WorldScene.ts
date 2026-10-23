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
import { cameraCentre, followZoom, hudTop, logStrip } from './camera';

export type WorldSceneDeps = {
  getSession: () => SessionState;
  // Whether the message box shows something Enter/Escape can close.
  hasMessage: () => boolean;
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

// Wall outlines (coloured per terrain, see assets.ts) and the shadow a wall
// casts on the floor below, in map units (TILE_SIZE is one tile).
const WALL_EDGE = 1.5;
const WALL_SHADOW = 6;
const WALL_SHADOW_ALPHA = 0.4;
const WALL_BEVEL_ALPHA = 0.3;

const PROMPT_KEYS = new Map<string, InputCommand>([
  ['Enter', { kind: 'confirm' }],
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
    // Enter/Escape answer an open combat or purchase prompt; with none open,
    // either one closes the shown message (a cancel with nothing pending is
    // a no-op that clears it). With nothing to answer or close they are left
    // alone, and preventDefault stops a focused button from also firing its
    // click.
    const command = PROMPT_KEYS.get(event.key);
    if (command === undefined) return;
    if (this.deps.getSession().pending) {
      event.preventDefault();
      this.deps.onInput(command);
    } else if (this.deps.hasMessage()) {
      event.preventDefault();
      this.deps.onInput({ kind: 'cancel' });
    }
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
    // The canvas tracks the window, so the camera size and zoom are
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

    // Zoom to 3x (less on small windows) and centre the hero between the
    // top panels and the message log, so no panel covers them (camera.ts). The zoom may be fractional, but the canvas is in
    // device pixels (createGame.ts), so nearest-neighbour scaling keeps
    // tiles sharp.
    const camera = this.cameras.main;
    const ratio = window.devicePixelRatio;
    // The CSS breakpoint is on the window's CSS width; the camera's width
    // is rounded to device pixels, so dividing it back can land a hair
    // under 1024 and pick the narrower strip the layout doesn't use.
    const strip = logStrip(window.innerWidth) * ratio;
    const top = hudTop(window.innerWidth, window.innerHeight) * ratio;
    const view = { width: camera.width, height: camera.height };
    const zoom = followZoom(view, top, strip, ratio);
    const centre = cameraCentre(top, strip, zoom, {
      x: (state.tile.x + 0.5) * TILE_SIZE,
      y: (state.tile.y + 0.5) * TILE_SIZE,
    });
    camera.setZoom(zoom);
    camera.centerOn(centre.x, centre.y);

    const terrain = resolveTerrainAssets(state.mapId);
    // Off the map counts as wall, so the map's rim gets no edge.
    const isWall = (x: number, y: number) =>
      (map.layout[y]?.[x] ?? '#') === '#';
    const edges = this.add.graphics();
    for (let y = 0; y < map.layout.length; y++) {
      for (let x = 0; x < map.layout[y]!.length; x++) {
        const wall = isWall(x, y);
        this.add
          .image(
            x * TILE_SIZE,
            y * TILE_SIZE,
            wall ? terrain.wall : terrain.floor,
          )
          .setOrigin(0)
          .setDisplaySize(TILE_SIZE, TILE_SIZE);

        // The tiles are seamless, so outline walls where they meet floor
        // and shade the floor just below them; otherwise a wall reads as
        // more paving.
        const left = x * TILE_SIZE;
        const top = y * TILE_SIZE;
        if (wall) {
          // A pale bevel just inside the dark edge, so the edge still reads
          // on the near-black tower walls.
          const sides = [
            [0, -1, left, top, TILE_SIZE, WALL_EDGE],
            [0, 1, left, top + TILE_SIZE - WALL_EDGE, TILE_SIZE, WALL_EDGE],
            [-1, 0, left, top, WALL_EDGE, TILE_SIZE],
            [1, 0, left + TILE_SIZE - WALL_EDGE, top, WALL_EDGE, TILE_SIZE],
          ] as const;
          for (const [dx, dy, rx, ry, w, h] of sides) {
            if (isWall(x + dx, y + dy)) continue;
            edges.fillStyle(terrain.edge, 1);
            edges.fillRect(rx, ry, w, h);
            edges.fillStyle(0xffffff, WALL_BEVEL_ALPHA);
            edges.fillRect(rx - dx * WALL_EDGE, ry - dy * WALL_EDGE, w, h);
          }
        } else if (isWall(x, y - 1)) {
          edges.fillStyle(terrain.edge, WALL_SHADOW_ALPHA);
          edges.fillRect(left, top, TILE_SIZE, WALL_SHADOW);
        }
      }
    }
    this.children.bringToTop(edges);

    const target =
      pending?.kind === 'combat' && findEntityById(pending.enemyId);
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
        .setOrigin(0.5, 1)
        .setDisplaySize(TILE_SIZE, TILE_SIZE);
    }

    this.add
      .image(
        (state.tile.x + 0.5) * TILE_SIZE,
        (state.tile.y + 1) * TILE_SIZE,
        resolvePlayerAsset(this.playerFacing),
      )
      .setOrigin(0.5, 1)
      .setDisplaySize(TILE_SIZE, TILE_SIZE);
  }
}
