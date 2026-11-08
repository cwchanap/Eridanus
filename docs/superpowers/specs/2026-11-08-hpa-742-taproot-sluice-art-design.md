# HPA-742 — Taproot Boss and Sluice Pad Art Design

> **Status:** Proposed design. This is a docs-only planning checkpoint, not the art implementation.
>
> **Linear:** https://linear.app/cwchanap/issue/HPA-742/tower-maze-art-for-the-taproot-boss-and-the-sluice-pad
>
> **Delivery:** One HPA-742 draft PR, updated with the finished assets and minimal catalog changes after design review. HPA-741 shipped Floors 6–10 in PR #39; this is its separate, art-focused follow-up.

## Goal

Replace the three borrowed images used by the Floor 10 Taproot boss and the Floor 6 sluice pads. Both should be recognizable at a glance at the actual one-tile game scale, without changing any rules, maps, or UI components.

### Deliverables

- **public/assets/enemies/taproot.png:** 96×96 transparent PNG; Floor 10 boss map sprite, visibly more dangerous than ordinary enemies.
- **public/assets/portraits/enemy-taproot.png:** 64×64 transparent PNG; head-and-shoulders bust for the existing fight card.
- **public/assets/interactables/sluice-pad.png:** 96×96 transparent PNG; floor-mounted step-on travel pad, distinct from stairs.

Only ship the three final runtime PNGs. Keep raw generations outside the repository unless a reproducibility problem makes a source necessary. Do not add animation frames.

## Existing seam — no renderer work

HPA-741 already authored the entities and stable asset IDs:

- Floor 10's boss uses **enemy-taproot**, which currently points to the ruin-sentinel map sprite.
- Floor 10's fight-card portrait uses **enemy-taproot**, which currently points to the ruin-sentinel portrait.
- Floor 6's paired same-floor portals use **sluice-pad**, which currently points to the stairs-down sprite.

Change **only** the corresponding values in src/phaser/assets.ts:

- **ASSET_PATHS['enemy-taproot']** → assets/enemies/taproot.png
- **PORTRAIT_PATHS['enemy-taproot']** → assets/portraits/enemy-taproot.png
- **ASSET_PATHS['sluice-pad']** → assets/interactables/sluice-pad.png

The existing WorldScene preload, rendering, character idle motion, portal logic, portrait resolver, map definitions, and saves continue to work unchanged. The boss remains bottom-center anchored in a single 32-world-unit cell; the pad is static and fits inside one cell.

## Visual briefs

Follow docs/art/style-guide.md and use the six recently added enemy sprites and portraits as the matching reference set.

**Shared treatment:** Crisp 16-bit/SNES-era JRPG pixel art with a clear anime influence, compact readable silhouettes, dark pixel outlines, restrained palettes, simple cel shading, top-left lighting, no blur, no lettering, no UI frame, no external drop shadow. Use a flat **#FF00FF** source background that does not occur on the figure; key it to full transparency. Finished alpha should be only 0 or 255.

### Taproot map sprite

- A **root-and-bark creature**, not another armored human or ruin sentinel: a heavy twisting trunk, thick hooked roots/thorns, and one readable menacing face/eye pair.
- Top-down three-quarter view, base bottom-center. Favor bold branches and large features rather than numerous hairlike roots that vanish when drawn at one tile.
- Ancient dark umber/bark against cool blue-gray ruins, with restrained amber or sickly green glow in the eyes/core (avoid making it look like a healing crystal).
- Should read as a singular final boss despite sharing the same 96×96/one-tile footprint as regular enemies. Its threatening hooked limbs may suggest the existing first-strike and armor-piercing attacks; no animation or mechanic indicator is needed.

### Taproot portrait

- Front-facing, head-and-shoulders bust of **the same** root creature and palette, using the existing 64×64 portrait style.
- Root crown, deeply carved bark face, and large bright eyes remain legible at 64 px. Silhouette fills the bust area and runs off the bottom edge.
- No caption or decorative frame. The map sprite and portrait must clearly depict the same character.

### Sluice pad

- A low, horizontal **dark-stone ring surrounding a luminous water/portal vortex**, with a few broad directional flow marks. It should invite stepping onto its center to travel between cisterns.
- Cool slate/cyan palette matches the flooded Floor 6 ruins. Use a distinctive **circular pool/ring silhouette**, not steps, a staircase opening, a standing crystal, or a flat compass plate.
- The shape must be identifiable beside stairs-down, recovery-waystone, and clue-runes at one-tile scale; the latter two are already easy to confuse (HPA-829), so avoid repeating their silhouettes.
- Flat enough to appear walkable; centered within the tile, no glow or shadow bleeding into neighboring cells. It is a static image, not a new portal effect.

## Production decisions

Use the existing Codex image-generation workflow described on HPA-742, including its six-enemy reference and art prompts. Process the map assets with **bun run sprite** using the existing ASSET_PATHS keys. It outputs 96×96 files. For the portrait, use the established 64×64 manual bust-processing approach from the style guide: clean key-color halos, transparent background, coarse palette, crisp outlines, no dithering. **Do not use bun run sprite for the portrait:** that tool exports 96×96 map images.

Inspect each exported image at its own output resolution and inside the real game. If key-color blending makes pink fringes, snap those pixels to the background key before cutting rather than changing runtime filtering.

## Scope limits

- No content map edits, entity IDs, portal behavior, boss stats, combat changes, i18n text, persistence, or UI layout.
- No image manager, renderer extension, image-generation library, portrait pipeline, new animation system, extra asset keys, or new test infrastructure.
- No HPA-829 clue-rune redesign in this PR. Its related readability concern is only a comparison criterion for the new pad.
- No second PR for this ticket. Art production and the three catalog-path updates stay in **this same PR** after the design review.

## Acceptance criteria

1. All three committed files exist at their specified paths, with exact **96×96 / 64×64 / 96×96** PNG dimensions and clean transparency.
2. Taproot looks unlike ruin-sentinel in the Floor 10 room; its own portrait appears in its combat prompt.
3. Every Floor 6 sluice portal renders the new pad; it looks unlike stairs, recovery waystones, and clue runes and still reads as a travel tile.
4. No entity/map/save/renderer changes; established journeys and combat continue to behave exactly as before.
5. Existing asset file/dimension tests pass. Add a narrowly scoped regression assertion so these keys cannot silently revert to borrowed paths.
6. A PR review screenshot shows Floor 6 pads and Floor 10 boss in-game, plus the Taproot encounter portrait.
