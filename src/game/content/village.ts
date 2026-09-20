import type { MapDefinition } from '../types';

export const village: MapDefinition = {
  id: 'village',
  name: 'Starting Village',
  layout: [
    '##############',
    '#............#',
    '#..##....##..#',
    '#............#',
    '#....####....#',
    '#............#',
    '#..##....##..#',
    '#............#',
    '#............#',
    '##############',
  ],
  entities: [
    { kind: 'recovery', id: 'village-recovery', tile: { x: 2, y: 2 } },
    {
      kind: 'npc',
      id: 'village-warden',
      tile: { x: 3, y: 7 },
      name: 'Warden',
      introFactId: 'main-missing-person-lead',
    },
    {
      kind: 'npc',
      id: 'village-artisan',
      tile: { x: 6, y: 7 },
      name: 'Artisan',
      introFactId: 'optional-heirloom-lead',
    },
    {
      kind: 'npc',
      id: 'village-scout',
      tile: { x: 9, y: 7 },
      name: 'Scout',
      introFactId: 'optional-route-lead',
    },
    {
      kind: 'npc',
      id: 'village-scribe',
      tile: { x: 11, y: 7 },
      name: 'Scribe',
      introFactId: 'optional-ledger-lead',
    },
    {
      kind: 'npc',
      id: 'village-returned-subject',
      tile: { x: 5, y: 8 },
      name: 'Returned Subject',
      introFactId: 'main-subject-returned',
      presence: { factId: 'main-subject-returned', when: 'known' },
    },
    {
      kind: 'portal',
      id: 'village-to-floor1',
      tile: { x: 11, y: 2 },
      assetId: 'stairs-down',
      target: { mapId: 'floor1', tile: { x: 2, y: 14 } },
      factId: 'village-tower-stairs-used',
    },
  ],
  sections: [
    {
      id: 'village-square',
      name: 'Village Square',
      bounds: { minX: 1, maxX: 12, minY: 5, maxY: 8 },
    },
    {
      id: 'village-north-path',
      name: 'North Path',
      bounds: { minX: 1, maxX: 12, minY: 1, maxY: 4 },
    },
  ],
};
