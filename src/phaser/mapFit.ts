export type Size = Readonly<{ width: number; height: number }>;

// Screen pixels the DOM message log covers along the window's bottom
// edge: the 116px .log panel plus #ui's bottom padding — 28px at 1024px
// and wider, 12px below (styles.css, "Message log" and "#ui"; keep the
// two in step). The log is the one panel that can hide a whole map edge,
// and the tower floors put their required stairs on the bottom-centre
// tiles it lands on, so the camera never frames underneath it. Side and
// top panels may still overlap tiles.
const WIDE_MIN_WIDTH = 1024;
const WIDE_STRIP = 144;
const NARROW_STRIP = 128;

export function logStrip(cssWidth: number): number {
  return cssWidth >= WIDE_MIN_WIDTH ? WIDE_STRIP : NARROW_STRIP;
}

// The largest zoom that fits the map into the window band above the log
// strip, and how far below the map's centre the camera must look to
// centre the map inside that band. Every size shares one unit:
// WorldScene works in device pixels, so it scales logStrip's CSS pixels
// by the device pixel ratio first.
export function fitAboveStrip(
  view: Size,
  map: Size,
  strip: number,
): Readonly<{ zoom: number; centreShift: number }> {
  const band = Math.max(1, view.height - strip);
  const zoom = Math.min(view.width / map.width, band / map.height);
  return { zoom, centreShift: strip / (2 * zoom) };
}

// Where the map's top-left corner lands on screen: centred in the window
// horizontally and inside the band above the strip vertically. The other
// side of the camera math in WorldScene.refresh, kept here so tests can
// project tiles without Phaser.
export function mapOrigin(
  view: Size,
  map: Size,
  strip: number,
): Readonly<{ x: number; y: number; zoom: number }> {
  const { zoom } = fitAboveStrip(view, map, strip);
  return {
    x: (view.width - map.width * zoom) / 2,
    y: (view.height - strip - map.height * zoom) / 2,
    zoom,
  };
}
