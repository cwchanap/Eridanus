import { expect, test, type Page } from '@playwright/test';

import { findEntityById } from '../../src/game/content';
import type { MapId, Tile } from '../../src/game/types';
import { TILE_SIZE } from '../../src/phaser/assets';
import {
  cameraCentre,
  followZoom,
  hudTop,
  logStrip,
  toScreen,
} from '../../src/phaser/camera';

// A 2× screen: the canvas must size itself in device pixels or the
// browser stretches it and the art blurs.
test.use({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });

type CanvasMetrics = {
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  innerWidth: number;
  innerHeight: number;
  ratio: number;
};

// Canvas attributes and CSS box, read from the DOM the way a player's
// browser sees them — null until Phaser has booted.
function canvasMetrics(page: Page): Promise<CanvasMetrics | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector(
      '#game canvas',
    ) as HTMLCanvasElement | null;
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: box.width,
      cssHeight: box.height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      ratio: window.devicePixelRatio,
    };
  });
}

// The canvas fills the window at device-pixel resolution (backing store
// = window size × devicePixelRatio, CSS box = window size) and follows a
// window resize, as created by createGame.ts.
test('canvas fills the window at device-pixel resolution', async ({ page }) => {
  await page.goto('/');

  await expect
    .poll(async () => (await canvasMetrics(page))?.width)
    .toBe(900 * 2);
  const initial = await canvasMetrics(page);
  if (!initial) throw new Error('canvas is not on screen');
  expect(initial.ratio).toBe(2);
  expect(initial.width).toBe(initial.innerWidth * initial.ratio);
  expect(initial.height).toBe(initial.innerHeight * initial.ratio);
  expect(initial.cssWidth).toBe(initial.innerWidth);
  expect(initial.cssHeight).toBe(initial.innerHeight);

  await page.setViewportSize({ width: 960, height: 640 });
  await expect
    .poll(async () => (await canvasMetrics(page))?.width)
    .toBe(960 * 2);
  const resized = await canvasMetrics(page);
  if (!resized) throw new Error('canvas is not on screen');
  expect(resized.width).toBe(resized.innerWidth * resized.ratio);
  expect(resized.height).toBe(resized.innerHeight * resized.ratio);
  expect(resized.cssWidth).toBe(resized.innerWidth);
  expect(resized.cssHeight).toBe(resized.innerHeight);
});

// Boot straight onto a stair tile by writing the save the player would
// have after stepping through its portal — the same localStorage
// boundary startFreshRun clears in cross-floor.spec.ts.
async function bootOnTile(
  page: Page,
  mapId: MapId,
  tile: { x: number; y: number },
  factIds: readonly string[] = [],
): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    (save) => localStorage.setItem('eridanus.save', JSON.stringify(save)),
    {
      mapId,
      tile,
      player: { hp: 30, attack: 10, defense: 2, agility: 5, gold: 0 },
      openedRewardIds: [],
      defeatedEnemyIds: [],
      openedShortcutIds: [],
      itemIds: [],
      factIds,
      discoveredSectionIds: [],
      trades: 0,
    },
  );
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    mapId,
  );
}

// Where a stair sets the hero down: each floor's arrival hugs the map's
// edge, where the camera still holds the hero clear of the panels.
function arrival(portalId: string): Tile {
  const portal = findEntityById(portalId);
  if (portal?.kind !== 'portal') throw new Error(`${portalId} is not a stair`);
  return portal.target.tile;
}

const FLOOR2_ARRIVAL = arrival('floor1-front-to-floor2');
const FLOOR3_ARRIVAL = arrival('floor2-depth-to-floor3');

