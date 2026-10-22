# Eridanus Art Style Guide

## Chosen visual treatment

Use compact top-down fantasy sprites with a clear anime influence, simplified cel-shaded/painterly rendering, strong silhouettes, and restrained detail that survives at 32 px. The HPA-22 set uses warm tan/wood village materials and cool blue-gray ancient-ruin materials.

The selected sources were generated with `gpt-image-2` from one shared style reference, then cropped/downsampled into runtime PNGs. Keep future additions visually simple enough to remain readable without hover text.

## Runtime scale

- Logical tile size remains 32×32.
- Terrain textures are exported exactly 32×32.
- Characters, enemies, and interactables use a transparent 32×32 canvas: every sprite fits exactly one grid cell (HPA-442). Nothing may spill into a neighbouring tile.
- Characters and stand-up props are bottom-center aligned. Do not add per-entity pixel offsets to compensate for poor source cropping.
- Collision and interaction remain tile-based; visual canvas size never changes gameplay footprint.

## Texture filtering

Decision: keep Phaser `pixelArt: true` in `src/phaser/createGame.ts`. Every runtime asset is pre-downsampled to its final resolution and renders 1:1 (terrain and sprites at exactly 32 px with no scaling), so normal filtering offers no material sharpness gain, while nearest filtering plus Phaser's pixel-art rounding avoids sub-pixel shimmer as the camera follows the player. No per-texture filtering and no runtime toggle.

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

Generated sprite sheets used transparent/checker-like backgrounds. Runtime sprites are isolated, background-cleared, trimmed, scaled to fit within 60×60, and composited on a transparent 64×64 canvas with the visible base near y=62. HPA-442 then halved every sprite to 32×32 (premultiplied-alpha Lanczos), so the visible art sits within about 30×30 with its base near y=31. Export new sprites at 32×32 the same way.

Terrain sources are cropped from the generated terrain sheet and resized to 32×32. The generated wall cells depicted small room frames, so the runtime wall textures intentionally use masonry-block sub-crops from those same generated cells to remain repeatable under the current non-autotiled renderer.

HPA-442 removed a 1–3 px light crop border that the floor textures carried from their source cells (tiled, it drew a white grid over every map), and darkened both wall textures so walls read as solid mass against the floor. Keep any future terrain free of light edges and clearly darker than its floor.

## One cell per sprite

Because every sprite stays inside its own tile, nothing overlaps and draw order between entities does not matter. `assets.test.ts` fails if any catalog file is not exactly 32×32.

## Recolor variants

Until bespoke art exists, cast variety comes from recolors of the HPA-22 sprites, kept as separate catalog files so real art can replace them one-for-one:

- `enemy-ruin-sentinel` — ruin guard with blue-steel armour and a crimson tabard (Floor 2–3 sentries).
- `enemy-core-guardian` — ruin guard with gold armour, a dark tabard, and an ember outline (Floor 3 boss only).
- `npc-warden` / `npc-scout` / `npc-scribe` / `npc-subject` — the village guide with a navy, maroon, purple, or slate-grey dress. The artisan keeps the original green `npc-village-guide`.
- `npc-smith` / `npc-armorer` / `npc-merchant` / `npc-elder` / `npc-guard` — the village guide with a terracotta, teal, gold, silver, or black dress (the three shopkeepers and two ambient villagers).
- `npc-child` — the village guide with a pink dress, scaled to 24×24 and set at the bottom centre of its 32×32 cell so the child stands a head shorter.
- `stairs-sealed` — `stairs-down` darkened and desaturated with a rust cast, for maze entrances that are not open yet.

Recolors shift only the clothing/armour hue bands; skin, eyes, and the shared hat/apron stay untouched so the set reads as one style.

## Panel portraits

The hero card and the dialogue, shop and fight cards show 64×64 busts from `public/assets/portraits/`, keyed in `PORTRAIT_PATHS` by the sprite they stand in for. They are DOM-only, so the one-cell rule does not apply; a sprite without a bust falls back to itself. Each character keeps its sprite's colour identity.

The set was generated with the Codex CLI's built-in image tool (gpt-image), one run per character, all from this prompt with only the key colour and the character line changing:

> Image: a character portrait for a retro fantasy RPG dialogue panel, in crisp 16-bit SNES-era JRPG pixel-art style. Square 1:1 image. Front-facing head-and-shoulders bust, centered, the head and shoulders fill the frame and the shoulders run off the bottom edge. Chunky, clearly visible square pixels on a coarse grid (as if drawn at 64x64 and scaled up with nearest-neighbour), limited palette of about 16-24 colours, a dark 1-pixel outline around the figure, simple cel shading with light coming from the upper left. No anti-aliasing, no gradients, no dithering noise, no text, no frame, no border, no drop shadow.
> Background: a completely flat, solid, uniform #FF00FF colour filling everything behind the character, with no texture, vignette, or shadow, and that colour must not appear anywhere on the character.
> Character: (one line, e.g. "stern older village warden, short grey beard, teal cloak with gold clasps")

Use a #00FF00 key when the character wears magenta (the child). Ask for glowing eyes and visors to be "big, bright, clearly visible", or they vanish at 64 px.

Post-processing: key the background out to full transparency (including key colour blended into the outline), crop square to the figure, reduce to a 48-colour palette without dithering (reserve a few slots for small glowing accents), then downscale to 64×64 by majority colour per block, letting outlines and glow colours win. Alpha is strictly 0 or 255. `assets.test.ts` fails if a bust is missing or not 64×64.

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
