import { describe, expect, it } from 'vitest';
import { findEntityById } from './content';
import { interactWithEntity } from './actions';
import { createInitialGameState } from './state';

const reward = findEntityById('floor1-power-core');
const recovery = findEntityById('village-recovery');
if (!reward || reward.kind !== 'reward') throw new Error('reward missing');
if (!recovery || recovery.kind !== 'recovery')
  throw new Error('recovery missing');

describe('actions', () => {
  it('applies reward once', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 9, y: 4 },
    };
    const first = interactWithEntity(state, reward, state.tile);
    expect(first.ok && first.state.player.attack).toBe(12);
    if (!first.ok) return;
    expect(interactWithEntity(first.state, reward, first.state.tile)).toEqual({
      ok: false,
      reason: 'reward-already-taken',
    });
  });

  it('heals without resetting dungeon progress', () => {
    const state = {
      ...createInitialGameState(),
      player: { hp: 8, maxHp: 30, attack: 12, defense: 2 },
      openedRewardIds: ['floor1-power-core'],
      defeatedEnemyIds: ['floor1-gatekeeper'],
      openedShortcutIds: ['floor1-rear-latch'],
    };
    const result = interactWithEntity(state, recovery, { x: 3, y: 2 });
    expect(result.ok && result.state).toMatchObject({
      player: { hp: 30, maxHp: 30, attack: 12, defense: 2 },
      openedRewardIds: ['floor1-power-core'],
      defeatedEnemyIds: ['floor1-gatekeeper'],
      openedShortcutIds: ['floor1-rear-latch'],
    });
  });
});
