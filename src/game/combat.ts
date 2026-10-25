import { createInitialGameState } from './state';
import type {
  ActionResult,
  Blow,
  CombatPreview,
  EnemyEntity,
  GameState,
  PlayerStats,
  Rng,
} from './types';

// A blow lands unless its target is more agile than the striker: each AGI
// point the striker lacks costs MISS_PERCENT_PER_AGI of its hits, down to
// MIN_HIT_PERCENT. At equal AGI or better every blow lands, so an enemy no
// quicker than the hero never makes them miss.
const MISS_PERCENT_PER_AGI = 5;
const MIN_HIT_PERCENT = 50;
// A fight that has not ended by now is called lost, so a stuck Rng cannot
// spin forever.
const MAX_ROUNDS = 200;

export function hitChance(
  strikerAgility: number,
  targetAgility: number,
): number {
  const lacking = Math.max(0, targetAgility - strikerAgility);
  return Math.max(MIN_HIT_PERCENT, 100 - MISS_PERCENT_PER_AGI * lacking) / 100;
}

// The fight's cost on average. Misses make the real one vary around it: the
// hero swings first, the enemy answers every swing but the last, and the hero
// needs hitsNeeded / heroHit swings on average to land hitsNeeded hits.
export function previewCombat(
  player: PlayerStats,
  enemy: EnemyEntity['stats'],
): CombatPreview {
  const playerDamage = player.attack - enemy.defense;
  if (playerDamage <= 0)
    return { winnable: false, reason: 'combat-unwinnable' };
  const hitsNeeded = Math.ceil(enemy.hp / playerDamage);
  const heroHit = hitChance(player.agility, enemy.agility);
  const enemyHit = hitChance(enemy.agility, player.agility);
  const enemyDamage = Math.max(0, enemy.attack - player.defense);
  const hpLoss = Math.round(
    (hitsNeeded / heroHit - 1) * enemyHit * enemyDamage,
  );
  if (hpLoss >= player.hp) return { winnable: false, reason: 'combat-lethal' };
  return { winnable: true, hitsNeeded, hpLoss, heroHit, enemyHit };
}

// Plays a fight out blow by blow, hero first, the two trading until one side
// is down. A blow lands when its roll falls under the striker's hit chance.
export function simulateFight(
  player: PlayerStats,
  enemy: EnemyEntity['stats'],
  rng: Rng,
): Readonly<{ blows: readonly Blow[]; won: boolean }> {
  const heroHit = hitChance(player.agility, enemy.agility);
  const enemyHit = hitChance(enemy.agility, player.agility);
  const heroDamage = Math.max(0, player.attack - enemy.defense);
  const enemyDamage = Math.max(0, enemy.attack - player.defense);
  let heroHp = player.hp;
  let enemyHp = enemy.hp;
  const blows: Blow[] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const heroLands = rng() < heroHit;
    if (heroLands) enemyHp = Math.max(0, enemyHp - heroDamage);
    blows.push({
      by: 'hero',
      hit: heroLands,
      damage: heroLands ? heroDamage : 0,
      heroHp,
      enemyHp,
    });
    if (enemyHp === 0) return { blows, won: true };
    const enemyLands = rng() < enemyHit;
    if (enemyLands) heroHp = Math.max(0, heroHp - enemyDamage);
    blows.push({
      by: 'enemy',
      hit: enemyLands,
      damage: enemyLands ? enemyDamage : 0,
      heroHp,
      enemyHp,
    });
    if (heroHp === 0) return { blows, won: false };
  }
  return { blows, won: false };
}

export function resolveCombat(
  state: GameState,
  enemy: EnemyEntity,
  rng: Rng,
): ActionResult {
  const preview = previewCombat(state.player, enemy.stats);
  if (!preview.winnable) return { ok: false, reason: preview.reason };
  if (state.defeatedEnemyIds.includes(enemy.id)) {
    return {
      ok: true,
      state,
      effect: {
        kind: 'enemyDefeated',
        enemyId: enemy.id,
        hpLost: 0,
        gold: 0,
        blows: [],
      },
    };
  }
  const { blows, won } = simulateFight(state.player, enemy.stats, rng);
  if (!won) {
    // Beaten back: the hero wakes where the run began, HP and gold as they
    // were, and the enemy stands untouched.
    const { mapId, tile } = createInitialGameState();
    return {
      ok: true,
      state: { ...state, mapId, tile },
      effect: { kind: 'heroDefeated', enemyId: enemy.id, blows },
    };
  }
  const hp = blows[blows.length - 1]!.heroHp;
  return {
    ok: true,
    state: {
      ...state,
      player: {
        ...state.player,
        hp,
        gold: state.player.gold + enemy.gold,
      },
      defeatedEnemyIds: [...state.defeatedEnemyIds, enemy.id],
    },
    effect: {
      kind: 'enemyDefeated',
      enemyId: enemy.id,
      hpLost: state.player.hp - hp,
      gold: enemy.gold,
      blows,
    },
  };
}
