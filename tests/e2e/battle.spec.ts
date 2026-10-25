import { expect, test } from '@playwright/test';

import { MAPS, findEntityById } from '../../src/game/content';
import { createInitialGameState } from '../../src/game/state';

// A battle's HP drops when each hit lands, not when its blow starts: in a
// one-hit fight the enemy's bar must first show it unhurt while the hero
// lunges, then empty as the blow connects.
test('a battle shows each hit land before the HP drops', async ({ page }) => {
  const enemy = findEntityById('floor1-west-sentry');
  if (enemy?.kind !== 'enemy') throw new Error('floor1-west-sentry missing');
  const tile = { x: enemy.tile.x + 1, y: enemy.tile.y };
  expect(MAPS.floor1.layout[tile.y]?.[tile.x]).toBe('.');

  const initial = createInitialGameState();
  await page.goto('/');
  await page.evaluate(
    (save) => localStorage.setItem('eridanus.save', JSON.stringify(save)),
    {
      ...initial,
      mapId: 'floor1',
      tile,
      player: {
        ...initial.player,
        attack: enemy.stats.hp + enemy.stats.defense,
      },
    },
  );
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('combat-prompt')).toBeVisible();
  // Every HP the battle card shows, in order, however briefly.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { battleHp: string[] }).battleHp = seen;
    new MutationObserver(() => {
      const hp = document
        .querySelector('[data-testid="battle-enemy-hp"]')
        ?.getAttribute('data-hp');
      if (hp != null && seen.at(-1) !== hp) seen.push(hp);
    }).observe(document.querySelector('#ui')!, {
      childList: true,
      subtree: true,
    });
  });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'enemyDefeated',
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { battleHp: string[] }).battleHp,
    ),
  ).toEqual([String(enemy.stats.hp), '0']);
});
