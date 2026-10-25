import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { findEntityById } from './content';
import { previewCombat, resolveCombat } from './combat';

const enemy = findEntityById('floor1-gatekeeper');
if (!enemy || enemy.kind !== 'enemy') throw new Error('test enemy missing');

const boss = findEntityById('floor5-core-guardian');
if (!boss || boss.kind !== 'enemy')
  throw new Error('floor5-core-guardian missing');

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

  it('previews the floor five boss as six hits and twenty-five HP on the required route', () => {
    // Base stats plus the chests the required route must open (ATK +6,
    // DEF +4); at bare base stats the guardian is lethal.
    expect(
      previewCombat(
        { hp: 30, maxHp: 30, attack: 16, defense: 6, gold: 0 },
        boss.stats,
      ),
    ).toEqual({ winnable: true, hitsNeeded: 6, hpLoss: 25 });
    expect(previewCombat(createInitialGameState().player, boss.stats)).toEqual({
      winnable: false,
      reason: 'combat-lethal',
    });
  });

  it('lets the required route fight from floor 1 to the guardian at base stats', () => {
    // The required route takes no optional reward and buys nothing; it
    // only opens the chests it must (the power core, the gallery cache, both
    // foremen's chests and the west warden's). Each 'heal' is a drink at a
    // waystone (or the village well) the route passes or walks back to.
    // Each fight must leave the hero standing.
    const route = [
      'floor1-west-sentry',
      'floor1-sigil-warden',
      'heal',
      'floor2-service-guard',
      'floor2-stack-mite-1',
      'floor2-stack-mite-2',
      'floor2-stack-mite-3',
      'heal',
      'floor1-gallery-sentry',
      'floor1-rear-sentry',
      'floor1-power-core',
      'heal',
      'floor2-east-sentry',
      'heal',
      'floor2-stair-warden',
      'heal',
      'floor3-east-prowler',
      'floor3-spine-crawler-1',
      'floor3-spine-crawler-2',
      'floor3-gallery-cache',
      'heal',
      'floor3-archive-guard',
      'floor3-archive-crawler-1',
      'floor3-archive-crawler-2',
      'heal',
      'floor3-archive-sentry',
      'heal',
      'floor3-heart-sentinel',
      'heal',
      'floor4-west-gate-guard',
      'floor4-west-hand-1',
      'floor4-west-hand-2',
      'heal',
      'floor4-west-foreman',
      'floor4-west-works-cache',
      'heal',
      'floor4-east-gate-guard',
      'floor4-east-hand-1',
      'floor4-east-hand-2',
      'heal',
      'floor4-east-foreman',
      'floor4-east-works-cache',
      'heal',
      'floor4-forge-warden',
      'heal',
      'floor4-stair-warden',
      'heal',
      'floor5-west-warden',
      'floor5-west-warden-cache',
      'heal',
      'floor5-south-gate-guard',
      'heal',
      'floor5-south-warden',
      'heal',
      'floor5-east-warden',
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
    expect(player).toMatchObject({ hp: 5, attack: 16, defense: 6 });
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
        player: { ...state.player, hp: 20, gold: 8 },
        defeatedEnemyIds: ['floor1-gatekeeper'],
      },
      effect: {
        kind: 'enemyDefeated',
        enemyId: 'floor1-gatekeeper',
        hpLost: 10,
        gold: 8,
      },
    });
  });
});
