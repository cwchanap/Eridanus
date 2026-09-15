import { getEntityAt, isInBounds, isLayoutFloor } from './content';
import { interactWithEntity } from './actions';
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
      return {
        ok: true,
        state: {
          ...state,
          mapId: entity.target.mapId,
          tile: entity.target.tile,
        },
        effect: { kind: 'traveled', mapId: entity.target.mapId },
      };
    }
    if (entity.kind === 'latch' && state.openedShortcutIds.includes(entity.id))
      return {
        ok: true,
        state: { ...state, tile: target },
        effect: { kind: 'moved' },
      };
    if (entity.kind === 'enemy' && state.defeatedEnemyIds.includes(entity.id))
      return {
        ok: true,
        state: { ...state, tile: target },
        effect: { kind: 'moved' },
      };
    if (entity.kind === 'reward' && state.openedRewardIds.includes(entity.id))
      return {
        ok: true,
        state: { ...state, tile: target },
        effect: { kind: 'moved' },
      };
    return interactWithEntity(state, entity, state.tile);
  }

  return {
    ok: true,
    state: { ...state, tile: target },
    effect: { kind: 'moved' },
  };
}
