import type { MapDefinition } from '../types';

export const village: MapDefinition = {
  id: 'village',
  // An open village in the middle, walled, with a gate on each side. The
  // outskirts around it are a winding maze whose dead-end branches hold the
  // tower stair (north) and the sealed Mine (west), Crypt (east) and Barrow
  // (south-west), with the tower lift beside the stair. The top corners stay solid: the hero card and journal
  // float over them.
  layout: [
    '#################################',
    '#######.....#########.#...#######',
    '#########.###########.###.#######',
    '#######...................#######',
    '#######.#######.#########.#######',
    '#######.#...............#.#######',
    '#######.#.###.......###.#.#######',
    '#.....#.#.###.......###.#.#.....#',
    '#####.#.#...............#.###.#.#',
    '#...#.#.................#...#.#.#',
    '#.#.#.#.#.##.........##.###.###.#',
    '#.#...#.#.##..............#.#...#',
    '#.#.###.#...............#.#.#.###',
    '#.#.....#.#.#..#.#..#.#.#...#...#',
    '#.#.#.###.###..###..###.#.###.#.#',
    '#.....#.#...............#...#.#.#',
    '#######.#########.#######.#.#.#.#',
    '#.....#.........#.......#.#...#.#',
    '#.#.###.#####.###.#.#.#.#.#####.#',
    '#.#...................#.........#',
    '#################################',
  ],
  entities: [
    { kind: 'recovery', id: 'village-recovery', tile: { x: 16, y: 8 } },
    {
      kind: 'npc',
      id: 'village-warden',
      tile: { x: 15, y: 9 },
      assetId: 'npc-warden',
      introFactId: 'main-missing-person-lead',
    },
    {
      kind: 'npc',
      id: 'village-artisan',
      tile: { x: 11, y: 8 },
      introFactId: 'optional-heirloom-lead',
    },
    {
      kind: 'npc',
      id: 'village-scout',
      tile: { x: 14, y: 5 },
      assetId: 'npc-scout',
      introFactId: 'optional-route-lead',
    },
    {
      kind: 'npc',
      id: 'village-scribe',
      tile: { x: 20, y: 11 },
      assetId: 'npc-scribe',
      introFactId: 'optional-ledger-lead',
    },
    {
      kind: 'npc',
      id: 'village-returned-subject',
      tile: { x: 17, y: 9 },
      assetId: 'npc-subject',
      introFactId: 'main-subject-returned',
      presence: { factId: 'main-subject-returned', when: 'known' },
    },
    {
      kind: 'npc',
      id: 'village-elder',
      tile: { x: 22, y: 12 },
      assetId: 'npc-elder',
    },
    {
      kind: 'npc',
      id: 'village-guard',
      tile: { x: 10, y: 9 },
      assetId: 'npc-guard',
    },
    {
      kind: 'npc',
      id: 'village-child',
      tile: { x: 7, y: 1 },
      assetId: 'npc-child',
    },
    {
      kind: 'shop',
      id: 'village-weapon-shop',
      tile: { x: 11, y: 13 },
      assetId: 'npc-smith',
      wares: [
        {
          itemId: 'iron-sword',
          price: 15,
          stat: 'attack',
          amount: 1,
        },
        {
          itemId: 'steel-sword',
          price: 40,
          stat: 'attack',
          amount: 2,
        },
        {
          itemId: 'runed-blade',
          price: 90,
          stat: 'attack',
          amount: 4,
        },
      ],
    },
    {
      kind: 'shop',
      id: 'village-armor-shop',
      tile: { x: 16, y: 13 },
      assetId: 'npc-armorer',
      wares: [
        {
          itemId: 'leather-vest',
          price: 15,
          stat: 'defense',
          amount: 1,
        },
        {
          itemId: 'chain-mail',
          price: 40,
          stat: 'defense',
          amount: 2,
        },
        {
          itemId: 'plate-armor',
          price: 90,
          stat: 'defense',
          amount: 4,
        },
      ],
    },
    {
      kind: 'shop',
      id: 'village-item-shop',
      tile: { x: 21, y: 13 },
      assetId: 'npc-merchant',
      wares: [
        {
          itemId: 'vitality-charm',
          price: 10,
          stat: 'maxHp',
          amount: 5,
        },
        {
          itemId: 'heart-amulet',
          price: 30,
          stat: 'maxHp',
          amount: 10,
        },
        {
          itemId: 'life-crystal',
          price: 70,
          stat: 'maxHp',
          amount: 20,
        },
      ],
    },
    {
      kind: 'portal',
      id: 'village-to-floor1',
      tile: { x: 23, y: 1 },
      assetId: 'stairs-down',
      target: { mapId: 'floor1', tile: { x: 2, y: 14 } },
      factId: 'village-tower-stairs-used',
    },
    {
      kind: 'portal',
      id: 'village-lift-to-floor5',
      tile: { x: 21, y: 1 },
      assetId: 'stairs-down',
      target: { mapId: 'floor5', tile: { x: 12, y: 7 } },
      lock: {
        kind: 'item',
        requiresItemId: 'tower-restoration-core',
        lockedFactId: 'tower-lift-seen',
      },
    },
    {
      kind: 'sealed',
      id: 'village-mine-entrance',
      tile: { x: 1, y: 7 },
      assetId: 'stairs-sealed',
    },
    {
      kind: 'sealed',
      id: 'village-crypt-entrance',
      tile: { x: 29, y: 9 },
      assetId: 'stairs-sealed',
    },
    {
      kind: 'sealed',
      id: 'village-barrow-entrance',
      tile: { x: 1, y: 19 },
      assetId: 'stairs-sealed',
    },
  ],
  sections: [
    {
      id: 'village-square',
      bounds: { minX: 8, maxX: 24, minY: 4, maxY: 16 },
    },
    {
      id: 'village-market',
      bounds: { minX: 9, maxX: 23, minY: 12, maxY: 15 },
    },
    {
      id: 'village-tower-road',
      bounds: { minX: 1, maxX: 31, minY: 1, maxY: 3 },
    },
    {
      id: 'village-mine-trail',
      bounds: { minX: 1, maxX: 7, minY: 4, maxY: 16 },
    },
    {
      id: 'village-crypt-lane',
      bounds: { minX: 25, maxX: 31, minY: 4, maxY: 16 },
    },
    {
      id: 'village-barrow-path',
      bounds: { minX: 1, maxX: 31, minY: 17, maxY: 19 },
    },
  ],
};
