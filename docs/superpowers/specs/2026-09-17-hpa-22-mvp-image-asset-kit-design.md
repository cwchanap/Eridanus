# HPA-22 Reusable MVP Image Asset Kit Design

## Status

Planning contract for HPA-22. This ticket is the standalone image-generation/art-production slice for the Tower Maze MVP and remains one ticket / one implementation PR.

HPA-237 is complete and established the gameplay grid, one-tile collision contract, stable entity IDs, `assetId` seam, bottom-center visual anchoring, and reusable `WorldScene`. HPA-22 should now replace the vertical slice's placeholder presentation with a small reusable art kit without changing gameplay rules or expanding Floor 1–3 content.

## Goal

Establish a coherent, readable visual language for Eridanus and prove that generated runtime art can replace HPA-237 placeholders without renderer redesign.

The ticket succeeds when:

- a representative village/dungeon/character/enemy/chest sample is evaluated at the real 32 px tile scale before the rest of the kit is produced;
- the complete HPA-237 village → Floor 1 → Floor 2 vertical slice renders finished runtime assets instead of text/solid-color placeholders;
- later Floor 1–3 content can reuse the same asset catalog, scale, anchoring, and style conventions;
- open/closed treasure and shortcut states are visually legible while preserving the existing domain rules;
- every catalog entry points to a committed runtime asset and every `assetId` used by current content resolves;
- prompt/provenance notes are committed so later content can extend the style without reverse engineering it.

## Why This Is the Next Slice

HPA-22 is explicitly blocked by HPA-237 and is intended to merge early after the gameplay seams are proven. That blocker is now cleared.

HPA-235 (complete village/Floor 1) is also unblocked by HPA-237, but it is a content expansion. Starting HPA-22 first keeps image generation isolated from later gameplay/content work and gives HPA-235 a stable visual kit to consume rather than inventing art conventions while authoring the floor.

## Scope

### Included

- A small visual proof sample at actual gameplay scale.
- Shared village floor/wall treatment.
- Shared dungeon/ruin floor/wall treatment.
- Player directional stills required by four-direction movement.
- One integrated village-guide/NPC baseline using the existing clue interaction seam.
- A small regular-enemy baseline, with one current gatekeeper consumer.
- Current interactable visuals: stairs/portals, recovery point, clue/landmark, shortcut gate, and the HPA-237 reward.
- Ordinary chest open/closed visuals plus a distinct relic/important-reward treatment.
- Runtime-ready PNG cleanup, transparency, scale normalization, and bottom-center anchoring.
- A small explicit TypeScript asset catalog and presentation-only render-state resolver.
- `WorldScene` preload/image rendering that keeps tile coordinates authoritative.
- Prompt/style/provenance notes.
- Unit and browser checks that catch unresolved or missing runtime assets.

### Deferred to Later Content Tickets

- Additional named NPCs that HPA-235 has not stabilized yet.
- Floor-specific bosses, landmarks, and unusual enemies.
- Journal/map icons that are not consumed by HPA-22.
- Portraits unless the current vertical slice demonstrates a concrete need; there is no portrait framework in this ticket.
- Walking/attack animation sets.

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
- test-only game APIs.

## Existing Contracts to Preserve

HPA-237 already fixes the important boundaries:

- `TILE_SIZE` remains `32`.
- Collision and interaction use authored tile coordinates only.
- Player/enemy logical footprint remains one tile regardless of source-image dimensions.
- Character/entity visuals anchor bottom-center to their tile.
- `MapDefinition.layout` remains ASCII `#` / `.` geometry.
- `BaseEntity.assetId?: string` remains the content override seam.
- Pure game-domain modules do not import Phaser or asset-catalog code.
- `WorldScene` remains presentation/input only.
- The existing cross-floor browser journey remains the gameplay regression test.

HPA-22 may extend the presentation seam but must not move art concerns into the domain.

## Approaches Considered

### 1. Explicit PNG catalog + thin Phaser preload/rendering — chosen

Store processed runtime PNGs under `public/assets/`, define one explicit catalog in `src/phaser/assets.ts`, load those images in `WorldScene.preload()`, and resolve terrain/entity/player texture keys through small presentation helpers.

Why this fits:

- very little infrastructure;
- file paths are obvious in reviews;
- generated assets can be replaced independently;
- missing catalog files are straightforward to test;
- later floors can use an existing `assetId` or add one catalog entry;
- no bundler magic or atlas tooling is required.

### 2. One or more texture atlases / sprite sheets — rejected for now

Atlases can reduce requests and support animation, but this MVP has a small number of static images. Packing generated art creates extra cropping/metadata work and pushes HPA-22 toward a pipeline problem instead of a visual proof problem.

Reconsider only if a later ticket introduces a real animation or asset-count constraint.

### 3. Dynamic manifest discovery / import glob / generic asset manager — rejected

Automatic discovery would reduce explicit mappings but adds conventions, runtime/build coupling, and failure modes that provide little value for roughly a few dozen assets. A checked-in TypeScript object is easier to understand and test.

