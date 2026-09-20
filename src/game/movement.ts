import {
  getActiveEntityAt,
  isEntityBlocking,
  isInBounds,
  isLayoutFloor,
} from './content';
import { interactWithEntity } from './actions';
import { tileInDirection } from './geometry';
import { discoverCurrentSection, recordFact } from './progress';
import type { ActionResult, Direction, GameState } from './types';

export function attemptMove(
  state: GameState,
  direction: Direction,
): ActionResult {
  const target = tileInDirection(state.tile, direction);
  if (!isInBounds(state.mapId, target))
    return { ok: false, reason: 'out-of-bounds' };
  if (!isLayoutFloor(state.mapId, target)) return { ok: false, reason: 'wall' };

  const entity = getActiveEntityAt(state, target);
  if (entity) {
    if (entity.kind === 'portal') {
      if (entity.lock && !state.itemIds.includes(entity.lock.requiresItemId)) {
        const next = recordFact(state, entity.lock.lockedFactId);
        return {
          ok: true,
          state: next,
          effect: {
            kind: 'accessLocked',
            text: entity.lock.lockedText,
          },
        };
      }
      let next: GameState = {
        ...state,
        mapId: entity.target.mapId,
        tile: entity.target.tile,
      };
      if (entity.factId) next = recordFact(next, entity.factId);
      return {
        ok: true,
        state: discoverCurrentSection(next),
        effect: { kind: 'traveled', mapId: entity.target.mapId },
      };
    }
    if (isEntityBlocking(entity, state))
      return interactWithEntity(state, entity, state.tile);
  }

  return {
    ok: true,
    state: discoverCurrentSection({ ...state, tile: target }),
    effect: { kind: 'moved' },
  };
}
