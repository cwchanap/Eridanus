import { expect } from '@playwright/test';

import { FULL_CLEAR, expectDeepEntry } from './full-clear';
import { journeyChapters } from './journey';

journeyChapters('deep-floor entry', [
  ...FULL_CLEAR,
  {
    title: 'shows the entry hero beside the deep stair',
    run: async (j) => {
      await j.walkTo(j.tileBeside('floor5-depth-to-floor6', 'west'));
      await j.walkTo(j.entityTile('floor5-heart-waystone'));
      await expectDeepEntry(j);
      await j.expectStats();
      await j.check(async (page) => {
        await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 309');
        await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 43');
        await expect(page.locator('[data-stat="defense"]')).toHaveText(
          'DEF 43',
        );
        await expect(page.locator('[data-stat="gold"]')).toHaveText('Gold 134');
      });
    },
  },
]);

journeyChapters('deep-floor entry corrective', [
  ...FULL_CLEAR,
  {
    title: 'affords a fifth trade on the gold it left',
    run: async (j) => {
      await j.travel('floor5-lift-to-village');
      await j.trade('village-status-trader', 0);
      await j.check(async (page) => {
        await expect(page.getByTestId('trade-prompt')).toHaveCount(0);
      });
      await j.expectStats();
    },
  },
]);

journeyChapters('the village market', [
  {
    title: 'earns a purse on floors one and two',
    replayOnly: true,
    run: async (j) => {
      await j.drink('village-waystone');
      await j.travel('village-to-floor1');
      await j.fight('floor1-west-sentry');
      await j.fight('floor1-den-mite-1');
      await j.fight('floor1-den-mite-2');
      await j.expectBump('floor1-passage-cache', 'reward');
      await j.fight('floor1-west-lurker');
      await j.expectBump('floor1-west-cache', 'reward');
      await j.fight('floor1-gatekeeper');
      await j.fight('floor1-upper-lurker');
      await j.expectBump('floor1-upper-cache', 'reward');
      await j.fight('floor1-gallery-mite-1');
      await j.fight('floor1-gallery-mite-2');
      await j.fight('floor1-gallery-prowler');
      await j.expectBump('floor1-gallery-cache', 'reward');
      await j.fight('floor1-sigil-warden');
      await j.expectBump('floor1-depth-sigil', 'itemReward');
      await j.travel('floor1-front-to-floor2');
      await j.fight('floor2-service-guard');
      await j.drink('floor2-service-waystone');
      await j.fight('floor2-service-lurker');
      await j.fight('floor2-stack-mite-1');
      await j.travel('floor2-front-to-floor1');
      await j.travel('floor1-to-village');
    },
  },
  {
    title: 'buys a ware and a status point',
    run: async (j) => {
      let before = j.game.player;
      const carried = j.game.itemIds.length;
      await j.buy('village-item-shop');
      expect(j.game.player.gold).toBe(before.gold - 20);
      expect(j.game.player.hp).toBe(before.hp + 20);
      await j.check(async (page) => {
        await expect(page.getByTestId('purchase-prompt')).toHaveCount(0);
      });
      await j.expectBump('village-item-shop', 'purchasePrompt');
      await j.cancel();
      await j.check(async (page) => {
        await expect(page.getByTestId('purchase-prompt')).toHaveCount(0);
      });
      expect(j.game.itemIds).toHaveLength(carried + 1);
      before = j.game.player;
      await j.trade('village-status-trader', 0);
      expect(j.game.player.gold).toBe(before.gold - 50);
      expect(j.game.player.attack).toBe(before.attack + 1);
      await j.check(async (page) => {
        await expect(page.getByTestId('trade-prompt')).toHaveCount(0);
      });
      await j.expectStats();
    },
  },
]);
