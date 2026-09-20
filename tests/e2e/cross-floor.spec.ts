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

  // Right x5, Up x3, Right x3, Up x3: village portal → Floor 1 (2,14).
  // The walk passes over the returned subject's (5,8) tile, still absent.
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

  // Right, Up x3: bump floor1-west-sentry; Cancel clears the prompt, the
  // re-bump re-opens it, Fight → HP 22/30
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 3);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 8');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('combat-prompt')).toHaveCount(0);
  await press(page, 'ArrowUp', 1);
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

  // Up: sigil unlocks the front Floor-2 stair → Front Landing (8,10)
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor2',
  );
  await expect(
    page.locator('[data-section="floor2-front-landing"]'),
  ).toHaveCount(1);

  // Up x2: into the Central Hall (8,8)
  await press(page, 'ArrowUp', 2);
  await expect(
    page.locator('[data-section="floor2-central-hall"]'),
  ).toHaveCount(1);

  // Up x2, Right x4: the last press bumps floor2-east-release (12,6) from
  // its rear (west) side and opens it
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 4);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'latchOpened',
  );

  // Right x2: through the open release into the East Service Wing
  await press(page, 'ArrowRight', 2);
  await expect(
    page.locator('[data-section="floor2-east-service"]'),
  ).toHaveCount(1);

  // Up x5: the north column reaches the Rear Gallery (13,1)
  await press(page, 'ArrowUp', 5);
  await expect(
    page.locator('[data-section="floor2-rear-gallery"]'),
  ).toHaveCount(1);

  // Left x2, Down: bump floor2-missing-subject (11,2) → it departs for the
  // village and the main lead advances
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowDown', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.locator('[data-lead="investigate-deeper"]')).toHaveCount(1);

  // Down x2: the vacated subject tile neither blocks nor talks
  await press(page, 'ArrowDown', 2);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
  await expect(page.getByTestId('effect')).toHaveCount(0);

  // Down x3, Left x6: the last press bumps floor2-west-release (5,6) from
  // its rear (east) side and opens it
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowLeft', 6);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'latchOpened',
  );

  // Left x2: through the open release into the West Archive (4,6)
  await press(page, 'ArrowLeft', 2);
  await expect(
    page.locator('[data-section="floor2-west-archive"]'),
  ).toHaveCount(1);

  // Up x4: the new treasury stair (4,2) → Floor 1 workshop treasury (17,7)
  await press(page, 'ArrowUp', 4);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );
  await expect(
    page.locator('[data-section="floor1-workshop-treasury"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-note="floor1-treasury-return-used"]'),
  ).toHaveCount(1);

  // Left: claim floor1-future-treasury → DEF 2→4
  await press(page, 'ArrowLeft', 1);
  await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 4');

  // One HPA-146 reload checkpoint: discovered sections, player stats, and
  // every committed mechanism survive localStorage
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );
  await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 4');
  await expect(page.locator('[data-section="floor1-entry-court"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('[data-section="floor2-front-landing"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-section="floor1-workshop-treasury"]'),
  ).toHaveCount(1);

  // Left: the claimed treasury tile stays traversable and is never
  // re-granted (a reset reward would block or bump DEF again)
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
  await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 4');

  // Right: back through the treasury stair → Floor 2 (4,2). Down x4,
  // Right x2: crossing the west release from its front side only works
  // while it stays open
  await press(page, 'ArrowRight', 1);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor2',
  );
  await press(page, 'ArrowDown', 4);
  await press(page, 'ArrowRight', 2);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);

  // Up x3, Right x2, Up x2, Right x5, Down x5: around the rear gallery to
  // (13,6), then Left x2: crossing the east release from its front side
  // only works while it stays open
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 5);
  await press(page, 'ArrowDown', 5);
  await press(page, 'ArrowLeft', 2);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);

  // Up x5: the missing subject's tile is still walkable — it stays gone
  await press(page, 'ArrowUp', 5);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
  await expect(page.getByTestId('effect')).toHaveCount(0);

  // Right x5: rear portal → Floor 1 rear wing (21,3)
  await press(page, 'ArrowRight', 5);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );
  await expect(
    page.locator('[data-note="floor1-rear-stairs-used"]'),
  ).toHaveCount(1);

  // Left, Down x7, Left x5: preview the gatekeeper at 9 HP loss; Cancel
  await press(page, 'ArrowLeft', 1);
  await press(page, 'ArrowDown', 7);
  await press(page, 'ArrowLeft', 5);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 9');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Down, Left x3, Up x3: collect floor1-power-core → ATK 12
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowUp', 3);
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');

  // Down, Right x2: preview the gatekeeper at 6 HP loss; Fight → HP 16/30
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowRight', 2);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 6');
  await page.getByRole('button', { name: 'Fight' }).click();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 16/30');

  // Left x2, Up x2, Left: open the rear latch from its east side
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'latchOpened',
  );

  // Left x2: cross the rear latch (10,8). Then through the defeated
  // sentry's gap down to the village portal → village (11,2)
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowDown', 2);
  await press(page, 'ArrowLeft', 1);
  await press(page, 'ArrowUp', 1);
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 4);
  await press(page, 'ArrowDown', 4);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );

  // Down x3, Left x3, Down x3, Left x3: bump village-returned-subject (5,8)
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowLeft', 3);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
});
