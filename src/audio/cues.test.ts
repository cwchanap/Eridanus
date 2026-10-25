import { describe, expect, it } from 'vitest';
import { dispatchInput } from '../game/session';
import { createInitialGameState } from '../game/state';
import type { SessionState } from '../game/types';
import { cuesFor } from './cues';

const game = createInitialGameState();
const combat: SessionState = {
  game: {
    ...game,
    mapId: 'floor1',
    tile: { x: 12, y: 5 },
    player: { hp: 30, attack: 12, defense: 2, gold: 0 },
  },
  pending: {
    kind: 'combat',
    enemyId: 'floor1-gatekeeper',
    preview: { winnable: true, hitsNeeded: 3, hpLoss: 10 },
  },
};

describe('cuesFor', () => {
  it('bumps a move refused while a prompt is open', () => {
    const input = { kind: 'move', direction: 'north' } as const;
    expect(cuesFor(input, dispatchInput(combat, input))).toEqual(['bump']);
  });

  it('plays the win for a won fight', () => {
    const input = { kind: 'confirm' } as const;
    expect(cuesFor(input, dispatchInput(combat, input))).toEqual(['win']);
  });

  it('plays cancel only for a cancelled prompt', () => {
    const cancel = { kind: 'cancel' } as const;
    expect(cuesFor(cancel, dispatchInput(combat, cancel))).toEqual(['cancel']);
    const idle = { game, pending: null };
    const confirm = { kind: 'confirm' } as const;
    expect(cuesFor(confirm, dispatchInput(idle, confirm))).toEqual([]);
  });

  it('maps effects and refusals to their cues', () => {
    const move = { kind: 'move', direction: 'east' } as const;
    expect(
      cuesFor(move, { ok: true, session: combat, effect: { kind: 'moved' } }),
    ).toEqual(['move']);
    expect(
      cuesFor(move, { ok: false, session: combat, reason: 'combat-lethal' }),
    ).toEqual(['lose']);
    // An HP reward (a waystone or an HP chest) sounds like a drink.
    expect(
      cuesFor(move, {
        ok: true,
        session: combat,
        effect: { kind: 'reward', stat: 'hp', amount: 20 },
      }),
    ).toEqual(['heal']);
    expect(
      cuesFor(move, {
        ok: true,
        session: combat,
        effect: { kind: 'reward', stat: 'attack', amount: 2 },
      }),
    ).toEqual(['pickup']);
    expect(
      cuesFor(move, { ok: false, session: combat, reason: 'not-enough-gold' }),
    ).toEqual(['deny']);
    expect(
      cuesFor(move, {
        ok: true,
        session: combat,
        effect: { kind: 'leverPulled', id: 'l', thrown: true, linked: 0 },
      }),
    ).toEqual(['latch']);
    expect(
      cuesFor(move, {
        ok: true,
        session: combat,
        effect: { kind: 'latchWired', id: 'h', thrown: 1, total: 3 },
      }),
    ).toEqual(['locked']);
  });
});
