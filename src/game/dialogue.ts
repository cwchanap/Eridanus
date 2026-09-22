import type { GameState, NpcId, NpcInteractionResolution } from './types';

export function resolveNpcInteraction(
  npcId: NpcId,
  state: GameState,
): NpcInteractionResolution {
  switch (npcId) {
    case 'village-warden':
      if (state.itemIds.includes('tower-restoration-core')) {
        return {
          lineId: state.factIds.includes('floor3-keeper-final-record-read')
            ? 'warden-restoration-ending-ledger'
            : 'warden-restoration-ending',
          factId: 'main-village-restored',
        };
      }
      if (state.factIds.includes('main-subject-returned'))
        return { lineId: 'warden-subject-returned' };
      return {
        lineId: state.itemIds.includes('tower-depth-sigil')
          ? 'warden-sigil-found'
          : 'warden-main-lead',
      };

    case 'village-artisan':
      if (state.openedRewardIds.includes('floor1-future-treasury'))
        return { lineId: 'artisan-heirloom-recovered' };
      if (state.factIds.includes('floor1-treasury-return-used'))
        return { lineId: 'artisan-treasury-route-found' };
      if (state.factIds.includes('floor1-treasury-sealed'))
        return { lineId: 'artisan-find-other-entrance' };
      if (state.factIds.includes('floor1-treasury-seen'))
        return { lineId: 'artisan-workshop-seen' };
      return { lineId: 'artisan-find-workshop' };

    case 'village-scout':
      if (state.factIds.includes('floor1-treasury-return-used'))
        return { lineId: 'scout-route-verified' };
      return state.factIds.includes('floor1-route-mark-seen')
        ? { lineId: 'scout-marks-seen' }
        : { lineId: 'scout-find-marks' };

    case 'village-scribe':
      if (state.factIds.includes('floor3-keeper-final-record-read'))
        return { lineId: 'scribe-final-ledger-read' };
      if (state.factIds.includes('floor2-paired-release-ledger-read'))
        return { lineId: 'scribe-floor2-ledger-read' };
      return state.itemIds.includes('ledger-fragment-1')
        ? { lineId: 'scribe-fragment-found' }
        : { lineId: 'scribe-find-ledger' };

    case 'floor2-missing-subject':
      return { lineId: 'subject-returning' };

    case 'village-returned-subject':
      return { lineId: 'subject-village' };
  }
}
