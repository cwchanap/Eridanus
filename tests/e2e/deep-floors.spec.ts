import { expect, test, type Page } from '@playwright/test';

import type { Blow } from '../../src/game/types';
import { MESSAGES } from '../../src/i18n/messages';
import { FULL_CLEAR, expectDeepEntry } from './full-clear';
import { Journey, journeyChapters } from './journey';

function shows(page: Page, attribute: string, id: string) {
  return expect(page.locator(`[data-${attribute}="${id}"]`)).toHaveCount(1);
}

async function expectLine(page: Page, lineId: string): Promise<void> {
  await expect(page.getByTestId('effect')).toHaveAttribute('data-line', lineId);
}

async function recordBlows(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: Blow[] = [];
    (window as unknown as { replay: Blow[] }).replay = seen;
    new MutationObserver(() => {
      const blow = document.querySelector('[data-testid="battle"] [data-blow]');
      if (!blow) return;
      const frame: Blow = {
        by: blow.getAttribute('data-blow') as 'hero' | 'enemy',
        hit: blow.getAttribute('data-hit') === 'true',
        damage: Number(blow.getAttribute('data-damage')),
        heroHp: Number(blow.getAttribute('data-hero-hp')),
        enemyHp: Number(blow.getAttribute('data-enemy-hp')),
      };
      const last = seen.at(-1);
      if (
        !last ||
        last.by !== frame.by ||
        last.hit !== frame.hit ||
        last.damage !== frame.damage ||
        last.heroHp !== frame.heroHp ||
        last.enemyHp !== frame.enemyHp
      )
        seen.push(frame);
    }).observe(document.querySelector('#ui')!, {
      childList: true,
      subtree: true,
    });
  });
}

async function replayFrames(page: Page): Promise<Blow[]> {
  return page.evaluate(
    () => (window as unknown as { replay: Blow[] }).replay ?? [],
  );
}

// The blows the rules resolved for the fight just confirmed.
function resolvedBlows(journey: Journey): readonly Blow[] {
  const effect = journey.lastEffect;
  if (effect?.kind !== 'enemyDefeated') throw new Error('no fight resolved');
  return effect.blows;
}

async function expectTraitsAcrossLocales(page: Page): Promise<void> {
  const trait = page.locator('[data-trait="firstStrike"]');
  await expect(trait).toHaveText(MESSAGES.en.traits.firstStrike);
  await page.locator('[data-action="open-menu"]').click();
  await page.locator('[data-action="next-locale"]').click();
  await expect(trait).toHaveText(MESSAGES['zh-Hant'].traits.firstStrike);
  await page.locator('[data-action="next-locale"]').click();
  await expect(trait).toHaveText(MESSAGES.ja.traits.firstStrike);
  await page.locator('[data-action="next-locale"]').click();
  await expect(page.locator('[data-action="next-locale"]')).toHaveAttribute(
    'data-locale',
    'en',
  );
  await page.locator('[data-action="close-menu"]').click();
  await expect(page.getByTestId('combat-prompt')).toBeVisible();
}

