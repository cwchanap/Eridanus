import { describe, expect, it } from 'vitest';
import { findEntityById } from './content';
import { attemptMove } from './movement';
import { dispatchInput } from './session';
import { nextWare, resolvePurchase } from './shop';
import { createInitialGameState } from './state';
import type { GameState, ShopEntity } from './types';

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
  player: { ...createInitialGameState().player, gold: 20 },
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
        player: { ...atSmith.player, gold: 5, attack: 11 },
        itemIds: ['iron-sword'],
      },
      effect: { kind: 'purchased', ware: smith.wares[0] },
    });
  });

  it('an HP ware adds to HP with no cap', () => {
    const result = resolvePurchase(atSmith, merchant.wares[0]!);
    expect(result.ok && result.state.player).toMatchObject({
      hp: 35,
      gold: 10,
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
    );
    expect(opened.session.pending).toEqual({
      kind: 'purchase',
      shopId: smith.id,
      ware: smith.wares[0],
    });

    const left = dispatchInput(opened.session, { kind: 'cancel' });
    expect(left.session).toEqual({ game: atSmith, pending: null });

    const bought = dispatchInput(opened.session, { kind: 'confirm' });
    expect(bought.ok && bought.session.pending).toBeNull();
    expect(bought.session.game.itemIds).toEqual(['iron-sword']);
  });

  it('a refused purchase keeps the prompt open', () => {
    const poor = { ...atSmith, player: { ...atSmith.player, gold: 0 } };
    const opened = dispatchInput(
      { game: poor, pending: null },
      { kind: 'move', direction: 'south' },
    );
    const refused = dispatchInput(opened.session, { kind: 'confirm' });
    expect(refused).toEqual({
      ok: false,
      session: opened.session,
      reason: 'not-enough-gold',
    });
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