## Runtime Asset Layout

Use boring, discoverable paths:

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
    ruin-stalker.png
    ruin-wisp.png
  interactables/
    stairs-up.png
    stairs-down.png
    recovery-waystone.png
    clue-runes.png
    shortcut-gate-closed.png
    shortcut-gate-open.png
    chest-ordinary-closed.png
    chest-ordinary-open.png
    chest-relic-closed.png
    chest-relic-open.png
```

This is the target ceiling, not a quota. The proof sample comes first; if an item is not readable or not useful, fix/replace it rather than adding variants.

Raw high-resolution generations are not runtime assets. Keep only selected, processed runtime files in `public/assets`. Do not commit large discarded source generations merely for provenance.

## Visual Proof Gate

Before generating the full kit, create and integrate exactly this representative sample:

1. village floor/wall corner;
2. dungeon floor/wall room/landmark treatment;
3. player south-facing still;
4. one village-guide NPC still;
5. `ruin-guard` enemy still;
6. relic chest closed/open pair.

Evaluate the sample in the real game at 100% browser zoom and the real 32 px tile scale.

### Pass criteria

- Player, NPC, and enemy silhouettes are distinguishable at a glance.
- Feet/base align cleanly to the logical tile when bottom-center anchored.
- Character art may extend above a tile but must not imply a larger collision footprint.
- Village and dungeon ground/wall treatments are immediately distinguishable.
- The closed and open chest states are distinguishable without text.
- Important interactables remain readable against both terrain families.
- Downscaling does not turn faces, weapons, props, or wall details into noise.
- The style can be reproduced consistently for the remaining small kit.

If painterly/anime detail becomes muddy at scale, simplify the shapes and shading. Pixel art is allowed but not mandatory; readability decides the final treatment.

Record the chosen treatment and prompt conventions in `docs/art/hpa-22-style-guide.md` before expanding the kit.

## Art Direction

### Shared language

- Top-down fantasy with clear anime influence in character silhouette/face treatment.
- Strong readable shapes and controlled detail over illustration density.
- Warm, inhabited village palette/lighting language.
- Cooler, older, stranger ruin language for dungeon assets.
- Shared line/shading treatment across characters and interactables.
- No baked lighting that conflicts badly when an asset is reused on another floor tile.

### Logical scale

- Terrain and most interactables visually fit one 32×32 logical tile.
- Characters/enemies may use a taller transparent canvas (for example 32×48 or similar) but anchor at the bottom-center of the tile.
- Source generation can be larger; final runtime dimensions are normalized after crop/downscale.
- Collision never reads image bounds.

### Player

Generate four directional stills only: north, south, east, west.

Do not introduce walk cycles. `WorldScene` may remember the latest movement direction as transient presentation state so the player can switch stills without adding facing direction to `GameState`.

### NPCs and portraits

HPA-22 integrates one village-guide/NPC baseline through the existing clue entity. Do not invent a full named village cast before HPA-235 stabilizes it.

Do not add a portrait system. If no current interaction materially benefits from a portrait, generate none in this ticket. Later dialogue/content tickets can add a few portraits using the established style guide.

### Enemies

Use the current Floor 1 gatekeeper as the integrated proof consumer. After the proof sample passes, produce at most two additional regular ruin-enemy variants to establish a reusable baseline for later floors.

No attack animations or combat-scene art are required because combat remains deterministic and modal through the DOM overlay.

### Treasure and interactables

Provide:

- ordinary chest closed/open pair;
- distinct relic/important-reward closed/open pair;
- shortcut gate closed/open pair;
- recovery waystone;
- clue/landmark rune treatment;
- stair/portal up/down treatment.

The current HPA-237 reward should use the relic treatment. Ordinary chest art may be committed as shared kit even if the current vertical slice does not yet consume it.

## Asset Catalog

`src/phaser/assets.ts` remains the central presentation seam and grows from a single `resolveAssetId` helper into a small explicit catalog.

Representative shape:

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
  // explicit remaining entries
} as const;

export type AssetKey = keyof typeof ASSET_PATHS;
```

Keep this mapping explicit. Do not add JSON manifests, runtime discovery, dependency injection, or a second source of truth.

### Terrain resolution

Presentation owns a fixed map-theme mapping:

