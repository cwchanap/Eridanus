import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { findEntityById } from './content';
import { previewCombat, resolveCombat } from './combat';

const enemy = findEntityById('floor1-gatekeeper');
if (!enemy || enemy.kind !== 'enemy') throw new Error('test enemy missing');

const boss = findEntityById('floor5-core-guardian');
if (!boss || boss.kind !== 'enemy')
  throw new Error('floor5-core-guardian missing');
// Existence of the pre-boss full heal; content.test.ts proves its cardinal
// adjacency to the sole boss approach.
const waystone = findEntityById('floor3-heart-waystone');
if (!waystone || waystone.kind !== 'recovery')
  throw new Error('floor3-heart-waystone missing');

describe('combat', () => {
  it('previews baseline and upgraded HP loss', () => {
    expect(
      previewCombat(
        { hp: 30, maxHp: 30, attack: 10, defense: 2, gold: 0 },
        enemy.stats,
      ),
    ).toEqual({ winnable: true, hitsNeeded: 4, hpLoss: 15 });
    expect(
      previewCombat(
        { hp: 30, maxHp: 30, attack: 12, defense: 2, gold: 0 },
        enemy.stats,
      ),
    ).toEqual({ winnable: true, hitsNeeded: 3, hpLoss: 10 });
  });

  it('rejects zero player damage before division', () => {
    expect(
      previewCombat(
        { hp: 30, maxHp: 30, attack: 4, defense: 2, gold: 0 },
        enemy.stats,
      ),
    ).toEqual({ winnable: false, reason: 'combat-unwinnable' });
  });

  it('treats ending at zero HP as lethal', () => {
    expect(
      previewCombat(
        { hp: 15, maxHp: 30, attack: 10, defense: 2, gold: 0 },
        enemy.stats,
      ),
    ).toEqual({ winnable: false, reason: 'combat-lethal' });
  });

  it('previews the floor five boss as five hits and twenty-four HP on the required route', () => {
    // Base stats plus the two chests the required route passes on floors 4
    // and 5 (ATK +2, DEF +2); at bare base stats the guardian is lethal.
    expect(
      previewCombat(
        { hp: 30, maxHp: 30, attack: 12, defense: 4, gold: 0 },
        boss.stats,
      ),
    ).toEqual({ winnable: true, hitsNeeded: 5, hpLoss: 24 });
    expect(previewCombat(createInitialGameState().player, boss.stats)).toEqual({
      winnable: false,
      reason: 'combat-lethal',
    });
  });

  it('lets the required route fight from floor 3 to the guardian at base stats', () => {
    // The required route takes no optional reward and buys nothing; it
    // only opens the chests it must pass and drinks at every waystone it
    // passes. Each fight must leave the hero standing.
    const route = [
      'floor3-archive-sentry',
      'heal',
      'floor3-heart-sentinel',
      'heal',
      'floor4-west-snake-sentry',
      'floor4-west-snake-cache',
      'floor4-west-stair-guard',
      'heal',
      'floor4-stair-warden',
      'heal',
      'floor5-northwest-gate',
      'heal',
      'floor5-west-ring-cache',
      'floor5-sanctum-gate',
      'heal',
      'floor5-core-guardian',
    ];
    let player = createInitialGameState().player;
    for (const step of route) {
      if (step === 'heal') {
        player = { ...player, hp: player.maxHp };
        continue;
      }
      const entity = findEntityById(step);
      if (entity?.kind === 'reward' && entity.grant === 'stat') {
        player = {
          ...player,
          [entity.stat]: player[entity.stat] + entity.amount,
        };
        continue;
      }
      if (entity?.kind !== 'enemy') throw new Error(`${step} is not an enemy`);
      const preview = previewCombat(player, entity.stats);
      expect(preview.winnable, step).toBe(true);
      if (!preview.winnable) return;
      player = { ...player, hp: player.hp - preview.hpLoss };
    }
    expect(player).toMatchObject({ hp: 6, attack: 12, defense: 4 });
  });

  it('resolution commits exactly the previewed loss', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      player: { hp: 30, maxHp: 30, attack: 12, defense: 2, gold: 0 },
    };
    const result = resolveCombat(state, enemy);
    expect(result).toEqual({
      ok: true,
      state: {
        ...state,
        player: { ...state.player, hp: 20, gold: 10 },
        defeatedEnemyIds: ['floor1-gatekeeper'],
      },
      effect: {
        kind: 'enemyDefeated',
        enemyId: 'floor1-gatekeeper',
        hpLost: 10,
        gold: 10,
      },
    });
  });
});
