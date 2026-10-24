import { expect, test, type Page } from '@playwright/test';

import { STEP_MS } from '../../src/phaser/animation';

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
  await page.waitForTimeout(STEP_MS * 2);
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true }),
    ),
  );
  await expect.poll(() => savedTileX(page)).toBe(17);
});
