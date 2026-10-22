import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from './assets';
import {
  FOLLOW_ZOOM,
  cameraCentre,
  followZoom,
  logStrip,
  toScreen,
  type Size,
} from './camera';

const desktop = { width: 1440, height: 900 };
const laptop = { width: 1280, height: 720 };
const phone = { width: 400, height: 844 };
const short = { width: 683, height: 325 };
const VIEWS = [desktop, laptop, phone, short, { width: 390, height: 844 }];
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
  const centre = cameraCentre(strip, zoom, {
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
  it('holds the hero mid-band wherever they stand', () => {
    for (const view of VIEWS) {
      const strip = logStrip(view.width);
      for (const tile of TILES) {
        const rect = heroRect(view, tile);
        const label = `${tile.x},${tile.y} at ${view.width}x${view.height}`;
        expect((rect.left + rect.right) / 2, label).toBeCloseTo(
          view.width / 2,
          6,
        );
        expect((rect.top + rect.bottom) / 2, label).toBeCloseTo(
          (view.height - strip) / 2,
          6,
        );
        expect(rect.bottom, label).toBeLessThanOrEqual(view.height - strip);
      }
    }
  });
});
