import { describe, expect, it } from 'vitest';
import { MAPS } from '../game/content';
import type { MapId } from '../game/types';
import { TILE_SIZE } from './assets';
import {
  NARROW_WIDTH,
  cameraBounds,
  fitZoom,
  followOffset,
  hudInsets,
  type Size,
} from './viewport';

const desktop = { width: 1440, height: 900 };
const floor1 = { width: 768, height: 512 };
const village = { width: 448, height: 320 };

// Where the hero's cell lands on screen, clamping the camera the way
// Phaser's follow does: centred on the hero less the follow offset, then
// held inside the bounds.
function heroOnScreen(
  view: Size,
  mapId: MapId,
  tile: { x: number; y: number },
) {
  const layout = MAPS[mapId].layout;
  const map = {
    width: layout[0]!.length * TILE_SIZE,
    height: layout.length * TILE_SIZE,
  };
  const zoom = fitZoom(view, map);
  const bounds = cameraBounds(view, map, zoom);
  const offset = followOffset(view, zoom);
  const seen = { width: view.width / zoom, height: view.height / zoom };
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), Math.max(min, max));
  const left = clamp(
    (tile.x + 0.5) * TILE_SIZE - offset.x - seen.width / 2,
    bounds.x,
    bounds.x + bounds.width - seen.width,
  );
  const top = clamp(
    (tile.y + 0.5) * TILE_SIZE - offset.y - seen.height / 2,
    bounds.y,
    bounds.y + bounds.height - seen.height,
  );
  const x = (tile.x * TILE_SIZE - left) * zoom;
  const y = (tile.y * TILE_SIZE - top) * zoom;
  return {
    left: x,
    top: y,
    right: x + TILE_SIZE * zoom,
    bottom: y + TILE_SIZE * zoom,
  };
}

describe('fitZoom', () => {
  it('fits the whole map inside the area the HUD leaves uncovered', () => {
    // The desktop HUD leaves 1440-340-360 = 740 by 900-96-168 = 636 open.
    expect(fitZoom(desktop, floor1)).toBe(740 / 768);
    expect(fitZoom(desktop, village)).toBe(740 / 448);
    // A phone leaves 390 by 844-300-144 = 400 under the stacked HUD.
    expect(fitZoom({ width: 390, height: 844 }, floor1)).toBe(390 / 768);
  });

  it('stops shrinking at half size, leaving the camera to scroll', () => {
    expect(fitZoom({ width: 844, height: 340 }, floor1)).toBe(0.5);
    expect(fitZoom({ width: 0, height: 0 }, floor1)).toBe(0.5);
  });
});

describe('hudInsets', () => {
  it('covers the side columns on wide windows and a top band on narrow ones', () => {
    const wide = hudInsets({ width: NARROW_WIDTH, height: 768 });
    const narrow = hudInsets({ width: NARROW_WIDTH - 1, height: 768 });
    expect(wide.left).toBeGreaterThan(0);
    expect(wide.right).toBeGreaterThan(0);
    expect(narrow).toMatchObject({ left: 0, right: 0 });
    expect(narrow.top).toBeGreaterThan(wide.top);
  });

  it('shrinks the narrow top band on short windows', () => {
    const tall = hudInsets({ width: 600, height: 700 });
    const short = hudInsets({ width: 600, height: 400 });
    const tiny = hudInsets({ width: 600, height: 300 });
    expect(short.top).toBeLessThan(tall.top);
    expect(tiny.top).toBeLessThan(short.top);
    // The capped row yields a full zoomed tile (under 3x at narrow widths).
    expect(400 - short.top - short.bottom).toBe(96);
  });

  it('drops the capped row on short windows wide enough to flank the banner', () => {
    const flanked = hudInsets({ width: 800, height: 459 });
    expect(hudInsets({ width: 640, height: 320 })).toEqual(flanked);
    expect(flanked.top).toBeLessThan(
      hudInsets({ width: 800, height: 460 }).top,
    );
    expect(flanked.top).toBeLessThan(
      hudInsets({ width: 639, height: 459 }).top,
    );
  });
});

describe('cameraBounds', () => {
  it('lets the camera scroll past the map by the HUD insets', () => {
    const insets = hudInsets(desktop);
    expect(cameraBounds(desktop, floor1, 2)).toEqual({
      x: -insets.left / 2,
      y: -insets.top / 2,
      width: 768 + (insets.left + insets.right) / 2,
      height: 512 + (insets.top + insets.bottom) / 2,
    });
  });

  it('centres a map that fits inside the uncovered area', () => {
    const view = { width: 2560, height: 1600 };
    const insets = hudInsets(view);
    const bounds = cameraBounds(view, village, 1);
    expect(bounds).toMatchObject({ width: 2560, height: 1600 });
    expect(bounds.x + bounds.width / 2).toBe(
      224 + (insets.right - insets.left) / 2,
    );
    expect(bounds.y + bounds.height / 2).toBe(
      160 + (insets.bottom - insets.top) / 2,
    );
  });
});

describe('the hero on screen', () => {
  const windows = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 1024, height: 320 },
    { width: 800, height: 700 },
    { width: 800, height: 460 },
    { width: 800, height: 400 },
    { width: 800, height: 320 },
    { width: 844, height: 340 },
    { width: 683, height: 325 },
    { width: 640, height: 300 },
    { width: 600, height: 400 },
  ];

  it.each(windows)(
    'stays clear of the HUD on every floor tile at $width x $height',
    (view) => {
      const insets = hudInsets(view);
      for (const mapId of Object.keys(MAPS) as MapId[]) {
        MAPS[mapId].layout.forEach((row, y) => {
          [...row].forEach((glyph, x) => {
            if (glyph !== '.') return;
            const hero = heroOnScreen(view, mapId, { x, y });
            expect(hero.left).toBeGreaterThanOrEqual(insets.left);
            expect(hero.top).toBeGreaterThanOrEqual(insets.top);
            expect(hero.right).toBeLessThanOrEqual(view.width - insets.right);
            expect(hero.bottom).toBeLessThanOrEqual(
              view.height - insets.bottom,
            );
          });
        });
      }
    },
  );
});
