import { expect, test } from '@playwright/test';

test('sound plays without errors and a mute survives a reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const toggle = page.locator('[data-action="toggle-sound"]');
  await expect(toggle).toHaveAttribute('data-muted', 'false');

  // A step and a bump into the village boundary both play a cue.
  await page.keyboard.press('ArrowDown', { delay: 50 });
  await page.keyboard.press('ArrowLeft', { delay: 50 });

  await page.keyboard.press('m');
  await expect(toggle).toHaveAttribute('data-muted', 'true');
  await page.reload();
  await expect(toggle).toHaveAttribute('data-muted', 'true');

  await toggle.click();
  await expect(toggle).toHaveAttribute('data-muted', 'false');
  expect(errors).toEqual([]);
});
