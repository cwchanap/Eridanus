import { addItem } from './progress';
import type { ActionResult, GameState, ShopEntity, ShopWare } from './types';

// Wares sell in authored order, so the counter always offers the cheapest
// step up the shop has left.
export function nextWare(
  shop: ShopEntity,
  state: GameState,
): ShopWare | undefined {
  return shop.wares.find((ware) => !state.itemIds.includes(ware.itemId));
}

export function resolvePurchase(
  state: GameState,
  ware: ShopWare,
): ActionResult {
  if (state.itemIds.includes(ware.itemId))
    return { ok: true, state, effect: { kind: 'purchased', ware } };
  if (state.player.gold < ware.price)
    return { ok: false, reason: 'not-enough-gold' };
  const player = {
    ...state.player,
    gold: state.player.gold - ware.price,
    [ware.stat]: state.player[ware.stat] + ware.amount,
  };
  return {
    ok: true,
    state: addItem({ ...state, player }, ware.itemId),
    effect: { kind: 'purchased', ware },
  };
}
