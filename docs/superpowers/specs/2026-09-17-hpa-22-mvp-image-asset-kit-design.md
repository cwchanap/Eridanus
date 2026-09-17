# HPA-22 Reusable MVP Image Asset Kit Design

## Status

Planning contract for HPA-22. This remains the standalone image-generation/art-production slice for the Tower Maze MVP and is delivered as one implementation PR.

HPA-237 already established the gameplay grid, one-tile collision contract, optional `assetId` seam, bottom-center anchoring convention, durable progression flags, and reusable `WorldScene`. HPA-22 replaces that vertical slice's placeholder presentation without changing gameplay rules or expanding Floor 1–3 content.

## Goal

Establish a coherent, readable visual language for Eridanus and prove that generated runtime art can replace the current placeholders without renderer redesign.

The ticket succeeds when:

- a representative village/dungeon/character/enemy/relic sample is evaluated at the real 32 px logical scale before the rest of the current-slice art is produced;
- the complete HPA-237 village → Floor 1 → Floor 2 slice renders finished runtime assets instead of text/solid-color placeholders;
- later content can extend the same catalog, scale, anchoring, filtering, and prompt conventions without changing the renderer;
- open/closed relic and shortcut states are visibly different while using only existing durable progression arrays;
- every current authored asset binding resolves to a committed runtime PNG;
- runtime image dimensions are mechanically bounded so a bad export cannot silently render several tiles tall;
- a durable style guide records the reproducible visual rules rather than ticket bookkeeping.

## Scope

### Included

Generate only assets consumed by the current HPA-237 slice:

```text
public/assets/
  terrain/
    village-floor.png
    village-wall.png
    dungeon-floor.png
    dungeon-wall.png
  characters/
    player-north.png
    player-south.png
    player-east.png
    player-west.png
    npc-village-guide.png
  enemies/
    ruin-guard.png
  interactables/
    stairs-up.png
    stairs-down.png
    recovery-waystone.png
    clue-runes.png
    shortcut-gate-closed.png
    shortcut-gate-open.png
    chest-relic-closed.png
    chest-relic-open.png
```

Also included:

- one explicit TypeScript asset catalog in `src/phaser/assets.ts`;
- presentation-only terrain, player-facing, and open-state resolution;
- Phaser preload/image rendering through the existing `WorldScene`;
- prompt/style guidance in `docs/art/style-guide.md`;
- fast file/dimension validation plus browser serving coverage;
- real-game screenshots as review evidence.

### Deferred

Do not pre-generate assets that current authored content does not draw. In particular, defer:

- spare regular enemies such as `ruin-stalker` / `ruin-wisp`;
- ordinary chest open/closed art;
- additional named NPCs;
- Floor-specific bosses or landmarks;
- journal/map/item icon sets;
- portraits;
- walking/attack animation frames.

The first later content PR that consumes one of these adds its PNG and one catalog entry while following `docs/art/style-guide.md`.

### Non-goals

Do not add:

- an atlas or sprite-sheet pipeline;
- glob/import discovery or a JSON manifest;
- a generic asset manager;
- auto-tiling;
- a generic animation registry;
- an image build plugin;
- runtime PNG parsing;
- gameplay geometry encoded in images;
- new entity kinds, quest systems, inventory, keys, or dialogue engines;
- save schema changes or migrations;
- a portrait framework or UI-framework rewrite;
- full-floor background images;
- music, voice, video, or cutscenes;
- visual-regression infrastructure or test-only game APIs.

## Existing Contracts to Preserve

- `TILE_SIZE` remains exactly `32`.
- Collision and interaction remain authored tile-coordinate rules; image bounds never affect gameplay.
- Player/enemy logical footprint remains one tile.
- Character/entity visuals use bottom-center anchoring.
- `MapDefinition.layout` remains ASCII `#` / `.` geometry.
- `BaseEntity.assetId?: string` remains a plain domain string; `src/game/` must not import `AssetKey`.
- Pure game-domain modules remain Phaser-free.
- `WorldScene` remains presentation/input only and keeps the existing full redraw + camera-follow approach.
- `GameState` remains unchanged. Open reward, defeated enemy, and opened shortcut visuals derive from `openedRewardIds`, `defeatedEnemyIds`, and `openedShortcutIds`.
- The existing browser journey remains the mechanics regression test.

## Architecture

### Explicit catalog

`src/phaser/assets.ts` grows the existing HPA-237 seam in place. It owns one explicit catalog:

