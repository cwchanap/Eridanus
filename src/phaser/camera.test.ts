import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from './assets';
import {
  FOLLOW_ZOOM,
  cameraCentre,
  followZoom,
  hudTop,
  logStrip,
  toScreen,
  type Size,
} from './camera';

const desktop = { width: 1440, height: 900 };
const laptop = { width: 1280, height: 720 };
const phone = { width: 400, height: 844 };
const short = { width: 683, height: 325 };
const VIEWS = [
  desktop,
  laptop,
  phone,
  short,
  { width: 390, height: 844 },
  { width: 400, height: 600 },
  { width: 900, height: 500 },
];
// Map corners, the far corner of the largest map (the village), and the
// tower stairs' bottom-centre arrival tiles.
const TILES = [
  { x: 0, y: 0 },
  { x: 32, y: 20 },
  { x: 8, y: 11 },
  { x: 10, y: 13 },
];

// The screen rect the hero's tile projects to under the camera rule in
// WorldScene.refresh.
function heroRect(view: Size, tile: { x: number; y: number }) {
  const strip = logStrip(view.width);
  const zoom = followZoom(view, strip);
  const centre = cameraCentre(hudTop(view.width, view.height), strip, zoom, {
    x: (tile.x + 0.5) * TILE_SIZE,
    y: (tile.y + 0.5) * TILE_SIZE,
  });
  const topLeft = toScreen(view, centre, zoom, {
    x: tile.x * TILE_SIZE,
    y: tile.y * TILE_SIZE,
  });
  const side = TILE_SIZE * zoom;
  return {
    left: topLeft.x,
    top: topLeft.y,
    right: topLeft.x + side,
    bottom: topLeft.y + side,
  };
}

describe('logStrip', () => {
  it('reserves the log panel plus its grid padding, wide and narrow', () => {
    expect(logStrip(1024)).toBe(144);
    expect(logStrip(1440)).toBe(144);
    expect(logStrip(1023)).toBe(128);
    expect(logStrip(390)).toBe(128);
  });
});

describe('hudTop', () => {
  it('clears the banner on wide windows', () => {
    expect(hudTop(1440, 900)).toBe(81);
    expect(hudTop(1024, 500)).toBe(81);
  });

  it('clears the stacked row below 1024px, shrinking on short windows', () => {
    expect(hudTop(400, 844)).toBe(283);
    expect(hudTop(1023, 600)).toBe(283);
    expect(hudTop(400, 440)).toBe(183);
    expect(hudTop(400, 300)).toBe(83);
  });

  it('clears the single flanking row on short windows 640px and wider', () => {
    expect(hudTop(683, 325)).toBe(84);
    expect(hudTop(639, 325)).toBe(83);
  });
});

describe('followZoom', () => {
  it('plays at 3x on a desktop window', () => {
    expect(followZoom(desktop, logStrip(desktop.width))).toBe(FOLLOW_ZOOM);
  });

  it('scales 3x by the device pixel ratio', () => {
    const device = { width: desktop.width * 2, height: desktop.height * 2 };
    expect(followZoom(device, logStrip(desktop.width) * 2, 2)).toBe(
      FOLLOW_ZOOM * 2,
    );
  });

  it('zooms out on small windows to keep 9x7 tiles in view', () => {
    for (const view of [laptop, phone, short]) {
      const strip = logStrip(view.width);
      const zoom = followZoom(view, strip);
      expect(zoom).toBeLessThan(FOLLOW_ZOOM);
      expect(view.width / (TILE_SIZE * zoom)).toBeGreaterThanOrEqual(9 - 1e-9);
      expect((view.height - strip) / (TILE_SIZE * zoom)).toBeGreaterThanOrEqual(
        7 - 1e-9,
      );
    }
  });

  it('never produces a non-positive zoom on a sliver of a window', () => {
    expect(followZoom({ width: 640, height: 100 }, 128)).toBeGreaterThan(0);
  });
});

describe('cameraCentre', () => {
  it('holds the hero between the top panels and the log', () => {
    for (const view of VIEWS) {
      const strip = logStrip(view.width);
      const top = hudTop(view.width, view.height);
      for (const tile of TILES) {
        const rect = heroRect(view, tile);
        const label = `${tile.x},${tile.y} at ${view.width}x${view.height}`;
        expect((rect.left + rect.right) / 2, label).toBeCloseTo(
          view.width / 2,
          6,
        );
        expect((rect.top + rect.bottom) / 2, label).toBeCloseTo(
          (top + view.height - strip) / 2,
          6,
        );
        expect(rect.top, label).toBeGreaterThanOrEqual(top);
        expect(rect.bottom, label).toBeLessThanOrEqual(view.height - strip);
      }
    }
  });
});
