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
const NARROW_INSETS: Insets = { top: 300, right: 0, bottom: 144, left: 0 };

export function hudInsets(view: Size): Insets {
  return view.width < NARROW_WIDTH ? NARROW_INSETS : WIDE_INSETS;
}

// The smallest whole-number zoom at which the map spans the window in at
// least one direction. Whole numbers keep every 32x32 tile pixel-crisp.
export function fitZoom(view: Size, map: Size): number {
  const scale = Math.min(view.width / map.width, view.height / map.height);
  return Math.max(1, Math.ceil(scale));
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
