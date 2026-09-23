import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { findEntityById } from './content';
import { previewCombat, resolveCombat } from './combat';

const enemy = findEntityById('floor1-gatekeeper');
if (!enemy || enemy.kind !== 'enemy') throw new Error('test enemy missing');

const boss = findEntityById('floor3-core-guardian');
if (!boss || boss.kind !== 'enemy')
  throw new Error('floor3-core-guardian missing');
// Existence of the pre-boss full heal; content.test.ts proves its cardinal
// adjacency to the sole boss approach.
const waystone = findEntityById('floor3-heart-waystone');
if (!waystone || waystone.kind !== 'recovery')
  throw new Error('floor3-heart-waystone missing');

describe('combat', () => {
  it('previews baseline and upgraded HP loss', () => {
    expect(
      previewCombat({ hp: 30, maxHp: 30, attack: 10, defense: 2 }, enemy.stats),
    ).toEqual({ winnable: true, hitsNeeded: 4, hpLoss: 15 });
    expect(
      previewCombat({ hp: 30, maxHp: 30, attack: 12, defense: 2 }, enemy.stats),
    ).toEqual({ winnable: true, hitsNeeded: 3, hpLoss: 10 });
  });

  it('rejects zero player damage before division', () => {
    expect(
      previewCombat({ hp: 30, maxHp: 30, attack: 4, defense: 2 }, enemy.stats),
    ).toEqual({ winnable: false, reason: 'combat-unwinnable' });
  });

  it('treats ending at zero HP as lethal', () => {
    expect(
      previewCombat({ hp: 15, maxHp: 30, attack: 10, defense: 2 }, enemy.stats),
    ).toEqual({ winnable: false, reason: 'combat-lethal' });
  });

  it('previews the floor three boss as six hits and twenty-five HP at baseline', () => {
    expect(previewCombat(createInitialGameState().player, boss.stats)).toEqual({
      winnable: true,
      hitsNeeded: 6,
      hpLoss: 25,
    });
  });

  it('resolution commits exactly the previewed loss', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      player: { hp: 30, maxHp: 30, attack: 12, defense: 2 },
    };
    const result = resolveCombat(state, enemy);
    expect(result).toEqual({
      ok: true,
      state: {
        ...state,
        player: { ...state.player, hp: 20 },
        defeatedEnemyIds: ['floor1-gatekeeper'],
      },
      effect: {
        kind: 'enemyDefeated',
        enemyId: 'floor1-gatekeeper',
        hpLost: 10,
      },
    });
  });
});
