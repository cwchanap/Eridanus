import type { JournalEntry, JournalView, LeadId } from '../game/journal';
import { LOCALE_CODES, LOCALE_NAMES, type Locale } from '../i18n/locale';
import { pick, type Messages } from '../i18n/messages';
import { ICONS } from './icons';

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

function renderPlaces(view: JournalView, m: Messages): string {
  return view.sectionIds
    .map(
      (id) =>
        `<span class="place" data-section="${id}">${pick(m.sections, id)}</span>`,
    )
    .join('');
}

// One button that steps through the languages, so it stays as small as the
// head's other buttons. It reads as the language the page is in now.
function renderLanguageButton(m: Messages, locale: Locale): string {
  const label = `${m.ui.language}: ${LOCALE_NAMES[locale]}`;
  return `<button type="button" class="journal-toggle" data-action="next-locale" data-locale="${locale}" aria-label="${label}" title="${label}"><span lang="${locale}">${LOCALE_CODES[locale]}</span></button>`;
}

// The overlay's own view preferences: whether the journal is open (the J key
// or its button) and whether sound is muted (M). A folded journal keeps only
// its title bar on screen. The language button lives in the same head.
export type JournalPrefs = Readonly<{
  open: boolean;
  muted: boolean;
  locale: Locale;
}>;

export function renderJournal(
  view: JournalView,
  m: Messages,
  { open = true, muted = false, locale = 'en' }: Partial<JournalPrefs> = {},
): string {
  const optional = view.optional.map((entry) => renderEntry(entry, m)).join('');
  const notes = view.observationFactIds
    .map((id) => `<li data-note="${id}">${m.notes[id]}</li>`)
    .join('');
  const places = renderPlaces(view, m);
  const body = open
    ? `<div class="journal-body">
      <ul class="leads leads-main">${renderEntry(view.main, m)}</ul>
      ${group(m.ui.sideLeads, optional && `<ul class="leads">${optional}</ul>`)}
      ${group(m.ui.notes, notes && `<ul class="notes">${notes}</ul>`)}
      ${group(m.ui.placesFound, places && `<div class="place-list">${places}</div>`)}
    </div>`
    : '';
  const soundLabel = muted ? m.ui.unmute : m.ui.mute;
  return `<section class="panel journal" data-testid="journal" aria-label="${m.ui.journal}" data-open="${open}">
    <div class="journal-head">
      <h2 class="panel-title">${m.ui.journal}</h2>
      <div class="journal-actions">
      ${renderLanguageButton(m, locale)}
      <button type="button" class="journal-toggle" data-action="toggle-sound" data-muted="${muted}" aria-label="${soundLabel}" title="${soundLabel}" aria-keyshortcuts="M">${muted ? ICONS.muted : ICONS.sound}<kbd aria-hidden="true">M</kbd></button>
      <button type="button" class="journal-toggle" data-action="toggle-journal" aria-expanded="${open}" aria-keyshortcuts="J">${open ? m.ui.hide : m.ui.show} <kbd aria-hidden="true">J</kbd></button>
      </div>
    </div>
    ${body}
  </section>`;
}
