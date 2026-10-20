import { findEntityById } from './content';
import { resolveCombat } from './combat';
import { attemptMove } from './movement';
import { resolvePurchase } from './shop';
import type {
  ActionEffect,
  ActionResult,
  GameState,
  InputCommand,
  PendingInteraction,
  SessionState,
  SessionTransition,
} from './types';

function resolvePending(
  game: GameState,
  pending: PendingInteraction,
): ActionResult {
  switch (pending.kind) {
    case 'combat': {
      const entity = findEntityById(pending.enemyId);
      if (!entity || entity.kind !== 'enemy')
        throw new Error('Pending combat enemy missing');
      return resolveCombat(game, entity);
    }
    case 'purchase':
      return resolvePurchase(game, pending.ware);
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
    const result = resolvePending(session.game, session.pending);
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

// The two prompt effects open a pending interaction; every other effect
// leaves none.
function pendingFor(effect: ActionEffect): PendingInteraction | null {
  if (effect.kind === 'combatPrompt')
    return { kind: 'combat', enemyId: effect.enemyId, preview: effect.preview };
  if (effect.kind === 'purchasePrompt')
    return { kind: 'purchase', shopId: effect.shopId, ware: effect.ware };
  return null;
}
