import { findEntityById } from './content';
import { resolveCombat } from './combat';
import { attemptMove } from './movement';
import type { InputCommand, SessionState, SessionTransition } from './types';

export function dispatchInput(
  session: SessionState,
  input: InputCommand,
): SessionTransition {
  if (session.pending) {
    if (input.kind === 'move')
      return { ok: false, session, reason: 'interaction-pending' };
    if (input.kind === 'cancel')
      return { ok: true, session: { ...session, pending: null }, effect: null };
    const entity = findEntityById(session.pending.enemyId);
    if (!entity || entity.kind !== 'enemy')
      throw new Error('Pending combat enemy missing');
    const result = resolveCombat(session.game, entity);
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
  if (result.effect.kind === 'combatPrompt') {
    return {
      ok: true,
      session: {
        game: result.state,
        pending: {
          kind: 'combat',
          enemyId: result.effect.enemyId,
          preview: result.effect.preview,
        },
      },
      effect: result.effect,
    };
  }
  return {
    ok: true,
    session: { ...session, game: result.state },
    effect: result.effect,
  };
}
