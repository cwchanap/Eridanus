import { describe, expect, it } from 'vitest';
import { findEntityById } from './content';
import { attemptMove } from './movement';
import { dispatchInput } from './session';
import { nextWare, resolvePurchase, resolveTrade, tradePrice } from './shop';
import { createInitialGameState } from './state';
import type { GameState, Rng, ShopEntity, TraderEntity } from './types';

// Purchases roll nothing; the session only needs a source to carry.
const hits: Rng = () => 0;

function shop(id: string): ShopEntity {
  const entity = findEntityById(id);
  if (entity?.kind !== 'shop') throw new Error(`${id} is not a shop`);
  return entity;
}

const smith = shop('village-weapon-shop');
const merchant = shop('village-item-shop');

// Standing on Market Row in front of the smith's counter (11,13).
const atSmith: GameState = {
  ...createInitialGameState(),
  tile: { x: 11, y: 12 },
  player: { ...createInitialGameState().player, gold: 40 },
};

describe('shops', () => {
  it('offers wares in authored order and nothing once all are owned', () => {
    expect(nextWare(smith, atSmith)?.itemId).toBe('iron-sword');
    expect(
      nextWare(smith, { ...atSmith, itemIds: ['iron-sword'] })?.itemId,
    ).toBe('steel-sword');
    expect(
      nextWare(smith, { ...atSmith, itemIds: ['iron-sword', 'steel-sword'] })
        ?.itemId,
    ).toBe('runed-blade');
    expect(
      nextWare(smith, {
        ...atSmith,
        itemIds: ['iron-sword', 'steel-sword', 'runed-blade'],
      }),
    ).toBeUndefined();
  });

  it('bumping the counter opens a purchase prompt without spending', () => {
    const result = attemptMove(atSmith, 'south');
    expect(result).toEqual({
      ok: true,
      state: atSmith,
      effect: {
        kind: 'purchasePrompt',
        shopId: smith.id,
        ware: smith.wares[0],
      },
    });
  });

  it('buying spends gold, raises the stat, and owns the ware', () => {
    const result = resolvePurchase(atSmith, smith.wares[0]!);
    expect(result).toEqual({
      ok: true,
      state: {
        ...atSmith,
        player: { ...atSmith.player, gold: 10, attack: 12 },
        itemIds: ['iron-sword'],
      },
      effect: { kind: 'purchased', ware: smith.wares[0] },
    });
  });

  it('a better ware replaces the one worn in its slot', () => {
    const rich = {
      ...atSmith,
      player: { ...atSmith.player, gold: 150 },
    };
    const iron = resolvePurchase(rich, smith.wares[0]!);
    const steel = iron.ok && resolvePurchase(iron.state, smith.wares[1]!);
    // 10 base + the Steel Sword's +5, not on top of the Iron Sword's +2.
    expect(steel && steel.ok && steel.state.player).toMatchObject({
      attack: 15,
      gold: 45,
    });
    expect(steel && steel.ok && steel.state.itemIds).toEqual([
      'iron-sword',
      'steel-sword',
    ]);
  });

  it('wares in different slots are worn together', () => {
    const armorer = shop('village-armor-shop');
    const rich = {
      ...atSmith,
      player: { ...atSmith.player, gold: 100 },
    };
    const sword = resolvePurchase(rich, smith.wares[0]!);
    const vest = sword.ok && resolvePurchase(sword.state, armorer.wares[0]!);
    const charm =
      vest && vest.ok && resolvePurchase(vest.state, merchant.wares[0]!);
    expect(charm && charm.ok && charm.state.player).toMatchObject({
      attack: 12,
      defense: 4,
      hp: 50,
    });
  });

  it('an HP ware adds to HP with no cap', () => {
    const result = resolvePurchase(atSmith, merchant.wares[0]!);
    expect(result.ok && result.state.player).toMatchObject({
      hp: 50,
      gold: 20,
    });
  });

  it('refuses a ware the hero cannot afford', () => {
    expect(resolvePurchase(atSmith, smith.wares[1]!)).toEqual({
      ok: false,
      reason: 'not-enough-gold',
    });
  });

  it('reports sold out once every ware is owned', () => {
    const owned = {
      ...atSmith,
      itemIds: ['iron-sword', 'steel-sword', 'runed-blade'],
    };
    const result = attemptMove(owned, 'south');
    expect(result.ok && result.effect).toEqual({
      kind: 'soldOut',
      shopId: 'village-weapon-shop',
    });
  });

  it('confirm buys through the session prompt and cancel leaves it unbought', () => {
    const opened = dispatchInput(
      { game: atSmith, pending: null },
      { kind: 'move', direction: 'south' },
      hits,
    );
    expect(opened.session.pending).toEqual({
      kind: 'purchase',
      shopId: smith.id,
      ware: smith.wares[0],
    });

    const left = dispatchInput(opened.session, { kind: 'cancel' }, hits);
    expect(left.session).toEqual({ game: atSmith, pending: null });

    const bought = dispatchInput(opened.session, { kind: 'confirm' }, hits);
    expect(bought.ok && bought.session.pending).toBeNull();
    expect(bought.session.game.itemIds).toEqual(['iron-sword']);
  });

  it('a refused purchase keeps the prompt open', () => {
    const poor = { ...atSmith, player: { ...atSmith.player, gold: 0 } };
    const opened = dispatchInput(
      { game: poor, pending: null },
      { kind: 'move', direction: 'south' },
      hits,
    );
    const refused = dispatchInput(opened.session, { kind: 'confirm' }, hits);
    expect(refused).toEqual({
      ok: false,
      session: opened.session,
      reason: 'not-enough-gold',
    });
  });
});

