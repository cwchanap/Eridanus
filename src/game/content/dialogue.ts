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
};

export const NPC_DIALOGUE_IDS = new Set([
  'village-warden',
  'village-artisan',
  'village-scout',
  'village-scribe',
]);

export function hasNpcDialogue(id: string): boolean {
  return NPC_DIALOGUE_IDS.has(id);
}
