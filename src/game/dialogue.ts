import type { DialogueLineId, GameState, NpcId } from './types';

export function resolveNpcDialogue(
  npcId: NpcId,
  state: GameState,
): DialogueLineId {
  switch (npcId) {
    case 'village-warden':
      if (state.factIds.includes('main-subject-returned'))
        return 'warden-subject-returned';
      return state.itemIds.includes('tower-depth-sigil')
        ? 'warden-sigil-found'
        : 'warden-main-lead';

    case 'village-artisan':
      if (state.openedRewardIds.includes('floor1-future-treasury'))
        return 'artisan-heirloom-recovered';
      if (state.factIds.includes('floor1-treasury-return-used'))
        return 'artisan-treasury-route-found';
      if (state.factIds.includes('floor1-treasury-sealed'))
        return 'artisan-find-other-entrance';
      if (state.factIds.includes('floor1-treasury-seen'))
        return 'artisan-workshop-seen';
      return 'artisan-find-workshop';

    case 'village-scout':
      if (state.factIds.includes('floor1-treasury-return-used'))
        return 'scout-route-verified';
      return state.factIds.includes('floor1-route-mark-seen')
        ? 'scout-marks-seen'
        : 'scout-find-marks';

    case 'village-scribe':
      if (state.factIds.includes('floor2-paired-release-ledger-read'))
        return 'scribe-floor2-ledger-read';
      return state.itemIds.includes('ledger-fragment-1')
        ? 'scribe-fragment-found'
        : 'scribe-find-ledger';

    case 'floor2-missing-subject':
      return 'subject-returning';

    case 'village-returned-subject':
      return 'subject-village';
  }
}
