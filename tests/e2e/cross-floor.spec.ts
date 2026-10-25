import { expect, test, type Page } from '@playwright/test';

import { ASSET_PATHS } from '../../src/phaser/assets';
import { journeyChapters, type Chapter, type Journey } from './journey';

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

function shows(page: Page, attribute: string, id: string) {
  return expect(page.locator(`[data-${attribute}="${id}"]`)).toHaveCount(1);
}

async function expectLine(page: Page, lineId: string): Promise<void> {
  await expect(page.getByTestId('effect')).toHaveAttribute('data-line', lineId);
}

// With a fight's prompt open, a move is refused below the encounter card,
// and at a narrow, short window the message box and the Fight/Cancel
// buttons keep their size and place.
async function expectPromptHoldsStill(page: Page): Promise<void> {
  const loss = await page.getByTestId('combat-hp-loss').textContent();
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
  await expect(page.getByTestId('combat-hp-loss')).toHaveText(loss ?? '');
  expect(await messageBox(page)).toEqual(box);
  expect(await fight.boundingBox()).toEqual(fightBox);
  expect(await cancel.boundingBox()).toEqual(cancelBox);
}

// The required route, floor by floor, as the bumps it makes. Each 'heal'
// is a drink the next fights need at base stats; the explorer's extra
// stats only make them cheaper.
async function claimDepthSigil(j: Journey): Promise<void> {
  await j.fight('floor1-sigil-warden');
  await j.expectBump('floor1-depth-sigil', 'itemReward');
}

async function healAndClimbToFloor2(j: Journey): Promise<void> {
  await j.travel('floor1-to-village');
  await j.heal('village-recovery');
  await j.travel('village-to-floor1');
  await j.travel('floor1-front-to-floor2');
}

async function clearServiceWing(j: Journey): Promise<void> {
  await j.fight('floor2-service-guard');
  await j.heal('floor2-service-waystone');
  await j.fight('floor2-stack-mite-1');
  await j.fight('floor2-stack-mite-2');
  await j.fight('floor2-stack-mite-3');
  await j.heal('floor2-service-waystone');
}

// Down the rear stair to Floor 1's rear wing for the power core, and back.
async function claimPowerCore(j: Journey): Promise<void> {
  await j.travel('floor2-rear-to-floor1');
  await j.check((page) => shows(page, 'note', 'floor1-rear-stairs-used'));
  await j.fight('floor1-gallery-sentry');
  await j.fight('floor1-rear-sentry');
  await j.expectBump('floor1-power-core', 'reward');
  await j.travel('floor1-rear-to-floor2');
}

async function sendSubjectHome(j: Journey): Promise<void> {
  await j.heal('floor2-service-waystone');
  await j.fight('floor2-east-sentry');
  await j.expectBump('floor2-east-release', 'latchOpened');
  await j.expectBump('floor2-missing-subject', 'dialogue');
  await j.check(async (page) => {
    await expectLine(page, 'subject-returning');
    await shows(page, 'lead', 'investigate-deeper');
  });
}

async function descendToFloor3(j: Journey): Promise<void> {
  await j.heal('floor2-service-waystone');
  await j.fight('floor2-stair-warden');
  await j.heal('floor2-service-waystone');
  await j.travel('floor2-depth-to-floor3');
  await j.check((page) => shows(page, 'lead', 'reach-heart-chamber'));
}

// The heart hatch hangs on three levers; the archive gang guards two.
async function throwHeartLevers(j: Journey): Promise<void> {
  await j.fight('floor3-east-prowler');
  await j.fight('floor3-spine-crawler-1');
  await j.fight('floor3-spine-crawler-2');
  await j.expectBump('floor3-gallery-cache', 'reward');
  await j.heal('floor3-gallery-waystone');
  await j.fight('floor3-archive-guard');
  await j.fight('floor3-archive-crawler-1');
  await j.fight('floor3-archive-crawler-2');
  await j.heal('floor3-gallery-waystone');
  await j.fight('floor3-archive-sentry');
  await j.expectBump('floor3-crown-lever', 'leverPulled');
  await j.heal('floor3-gallery-waystone');
  await j.expectBump('floor3-gallery-lever', 'leverPulled');
  await j.expectBump('floor3-west-lever', 'leverPulled');
}

