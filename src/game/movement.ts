import { getEntityAt, isInBounds, isLayoutFloor } from './content';
import { interactWithEntity } from './actions';
import { discoverCurrentSection, recordFact } from './progress';
import type { ActionResult, Direction, GameState, Tile } from './types';

const DELTA: Record<Direction, Tile> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

export function attemptMove(
  state: GameState,
  direction: Direction,
): ActionResult {
  const delta = DELTA[direction];
  const target = { x: state.tile.x + delta.x, y: state.tile.y + delta.y };
  if (!isInBounds(state.mapId, target))
    return { ok: false, reason: 'out-of-bounds' };
  if (!isLayoutFloor(state.mapId, target)) return { ok: false, reason: 'wall' };

  const entity = getEntityAt(state.mapId, target);
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
    const passable =
      (entity.kind === 'latch' &&
        state.openedShortcutIds.includes(entity.id)) ||
      (entity.kind === 'enemy' && state.defeatedEnemyIds.includes(entity.id)) ||
      (entity.kind === 'reward' && state.openedRewardIds.includes(entity.id));
    if (!passable) return interactWithEntity(state, entity, state.tile);
  }

  return {
    ok: true,
    state: discoverCurrentSection({ ...state, tile: target }),
    effect: { kind: 'moved' },
  };
}
