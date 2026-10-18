# UI Layout Redesign Design

## Status

Design for the post-polish screen layout pass. The complete change stays on one PR.

## Goal

Turn the page around the map from a bare text row into a game screen worth looking at: the map fills the window and the HUD floats on top, without touching rules, content, or saves.

## Observed Defects

- The page is one 640 px column: the canvas, then a single line of plain text (`Tower Floor 1 HP 30/30 ATK 10 DEF 2`) on a flat `#111` background.
- Effect text, blocked reasons, and the combat prompt appear and disappear in that line, so the layout jumps on every interaction.
- The combat prompt shows only `HP loss: n` and two buttons; nothing says what is being fought.
- The journal is a collapsed `<details>` element, so quest progress is hidden unless the player thinks to open it.
- Collected key items are never shown after their pickup message.

## Design

### Full-screen map, floating HUD

The Phaser canvas fills the window and the HUD floats over it, after the design canvas the redesign was reviewed on. `#game` and `#ui` are both absolutely positioned over the whole window; `#ui` is a CSS grid that ignores the pointer, so only its panels take clicks:

- Top left (300 px): the hero card, with the how-to-play card under it on a fresh run.
- Top centre: the location banner (floor + current area).
- Top right (320 px): the journal.
- Bottom centre: the message box, up to 720 px wide and a fixed 116 px tall.

Below 1024 px the side columns would crowd the banner, so the hero card and journal share one row under it, capped at 200 px with their contents scrolling, and the how-to-play card is hidden (the idle message and the fight buttons already show the keys). The message box drops the 720 px cap and spans the full width, and the fight buttons stack into a column. On short windows the shared row's cap shrinks — down to nothing — so the map keeps a whole zoomed tile clear (96 px: the village is the narrowest map and tops out at 3× zoom inside narrow widths), and the panels scroll inside whatever space remains. Below 640 px each column is under about 300 px, so the hero card drops its portrait and tightens its stat chips, the journal's toggle hides its `J` hint, and the HP row, stat chips and journal header wrap rather than clip.

### Camera

`src/phaser/viewport.ts` holds the camera maths as pure functions with unit tests:

- **Zoom.** `fitZoom` picks the smallest whole-number zoom at which the map spans the window in at least one direction (Floor 1 at 2× and the village at 3× on a 1440×900 window). Whole numbers keep every 32×32 tile pixel-crisp; the one-cell sprite rule is unchanged.
- **HUD insets.** `hudInsets` gives the screen pixels the HUD covers along each window edge: whole strips down both sides on wide windows, a top band on narrow ones, plus the banner and message box. The narrow top band follows the shared row's cap, so it shrinks on short windows.
- **Bounds and follow.** `cameraBounds` pads the map by those insets, so the camera may scroll the map out from under any panel, and `followOffset` centres the hero in the uncovered area rather than the window. Together they keep the hero's cell clear of every panel on every floor tile; a unit test walks every floor tile of every map at ten window sizes, down to 400 px and 320 px tall, to check it. Maps smaller than the padded area sit centred in it.
- The canvas is transparent, so the page's night sky shows wherever the map does not reach. The scene re-reads the window size on every resize.

### Panels and styling

- Dark night-sky backdrop (tiled CSS star layers and a faint diagonal "river" of light, after the Eridanus constellation).
- Panels share one treatment: a translucent dark fill with a light backdrop blur, bronze hairline border, gold Cinzel small-caps titles with a diamond marker.
- Cinzel (OFL, self-hosted through `@fontsource/cinzel`, latin 700 only, about 15 kB) for titles, tags, and buttons; body text stays on the system font. The page title is a visually hidden `<h1>`, since the map now owns the whole screen.
- Portrait glows and the section name run warm in the village and cool cyan on the tower floors (`#app:has([data-map-id=…])`).

### Hero card

