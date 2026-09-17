# HPA-22 Reusable MVP Image Asset Kit Design

## Status

Planning contract for HPA-22. This is the standalone image-generation/art-production slice for the Tower Maze MVP and remains one ticket / one implementation PR.

HPA-237 is complete and established the gameplay grid, one-tile collision contract, stable entity IDs, optional `assetId` seam, bottom-center visual anchoring, reusable `WorldScene`, deterministic rules, and one LocalStorage snapshot. HPA-22 replaces that slice's placeholder presentation with a small reusable art kit without changing gameplay rules or expanding Floor 1–3 content.

## Goal

Establish a coherent, readable visual language for Eridanus and prove that generated runtime art can replace HPA-237 placeholders without renderer redesign.

The ticket succeeds when:

- a representative village/dungeon/character/enemy/relic sample is evaluated in the real game at the 32 px logical tile scale before the rest of the current-slice kit is produced;
- the complete HPA-237 village → Floor 1 → Floor 2 vertical slice renders finished runtime assets instead of text/solid-color placeholders;
- later content can extend the same catalog, scale, anchoring, filtering choice, and style conventions by adding only the images it actually consumes;
- open/closed relic and shortcut states are visually legible while preserving the existing domain rules;
- every catalog entry points to a committed runtime asset and every current authored `assetId` is a known catalog key;
- prompt/style/provenance notes are committed so later content can reproduce the treatment.

## Why This Is the Next Slice

HPA-22 was gated by HPA-237 and is intended to merge early after the gameplay seams are proven. That blocker is cleared.

HPA-235 is also unblocked, but it expands the village and Floor 1. Shipping HPA-22 first keeps image generation isolated and gives HPA-235 a stable visual contract instead of making that content PR invent art conventions while it authors gameplay.

## Scope

### Included

Only assets consumed by the current HPA-237 vertical slice plus the four directional player stills belong in this ticket:

- shared village floor/wall treatment;
- shared dungeon/ruin floor/wall treatment;
- player north/south/east/west stills;
- one village-guide/NPC visual bound to the existing village clue;
- one regular ruin enemy bound to the existing Floor 1 gatekeeper;
- stairs/portal up/down visuals;
- recovery waystone;
- dungeon clue/landmark rune treatment;
- shortcut gate closed/open pair;
- current relic/important-reward closed/open pair;
- runtime-ready PNG cleanup, transparency, scale normalization, and bottom-center anchoring;
- one explicit TypeScript asset catalog and small presentation-only resolvers;
- `WorldScene` preload/image rendering while tile coordinates remain authoritative;
- prompt/style/provenance notes;
- unit/browser checks for catalog coverage, current content bindings, committed files, and real Vite serving.

### Deferred to the First Content Ticket That Actually Uses Them

Do not generate speculative baseline assets merely to establish a library. The style guide is the reuse mechanism.

Deferred examples:

- additional regular enemies such as a stalker or wisp;
- ordinary chest closed/open art;
- named NPCs beyond the current village guide;
- Floor-specific bosses, landmarks, mechanisms, or unusual enemies;
- journal/map icons;
- portraits;
- walking/attack animation sets.

When HPA-235/HPA-146/HPA-137 first places one of these, that same content PR adds the required PNG(s), `ASSET_PATHS` row(s), and if needed one `OPEN_VARIANT` row.

### Non-goals

Do not add:

- a generic asset-management framework;
- texture-atlas tooling or a build-time sprite-sheet pipeline;
- an auto-tiling system;
- a generic animation registry;
- gameplay geometry encoded in images;
- new entity kinds, quest systems, inventory, keys, dialogue engines, or Floor 1–3 content;
- full-floor background images;
- music, voice, video, cutscenes, or broad UI redesign;
- save schema changes or migrations;
- test-only game APIs;
- visual-regression infrastructure.

## Existing Contracts to Preserve

HPA-237 already fixes the important boundaries:

