import type { MapDefinition } from '../types';

export const floor1: MapDefinition = {
  id: 'floor1',
  name: 'Tower Floor 1',
  layout: [
    '##################',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '#................#',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '##################',
  ],
  entities: [
    {
      kind: 'portal',
      id: 'floor1-to-village',
      tile: { x: 2, y: 9 },
      assetId: 'stairs-up',
      target: { mapId: 'village', tile: { x: 9, y: 2 } },
    },
    {
      kind: 'portal',
      id: 'floor1-front-to-floor2',
      tile: { x: 5, y: 2 },
      assetId: 'stairs-down',
      target: { mapId: 'floor2', tile: { x: 1, y: 8 } },
    },
    {
      kind: 'portal',
      id: 'floor1-rear-to-floor2',
      tile: { x: 14, y: 2 },
      assetId: 'stairs-down',
      target: { mapId: 'floor2', tile: { x: 14, y: 1 } },
    },
    {
      kind: 'clue',
      id: 'floor1-lower-route-clue',
      tile: { x: 5, y: 4 },
      assetId: 'clue-runes',
      text: 'Scratches on the stone point down before they turn back east.',
    },
    {
      kind: 'latch',
      id: 'floor1-rear-latch',
      tile: { x: 7, y: 5 },
      rearSide: 'east',
    },
    {
      kind: 'reward',
      id: 'floor1-power-core',
      tile: { x: 9, y: 5 },
      assetId: 'chest-relic-closed',
      grant: 'stat',
      stat: 'attack',
      amount: 2,
    },
    {
      kind: 'enemy',
      id: 'floor1-gatekeeper',
      tile: { x: 11, y: 5 },
      assetId: 'enemy-ruin-guard',
      stats: { hp: 20, attack: 7, defense: 4 },
    },
  ],
  sections: [
    {
      id: 'floor1-proof',
      name: 'Tower Floor 1',
      bounds: { minX: 1, maxX: 16, minY: 1, maxY: 10 },
    },
  ],
};
