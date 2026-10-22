import { TILE_SIZE } from './assets';

export type Size = Readonly<{ width: number; height: number }>;
export type Point = Readonly<{ x: number; y: number }>;

// Screen pixels the DOM message log covers along the window's bottom
// edge: the 116px .log panel plus #ui's bottom padding — 28px at 1024px
// and wider, 12px below (styles.css, "Message log" and "#ui"; keep the
// two in step). The camera frames the hero in the band above it, so the
// log never covers them. Side and top panels float over the band's edges.
const WIDE_MIN_WIDTH = 1024;
const WIDE_STRIP = 144;
const NARROW_STRIP = 128;

export function logStrip(cssWidth: number): number {
  return cssWidth >= WIDE_MIN_WIDTH ? WIDE_STRIP : NARROW_STRIP;
}

// Three screen pixels per art pixel: a 32px tile is 96 CSS px wide.
export const FOLLOW_ZOOM = 3;

// The fewest whole tiles the band above the log shows across and down.
// A small window (a phone, a short laptop) zooms out from 3x until they
// fit, so the hero never peers at the maze through a keyhole.
const MIN_COLS = 9;
const MIN_ROWS = 7;

// The camera's zoom: FOLLOW_ZOOM, or less where the band can't hold
// MIN_COLS × MIN_ROWS tiles at it. Every size shares one unit — WorldScene
// works in device pixels, so it passes the device pixel ratio and scales
// logStrip's CSS pixels by it first.
export function followZoom(view: Size, strip: number, pixelRatio = 1): number {
  const band = Math.max(1, view.height - strip);
  return Math.min(
    FOLLOW_ZOOM * pixelRatio,
    view.width / (MIN_COLS * TILE_SIZE),
    band / (MIN_ROWS * TILE_SIZE),
  );
}

// The world point the camera centres on: the hero (`focus`), held in the
// middle of the band above the log however close they stand to the map's
// edge, so neither the log nor a floating panel covers them. Past the edge
// the page's backdrop shows.
export function cameraCentre(strip: number, zoom: number, focus: Point): Point {
  return { x: focus.x, y: focus.y + strip / 2 / zoom };
}

// Where a world point lands on screen with the camera centred on `centre`
// at `zoom`: the other side of the camera math in WorldScene.refresh, kept
// here so tests can project tiles without Phaser.
export function toScreen(
  view: Size,
  centre: Point,
  zoom: number,
  world: Point,
): Point {
  return {
    x: view.width / 2 + (world.x - centre.x) * zoom,
    y: view.height / 2 + (world.y - centre.y) * zoom,
  };
}
