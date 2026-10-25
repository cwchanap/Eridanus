import { expect, test, type Page } from '@playwright/test';

import { createInitialGameState } from '../../src/game/state';

// Boot in the village with a purse, written through the same localStorage
// boundary a real run saves to.
async function bootInVillage(
  page: Page,
  tile: { x: number; y: number },
  gold: number,
): Promise<void> {
  const initial = createInitialGameState();
  await page.goto('/');
  await page.evaluate(
    (save) => localStorage.setItem('eridanus.save', JSON.stringify(save)),
    { ...initial, tile, player: { ...initial.player, gold } },
  );
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );
}

async function press(
  page: Page,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
): Promise<void> {
  await page.keyboard.press(key, { delay: 50 });
}

test('the smith sells wares in order for gold', async ({ page }) => {
  // (11,12) is Market Row in front of the smith's counter (11,13).
  await bootInVillage(page, { x: 11, y: 12 }, 20);
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 20');

  // Down: the counter offers the first ware; Escape leaves without buying.
  await press(page, 'ArrowDown');
  await expect(page.getByTestId('purchase-prompt')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('purchase-prompt')).toHaveCount(0);
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 20');

  // Down, Enter: buy the Iron Sword (+1 ATK for 15 gold). Enter is held:
  // its auto-repeat (a second keydown before keyup) must not close the
  // receipt the first keydown produced.
  await press(page, 'ArrowDown');
  await page.keyboard.down('Enter');
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'purchased',
  );
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'purchased',
  );
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 11');
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 5');
  await expect(page.locator('[data-item="iron-sword"]')).toHaveCount(1);
  // Escape closes the receipt, like any message.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('effect')).toHaveCount(0);

  // Down again: the next ware costs more than the purse, so Buy is refused
  // and the prompt stays open until Leave.
  await press(page, 'ArrowDown');
  await page.getByRole('button', { name: 'Buy' }).click();
  await expect(page.getByTestId('blocked-reason')).toHaveAttribute(
    'data-reason',
    'not-enough-gold',
  );
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByTestId('purchase-prompt')).toHaveCount(0);

  // The purchase survives a reload.
  await page.reload();
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 11');
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 5');
});

test('a sealed maze entrance turns the hero back and saves nothing', async ({
  page,
}) => {
  // (2,7) is the Mine Trail beside the sealed mine (1,7).
  await bootInVillage(page, { x: 2, y: 7 }, 0);
  const before = await page.evaluate(() =>
    localStorage.getItem('eridanus.save'),
  );
  await press(page, 'ArrowLeft');
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'accessLocked',
  );
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );
  expect(await page.evaluate(() => localStorage.getItem('eridanus.save'))).toBe(
    before,
  );
  // The message's close button dismisses it too.
  await page.getByRole('button', { name: 'Close message' }).click();
  await expect(page.getByTestId('effect')).toHaveCount(0);
});

test('the menu holds the shop counter still under it', async ({ page }) => {
  await bootInVillage(page, { x: 11, y: 12 }, 20);
  await press(page, 'ArrowDown');
  await expect(page.getByTestId('purchase-prompt')).toBeVisible();

  // Opened over the counter, the menu keeps keys and focus to itself: no
  // Tab reaches Buy behind it, and no Enter buys.
  await page.locator('[data-action="open-menu"]').click();
  await expect(page.getByTestId('menu')).toBeVisible();
  for (const key of ['Shift+Tab', 'Enter', 'Shift+Tab', 'Enter', 'Tab'])
    await page.keyboard.press(key);
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 20');
  await expect(page.locator('[data-item="iron-sword"]')).toHaveCount(0);

  // Escape closes the menu, and the counter is still open behind it.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('menu')).toBeHidden();
  await expect(page.getByTestId('purchase-prompt')).toBeVisible();
});

test('Enter on the focused Menu button opens the menu, not the sale', async ({
  page,
}) => {
  await bootInVillage(page, { x: 11, y: 12 }, 20);
  await press(page, 'ArrowDown');
  await expect(page.getByTestId('purchase-prompt')).toBeVisible();

  await page.locator('[data-action="open-menu"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('menu')).toBeVisible();
  await expect(page.getByTestId('purchase-prompt')).toBeVisible();
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 20');
  await expect(page.locator('[data-item="iron-sword"]')).toHaveCount(0);
});
