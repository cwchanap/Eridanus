import type { DialogueLineId } from '../types';

export const DIALOGUE_LINES: Record<DialogueLineId, string> = {
  'warden-main-lead':
    'Search the first floor for the crest that opens the lower stair.',
  'warden-sigil-found':
    'That sigil matches the lower seal. The stair to the next floor should open now.',
  'artisan-find-workshop':
    'My family workshop was sealed inside the tower. Look for its treasury.',
  'artisan-workshop-seen':
    'You saw the workshop treasury from the entrance side. Find a way closer.',
  'artisan-find-other-entrance':
    'The arch is bricked from this side. There must be another entrance from below.',
  'scout-find-marks':
    'An old plan shows a return passage where no corridor should exist. Watch for route scratches.',
  'scout-marks-seen':
    'Those scratches match the old plan. The route probably rejoins from below.',
  'scribe-find-ledger':
    'The tower keeper recorded every mechanism. Bring back any ledger fragment you find.',
  'scribe-fragment-found':
    'This fragment mentions paired mechanisms. More pages must survive deeper in the tower.',
  'warden-subject-returned':
    'You brought them home safely. But that sealed door below the Rear Gallery — what lies beyond it can wait no longer.',
  'subject-returning':
    'I can return to the village on my own. Tell the warden I am safe — and that something still waits below.',
  'subject-village':
    'I am home safe, but what I saw below the Rear Gallery still haunts me. Someone must investigate deeper.',
  'artisan-treasury-route-found':
    "A hidden stair reaches the treasury from below? Go — my family's heirloom can finally be claimed.",
  'artisan-heirloom-recovered':
    'The workshop heirloom is recovered at last. My family thanks you, explorer.',
  'scout-route-verified':
    'So the return connection is real. The old plan was accurate after all — the lost route is verified.',
  'scribe-floor2-ledger-read':
    "Paired rear-release mechanisms — so that is what the fragment meant. The keeper's final record must lie deeper in the tower.",
};
