import type { JournalEntry, JournalView, LeadId } from '../game/journal';
import { pick, type Messages } from '../i18n/messages';

const RESOLVED_LEADS: ReadonlySet<LeadId> = new Set([
  'heirloom-resolved',
  'route-resolved',
  'ledger-resolved',
  'story-complete',
]);

function renderEntry(entry: JournalEntry, m: Messages): string {
  const resolved = RESOLVED_LEADS.has(entry.lead) ? ' data-resolved' : '';
  return `<li class="lead" data-lead="${entry.lead}"${resolved}>
    <span class="lead-title">${m.leadTitles[entry.id]}</span>
    <span class="lead-text">${m.leads[entry.lead]}</span>
  </li>`;
}

function group(title: string, body: string): string {
  return body
    ? `<div class="journal-group"><h3>${title}</h3>${body}</div>`
    : '';
}

// The HUD's top-right corner: only the main quest, and the way into the
// menu that holds the rest. It carries no data-lead, so the menu's quest
// tab stays the one place the e2e journeys read leads from.
export function renderQuestTracker(view: JournalView, m: Messages): string {
  return `<section class="panel quest" data-testid="quest" aria-label="${m.leadTitles.main}">
    <p class="quest-text"><span class="lead-title">${m.leadTitles.main}</span> <span class="quest-lead" data-quest="${view.main.lead}">${m.leads[view.main.lead]}</span></p>
    <button type="button" class="chip-button" data-action="open-menu" aria-keyshortcuts="Escape">${m.ui.menu} <kbd aria-hidden="true">Esc</kbd></button>
  </section>`;
}

// The menu's quests tab: the main quest, then every side lead taken.
export function renderQuests(view: JournalView, m: Messages): string {
  const optional = view.optional.map((entry) => renderEntry(entry, m)).join('');
  return `<ul class="leads leads-main">${renderEntry(view.main, m)}</ul>
    ${group(m.ui.sideLeads, optional && `<ul class="leads">${optional}</ul>`)}`;
}

// The menu's notes tab: what was seen, and the places found.
export function renderNotes(view: JournalView, m: Messages): string {
  const notes = view.observationFactIds
    .map((id) => `<li data-note="${id}">${m.notes[id]}</li>`)
    .join('');
  const places = view.sectionIds
    .map(
      (id) =>
        `<span class="place" data-section="${id}">${pick(m.sections, id)}</span>`,
    )
    .join('');
  return `${group(m.ui.notes, notes && `<ul class="notes">${notes}</ul>`) || `<p class="panel-empty">${m.ui.noNotes}</p>`}
    ${group(m.ui.placesFound, places && `<div class="place-list">${places}</div>`)}`;
}
