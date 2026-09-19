import { FACTS, hasFact } from './content/facts';
import { findSectionById } from './content';
import type { GameState } from './types';

export type LeadId =
  | 'seek-warden'
  | 'find-sigil'
  | 'descend'
  | 'heirloom-find-workshop'
  | 'heirloom-inspect-treasury'
  | 'heirloom-find-other-entrance'
  | 'route-find-marks'
  | 'route-verify-return'
  | 'ledger-find-fragment'
  | 'ledger-find-later-pages';

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

function mainLead(factIds: readonly string[]): LeadId {
  if (knows(factIds, 'floor1-depth-seal-seen')) return 'descend';
  if (knows(factIds, 'floor1-depth-stairs-used')) return 'descend';
  if (knows(factIds, 'village-tower-stairs-used')) return 'find-sigil';
  return 'seek-warden';
}

function optionalEntries(factIds: readonly string[]): JournalEntry[] {
  const entries: JournalEntry[] = [];
  if (knows(factIds, 'optional-heirloom-lead')) {
    entries.push({
      id: 'heirloom',
      lead: knows(factIds, 'floor1-treasury-sealed')
        ? 'heirloom-find-other-entrance'
        : knows(factIds, 'floor1-treasury-seen')
          ? 'heirloom-inspect-treasury'
          : 'heirloom-find-workshop',
    });
  }
  if (knows(factIds, 'optional-route-lead')) {
    entries.push({
      id: 'route',
      lead: knows(factIds, 'floor1-route-mark-seen')
        ? 'route-verify-return'
        : 'route-find-marks',
    });
  }
  if (knows(factIds, 'optional-ledger-lead')) {
    entries.push({
      id: 'ledger',
      lead: knows(factIds, 'floor1-depth-stairs-used')
        ? 'ledger-find-later-pages'
        : 'ledger-find-fragment',
    });
  }
  return entries;
}

export function buildJournalView(state: GameState): JournalView {
  return {
    main: { id: 'main', lead: mainLead(state.factIds) },
    optional: optionalEntries(state.factIds),
    sections: state.discoveredSectionIds.flatMap((id) => {
      const section = findSectionById(id);
      return section ? [{ id: section.id, name: section.name }] : [];
    }),
    observationFactIds: state.factIds.filter(
      (id) => factNote(id) !== undefined,
    ),
  };
}
