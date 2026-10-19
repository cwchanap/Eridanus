export type Size = Readonly<{ width: number; height: number }>;
export type Bounds = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;
export type Insets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

// Windows narrower than this use the stacked HUD (styles.css, "Narrower
// screens"): banner, then the hero card and journal side by side in a
// capped row, then the message box. Keep the two in step.
export const NARROW_WIDTH = 1024;

// Screen pixels the DOM HUD covers along each window edge, plus a little
// breathing room. Wide windows run the hero column and the journal down the
// sides, so those insets are whole strips whatever the panels' heights.
const WIDE_INSETS: Insets = { top: 96, right: 360, bottom: 168, left: 340 };

// Narrow mode stacks the hero card and journal in one capped row under the
// banner: the top inset is the banner plus the row's cap, and the bottom
// inset is the message box. On short windows the row's cap shrinks — down
// to nothing — so the uncovered strip keeps one zoomed tile clear. The
// village is the narrowest map (14 tiles), so inside narrow widths a
// zoomed tile stays under 1024 / 14 ≈ 73px and 96px covers every map. The DOM row is on the same clamp under
// "Narrower screens" in styles.css: keep the two in step.
const NARROW_TOP_BASE = 100;
const NARROW_BOTTOM = 144;
const NARROW_PANEL_CAP = 200;
const NARROW_CLEAR = 96;

// Short windows (a landscape phone, a small laptop at 200% zoom) leave that
// row too little height to show the stats. Where they are at least this
// wide, the hero card and journal flank the banner in its row instead
// ("Short windows" in styles.css), so the top inset is the banner row alone.
const SHORT_HEIGHT = 460;
const FLANK_MIN_WIDTH = 640;

export function hudInsets(view: Size): Insets {
  if (view.width >= NARROW_WIDTH) return WIDE_INSETS;
  const flanked = view.width >= FLANK_MIN_WIDTH && view.height < SHORT_HEIGHT;
  const cap = flanked
    ? 0
    : Math.min(
        NARROW_PANEL_CAP,
        Math.max(
          0,
          view.height - (NARROW_TOP_BASE + NARROW_BOTTOM + NARROW_CLEAR),
        ),
      );
  return {
    top: NARROW_TOP_BASE + cap,
    right: 0,
    bottom: NARROW_BOTTOM,
    left: 0,
  };
}

// Below this a 32x32 tile is too small to read, so the map stops shrinking
// and the camera scrolls it under the HUD instead.
const MIN_ZOOM = 0.5;

// The zoom at which the whole map fits the area the HUD leaves uncovered.
// It is fractional; the canvas renders at device pixels (createGame.ts),
// so nearest-neighbour scaling still keeps tiles sharp.
export function fitZoom(view: Size, map: Size): number {
  const insets = hudInsets(view);
  const scale = Math.min(
    (view.width - insets.left - insets.right) / map.width,
    (view.height - insets.top - insets.bottom) / map.height,
  );
  return Math.max(MIN_ZOOM, scale);
}

// How far the camera's centre sits from the hero in world pixels, so the
// hero lands in the middle of the area the HUD leaves uncovered rather than
// the middle of the window.
export function followOffset(
  view: Size,
  zoom: number,
): Readonly<{ x: number; y: number }> {
  const insets = hudInsets(view);
  return {
    x: (insets.left - insets.right) / 2 / zoom,
    y: (insets.top - insets.bottom) / 2 / zoom,
  };
}

// World-space camera bounds: the map padded by the HUD insets, so the camera
// can scroll the map out from under the HUD and the hero, which it follows,
// never ends up beneath a panel. Where even that is smaller than the view,
// the padding grows evenly and the map sits centred in the uncovered area.
export function cameraBounds(view: Size, map: Size, zoom: number): Bounds {
  const insets = hudInsets(view);
  const left = insets.left / zoom;
  const top = insets.top / zoom;
  const width = map.width + left + insets.right / zoom;
  const height = map.height + top + insets.bottom / zoom;
  // Negative where the padded map falls short of the view: half the shortfall.
  const offsetX = Math.min(0, (width - view.width / zoom) / 2);
  const offsetY = Math.min(0, (height - view.height / zoom) / 2);
  return {
    x: offsetX - left,
    y: offsetY - top,
    width: width - 2 * offsetX,
    height: height - 2 * offsetY,
  };
}
