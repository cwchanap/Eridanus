# HPA-22 Reusable MVP Image Asset Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HPA-237 placeholder rendering with the smallest generated runtime art kit actually consumed by the current village → Floor 1 → Floor 2 slice, prove the treatment at real gameplay scale, and leave later content a stable extension seam.

**Architecture:** Gameplay/domain code remains unchanged. Processed PNGs live under `public/assets`; one explicit `src/phaser/assets.ts` catalog owns runtime paths, terrain/player mappings, a two-row open-state table, and a small resolver that fails closed for unknown content-specific IDs. `WorldScene` preloads/render images and owns transient facing only. The proof sample is integrated before the remaining current-slice images are generated.

**Tech Stack:** Bun 1.4.2, Vite 8, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, generated PNG assets.

**Spec:** `docs/superpowers/specs/2026-09-17-hpa-22-mvp-image-asset-kit-design.md`

## Global Constraints

- Deliver HPA-22 as one implementation PR; proof, generation, runtime integration, and validation stay in that PR.
- Keep HPA-22 the standalone art-production slice. Do not pull HPA-235 village/Floor 1 content expansion into it.
- Generate only images consumed by the current HPA-237 slice. Do not pre-generate `ruin-stalker`, `ruin-wisp`, or ordinary-chest assets.
- `TILE_SIZE` remains exactly `32`.
- Tile coordinates remain the only collision/interaction geometry.
- `src/game/` remains Phaser-free and does not import `AssetKey` or `ASSET_PATHS`.
- `BaseEntity.assetId?: string` remains unchanged.
- `MapDefinition.layout` remains ASCII `#` / `.` geometry.
- Do not add an atlas pipeline, auto-tiler, animation registry, generic asset manager, portrait framework, UI framework, or image build plugin.
- Do not add entity kinds, durable state fields, save migrations, quests, inventory, keys, or gameplay rules.
- Preserve the existing full-redraw `WorldScene`, camera follow, deterministic combat, persistence, and real-player Playwright journey.
- Generate the representative proof sample first, integrate it into the real game, and pass the visual/filtering gate before generating the remaining current-slice assets.
- Commit selected processed runtime PNGs plus compact style/provenance notes; do not commit discarded high-resolution generations.
- Unknown authored content-specific asset IDs are development defects. They must fail tests rather than silently fall back to a plausible but wrong sprite.

---

## Final File Structure

### Create

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

docs/art/hpa-22-style-guide.md
```

### Modify

- `src/phaser/assets.ts` — explicit catalog, terrain/player maps, open-variant table, entity resolver, runtime-path helper.
- `src/phaser/assets.test.ts` — catalog/resolver/current-content/file-existence coverage.
- `src/phaser/WorldScene.ts` — preload, image rendering, transient facing.
- `src/phaser/createGame.ts` — **only if** the proof chooses normal filtering instead of the current `pixelArt: true` nearest-neighbor treatment.
- `src/game/content/village.ts` — explicit content-specific current asset IDs only.
- `src/game/content/floor1.ts` — explicit content-specific current asset IDs only.
- `src/game/content/floor2.ts` — explicit directional portal asset IDs only.
- `tests/e2e/cross-floor.spec.ts` — catalog HTTP smoke test while retaining the existing journey.

### Do Not Modify

- `src/game/types.ts`
- `src/game/actions.ts`
- `src/game/movement.ts`
- `src/game/combat.ts`
- `src/game/session.ts`
- `src/game/save.ts`
- `src/ui/InteractionOverlay.ts`

---

## Risks / Hard Stops

### 32 px mud

The Task 3 proof gate is a hard stop. If the selected art loses silhouette/detail at the real logical scale, simplify/regenerate/crop it. Do not increase logical tile size or add renderer complexity to rescue bad source art.

### Filtering mismatch

`src/phaser/createGame.ts` already sets `pixelArt: true`. The proof must deliberately keep it for a pixel-art-like treatment or set it to `false` for a painterly/anime treatment that reads better with normal filtering. Record one final choice in the style guide; do not add runtime filter switching.

### Persistent-open-art overlap

HPA-237 currently hides consumed reward/latch placeholders. HPA-22 intentionally leaves open relic/gate art visible on walkable tiles. Task 5 must walk the player onto both tiles and verify the player remains readable. Fix crop/transparent padding if not; do not add per-entity offsets.

### Vite public-path mismatch

Catalog paths use `/assets/...` while files live under `public/assets/...`. Task 6 verifies every path with Playwright `request.get` against the real Vite server. Do not add a build plugin.

### Binding drift

Do not maintain a hand-written list of current entity IDs in tests. Iterate `Object.values(MAPS)` so future authored entities must resolve through the same catalog contract.

---

### Task 1: Establish the proof-stage catalog and fail-closed resolver shape

**Files:**
- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: `Entity`, `GameState`, `MapId` from `src/game/types.ts`.
- Produces: `ASSET_PATHS`, `AssetKey`, `resolveTerrainAssets(mapId)`, `resolveEntityAsset(entity, state)`, and `runtimeAssetFilePath(assetKey)`.
- `OPEN_VARIANT` begins with the relic row and is extended, not replaced, when the shortcut pair is generated.

- [ ] **Step 1: Replace the old placeholder seam test with failing proof-catalog tests**

Use:

```ts
import { describe, expect, it } from 'vitest';
import { findEntityById } from '../game/content';
import { INITIAL_GAME_STATE } from '../game/state';
import {
  ASSET_PATHS,
  TILE_SIZE,
  resolveEntityAsset,
  resolveTerrainAssets,
} from './assets';

