import { describe, expect, it } from 'vitest';
import { findEntityById } from './content';
import { interactWithEntity } from './actions';
import { createInitialGameState } from './state';
import type { NpcEntity } from './types';

const reward = findEntityById('floor1-power-core');
const recovery = findEntityById('village-recovery');
const latch = findEntityById('floor1-rear-latch');
const enemy = findEntityById('floor1-gatekeeper');
if (!reward || reward.kind !== 'reward') throw new Error('reward missing');
if (!recovery || recovery.kind !== 'recovery')
  throw new Error('recovery missing');
if (!latch || latch.kind !== 'latch') throw new Error('latch missing');
if (!enemy || enemy.kind !== 'enemy') throw new Error('enemy missing');

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

  it('bumping an npc records the intro fact and returns the current line', () => {
    const artisan: NpcEntity = {
      kind: 'npc',
      id: 'village-artisan',
      tile: { x: 5, y: 2 },
      name: 'Artisan',
      introFactId: 'optional-heirloom-lead',
    };
    const state = {
      ...createInitialGameState(),
      factIds: ['floor1-treasury-sealed'],
    };
    const result = interactWithEntity(state, artisan, state.tile);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.factIds).toEqual([
      'floor1-treasury-sealed',
      'optional-heirloom-lead',
    ]);
    expect(result.effect).toEqual({
      kind: 'dialogue',
      speaker: 'Artisan',
      lineId: 'artisan-find-other-entrance',
    });
  });

  it('bumping an opened latch changes nothing', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 6, y: 5 },
      openedShortcutIds: ['floor1-rear-latch'],
    };
    expect(interactWithEntity(state, latch, state.tile)).toEqual({
      ok: true,
      state,
      effect: { kind: 'latchOpened', id: 'floor1-rear-latch' },
    });
  });

  it('bumping a defeated enemy changes nothing', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 10, y: 5 },
      defeatedEnemyIds: ['floor1-gatekeeper'],
    };
    expect(interactWithEntity(state, enemy, state.tile)).toEqual({
      ok: true,
      state,
      effect: {
        kind: 'enemyDefeated',
        enemyId: 'floor1-gatekeeper',
        hpLost: 0,
      },
    });
  });
});
