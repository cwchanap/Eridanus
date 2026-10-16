# HPA-442 First-Impression Polish Design

## Status

Design for the first post-MVP pass. The complete HPA-442 change stays on one PR.

## Goal

Fix what a brand-new player hits in the first minute of the shipped MVP, without adding gameplay systems:

1. the maze is hard to read;
2. every enemy (the final guardian included) and every NPC shares one sprite, and the guardian is mostly hidden behind neighbouring sprites;
3. Fight / Cancel need the mouse while movement is on the keyboard;
4. nothing on screen says how to play.

## Observed Defects

- `dungeon-floor.png` and `village-floor.png` carry a 1–3 px near-white crop border from the HPA-22 source sheet. Tiled, it draws a bright grid over every map that is louder than the walls themselves.
- Dungeon wall and floor tiles have similar hue and brightness, so wall runs do not read as walls.
- The village (14×10) and Floor 2 (18×13) are smaller than the 640×480 canvas and render pinned to its top-left corner.
- All eight enemies use `enemy-ruin-guard`; all NPCs fall back to `npc-village-guide`.
- `WorldScene` draws entities in authored array order. On Floor 3 the Restoration Core chest (row 1) and the two heart props (row 3) are authored after the guardian (row 2), so they paint over most of it.
- `WorldScene` only maps arrow keys; the combat prompt is click-only.

## Design

### Readable terrain

Fix the art, not the renderer:

- Re-crop both floor textures inside their light border and resample back to 32×32. The tile's own dark rim stays and reads as grout.
- Darken both wall textures (dungeon ×0.4 brightness / ×0.7 saturation, village ×0.6 / ×0.9) so walls read as solid mass against the floor.
- Pad camera bounds evenly when a map is smaller than the viewport so it renders centred. Maps larger than the viewport keep the existing follow camera.

### Distinct cast through the existing asset seam

No new illustrated art is generated in this pass. New catalog entries are recolors of the HPA-22 sprites, bound through `assetId` exactly like existing art, so real art can replace any of them file-for-file later.

| Asset                 | Base       | Treatment                               | Used by                                            |
| --------------------- | ---------- | --------------------------------------- | -------------------------------------------------- |
| `enemy-ruin-guard`    | —          | unchanged                               | Floor 1 sentries and gatekeeper                    |
| `enemy-ruin-sentinel` | ruin guard | blue-steel armour, crimson tabard       | Floor 2 and Floor 3 sentries                       |
| `enemy-core-guardian` | ruin guard | gold armour, dark tabard, ember outline | `floor3-core-guardian`                             |
| `npc-village-guide`   | —          | unchanged (green)                       | Artisan (default NPC art)                          |
| `npc-warden`          | guide      | navy dress                              | Warden                                             |
| `npc-scout`           | guide      | maroon dress                            | Scout                                              |
| `npc-scribe`          | guide      | purple dress                            | Scribe                                             |
| `npc-subject`         | guide      | slate-grey dress                        | Missing Subject and Returned Subject (same person) |

### Draw order

Sprites are up to two tiles tall and bottom-anchored, so depth follows the tile row: terrain at depth −1, each entity at its tile `y`, the player at `y + 0.5`. Whatever stands lower on screen draws in front. This replaces the authored-array-order note in the HPA-22 asset design.

### Keyboard combat

`WorldScene` maps `Enter` → `fight` and `Escape` → `cancel`, forwarded only while a combat prompt is pending. Outside a prompt the keys are ignored: forwarding them would dispatch a no-op through `dispatchInput` that clears the visible effect text. The handler calls `preventDefault`, so a focused prompt button cannot also fire its click.

The prompt buttons show their key (`<kbd aria-hidden="true">`) and declare `aria-keyshortcuts`; their accessible names stay `Fight` / `Cancel`. Mouse clicks keep working.

### How to play

`renderHowToPlay(state)` renders a short controls card (move, bump to interact, Enter/Esc in fights, autosave, "talk to the Warden in blue") while `state.factIds` is empty. Talking to anyone or taking the tower stairs records the first fact and retires the card, so no persisted "seen" flag, save change, or dismiss state is needed.

## Testing

- `assets.test.ts`: every villager resolves to distinct art, the missing and returned subject share art, and the guardian's art differs from every other enemy's. Defeated enemies keep their live art.
- `HowToPlay.test.ts`: shown on a fresh state, empty once a fact exists.
- Required-only journey: the card is visible on a fresh run and gone after the warden talk. Mouse buttons stay covered here.
- Explorer journey: `Escape` cancels, `Enter` fights, and a stray `Enter` afterwards leaves the defeat result on screen.
- Existing asset-catalog checks cover the new PNGs' dimensions and serving.

## Non-Goals

- Gameplay, combat numbers, recovery rules, or save schema changes.
- Touch controls, audio, animation, or new generated illustrated art.
- Autotiling, a renderer rewrite, or per-entity pixel offsets.
- A title screen, settings, or a dismissible tutorial state.
