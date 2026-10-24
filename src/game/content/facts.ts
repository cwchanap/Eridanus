export const FACTS = {
  'main-missing-person-lead': {},
  'optional-heirloom-lead': {},
  'optional-route-lead': {},
  'optional-ledger-lead': {},
  'village-tower-stairs-used': { observation: true },
  'floor1-treasury-seen': { observation: true },
  'floor1-treasury-sealed': { observation: true },
  'floor1-route-mark-seen': { observation: true },
  'floor1-depth-seal-seen': { observation: true },
  'floor1-depth-stairs-used': { observation: true },
  'floor1-rear-stairs-used': { observation: true },
  'main-subject-returned': {},
  'floor1-treasury-return-used': { observation: true },
  'floor2-paired-release-ledger-read': { observation: true },
  'floor2-depth-seal-seen': { observation: true },
  'floor2-depth-stairs-used': { observation: true },
  'floor3-keeper-final-record-read': { observation: true },
  'floor3-depth-stairs-used': { observation: true },
  'floor4-depth-stairs-used': { observation: true },
  'tower-lift-seen': { observation: true },
  'main-village-restored': {},
} as const satisfies Record<string, { observation?: true }>;

export type FactId = keyof typeof FACTS;
// Observation facts show as journal notes; their text is in the message
// tables (i18n), keyed by the fact id.
export type ObservationFactId = {
  [Id in FactId]: (typeof FACTS)[Id] extends { observation: true } ? Id : never;
}[FactId];

export function hasFact(id: string): boolean {
  return Object.hasOwn(FACTS, id);
}

export function isObservationFact(id: string): id is ObservationFactId {
  return hasFact(id) && 'observation' in FACTS[id as FactId];
}
