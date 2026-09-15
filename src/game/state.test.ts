import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';

describe('createInitialGameState', () => {
  it('starts in the village with baseline stats', () => {
    expect(createInitialGameState()).toEqual({
      mapId: 'village',
      tile: { x: 2, y: 5 },
      player: { hp: 30, maxHp: 30, attack: 10, defense: 2 },
      openedRewardIds: [],
      defeatedEnemyIds: [],
      openedShortcutIds: [],
    });
  });
});
