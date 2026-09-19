import type { JournalEntry, JournalView, LeadId } from '../game/journal';
import { factNote } from '../game/journal';

const ENTRY_TITLE: Record<JournalEntry['id'], string> = {
  main: 'Main',
  heirloom: 'Heirloom',
  route: 'Lost Route',
  ledger: 'Keeper Ledger',
};

const LEAD_TEXT: Record<LeadId, string> = {
  'seek-warden': 'Speak with the village warden.',
  'find-sigil': 'Search Floor 1 for the reusable tower sigil.',
  descend: 'The sigil opens the lower stair. Descend to Floor 2.',
  'heirloom-find-workshop': 'Look for the sealed workshop treasury.',
  'heirloom-inspect-treasury':
    'Find a way to inspect the visible treasury approach.',
  'heirloom-find-other-entrance':
    'The visible approach is sealed. Look for another entrance from below.',
  'route-find-marks': 'Look for the old route scratches.',
  'route-verify-return': 'Verify where the marked return connection leads.',
  'ledger-find-fragment': 'Search for a surviving keeper ledger fragment.',
  'ledger-find-later-pages': 'Look deeper in the tower for later ledger pages.',
};

export function renderJournal(view: JournalView): string {
  const entries = [view.main, ...view.optional]
    .map(
      (entry) =>
        `<p data-lead="${entry.lead}">${ENTRY_TITLE[entry.id]} — ${LEAD_TEXT[entry.lead]}</p>`,
    )
    .join('');
  const sections = view.sections
    .map(
      (section) => `<span data-section="${section.id}">${section.name}</span>`,
    )
    .join('');
  const notes = view.observationFactIds
    .map((id) => `<li data-note="${id}">${factNote(id) ?? ''}</li>`)
    .join('');
  return `<details data-testid="journal" aria-label="Journal">
    <summary>Journal</summary>
    <div>${entries}</div>
    <div>${sections}</div>
    <ul>${notes}</ul>
  </details>`;
}