```ts
export const ASSET_PATHS = {
  'terrain-village-floor': '/assets/terrain/village-floor.png',
  'terrain-village-wall': '/assets/terrain/village-wall.png',
  'terrain-dungeon-floor': '/assets/terrain/dungeon-floor.png',
  'terrain-dungeon-wall': '/assets/terrain/dungeon-wall.png',
  'player-north': '/assets/characters/player-north.png',
  'player-south': '/assets/characters/player-south.png',
  'player-east': '/assets/characters/player-east.png',
  'player-west': '/assets/characters/player-west.png',
  'npc-village-guide': '/assets/characters/npc-village-guide.png',
  'enemy-ruin-guard': '/assets/enemies/ruin-guard.png',
  'stairs-up': '/assets/interactables/stairs-up.png',
  'stairs-down': '/assets/interactables/stairs-down.png',
  'recovery-waystone': '/assets/interactables/recovery-waystone.png',
  'clue-runes': '/assets/interactables/clue-runes.png',
  'shortcut-gate-closed': '/assets/interactables/shortcut-gate-closed.png',
  'shortcut-gate-open': '/assets/interactables/shortcut-gate-open.png',
  'chest-relic-closed': '/assets/interactables/chest-relic-closed.png',
  'chest-relic-open': '/assets/interactables/chest-relic-open.png',
} as const;

export type AssetKey = keyof typeof ASSET_PATHS;
```

This object is the only runtime asset manifest. Later content extends it explicitly.

### Terrain mapping

Presentation owns the exhaustive map-theme mapping rather than adding art metadata to the domain:

```ts
type TerrainTheme = Readonly<{ floor: AssetKey; wall: AssetKey }>;

const TERRAIN_BY_MAP: Record<MapId, TerrainTheme> = {
  village: {
    floor: 'terrain-village-floor',
    wall: 'terrain-village-wall',
  },
  floor1: {
    floor: 'terrain-dungeon-floor',
    wall: 'terrain-dungeon-wall',
  },
  floor2: {
    floor: 'terrain-dungeon-floor',
    wall: 'terrain-dungeon-wall',
  },
};
```

Adding a new `MapId` therefore requires a deliberate terrain decision at compile time.

### Player facing

Facing is presentation-only:

```ts
const PLAYER_BY_DIRECTION: Record<Direction, AssetKey> = {
  north: 'player-north',
  south: 'player-south',
  east: 'player-east',
  west: 'player-west',
};
```

`WorldScene` remembers the latest arrow-key direction in a private field. Reloading to south is acceptable; facing is not persisted.

### Entity resolution

Content-specific visuals are explicit. Portal, enemy, clue, and reward entities do **not** have kind-based art fallbacks because their correct sprite cannot be inferred from the kind alone.

Recovery and the closed latch are the only safe current defaults because each has exactly one visual in this slice.

Unknown explicit `assetId` values fail closed (`null`) and are development defects caught by tests; the runtime does not substitute a plausible sprite.

Open-state mapping is data, not a kind switch:

```ts
const OPEN_VARIANT: Partial<Record<AssetKey, AssetKey>> = {
  'chest-relic-closed': 'chest-relic-open',
  'shortcut-gate-closed': 'shortcut-gate-open',
};
```

Resolution order:

1. defeated enemy → `null`;
2. explicit valid `assetId`, otherwise the recovery/latch single-visual default;
3. if reward/latch is opened, use `OPEN_VARIANT[base] ?? base`;
4. otherwise use the base key.

A future openable reward that forgets its `OPEN_VARIANT` row must fail content/catalog tests rather than silently showing closed art forever.

## Runtime Dimension Contract

Terrain is drawn at one logical tile and must therefore be exported exactly `32×32`.

All non-terrain runtime PNGs must be at most `64×64`. They may be smaller or taller than one tile, but the bound prevents an accidental source-resolution export from covering a large portion of the board and limits overlap while `WorldScene` still renders in authored array order.

The catalog file test reads only the fixed PNG IHDR width/height fields (bytes 16–23) with Node `readFileSync`. This is a small test-only format assertion, not a reusable PNG parser, dependency, or runtime system.

If a later real asset needs a footprint beyond this bound, change the contract deliberately in that content PR rather than introducing a generic footprint table pre-emptively.

## Proof-First Delivery

### Proof sample

Before producing the remaining current-slice art, generate and integrate:

1. village floor/wall;
2. dungeon floor/wall;
3. south-facing player;
4. village-guide NPC;
5. `ruin-guard` enemy;
6. relic chest closed/open pair.

At 100% browser zoom and the real 640×480 game canvas, verify:

- player, NPC, and enemy silhouettes are distinct;
- bottom-center anchoring reads correctly;
- village and dungeon terrain are clearly different;
- relic open/closed states differ by shape/silhouette, not text or glow alone;
- important detail survives 32 px gameplay scale;
- no asset needs a per-entity renderer offset;
- no non-terrain asset violates the `≤64×64` runtime bound;
- the treatment can be reproduced for the remaining current-slice assets.

### Filtering decision

`src/phaser/createGame.ts` currently uses `pixelArt: true`.

The proof makes one explicit decision:

