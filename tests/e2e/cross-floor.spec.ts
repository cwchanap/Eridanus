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

// The message box floats over the map at a fixed size, so no message may
// resize or move it.
async function messageBox(page: Page) {
  return page.getByTestId('interaction').boundingBox();
}

type Box = { x: number; y: number; width: number; height: number };

function expectWithin(inner: Box | null, outer: Box | null, what: string) {
  if (!inner || !outer) throw new Error(`${what} is not on screen`);
  // Half a pixel of slack for subpixel layout.
  expect(inner.x, `${what}: left edge`).toBeGreaterThanOrEqual(outer.x - 0.5);
  expect(inner.y, `${what}: top edge`).toBeGreaterThanOrEqual(outer.y - 0.5);
  expect(inner.x + inner.width, `${what}: right edge`).toBeLessThanOrEqual(
    outer.x + outer.width + 0.5,
  );
  expect(inner.y + inner.height, `${what}: bottom edge`).toBeLessThanOrEqual(
    outer.y + outer.height + 0.5,
  );
}

function expectApart(a: Box, b: Box, what: string) {
  const apart =
    a.x + a.width <= b.x + 0.5 ||
    b.x + b.width <= a.x + 0.5 ||
    a.y + a.height <= b.y + 0.5 ||
    b.y + b.height <= a.y + 0.5;
  expect(apart, `${what} overlap`).toBe(true);
}

// On a small window the hero card and journal share a row capped in height
// (or, on a short one, flank the banner), so anything spilling out of its
// panel is clipped: every stat must sit inside the hero card and show in
// full, the journal's toggle likewise, and no two panels may overlap.
async function expectHudFits(page: Page): Promise<void> {
  const hud = await page.getByTestId('hud').boundingBox();
  const banner = await page.getByTestId('map-name').boundingBox();
  const journal = await page.getByTestId('journal').boundingBox();
  if (!hud || !banner || !journal) throw new Error('HUD is not on screen');
  expectApart(hud, banner, 'hero card and banner');
  expectApart(hud, journal, 'hero card and journal');
  expectApart(banner, journal, 'banner and journal');
  for (const stat of ['hp', 'attack', 'defense', 'gold']) {
    const locator = page.locator(`[data-stat="${stat}"]`);
    expectWithin(await locator.boundingBox(), hud, `${stat} stat`);
    await expect(locator).toBeInViewport({ ratio: 1 });
  }
  const toggle = page.locator('[data-action="toggle-journal"]');
  expectWithin(await toggle.boundingBox(), journal, 'journal toggle');
  await expect(toggle).toBeInViewport({ ratio: 1 });
}

async function startFreshRun(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );
}

async function claimDepthSigil(page: Page): Promise<void> {
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
}

async function climbToFloor2CentralHall(page: Page): Promise<void> {
  // Left x2, Down, Left x3, Up x6, Right x2, Up, Right x3: to (9,3),
  // passing neither the ledger fragment (3,4) nor the west cache (7,13)
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowUp', 6);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowUp', 1);
  await press(page, 'ArrowRight', 3);

  // Up: sigil unlocks the front Floor-2 stair → Front Landing (8,11)
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor2',
  );
  await expect(
    page.locator('[data-section="floor2-front-landing"]'),
  ).toHaveCount(1);

  // Up x2: into the Central Hall (8,9)
  await press(page, 'ArrowUp', 2);
  await expect(
    page.locator('[data-section="floor2-central-hall"]'),
  ).toHaveCount(1);
}

async function enterFloor3AndReachHeartApproach(page: Page): Promise<void> {
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
}

async function openHeartShortcutAndHeal(page: Page): Promise<void> {
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

  // Up x4 -> sole boss approach (10,3); Right: bump the heart waystone
  // (11,3), staying at (10,3)
  await press(page, 'ArrowUp', 4);
  await press(page, 'ArrowRight', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'healed',
  );
}

async function claimRestorationCore(page: Page): Promise<void> {
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
}