- `TILE_SIZE` remains `32`.
- Collision and interaction use authored tile coordinates only.
- Player/enemy logical footprint remains one tile regardless of source-image dimensions.
- Character/entity visuals anchor bottom-center to their tile.
- `MapDefinition.layout` remains ASCII `#` / `.` geometry.
- `BaseEntity.assetId?: string` stays optional and stays in `src/game/types.ts`; the game domain must not import `AssetKey`.
- Pure game-domain modules remain Phaser-free.
- `WorldScene` remains presentation/input only and may keep transient presentation state such as facing.
- Full redraw and camera follow remain unchanged.
- The existing cross-floor browser journey remains the gameplay regression test.
- Open reward/latch tiles remain walkable because movement rules already derive blocking from durable progression; presentation must not change that.

HPA-22 may extend the presentation seam but must not move art concerns into the domain.

## Approaches Considered

### 1. Explicit PNG catalog + thin Phaser preload/rendering — chosen

Store processed runtime PNGs under `public/assets/`, define one explicit catalog in `src/phaser/assets.ts`, load them through normal Phaser `load.image`, and resolve terrain/entity/player texture keys through small presentation helpers.

Why this fits:

- very little infrastructure;
- paths are obvious in review;
- generated assets can be replaced independently;
- file existence and Vite serving are straightforward to test;
- later content adds only the PNG/catalog rows it consumes;
- no bundler magic, atlas metadata, or discovery conventions.

### 2. Texture atlases / sprite sheets — rejected for now

The current slice contains a small number of static images. Packing them would create extra cropping/metadata work without solving a current problem. Reconsider only if a later ticket introduces a real animation or asset-count constraint.

### 3. Dynamic discovery / JSON manifest / generic asset manager — rejected

Automatic discovery saves little for a small static catalog while adding another convention and failure surface. A checked-in TypeScript object remains the source of truth.

## Final Runtime Asset Layout

HPA-22 ends with only these consumed files:

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

Raw high-resolution generations are not runtime assets. Keep selected processed files only; discarded source generations do not belong in the repo merely for provenance.

## Visual Proof Gate

Before producing the remaining current-slice art, create and integrate this representative sample:

1. village floor/wall corner;
2. dungeon floor/wall room treatment;
3. player south-facing still;
4. village-guide NPC still;
5. `ruin-guard` enemy still;
6. relic chest closed/open pair.

Evaluate the sample in the real game at 100% browser zoom and the real 32 px logical scale.

### Hard pass criteria

Do not proceed to the remaining assets until all criteria pass:

- player, NPC, and enemy silhouettes are distinguishable at a glance;
- feet/base align cleanly to the existing logical tile using bottom-center anchoring;
- character art may extend upward but does not imply a larger collision footprint;
- village and dungeon terrain are immediately distinguishable;
- relic closed/open states are distinguishable without text or glow alone;
- important detail survives downscale rather than becoming 32 px visual mud;
- no selected character/interactable needs a per-entity pixel offset;
- a sprite taller than roughly two tiles is recropped/simplified rather than accommodated by renderer hacks;
- the treatment can be reproduced consistently for the remaining current-slice assets.

### Texture filtering decision

`src/phaser/createGame.ts` currently sets `pixelArt: true`, so the proof is already rendered with nearest-neighbor filtering.

The proof gate must explicitly choose the filtering that matches the selected treatment:

- if the final treatment is intentionally pixel-art-like, keep `pixelArt: true`;
- if the final treatment is painterly/anime and reads better with normal filtering, set `pixelArt: false` (or remove the opt-in) in this ticket.

This is a presentation choice, not a new pipeline. Record the decision and rationale in `docs/art/hpa-22-style-guide.md`.

## Art Direction

### Shared language

- Top-down fantasy with clear anime influence in character silhouette/face treatment.
- Strong readable shapes and controlled detail over illustration density.
- Warm, inhabited village language.
- Cooler, older ruin language for dungeon assets.
- Shared line/shading treatment across characters and interactables.
- Avoid baked directional lighting that makes reusable assets look wrong elsewhere.

### Logical scale

- Terrain and most interactables fit a one-tile visual footprint.
- Characters/enemies may use a taller transparent canvas but still anchor bottom-center to one tile.
- Source generation may be larger; final runtime dimensions are normalized after crop/downscale.
- Collision never reads image bounds.

