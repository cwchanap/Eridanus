import type { GameState } from './types';

export function createInitialGameState(): GameState {
  return {
    mapId: 'village',
    tile: { x: 2, y: 5 },
    player: { hp: 30, maxHp: 30, attack: 10, defense: 2 },
    openedRewardIds: [],
    defeatedEnemyIds: [],
    openedShortcutIds: [],
    itemIds: [],
    factIds: [],
    discoveredSectionIds: ['village-square'],
  };
}
