import { describe, expect, it } from 'vitest';
import { MAPS } from '../game/content';
import { TILE_SIZE } from './assets';
import { fitAboveStrip, logStrip, mapOrigin, type Size } from './mapFit';

const desktop = { width: 1440, height: 900 };
const laptop = { width: 1280, height: 720 };
const phone = { width: 390, height: 844 };

function mapSize(mapId: keyof typeof MAPS): Size {
  const layout = MAPS[mapId].layout;
  return {
    width: layout[0]!.length * TILE_SIZE,
    height: layout.length * TILE_SIZE,
  };
}

// The screen rect a tile projects to under the camera rule in
// WorldScene.refresh: the map centred in the window band above the strip.
function tileRect(
  view: Size,
  mapId: keyof typeof MAPS,
  tile: { x: number; y: number },
) {
  const map = mapSize(mapId);
  const strip = logStrip(view.width);
  const origin = mapOrigin(view, map, strip);
  const side = TILE_SIZE * origin.zoom;
  return {
    left: origin.x + tile.x * side,
    top: origin.y + tile.y * side,
    right: origin.x + (tile.x + 1) * side,
    bottom: origin.y + (tile.y + 1) * side,
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

describe('fitAboveStrip', () => {
  it('keeps every authored map above the strip at desktop sizes', () => {
    for (const view of [desktop, laptop]) {
      for (const mapId of Object.keys(MAPS) as (keyof typeof MAPS)[]) {
        const map = mapSize(mapId);
        const strip = logStrip(view.width);
        const origin = mapOrigin(view, map, strip);
        expect(
          origin.y + map.height * origin.zoom,
          `${mapId} bottom edge at ${view.width}x${view.height}`,
        ).toBeLessThanOrEqual(view.height - strip + 1e-6);
      }
    }
  });

  it('keeps the required stair arrivals clear of the strip', () => {
    for (const view of [desktop, laptop]) {
      for (const [mapId, tile] of [
        ['floor2', { x: 8, y: 11 }],
        ['floor3', { x: 10, y: 13 }],
      ] as const) {
        const rect = tileRect(view, mapId, tile);
        const bandBottom = view.height - logStrip(view.width);
        expect(
          rect.bottom,
          `${mapId} stair ${tile.x},${tile.y} at ${view.width}x${view.height}`,
        ).toBeLessThanOrEqual(bandBottom);
      }
    }
  });

  it('still centres the map horizontally', () => {
    const map = mapSize('floor2');
    const strip = logStrip(desktop.width);
    const origin = mapOrigin(desktop, map, strip);
    const margin = (desktop.width - map.width * origin.zoom) / 2;
    expect(origin.x).toBeCloseTo(margin, 6);
  });

  it('never produces a non-positive zoom on a sliver of a window', () => {
    const map = mapSize('floor3');
    const fit = fitAboveStrip({ width: 640, height: 100 }, map, 128);
    expect(fit.zoom).toBeGreaterThan(0);
    expect(Number.isFinite(fit.centreShift)).toBe(true);
  });

  it('fits narrow screens to the narrower strip', () => {
    const map = mapSize('village');
    const strip = logStrip(phone.width);
    const origin = mapOrigin(phone, map, strip);
    expect(origin.y + map.height * origin.zoom).toBeLessThanOrEqual(
      phone.height - strip + 1e-6,
    );
  });
});
