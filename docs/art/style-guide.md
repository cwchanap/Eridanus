# Eridanus Art Style Guide

## Chosen visual treatment

Use compact top-down fantasy sprites with a clear anime influence, simplified cel-shaded/painterly rendering, strong silhouettes, and restrained detail that survives at 32–64 px. The HPA-22 set uses warm tan/wood village materials and cool blue-gray ancient-ruin materials.

The selected sources were generated with `gpt-image-2` from one shared style reference, then cropped/downsampled into runtime PNGs. Keep future additions visually simple enough to remain readable without hover text.

## Runtime scale

- Logical tile size remains 32×32.
- Terrain textures are exported exactly 32×32.
- Characters, enemies, and interactables use a transparent 64×64 canvas and remain within 64×64.
- Characters and stand-up props are bottom-center aligned. Do not add per-entity pixel offsets to compensate for poor source cropping.
- Collision and interaction remain tile-based; visual canvas size never changes gameplay footprint.

## Texture filtering

The artwork is pre-downsampled and retains anti-aliased painterly/cel-shaded edges. During runtime integration, compare the existing Phaser `pixelArt: true` setting against normal filtering. Normal filtering is the initial recommendation for this treatment, but the real integration proof decides the final setting; do not add per-texture filtering or a runtime toggle.

## Shared prompt language

Base direction:

> Top-down fantasy game asset for a compact grid-maze browser game, clear anime influence, strong readable silhouette, restrained detail that survives downscaling, clean lighting, transparent background for characters/interactables, no text, no UI border, no external shadow, consistent game-art treatment.

Keep object identity, camera angle, line weight, and lighting consistent across open/closed pairs and directional variants.

## Village guidance

- Warm inhabited stone and wood.
- Tan/gold stone, muted green growth, amber/brown accents.
- Friendly NPC clothing should read clearly against village floor colors.
- Village walls use a repeatable masonry block crop rather than a whole-room border illustration.

## Dungeon guidance

- Cool ancient ruin language using blue-gray/slate stone.
- Cyan magical accents are reserved for interactables such as waystones or clue runes.
- Dungeon walls use repeatable masonry blocks rather than room-frame artwork.
- Enemy silhouettes should read darker and more armored than friendly characters.

## Characters and enemies

- Same top-down three-quarter perspective across the set.
- Feet/base aligned to bottom center.
- Four player stills only: north, south, east, west.
- No walk/attack frames until a later gameplay ticket consumes animation.
- Name directional files from the rendered facing, not requested sheet position; HPA-22 corrected north/south after visual inspection.

## Interactables

- Stairs up/down differ primarily by geometry/lightness, not labels.
- Recovery waystone and clue runes share cyan accents but distinct silhouettes.
- Shortcut gate closed/open is the same object with a physical open state.
- Relic chest closed/open is the same object with a physical open state.

## Transparency and crop

Generated sprite sheets used transparent/checker-like backgrounds. Runtime sprites are isolated, background-cleared, trimmed, scaled to fit within 60×60, and composited on a transparent 64×64 canvas with the visible base near y=62.

Terrain sources are cropped from the generated terrain sheet and resized to 32×32. The generated wall cells depicted small room frames, so the runtime wall textures intentionally use masonry-block sub-crops from those same generated cells to remain repeatable under the current non-autotiled renderer.

## Rejected / corrected generation artifacts

- Do not use whole-room wall-frame cells as one wall tile; repeating them creates tiny-room patterns. Use repeatable masonry crops.
- Do not trust requested sprite-sheet compass order blindly. Verify actual facing before naming directional files.
- Do not pre-generate spare enemies, ordinary chests, portraits, or floor-specific art. Add them in the first content PR that consumes them.

## Selected asset prompt variants

All selected assets use `gpt-image-2` with the shared reference/style language above.

- `terrain-village-floor` — warm inhabited village floor; repeatable stone/earth treatment.
- `terrain-village-wall` — masonry block crop from the warm village wall generation.
- `terrain-dungeon-floor` — cool ancient ruin floor; blue-gray stone.
- `terrain-dungeon-wall` — masonry block crop from the cool dungeon wall generation.
- `player-north` — same adventurer, north/back-facing still.
- `player-south` — same adventurer, south/front-facing still.
- `player-east` — same adventurer, east/right-facing still.
- `player-west` — same adventurer, west/left-facing still.
- `npc-village-guide` — friendly warm-clothed village guide.
- `enemy-ruin-guard` — dark armored ruin guard with shield/spear silhouette.
- `stairs-up` — bright ascending stone stairs.
- `stairs-down` — dark descending shaft/stairs.
- `recovery-waystone` — standing cyan-rune waystone.
- `clue-runes` — flat circular cyan-rune landmark.
- `shortcut-gate-closed` — chained wooden/stone gate.
- `shortcut-gate-open` — matching gate physically opened.
- `chest-relic-closed` — brass-banded relic chest closed.
- `chest-relic-open` — matching relic chest physically open.
