import { equippedWares } from './equipment';
import { addItem } from './progress';
import type {
  ActionResult,
  GameState,
  PlayerStats,
  ShopEntity,
  ShopWare,
  Stat,
  TraderEntity,
  TraderOffer,
} from './types';

// Wares sell in authored order, so the counter always offers the cheapest
// step up the shop has left.
export function nextWare(
  shop: ShopEntity,
  state: GameState,
): ShopWare | undefined {
  return shop.wares.find((ware) => !state.itemIds.includes(ware.itemId));
}

function withStat(player: PlayerStats, stat: Stat, delta: number): PlayerStats {
  return { ...player, [stat]: player[stat] + delta };
}

// Buying equips the ware: the bonus of the ware worn in its slot comes off
// and the new one goes on.
export function resolvePurchase(
  state: GameState,
  ware: ShopWare,
): ActionResult {
  if (state.itemIds.includes(ware.itemId))
    return { ok: true, state, effect: { kind: 'purchased', ware } };
  if (state.player.gold < ware.price)
    return { ok: false, reason: 'not-enough-gold' };
  const worn = equippedWares(state.itemIds)[ware.slot];
  const paid = { ...state.player, gold: state.player.gold - ware.price };
  const player = withStat(
    worn ? withStat(paid, worn.stat, -worn.amount) : paid,
    ware.stat,
    ware.amount,
  );
  return {
    ok: true,
    state: addItem({ ...state, player }, ware.itemId),
    effect: { kind: 'purchased', ware },
  };
}

export function tradePrice(trader: TraderEntity, state: GameState): number {
  return trader.basePrice + trader.priceStep * state.trades;
}

export function resolveTrade(
  state: GameState,
  trader: TraderEntity,
  offer: TraderOffer,
): ActionResult {
  const price = tradePrice(trader, state);
  if (state.player.gold < price)
    return { ok: false, reason: 'not-enough-gold' };
  const player = withStat(
    { ...state.player, gold: state.player.gold - price },
    offer.stat,
    offer.amount,
  );
  return {
    ok: true,
    state: { ...state, player, trades: state.trades + 1 },
    effect: { kind: 'traded', offer, price },
  };
}
