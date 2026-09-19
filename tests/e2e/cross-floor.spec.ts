import { expect, test, type Page } from '@playwright/test';

import { ASSET_PATHS } from '../../src/phaser/assets';

async function press(
  page: Page,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i += 1)
    // Small delay keeps each press a distinct keydown event.
    await page.keyboard.press(key, { delay: 50 });
}

test('serves every runtime image in the asset catalog', async ({ request }) => {
  for (const path of Object.values(ASSET_PATHS)) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should be served`).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
  }
});

test('boots the real game with persistent player stats', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 10');
  await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 2');
});

test('accepts movement while assets are still loading', async ({ page }) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Hold every image response so Phaser stays in preload() throughout the
  // presses; the overlay assertions below can only pass if the keydowns
  // were captured before the scene's create().
  await page.route('**/*.png', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/');
    // Right steps beside the warden; Up bumps them into dialogue.
    await press(page, 'ArrowRight', 1);
    await press(page, 'ArrowUp', 1);
    const warden = page.getByTestId('interaction').locator('[data-effect]');
    await expect(warden).toHaveAttribute('data-effect', 'dialogue');
    await expect(warden).toContainText(/\S/);
  } finally {
    release();
  }
});

test('completes the village-to-floor2 journey', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );

  // Right: step beside the warden (3,8); Up: bump village-warden
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );

  // Journal open survives overlay rerenders while moving
  await page.getByTestId('journal').locator('summary').click();
  await expect(page.getByTestId('journal')).toHaveAttribute('open', '');
  await press(page, 'ArrowRight', 1);
  await expect(page.getByTestId('journal')).toHaveAttribute('open', '');
  // Back to (3,8), then Up to talk to the warden again
  await press(page, 'ArrowLeft', 1);
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );

  // Right x5, Up x3, Right x3, Up x3: village portal → Floor 1 (2,14)
  await press(page, 'ArrowRight', 5);
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight', 3);
  await press(page, 'ArrowUp', 3);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );
  await expect(page.locator('[data-section="floor1-entry-court"]')).toHaveCount(
    1,
  );
  await expect(page.locator('[data-note="floor1-treasury-seen"]')).toHaveCount(
    1,
  );

  // Right, Up x3: bump floor1-west-sentry; Fight → HP 22/30
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 3);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 8');
  await page.getByRole('button', { name: 'Fight' }).click();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 22/30');

  // Up x2, Right x4, Up, Right x2, Down: collect floor1-depth-sigil
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 4);
  await press(page, 'ArrowUp', 1);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowDown', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'itemReward',
  );

  // Left x2, Down, Left x3, Up x6, Right x2, Up, Right x3: to (9,3)
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowUp', 6);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowUp', 1);
  await press(page, 'ArrowRight', 3);

  // Up: sigil unlocks the front Floor-2 stair → Floor 2 (1,8)
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor2',
  );
  await expect(page.locator('[data-section="floor2-connector"]')).toHaveCount(
    1,
  );

  // Discovery survives reload
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor2',
  );
  await expect(page.locator('[data-section="floor1-entry-court"]')).toHaveCount(
    1,
  );
  await expect(page.locator('[data-note="floor1-treasury-seen"]')).toHaveCount(
    1,
  );
  await expect(page.locator('[data-section="floor2-connector"]')).toHaveCount(
    1,
  );

  // Right x13, Up x7: F2 rear portal → Floor 1 rear (21,3)
  await press(page, 'ArrowRight', 13);
  await press(page, 'ArrowUp', 7);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );

  // Left, Down x7, Left x4, Left: preview gatekeeper at 15 HP loss; Cancel
  await press(page, 'ArrowLeft', 1);
  await press(page, 'ArrowDown', 7);
  await press(page, 'ArrowLeft', 4);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 15');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Down, Left x3, Up x3: collect floor1-power-core → ATK 12
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowUp', 3);
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');

  // Down, Right x2: preview gatekeeper at 10 HP loss; Fight → HP 12/30
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowRight', 2);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 10');
  await page.getByRole('button', { name: 'Fight' }).click();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 12/30');

  // Left x2, Up x2, Left: open rear latch from the east side
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'latchOpened',
  );

  // Left x2: cross the open latch to the front side (10,8)
  await press(page, 'ArrowLeft', 2);

  // Reload: exact position, stats, and the open latch all survive
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 12/30');
  // Traverse the open latch tile in both directions with no blocked reason
  await press(page, 'ArrowRight', 1);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
});
