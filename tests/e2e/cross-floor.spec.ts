import { expect, test, type Page } from '@playwright/test';

async function press(
  page: Page,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i += 1)
    // Small delay keeps each press a distinct keydown event.
    await page.keyboard.press(key, { delay: 50 });
}

test('boots the real game with persistent player stats', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 10');
  await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 2');
});

test('completes the village-to-floor2 journey', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveText('Starting Village');

  // Right ×2: bump village clue (assert effect kind, not prose)
  await press(page, 'ArrowRight', 2);
  const villageClue = page
    .getByTestId('interaction')
    .locator('[data-effect="clue"]');
  await expect(villageClue).toHaveAttribute('data-effect', 'clue');
  await expect(villageClue).toContainText(/\S/);
  // Up ×3, Right ×6: village portal → Floor 1 (2,9)
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight', 6);
  await expect(page.getByTestId('map-name')).toHaveText('Tower Floor 1');

  // Right ×3, Up ×4, Up: bump F1 clue
  await press(page, 'ArrowRight', 3);
  await press(page, 'ArrowUp', 4);
  await press(page, 'ArrowUp', 1);
  const floorClue = page
    .getByTestId('interaction')
    .locator('[data-effect="clue"]');
  await expect(floorClue).toHaveAttribute('data-effect', 'clue');
  await expect(floorClue).toContainText(/\S/);
  // Left ×1, Up ×3, Right ×1: F1 front portal → Floor 2 (1,8)
  await press(page, 'ArrowLeft', 1);
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight', 1);
  await expect(page.getByTestId('map-name')).toHaveText('Tower Floor 2');

  // Right ×13, Up ×7: F2 rear portal → F1 rear (14,2)
  await press(page, 'ArrowRight', 13);
  await press(page, 'ArrowUp', 7);
  await expect(page.getByTestId('map-name')).toHaveText('Tower Floor 1');

  // Down ×3, Left ×2, Left: preview enemy at 15 HP loss; Cancel
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 15');
  // movement gated while combat prompt open
  await page.keyboard.press('ArrowUp', { delay: 50 });
  await expect(page.getByTestId('blocked-reason')).toHaveAttribute(
    'data-reason',
    'interaction-pending',
  );
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Up ×1, Left ×3, Down: collect reward; assert ATK 12
  await press(page, 'ArrowUp', 1);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowDown', 1);
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');

  // Right ×3, Down ×1, Left: preview enemy at 10 HP loss; Fight; assert HP 20/30
  await press(page, 'ArrowRight', 3);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 10');
  await page.getByRole('button', { name: 'Fight' }).click();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 20/30');

  // Left ×4, Left: open latch from rear while remaining at (8,5)
  await press(page, 'ArrowLeft', 4);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('interaction')).toContainText('shortcut');

  // Reload: assert ATK 12 + HP 20/30
  await page.reload();
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 20/30');

  // Right ×3: walk over the collected reward onto the defeated gatekeeper
  // tile — persistence of the kill means no combat prompt reopens
  await press(page, 'ArrowRight', 3);
  await expect(page.getByTestId('combat-prompt')).toHaveCount(0);
  // Left ×3: back to (8,5)
  await press(page, 'ArrowLeft', 3);

  // Left ×2: cross open latch to front
  await press(page, 'ArrowLeft', 2);
  // Reload after ordinary movement: exact position (6,5) restored
  await page.reload();
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 20/30');
  // Left ×4, Down ×4: F1 portal → village (9,2)
  await press(page, 'ArrowLeft', 4);
  await press(page, 'ArrowDown', 4);
  await expect(page.getByTestId('map-name')).toHaveText('Starting Village');

  // Left ×7: bump recovery; assert HP 30/30
  await press(page, 'ArrowLeft', 7);
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');

  // Reload: assert Starting Village, ATK 12, HP 30/30
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveText('Starting Village');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
});
