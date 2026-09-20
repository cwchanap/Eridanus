import { FACTS, hasFact } from './content/facts';
import { findSectionById } from './content';
import type { GameState } from './types';

export type LeadId =
  | 'seek-warden'
  | 'find-sigil'
  | 'descend'
  | 'search-floor2'
  | 'investigate-deeper'
  | 'heirloom-find-workshop'
  | 'heirloom-inspect-treasury'
  | 'heirloom-find-other-entrance'
  | 'heirloom-claim-treasury'
  | 'heirloom-resolved'
  | 'route-find-marks'
  | 'route-verify-return'
  | 'route-resolved'
  | 'ledger-find-fragment'
  | 'ledger-find-later-pages'
  | 'ledger-follow-deeper-record';

export type JournalEntry = Readonly<{
  id: 'main' | 'heirloom' | 'route' | 'ledger';
  lead: LeadId;
}>;

export type JournalSection = Readonly<{
  id: string;
  name: string;
}>;

export type JournalView = Readonly<{
  main: JournalEntry;
  optional: readonly JournalEntry[];
  sections: readonly JournalSection[];
  observationFactIds: readonly string[];
}>;

export function factNote(id: string): string | undefined {
  if (!hasFact(id)) return undefined;
  const fact = FACTS[id as keyof typeof FACTS];
  return 'note' in fact ? fact.note : undefined;
}

function knows(factIds: readonly string[], id: string): boolean {
  return factIds.includes(id);
}

function mainLead(state: GameState): LeadId {
  if (knows(state.factIds, 'main-subject-returned'))
    return 'investigate-deeper';
  if (state.itemIds.includes('tower-depth-sigil')) {
    return knows(state.factIds, 'floor1-depth-stairs-used')
      ? 'search-floor2'
      : 'descend';
  }
  if (knows(state.factIds, 'main-missing-person-lead')) return 'find-sigil';
  return 'seek-warden';
}

function optionalEntries(state: GameState): JournalEntry[] {
  const factIds = state.factIds;
  const entries: JournalEntry[] = [];
  if (knows(factIds, 'optional-heirloom-lead')) {
    entries.push({
      id: 'heirloom',
      lead: state.openedRewardIds.includes('floor1-future-treasury')
        ? 'heirloom-resolved'
        : knows(factIds, 'floor1-treasury-return-used')
          ? 'heirloom-claim-treasury'
          : knows(factIds, 'floor1-treasury-sealed')
            ? 'heirloom-find-other-entrance'
            : knows(factIds, 'floor1-treasury-seen')
              ? 'heirloom-inspect-treasury'
              : 'heirloom-find-workshop',
    });
  }
  if (knows(factIds, 'optional-route-lead')) {
    entries.push({
      id: 'route',
      lead: knows(factIds, 'floor1-treasury-return-used')
        ? 'route-resolved'
        : knows(factIds, 'floor1-route-mark-seen')
          ? 'route-verify-return'
          : 'route-find-marks',
    });
  }
  if (knows(factIds, 'optional-ledger-lead')) {
    entries.push({
      id: 'ledger',
      lead: knows(factIds, 'floor2-paired-release-ledger-read')
        ? 'ledger-follow-deeper-record'
        : state.itemIds.includes('ledger-fragment-1')
          ? 'ledger-find-later-pages'
          : 'ledger-find-fragment',
    });
  }
  return entries;
}

export function buildJournalView(state: GameState): JournalView {
  return {
    main: { id: 'main', lead: mainLead(state) },
    optional: optionalEntries(state),
    sections: state.discoveredSectionIds.flatMap((id) => {
      const section = findSectionById(id);
      return section ? [{ id: section.id, name: section.name }] : [];
    }),
    observationFactIds: state.factIds.filter(
      (id) => factNote(id) !== undefined,
    ),
  };
}
