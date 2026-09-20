import { describe, expect, it } from 'vitest';
import { directionFromTo, tileInDirection } from './geometry';

describe('cardinal geometry', () => {
  const tile = { x: 4, y: 5 };

  it('returns the neighbor tile in each direction', () => {
    expect(tileInDirection(tile, 'north')).toEqual({ x: 4, y: 4 });
    expect(tileInDirection(tile, 'south')).toEqual({ x: 4, y: 6 });
    expect(tileInDirection(tile, 'east')).toEqual({ x: 5, y: 5 });
    expect(tileInDirection(tile, 'west')).toEqual({ x: 3, y: 5 });
  });

  it('returns the direction from a tile to each cardinal neighbor', () => {
    expect(directionFromTo(tile, tileInDirection(tile, 'north'))).toBe('north');
    expect(directionFromTo(tile, tileInDirection(tile, 'south'))).toBe('south');
    expect(directionFromTo(tile, tileInDirection(tile, 'east'))).toBe('east');
    expect(directionFromTo(tile, tileInDirection(tile, 'west'))).toBe('west');
  });

  it('returns null for same, diagonal, or distant tiles', () => {
    expect(directionFromTo(tile, tile)).toBeNull();
    expect(directionFromTo(tile, { x: 5, y: 6 })).toBeNull();
    expect(directionFromTo(tile, { x: 4, y: 8 })).toBeNull();
  });
});
