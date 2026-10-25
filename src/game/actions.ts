import { previewCombat } from './combat';
import { resolveNpcInteraction } from './dialogue';
import { directionFromTo } from './geometry';
import { addItem, recordFact } from './progress';
import { nextWare } from './shop';
import type { ActionResult, Entity, GameState, Tile } from './types';

export function interactWithEntity(
  state: GameState,
  entity: Entity,
  fromTile: Tile,
): ActionResult {
  switch (entity.kind) {
    case 'clue': {
      const next = entity.factId ? recordFact(state, entity.factId) : state;
      return {
        ok: true,
        state: next,
        effect: { kind: 'clue', clueId: entity.id },
      };
    }
    case 'npc': {
      const introduced = entity.introFactId
        ? recordFact(state, entity.introFactId)
        : state;
      const interaction = resolveNpcInteraction(entity.id, introduced);
      const next = interaction.factId
        ? recordFact(introduced, interaction.factId)
        : introduced;

      return {
        ok: true,
        state: next,
        effect: {
          kind: 'dialogue',
          speakerId: entity.id,
          lineId: interaction.lineId,
        },
      };
    }
    case 'reward': {
      if (state.openedRewardIds.includes(entity.id))
        return { ok: false, reason: 'reward-already-taken' };

      if (entity.grant === 'item') {
        const next = addItem(
          {
            ...state,
            openedRewardIds: [...state.openedRewardIds, entity.id],
          },
          entity.itemId,
        );
        return {
          ok: true,
          state: next,
          effect: { kind: 'itemReward', itemId: entity.itemId },
        };
      }

      const player = {
        ...state.player,
        [entity.stat]: state.player[entity.stat] + entity.amount,
      };

      return {
        ok: true,
        state: {
          ...state,
          player,
          openedRewardIds: [...state.openedRewardIds, entity.id],
        },
        effect: { kind: 'reward', stat: entity.stat, amount: entity.amount },
      };
    }
    case 'latch': {
      if (state.openedShortcutIds.includes(entity.id))
        return {
          ok: true,
          state,
          effect: { kind: 'latchOpened', id: entity.id },
        };
      if ('leverIds' in entity) {
        const total = entity.leverIds.length;
        const thrown = entity.leverIds.filter((id) =>
          state.openedShortcutIds.includes(id),
        ).length;
        if (thrown < total)
          return {
            ok: true,
            state,
            effect: { kind: 'latchWired', id: entity.id, thrown, total },
          };
      } else if ('guardIds' in entity) {
        const remaining = entity.guardIds.filter(
          (id) => !state.defeatedEnemyIds.includes(id),
        ).length;
        if (remaining > 0)
          return {
            ok: true,
            state,
            effect: { kind: 'latchGuarded', id: entity.id, remaining },
          };
      } else if (directionFromTo(entity.tile, fromTile) !== entity.rearSide) {
        return { ok: false, reason: 'latch-closed-front' };
      }
      return {
        ok: true,
        state: {
          ...state,
          openedShortcutIds: [...state.openedShortcutIds, entity.id],
        },
        effect: { kind: 'latchOpened', id: entity.id },
      };
    }
    case 'lever': {
      const flipped = [entity.id, ...(entity.links ?? [])];
      const before = state.openedShortcutIds;
      const openedShortcutIds = [
        ...before.filter((id) => !flipped.includes(id)),
        ...flipped.filter((id) => !before.includes(id)),
      ];
      return {
        ok: true,
        state: { ...state, openedShortcutIds },
        effect: {
          kind: 'leverPulled',
          id: entity.id,
          thrown: openedShortcutIds.includes(entity.id),
          linked: flipped.length - 1,
        },
      };
    }
    case 'enemy': {
      if (state.defeatedEnemyIds.includes(entity.id))
        return {
          ok: true,
          state,
          effect: {
            kind: 'enemyDefeated',
            enemyId: entity.id,
            hpLost: 0,
            gold: 0,
          },
        };
      const preview = previewCombat(state.player, entity.stats);
      if (!preview.winnable) return { ok: false, reason: preview.reason };
      return {
        ok: true,
        state,
        effect: { kind: 'combatPrompt', enemyId: entity.id, preview },
      };
    }
    case 'sealed':
      return {
        ok: true,
        state,
        effect: { kind: 'accessLocked', entityId: entity.id },
      };
    case 'shop': {
      const ware = nextWare(entity, state);
      if (!ware)
        return {
          ok: true,
          state,
          effect: { kind: 'soldOut', shopId: entity.id },
        };
      return {
        ok: true,
        state,
        effect: { kind: 'purchasePrompt', shopId: entity.id, ware },
      };
    }
    case 'portal':
      throw new Error('Portals are step-on movement');
  }
}
