import type {
  ActionResult,
  CombatPreview,
  EnemyEntity,
  GameState,
  PlayerStats,
} from './types';

export function previewCombat(
  player: PlayerStats,
  enemy: EnemyEntity['stats'],
): CombatPreview {
  const playerDamage = player.attack - enemy.defense;
  if (playerDamage <= 0)
    return { winnable: false, reason: 'combat-unwinnable' };
  const hitsNeeded = Math.ceil(enemy.hp / playerDamage);
  const enemyDamage = Math.max(0, enemy.attack - player.defense);
  const hpLoss = (hitsNeeded - 1) * enemyDamage;
  if (hpLoss >= player.hp) return { winnable: false, reason: 'combat-lethal' };
  return { winnable: true, hitsNeeded, hpLoss };
}

export function resolveCombat(
  state: GameState,
  enemy: EnemyEntity,
): ActionResult {
  const preview = previewCombat(state.player, enemy.stats);
  if (!preview.winnable) return { ok: false, reason: preview.reason };
  if (state.defeatedEnemyIds.includes(enemy.id)) {
    return {
      ok: true,
      state,
      effect: { kind: 'enemyDefeated', enemyId: enemy.id, hpLost: 0 },
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      player: { ...state.player, hp: state.player.hp - preview.hpLoss },
      defeatedEnemyIds: [...state.defeatedEnemyIds, enemy.id],
    },
    effect: {
      kind: 'enemyDefeated',
      enemyId: enemy.id,
      hpLost: preview.hpLoss,
    },
  };
}
