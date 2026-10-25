import { findEntityById } from './content';
import { resolveCombat } from './combat';
import { attemptMove } from './movement';
import { resolvePurchase, resolveTrade } from './shop';
import type {
  ActionEffect,
  ActionResult,
  GameState,
  InputCommand,
  PendingInteraction,
  SessionState,
  SessionTransition,
} from './types';

// Each prompt answers only its own input (Fight and Buy answer confirm,
// a trade answers choose); any other input leaves it open, and null says so.
function resolvePending(
  game: GameState,
  pending: PendingInteraction,
  input: InputCommand,
): ActionResult | null {
  switch (pending.kind) {
    case 'combat': {
      if (input.kind !== 'confirm') return null;
      const entity = findEntityById(pending.enemyId);
      if (!entity || entity.kind !== 'enemy')
        throw new Error('Pending combat enemy missing');
      return resolveCombat(game, entity);
    }
    case 'purchase':
      return input.kind === 'confirm'
        ? resolvePurchase(game, pending.ware)
        : null;
    case 'trade': {
      if (input.kind !== 'choose') return null;
      const trader = findEntityById(pending.traderId);
      if (trader?.kind !== 'trader') throw new Error('Pending trader missing');
      const offer = trader.offers[input.index];
      return offer ? resolveTrade(game, trader, offer) : null;
    }
  }
}

export function dispatchInput(
  session: SessionState,
  input: InputCommand,
): SessionTransition {
  if (session.pending) {
    if (input.kind === 'move')
      return { ok: false, session, reason: 'interaction-pending' };
    if (input.kind === 'cancel')
      return { ok: true, session: { ...session, pending: null }, effect: null };
    const result = resolvePending(session.game, session.pending, input);
    if (!result) return { ok: true, session, effect: null };
    if (!result.ok) return { ok: false, session, reason: result.reason };
    return {
      ok: true,
      session: { game: result.state, pending: null },
      effect: result.effect,
    };
  }

  if (input.kind !== 'move') return { ok: true, session, effect: null };
  const result = attemptMove(session.game, input.direction);
  if (!result.ok) return { ok: false, session, reason: result.reason };
  return {
    ok: true,
    session: { game: result.state, pending: pendingFor(result.effect) },
    effect: result.effect,
  };
}

// The three prompt effects open a pending interaction; every other effect
// leaves none.
function pendingFor(effect: ActionEffect): PendingInteraction | null {
  if (effect.kind === 'combatPrompt')
    return { kind: 'combat', enemyId: effect.enemyId, preview: effect.preview };
  if (effect.kind === 'purchasePrompt')
    return { kind: 'purchase', shopId: effect.shopId, ware: effect.ware };
  if (effect.kind === 'tradePrompt')
    return { kind: 'trade', traderId: effect.traderId };
  return null;
}