async function descendPastHeartSentinel(j: Journey): Promise<void> {
  await j.expectBump('floor3-heart-shortcut', 'latchOpened');
  await j.heal('floor3-heart-waystone');
  await j.fight('floor3-heart-sentinel');
  await j.heal('floor3-heart-waystone');
  await j.travel('floor3-to-floor4');
}

// Floor 4's two works wings, each a gate guard, a pair of hands and a
// foreman sitting on a chest.
async function clearWorksWings(j: Journey): Promise<void> {
  for (const wing of ['west', 'east']) {
    await j.heal('floor4-landing-waystone');
    await j.fight(`floor4-${wing}-gate-guard`);
    await j.heal(`floor4-${wing}-waystone`);
    await j.fight(`floor4-${wing}-hand-1`);
    await j.fight(`floor4-${wing}-hand-2`);
    await j.heal(`floor4-${wing}-waystone`);
    await j.fight(`floor4-${wing}-foreman`);
    await j.expectBump(`floor4-${wing}-works-cache`, 'reward');
  }
}

// The foundry gate's four levers are linked in a row: each pull drags its
// neighbours, so only the two outer ones together throw all four.
async function openFoundryGate(j: Journey): Promise<void> {
  await j.heal('floor4-landing-waystone');
  await j.fight('floor4-forge-warden');
  await j.expectBump('floor4-gate-lever-1', 'leverPulled');
  await j.expectBump('floor4-foundry-gate', 'latchWired');
  await j.check(async (page) => {
    const message = page.getByTestId('effect');
    await expect(message).toHaveAttribute('data-thrown', '2');
    await expect(message).toHaveAttribute('data-total', '4');
  });
  await j.expectBump('floor4-gate-lever-4', 'leverPulled');
  await j.expectBump('floor4-foundry-gate', 'latchOpened');
  await j.heal('floor4-stair-waystone');
  await j.fight('floor4-stair-warden');
  await j.heal('floor4-stair-waystone');
  await j.travel('floor4-to-floor5');
}

async function reachGuardian(j: Journey): Promise<void> {
  await j.heal('floor5-landing-waystone');
  await j.fight('floor5-west-warden');
  await j.expectBump('floor5-west-warden-cache', 'reward');
  await j.heal('floor5-landing-waystone');
  await j.fight('floor5-south-gate-guard');
  await j.heal('floor5-ring-waystone');
  await j.fight('floor5-south-warden');
  await j.heal('floor5-ring-waystone');
  await j.fight('floor5-east-warden');
  await j.heal('floor5-ring-waystone');
  await j.expectBump('floor5-sanctum-seal', 'latchOpened');
  await j.heal('floor5-heart-waystone');
}

async function claimRestorationCore(j: Journey): Promise<void> {
  await j.fight('floor5-core-guardian', 'click');
  await j.expectBump('floor5-restoration-core', 'itemReward');
  await j.check((page) => shows(page, 'lead', 'return-restoration-core'));
}

// The core powers the lift home; carrying it to the warden ends the
// story. The ending lines are the longest authored dialogue, and the
// ending fact survives a reload.
async function endStory(j: Journey, endingLineId: string): Promise<void> {
  await j.travel('floor5-lift-to-village');
  let box: Box | null = null;
  await j.check(async (page) => {
    box = await messageBox(page);
  });
  await j.expectBump('village-warden', 'dialogue');
  await j.check(async (page) => {
    await expectLine(page, endingLineId);
    expect(await messageBox(page)).toEqual(box);
    await shows(page, 'lead', 'story-complete');
    await page.reload();
    await expect(page.getByTestId('map-name')).toHaveAttribute(
      'data-map-id',
      'village',
    );
    await shows(page, 'lead', 'story-complete');
  });
}