- One card: portrait, `Hero` nameplate, HP value with a heart, an HP bar coloured by remaining health (over 50 %, over 25 %, otherwise low), ATK and DEF chips with sword and shield icons (inline SVG, `aria-hidden`), then carried items.
- While a combat prompt is open the bar previews the fight: the HP the fight would cost turns red at the end of the bar and `−n` follows the HP value. The HP text itself does not change until the fight resolves.
- Items list `itemIds` by their authored reward label, with an empty state.
- Every `data-stat` element's text stays exactly `HP x/y`, `ATK n`, `DEF n`, which the e2e journeys read back.

### Location banner

The floor name (`data-testid="map-name"`, unchanged contract) plus the name of the section the player stands in. Sections nest (a treasury inside its wing), so the smallest matching bounds win. `findSectionsAt(mapId, tile)` moves into `content.ts` and `discoverCurrentSection` uses it too.

### Message box

A fixed-size box (up to 720 px wide, 116 px tall) floating at the bottom centre, so no message can resize or move it:

- Effects render as a coloured tag plus text (Clue, Power up, Restored, Shortcut, Victory, Item, Sealed). Dialogue uses the speaker's name as the tag and shows their portrait, looked up by name among the current map's NPCs. A victory shows the defeated enemy's portrait greyed out.
- The tag sits on the box's top border as a nameplate. It is absolutely positioned against the panel, outside the inner `.log-body` scroller, so the text gets the whole box height. The longest authored line (the ledger ending, 237 characters) fits in four lines; anything longer scrolls inside `.log-body` (`justify-content: safe center` keeps its top reachable). Message animations use opacity only, since a transform would make the message the nameplate's containing block and clip it.
- Blocked reasons render as a short red line. While a combat prompt is open, the box pins its contents to the top and a refused move renders below the encounter card, so the card and its buttons stay put.
- The combat prompt becomes an encounter card: enemy portrait, its HP/ATK/DEF, `HP loss: n` (unchanged text) and the HP the player would have left, with Fight and Cancel buttons side by side (stacked below 1024 px) that keep their accessible names, key hints, and `aria-keyshortcuts`. Enemies have no authored names, so the card names them by their art (Ruin Guard, Ruin Sentinel, Core Guardian). On the map, the enemy being fought is outlined in red inside its own cell.
- With nothing to show, the box holds a muted controls hint.

Portraits are the existing 32×32 sprites drawn at 2× with `image-rendering: pixelated` inside DOM panels. The map grid and its one-cell sprite rule are unchanged.

### Journal

Open by default: the main quest as a highlighted card, then side leads (resolved ones turn green with a check), then notes, then places found as chips. The header's Hide/Show button, or the `J` key, folds it to its title bar so more map shows. That open/closed flag is view state in the overlay only: it never reaches the game session or the save, and `J` never reaches the scene's input. The overlay keeps the journal's and hero column's scroll positions across re-renders.

## Testing

- `viewport.test.ts`: zoom choice, insets at the breakpoint and on short windows, padded bounds, and the hero's cell clear of the HUD on every floor tile of every map at ten window sizes.
- `StatusPanel.test.ts`: stat text contract, HP bar level thresholds, fight cost preview, item labels and empty state.
- `JournalPanel.test.ts`: lead, note and place markup contract; resolved leads marked; empty groups omitted; folded state.
- E2E: the required-only journey asserts the journal stays visible across re-renders and that `J` folds and reopens it. Both journeys assert the message box (`data-testid="interaction"`) keeps its size and place: across a refused move during the first combat prompt — at a narrow, short window where the Fight and Cancel buttons' bounds are pinned too — and across each ending dialogue (the longest authored lines). A phone-width test (400×844) checks every stat sits inside the hero card and the journal toggle inside the journal, and the required-only journey repeats that check at 400 px while the first combat prompt shows its HP cost. The asset-loading test waits for `domcontentloaded`, since the HUD portraits are `<img>` tags held by the same route and now delay the window `load` event.

## Non-Goals

- Rules, combat numbers, content, or save changes.
- Renderer changes, smooth camera motion, or new sprite art.
- Touch controls, audio, animation beyond a short message fade, or a title screen.
- A UI framework or a component system.
