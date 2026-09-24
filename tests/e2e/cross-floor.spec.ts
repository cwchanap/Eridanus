import { expect, test, type Page } from '@playwright/test';

import { previewCombat } from '../../src/game/combat';
import { findEntityById } from '../../src/game/content';
import { ASSET_PATHS } from '../../src/phaser/assets';

async function press(
  page: Page,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    // Small delay keeps each press a distinct keydown event.
    await page.keyboard.press(key, { delay: 50 });
    // A blocked reason at any intermediate press means the walked route
    // has drifted from the authored map — checking only after the last
    // press would hide where the drift started.
    await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
  }
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

test('completes the mvp story journey', async ({ page }) => {
  // The full village -> Floor 3 -> ending walk plus a per-press blocked
  // check needs more than the default 30s budget.
  test.slow();
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

  // Up x8: the first seven climb the x=8 column to (8,1), the eighth
  // bumps the sealed Floor-3 stair (8,0). The fact lock still holds —
  // the missing subject has not returned yet — so the seal sighting is
  // recorded and the player stays on (8,1)
  await press(page, 'ArrowUp', 8);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'accessLocked',
  );
  await expect(
    page.locator('[data-note="floor2-depth-seal-seen"]'),
  ).toHaveCount(1);
  // Down x7: back to the Central Hall (8,8)
  await press(page, 'ArrowDown', 7);

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

  // Up x3: to (6,3). Right x5, Up x2, Right x2: reach row 1 via the
  // x=11 column (the depth stair sits in its own dead-end pocket at
  // (8,0) and no longer lies on the row-1 corridor). Down x5: around
  // the rear gallery to (13,6), then Left x2: crossing the east release
  // from its front side only works while it stays open
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight', 5);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 2);
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

  // Village (6,8) -> village-to-floor1 (11,2) -> Floor 1 (2,14)
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowUp', 1);

  // Floor 1 (2,14) -> front Floor-2 stair (9,2) -> Floor 2 (8,10). The
  // 8th Up claims the uncollected floor1-ledger-fragment at (3,4) (a
  // claim bump keeps the player at (3,5)), so the 9th steps onto the
  // fragment tile before turning east
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 9);
  await press(page, 'ArrowRight', 3);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 3);

  // Floor 2 central column -> depth stair pocket (8,0) -> Floor 3
  // (10,13): the fact gate opens because main-subject-returned is
  // already durable
  await press(page, 'ArrowUp', 10);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor3',
  );
  await expect(
    page.locator('[data-section="floor3-entry-vestibule"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-lead="reach-heart-chamber"]')).toHaveCount(
    1,
  );

  // Up: Entry Vestibule portal tile (10,13) -> Twin Galleries row (10,12)
  await press(page, 'ArrowUp', 1);
  await expect(
    page.locator('[data-section="floor3-twin-galleries"]'),
  ).toHaveCount(1);

  // Left x4: move to the west spine at (6,12)
  await press(page, 'ArrowLeft', 4);

  // Up x8: follow the unobstructed west spine to Heart Approach (6,4).
  // The route is intentionally independent of floor3-vault-sentry (2,6).
  await press(page, 'ArrowUp', 8);
  await expect(
    page.locator('[data-section="floor3-heart-approach"]'),
  ).toHaveCount(1);

  // The heart clue at (9,3) blocks a straight row-3 crossing, so dogleg
  // through (8,4) before returning to the center column:
  // Up -> (6,3), Right x2 -> (8,3), Down -> (8,4), Right x2 -> (10,4)
  await press(page, 'ArrowUp', 1);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowRight', 2);

  // Down: bump floor3-heart-shortcut (10,5) from rearSide=north — its
  // rear approach (10,4) sits inside the Heart Approach section
  await press(page, 'ArrowDown', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'latchOpened',
  );

  // Down x5 crosses the opened latch to (10,9); Up x2 proves it is now
  // two-way
  await press(page, 'ArrowDown', 5);
  await press(page, 'ArrowUp', 2);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);

  // Up x4 -> sole boss approach (10,3)
  await press(page, 'ArrowUp', 4);

  // Right: bump floor3-heart-waystone (11,3), staying at (10,3)
  await press(page, 'ArrowRight', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'healed',
  );
  const healedHp = await page.locator('[data-stat="hp"]').textContent();
  const maxHp = Number(healedHp?.split('/')[1]);
  expect(healedHp).toBe(`HP ${maxHp}/${maxHp}`);

  // Up: bump floor3-core-guardian (10,2) from the sole approach. The HP
  // loss is computed from the journey's actual stats — the optional
  // rewards collected earlier make it lower than the fresh baseline —
  // never hardcoded.
  await press(page, 'ArrowUp', 1);
  const hpText = await page.locator('[data-stat="hp"]').textContent();
  const hp = Number(/HP (\d+)\//.exec(hpText ?? '')?.[1]);
  const atk = Number(
    (await page.locator('[data-stat="attack"]').textContent())?.replace(
      'ATK ',
      '',
    ),
  );
  const def = Number(
    (await page.locator('[data-stat="defense"]').textContent())?.replace(
      'DEF ',
      '',
    ),
  );
  // Same math as the game: the guardian's authored stats feed the real
  // previewCombat instead of a copied formula
  const guardian = findEntityById('floor3-core-guardian');
  if (guardian?.kind !== 'enemy') throw new Error('core guardian missing');
  const bossPreview = previewCombat(
    { hp, maxHp, attack: atk, defense: def },
    guardian.stats,
  );
  if (!bossPreview.winnable) throw new Error('guardian fight unwinnable');
  const bossLoss = bossPreview.hpLoss;
  await expect(page.getByTestId('combat-hp-loss')).toHaveText(
    `HP loss: ${bossLoss}`,
  );
  await page.getByRole('button', { name: 'Fight' }).click();
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'enemyDefeated',
  );
  await expect(page.locator('[data-stat="hp"]')).toHaveText(
    `HP ${hp - bossLoss}/${maxHp}`,
  );

  // Up: onto the former boss tile (10,2) without blocking
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);

  // Up: bump floor3-restoration-core (10,1)
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'itemReward',
  );
  await expect(
    page.locator('[data-lead="return-restoration-core"]'),
  ).toHaveCount(1);

  // HPA-137 persistence checkpoint: one reload proves the endgame state
  // survived localStorage
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor3',
  );
  // Down, Up x2: the defeated boss tile and the opened core chest both
  // stay traversable; Down again re-arms (10,2) as the return start
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowDown', 1);
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
  await expect(
    page.locator('[data-lead="return-restoration-core"]'),
  ).toHaveCount(1);

  // Floor 3 (10,2) -> opened center shortcut -> floor3-to-floor2 (10,13).
  // The 7th Down recrosses the persisted-open shortcut; the 11th steps on
  // the portal and arrives at Floor 2 (8,0), on the stair pocket itself
  await press(page, 'ArrowDown', 11);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor2',
  );

  // Down: step off the stair pocket to (8,1). Floor 2 Rear Gallery ->
  // floor2-rear-to-floor1 (16,1) -> Floor 1 (21,3)
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowRight', 8);

  // Floor 1 rear wing -> opened rear latch -> village portal (2,14)
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 8);
  await press(page, 'ArrowDown', 4);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 4);
  await press(page, 'ArrowDown', 4);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );

  // Village arrival is (11,2). Route around the standing NPCs to (4,7)
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 1);

  // Left: bump village-warden at (3,7) — carrying the core ends the story
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.locator('[data-lead="story-complete"]')).toHaveCount(1);

  // Reload in the village: the ending fact persisted — story-complete
  // still renders instead of being transient dialogue state
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );
  await expect(page.locator('[data-lead="story-complete"]')).toHaveCount(1);
});