- keep `pixelArt: true` when the approved treatment benefits from nearest-neighbor filtering;
- set it to `false` when painterly/anime art is materially clearer with normal filtering.

Record the chosen value and reason in `docs/art/style-guide.md`. Do not add runtime filter switching or per-texture filtering.

### Bounded off-ramp

Do not let the proof gate loop indefinitely.

For a category that fails the gate, allow at most **two regeneration/recrop rounds** using the intended treatment. If it still fails, deliberately simplify that category to flat/iconic shapes with less facial/material detail and perform one final pass.

HPA-22 still requires finished art for the complete current slice; do **not** ship that category as a placeholder. The fallback is reduced visual ambition, not reduced acceptance criteria.

## WorldScene Integration

`WorldScene.preload()` iterates `ASSET_PATHS` and registers each image.

`refresh()`:

- draws terrain images with `.setDisplaySize(TILE_SIZE, TILE_SIZE)`;
- resolves each entity through `resolveEntityAsset` and draws only non-null keys;
- leaves opened relic and gate art visible even though those tiles are walkable;
- hides defeated enemies;
- renders the player using `PLAYER_BY_DIRECTION` and bottom-center anchoring;
- keeps camera follow and full redraw behavior unchanged.

The proof checkpoint does not need a temporary legacy text fallback. Unbound entities may simply render nothing until the final current-slice bindings are added; gameplay interactions remain authored-domain behavior.

## Style Guide

Use durable path:

```text
docs/art/style-guide.md
```

Keep only information likely to be reused:

- chosen visual treatment;
- `pixelArt` filtering decision and reason;
- shared prompt language;
- village vs dungeon guidance;
- transparency/crop/bottom-center rules;
- runtime dimension rules (`32×32` terrain, `≤64×64` others);
- rejected proof directions and what failed at gameplay scale;
- one compact line per selected asset with generator/model and prompt variant.

Do not maintain per-asset generation dates, seeds, or source dimensions. Those are ticket bookkeeping, not a durable art contract.

## Validation and Testing

### Fast unit coverage

`src/phaser/assets.test.ts` must cover:

- `TILE_SIZE === 32`;
- every `MapId` has terrain keys present in `ASSET_PATHS`;
- all four `Direction` values map to player asset keys;
- unknown explicit IDs fail closed;
- defeated enemies resolve to `null`;
- every catalog path exists under `public/`;
- every terrain PNG is exactly `32×32` by its IHDR header;
- every other PNG is at most `64×64` by its IHDR header;
- one loop over `Object.values(MAPS)` validates every current live entity;
- every authored `assetId` is present in `ASSET_PATHS`;
- for every current reward/latch, the opened state resolves to a non-null catalog key **different from** its closed key.

The generalized `MAPS` loop is the binding-drift guard. Do not replace it with a hand-maintained list of current IDs.

### Browser coverage

Keep the existing real-player cross-floor journey unchanged.

Add one Playwright request test that iterates catalog URLs and asserts:

- HTTP success;
- `content-type` includes `image/png`.

This catches Vite/public-path mistakes that file existence cannot.

### Manual evidence

Attach real-game screenshots showing:

- village proof scene;
- dungeon proof scene;
- relic closed/open;
- shortcut gate closed/open;
- player overlapping the opened relic tile and opened gate tile without losing readability.

Screenshots are review evidence only; do not create a visual-regression harness.

## Risks

### 32 px mud

Use the proof gate and bounded simplification fallback. Do not increase `TILE_SIZE` or add renderer complexity to rescue unsuitable art.

### Filtering mismatch

Resolve once in the proof with the existing Phaser `pixelArt` option and record the decision.

### Persistent-open-art overlap

Open relic/gate art remains on walkable tiles, unlike HPA-237 placeholder behavior. Verify overlap with the player. Fix image crop/padding if needed; do not add per-entity offsets.

### Vite public-path mismatch

Files live under `public/assets`, catalog URLs use `/assets/...`. The Playwright HTTP smoke test is the guard; no build plugin is needed.

### Binding/open-state drift

The generalized `MAPS` test covers both live and opened states for every current reward/latch, so later content cannot silently omit its open variant.

### Invalid binary dimensions

The IHDR dimension check fails fast when a regenerated PNG is exported at source resolution or an invalid runtime footprint.

## Handoff to Later Content

HPA-235 / HPA-146 / HPA-137 should:

1. reuse existing catalog keys when they fit;
2. add a new PNG/catalog row only when new authored content consumes it;
3. add an `OPEN_VARIANT` row when that new asset has an opened state;
4. satisfy the same file/dimension/content tests;
5. follow `docs/art/style-guide.md` for generation and processing;
6. avoid reopening HPA-22 or building a larger asset framework.

HPA-22 merges once the current HPA-237 slice has finished art and the proof/runtime validation gates pass; it does not wait for later floor content.