async function descendToFloor1RearWing(page: Page): Promise<void> {
  // Floor 3 (10,2) -> opened center shortcut -> floor3-to-floor2 (10,13).
  // The 3rd Down recrosses the persisted-open shortcut; the 11th steps on
  // the portal and arrives at Floor 2 (8,1), on the stair pocket itself
  await press(page, 'ArrowDown', 11);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor2',
  );

  // Down: step off the stair pocket to (8,2). Right x8: Floor 2 Rear
  // Gallery -> floor2-rear-to-floor1 (16,2) -> Floor 1 (21,3)
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowRight', 8);
}

// The village's tower stair (23,1) sits at the end of a branch of the
// north outskirts. From (15,5), just inside the north gate: Up x2 through
// the gate to (15,3), Right x10 to (25,3), Up x2, Left x2: the stair →
// Floor 1 (2,14).
async function walkNorthGateToTower(page: Page): Promise<void> {
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 10);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowLeft', 2);
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );
}

// The same branch walked back: from the tower stair arrival (23,1) to
// (15,5), just inside the north gate.
async function walkTowerToNorthGate(page: Page): Promise<void> {
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowDown', 2);
  await press(page, 'ArrowLeft', 10);
  await press(page, 'ArrowDown', 2);
}

async function handCoreToWarden(
  page: Page,
  endingLineId: string,
): Promise<void> {
  // Back through the north gate to (15,5), Down x3 to (15,8), passing
  // west of the well (16,8) without drinking
  await walkTowerToNorthGate(page);
  await press(page, 'ArrowDown', 3);

  // Down: bump village-warden at (15,9) — carrying the core ends the
  // story. The ending lines are the longest authored dialogue.
  const box = await messageBox(page);
  await press(page, 'ArrowDown', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-line',
    endingLineId,
  );
  expect(await messageBox(page)).toEqual(box);
  await expect(page.locator('[data-lead="story-complete"]')).toHaveCount(1);

  // Reload in the village: the ending fact persisted — story-complete
  // still renders instead of being transient dialogue state
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );
  await expect(page.locator('[data-lead="story-complete"]')).toHaveCount(1);
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

