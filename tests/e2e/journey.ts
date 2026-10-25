import { expect, test, type Page } from '@playwright/test';

import {
  MAPS,
  findEntityById,
  isLayoutFloor,
  isTileBlockedByEntity,
} from '../../src/game/content';
import { tileInDirection } from '../../src/game/geometry';
import { dispatchInput } from '../../src/game/session';
import { createInitialGameState } from '../../src/game/state';
import type {
  ActionEffect,
  Direction,
  GameState,
  InputCommand,
  SessionState,
  Tile,
} from '../../src/game/types';

const KEYS: Record<Direction, string> = {
  north: 'ArrowUp',
  south: 'ArrowDown',
  east: 'ArrowRight',
  west: 'ArrowLeft',
};
const DIRECTIONS = Object.keys(KEYS) as Direction[];
const OPPOSITE: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};
const tileKey = (tile: Tile): string => `${tile.x},${tile.y}`;

export async function savedGame(page: Page): Promise<unknown> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('eridanus.save') ?? 'null'),
  );
}

// A walk through the authored maps, named by what it bumps rather than by
// counted key presses. Each step plans the shortest open walk with the real
// rules (never across a stair it is not taking), replays it on a pure
// session, and, once a page is attached, presses the same keys in the real
// game and checks the page shows what the rules produced. Map edits move
// the walks with them; only a change to what the journey bumps needs a
// test change.
export class Journey {
  page: Page | null = null;
  private session: SessionState = {
    game: createInitialGameState(),
    pending: null,
  };

  get game(): GameState {
    return this.session.game;
  }

  entityTile(id: string): Tile {
    const entity = findEntityById(id);
    if (!entity) throw new Error(`${id} is not authored`);
    return entity.tile;
  }

  // Runs page-only checks; a journey replayed on the rules alone skips them.
  async check(run: (page: Page) => Promise<void>): Promise<void> {
    if (this.page) await run(this.page);
  }

  // The page's save holds exactly the state the rules reached.
  async expectInSync(): Promise<void> {
    const page = this.page;
    if (!page) return;
    await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
    await expect.poll(() => savedGame(page)).toEqual(this.game);
  }

  private async input(
    command: InputCommand,
    key: string,
  ): Promise<ActionEffect | null> {
    const result = dispatchInput(this.session, command);
    if (!result.ok)
      throw new Error(
        `${this.game.mapId} ${tileKey(this.game.tile)}: ${key} refused (${result.reason})`,
      );
    this.session = result.session;
    await this.page?.keyboard.press(key);
    return result.effect;
  }

  private move(direction: Direction): Promise<ActionEffect | null> {
    return this.input({ kind: 'move', direction }, KEYS[direction]);
  }

  private isStair(tile: Tile): boolean {
    return MAPS[this.game.mapId].entities.some(
      (entity) =>
        entity.kind === 'portal' && tileKey(entity.tile) === tileKey(tile),
    );
  }

  private canStand(tile: Tile): boolean {
    return (
      isLayoutFloor(this.game.mapId, tile) &&
      !isTileBlockedByEntity(this.game, tile)
    );
  }

  // The shortest walk from here to `goal` over open floor, stepping on a
  // stair only when it is the goal.
  private path(goal: Tile): Direction[] | null {
    const from = new Map<string, readonly [Tile, Direction] | null>([
      [tileKey(this.game.tile), null],
    ]);
    const queue: Tile[] = [this.game.tile];
    while (queue.length > 0) {
      const tile = queue.shift()!;
      if (tileKey(tile) === tileKey(goal)) break;
      for (const direction of DIRECTIONS) {
        const next = tileInDirection(tile, direction);
        const key = tileKey(next);
        if (from.has(key) || !this.canStand(next)) continue;
        if (this.isStair(next) && key !== tileKey(goal)) continue;
        from.set(key, [tile, direction]);
        queue.push(next);
      }
    }
    if (!from.has(tileKey(goal))) return null;
    const directions: Direction[] = [];
    for (let step = from.get(tileKey(goal)); step;) {
      directions.unshift(step[1]);
      step = from.get(tileKey(step[0]));
    }
    return directions;
  }