```ts
type TerrainTheme = Readonly<{
  floor: AssetKey;
  wall: AssetKey;
}>;

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

Do not add an art-theme field to the domain map schema merely for this ticket. Later floors can extend this presentation mapping when a genuinely different terrain family exists.

### Entity resolution

Keep `assetId` optional in authored content. Presentation resolves a base visual from `assetId ?? entity.kind`, then maps the current known entities to explicit catalog keys.

Current content should add explicit `assetId` only where the generic entity-kind default is insufficient, such as the village guide, Floor 1 clue landmark, relic reward, and ruin guard.

Do not narrow `BaseEntity.assetId` to import a presentation-layer type into `src/game/`.

## Presentation-only Render State

Some finished visuals have a state even after the gameplay entity stops blocking its tile.

Handle only the states needed now:

- collected current reward → render the relic chest open state while the tile remains walkable;
- opened shortcut latch → render the gate-open state while the tile remains walkable;
- defeated enemy → render nothing;
- clue, recovery, portal → render their normal state;
- player → render one of four directional stills based on latest presentation-only facing direction.

This logic belongs in `src/phaser/` and reads durable `GameState`; it does not add new durable flags.

A helper may return `AssetKey | null` for an entity. `null` means no sprite should be drawn (for example a defeated enemy). Do not build a generic state-machine abstraction.

## `WorldScene` Integration

Add a normal Phaser `preload()` method that iterates `ASSET_PATHS` and registers each image by its key.

`refresh()` continues to redraw from authored map + current `GameState`, but replaces:

- solid rectangles with floor/wall images;
- entity text labels with image sprites;
- `@` with the directional player sprite.

Keep the existing camera, input, state ownership, and full redraw strategy. HPA-22 does not optimize rendering.

When image canvases are taller than one tile, use bottom-center origin/positioning so feet remain aligned to the existing tile contract.

## Content Bindings

Update only the current vertical slice bindings needed to prove the kit:

- village recovery → `recovery-waystone`;
- village clue → `npc-village-guide`;
- village ↔ Floor 1 portal → stair treatment;
- Floor 1 lower-route clue → `clue-runes`;
- Floor 1 shortcut → shortcut gate treatment;
- Floor 1 power reward → relic chest treatment;
- Floor 1 gatekeeper → `ruin-guard`;
- Floor 1 ↔ Floor 2 portals → stair treatment.

No gameplay text, coordinates, combat stats, portal targets, or progression semantics need to change for HPA-22.

## Style and Provenance Notes

Create `docs/art/hpa-22-style-guide.md` during implementation containing:

- final visual treatment chosen after the proof gate;
- shared prompt prefix/suffix;
- negative-prompt guidance if applicable;
- target source size and runtime crop/downscale rules;
- transparency/background cleanup rules;
- bottom-center anchoring examples;
- palette/lighting guidance for village vs dungeon;
- a compact table of selected runtime assets with generator/model, source prompt, and any useful seed/reference identifier available from the generation tool.

Do not commit secrets or provider credentials.

## Validation and Testing

### Unit tests

Extend `src/phaser/assets.test.ts` to prove:

- `TILE_SIZE` remains 32;
- every map ID resolves to a terrain floor/wall key in `ASSET_PATHS`;
- current entity render states resolve to known asset keys or deliberate `null`;
- reward closed/open and shortcut closed/open states change only presentation;
- player facing resolves exactly four known keys;
- every path in `ASSET_PATHS` exists under `public/`.

File-existence checks may use Node filesystem APIs inside the Vitest test. There is no need for a new build plugin.

### Browser tests

Keep the existing real-player cross-floor journey. It should still prove navigation, combat, reward, latch, reload, and recovery after the visual swap.

Add one narrow asset-serving smoke test that requests the catalog paths and asserts successful responses from the real Vite server. Do not add a test-only runtime API.

### Manual evidence

The implementation PR should include screenshots captured from the real game for:

- the proof village corner;
- the proof dungeon room;
- closed vs open relic reward;
- closed vs open shortcut gate;
- player/NPC/enemy together at real gameplay scale.

Screenshots are review evidence, not a new visual-regression framework.

## Error Handling

Missing assets are development/build defects, not recoverable gameplay states.

Catch them through catalog/file-existence tests and browser-serving checks rather than adding a runtime fallback manager. Phaser may still emit its normal loader error during development, but the merged PR must have no missing catalog files or unresolved current content bindings.

## Handoff to HPA-235 / HPA-146 / HPA-137

Later floor/content PRs should:

1. reuse existing catalog keys whenever possible;
2. add a small number of new content-specific PNGs only when the authored content genuinely needs them;
3. add those files and catalog entries in the same content PR;
4. follow `docs/art/hpa-22-style-guide.md` for scale, anchoring, and generation style;
5. avoid reopening HPA-22 or waiting for a giant final-art pass.

HPA-22 should merge once the shared kit and HPA-237 vertical-slice integration are complete, independent of later floor implementation.

## Final Design Decisions

- HPA-22 is the next actionable Tower Maze ticket after HPA-237.
- One ticket / one implementation PR.
- Generate a small proof sample first; expand only after it passes at 32 px gameplay scale.
- Keep runtime art as explicit processed PNGs under `public/assets`.
- Keep one explicit TypeScript catalog in `src/phaser/assets.ts`; no asset framework.
- Preserve the domain/content schema and tile-based gameplay rules.
- Use presentation-only facing and opened-state rendering rather than new durable state.
- Keep portraits and animation out unless a current consumer proves the need.
- Commit prompt/style/provenance notes and keep oversized discarded source generations out of the runtime bundle/repo.
