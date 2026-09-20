import type { Direction, Tile } from './types';

const DELTA: Record<Direction, Tile> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

export function tileInDirection(tile: Tile, direction: Direction): Tile {
  const delta = DELTA[direction];
  return { x: tile.x + delta.x, y: tile.y + delta.y };
}

export function directionFromTo(from: Tile, to: Tile): Direction | null {
  for (const direction of ['north', 'south', 'west', 'east'] as const) {
    const delta = DELTA[direction];
    if (from.x + delta.x === to.x && from.y + delta.y === to.y)
      return direction;
  }
  return null;
}