describe('asset seam', () => {
  it('keeps the 32px logical tile and maps every current map to proof terrain', () => {
    expect(TILE_SIZE).toBe(32);
    expect(resolveTerrainAssets('village')).toEqual({
      floor: 'terrain-village-floor',
      wall: 'terrain-village-wall',
    });
    expect(resolveTerrainAssets('floor1')).toEqual({
      floor: 'terrain-dungeon-floor',
      wall: 'terrain-dungeon-wall',
    });
    expect(resolveTerrainAssets('floor2')).toEqual({
      floor: 'terrain-dungeon-floor',
      wall: 'terrain-dungeon-wall',
    });
  });

  it('renders the proof relic closed and open from existing reward state', () => {
    const reward = findEntityById('floor1-power-core');
    if (!reward) throw new Error('floor1-power-core missing');
    const boundReward = { ...reward, assetId: 'chest-relic-closed' };

    expect(resolveEntityAsset(boundReward, INITIAL_GAME_STATE)).toBe(
      'chest-relic-closed',
    );
    expect(
      resolveEntityAsset(boundReward, {
        ...INITIAL_GAME_STATE,
        openedRewardIds: [reward.id],
      }),
    ).toBe('chest-relic-open');
  });

  it('removes a defeated proof enemy', () => {
    const enemy = findEntityById('floor1-gatekeeper');
    if (!enemy) throw new Error('floor1-gatekeeper missing');
    const boundEnemy = { ...enemy, assetId: 'enemy-ruin-guard' };

    expect(resolveEntityAsset(boundEnemy, INITIAL_GAME_STATE)).toBe(
      'enemy-ruin-guard',
    );
    expect(
      resolveEntityAsset(boundEnemy, {
        ...INITIAL_GAME_STATE,
        defeatedEnemyIds: [enemy.id],
      }),
    ).toBeNull();
  });

  it('does not silently substitute an unknown explicit asset id', () => {
    const enemy = findEntityById('floor1-gatekeeper');
    if (!enemy) throw new Error('floor1-gatekeeper missing');
    expect(
      resolveEntityAsset(
        { ...enemy, assetId: 'typo-not-in-catalog' },
        INITIAL_GAME_STATE,
      ),
    ).toBeNull();
  });

  it('keeps proof catalog paths under /assets', () => {
    for (const path of Object.values(ASSET_PATHS)) {
      expect(path).toMatch(/^\/assets\//);
    }
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL because the explicit catalog and state-aware resolver do not exist.

- [ ] **Step 3: Implement only the proof-stage catalog**

Replace the current `resolveAssetId`-only seam with:

```ts
import type { Entity, GameState, MapId } from '../game/types';

export const TILE_SIZE = 32;

export const ASSET_PATHS = {
  'terrain-village-floor': '/assets/terrain/village-floor.png',
  'terrain-village-wall': '/assets/terrain/village-wall.png',
  'terrain-dungeon-floor': '/assets/terrain/dungeon-floor.png',
  'terrain-dungeon-wall': '/assets/terrain/dungeon-wall.png',
  'player-south': '/assets/characters/player-south.png',
  'npc-village-guide': '/assets/characters/npc-village-guide.png',
  'enemy-ruin-guard': '/assets/enemies/ruin-guard.png',
  'chest-relic-closed': '/assets/interactables/chest-relic-closed.png',
  'chest-relic-open': '/assets/interactables/chest-relic-open.png',
} as const;

export type AssetKey = keyof typeof ASSET_PATHS;
type TerrainAssets = Readonly<{ floor: AssetKey; wall: AssetKey }>;

const TERRAIN_BY_MAP: Record<MapId, TerrainAssets> = {
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

const OPEN_VARIANT: Partial<Record<AssetKey, AssetKey>> = {
  'chest-relic-closed': 'chest-relic-open',
};

export function resolveTerrainAssets(mapId: MapId): TerrainAssets {
  return TERRAIN_BY_MAP[mapId];
}

function explicitAsset(assetId: string | undefined): AssetKey | null {
  if (assetId === undefined) return null;
  return assetId in ASSET_PATHS ? (assetId as AssetKey) : null;
}

function baseEntityAsset(entity: Entity): AssetKey | null {
  return explicitAsset(entity.assetId);
}

export function resolveEntityAsset(
  entity: Entity,
  state: GameState,
): AssetKey | null {
  if (entity.kind === 'enemy' && state.defeatedEnemyIds.includes(entity.id)) {
    return null;
  }

  const base = baseEntityAsset(entity);
  if (!base) return null;

  if (
    (entity.kind === 'reward' && state.openedRewardIds.includes(entity.id)) ||
    (entity.kind === 'latch' && state.openedShortcutIds.includes(entity.id))
  ) {
    return OPEN_VARIANT[base] ?? base;
  }

  return base;
}

export function runtimeAssetFilePath(assetKey: AssetKey): string {
  return `public${ASSET_PATHS[assetKey]}`;
}
```

This is already the final resolver algorithm: explicit known key → optional open variant. Task 4 only adds the two safe single-visual defaults (`recovery` and closed `latch`) after those assets exist and adds the shortcut row to the same table. Do not introduce an exhaustive kind-to-art fallback switch.

- [ ] **Step 4: Run focused tests and typecheck**

```bash
bunx vitest run src/phaser/assets.test.ts
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/phaser/assets.ts src/phaser/assets.test.ts
git commit -m "feat: define HPA-22 proof asset seam"
```

---

### Task 2: Generate only the representative proof sample

**Files:**
- Create: `public/assets/terrain/village-floor.png`
- Create: `public/assets/terrain/village-wall.png`
- Create: `public/assets/terrain/dungeon-floor.png`
- Create: `public/assets/terrain/dungeon-wall.png`
- Create: `public/assets/characters/player-south.png`
- Create: `public/assets/characters/npc-village-guide.png`
- Create: `public/assets/enemies/ruin-guard.png`
- Create: `public/assets/interactables/chest-relic-closed.png`
- Create: `public/assets/interactables/chest-relic-open.png`
- Create: `docs/art/hpa-22-style-guide.md`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: exact proof paths from `ASSET_PATHS`.
- Produces: nine runtime proof PNGs and the initial style/provenance record.

- [ ] **Step 1: Generate the nine proof assets only**

Use this shared prompt language:

```text
Top-down fantasy game asset for a compact grid-maze browser game, clear anime influence,
strong readable silhouette, restrained detail that survives downscaling, clean lighting,
transparent background for characters/interactables, no text, no UI border, no external
shadow, consistent game-art treatment.
```

Add category constraints:

```text
Village terrain: warm inhabited stone/wood language, welcoming warmth, simple repeatable tile.
Dungeon terrain: cool ancient ruin language, slate/blue-gray stone, subtle strange accents, simple repeatable tile.
Characters/enemy: one-tile logical footprint, feet centered at bottom, top-down/three-quarter view.
Relic pair: same object identity/camera angle; open state differs by silhouette, not glow alone.
```

Do not generate extra enemies or ordinary chests in this task.

- [ ] **Step 2: Process selected outputs into exact runtime files**

For each selected image:

1. remove opaque background for non-terrain art;
2. crop transparent padding without clipping silhouette;
3. align character/interactable base to bottom-center;
4. downscale to a runtime size readable on a 32 px logical tile;
5. keep terrain edges repeatable;
6. recrop/simplify any character or interactable taller than roughly two logical tiles;
7. save to the exact path already declared in `ASSET_PATHS`.

Do not add an image-processing script unless manual processing itself becomes a demonstrated bottleneck.

- [ ] **Step 3: Add proof file-existence coverage**

Append:

```ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeAssetFilePath } from './assets';

it('ships every cataloged proof file', () => {
  const keys = Object.keys(ASSET_PATHS) as (keyof typeof ASSET_PATHS)[];
  for (const key of keys) {
    expect(existsSync(resolve(runtimeAssetFilePath(key)))).toBe(true);
  }
});
```

- [ ] **Step 4: Run the proof file test**

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: PASS only when all nine proof files exist.

- [ ] **Step 5: Create the initial style/provenance guide**

Create `docs/art/hpa-22-style-guide.md` with:

```markdown
# HPA-22 Art Style and Generation Guide

## Runtime scale
## Chosen visual treatment
## Texture filtering
## Shared prompt language
## Village guidance
## Dungeon guidance
## Character and enemy guidance
## Interactable guidance
## Transparency, crop, and bottom-center anchoring
## Selected proof assets and provenance
## Rejected proof directions
## Rules for later Floor 1–3 assets
```

For each proof file record generator/model, generation date, exact prompt, source dimensions, final runtime dimensions, useful seed/reference identifier when available, and cleanup/downscale decision. Leave `Chosen visual treatment` and `Texture filtering` marked as pending proof evaluation, not as invented conclusions.

- [ ] **Step 6: Commit**

```bash
git add public/assets docs/art/hpa-22-style-guide.md src/phaser/assets.test.ts
git commit -m "art: add HPA-22 visual proof sample"
```

---

### Task 3: Integrate the proof into the real game and pass the hard visual/filtering gate

**Files:**
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/phaser/createGame.ts` only if normal filtering wins the proof.
- Modify: `src/game/content/village.ts`
- Modify: `src/game/content/floor1.ts`
- Modify: `src/phaser/assets.test.ts`
- Modify: `docs/art/hpa-22-style-guide.md`

**Interfaces:**
- Consumes: proof catalog/resolver and existing optional `assetId` seam.
- Produces: a playable proof checkpoint. Proof assets render as images; still-unconverted current entities retain the existing text placeholder until Task 5.

- [ ] **Step 1: Bind only the three content-specific proof entities**

Add only:

```ts
// village.ts: village-tower-lead
assetId: 'npc-village-guide',

// floor1.ts: floor1-power-core
assetId: 'chest-relic-closed',

// floor1.ts: floor1-gatekeeper
assetId: 'enemy-ruin-guard',
```

Do not change coordinates, prose, stats, portal targets, or gameplay behavior.

- [ ] **Step 2: Add a narrow proof-binding assertion**

During the proof stage only:

```ts
it('binds the three proof entities', () => {
  expect(findEntityById('village-tower-lead')?.assetId).toBe('npc-village-guide');
  expect(findEntityById('floor1-power-core')?.assetId).toBe('chest-relic-closed');
  expect(findEntityById('floor1-gatekeeper')?.assetId).toBe('enemy-ruin-guard');
});
```

This assertion is removed in Task 5 when the exhaustive `MAPS` loop replaces hand-maintained binding snapshots.

Run:

```bash
bunx vitest run src/phaser/assets.test.ts src/game/content.test.ts
```

Expected: PASS after the three bindings exist.

- [ ] **Step 3: Preload the proof catalog**

In `WorldScene` import `ASSET_PATHS`, `resolveTerrainAssets`, and `resolveEntityAsset`, then add:

```ts
preload(): void {
  for (const [assetKey, path] of Object.entries(ASSET_PATHS)) {
    this.load.image(assetKey, path);
  }
}
```

- [ ] **Step 4: Replace terrain rectangles with proof images**

Inside `refresh()`:

```ts
const terrain = resolveTerrainAssets(state.mapId);
```

For each map cell:

```ts
const texture = isWall ? terrain.wall : terrain.floor;
this.add
  .image(x * TILE_SIZE, y * TILE_SIZE, texture)
  .setOrigin(0)
  .setDisplaySize(TILE_SIZE, TILE_SIZE);
```

- [ ] **Step 5: Render proof entities while preserving the legacy fallback only for unconverted entities**

Use:

```ts
const collected = new Set(state.openedRewardIds);
const defeated = new Set(state.defeatedEnemyIds);
const opened = new Set(state.openedShortcutIds);

for (const entity of map.entities) {
  if (entity.kind === 'enemy' && defeated.has(entity.id)) continue;
  if (entity.kind === 'latch' && opened.has(entity.id)) continue;

  const assetKey = resolveEntityAsset(entity, state);
  if (assetKey) {
    this.add
      .image(
        (entity.tile.x + 0.5) * TILE_SIZE,
        (entity.tile.y + 1) * TILE_SIZE,
        assetKey,
      )
      .setOrigin(0.5, 1);
    continue;
  }

  if (entity.kind === 'reward' && collected.has(entity.id)) continue;

  this.add
    .text(
      (entity.tile.x + 0.5) * TILE_SIZE,
      (entity.tile.y + 1) * TILE_SIZE,
      entity.assetId ?? entity.kind,
      { fontSize: '10px', color: '#ffdd66' },
    )
    .setOrigin(0.5, 1);
}
```

Do not rebuild the old `resolveAssetId` helper. The fallback exists only inside this temporary proof checkpoint and disappears in Task 5.

- [ ] **Step 6: Render the proof player south still**

Replace `@` with:

```ts
const player = this.add
  .image(
    (state.tile.x + 0.5) * TILE_SIZE,
    (state.tile.y + 1) * TILE_SIZE,
    'player-south',
  )
  .setOrigin(0.5, 1);
```

Do not add facing yet; first validate one stable player image.

- [ ] **Step 7: Verify mechanics before visual judgment**

```bash
bun run typecheck
bun run test:unit
bun run build
bun run test:e2e
```

Expected: all PASS with unchanged gameplay behavior.

- [ ] **Step 8: Evaluate the proof at real scale — hard stop**

Run:

```bash
bun run dev
```

At 100% browser zoom and the real 640×480 canvas verify:

1. player, village guide, and ruin guard silhouettes are distinct;
2. feet/base align to the same logical tile contract as the old placeholders;
3. village and dungeon terrain are immediately distinguishable;
4. relic closed/open states are distinguishable without text or glow alone;
5. important details survive downscale;
6. no character/interactable needs a per-entity offset;
7. no character/interactable is so tall (roughly >2 tiles) that it obscures the board;
8. the treatment can be reproduced for the remaining current-slice assets.

If any criterion fails, regenerate/simplify/recrop and repeat this step. **Do not start Task 4 until all eight pass.**

- [ ] **Step 9: Make the explicit `pixelArt` filtering decision**

The repo currently has:

```ts
pixelArt: true,
```

in `src/phaser/createGame.ts`.

Choose one final behavior from the proof:

- if the approved treatment is intentionally pixel-art-like and nearest-neighbor reads best, keep `pixelArt: true`;
- if the approved treatment is painterly/anime and nearest-neighbor visibly crunches faces/details, set `pixelArt: false` and reload the same proof scenes to verify normal filtering is clearer.

Do not add a toggle or per-texture filtering system.

- [ ] **Step 10: Record the actual proof result and commit**

Update `docs/art/hpa-22-style-guide.md`:

- `Chosen visual treatment` describes the treatment that actually passed;
- `Texture filtering` records `pixelArt: true` or `false` and why;
- rejected directions record what failed at 32 px.

Then:

```bash
git add src/phaser/WorldScene.ts src/phaser/createGame.ts src/game/content/village.ts src/game/content/floor1.ts src/phaser/assets.test.ts docs/art/hpa-22-style-guide.md public/assets
git commit -m "feat: prove generated art in the tower maze runtime"
```

If `createGame.ts` did not change, omit it from `git add`.

---

### Task 4: Generate the remaining current-slice assets and finish the catalog/resolvers

**Files:**
- Create: `public/assets/characters/player-north.png`
- Create: `public/assets/characters/player-east.png`
- Create: `public/assets/characters/player-west.png`
- Create: `public/assets/interactables/stairs-up.png`
- Create: `public/assets/interactables/stairs-down.png`
- Create: `public/assets/interactables/recovery-waystone.png`
- Create: `public/assets/interactables/clue-runes.png`
- Create: `public/assets/interactables/shortcut-gate-closed.png`
- Create: `public/assets/interactables/shortcut-gate-open.png`
- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/assets.test.ts`
- Modify: `docs/art/hpa-22-style-guide.md`

**Interfaces:**
- Consumes: the treatment/filtering/crop rules that passed Task 3.
- Produces: final `ASSET_PATHS`, `resolvePlayerAsset(direction)`, and the same `resolveEntityAsset` algorithm with only recovery/latch safe defaults plus the shortcut open row.

- [ ] **Step 1: Generate the remaining three player stills**

Create north/east/west using the approved south-facing outfit, proportions, camera angle, crop, palette, and bottom-center alignment. Do not add walk-cycle frames.

- [ ] **Step 2: Generate only the remaining current-slice interactables**

Create:

```text
stairs-up.png
stairs-down.png
recovery-waystone.png
clue-runes.png
shortcut-gate-closed.png
shortcut-gate-open.png
```

Do not generate extra regular enemies or ordinary chest art. Those belong to the first content PR that actually uses them.

For the gate pair, keep object identity/camera angle fixed and make open/closed state differ by silhouette/shape.

- [ ] **Step 3: Normalize every new PNG using the proven rules**

Apply the exact crop, transparency, final dimensions, bottom-center anchoring, and filtering assumptions documented in the style guide. If a sprite reads poorly, fix the image rather than adding renderer offsets.

- [ ] **Step 4: Expand `ASSET_PATHS` only with consumed current-slice entries**

Add:

```ts
'player-north': '/assets/characters/player-north.png',
'player-east': '/assets/characters/player-east.png',
'player-west': '/assets/characters/player-west.png',
'stairs-up': '/assets/interactables/stairs-up.png',
'stairs-down': '/assets/interactables/stairs-down.png',
'recovery-waystone': '/assets/interactables/recovery-waystone.png',
'clue-runes': '/assets/interactables/clue-runes.png',
'shortcut-gate-closed': '/assets/interactables/shortcut-gate-closed.png',
'shortcut-gate-open': '/assets/interactables/shortcut-gate-open.png',
```

The final catalog contains no `ruin-stalker`, `ruin-wisp`, or ordinary-chest rows.

- [ ] **Step 5: Add player-facing mapping tests first**

Add failing test:

```ts
it('maps exactly four presentation-only player facings', () => {
  expect(resolvePlayerAsset('north')).toBe('player-north');
  expect(resolvePlayerAsset('south')).toBe('player-south');
  expect(resolvePlayerAsset('east')).toBe('player-east');
  expect(resolvePlayerAsset('west')).toBe('player-west');
});
```

Run:

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL until the mapping exists.

- [ ] **Step 6: Implement the player mapping**

In `assets.ts`:

```ts
import type { Direction } from '../game/types';

const PLAYER_BY_DIRECTION: Record<Direction, AssetKey> = {
  north: 'player-north',
  south: 'player-south',
  east: 'player-east',
  west: 'player-west',
};

export function resolvePlayerAsset(direction: Direction): AssetKey {
  return PLAYER_BY_DIRECTION[direction];
}
```

- [ ] **Step 7: Extend the same open-variant table and safe defaults**

Extend—not replace—`OPEN_VARIANT`:

```ts
const OPEN_VARIANT: Partial<Record<AssetKey, AssetKey>> = {
  'chest-relic-closed': 'chest-relic-open',
  'shortcut-gate-closed': 'shortcut-gate-open',
};
```

Replace only `baseEntityAsset` with:

```ts
function baseEntityAsset(entity: Entity): AssetKey | null {
  if (entity.assetId !== undefined) {
    return explicitAsset(entity.assetId);
  }

  if (entity.kind === 'recovery') return 'recovery-waystone';
  if (entity.kind === 'latch') return 'shortcut-gate-closed';
  return null;
}
```

Keep `resolveEntityAsset` otherwise unchanged from Task 1.

Important properties:

- a typo in an explicit `assetId` returns `null`; it does **not** fall through to a kind default;
- portal, enemy, clue, and reward have no generic art fallback;
- recovery/latch may default because each has exactly one current visual;
- opened reward/latch derive through `OPEN_VARIANT[base] ?? base` rather than a relic hardcode.

- [ ] **Step 8: Add state-behavior tests**

Add:

```ts
it('renders shortcut closed/open through the variant table', () => {
  const latch = findEntityById('floor1-rear-latch');
  if (!latch) throw new Error('floor1-rear-latch missing');

  expect(resolveEntityAsset(latch, INITIAL_GAME_STATE)).toBe(
    'shortcut-gate-closed',
  );
  expect(
    resolveEntityAsset(latch, {
      ...INITIAL_GAME_STATE,
      openedShortcutIds: [latch.id],
    }),
  ).toBe('shortcut-gate-open');
});

it('has no directional portal fallback', () => {
  const portal = findEntityById('village-to-floor1');
  if (!portal || portal.kind !== 'portal') throw new Error('portal missing');
  expect(
    resolveEntityAsset({ ...portal, assetId: undefined }, INITIAL_GAME_STATE),
  ).toBeNull();
});
```

- [ ] **Step 9: Let existing catalog file coverage expand automatically**

The Task 2 file-existence test iterates `ASSET_PATHS`; no new hand-maintained filename list is added.

Run:

```bash
bunx vitest run src/phaser/assets.test.ts
bun run typecheck
```

Expected: PASS only when every final catalog file exists and all resolver types agree.

- [ ] **Step 10: Extend provenance for each new runtime file and commit**

Update the same style guide with generator/model, date, exact prompt, source/final dimensions, available seed/reference, and processing note.

```bash
git add public/assets src/phaser/assets.ts src/phaser/assets.test.ts docs/art/hpa-22-style-guide.md
git commit -m "art: complete current tower maze asset kit"
```

---

### Task 5: Bind all current content, remove placeholders, and prove resolver coverage from `MAPS`

**Files:**
- Modify: `src/game/content/village.ts`
- Modify: `src/game/content/floor1.ts`
- Modify: `src/game/content/floor2.ts`
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: final catalog/resolvers from Task 4.
- Produces: all-image rendering for every live current HPA-237 entity, transient player facing, and exhaustive current-content/catalog coverage without a per-ID snapshot.

- [ ] **Step 1: Remove the temporary three-ID proof assertion**

Delete Task 3's `binds the three proof entities` test. It is replaced by the generic `MAPS` coverage below.

- [ ] **Step 2: Write the exhaustive current-content tests before completing bindings**

Import `MAPS` from `../game/content` and add:

```ts
it('resolves every live current entity and validates every authored asset id', () => {
  for (const map of Object.values(MAPS)) {
    const state = { ...INITIAL_GAME_STATE, mapId: map.id };

    for (const entity of map.entities) {
      if (entity.assetId !== undefined) {
        expect(
          entity.assetId in ASSET_PATHS,
          `${entity.id} has unknown assetId ${entity.assetId}`,
        ).toBe(true);
      }

      const resolved = resolveEntityAsset(entity, state);
      expect(resolved, `${entity.id} should resolve while live`).not.toBeNull();
      if (resolved) {
        expect(resolved in ASSET_PATHS, `${entity.id} resolved outside catalog`).toBe(
          true,
        );
      }
    }
  }
});
```

Keep the existing focused tests for opened relic, opened shortcut, defeated enemy, unknown explicit ID, terrain, player facing, and file existence.

Run:

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL for current portals/clue that still lack explicit content-specific bindings.

- [ ] **Step 3: Add only required explicit current `assetId` bindings**

Keep proof bindings already added, then add:

```text
village-to-floor1             -> stairs-down
floor1-to-village             -> stairs-up
floor1-front-to-floor2        -> stairs-down
floor1-rear-to-floor2         -> stairs-down
floor1-lower-route-clue       -> clue-runes
floor2-front-to-floor1        -> stairs-up
floor2-rear-to-floor1         -> stairs-up
```

Do not add an explicit ID to `village-recovery` or `floor1-rear-latch`; those are the two intentional single-visual defaults.

Do not alter map rows, coordinates, prose, stats, targets, or progression semantics.

- [ ] **Step 4: Re-run generic catalog/content coverage**

```bash
bunx vitest run src/phaser/assets.test.ts src/game/content.test.ts
```

Expected: PASS. There is no 12-line binding snapshot to maintain.

- [ ] **Step 5: Add transient player facing to `WorldScene`**

Import `Direction` and `resolvePlayerAsset`:

```ts
private playerFacing: Direction = 'south';
```

Update each keydown listener:

```ts
keyboard.on(`keydown-${key}`, () => {
  this.playerFacing = direction;
  this.deps.onInput({ kind: 'move', direction });
});
```

Facing is presentation-only. Reload resetting it to south is correct.

- [ ] **Step 6: Remove all entity text fallback and placeholder hiding logic**

Delete the proof-stage fallback and render only resolver output:

```ts
for (const entity of map.entities) {
  const assetKey = resolveEntityAsset(entity, state);
  if (!assetKey) continue;

  this.add
    .image(
      (entity.tile.x + 0.5) * TILE_SIZE,
      (entity.tile.y + 1) * TILE_SIZE,
      assetKey,
    )
    .setOrigin(0.5, 1);
}
```

Do not pre-hide opened rewards or opened latches. The resolver deliberately leaves their open variant visible. Defeated enemies return `null` and disappear.

- [ ] **Step 7: Render the player through the directional mapping**

```ts
const player = this.add
  .image(
    (state.tile.x + 0.5) * TILE_SIZE,
    (state.tile.y + 1) * TILE_SIZE,
    resolvePlayerAsset(this.playerFacing),
  )
  .setOrigin(0.5, 1);
```

No walk animation or durable facing field is added.

- [ ] **Step 8: Run the automated regression gate**

```bash
bun run typecheck
bun run lint
bun run test:unit
bun run build
bun run test:e2e
```

Expected: all PASS.

- [ ] **Step 9: Manually verify the two new overlap cases and final art states**

Run:

```bash
bun run dev
```

Verify in the real game:

1. recovery, guide, stairs, clue, gate, relic, and guard are recognizable;
2. arrow input changes player north/south/east/west stills;
3. collecting the relic leaves the open relic sprite while the tile remains walkable;
4. walk the player **onto the open relic tile** and confirm both player and open relic remain readable;
5. opening the shortcut leaves the open gate sprite while the tile remains walkable;
6. walk the player **onto the open gate tile** and confirm both player and gate remain readable;
7. defeating the gatekeeper removes its sprite;
8. camera follow and gameplay interactions remain unchanged.

If overlap is muddy, recrop/simplify the PNG or transparent padding. Do not add per-entity offsets, z-order exceptions, or collision changes merely to compensate for the asset.

- [ ] **Step 10: Commit**

```bash
git add src/game/content/village.ts src/game/content/floor1.ts src/game/content/floor2.ts src/phaser/WorldScene.ts src/phaser/assets.test.ts public/assets
git commit -m "feat: replace vertical slice placeholders with generated art"
```

---

### Task 6: Verify real asset serving and complete the HPA-22 delivery gate

**Files:**
- Modify: `tests/e2e/cross-floor.spec.ts`
- Modify: `docs/art/hpa-22-style-guide.md` only if final runtime inspection changes a documented crop/filtering rule.

**Interfaces:**
- Consumes: final `ASSET_PATHS` and the real Vite server.
- Produces: HTTP evidence that every catalog PNG is served while the existing gameplay journey still passes.

- [ ] **Step 1: Add the catalog-serving smoke test**

Import:

```ts
import { ASSET_PATHS } from '../../src/phaser/assets';
```

Add:

```ts
test('serves every runtime image in the asset catalog', async ({ request }) => {
  for (const path of Object.values(ASSET_PATHS)) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should be served`).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
  }
});
```

This tests the existing public HTTP surface. Do not add a game test API or Vite plugin.

- [ ] **Step 2: Run the full local gate**

```bash
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run build
bun run test:e2e
```

Expected: every command PASS.

- [ ] **Step 3: Capture implementation-PR review evidence from the real game**

Attach screenshots to the implementation PR description/comment showing:

1. village corner with player + village guide;
2. dungeon area with ruin guard + clue treatment;
3. relic closed and open;
4. shortcut gate closed and open;
5. player/NPC/enemy together at normal gameplay scale.

Do not create a committed screenshot corpus or visual-regression framework.

- [ ] **Step 4: Audit final diff against the narrowed HPA-22 scope**

Confirm the implementation PR states:

- proof sample was integrated/evaluated before remaining art generation;
- final filtering choice is recorded and matches `createGame.ts`;
- all HPA-237 vertical-slice placeholders are replaced;
- all current live entities resolve through the catalog and all catalog files exist/serve;
- open relic/gate remain readable while occupied by the player;
- prompt/style/provenance notes are committed;
- no speculative extra enemies or ordinary chests were generated;
- no HPA-235 content, portrait system, animation system, auto-tiler, atlas, asset manager, build plugin, or domain-state change was added.

- [ ] **Step 5: Commit final browser coverage**

```bash
git add tests/e2e/cross-floor.spec.ts docs/art/hpa-22-style-guide.md
git commit -m "test: verify runtime asset delivery"
```

---

## Final Verification

Before marking HPA-22 implementation ready for review, run:

```bash
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run build
bun run test:e2e
```

Expected: all commands pass; mechanics are unchanged; every current live entity resolves; every catalog PNG exists and is served; no unused speculative art was added; the selected art/filtering remains readable at the real 32 px logical tile scale.

## Implementation Handoff

Execute this plan on the same HPA-22 branch/PR. Recommended workflow: `superpowers:subagent-driven-development`.

The hard execution checkpoint is Task 3: do not begin Task 4 until the proof sample passes at real gameplay scale and the `pixelArt` filtering choice is recorded.
