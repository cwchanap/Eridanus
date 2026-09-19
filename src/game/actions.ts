import { previewCombat } from './combat';
import { resolveNpcDialogue } from './dialogue';
import { addItem, recordFact } from './progress';
import type { ActionResult, Direction, Entity, GameState, Tile } from './types';

function directionFromTo(from: Tile, to: Tile): Direction | null {
  if (to.x === from.x && to.y === from.y - 1) return 'north';
  if (to.x === from.x && to.y === from.y + 1) return 'south';
  if (to.x === from.x - 1 && to.y === from.y) return 'west';
  if (to.x === from.x + 1 && to.y === from.y) return 'east';
  return null;
}

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
        effect: { kind: 'clue', text: entity.text },
      };
    }
    case 'recovery': {
      const next = {
        ...state,
        player: { ...state.player, hp: state.player.maxHp },
      };
      return {
        ok: true,
        state: next,
        effect: { kind: 'healed', hp: next.player.hp },
      };
    }
    case 'npc': {
      const next = recordFact(state, entity.introFactId);
      const lineId = resolveNpcDialogue(entity.id, next);
      return {
        ok: true,
        state: next,
        effect: { kind: 'dialogue', speaker: entity.name, lineId },
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
          effect: {
            kind: 'itemReward',
            itemId: entity.itemId,
            label: entity.label,
          },
        };
      }

      const player = {
        ...state.player,
        [entity.stat]: state.player[entity.stat] + entity.amount,
      };
      if (entity.stat === 'maxHp') player.hp += entity.amount;

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
      if (directionFromTo(entity.tile, fromTile) !== entity.rearSide)
        return { ok: false, reason: 'latch-closed-front' };
      return {
        ok: true,
        state: {
          ...state,
          openedShortcutIds: [...state.openedShortcutIds, entity.id],
        },
        effect: { kind: 'latchOpened', id: entity.id },
      };
    }
    case 'enemy': {
      if (state.defeatedEnemyIds.includes(entity.id))
        return {
          ok: true,
          state,
          effect: { kind: 'enemyDefeated', enemyId: entity.id, hpLost: 0 },
        };
      const preview = previewCombat(state.player, entity.stats);
      if (!preview.winnable) return { ok: false, reason: preview.reason };
      return {
        ok: true,
        state,
        effect: { kind: 'combatPrompt', enemyId: entity.id, preview },
      };
    }
    case 'portal':
      throw new Error('Portals are step-on movement');
  }
}