const REQUIRED: readonly Chapter[] = [
  {
    title: 'takes the warden’s lead and the depth sigil',
    run: async (j) => {
      await j.check((page) =>
        expect(page.getByTestId('how-to-play')).toBeVisible(),
      );
      await j.expectBump('village-warden', 'dialogue');
      await j.check(async (page) => {
        await expectLine(page, 'warden-main-lead');
        // The first recorded fact retires the fresh-run controls hint.
        await expect(page.getByTestId('how-to-play')).toHaveCount(0);
        // J folds the journal to its title bar and back without moving
        // the hero.
        const journal = page.getByTestId('journal');
        await expect(journal).toBeVisible();
        await page.keyboard.press('j');
        await expect(journal).toHaveAttribute('data-open', 'false');
        await expect(page.locator('[data-lead]')).toHaveCount(0);
        await page.keyboard.press('j');
        await expect(journal).toHaveAttribute('data-open', 'true');
      });
      await j.travel('village-to-floor1');
      await j.check(async (page) => {
        await shows(page, 'section', 'floor1-entry-court');
        await shows(page, 'note', 'floor1-treasury-seen');
      });
      await j.prompt('floor1-west-sentry');
      await j.check(async (page) => {
        await expectPromptHoldsStill(page);
        // Short and phone-width windows still show every stat, the
        // fight's cost included.
        await expectHudFits(page);
        await page.setViewportSize({ width: 400, height: 844 });
        await expectHudFits(page);
        await page.setViewportSize({ width: 1280, height: 720 });
      });
      await j.confirm('click');
      await claimDepthSigil(j);
      await healAndClimbToFloor2(j);
    },
  },
  {
    title: 'sends the missing subject home',
    run: async (j) => {
      await clearServiceWing(j);
      await claimPowerCore(j);
      await sendSubjectHome(j);
      await descendToFloor3(j);
    },
  },
  {
    title: 'throws the heart hatch’s three levers',
    run: async (j) => {
      await throwHeartLevers(j);
      await descendPastHeartSentinel(j);
    },
  },
  { title: 'clears the works wings', run: clearWorksWings },
  { title: 'opens the foundry gate', run: openFoundryGate },
  {
    title: 'beats the guardian and ends the story',
    run: async (j) => {
      await reachGuardian(j);
      await claimRestorationCore(j);
      // No keeper record was read, so the plain ending renders.
      await endStory(j, 'warden-restoration-ending');
      // The required route never takes an optional lead nor reads the
      // optional evidence: no optional thread or note ever appears.
      await j.check(async (page) => {
        await expect(
          page.locator(
            '[data-lead^="heirloom-"], [data-lead^="route-"], [data-lead^="ledger-"]',
          ),
        ).toHaveCount(0);
        for (const note of [
          'floor1-route-mark-seen',
          'floor2-paired-release-ledger-read',
          'floor3-keeper-final-record-read',
        ])
          await expect(page.locator(`[data-note="${note}"]`)).toHaveCount(0);
      });
    },
  },
];

