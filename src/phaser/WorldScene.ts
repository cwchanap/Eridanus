import Phaser from 'phaser';
import type { Blow } from '../game/combat';
import { MAPS, findEntityById, getActiveEntities } from '../game/content';
import type {
  Direction,
  InputCommand,
  MapId,
  SessionState,
  Tile,
} from '../game/types';
import {
  IMPACT,
  breath,
  hop,
  lunge,
  idleFrame,
  idleOffset,
  AT_REST,
  startStep,
  stepPosition,
  stepProgress,
  type Step,
  walkFrame,
} from './animation';
import {
  ART_SIZE,
  ASSET_PATHS,
  SPRITE_FRAMES,
  TILE_SIZE,
  isCharacter,
  resolveEntityAsset,
  resolvePlayerAsset,
  resolveTerrainAssets,
  spriteFrames,
  type AssetKey,
} from './assets';
import {
  cameraCentre,
  followZoom,
  hudTop,
  logStrip,
  type Point,
} from './camera';
import { keyDirection } from './keys';

export type WorldSceneDeps = {
  getSession: () => SessionState;
  // Whether the message box shows something Enter/Escape can close.
  hasMessage: () => boolean;
  onInput: (input: InputCommand) => void;
  // Escape with nothing to answer or close opens the menu.
  onMenu: () => void;
  // The blow a battle is playing, if one is.
  getStrike: () => Strike | null;
};

// One blow of a playing battle: the `index`th of the fight, taking `ms`.
export type Strike = Readonly<{
  enemyId: string;
  blow: Blow;
  index: number;
  ms: number;
  last: boolean;
}>;

// The enemy an open combat prompt is about, outlined inside its own cell.
const TARGET_COLOR = 0xef6a5c;

// Wall outlines (coloured per terrain, see assets.ts) and the shadow a wall
// casts on the floor below, in map units (TILE_SIZE is one tile).
const WALL_EDGE = 1.5;
const WALL_SHADOW = 6;
const WALL_SHADOW_ALPHA = 0.4;
const WALL_BEVEL_ALPHA = 0.3;

// Every PNG is ART_SIZE square and drawn at one tile.
const SPRITE_SCALE = TILE_SIZE / ART_SIZE;

// A character on the map (hero, villager, enemy) and its idle loop: the sprite itself, then
// any idle frames (assets.ts SPRITE_FRAMES).
type Actor = Readonly<{
  image: Phaser.GameObjects.Image;
  loop: readonly string[];
  offset: number;
}>;

const tileCentre = (tile: Tile): Point => ({
  x: (tile.x + 0.5) * TILE_SIZE,
  y: (tile.y + 0.5) * TILE_SIZE,
});

// Damage numbers: their height in map units, how far they rise over a blow,
// and their colour on the enemy and on the hero.
const DAMAGE_SIZE = 12;
const DAMAGE_RISE = 8;
const DAMAGE_COLOR = { hero: '#ffe9a8', enemy: '#ff8a7a' } as const;
// A struck character flashes this colour from the impact until this far
// through the blow.
const HURT_TINT = 0xff6a5c;
const HURT_UNTIL = 0.75;

const PROMPT_KEYS = new Map<string, InputCommand>([
  ['Enter', { kind: 'confirm' }],
  ['Escape', { kind: 'cancel' }],
]);

