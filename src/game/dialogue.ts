import type { DialogueLineId, GameState } from './types';

export function resolveNpcDialogue(
  npcId: string,
  state: GameState,
): DialogueLineId {
  switch (npcId) {
    case 'village-warden':
      return state.itemIds.includes('tower-depth-sigil')
        ? 'warden-sigil-found'
        : 'warden-main-lead';

    case 'village-artisan':
      if (state.factIds.includes('floor1-treasury-sealed'))
        return 'artisan-find-other-entrance';
      if (state.factIds.includes('floor1-treasury-seen'))
        return 'artisan-workshop-seen';
      return 'artisan-find-workshop';

    case 'village-scout':
      return state.factIds.includes('floor1-route-mark-seen')
        ? 'scout-marks-seen'
        : 'scout-find-marks';

    case 'village-scribe':
      return state.itemIds.includes('ledger-fragment-1')
        ? 'scribe-fragment-found'
        : 'scribe-find-ledger';

    default:
      throw new Error('Unknown NPC: ' + npcId);
  }
}