### Player

Generate four directional stills only: north, south, east, west.

`WorldScene` stores the latest movement direction as transient presentation state. It is not persisted. Reload resetting facing to south is correct.

### NPC

The existing `village-tower-lead` clue receives the village-guide visual. Do not add an NPC entity kind, portrait framework, dialogue framework, or new village cast.

### Enemy

The current Floor 1 gatekeeper uses the one `ruin-guard` asset. Additional enemy variants wait until a later content ticket actually places them.

### Treasure and interactables

HPA-22 provides only interactables consumed by the current slice: relic reward, shortcut, recovery, clue, and stairs. Ordinary chest art is deferred until an ordinary chest is authored.

## Asset Catalog

`src/phaser/assets.ts` remains the only runtime asset manifest.

Representative final shape:

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

Do not add JSON manifests, import-glob discovery, dependency injection, or a second source of truth.

## Terrain and Player Resolution

Presentation owns both small mappings:

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

const PLAYER_BY_DIRECTION: Record<Direction, AssetKey> = {
  north: 'player-north',
  south: 'player-south',
  east: 'player-east',
  west: 'player-west',
};
```

Do not add an art-theme field to `MapDefinition`; adding a map already requires extending `MapId`, so the presentation mapping remains explicit and compile-checked.

## Entity Resolution

The HPA-237 `entity.assetId ?? entity.kind` behavior was a placeholder-label convenience, not a safe final-art fallback. HPA-22 removes kind-based defaults that could silently paint the wrong stairs, enemy, clue, or reward.

Use explicit authored `assetId` for directional/content-specific visuals. Only kinds with exactly one current visual may omit it: recovery and the closed latch.

Open-state changes are table-driven:

```ts
const OPEN_VARIANT: Partial<Record<AssetKey, AssetKey>> = {
  'chest-relic-closed': 'chest-relic-open',
  'shortcut-gate-closed': 'shortcut-gate-open',
};
```

Resolution rules:

1. defeated enemy → `null`;
2. if `assetId` is present, it must be a catalog key; an unknown ID resolves `null` and fails the exhaustive current-content unit test rather than silently substituting art;
3. otherwise recovery → `recovery-waystone`, latch → `shortcut-gate-closed`, and every other kind without an explicit ID → `null`;
4. for an opened reward or opened latch, return `OPEN_VARIANT[key] ?? key`;
5. otherwise return the base key.

Do not hardcode “opened reward means relic” and do not provide directional portal/enemy/clue/reward defaults.

This lets a later content ticket add a new closed/open pair by adding its PNG/catalog rows and one `OPEN_VARIANT` row without rewriting the resolver.

## Presentation-only Render State

Finished visuals may remain after their gameplay blocker is removed:

- collected current reward → open relic remains visible while the tile is walkable;
- opened shortcut → open gate remains visible while the tile is walkable;
- defeated enemy → no sprite;
- clue, recovery, portal → normal visual;
- player → directional still from transient `playerFacing`.

No new durable state is introduced.

## `WorldScene` Integration

Add normal `preload()` that iterates `ASSET_PATHS` and calls `load.image`.

`refresh()` continues to redraw from authored map + current `GameState`, but replaces placeholder rectangles/text with images. Terrain is stretched to exactly one logical tile using `setDisplaySize(TILE_SIZE, TILE_SIZE)`; entities render at their processed native dimensions and anchor bottom-center.

Keep the current input model, full redraw, camera follow, state ownership, and gameplay flow. Do not optimize rendering in HPA-22.

When an opened relic or gate shares a tile with the player, readability is solved by cropping/simplifying the PNG, not by adding entity-specific offsets or changing collision.

## Current Content Bindings

Directional/content-specific current entities get explicit `assetId` values:

- village clue → `npc-village-guide`;
- village → Floor 1 portal → `stairs-down`;
- Floor 1 → village portal → `stairs-up`;
- Floor 1 → Floor 2 portals → `stairs-down`;
- Floor 2 → Floor 1 portals → `stairs-up`;
- Floor 1 clue → `clue-runes`;
- Floor 1 reward → `chest-relic-closed`;
- Floor 1 enemy → `enemy-ruin-guard`.

Recovery and latch may use their single-visual defaults. No gameplay text, coordinates, stats, portal targets, or progression semantics change.

## Style and Provenance Notes

Create `docs/art/hpa-22-style-guide.md` during implementation with:

- the chosen visual treatment after the proof gate;
- the final `pixelArt` filtering decision;
- shared prompt language;
- target source size and runtime crop/downscale rules;
- transparency/background cleanup rules;
- bottom-center anchoring examples;
- village vs dungeon palette/lighting guidance;
- selected runtime asset table with generator/model, exact prompt, source/final dimensions, date, and useful seed/reference identifier when available;
- rejected proof directions and why they failed at gameplay scale.

Do not commit provider credentials or secrets.

## Validation and Testing

### Unit tests

`src/phaser/assets.test.ts` proves:

- `TILE_SIZE` remains 32;
- every map resolves to known terrain keys;
- player facing maps to exactly four known keys;
- `OPEN_VARIANT` gives the current relic/gate open states;
- defeated enemy resolves `null`;
- every authored `assetId` across `Object.values(MAPS)` exists in `ASSET_PATHS`;
- every live current entity across `Object.values(MAPS)` resolves to a known asset key (no hand-maintained per-ID snapshot);
- every `ASSET_PATHS` path has a committed file under `public/`.

The exhaustive `MAPS` loop is the guard against later binding drift and typo fallbacks.

### Browser tests

Keep the existing real-player cross-floor journey unchanged as the gameplay regression test.

Add one narrow `request.get` smoke test over `Object.values(ASSET_PATHS)` against the real Vite server. This catches public-path/serving mistakes without a build plugin or test-only runtime API.

### Manual evidence

The implementation PR includes real-game screenshots for:

- proof village corner;
- proof dungeon area;
- relic closed/open;
- shortcut closed/open;
- player/NPC/enemy at normal gameplay scale.

No visual-regression framework is added.

## Risks and Hard Stops

### 1. 32 px visual mud

The proof gate is a hard stop. Simplify/regenerate/crop before proceeding; do not compensate with larger logical tiles or renderer complexity.

### 2. Filtering mismatch

Nearest-neighbor is already enabled by `pixelArt: true`. The proof chooses whether that remains appropriate. Record and implement one choice; do not introduce runtime filter switching.

### 3. Player overlap with persistent open art

Open reward/gate art is new compared with HPA-237 hiding consumed blockers. Walk over both states in the real game. If the player becomes unreadable, recrop/simplify the PNG. Do not add per-entity offsets.

### 4. Vite `public/` path mistakes

Use `/assets/...` catalog paths and keep the real-server Playwright `request.get` test. Do not add a build plugin.

### 5. Binding drift

Do not maintain a 12-line snapshot of current entity IDs in the asset test. Iterate `Object.values(MAPS)` so a new authored entity cannot silently bypass catalog validation.

## Error Handling

Missing/unknown art is a development defect, not a recoverable gameplay state. Catch it with exhaustive current-content/catalog tests, file-existence tests, and the Vite-serving smoke test.

Do not add a runtime fallback manager. The merged implementation must have no unresolved live current entity and no missing catalog file.

## Handoff to HPA-235 / HPA-146 / HPA-137

Later content PRs should:

1. reuse existing catalog keys where the visual is genuinely shared;
2. add only the new PNGs the authored content consumes;
3. add catalog rows and any open-state mapping in the same content PR;
4. follow `docs/art/hpa-22-style-guide.md` for scale, filtering, anchoring, and generation style;
5. avoid reopening HPA-22 for a speculative “complete asset library.”

HPA-22 merges once the current HPA-237 slice uses the finished shared kit and its style contract is proven.

## Final Design Decision

Ship the smallest truthful art seam: explicit consumed PNGs, one catalog, two small mappings for terrain/player, one two-row open-variant table, and a resolver that fails closed on unknown content-specific IDs. Keep all gameplay/domain ownership exactly where HPA-237 put it.
