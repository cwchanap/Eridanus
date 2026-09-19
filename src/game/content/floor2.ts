import type { MapDefinition } from '../types';

export const floor2: MapDefinition = {
  id: 'floor2',
  name: 'Tower Floor 2',
  layout: [
    '################',
    '#..............#',
    '#.####.#####...#',
    '#....#.....#...#',
    '####.#.###.#.#.#',
    '#....#...#...#.#',
    '#.######.#####.#',
    '#..............#',
    '#..............#',
    '################',
  ],
  entities: [
    {
      kind: 'portal',
      id: 'floor2-front-to-floor1',
      tile: { x: 1, y: 8 },
      assetId: 'stairs-up',
      target: { mapId: 'floor1', tile: { x: 5, y: 2 } },
    },
    {
      kind: 'portal',
      id: 'floor2-rear-to-floor1',
      tile: { x: 14, y: 1 },
      assetId: 'stairs-up',
      target: { mapId: 'floor1', tile: { x: 14, y: 2 } },
    },
  ],
  sections: [
    {
      id: 'floor2-connector',
      name: 'Floor 2 Connector',
      bounds: { minX: 1, maxX: 14, minY: 1, maxY: 8 },
    },
  ],
};
