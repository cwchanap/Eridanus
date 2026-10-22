# Eridanus Art Style Guide

## Chosen visual treatment

Use compact top-down fantasy sprites with a clear anime influence, simplified cel-shaded/painterly rendering, strong silhouettes, and restrained detail that survives at one tile. The set uses warm tan/wood village materials and cool blue-gray ancient-ruin materials.

Keep future additions visually simple enough to remain readable without hover text.

## Runtime scale

- Logical tile size remains 32 world units (`TILE_SIZE`).
- Every map PNG (terrain, characters, enemies, interactables) is exactly 96×96 (`ART_SIZE`, 3×), so it stays sharp under the 3× camera. `WorldScene` draws each one at `TILE_SIZE`, so every sprite fits exactly one grid cell (HPA-442). Nothing may spill into a neighbouring tile.
- Characters and stand-up props are bottom-center aligned and fill their cell. Do not add per-entity pixel offsets to compensate for poor source cropping.
- Collision and interaction remain tile-based; visual canvas size never changes gameplay footprint.

## Texture filtering

Decision: keep Phaser `pixelArt: true` in `src/phaser/createGame.ts`. Sources are 3× the tile and the camera plays at about 3×, so nearest filtering shows the art close to 1:1 without sub-pixel shimmer as the camera follows the player. No per-texture filtering and no runtime toggle.

## Wall edges

Seamless wall and floor tiles run together, so `WorldScene` outlines every wall side that faces floor (with a pale bevel inside) and shades the floor just below a wall. The outline colour is the terrain's `edge` in `assets.ts`, matched to the wall tile's own mortar (dark brown in the village, near-black in the tower).

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

## Map sprites (96×96, Codex)

All 31 map PNGs were generated with the Codex CLI's built-in image tool, as sheets (hero facings, villagers, enemies, objects) plus one image per terrain tile, then cut apart and run through `bun run sprite <key> <raw.png>` (`scripts/process-sprite.ts`). It keys out the background colour sampled from the corners, crops square to the figure (centred, standing on the bottom edge), area-downscales to 96×96 and makes alpha strictly 0 or 255. Terrain is centre-cropped and stays opaque.

Characters and objects were drawn on a flat #FF00FF background with wide gaps between figures, in this style:

> Crisp 16-bit JRPG pixel art in the SNES era, top-down 3/4 view like classic Dragon Quest / Final Fantasy overworld sprites, chibi proportions (big head, small body), light from the upper left, a dark 1-pixel outline around every figure, rich but limited palette, clean hard pixel edges with no anti-aliasing blur. Fantasy setting: a starry-night world of ancient ruins, a stone village and a ruined tower of dark blue-grey stone with glowing cyan rune magic and gold accents.

Terrain asked for a square texture that fills the image edge to edge, viewed straight down, and is seamlessly tileable on all four edges; walls clearly heavier and darker than their floor.

Fix-ups worth repeating: `player-west` is an exact mirror of `player-east`; `npc-child` is scaled to 72 px and set bottom-centre in its cell so it stands shorter than the adults.

## One cell per sprite

Because every sprite stays inside its own tile, nothing overlaps and draw order between entities does not matter. `assets.test.ts` fails if any catalog file is not exactly 96×96.

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
