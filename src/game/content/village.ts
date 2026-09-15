import type { MapDefinition } from '../types';

export const village: MapDefinition = {
  id: 'village',
  name: 'Starting Village',
  layout: [
    '############',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '############',
  ],
  entities: [
    { kind: 'recovery', id: 'village-recovery', tile: { x: 2, y: 2 } },
    {
      kind: 'clue',
      id: 'village-tower-lead',
      tile: { x: 4, y: 5 },
      text: 'The old tower path loops below the sealed first floor.',
    },
    {
      kind: 'portal',
      id: 'village-to-floor1',
      tile: { x: 9, y: 2 },
      target: { mapId: 'floor1', tile: { x: 2, y: 9 } },
    },
  ],
};
