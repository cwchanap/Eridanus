export const FACTS = {
  'main-missing-person-lead': {},
  'optional-heirloom-lead': {},
  'optional-route-lead': {},
  'optional-ledger-lead': {},
  'village-tower-stairs-used': {
    note: 'Stairs connect the village and Floor 1.',
  },
  'floor1-treasury-seen': {
    note: 'A sealed treasury is visible from the Entry Court.',
  },
  'floor1-treasury-sealed': {
    note: 'The treasury arch is bricked from this side.',
  },
  'floor1-route-mark-seen': {
    note: 'Route scratches point toward a connection that returns from below.',
  },
  'floor1-depth-seal-seen': {
    note: 'A crest-shaped socket seals the lower stair.',
  },
  'floor1-depth-stairs-used': {
    note: 'The lower stair reaches Floor 2.',
  },
  'floor1-rear-stairs-used': {
    note: 'A second stair returns to the Rear Wing.',
  },
} as const satisfies Record<string, { note?: string }>;

export function hasFact(id: string): boolean {
  return Object.hasOwn(FACTS, id);
}
