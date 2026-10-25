import type { GameState } from './types';

export function createInitialGameState(): GameState {
  return {
    mapId: 'village',
    tile: { x: 15, y: 10 },
    player: { hp: 30, attack: 10, defense: 2, gold: 0 },
    openedRewardIds: [],
    defeatedEnemyIds: [],
    openedShortcutIds: [],
    itemIds: [],
    factIds: [],
    discoveredSectionIds: ['village-square'],
    trades: 0,
  };
}
