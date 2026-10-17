# UI Layout Redesign Design

## Status

Design for the post-polish screen layout pass. The complete change stays on one PR.

## Goal

Turn the page around the map from a bare text row into a game screen worth looking at, without touching rules, content, saves, or how the map itself is drawn.

## Observed Defects

- The page is one 640 px column: the canvas, then a single line of plain text (`Tower Floor 1 HP 30/30 ATK 10 DEF 2`) on a flat `#111` background.
- Effect text, blocked reasons, and the combat prompt appear and disappear in that line, so the layout jumps on every interaction.
- The combat prompt shows only `HP loss: n` and two buttons; nothing says what is being fought.
- The journal is a collapsed `<details>` element, so quest progress is hidden unless the player thinks to open it.
- Collected key items are never shown after their pickup message.

## Design

### Three-column game frame

At desktop widths the page is a centred CSS grid:

| Left (240 px)                                | Centre (656 px)                          | Right (290 px) |
| -------------------------------------------- | ---------------------------------------- | -------------- |
| Wordmark                                     | Location banner (floor + current area)   | Journal        |
| Hero: portrait, HP bar, ATK/DEF tiles        | Framed 640×480 stage (the Phaser canvas) |                |
| Items, how-to-play (fresh run), places found | Message box                              |                |

`#ui` uses `display: contents`, so the overlay's panels are grid items beside `#game` while the overlay still renders into one root. The sidebar and journal use `contain: size` so the stage rows size the columns and long lists scroll inside their panels instead of stretching the page. The three-column screen has a fixed height and is centred vertically. Below 1260 px the side panels stack in a right column with the journal under the message box, and the page top-aligns so a growing journal never moves the stage; below 990 px everything is one column and the canvas scales down to fit.

### Panels and styling

- Dark night-sky backdrop (tiled CSS star layers and a faint diagonal "river" of light, after the Eridanus constellation).
- Panels share one treatment: bronze hairline border, gold Cinzel small-caps titles with a diamond marker.
- Cinzel (OFL, self-hosted through `@fontsource/cinzel`, latin 700 only, about 15 kB) for the wordmark, titles, tags, and buttons; body text stays on the system font.
- The stage frame glows warm in the village and cool cyan on the tower floors (`#app:has([data-map-id=…])`). The canvas is transparent so a CSS vignette fills the margin around maps smaller than the view.

### Hero and items

- HP shows as a value plus a bar coloured by remaining health (over 50 %, over 25 %, otherwise low).
- ATK and DEF are tiles with sword and shield icons (inline SVG, `aria-hidden`).
- The Items panel lists `itemIds` by their authored reward label, with an empty state.
- Every `data-stat` element's text stays exactly `HP x/y`, `ATK n`, `DEF n`, which the e2e journeys read back.

### Location banner

The floor name (`data-testid="map-name"`, unchanged contract) plus the name of the section the player stands in. Sections nest (a treasury inside its wing), so the smallest matching bounds win. `findSectionsAt(mapId, tile)` moves into `content.ts` and `discoverCurrentSection` uses it too.

### Message box

A fixed-height box (116 px) under the stage, so no message can resize the stage row or move the map:

- Effects render as a coloured tag plus text (Clue, Power up, Restored, Shortcut, Victory, Item, Sealed). Dialogue uses the speaker's name as the tag and shows their portrait, looked up by name among the current map's NPCs. A victory shows the defeated enemy's portrait greyed out.
- The tag sits on the box's top border as a nameplate. It is absolutely positioned against the panel, outside the inner `.log-body` scroller, so the text gets the whole box height. The longest authored line (the ledger ending, 237 characters) fits in four lines; anything longer scrolls inside `.log-body` (`justify-content: safe center` keeps its top reachable). Message animations use opacity only, since a transform would make the message the nameplate's containing block and clip it.
- Blocked reasons render as a short red line. While a combat prompt is open, a refused move renders inside the encounter card, so the card and its buttons stay put.
- The combat prompt becomes an encounter card: enemy portrait, its HP/ATK/DEF, `HP loss: n` (unchanged text) and the HP the player would have left, with Fight and Cancel buttons that keep their accessible names, key hints, and `aria-keyshortcuts`. Enemies have no authored names, so the card names them by their art (Ruin Guard, Ruin Sentinel, Core Guardian).
- With nothing to show, the box holds a muted controls hint.

Portraits are the existing 32×32 sprites drawn at 2× with `image-rendering: pixelated` inside DOM panels. The map grid and its one-cell sprite rule are unchanged.

### Journal

Always open: the main quest as a highlighted card, then side leads (resolved ones turn green with a check), then notes. Places found move to the left sidebar. The overlay keeps the journal's and places list's scroll positions across re-renders.

## Testing

- `StatusPanel.test.ts`: stat text contract, HP bar level thresholds, item labels and empty state.
- `JournalPanel.test.ts`: lead, note and section markup contract; resolved leads marked; empty groups omitted.
- E2E: the required-only journey asserts the journal stays visible across re-renders instead of toggling `<details>`. Both journeys assert the stage (`data-testid="stage"`) does not move: across a refused move during the first combat prompt, and across each ending dialogue (the longest authored lines). The asset-loading test waits for `domcontentloaded`, since the HUD portraits are `<img>` tags held by the same route and now delay the window `load` event.

## Non-Goals

- Rules, combat numbers, content, or save changes.
- Canvas zoom, renderer changes, or new sprite art.
- Touch controls, audio, animation beyond a short message fade, or a title screen.
- A UI framework or a component system.
