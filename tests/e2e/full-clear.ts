import { expect } from '@playwright/test';

import { MAPS } from '../../src/game/content';
import type {
  EnemyEntity,
  RewardEntity,
  ShopEntity,
} from '../../src/game/types';
import type { Chapter, Journey } from './journey';

const cleared = [
  MAPS.village,
  MAPS.floor1,
  MAPS.floor2,
  MAPS.floor3,
  MAPS.floor4,
  MAPS.floor5,
].flatMap((map) => map.entities);
const enemies = cleared.filter(
  (entity): entity is EnemyEntity => entity.kind === 'enemy',
);
const rewards = cleared.filter(
  (entity): entity is RewardEntity => entity.kind === 'reward',
);
const wares = cleared
  .filter((entity): entity is ShopEntity => entity.kind === 'shop')
  .flatMap((shop) => shop.wares);
const itemRewards = rewards.filter(
  (reward): reward is RewardEntity & { grant: 'item' } =>
    reward.grant === 'item',
);

export async function expectDeepEntry(journey: Journey): Promise<void> {
  const { game } = journey;
  expect(game.mapId).toBe('floor5');
  expect(game.tile).toEqual({ x: 10, y: 9 });
  expect(game.player).toEqual({
    hp: 4,
    attack: 43,
    defense: 43,
    agility: 5,
    gold: 134,
  });
  expect(game.trades).toBe(8);
  expect([...game.defeatedEnemyIds].sort()).toEqual(
    enemies.map((enemy) => enemy.id).sort(),
  );
  expect([...game.openedRewardIds].sort()).toEqual(
    rewards.map((reward) => reward.id).sort(),
  );
  expect([...game.itemIds].sort()).toEqual(
    [
      ...wares.map((ware) => ware.itemId),
      ...itemRewards.map((reward) => reward.itemId),
    ].sort(),
  );
  expect(game.factIds).toContain('main-village-restored');
}