  private async walk(directions: readonly Direction[]): Promise<void> {
    for (const direction of directions) {
      const effect = await this.move(direction);
      if (effect?.kind !== 'moved')
        throw new Error(
          `walk ran into ${effect?.kind} at ${tileKey(this.game.tile)}`,
        );
    }
  }

  private async expectShown(effect: ActionEffect | null): Promise<void> {
    const page = this.page;
    if (!page || !effect) return;
    if (effect.kind === 'combatPrompt')
      await expect(page.getByTestId('combat-prompt')).toBeVisible();
    else if (effect.kind === 'traveled')
      await expect(page.getByTestId('map-name')).toHaveAttribute(
        'data-map-id',
        effect.mapId,
      );
    else if (effect.kind !== 'moved' && effect.kind !== 'purchasePrompt')
      await expect(page.getByTestId('effect')).toHaveAttribute(
        'data-effect',
        effect.kind,
      );
    if (effect.kind !== 'combatPrompt' && effect.kind !== 'purchasePrompt')
      await this.expectInSync();
  }

  // Walks to `tile` without bumping anything on the way.
  async walkTo(tile: Tile): Promise<void> {
    const path = this.path(tile);
    if (!path)
      throw new Error(`no walk to ${tileKey(tile)} on ${this.game.mapId}`);
    await this.walk(path);
    await this.expectInSync();
  }

  // Walks beside an entity on this map and into it; returns what the bump
  // did, once the page shows it.
  async bump(id: string): Promise<ActionEffect | null> {
    const entity = MAPS[this.game.mapId].entities.find((e) => e.id === id);
    if (!entity) throw new Error(`${id} is not on ${this.game.mapId}`);
    let best: { path: Direction[]; into: Direction } | null = null;
    for (const side of DIRECTIONS) {
      const tile = tileInDirection(entity.tile, side);
      const here = tileKey(tile) === tileKey(this.game.tile);
      if (!here && (!this.canStand(tile) || this.isStair(tile))) continue;
      const path = here ? [] : this.path(tile);
      if (path && (!best || path.length < best.path.length))
        best = { path, into: OPPOSITE[side] };
    }
    if (!best)
      throw new Error(`no walk to ${id} from ${tileKey(this.game.tile)}`);
    await this.walk(best.path);
    const effect = await this.move(best.into);
    await this.expectShown(effect);
    return effect;
  }

  // Bumps `id` and expects that bump's effect.
  async expectBump(
    id: string,
    kind: ActionEffect['kind'],
  ): Promise<ActionEffect> {
    const effect = await this.bump(id);
    if (effect?.kind !== kind)
      throw new Error(`${id}: expected ${kind}, got ${effect?.kind}`);
    return effect;
  }

  // Bumps an enemy and checks its prompt shows the previewed HP loss.
  async prompt(id: string): Promise<void> {
    const prompt = await this.expectBump(id, 'combatPrompt');
    if (prompt.kind !== 'combatPrompt') return;
    await this.check(async (page) => {
      await expect(page.getByTestId('combat-hp-loss')).toHaveText(
        `HP loss: ${prompt.preview.hpLoss}`,
      );
    });
  }

  // Fights the open prompt, with Enter or its Fight button, and checks the
  // win and the HP it left.
  async confirm(via: 'Enter' | 'click' = 'Enter'): Promise<void> {
    await this.answer({ kind: 'confirm' }, via, 'Enter', 'Fight');
    if (this.session.pending) throw new Error('the fight did not resolve');
    const { hp, maxHp } = this.game.player;
    await this.check(async (page) => {
      await expect(page.getByTestId('effect')).toHaveAttribute(
        'data-effect',
        'enemyDefeated',
      );
      await expect(page.locator('[data-stat="hp"]')).toHaveText(
        `HP ${hp}/${maxHp}`,
      );
    });
    await this.expectInSync();
  }

