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
      effect: { kind: 'enemyDefeated', enemyId: enemy.id, hpLost: 0, gold: 0 },
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      player: {
        ...state.player,
        hp: state.player.hp - preview.hpLoss,
        gold: state.player.gold + enemy.gold,
      },
      defeatedEnemyIds: [...state.defeatedEnemyIds, enemy.id],
    },
    effect: {
      kind: 'enemyDefeated',
      enemyId: enemy.id,
      hpLost: preview.hpLoss,
      gold: enemy.gold,
    },
  };
}

// One strike of a fight: who struck, for how much, and both sides' HP after.
export type Blow = Readonly<{
  by: 'hero' | 'enemy';
  damage: number;
  heroHp: number;
  enemyHp: number;
}>;

// The fight previewCombat prices, blow by blow, for the battle animation:
// the hero strikes first and the two trade until the enemy falls, so the
// hero takes one hit fewer than they deal. The rules only use the total.
export function combatBlows(
  player: PlayerStats,
  enemy: EnemyEntity['stats'],
): readonly Blow[] {
  const preview = previewCombat(player, enemy);
  if (!preview.winnable) return [];
  const heroDamage = player.attack - enemy.defense;
  const enemyDamage = Math.max(0, enemy.attack - player.defense);
  let heroHp = player.hp;
  let enemyHp = enemy.hp;
  const blows: Blow[] = [];
  for (let hit = 0; hit < preview.hitsNeeded; hit++) {
    if (hit > 0) {
      heroHp -= enemyDamage;
      blows.push({ by: 'enemy', damage: enemyDamage, heroHp, enemyHp });
    }
    enemyHp = Math.max(0, enemyHp - heroDamage);
    blows.push({ by: 'hero', damage: heroDamage, heroHp, enemyHp });
  }
  return blows;
}
