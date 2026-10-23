import type {
  ActionEffect,
  BlockedReason,
  InputCommand,
  SessionTransition,
} from '../game/types';
import type { SfxCue } from './sfx';

const EFFECT_CUES: Record<ActionEffect['kind'], readonly SfxCue[]> = {
  moved: ['move'],
  traveled: ['stair'],
  clue: ['clue'],
  reward: ['pickup'],
  itemReward: ['pickup'],
  healed: ['heal'],
  latchOpened: ['latch'],
  latchGuarded: ['locked'],
  combatPrompt: ['encounter'],
  enemyDefeated: ['hit', 'win'],
  purchasePrompt: ['confirm'],
  purchased: ['buy'],
  soldOut: ['deny'],
  dialogue: ['dialogue'],
  accessLocked: ['locked'],
};

const BLOCKED_CUES: Record<BlockedReason, readonly SfxCue[]> = {
  wall: ['bump'],
  'out-of-bounds': ['bump'],
  'latch-closed-front': ['bump'],
  'interaction-pending': ['bump'],
  'reward-already-taken': ['bump'],
  'combat-unwinnable': ['lose'],
  'combat-lethal': ['lose'],
  'not-enough-gold': ['deny'],
};

// The cues one input plays, in order. A cancelled prompt is the only
// successful input without an effect worth hearing.
export function cuesFor(
  input: InputCommand,
  transition: SessionTransition,
): readonly SfxCue[] {
  if (!transition.ok) return BLOCKED_CUES[transition.reason];
  if (transition.effect) return EFFECT_CUES[transition.effect.kind];
  return input.kind === 'cancel' ? ['cancel'] : [];
}
