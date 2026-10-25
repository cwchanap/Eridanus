import { expect, test, type Page } from '@playwright/test';

import { MAPS, findEntityById } from '../../src/game/content';
import { createInitialGameState } from '../../src/game/state';
import type { PlayerStats } from '../../src/game/types';
import { fixRolls, savedGame } from './journey';

// Seeds a save with the hero beside an enemy, `player` over the base stats,
// and leaves them facing it.
async function standBeside(
  page: Page,
  enemyId: string,
  player: Partial<PlayerStats>,
): Promise<void> {
  const enemy = findEntityById(enemyId);
  if (enemy?.kind !== 'enemy') throw new Error(`${enemyId} missing`);
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
      player: { ...initial.player, ...player },
    },
  );
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'floor1',
  );
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('combat-prompt')).toBeVisible();
}

// Every blow the battle card shows, in order, however briefly: who struck
// and whether it landed.
async function recordBlows(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { blows: string[] }).blows = seen;
    new MutationObserver(() => {
      const blow = document.querySelector('[data-testid="battle"] [data-blow]');
      const text =
        blow &&
        `${blow.getAttribute('data-blow')}:${blow.getAttribute('data-hit')}`;
      if (text && seen.at(-1) !== text) seen.push(text);
    }).observe(document.querySelector('#ui')!, {
      childList: true,
      subtree: true,
    });
  });
}

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

// The sentry (AGI 3) lands 9 blows in 10 against the hero (AGI 5), and a
// roll of .95 is the one in ten it misses; the hero never misses it. Three
// hits of 7 take it down, and it answers twice, both times in vain.
test('a missed blow shows as a miss and costs nothing', async ({ page }) => {
  await fixRolls(page, 0.95);
  await standBeside(page, 'floor1-west-sentry', { hp: 30 });
  await expect(page.getByTestId('combat-hit-chances')).toHaveText(
    'You hit 100% · It hits 90%',
  );
  await recordBlows(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'enemyDefeated',
  );
  expect(
    await page.evaluate(() => (window as unknown as { blows: string[] }).blows),
  ).toEqual([
    'hero:true',
    'enemy:false',
    'hero:true',
    'enemy:false',
    'hero:true',
  ]);
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30');
});

// Every blow landing costs 10 against an average of 9: with 10 HP the hero
// goes down, and wakes in the village with nothing lost.
test('a lost fight carries the hero back to the village', async ({ page }) => {
  await fixRolls(page, 0);
  await standBeside(page, 'floor1-gatekeeper', { hp: 10, attack: 12 });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('effect')).toHaveAttribute(
    'data-effect',
    'heroDefeated',
  );
  await expect(page.getByTestId('map-name')).toHaveAttribute(
    'data-map-id',
    'village',
  );
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 10');
  expect(await savedGame(page)).toMatchObject({
    mapId: 'village',
    defeatedEnemyIds: [],
    player: { hp: 10 },
  });
});
