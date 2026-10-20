import { expect, test, type Page } from '@playwright/test';

import { MAPS } from '../../src/game/content';
import type { MapId } from '../../src/game/types';
import { TILE_SIZE } from '../../src/phaser/assets';
import { logStrip, mapOrigin } from '../../src/phaser/mapFit';

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
): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    (save) => localStorage.setItem('eridanus.save', JSON.stringify(save)),
    {
      mapId,
      tile,
      player: { hp: 30, maxHp: 30, attack: 10, defense: 2, gold: 0 },
      openedRewardIds: [],
      defeatedEnemyIds: [],
      openedShortcutIds: [],
      itemIds: [],
      factIds: [],
      discoveredSectionIds: [],
    },
  );
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    mapId,
  );
}

// The required tower stairs put the arriving hero on bottom-centre tiles —
// Floor 2's front landing (8,11) and Floor 3's entry vestibule (10,13) —
// which the always-present message log used to cover whole at desktop
// sizes. The camera now frames the map into the band above the log, so the
// projected tile and the log's real bounding box must never meet.
async function expectTileClearOfLog(
  page: Page,
  view: { width: number; height: number },
  mapId: MapId,
  tile: { x: number; y: number },
): Promise<void> {
  const layout = MAPS[mapId].layout;
  const map = {
    width: layout[0]!.length * TILE_SIZE,
    height: layout.length * TILE_SIZE,
  };
  const strip = logStrip(view.width);
  const origin = mapOrigin(view, map, strip);
  const side = TILE_SIZE * origin.zoom;
  const arrival = {
    x: origin.x + tile.x * side,
    y: origin.y + tile.y * side,
    right: origin.x + (tile.x + 1) * side,
    bottom: origin.y + (tile.y + 1) * side,
  };

  const log = await page.getByTestId('interaction').boundingBox();
  if (!log) throw new Error('message log is not on screen');
  expect(arrival.x, 'arrival tile left edge').toBeGreaterThanOrEqual(0);
  expect(arrival.right, 'arrival tile right edge').toBeLessThanOrEqual(
    view.width,
  );
  expect(arrival.y, 'arrival tile top edge').toBeGreaterThanOrEqual(0);
  expect(arrival.bottom, 'arrival tile bottom edge').toBeLessThanOrEqual(log.y);
}

for (const view of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
]) {
  for (const [mapId, tile] of [
    ['floor2', { x: 8, y: 11 }],
    ['floor3', { x: 10, y: 13 }],
  ] as const) {
    test(`keeps the ${mapId} arrival stair clear of the log at ${view.width}x${view.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(view);
      await bootOnTile(page, mapId, tile);
      await expectTileClearOfLog(page, view, mapId, tile);
    });
  }
}

// A fractional pixel ratio lands the canvas backing store on an un-rounded
// device width — at 1024 CSS px and 1.1 the canvas is 1126px wide, which
// divides back to 1023.64, a hair under the layout's breakpoint. The strip
// must come from the window's CSS width or the map's bottom edge ends up
// under the log.
test.describe('at a fractional device pixel ratio', () => {
  test.use({ deviceScaleFactor: 1.1 });

  test('keeps the floor3 arrival stair clear of the log at the 1024px breakpoint', async ({
    page,
  }) => {
    const view = { width: 1024, height: 700 };
    await page.setViewportSize(view);
    await bootOnTile(page, 'floor3', { x: 10, y: 13 });

    const metrics = await canvasMetrics(page);
    if (!metrics) throw new Error('canvas is not on screen');
    expect(metrics.ratio).toBeCloseTo(1.1, 4);
    expect(metrics.width).toBe(Math.round(view.width * metrics.ratio));

    await expectTileClearOfLog(page, view, 'floor3', { x: 10, y: 13 });
  });
});
