import { describe, expect, it } from 'vitest';
import {
  IDLE_MS,
  IMPACT,
  blowMs,
  lunge,
  STEP_MS,
  breath,
  hop,
  idleFrame,
  idleOffset,
  AT_REST,
  lerp,
  startStep,
  stepPosition,
  stepProgress,
  walkFrame,
} from './animation';

describe('character animation timing', () => {
  it('holds each image of an idle loop for an equal share', () => {
    // The sprite plus one idle frame: half the loop each.
    expect(idleFrame(0, 0, 1)).toBe(0);
    expect(idleFrame(IDLE_MS / 2 - 1, 0, 1)).toBe(0);
    expect(idleFrame(IDLE_MS / 2, 0, 1)).toBe(1);
    expect(idleFrame(IDLE_MS, 0, 1)).toBe(0);
    expect(idleFrame((IDLE_MS * 2) / 3, 0, 2)).toBe(2);
  });

  it('breathes toward the feet, never past full size', () => {
    expect(breath(0, 0)).toBe(1);
    expect(breath(IDLE_MS / 2, 0)).toBeCloseTo(0.95);
    for (let t = 0; t < IDLE_MS; t += 50) {
      expect(breath(t, 0)).toBeLessThanOrEqual(1);
    }
  });

  it('spreads neighbours over the idle loop', () => {
    const offsets = [0, 1, 2, 3].map((x) => idleOffset({ x, y: 4 }));
    expect(new Set(offsets).size).toBe(offsets.length);
    for (const offset of offsets) {
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(IDLE_MS);
    }
  });

  it('runs a step from 0 to 1 and lands it flat', () => {
    expect(stepProgress(100, 100)).toBe(0);
    expect(stepProgress(100 + STEP_MS / 2, 100)).toBe(0.5);
    expect(stepProgress(100 + STEP_MS * 3, 100)).toBe(1);
    // A hero who has never stepped is at rest.
    expect(stepProgress(0, -Infinity)).toBe(1);
    expect(hop(0)).toBe(0);
    expect(hop(1)).toBeCloseTo(0);
    expect(hop(0.5)).toBeGreaterThan(0);
  });

  it('slides along the step', () => {
    const from = { x: 0, y: 32 };
    const to = { x: 32, y: 32 };
    expect(lerp(from, to, 0)).toEqual(from);
    expect(lerp(from, to, 0.25)).toEqual({ x: 8, y: 32 });
    expect(lerp(from, to, 1)).toEqual(to);
  });

  it('plays half a walk cycle per step, carrying it on across steps', () => {
    // Four frames: two per step, each for half the step.
    expect([0, 0.49, 0.5, 0.99, 1].map((p) => walkFrame(1, p, 4))).toEqual([
      2, 2, 3, 3, 3,
    ]);
    expect([0, 0.5].map((p) => walkFrame(2, p, 4))).toEqual([0, 1]);
    expect([0, 0.5].map((p) => walkFrame(3, p, 4))).toEqual([2, 3]);
    // Two frames: one per step, alternating feet.
    expect([1, 2, 3].map((n) => walkFrame(n, 0.5, 2))).toEqual([1, 0, 1]);
  });

  it('keeps the hero within a tile of its real one however fast moves come', () => {
    // Ten moves east, 33 ms apart (a held key's repeat rate), each far
    // quicker than STEP_MS.
    const centre = (x: number) => ({ x: (x + 0.5) * 32, y: 16 });
    let step = AT_REST;
    for (let x = 1; x <= 10; x++) {
      const now = x * 33;
      step = startStep(step, centre(x - 1), now);
      const drawn = stepPosition(step, centre(x), now + 32);
      expect(centre(x).x - drawn.x).toBeGreaterThan(0);
      expect(centre(x).x - drawn.x).toBeLessThanOrEqual(32);
      expect(drawn.y).toBe(16);
    }
    expect(step.count).toBe(10);
    expect(stepPosition(step, centre(10), 10 * 33 + STEP_MS)).toEqual(
      centre(10),
    );
  });
});

describe('battle timing', () => {
  it('shortens blows for long fights within bounds', () => {
    expect(blowMs(3)).toBe(360);
    expect(blowMs(10)).toBe(160);
    expect(blowMs(40)).toBe(120);
  });

  it('lunges out to the impact and back home', () => {
    expect(lunge(0)).toBe(0);
    expect(lunge(IMPACT)).toBeCloseTo(0.35);
    expect(lunge(1)).toBe(0);
    expect(lunge(0.7)).toBeGreaterThan(0);
  });
});
