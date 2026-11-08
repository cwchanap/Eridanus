import {
  getEntityAt,
  isLayoutFloor,
  isTileBlockedByEntity,
} from '../../src/game/content';
import { tileInDirection } from '../../src/game/geometry';
import type { Direction, GameState, Tile } from '../../src/game/types';

const DIRECTIONS: readonly Direction[] = ['north', 'south', 'east', 'west'];
const key = (tile: Tile): string => `${tile.x},${tile.y}`;

// The shortest walk from the hero's tile to `to` over open floor, counting
// a portal only as the goal, never as a corridor. Shared by the browser
// journeys and the movement replays so they plan routes the same way.
export function routeMoves(state: GameState, to: Tile): Direction[] | null {
  const from = new Map<string, readonly [Tile, Direction] | null>([
    [key(state.tile), null],
  ]);
  const queue: Tile[] = [state.tile];
  while (queue.length > 0) {
    const tile = queue.shift()!;
    if (key(tile) === key(to)) break;
    for (const direction of DIRECTIONS) {
      const next = tileInDirection(tile, direction);
      const nextKey = key(next);
      if (
        from.has(nextKey) ||
        !isLayoutFloor(state.mapId, next) ||
        isTileBlockedByEntity(state, next)
      )
        continue;
      if (
        getEntityAt(state.mapId, next)?.kind === 'portal' &&
        nextKey !== key(to)
      )
        continue;
      from.set(nextKey, [tile, direction]);
      queue.push(next);
    }
  }
  if (!from.has(key(to))) return null;
  const moves: Direction[] = [];
  for (let step = from.get(key(to)); step; step = from.get(key(step[0])))
    moves.unshift(step[1]);
  return moves;
}