// The explorer takes every lead and reads every record on the way to the
// expanded ending. Only its own detours run in the browser; the stretches
// it shares with the required route are replayed on the rules alone.
const EXPLORER: readonly Chapter[] = [
  {
    title: 'takes every village lead and reads the route mark',
    run: async (j) => {
      for (const [npc, lineId] of [
        ['village-artisan', 'artisan-find-workshop'],
        ['village-scout', 'scout-find-marks'],
        ['village-scribe', 'scribe-find-ledger'],
      ]) {
        await j.expectBump(npc!, 'dialogue');
        await j.check((page) => expectLine(page, lineId!));
      }
      await j.travel('village-to-floor1');
      // Without the sigil the front stair stays sealed, and the sighting
      // is noted.
      await j.expectBump('floor1-front-to-floor2', 'accessLocked');
      await j.check((page) => shows(page, 'note', 'floor1-depth-seal-seen'));
      // Escape backs out of a prompt, a re-bump reopens it, Enter fights,
      // and with no prompt open Enter closes the result.
      await j.prompt('floor1-west-sentry');
      await j.check(expectPromptHoldsStill);
      await j.check((page) =>
        page.setViewportSize({ width: 1280, height: 720 }),
      );
      await j.cancel();
      await j.fight('floor1-west-sentry');
      await j.dismiss();
      await j.check((page) => expect(page.locator('.log-hint')).toBeVisible());
      await j.expectBump('floor1-route-mark', 'clue');
      await j.check((page) => shows(page, 'note', 'floor1-route-mark-seen'));
      await claimDepthSigil(j);
      await healAndClimbToFloor2(j);
    },
  },
  {
    title: 'reads the paired ledger and raids the workshop treasury',
    run: async (j) => {
      await j.expectBump('floor2-paired-release-ledger', 'clue');
      await j.check((page) =>
        shows(page, 'note', 'floor2-paired-release-ledger-read'),
      );
      // The ledger's west release stays shut while its one guard stands.
      await j.expectBump('floor2-west-release', 'latchGuarded');
      await j.check((page) =>
        expect(page.getByTestId('effect')).toHaveAttribute(
          'data-remaining',
          '1',
        ),
      );
      await clearServiceWing(j);
      await claimPowerCore(j);
      await sendSubjectHome(j);
      // With its guard down the west release opens onto the archive,
      // where the brute holds the treasury stair.
      await j.heal('floor2-service-waystone');
      await j.expectBump('floor2-west-release', 'latchOpened');
      await j.fight('floor2-archive-brute');
      await j.travel('floor2-treasury-to-floor1');
      await j.check(async (page) => {
        await shows(page, 'section', 'floor1-workshop-treasury');
        await shows(page, 'note', 'floor1-treasury-return-used');
      });
      await j.expectBump('floor1-future-treasury', 'reward');
      // Discovered sections, stats and every committed mechanism survive
      // a reload, and the claimed chest is never granted again.
      await j.check(async (page) => {
        await page.reload();
        await expect(page.getByTestId('map-name')).toHaveAttribute(
          'data-map-id',
          'floor1',
        );
        await shows(page, 'section', 'floor1-entry-court');
        await shows(page, 'section', 'floor2-front-landing');
        await shows(page, 'section', 'floor1-workshop-treasury');
      });
      await j.expectStats();
      await j.walkTo(j.entityTile('floor1-future-treasury'));
      await j.travel('floor1-treasury-to-floor2');
    },
  },
  {
    title: 'reads the keeper’s final record on the way down',
    replayOnly: true,
    run: async (j) => {
      await descendToFloor3(j);
      await throwHeartLevers(j);
      await j.expectBump('floor3-keeper-final-record', 'clue');
      await descendPastHeartSentinel(j);
      await clearWorksWings(j);
      await openFoundryGate(j);
      await reachGuardian(j);
    },
  },
  {
    title: 'beats the guardian and hears the ledger ending',
    run: async (j) => {
      await claimRestorationCore(j);
      // The endgame state survives a reload, and the beaten guardian's
      // tile and the emptied core chest stay open.
      await j.check(async (page) => {
        await page.reload();
        await expect(page.getByTestId('map-name')).toHaveAttribute(
          'data-map-id',
          'floor5',
        );
        await shows(page, 'lead', 'return-restoration-core');
      });
      await j.walkTo(j.entityTile('floor5-restoration-core'));
      await j.walkTo(j.entityTile('floor5-core-guardian'));
      await j.check(async (page) => {
        for (const note of [
          'floor1-route-mark-seen',
          'floor2-paired-release-ledger-read',
          'floor3-keeper-final-record-read',
        ])
          await shows(page, 'note', note);
      });
      // The keeper record was read, so the expanded ledger ending renders.
      await endStory(j, 'warden-restoration-ending-ledger');
    },
  },
];

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
    await page.keyboard.press('ArrowUp');
    const warden = page.getByTestId('interaction').locator('[data-effect]');
    await expect(warden).toHaveAttribute('data-effect', 'dialogue');
    await expect(warden).toContainText(/\S/);
  } finally {
    release();
  }
});

journeyChapters('required-only route', REQUIRED);
journeyChapters('explorer route', EXPLORER);