export class WorldScene extends Phaser.Scene {
  private readonly deps: WorldSceneDeps;
  private playerFacing: Direction = 'south';
  private ready = false;
  // Rebuilt by every refresh(), posed by every update().
  private actors: Actor[] = [];
  private hero: Actor | null = null;
  private heroWalk: readonly string[] = [];
  // Where the last refresh() put the hero, so the next one can tell a step
  // from a stair or a load.
  private shown: Readonly<{ mapId: MapId; tile: Tile }> | null = null;
  private step: Step = AT_REST;
  private follow = { top: 0, strip: 0, zoom: 1 };
  // The battle blow on show, when it started, and the enemy fighting it.
  private strike: Strike | null = null;
  private strikeStart = 0;
  private foe: Readonly<{ actor: Actor; feet: Point }> | null = null;
  private damage: Phaser.GameObjects.Text | null = null;

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const direction = keyDirection(event);
    if (direction !== undefined) {
      event.preventDefault();
      // A held key repeats far faster than a step plays, so its repeats wait
      // for the map to draw and the current step to land; fresh presses
      // always go through.
      if (event.repeat && !this.canRepeat()) return;
      // A playing battle takes no moves, so it must not turn the hero either.
      if (this.deps.getStrike()) return;
      this.playerFacing = direction;
      this.deps.onInput({ kind: 'move', direction });
      return;
    }
    // Enter/Escape answer an open combat or purchase prompt; with none open,
    // either one closes the shown message (a cancel with nothing pending is
    // a no-op that clears it), but only on a fresh press, so a held Enter
    // that just confirmed a prompt can't auto-repeat away its result. With
    // nothing to answer or close, Escape opens the menu and Enter is left
    // alone. preventDefault stops a focused button from also firing its
    // click.
    const command = PROMPT_KEYS.get(event.key);
    if (command === undefined) return;
    if (this.deps.getSession().pending) {
      event.preventDefault();
      this.deps.onInput(command);
    } else if (event.repeat) {
      return;
    } else if (this.deps.hasMessage()) {
      event.preventDefault();
      this.deps.onInput({ kind: 'cancel' });
    } else if (command.kind === 'cancel') {
      event.preventDefault();
      this.deps.onMenu();
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
    for (const key of Object.keys(SPRITE_FRAMES) as AssetKey[]) {
      for (const motion of ['idle', 'walk'] as const) {
        for (const frame of spriteFrames(key, motion)) {
          this.load.image(frame.key, frame.path);
        }
      }
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

  update(time: number): void {
    if (this.ready) this.pose(time);
  }

  refresh(): void {
    if (!this.ready) return;
    const { game: state, pending } = this.deps.getSession();
    const map = MAPS[state.mapId];
    const now = this.time.now;
    this.children.removeAll(true);
    this.actors = [];

    // One tile along the same map is a step, slid from the tile left behind.
    // Anything else (stairs, a load, a reset) just places the hero.
    const shown = this.shown;
    if (
      shown?.mapId === state.mapId &&
      Math.abs(shown.tile.x - state.tile.x) +
        Math.abs(shown.tile.y - state.tile.y) ===
        1
    ) {
      this.step = startStep(this.step, tileCentre(shown.tile), now);
    } else if (
      shown?.mapId !== state.mapId ||
      shown.tile.x !== state.tile.x ||
      shown.tile.y !== state.tile.y
    ) {
      this.step = { ...this.step, start: -Infinity };
    }
    this.shown = { mapId: state.mapId, tile: state.tile };

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
    this.follow = { top, strip, zoom };
    camera.setZoom(zoom);

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

    const strike = this.deps.getStrike();
    if (
      strike &&
      (strike.index !== this.strike?.index ||
        strike.enemyId !== this.strike.enemyId)
    )
      this.strikeStart = now;
    this.strike = strike;
    this.foe = null;

    const targetId =
      strike?.enemyId ?? (pending?.kind === 'combat' ? pending.enemyId : null);
    const target = targetId !== null && findEntityById(targetId);
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

      const feet = {
        x: (entity.tile.x + 0.5) * TILE_SIZE,
        y: (entity.tile.y + 1) * TILE_SIZE,
      };
      if (isCharacter(assetKey)) {
        const actor = this.addActor(assetKey, feet, idleOffset(entity.tile));
        if (entity.id === strike?.enemyId) this.foe = { actor, feet };
      } else {
        this.add
          .image(feet.x, feet.y, assetKey)
          .setOrigin(0.5, 1)
          .setScale(SPRITE_SCALE);
      }
    }

    const heroKey = resolvePlayerAsset(this.playerFacing);
    this.hero = this.addActor(heroKey, { x: 0, y: 0 }, 0);
    this.heroWalk = spriteFrames(heroKey, 'walk').map((frame) => frame.key);
    // Drawn at the camera's own resolution and scaled back down, so the
    // number stays crisp at any zoom.
    const fontSize = Math.max(1, Math.round(DAMAGE_SIZE * zoom));
    this.damage = strike
      ? this.add
          .text(0, 0, `-${strike.blow.damage}`, {
            fontFamily: 'Cinzel, serif',
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
            color: DAMAGE_COLOR[strike.blow.by === 'hero' ? 'hero' : 'enemy'],
            stroke: '#140c08',
            strokeThickness: Math.max(1, Math.round(fontSize / 5)),
          })
          .setOrigin(0.5, 1)
          .setScale(DAMAGE_SIZE / fontSize)
      : null;
    this.pose(now);
  }

  // A character standing on `feet`, posed by every update().
  private addActor(key: AssetKey, feet: Point, offset: number): Actor {
    const image = this.add
      .image(feet.x, feet.y, key)
      .setOrigin(0.5, 1)
      .setScale(SPRITE_SCALE);
    const idle = spriteFrames(key, 'idle').map((frame) => frame.key);
    const actor = { image, loop: [key, ...idle], offset };
    this.actors.push(actor);
    return actor;
  }

  // The centre of the hero as drawn at `time`, partway through a step.
  private heroAt(time: number): Point {
    const target = tileCentre(this.shown?.tile ?? { x: 0, y: 0 });
    return stepPosition(this.step, target, time);
  }

  private canRepeat(): boolean {
    return this.ready && stepProgress(this.time.now, this.step.start) >= 1;
  }

  // Moves everything that animates to where it stands at `time`: every
  // character through its idle loop, and the hero along their step with the
  // camera following. A sprite with no frames for a motion breathes or hops
  // instead; the breath squashes toward its feet so it stays in its cell.
  private pose(time: number): void {
    for (const { image, loop, offset } of this.actors) {
      const frames = loop.length - 1;
      const squash = frames > 0 ? 1 : breath(time, offset);
      image
        .setTexture(loop[idleFrame(time, offset, frames)]!)
        .setScale(SPRITE_SCALE, SPRITE_SCALE * squash);
    }
    if (!this.hero) return;

    const at = this.heroAt(time);
    const progress = stepProgress(time, this.step.start);
    let lift = 0;
    if (progress < 1) {
      const { image, loop } = this.hero;
      const walk = this.heroWalk;
      image.setScale(SPRITE_SCALE);
      if (walk.length > 0) {
        image.setTexture(
          walk[walkFrame(this.step.count, progress, walk.length)]!,
        );
      } else {
        image.setTexture(loop[0]!);
        lift = hop(progress);
      }
    }
    this.hero.image.setPosition(at.x, at.y + TILE_SIZE / 2 - lift);
    this.poseStrike(time, at);

    const { top, strip, zoom } = this.follow;
    const centre = cameraCentre(top, strip, zoom, at);
    this.cameras.main.centerOn(centre.x, centre.y);
  }

  // The battle blow on show: the striker lunges at its foe, which flashes
  // as the number of HP it lost rises off it. After the last blow the enemy
  // fades out before the victory shows.
  private poseStrike(time: number, heroAt: Point): void {
    const { strike, foe, hero, damage } = this;
    if (!strike || !foe || !hero) return;
    const progress = (time - this.strikeStart) / strike.ms;
    const toFoe = {
      x: Math.sign(foe.feet.x - heroAt.x),
      y: Math.sign(foe.feet.y - TILE_SIZE / 2 - heroAt.y),
    };
    const heroStrikes = strike.blow.by === 'hero';
    const reach = lunge(progress) * TILE_SIZE * (heroStrikes ? 1 : -1);
    // update() poses the hero afresh every frame, but not the enemy, so its
    // lunge starts from its own feet.
    const [striker, struck] = heroStrikes
      ? [hero.image, foe.actor.image]
      : [foe.actor.image, hero.image];
    const home = heroStrikes ? { x: hero.image.x, y: hero.image.y } : foe.feet;
    foe.actor.image.setPosition(foe.feet.x, foe.feet.y);
    striker.setPosition(home.x + toFoe.x * reach, home.y + toFoe.y * reach);
    const hurt = progress >= IMPACT && progress < HURT_UNTIL;
    if (hurt) struck.setTint(HURT_TINT).setTintMode(Phaser.TintModes.FILL);
    else struck.clearTint();
    foe.actor.image.setAlpha(
      strike.last ? Math.min(1, Math.max(0, 2 - progress)) : 1,
    );

    if (!damage) return;
    const rise = Math.min(1, Math.max(0, (progress - IMPACT) / (1 - IMPACT)));
    damage
      .setPosition(struck.x, struck.y - TILE_SIZE * 0.6 - rise * DAMAGE_RISE)
      .setAlpha(progress < IMPACT ? 0 : Math.min(1, Math.max(0, 2 - progress)));
  }
}
