import { expect, test, type Page } from '@playwright/test';

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
