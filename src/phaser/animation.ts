import type { Point } from './camera';

// Presentation-only timing for the map's characters. WorldScene samples these
// every frame from the scene clock, so redrawing the map on each input never
// restarts a loop.

// One idle loop: a full breath, or one pass through the sprite and its idle
// frames.
export const IDLE_MS = 1800;
// How long the hero takes to slide into the next tile.
export const STEP_MS = 160;
// The fallback breath squashes a sprite toward its feet by this fraction, so
// it never grows out of its cell.
const BREATH = 0.05;
// The fallback step lifts the hero this far (map units) at mid-stride.
const HOP = 2;

// Spreads characters over the idle loop so a room doesn't breathe in step.
export function idleOffset(tile: Point): number {
  return (((tile.x * 7 + tile.y * 13) % 16) / 16) * IDLE_MS;
}

function idlePhase(time: number, offset: number): number {
  return ((time + offset) % IDLE_MS) / IDLE_MS;
}

// Which image of an idle loop shows: 0 is the sprite itself, n its idle-n
// frame. Each is held for an equal share of the loop.
export function idleFrame(
  time: number,
  offset: number,
  frames: number,
): number {
  return Math.floor(idlePhase(time, offset) * (frames + 1));
}

// The vertical scale of a sprite with no idle frames, 1 at rest.
export function breath(time: number, offset: number): number {
  return (
    1 - (BREATH * (1 - Math.cos(idlePhase(time, offset) * 2 * Math.PI))) / 2
  );
}

// How far the hero's current step has gone, from 0 to 1.
export function stepProgress(time: number, start: number): number {
  return Math.min(Math.max((time - start) / STEP_MS, 0), 1);
}

// Which walk frame shows partway through the hero's `count`th step. A cycle
// spans two steps (one per foot), so each step plays half of it and held
// keys carry the cycle on rather than restarting it.
export function walkFrame(
  count: number,
  progress: number,
  frames: number,
): number {
  const perStep = Math.max(1, Math.floor(frames / 2));
  const within = Math.min(Math.floor(progress * perStep), perStep - 1);
  return (count * perStep + within) % frames;
}

// The lift of a hero with no walk frames, so a step reads as a stride
// rather than a slide.
export function hop(progress: number): number {
  return HOP * Math.sin(progress * Math.PI);
}

export function lerp(from: Point, to: Point, progress: number): Point {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}
