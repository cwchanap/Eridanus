import { describe, expect, it } from 'vitest';
import { findEntityById, getActiveEntityAt, isEntityBlocking } from './content';
import { interactWithEntity } from './actions';
import { attemptMove } from './movement';
import { createInitialGameState } from './state';
import type { NpcEntity } from './types';

const reward = findEntityById('floor1-power-core');
const sigil = findEntityById('floor1-depth-sigil');
const recovery = findEntityById('village-recovery');
const latch = findEntityById('floor1-rear-latch');
const enemy = findEntityById('floor1-gatekeeper');
const overlook = findEntityById('floor1-treasury-overlook');
if (!reward || reward.kind !== 'reward') throw new Error('reward missing');
if (!sigil || sigil.kind !== 'reward' || sigil.grant !== 'item')
  throw new Error('sigil missing');
if (!recovery || recovery.kind !== 'recovery')
  throw new Error('recovery missing');
if (!latch || latch.kind !== 'latch') throw new Error('latch missing');
if (!enemy || enemy.kind !== 'enemy') throw new Error('enemy missing');
if (!overlook || overlook.kind !== 'clue') throw new Error('clue missing');
const missingSubject = findEntityById('floor2-missing-subject');
const returnedSubject = findEntityById('village-returned-subject');
if (!missingSubject || missingSubject.kind !== 'npc')
  throw new Error('floor2-missing-subject missing');
if (!returnedSubject || returnedSubject.kind !== 'npc')
  throw new Error('village-returned-subject missing');

describe('actions', () => {
  it('applies reward once', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 12, y: 8 },
    };
    const first = interactWithEntity(state, reward, state.tile);
    expect(first.ok && first.state.player.attack).toBe(12);
    if (!first.ok) return;
    expect(interactWithEntity(first.state, reward, first.state.tile)).toEqual({
      ok: false,
      reason: 'reward-already-taken',
    });
  });

  it('grants an item reward once and keeps the player in place', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 12, y: 8 },
    };
    const first = interactWithEntity(state, sigil, state.tile);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.itemIds).toEqual(['tower-depth-sigil']);
    expect(first.state.openedRewardIds).toEqual(['floor1-depth-sigil']);
    expect(first.state.tile).toEqual(state.tile);
    expect(first.effect).toEqual({
      kind: 'itemReward',
      itemId: 'tower-depth-sigil',
      label: sigil.label,
    });
    expect(interactWithEntity(first.state, sigil, first.state.tile)).toEqual({
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

  it('inspecting the treasury overlook records the sealed fact', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 10, y: 4 },
    };
    const result = interactWithEntity(state, overlook, state.tile);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toEqual({ kind: 'clue', text: overlook.text });
    expect(result.state.factIds).toContain('floor1-treasury-sealed');
  });

  it('bumping an opened latch changes nothing', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 12, y: 8 },
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
      tile: { x: 14, y: 10 },
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

  it('blocks on the missing subject before the return, and the bump records it with the returning line', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor2' as const,
      tile: { x: 11, y: 3 },
    };
    expect(getActiveEntityAt(state, missingSubject.tile)).toEqual(
      missingSubject,
    );
    expect(isEntityBlocking(missingSubject, state)).toBe(true);

    const bump = attemptMove(state, 'north');
    expect(bump.ok).toBe(true);
    if (!bump.ok) return;
    expect(bump.state.factIds).toEqual(['main-subject-returned']);
    expect(bump.state.tile).toEqual(state.tile);
    expect(bump.effect).toEqual({
      kind: 'dialogue',
      speaker: missingSubject.name,
      lineId: 'subject-returning',
    });
  });

  it('lets the player onto the vacated subject tile after the return', () => {
    const returned = {
      ...createInitialGameState(),
      mapId: 'floor2' as const,
      tile: { x: 11, y: 3 },
      factIds: ['main-subject-returned'],
    };
    expect(getActiveEntityAt(returned, missingSubject.tile)).toBeUndefined();

    const step = attemptMove(returned, 'north');
    expect(step.ok).toBe(true);
    if (!step.ok) return;
    expect(step.state.tile).toEqual({ x: 11, y: 2 });
    expect(step.effect).toEqual({ kind: 'moved' });
  });

  it('activates the village subject only after the return and repeats the shared fact idempotently', () => {
    const before = { ...createInitialGameState(), tile: { x: 5, y: 7 } };
    expect(getActiveEntityAt(before, returnedSubject.tile)).toBeUndefined();
    const passesThrough = attemptMove(before, 'south');
    expect(passesThrough.ok && passesThrough.state.tile).toEqual({
      x: 5,
      y: 8,
    });

    const after = { ...before, factIds: ['main-subject-returned'] };
    expect(getActiveEntityAt(after, returnedSubject.tile)).toEqual(
      returnedSubject,
    );
    expect(isEntityBlocking(returnedSubject, after)).toBe(true);

    const bump = attemptMove(after, 'south');
    expect(bump.ok).toBe(true);
    if (!bump.ok) return;
    expect(bump.state.tile).toEqual(after.tile);
    expect(bump.effect).toEqual({
      kind: 'dialogue',
      speaker: returnedSubject.name,
      lineId: 'subject-village',
    });
    expect(
      bump.state.factIds.filter((id) => id === 'main-subject-returned'),
    ).toHaveLength(1);
  });
});
