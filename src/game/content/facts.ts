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
  'main-subject-returned': {},
  'floor1-treasury-return-used': {
    note: 'A hidden stair behind the treasury reaches Floor 2 — the sealed treasury can be entered from behind.',
  },
  'floor2-paired-release-ledger-read': {
    note: 'The keeper paired two rear-release mechanisms: each passage opens only from its far side.',
  },
  'floor2-depth-seal-seen': {
    note: 'The lower seal would not release until the missing subject returned with the keeper warning.',
  },
  'floor2-depth-stairs-used': {
    note: 'The sealed lower stair reaches Floor 3.',
  },
  'floor3-keeper-final-record-read': {
    note: 'The final keeper record says the paired releases isolated a failed guardian control state while the tower continued feeding the village system.',
  },
  'main-village-restored': {},
} as const satisfies Record<string, { note?: string }>;

export type FactId = keyof typeof FACTS;

export function hasFact(id: string): boolean {
  return Object.hasOwn(FACTS, id);
}