test.describe('deep floors', () => {
  const missing: string[] = [];
  test.beforeEach(({ page }) => {
    page.on('response', (response) => {
      if (response.url().endsWith('.png') && response.status() >= 400)
        missing.push(response.url());
    });
    page.on('requestfailed', (request) => {
      if (request.url().endsWith('.png')) missing.push(request.url());
    });
  });
  test.afterEach(() => {
    const found = missing.splice(0);
    expect(found).toEqual([]);
  });

  test('flags a texture request that never completes', async ({ page }) => {
    await page.route('**/assets/portraits/hero.png', (route) => route.abort());
    await page.goto('/');
    await expect.poll(() => missing.length).toBeGreaterThan(0);
    expect(
      missing.splice(0).some((url) => url.endsWith('/portraits/hero.png')),
    ).toBe(true);
  });

  journeyChapters('deep floors', [
    ...FULL_CLEAR,
    {
      title: 'finds the heartwood lift locked and takes the sealed stair',
      run: async (j: Journey) => {
        await expectDeepEntry(j);
        await j.travel('floor5-lift-to-village');
        await j.expectBump('village-lift-to-floor10', 'accessLocked');
        await j.check((page) =>
          shows(page, 'note', 'village-heartwood-lift-seen'),
        );
        await j.travel('village-lift-to-floor5');
        await j.travel('floor5-depth-to-floor6');
        await j.check(async (page) => {
          await shows(page, 'section', 'floor6-inlet');
          await shows(page, 'note', 'floor5-depth-stairs-used');
        });
      },
    },
    {
      title: 'rides the sluice pads through the floor six tanks',
      run: async (j) => {
        await j.drink('floor6-inlet-waystone');
        await j.fight('floor6-inlet-guard');
        await j.travel('floor6-inlet-east-pad');
        await j.fight('floor6-settling-guard');
        await j.travel('floor6-settling-south-pad');
        await j.prompt('floor6-south-ambusher');
        await j.check(expectTraitsAcrossLocales);
        await j.confirm();
        await j.travel('floor6-south-east-pad');
        await j.drink('floor6-pump-waystone');
        await j.fight('floor6-pump-warden');
        await j.expectBump('floor6-pump-cache', 'reward');
        await j.travel('floor6-pump-west-pad');
        await j.travel('floor6-south-north-pad');
        await j.fight('floor6-settling-bulwark');
        await j.travel('floor6-settling-north-pad');
        await j.drink('floor6-sluice-waystone');
        await j.fight('floor6-sluice-guard');
        await j.travel('floor6-sluice-east-pad');
        await j.fight('floor6-outflow-sentinel');
        await j.travel('floor6-to-floor7');
        await j.check(async (page) => {
          await shows(page, 'section', 'floor7-north-west-wing');
          await shows(page, 'note', 'floor6-depth-stairs-used');
        });
      },
    },
    {
      title: 'rings the linked bell levers on floor seven',
      run: async (j) => {
        await j.expectBump('floor7-north-west-lever', 'leverPulled');
        await j.fight('floor7-wing-guard');
        await j.expectBump('floor7-reliquary-hatch', 'latchWired');
        await j.check(async (page) => {
          const message = page.getByTestId('effect');
          await expect(message).toHaveAttribute('data-thrown', '2');
          await expect(message).toHaveAttribute('data-total', '4');
        });
        await j.fight('floor7-south-east-door-guard');
        await j.expectBump('floor7-south-east-lever', 'leverPulled');
        await j.drink('floor7-south-east-waystone');
        await j.fight('floor7-south-east-warden');
        await j.expectBump('floor7-south-east-cache', 'reward');
        await j.expectBump('floor7-reliquary-hatch', 'latchOpened');
        await j.travel('floor7-to-floor8');
        await j.check(async (page) => {
          await shows(page, 'section', 'floor8-west-tangle');
          await shows(page, 'note', 'floor7-depth-stairs-used');
        });
      },
    },
    {
      title: 'loops the floor nine underpass for the rift key',
      run: async (j) => {
        await j.drink('floor8-west-waystone');
        await j.prompt('floor8-west-lancer');
        await j.check((page) =>
          expect(page.locator('[data-trait="pierce"]')).toHaveText(
            MESSAGES.en.traits.pierce(4),
          ),
        );
        await j.confirm();
        await j.expectBump('floor8-to-floor9', 'accessLocked');
        await j.check((page) => shows(page, 'note', 'floor8-depth-seal-seen'));
        await j.fight('floor8-stair-guard');
        await j.travel('floor8-to-landing');
        await j.check((page) => shows(page, 'section', 'floor9-underpass'));
        await j.travel('floor9-underpass-east');
        await j.check((page) => shows(page, 'section', 'floor8-east-gallery'));
        await j.drink('floor8-east-waystone');
        await j.fight('floor8-gallery-warden');
        await j.expectBump('floor8-gallery-cache', 'reward');
        await j.fight('floor8-rift-knight');
        await j.expectBump('floor8-rift-key', 'itemReward');
        await j.check((page) => shows(page, 'item', 'rift-key'));
        await j.check(async (page) => {
          await page.reload();
          await expect(page.getByTestId('map-name')).toHaveAttribute(
            'data-map-id',
            'floor8',
          );
          await shows(page, 'item', 'rift-key');
        });
        await j.expectStats();
        await j.fight('floor8-gallery-guard');
        await j.expectBump('floor8-gallery-armory', 'reward');
        await j.expectBump('floor8-bridge-gate', 'latchOpened');
        await j.travel('floor8-to-floor9');
        await j.check(async (page) => {
          await shows(page, 'section', 'floor9-top-band');
          await shows(page, 'note', 'floor8-depth-stairs-used');
        });
      },
    },
    {
      title: 'crosses the floor nine bands',
      run: async (j) => {
        await j.drink('floor9-top-waystone');
        await j.fight('floor9-top-warden');
        await j.expectBump('floor9-top-cache', 'reward');
        await j.fight('floor9-top-ravager');
        await j.drink('floor9-middle-waystone');
        await j.fight('floor9-middle-ambusher');
        await j.drink('floor9-bottom-waystone');
        await j.fight('floor9-crossways-warden');
        await j.travel('floor9-to-floor10');
        await j.check(async (page) => {
          await shows(page, 'section', 'floor10-trunk');
          await shows(page, 'note', 'floor9-depth-stairs-used');
        });
      },
    },
    {
      title: 'quiets the taproot and carries the heartwood home',
      run: async (j) => {
        await j.drink('floor10-root-waystone');
        await j.fight('floor10-middle-guard');
        await j.expectBump('floor10-middle-cache', 'reward');
        await j.fight('floor10-west-ambusher');
        await j.drink('floor10-west-waystone');
        await j.fight('floor10-west-warden');
        await j.expectBump('floor10-heart-hatch', 'latchGuarded');
        await j.check((page) =>
          expect(page.getByTestId('effect')).toHaveAttribute(
            'data-remaining',
            '1',
          ),
        );
        await j.fight('floor10-east-lancer');
        await j.drink('floor10-east-waystone');
        await j.fight('floor10-east-warden');
        await j.expectBump('floor10-heart-hatch', 'latchOpened');
        await j.drink('floor10-heart-waystone');
        await j.prompt('floor10-taproot');
        await j.check(async (page) => {
          await expect(page.locator('[data-trait="firstStrike"]')).toHaveText(
            MESSAGES.en.traits.firstStrike,
          );
          await expect(page.locator('[data-trait="pierce"]')).toHaveText(
            MESSAGES.en.traits.pierce(4),
          );
          await recordBlows(page);
        });
        await j.confirm();
        await j.check(async (page) => {
          // The replay shows exactly the blows the rules resolved: the
          // taproot strikes first and pierces, so its blows come before the
          // hero's every turn and land for full damage.
          const blows = resolvedBlows(j);
          expect(await replayFrames(page)).toEqual(blows);
          expect(blows[0]?.by).toBe('enemy');
          expect(blows.every((blow) => blow.hit)).toBe(true);
        });
        await j.expectBump('floor10-heartwood', 'itemReward');
        await j.check(async (page) => {
          await shows(page, 'item', 'tower-heartwood');
          await shows(page, 'lead', 'return-heartwood');
        });
        await j.travel('floor10-lift-to-village');
        await j.walkTo(j.tileBeside('village-lift-to-floor10', 'west'));
        await j.travel('village-lift-to-floor10');
        await j.walkTo(j.tileBeside('floor10-lift-to-village', 'south'));
        await j.travel('floor10-lift-to-village');
        await j.expectBump('village-warden', 'dialogue');
        await j.check(async (page) => {
          await expectLine(page, 'warden-heartwood-ending');
          await shows(page, 'lead', 'taproot-quieted');
          await page.reload();
          await expect(page.getByTestId('map-name')).toHaveAttribute(
            'data-map-id',
            'village',
          );
          await shows(page, 'lead', 'taproot-quieted');
          await shows(page, 'item', 'tower-heartwood');
        });
        await j.walkTo(j.tileBeside('village-lift-to-floor10', 'west'));
        await j.expectStats();
      },
    },
  ]);

  journeyChapters('deep floors', [
    ...FULL_CLEAR,
    {
      title: 'a settling twinblade answers back twice in one turn',
      run: async (j: Journey) => {
        await j.travel('floor5-depth-to-floor6');
        await j.drink('floor6-inlet-waystone');
        await j.fight('floor6-inlet-guard');
        await j.travel('floor6-inlet-east-pad');
        await j.prompt('floor6-settling-twinblade');
        await j.check(async (page) => {
          await expect(page.locator('[data-trait="doubleStrike"]')).toHaveText(
            MESSAGES.en.traits.doubleStrike,
          );
          await recordBlows(page);
        });
        await j.confirm();
        await j.check(async (page) => {
          const blows = resolvedBlows(j);
          expect(await replayFrames(page)).toEqual(blows);
          // Every turn the twinblade lives through, it answers back twice.
          expect(blows.map((blow) => blow.by).join(',')).toBe(
            'hero,enemy,enemy,hero,enemy,enemy,hero,enemy,enemy,hero,enemy,enemy,hero',
          );
        });
      },
    },
  ]);
});