export const FULL_CLEAR: readonly Chapter[] = [
  {
    title: 'clears floors one and two',
    replayOnly: true,
    run: async (j) => {
      await j.expectBump('village-warden', 'dialogue');
      await j.drink('village-waystone');
      await j.travel('village-to-floor1');
      await j.fight('floor1-west-sentry');
      await j.fight('floor1-den-mite-1');
      await j.fight('floor1-den-mite-2');
      await j.expectBump('floor1-passage-cache', 'reward');
      await j.travel('floor1-to-village');
      await j.buy('village-item-shop');
      await j.travel('village-to-floor1');
      await j.fight('floor1-west-lurker');
      await j.expectBump('floor1-west-cache', 'reward');
      await j.fight('floor1-gatekeeper');
      await j.expectBump('floor1-ledger-fragment', 'itemReward');
      await j.travel('floor1-to-village');
      await j.buy('village-armor-shop');
      await j.travel('village-to-floor1');
      await j.fight('floor1-upper-lurker');
      await j.expectBump('floor1-upper-cache', 'reward');
      await j.fight('floor1-gallery-mite-1');
      await j.fight('floor1-sigil-warden');
      await j.expectBump('floor1-depth-sigil', 'itemReward');
      await j.travel('floor1-to-village');
      await j.buy('village-weapon-shop');
      await j.travel('village-to-floor1');
      await j.expectBump('floor1-sigil-alcove', 'reward');
      await j.fight('floor1-gallery-mite-2');
      await j.fight('floor1-gallery-prowler');
      await j.expectBump('floor1-gallery-cache', 'reward');
      await j.travel('floor1-front-to-floor2');
      await j.fight('floor2-service-guard');
      await j.drink('floor2-service-waystone');
      await j.expectBump('floor2-sentry-cache', 'reward');
      await j.expectBump('floor2-service-store', 'reward');
      await j.fight('floor2-service-lurker');
      await j.expectBump('floor2-service-cache', 'reward');
      await j.travel('floor2-front-to-floor1');
      await j.travel('floor1-to-village');
      await j.trade('village-status-trader', 1);
      await j.travel('village-to-floor1');
      await j.travel('floor1-front-to-floor2');
      await j.fight('floor2-nook-mite-1');
      await j.fight('floor2-nook-mite-2');
      await j.expectBump('floor2-service-nook', 'reward');
      await j.fight('floor2-service-prowler');
      await j.expectBump('floor2-service-shelf', 'reward');
      await j.fight('floor2-east-sentry');
      await j.expectBump('floor2-east-release', 'latchOpened');
      await j.expectBump('floor2-missing-subject', 'dialogue');
      await j.expectBump('floor2-hall-shelf', 'reward');
      await j.expectBump('floor2-west-release', 'latchOpened');
      await j.expectBump('floor2-shelf-cache', 'reward');
      await j.expectBump('floor2-aisle-cache', 'reward');
      await j.fight('floor2-archive-brute');
      await j.travel('floor2-treasury-to-floor1');
      await j.expectBump('floor1-future-treasury', 'reward');
      await j.travel('floor1-treasury-to-floor2');
      await j.travel('floor2-front-to-floor1');
      await j.travel('floor1-to-village');
      await j.buy('village-armor-shop');
      await j.travel('village-to-floor1');
      await j.travel('floor1-front-to-floor2');
      await j.fight('floor2-archive-lurker');
      await j.expectBump('floor2-archive-cache', 'reward');
      await j.fight('floor2-stack-mite-4');
      await j.fight('floor2-stack-lurker');
      await j.fight('floor2-stack-mite-5');
      await j.expectBump('floor2-stack-cache', 'reward');
      await j.fight('floor2-archive-prowler');
      await j.expectBump('floor2-archive-tome', 'reward');
      await j.travel('floor2-front-to-floor1');
      await j.travel('floor1-to-village');
      await j.buy('village-item-shop');
      await j.travel('village-to-floor1');
      await j.travel('floor1-front-to-floor2');
      await j.fight('floor2-stack-prowler');
      await j.expectBump('floor2-stack-store', 'reward');
      await j.fight('floor2-hall-mite-1');
      await j.fight('floor2-hall-lurker');
      await j.fight('floor2-hall-mite-2');
      await j.expectBump('floor2-hall-store', 'reward');
      await j.fight('floor2-stair-warden');
      await j.travel('floor2-front-to-floor1');
      await j.travel('floor1-to-village');
      await j.buy('village-weapon-shop');
      await j.travel('village-to-floor1');
      await j.travel('floor1-front-to-floor2');
    },
  },
  {
    title: 'clears floor three and the rear wing',
    replayOnly: true,
    run: async (j) => {
      await j.travel('floor2-depth-to-floor3');
      await j.expectBump('floor3-west-lever', 'leverPulled');
      await j.fight('floor3-west-lurker');
      await j.fight('floor3-west-prowler');
      await j.expectBump('floor3-west-store', 'reward');
      await j.fight('floor3-walk-crawler-1');
      await j.fight('floor3-walk-crawler-2');
      await j.expectBump('floor3-walk-cache', 'reward');
      await j.fight('floor3-east-prowler');
      await j.fight('floor3-spine-crawler-1');
      await j.travel('floor3-to-floor2');
      await j.travel('floor2-front-to-floor1');
      await j.travel('floor1-to-village');
      await j.trade('village-status-trader', 1);
      await j.travel('village-to-floor1');
      await j.travel('floor1-front-to-floor2');
      await j.fight('floor2-stack-mite-1');
      await j.fight('floor2-stack-mite-2');
      await j.fight('floor2-stack-mite-3');
      await j.travel('floor2-rear-to-floor1');
      await j.fight('floor1-gallery-sentry');
      await j.expectBump('floor1-rear-latch', 'latchOpened');
      await j.fight('floor1-rear-lurker');
      await j.expectBump('floor1-rear-cache', 'reward');
      await j.fight('floor1-rear-sentry');
      await j.fight('floor1-rear-prowler');
      await j.fight('floor1-rear-mite');
      await j.expectBump('floor1-rear-nook', 'reward');
      await j.travel('floor1-rear-to-floor2');
      await j.fight('floor2-hall-sentry');
      await j.travel('floor2-depth-to-floor3');
      await j.fight('floor3-spine-crawler-2');
      await j.expectBump('floor3-gallery-lever', 'leverPulled');
      await j.drink('floor3-gallery-waystone');
      await j.fight('floor3-archive-guard');
      await j.fight('floor3-gallery-crawler-1');
      await j.travel('floor3-to-floor2');
      await j.travel('floor2-front-to-floor1');
      await j.travel('floor1-to-village');
      await j.buy('village-item-shop');
      await j.travel('village-to-floor1');
      await j.travel('floor1-front-to-floor2');
      await j.travel('floor2-depth-to-floor3');
      await j.fight('floor3-gallery-crawler-2');
      await j.fight('floor3-east-lurker');
      await j.fight('floor3-gallery-crawler-3');
      await j.fight('floor3-gallery-crawler-4');
      await j.expectBump('floor3-gallery-store', 'reward');
      await j.fight('floor3-east-warden');
      await j.fight('floor3-walk-lurker');
      await j.expectBump('floor3-east-walk-cache', 'reward');
      await j.fight('floor3-gutter-crawler-1');
      await j.fight('floor3-gutter-crawler-2');
      await j.fight('floor3-archive-lurker');
      await j.expectBump('floor3-archive-cache', 'reward');
      await j.fight('floor3-archive-crawler-1');
      await j.fight('floor3-archive-crawler-2');
      await j.fight('floor3-archive-sentry');
      await j.expectBump('floor3-crown-lever', 'leverPulled');
      await j.expectBump('floor3-heart-shortcut', 'latchOpened');
      await j.drink('floor3-heart-waystone');
      await j.fight('floor3-approach-sentry');
      await j.fight('floor3-heart-sentinel');
    },
  },
  {
    title: 'clears floor four',
    replayOnly: true,
    run: async (j) => {
      await j.travel('floor3-to-floor4');
      await j.drink('floor4-landing-waystone');
      await j.fight('floor4-west-gate-guard');
      await j.drink('floor4-west-waystone');
      await j.expectBump('floor4-west-tooth-cache', 'reward');
      await j.fight('floor4-east-gate-guard');
      await j.drink('floor4-east-waystone');
      await j.expectBump('floor4-east-tooth-cache', 'reward');
      await j.fight('floor4-west-lurker');
      await j.expectBump('floor4-west-cache', 'reward');
      await j.fight('floor4-west-prowler');
      await j.fight('floor4-west-store-guard');
      await j.travel('floor4-vault-to-floor3');
      await j.expectBump('floor3-vault-latch', 'latchOpened');
      await j.expectBump('floor3-vault-passage-cache', 'reward');
      await j.travel('floor3-vault-to-floor4');
      await j.expectBump('floor4-west-store-cache', 'reward');
      await j.fight('floor4-west-hand-1');
      await j.fight('floor4-west-hand-2');
      await j.fight('floor4-west-foreman');
      await j.expectBump('floor4-west-flue-cache', 'reward');
      await j.fight('floor4-west-flue-hand-1');
      await j.fight('floor4-west-flue-hand-2');
      await j.expectBump('floor4-west-gutter-cache', 'reward');
      await j.fight('floor4-east-lurker');
      await j.expectBump('floor4-east-cache', 'reward');
      await j.fight('floor4-east-prowler');
      await j.fight('floor4-east-tooth-hand');
      await j.expectBump('floor4-east-tooth-store', 'reward');
      await j.fight('floor4-east-store-guard');
      await j.fight('floor4-east-hand-1');
      await j.fight('floor4-east-hand-2');
      await j.fight('floor4-east-foreman');
      await j.fight('floor4-east-flue-hand-1');
      await j.fight('floor4-east-flue-hand-2');
      await j.expectBump('floor4-east-flue-store', 'reward');
      await j.fight('floor4-cellar-lurker');
      await j.expectBump('floor4-cellar-cache', 'reward');
      await j.fight('floor4-forge-warden');
      await j.expectBump('floor4-gate-lever-1', 'leverPulled');
      await j.expectBump('floor4-gate-lever-4', 'leverPulled');
      await j.expectBump('floor4-foundry-gate', 'latchOpened');
      await j.drink('floor4-stair-waystone');
      await j.fight('floor4-casting-hand-1');
      await j.fight('floor4-casting-hand-2');
      await j.fight('floor4-casting-hand-3');
      await j.expectBump('floor4-gallery-cache', 'reward');
      await j.fight('floor4-stair-warden');
    },
  },
  {
    title: 'clears floor five and ends the story',
    replayOnly: true,
    run: async (j) => {
      await j.travel('floor4-to-floor5');
      await j.drink('floor5-landing-waystone');
      await j.fight('floor5-west-lurker');
      await j.fight('floor5-ring-wisp-1');
      await j.fight('floor5-ring-wisp-2');
      await j.expectBump('floor5-west-cache', 'reward');
      await j.fight('floor5-south-gate-guard');
      await j.drink('floor5-ring-waystone');
      await j.fight('floor5-east-sentry');
      await j.fight('floor5-ring-wisp-5');
      await j.fight('floor5-ring-wisp-6');
      await j.fight('floor5-east-lurker');
      await j.fight('floor5-ring-wisp-7');
      await j.expectBump('floor5-east-cache', 'reward');
      await j.fight('floor5-ring-wisp-8');
      await j.fight('floor5-ring-wisp-9');
      await j.expectBump('floor5-lattice-cache', 'reward');
      await j.fight('floor5-west-warden');
      await j.fight('floor5-inner-lurker');
      await j.travel('floor5-to-floor4');
      await j.travel('floor4-to-floor3');
      await j.fight('floor3-vault-sentry');
      await j.travel('floor3-to-floor4');
      await j.travel('floor4-to-floor5');
      await j.fight('floor5-south-warden');
      await j.fight('floor5-ring-wisp-3');
      await j.fight('floor5-ring-wisp-4');
      await j.expectBump('floor5-south-store', 'reward');
      await j.fight('floor5-southeast-lurker');
      await j.expectBump('floor5-southeast-cache', 'reward');
      await j.fight('floor5-east-warden');
      await j.expectBump('floor5-sanctum-seal', 'latchOpened');
      await j.drink('floor5-heart-waystone');
      await j.fight('floor5-core-guardian');
      await j.expectBump('floor5-restoration-core', 'itemReward');
      await j.travel('floor5-lift-to-village');
      await j.expectBump('village-warden', 'dialogue');
    },
  },
  {
    title: 'sweeps the vaults and the shaft, then parks at the deep stair',
    replayOnly: true,
    run: async (j) => {
      await j.travel('village-to-floor1');
      await j.travel('floor1-front-to-floor2');
      await j.travel('floor2-depth-to-floor3');
      await j.travel('floor3-to-floor4');
      await j.fight('floor4-forge-keeper');
      await j.travel('floor4-to-floor5');
      await j.fight('floor5-west-vault-keeper');
      await j.expectBump('floor5-west-vault-store', 'reward');
      await j.fight('floor5-east-vault-keeper');
      await j.expectBump('floor5-shaft-hatch', 'latchOpened');
      await j.expectBump('floor5-west-warden-cache', 'reward');
      await j.travel('floor5-shaft-to-floor4');
      await j.fight('floor4-slag-wisp-1');
      await j.travel('floor4-shaft-to-floor5');
      await j.expectBump('floor5-south-cache', 'reward');
      await j.expectBump('floor5-east-vault-cache', 'reward');
      await j.expectBump('floor5-east-sentry-cache', 'reward');
      await j.travel('floor5-to-floor4');
      await j.expectBump('floor4-forge-cache', 'reward');
      await j.travel('floor4-to-floor3');
      await j.expectBump('floor3-heart-cache', 'reward');
      await j.travel('floor3-to-floor4');
      await j.expectBump('floor4-east-prowler-cache', 'reward');
      await j.expectBump('floor4-east-flue-cache', 'reward');
      await j.travel('floor4-to-floor5');
      await j.travel('floor5-shaft-to-floor4');
      await j.fight('floor4-slag-wisp-2');
      await j.travel('floor4-shaft-to-floor5');
      await j.travel('floor5-to-floor4');
      await j.travel('floor4-to-floor3');
      await j.expectBump('floor3-east-cache', 'reward');
      await j.travel('floor3-vault-to-floor4');
      await j.expectBump('floor4-west-works-cache', 'reward');
      await j.travel('floor4-vault-to-floor3');
      await j.travel('floor3-to-floor2');
      await j.travel('floor2-rear-to-floor1');
      await j.expectBump('floor1-power-core', 'reward');
      await j.travel('floor1-to-village');
      await j.buy('village-weapon-shop');
      await j.trade('village-status-trader', 0);
      await j.trade('village-status-trader', 0);
      await j.trade('village-status-trader', 0);
      await j.trade('village-status-trader', 0);
      await j.trade('village-status-trader', 1);
      await j.trade('village-status-trader', 1);
      await j.buy('village-armor-shop');
      await j.travel('village-lift-to-floor5');
      await j.expectBump('floor5-inner-cache', 'reward');
      await j.expectBump('floor5-east-vault-store', 'reward');
      await j.travel('floor5-shaft-to-floor4');
      await j.fight('floor4-slag-wisp-3');
      await j.expectBump('floor4-cellar-hoard', 'reward');
      await j.travel('floor4-shaft-to-floor5');
      await j.expectBump('floor5-west-vault-cache', 'reward');
      await j.expectBump('floor5-east-warden-cache', 'reward');
      await j.travel('floor5-to-floor4');
      await j.expectBump('floor4-west-prowler-cache', 'reward');
      await j.travel('floor4-vault-to-floor3');
      await j.expectBump('floor3-hidden-vault-cache', 'reward');
      await j.travel('floor3-to-floor2');
      await j.expectBump('floor2-hall-cache', 'reward');
      await j.travel('floor2-depth-to-floor3');
      await j.expectBump('floor3-west-cache', 'reward');
      await j.travel('floor3-to-floor4');
      await j.travel('floor4-to-floor5');
      await j.travel('floor5-shaft-to-floor4');
      await j.fight('floor4-slag-brute');
      await j.travel('floor4-shaft-to-floor3');
      await j.fight('floor3-crypt-shade-1');
      await j.fight('floor3-crypt-shade-2');
      await j.fight('floor3-crypt-shade-3');
      await j.expectBump('floor3-crypt-hoard', 'reward');
      await j.fight('floor3-crypt-warden');
      await j.travel('floor3-shaft-to-floor2');
      await j.expectBump('floor2-reading-room-latch', 'latchOpened');
      await j.travel('floor2-shaft-to-floor3');
      await j.expectBump('floor3-crypt-relic', 'reward');
      await j.travel('floor3-shaft-to-floor2');
      await j.travel('floor2-rear-to-floor1');
      await j.expectBump('floor1-rear-alcove', 'reward');
      await j.travel('floor1-rear-to-floor2');
      await j.travel('floor2-depth-to-floor3');
      await j.expectBump('floor3-gallery-cache', 'reward');
      await j.expectBump('floor3-gutter-hoard', 'reward');
      await j.travel('floor3-vault-to-floor4');
      await j.expectBump('floor4-west-flue-store', 'reward');
      await j.expectBump('floor4-east-store-cache', 'reward');
      await j.expectBump('floor4-east-works-cache', 'reward');
      await j.expectBump('floor4-east-gutter-cache', 'reward');
      await j.travel('floor4-to-floor3');
      await j.travel('floor3-to-floor2');
      await j.fight('floor2-reading-wisp-1');
      await j.fight('floor2-reading-wisp-2');
      await j.fight('floor2-reading-room-warden');
      await j.expectBump('floor2-keepers-ward', 'reward');
      await j.expectBump('floor2-keepers-blade', 'reward');
      await j.travel('floor2-front-to-floor1');
      await j.travel('floor1-to-village');
      await j.travel('village-lift-to-floor5');
      await j.walkTo({ x: 10, y: 9 });
      await expectDeepEntry(j);
    },
  },
];