// A phone held upright, then a short window: a phone on its side, or a
// 1366x768 laptop zoomed to 200%.
for (const view of [
  { width: 400, height: 844 },
  { width: 683, height: 325 },
]) {
  test(`keeps every stat readable at ${view.width}x${view.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(view);
    await startFreshRun(page);
    await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
    await expectHudFits(page);
  });
}

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
    // The HUD portraits are <img> tags held by the same route, so the
    // window load event cannot fire until release; the game is already
    // running once the module scripts finish at DOMContentLoaded.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // The hero starts below the warden; Up bumps them into dialogue.
    await press(page, 'ArrowUp', 1);
    const warden = page.getByTestId('interaction').locator('[data-effect]');
    await expect(warden).toHaveAttribute('data-effect', 'dialogue');
    await expect(warden).toContainText(/\S/);
  } finally {
    release();
  }
});

test('completes the required-only MVP route', async ({ page }) => {
  // The full village -> Floor 3 -> ending walk plus a per-press blocked
  // check needs more than the default 30s budget.
  test.slow();
  await startFreshRun(page);
  await expect(page.getByTestId('how-to-play')).toBeVisible();

  // Up: bump village-warden (15,9) from the start tile (15,10)
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-line',
    'warden-main-lead',
  );
  // The first recorded fact retires the fresh-run controls hint.
  await expect(page.getByTestId('how-to-play')).toHaveCount(0);

  // The journal panel stays on screen through overlay rerenders, and J
  // folds it to its title bar and back without moving the hero
  const journal = page.getByTestId('journal');
  await expect(journal).toBeVisible();
  await press(page, 'ArrowRight', 1);
  await expect(journal).toBeVisible();
  await page.keyboard.press('j');
  await expect(journal).toHaveAttribute('data-open', 'false');
  await expect(page.locator('[data-lead]')).toHaveCount(0);
  await page.keyboard.press('j');
  await expect(journal).toHaveAttribute('data-open', 'true');
  await press(page, 'ArrowLeft', 1);

  // Left, Up x2 to (14,8), Right to (15,8), Up x3 to (15,5) — passing
  // the well and the scout without bumping them — then out through the
  // north outskirts to the tower stair. The required route skips every
  // optional lead.
  await press(page, 'ArrowLeft', 1);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 3);
  await walkNorthGateToTower(page);
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
  // A move while the prompt is open is refused below the encounter card.
  // At a narrow, short window the message box and the Fight/Cancel
  // buttons keep their size and place
  await page.setViewportSize({ width: 800, height: 400 });
  const box = await messageBox(page);
  const fight = page.getByRole('button', { name: 'Fight' });
  const cancel = page.getByRole('button', { name: 'Cancel' });
  const fightBox = await fight.boundingBox();
  const cancelBox = await cancel.boundingBox();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('blocked-reason')).toHaveAttribute(
    'data-reason',
    'interaction-pending',
  );
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 8');
  expect(await messageBox(page)).toEqual(box);
  expect(await fight.boundingBox()).toEqual(fightBox);
  expect(await cancel.boundingBox()).toEqual(cancelBox);
  // Short and phone-width windows still show every stat, the fight's cost
  // included
  await expectHudFits(page);
  await page.setViewportSize({ width: 400, height: 844 });
  await expectHudFits(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await fight.click();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 22/30');

  await claimDepthSigil(page);
  await climbToFloor2CentralHall(page);

  // Up x7: climb the x=8 column to (8,2), ignoring both rear releases
  await press(page, 'ArrowUp', 7);

  // Right x3: along row 2 to the subject's north-adjacent tile (11,2);
  // Down: bump floor2-missing-subject (11,3) → it departs for the
  // village and the main lead advances
  await press(page, 'ArrowRight', 3);
  await press(page, 'ArrowDown', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-line',
    'subject-returning',
  );
  await expect(page.locator('[data-lead="investigate-deeper"]')).toHaveCount(1);

  // Left x3: back along row 2 to (8,2), clear of the vacated subject
  // tile (11,3) on the row below
  await press(page, 'ArrowLeft', 3);

  // Up: the fact gate opens (main-subject-returned) → Floor 3 (10,13)
  await press(page, 'ArrowUp', 1);
  await enterFloor3AndReachHeartApproach(page);

  // The heart clue at (9,3) blocks a straight row-3 crossing, so dogleg
  // through (8,4) before returning to the center column:
  // Up -> (6,3), Right x2 -> (8,3), Down -> (8,4), Right x2 -> (10,4)
  await press(page, 'ArrowUp', 1);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowRight', 2);

  await openHeartShortcutAndHeal(page);

  // The required route collects no optional rewards: fresh baseline stats
  // restored by the waystone, before the guardian gate
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 10');
  await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 2');

  // Up: bump floor3-core-guardian (10,2) from the sole approach. The
  // baseline cost is pinned here; src/game/combat.test.ts remains the
  // single owner of the guardian's balance expectations
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 25');
  await page.getByRole('button', { name: 'Fight' }).click();
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'enemyDefeated',
  );
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 5/30');

  await claimRestorationCore(page);
  await descendToFloor1RearWing(page);

  // Floor 1 rear wing → village portal (2,14). Down x3 stops short of
  // the unclaimed power core (13,8); Left, Down to (12,8) so the next
  // Left bumps the never-opened rear latch (11,8) from its rearSide
  // (east) and opens it
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 8);
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowLeft', 1);
  await press(page, 'ArrowDown', 1);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'latchOpened',
  );
  await press(page, 'ArrowLeft', 2);
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

  // No keeper record was read, so the plain restoration ending renders
  await handCoreToWarden(page, 'warden-restoration-ending');

  // The required route never accepts an optional lead nor reads the
  // optional evidence: no optional journal thread or note ever appears
  await expect(
    page.locator(
      '[data-lead^="heirloom-"], [data-lead^="route-"], [data-lead^="ledger-"]',
    ),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-note="floor1-route-mark-seen"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-note="floor2-paired-release-ledger-read"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-note="floor3-keeper-final-record-read"]'),
  ).toHaveCount(0);
});

test('completes the explorer MVP route with expanded ending context', async ({
  page,
}) => {
  // The full village -> Floor 3 -> ending walk plus a per-press blocked
  // check needs more than the default 30s budget.
  test.slow();
  await startFreshRun(page);

  // Up: bump village-warden (15,9) from the start tile (15,10)
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );

  // Every optional lead before leaving. Left x3, Up x2 to (12,8); Left:
  // bump village-artisan (11,8) and stay put
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-line',
    'artisan-find-workshop',
  );
  // Right, Up x3 to (13,5); Right: bump village-scout (14,5) by the
  // north gate
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-line',
    'scout-find-marks',
  );
  // Down x6 to (13,11); Right x6 to (19,11); Right: bump village-scribe
  // (20,11)
  await press(page, 'ArrowDown', 6);
  await press(page, 'ArrowRight', 6);
  await press(page, 'ArrowRight', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-line',
    'scribe-find-ledger',
  );

  // Up x6 to (19,5) — past the returned subject's (17,9) tile, still
  // empty — Left x4 to (15,5), then out to the tower stair
  await press(page, 'ArrowUp', 6);
  await press(page, 'ArrowLeft', 4);
  await walkNorthGateToTower(page);
  await expect(page.locator('[data-section="floor1-entry-court"]')).toHaveCount(
    1,
  );
  await expect(page.locator('[data-note="floor1-treasury-seen"]')).toHaveCount(
    1,
  );

  // Right, Up x3: bump floor1-west-sentry; a refused move at a narrow,
  // short window leaves the card and the Fight/Cancel buttons in place,
  // then Escape cancels the prompt, the re-bump re-opens it, Enter fights
  // → HP 22/30 (the gatekeeper preview below and the required-only route
  // keep the button clicks covered)
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 3);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 8');
  await page.setViewportSize({ width: 800, height: 400 });
  const box = await messageBox(page);
  const fight = page.getByRole('button', { name: 'Fight' });
  const cancel = page.getByRole('button', { name: 'Cancel' });
  const fightBox = await fight.boundingBox();
  const cancelBox = await cancel.boundingBox();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('blocked-reason')).toHaveAttribute(
    'data-reason',
    'interaction-pending',
  );
  expect(await messageBox(page)).toEqual(box);
  expect(await fight.boundingBox()).toEqual(fightBox);
  expect(await cancel.boundingBox()).toEqual(cancelBox);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('combat-prompt')).toHaveCount(0);
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 8');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 22/30');
  // With no prompt open, Enter is ignored rather than clearing the result.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'enemyDefeated',
  );

  await claimDepthSigil(page);
  await climbToFloor2CentralHall(page);

  // Up x8: the first seven climb the x=8 column to (8,2), the eighth
  // bumps the sealed Floor-3 stair (8,1). The fact lock still holds —
  // the missing subject has not returned yet — so the seal sighting is
  // recorded and the player stays on (8,2)
  await press(page, 'ArrowUp', 8);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'accessLocked',
  );
  await expect(
    page.locator('[data-note="floor2-depth-seal-seen"]'),
  ).toHaveCount(1);
  // Down x7: back to the Central Hall (8,9)
  await press(page, 'ArrowDown', 7);

  // Up x2, Right x4: the last press bumps floor2-east-release (12,7) from
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

  // Up x5: the north column reaches the Rear Gallery (13,2)
  await press(page, 'ArrowUp', 5);
  await expect(
    page.locator('[data-section="floor2-rear-gallery"]'),
  ).toHaveCount(1);

  // Left x2, Down: bump floor2-missing-subject (11,3) → it departs for the
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

  // Down x3, Left x6: the last press bumps floor2-west-release (5,7) from
  // its rear (east) side and opens it
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowLeft', 6);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'latchOpened',
  );

  // Left x2: through the open release into the West Archive (4,7)
  await press(page, 'ArrowLeft', 2);
  await expect(
    page.locator('[data-section="floor2-west-archive"]'),
  ).toHaveCount(1);

  // Left, Up x2, Left: bump the keeper's paired-release ledger (2,5) —
  // the Floor 2 evidence for the scribe's ledger thread
  await press(page, 'ArrowLeft', 1);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowLeft', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'clue',
  );
  await expect(
    page.locator('[data-note="floor2-paired-release-ledger-read"]'),
  ).toHaveCount(1);

  // Right, Up x2: the treasury stair (4,3) → Floor 1 workshop
  // treasury (17,7) — the clue bump left the player on (3,5)
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 2);
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

  // Right: back through the treasury stair → Floor 2 (4,3). Down x4,
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

  // Up x3: to (6,4). Right x5, Up x2, Right x2: reach row 2 via the
  // x=11 column (the depth stair sits in its own dead-end pocket at
  // (8,1) and no longer lies on the row-2 corridor). Down x5: around
  // the rear gallery to (13,7), then Left x2: crossing the east release
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
  // sentry's gap down to the village portal → village (23,1)
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

  // Back to (15,5), Right x2, Down x3 to (17,8); Down: bump
  // village-returned-subject (17,9)
  await walkTowerToNorthGate(page);
  await press(page, 'ArrowRight', 2);
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowDown', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );

  // Village (17,8) -> Up x3, Left x2 to (15,5) -> village-to-floor1
  // (23,1) -> Floor 1 (2,14)
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowLeft', 2);
  await walkNorthGateToTower(page);

  // Floor 1 (2,14) -> front Floor-2 stair (9,2) -> Floor 2 (8,11). The
  // 8th Up claims the uncollected floor1-ledger-fragment at (3,4) (a
  // claim bump keeps the player at (3,5)), so the 9th steps onto the
  // fragment tile before turning east
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 1);
  await press(page, 'ArrowUp', 9);
  await press(page, 'ArrowRight', 3);
  await press(page, 'ArrowUp', 2);
  await press(page, 'ArrowRight', 3);

  // Floor 2 central column -> depth stair pocket (8,1) -> Floor 3
  // (10,13): the fact gate opens because main-subject-returned is
  // already durable
  await press(page, 'ArrowUp', 10);
  await enterFloor3AndReachHeartApproach(page);

  // Right x9 along row 4 to (15,4), Down x4 to (15,8), Right x3 to
  // (18,8), Up: bump floor3-keeper-final-record (18,7) from the south —
  // the keeper archive detour never touches the optional archive sentry
  // (17,7) guarding it from the west
  await press(page, 'ArrowRight', 9);
  await press(page, 'ArrowDown', 4);
  await press(page, 'ArrowRight', 3);
  await press(page, 'ArrowUp', 1);
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'clue',
  );
  await expect(
    page.locator('[data-note="floor3-keeper-final-record-read"]'),
  ).toHaveCount(1);

  // Left x3 back to (15,8), Up x4 to (15,4), Left x5 to (10,4): the
  // detour also replaces the old (9,3) dogleg — the heart clue never
  // blocks this row-4 crossing
  await press(page, 'ArrowLeft', 3);
  await press(page, 'ArrowUp', 4);
  await press(page, 'ArrowLeft', 5);

  await openHeartShortcutAndHeal(page);
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
    { hp, maxHp, attack: atk, defense: def, gold: 0 },
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

  await claimRestorationCore(page);

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

  await descendToFloor1RearWing(page);

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

  // The keeper record was read on the optional route, so the expanded
  // ledger ending renders
  await handCoreToWarden(page, 'warden-restoration-ending-ledger');
});