const trader = ((): TraderEntity => {
  const entity = findEntityById('village-status-trader');
  if (entity?.kind !== 'trader') throw new Error('trader missing');
  return entity;
})();

// Standing on Market Row beside the trader's stall (9,13), with a full purse.
const atTrader: GameState = {
  ...createInitialGameState(),
  tile: { x: 9, y: 12 },
  player: { ...createInitialGameState().player, gold: 200 },
};
const [attack, defense, hp] = trader.offers;

describe('status trader', () => {
  it('lifts the price by one step for every trade made', () => {
    expect(tradePrice(trader, atTrader)).toBe(50);
    expect(tradePrice(trader, { ...atTrader, trades: 1 })).toBe(60);
    expect(tradePrice(trader, { ...atTrader, trades: 5 })).toBe(100);
  });

  it('bumping the stall opens a trade prompt without spending', () => {
    const result = attemptMove(atTrader, 'south');
    expect(result).toEqual({
      ok: true,
      state: atTrader,
      effect: { kind: 'tradePrompt', traderId: trader.id },
    });
  });

  it('trading spends gold, raises the chosen stat, and counts the trade', () => {
    const result = resolveTrade(atTrader, trader, attack!);
    expect(result).toEqual({
      ok: true,
      state: {
        ...atTrader,
        player: { ...atTrader.player, gold: 150, attack: 11 },
        trades: 1,
      },
      effect: { kind: 'traded', offer: attack, price: 50 },
    });
    const next = result.ok ? result.state : atTrader;
    const second = resolveTrade(next, trader, hp!);
    expect(second.ok && second.state.player).toMatchObject({
      hp: 45,
      gold: 90,
    });
    expect(second.ok && second.effect).toMatchObject({ price: 60 });
  });

  it('refuses a trade the hero cannot afford', () => {
    const poor = { ...atTrader, player: { ...atTrader.player, gold: 49 } };
    expect(resolveTrade(poor, trader, defense!)).toEqual({
      ok: false,
      reason: 'not-enough-gold',
    });
  });

  it('choose picks an offer through the session prompt', () => {
    const opened = dispatchInput(
      { game: atTrader, pending: null },
      { kind: 'move', direction: 'south' },
      hits,
    );
    expect(opened.session.pending).toEqual({
      kind: 'trade',
      traderId: trader.id,
    });

    const bought = dispatchInput(
      opened.session,
      { kind: 'choose', index: 1 },
      hits,
    );
    expect(bought.ok && bought.session.pending).toBeNull();
    expect(bought.session.game.player).toMatchObject({
      defense: 3,
      gold: 150,
    });
    expect(bought.session.game.trades).toBe(1);
  });

  it('cancel leaves the stall without trading', () => {
    const opened = dispatchInput(
      { game: atTrader, pending: null },
      { kind: 'move', direction: 'south' },
      hits,
    );
    const left = dispatchInput(opened.session, { kind: 'cancel' }, hits);
    expect(left.session).toEqual({ game: atTrader, pending: null });
  });

  it('a refused trade keeps the prompt open', () => {
    const poor = { ...atTrader, player: { ...atTrader.player, gold: 0 } };
    const opened = dispatchInput(
      { game: poor, pending: null },
      { kind: 'move', direction: 'south' },
      hits,
    );
    expect(
      dispatchInput(opened.session, { kind: 'choose', index: 0 }, hits),
    ).toEqual({
      ok: false,
      session: opened.session,
      reason: 'not-enough-gold',
    });
  });

  it('ignores Enter and a missing offer, leaving the prompt open', () => {
    const opened = dispatchInput(
      { game: atTrader, pending: null },
      { kind: 'move', direction: 'south' },
      hits,
    );
    for (const input of [
      { kind: 'confirm' },
      { kind: 'choose', index: 3 },
    ] as const)
      expect(dispatchInput(opened.session, input, hits)).toEqual({
        ok: true,
        session: opened.session,
        effect: null,
      });
  });

  it('keeps a number key from answering a fight or a shop counter', () => {
    const shopping = dispatchInput(
      { game: { ...atTrader, tile: { x: 11, y: 12 } }, pending: null },
      { kind: 'move', direction: 'south' },
      hits,
    );
    expect(shopping.session.pending?.kind).toBe('purchase');
    expect(
      dispatchInput(shopping.session, { kind: 'choose', index: 0 }, hits),
    ).toEqual({ ok: true, session: shopping.session, effect: null });
  });
});

describe('sealed maze entrances', () => {
  it('show their text, keep the hero in place, and record nothing', () => {
    // (2,7) is the Mine Trail tile beside the sealed mine at (1,7).
    const state = { ...createInitialGameState(), tile: { x: 2, y: 7 } };
    const result = attemptMove(state, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toBe(state);
    expect(result.effect.kind).toBe('accessLocked');
  });
});

describe('ambient villagers', () => {
  it('talk without recording a fact', () => {
    // The elder stands at (22,12); (21,12) is beside them.
    const state = { ...createInitialGameState(), tile: { x: 21, y: 12 } };
    const result = attemptMove(state, 'east');
    expect(result.ok && result.effect).toEqual({
      kind: 'dialogue',
      speakerId: 'village-elder',
      lineId: 'elder-sealed-crypt',
    });
    expect(result.ok && result.state.factIds).toEqual([]);
  });
});