  // Backs out of the open prompt, with Escape or its Cancel button.
  async cancel(via: 'Escape' | 'click' = 'Escape'): Promise<void> {
    await this.answer({ kind: 'cancel' }, via, 'Escape', 'Cancel');
    await this.check(async (page) => {
      await expect(page.getByTestId('combat-prompt')).toHaveCount(0);
    });
  }

  private async answer(
    command: InputCommand,
    via: string,
    key: string,
    button: string,
  ): Promise<void> {
    if (via === key) {
      await this.input(command, key);
      return;
    }
    const result = dispatchInput(this.session, command);
    if (!result.ok) throw new Error(`${button}: ${result.reason}`);
    this.session = result.session;
    await this.page?.getByRole('button', { name: button }).click();
  }

  async fight(id: string, via: 'Enter' | 'click' = 'Enter'): Promise<void> {
    await this.prompt(id);
    await this.confirm(via);
  }

  // With nothing pending, Enter just closes the shown message.
  async dismiss(): Promise<void> {
    await this.input({ kind: 'confirm' }, 'Enter');
    await this.check(async (page) => {
      await expect(page.getByTestId('effect')).toHaveCount(0);
    });
  }

  // The hero card shows the stats the rules reached.
  async expectStats(): Promise<void> {
    const { hp, maxHp, attack, defense, gold } = this.game.player;
    await this.check(async (page) => {
      for (const [stat, text] of [
        ['hp', `HP ${hp}/${maxHp}`],
        ['attack', `ATK ${attack}`],
        ['defense', `DEF ${defense}`],
        ['gold', `Gold ${gold}`],
      ])
        await expect(page.locator(`[data-stat="${stat}"]`)).toHaveText(text);
    });
  }

  async heal(id: string): Promise<void> {
    await this.expectBump(id, 'healed');
  }

  // Walks onto a stair and rides it.
  async travel(id: string): Promise<void> {
    const stair = findEntityById(id);
    if (stair?.kind !== 'portal') throw new Error(`${id} is not a stair`);
    const path = this.path(stair.tile);
    const last = path?.pop();
    if (!path || !last) throw new Error(`no walk to ${id}`);
    await this.walk(path);
    const effect = await this.move(last);
    if (effect?.kind !== 'traveled')
      throw new Error(`${id}: expected to travel, got ${effect?.kind}`);
    await this.expectShown(effect);
  }
}

export type Chapter = {
  readonly title: string;
  readonly run: (journey: Journey) => Promise<void>;
  // A chapter the browser skips: replayed on the rules alone so the
  // chapters after it start from the state it leaves.
  readonly replayOnly?: boolean;
};

// A journey runs as one test per chapter. Each starts from the save the
// chapters before it leave, replayed on the rules alone, and ends by
// checking the page's save matches the rules, so consecutive chapters join
// up exactly while they spread across workers.
export function journeyChapters(
  name: string,
  chapters: readonly Chapter[],
): void {
  chapters.forEach((chapter, index) => {
    if (chapter.replayOnly) return;
    test(`${name}: ${chapter.title}`, async ({ page }) => {
      test.setTimeout(240_000);
      const journey = new Journey();
      for (const earlier of chapters.slice(0, index))
        await earlier.run(journey);
      await page.goto('/');
      await page.evaluate(
        (save) => {
          localStorage.clear();
          if (save) localStorage.setItem('eridanus.save', JSON.stringify(save));
        },
        index === 0 ? null : journey.game,
      );
      await page.reload();
      await expect(page.getByTestId('map-name')).toHaveAttribute(
        'data-map-id',
        journey.game.mapId,
      );
      journey.page = page;
      await chapter.run(journey);
      await journey.expectInSync();
      await journey.expectStats();
    });
  });
}
