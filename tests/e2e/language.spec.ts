import { expect, test } from '@playwright/test';

import { MESSAGES } from '../../src/i18n/messages';

const nextLanguage = '[data-action="next-locale"]';

test('the language button translates the whole screen and is remembered', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 10');

  // The language button lives in the menu, which Escape opens.
  await page.keyboard.press('Escape');
  await page.locator(nextLanguage).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  const zh = MESSAGES['zh-Hant'];
  await expect(page.locator('[data-stat="attack"]')).toHaveText(
    `${zh.statLabels.attack} 10`,
  );
  await expect(page.getByTestId('map-name')).toHaveText(zh.maps.village);

  await page.locator(nextLanguage).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

  // The choice survives a reload, and the run plays on in that language.
  await page.reload();
  const ja = MESSAGES.ja;
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByTestId('map-name')).toHaveText(ja.maps.village);
  await page.keyboard.press('ArrowUp', { delay: 50 });
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'dialogue',
  );
  await expect(page.getByTestId('effect')).toContainText(
    ja.dialogue['warden-main-lead'],
  );

  // A third press comes back around to English. The menu's HUD button
  // opens it even with a message on show.
  await page.locator('[data-action="open-menu"]').click();
  await page.locator(nextLanguage).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 10');
});

test('the invalid-save panel speaks the remembered language', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('eridanus.locale', 'zh-Hant');
    localStorage.setItem('eridanus.save', '{not json');
  });
  await page.reload();
  await expect(page.getByTestId('invalid-save')).toContainText(
    MESSAGES['zh-Hant'].ui.invalidSaveTitle,
  );
});
