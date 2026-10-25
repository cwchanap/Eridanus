import { expect, test, type Page } from '@playwright/test';

type Counted = { audioStarts: number };
type Starter = { start: (...args: unknown[]) => void };

// Count every sound the page starts, synth note or recording, by wrapping
// the browser's own WebAudio start methods: no speakers or game hooks needed.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const counted = window as unknown as Counted;
    counted.audioStarts = 0;
    const protos = [OscillatorNode.prototype, AudioBufferSourceNode.prototype];
    for (const proto of protos as unknown as Starter[]) {
      const start = proto.start;
      proto.start = function (this: unknown, ...args: unknown[]) {
        counted.audioStarts += 1;
        start.apply(this, args);
      };
    }
  });
});

function audioStarts(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as Counted).audioStarts);
}

async function press(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key, { delay: 50 });
}

test('moves and bumps play sounds, and a mute survives a reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const toggle = page.locator('[data-action="toggle-sound"]');
  await expect(toggle).toHaveAttribute('data-muted', 'false');

  // The hero starts at (15,10); (12..14,10) are floor and (11,10) is wall.
  // Input is handled inside the keydown, so a press has played its cue by
  // the time it resolves.
  await press(page, 'ArrowLeft');
  expect(await audioStarts(page)).toBeGreaterThan(0);
  await press(page, 'ArrowLeft');
  await press(page, 'ArrowLeft');
  const beforeBump = await audioStarts(page);
  await press(page, 'ArrowLeft');
  await expect(page.getByTestId('blocked-reason')).toHaveAttribute(
    'data-reason',
    'wall',
  );
  expect(await audioStarts(page)).toBeGreaterThan(beforeBump);

  // Muted, a step makes no sound, and the choice outlives a reload.
  await press(page, 'm');
  await expect(toggle).toHaveAttribute('data-muted', 'true');
  const muted = await audioStarts(page);
  await press(page, 'ArrowRight');
  await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
  expect(await audioStarts(page)).toBe(muted);
  await page.reload();
  await expect(toggle).toHaveAttribute('data-muted', 'true');

  // Unmuting from the menu's button plays a confirm blip.
  await page.keyboard.press('Escape');
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-muted', 'false');
  expect(await audioStarts(page)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