// The camera holds the hero between the top panels and the message log, so
// their cell must clear every floating panel. The hero's tile projects
// through the same pure camera math WorldScene uses, against the real
// bounding boxes of the HUD.
async function expectHeroClearOfHud(
  page: Page,
  view: { width: number; height: number },
  tile: { x: number; y: number },
): Promise<void> {
  const strip = logStrip(view.width);
  const top = hudTop(view.width, view.height);
  const zoom = followZoom(view, top, strip);
  const centre = cameraCentre(top, strip, zoom, {
    x: (tile.x + 0.5) * TILE_SIZE,
    y: (tile.y + 0.5) * TILE_SIZE,
  });
  const topLeft = toScreen(view, centre, zoom, {
    x: tile.x * TILE_SIZE,
    y: tile.y * TILE_SIZE,
  });
  const side = TILE_SIZE * zoom;
  const hero = {
    x: topLeft.x,
    y: topLeft.y,
    right: topLeft.x + side,
    bottom: topLeft.y + side,
  };
  expect(hero.x, 'hero left edge').toBeGreaterThanOrEqual(0);
  expect(hero.right, 'hero right edge').toBeLessThanOrEqual(view.width);
  expect(hero.y, 'hero top edge').toBeGreaterThanOrEqual(0);

  for (const panel of [
    page.getByTestId('interaction'),
    // The hero card's column, which caps it and scrolls what overflows.
    page.locator('.hud-left'),
    page.getByTestId('quest'),
    page.locator('.location'),
    page.getByTestId('how-to-play'),
  ]) {
    if (!(await panel.isVisible())) continue;
    const box = await panel.boundingBox();
    if (!box) continue;
    const overlaps =
      hero.x < box.x + box.width &&
      box.x < hero.right &&
      hero.y < box.y + box.height &&
      box.y < hero.bottom;
    expect(overlaps, `hero overlaps ${await panel.getAttribute('class')}`).toBe(
      false,
    );
  }
}

for (const view of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 400, height: 844 },
  { width: 683, height: 325 },
]) {
  for (const [mapId, tile] of [
    ['village', { x: 8, y: 1 }],
    ['floor2', FLOOR2_ARRIVAL],
    ['floor3', FLOOR3_ARRIVAL],
    ['floor5', arrival('floor4-to-floor5')],
  ] as const) {
    test(`keeps the hero clear of the HUD on ${mapId} at ${view.width}x${view.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(view);
      await bootOnTile(page, mapId, tile);
      await expectHeroClearOfHud(page, view, tile);
    });
  }
}

// Below 1024px the hero card and quest tracker share a row under the
// banner; a long quest must still stop above the hero on a short phone.
for (const view of [
  { width: 400, height: 600 },
  { width: 900, height: 500 },
]) {
  test(`keeps the hero clear of a long quest at ${view.width}x${view.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(view);
    await bootOnTile(page, 'floor2', FLOOR2_ARRIVAL, [
      'village-tower-stairs-used',
      'floor1-route-mark-seen',
      'floor1-treasury-sealed',
      'floor1-depth-stairs-used',
      'floor2-depth-stairs-used',
      'floor2-paired-release-ledger-read',
    ]);
    await expectHeroClearOfHud(page, view, FLOOR2_ARRIVAL);
  });
}

// A fractional pixel ratio lands the canvas backing store on an un-rounded
// device width — at 1024 CSS px and 1.1 the canvas is 1126px wide, which
// divides back to 1023.64, a hair under the layout's breakpoint. The strip
// must come from the window's CSS width or the hero ends up under the log.
test.describe('at a fractional device pixel ratio', () => {
  test.use({ deviceScaleFactor: 1.1 });

  test('keeps the hero clear of the HUD at the 1024px breakpoint', async ({
    page,
  }) => {
    const view = { width: 1024, height: 700 };
    await page.setViewportSize(view);
    await bootOnTile(page, 'floor3', FLOOR3_ARRIVAL);

    const metrics = await canvasMetrics(page);
    if (!metrics) throw new Error('canvas is not on screen');
    expect(metrics.ratio).toBeCloseTo(1.1, 4);
    expect(metrics.width).toBe(Math.round(view.width * metrics.ratio));

    await expectHeroClearOfHud(page, view, FLOOR3_ARRIVAL);
  });
});

// Four tabs and the Esc button must share the menu's header on the narrowest
// phones, whichever language's labels they carry.
for (const locale of ['en', 'zh-Hant', 'ja']) {
  test(`keeps the menu's tabs and close button inside it at 320px in ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await page.evaluate(
      (code) => localStorage.setItem('eridanus.locale', code),
      locale,
    );
    await page.reload();
    await page.locator('[data-action="open-menu"]').click();
    await expect(page.getByTestId('menu')).toBeVisible();

    const menu = await page.getByRole('dialog').boundingBox();
    const close = await page
      .locator('[data-action="close-menu"]')
      .boundingBox();
    const last = await page.getByRole('tab').last().boundingBox();
    if (!menu || !close || !last) throw new Error('menu is not on screen');
    expect(close.x + close.width).toBeLessThanOrEqual(menu.x + menu.width);
    expect(last.x + last.width).toBeLessThanOrEqual(close.x);
  });
}
