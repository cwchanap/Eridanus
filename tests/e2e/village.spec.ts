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

test('a better ware replaces the one worn in its slot', async ({ page }) => {
  await bootInVillage(page, { x: 11, y: 12 }, 100);
  const weapon = page.locator('[data-slot="weapon"]');
  const buy = page.getByRole('button', { name: 'Buy' });

  // Nothing is worn at first.
  await expect(weapon).toHaveAttribute('data-empty', 'true');

  // The Iron Sword (+1 ATK, 15 gold), then the Steel Sword (+3 ATK, 40
  // gold): the step up is +2, not +3 on top of the first.
  await press(page, 'ArrowDown');
  await buy.click();
  await expect(weapon).toHaveAttribute('data-item', 'iron-sword');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 11');
  await page.keyboard.press('Escape');

  await press(page, 'ArrowDown');
  const bonus = page.getByTestId('purchase-bonus');
  await expect(bonus).toHaveAttribute('data-before', '1');
  await expect(bonus).toHaveAttribute('data-after', '3');
  await buy.click();
  await expect(weapon).toHaveAttribute('data-item', 'steel-sword');
  // The Iron Sword is no longer worn; the items tab keeps it as spare.
  await expect(
    page.locator('[data-items="unequipped"] [data-item="iron-sword"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 13');
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 45');

  // The other slots are still bare, and the gear survives a reload.
  await expect(page.locator('[data-slot="armor"]')).toHaveAttribute(
    'data-empty',
    'true',
  );
  await page.reload();
  await expect(weapon).toHaveAttribute('data-item', 'steel-sword');
});

test('the status trader sells points at a price that rises', async ({
  page,
}) => {
  // (9,12) is Market Row beside the trader's stall (9,13).
  await bootInVillage(page, { x: 9, y: 12 }, 100);

  // Down: the stall quotes the first price; Escape leaves without trading.
  await press(page, 'ArrowDown');
  await expect(page.getByTestId('trade-prompt')).toBeVisible();
  await expect(page.getByTestId('trade-price')).toHaveAttribute(
    'data-price',
    '30',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('trade-prompt')).toHaveCount(0);
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 100');

  // Enter does not trade; 1 buys the first offer, +1 ATK.
  await press(page, 'ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('trade-prompt')).toBeVisible();
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 100');
  await page.keyboard.press('1');
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'traded',
  );
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 11');
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 70');
  await page.keyboard.press('Escape');

  // The second point costs 40; its button buys +1 DEF.
  await press(page, 'ArrowDown');
  await expect(page.getByTestId('trade-price')).toHaveAttribute(
    'data-price',
    '40',
  );
  await page.locator('[data-action="choose"][data-stat="defense"]').click();
  await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 3');
  await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 30');
  await page.keyboard.press('Escape');

  // The third costs 50, more than the purse: refused, prompt still open.
  await press(page, 'ArrowDown');
  await expect(page.getByTestId('trade-price')).toHaveAttribute(
    'data-price',
    '50',
  );
  await page.keyboard.press('3');
  await expect(page.getByTestId('blocked-reason')).toHaveAttribute(
    'data-reason',
    'not-enough-gold',
  );
  await expect(page.getByTestId('trade-prompt')).toBeVisible();
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByTestId('trade-prompt')).toHaveCount(0);

  // The price, like the stats, survives a reload.
  await page.reload();
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 11');
  await press(page, 'ArrowDown');
  await expect(page.getByTestId('trade-price')).toHaveAttribute(
    'data-price',
    '50',
  );
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
