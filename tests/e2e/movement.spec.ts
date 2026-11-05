import { expect, test, type Page } from '@playwright/test';

import { createInitialGameState } from '../../src/game/state';
import type { GameState } from '../../src/game/types';
import { savedGame } from './journey';

// The hero's tile as the autosave last wrote it.
function savedTileX(page: Page): Promise<number | undefined> {
  return page.evaluate(() => {
    const save = localStorage.getItem('eridanus.save');
    return save ? (JSON.parse(save).tile.x as number) : undefined;
  });
}

// A held arrow key repeats far faster than a step plays. Each repeat that
// lands mid-step must wait, or the hero runs ahead of where it is drawn.
test('a held arrow key walks one tile per step, not one per repeat', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );

  // The village start (15,10) has open floor east to (20,10). A press and
  // its repeats dispatched in one go all land inside the first step, so
  // only the press may move; unpaced, the repeats would reach the wall.
  await page.evaluate(() => {
    const press = (repeat: boolean) =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', repeat }),
      );
    press(false);
    for (let i = 0; i < 6; i++) press(true);
  });
  await expect.poll(() => savedTileX(page)).toBe(16);

  // Once the step lands, holding on walks on.
  await expect
    .poll(async () => {
      await page.evaluate(() =>
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true }),
        ),
      );
      return savedTileX(page);
    })
    .toBeGreaterThan(16);
});

// WASD moves like the arrow keys; Ctrl/Cmd with a letter stays the
// browser's shortcut.
test('WASD walks the hero like the arrow keys', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );

  // From the village start (15,10), east is open floor.
  await page.keyboard.press('d');
  await expect.poll(() => savedTileX(page)).toBe(16);
  await page.keyboard.press('D');
  await expect.poll(() => savedTileX(page)).toBe(17);
  await page.keyboard.press('a', { delay: 50 });
  await expect.poll(() => savedTileX(page)).toBe(16);

  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }),
    ),
  );
  await page.keyboard.press('a');
  await expect.poll(() => savedTileX(page)).toBe(15);
});

test('a wall bump clears stale messages and frees Escape for the menu', async ({
  page,
}) => {
  const save: GameState = {
    ...createInitialGameState(),
    mapId: 'floor1',
    tile: { x: 13, y: 14 },
  };
  await page.goto('/');
  await page.evaluate(
    (json) => localStorage.setItem('eridanus.save', JSON.stringify(json)),
    save,
  );
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );

  await page.keyboard.press('ArrowDown');
  await expect(
    page.locator('[data-testid="effect"][data-effect="clue"]'),
  ).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('blocked-reason')).toHaveAttribute(
    'data-reason',
    'latch-closed-front',
  );

  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => savedGame(page))
    .toMatchObject({ tile: { x: 13, y: 14 } });
  await expect(page.locator('[data-testid="effect"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="blocked-reason"]')).toHaveCount(0);
  await expect(page.locator('[data-action="dismiss"]')).toHaveCount(0);
  await expect(page.getByTestId('interaction')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(
    page.locator('[data-testid="menu"][data-open="true"]'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('menu')).toBeHidden();

  await page.keyboard.press('ArrowLeft');
  await expect
    .poll(() => savedGame(page))
    .toMatchObject({ tile: { x: 12, y: 14 } });
});
