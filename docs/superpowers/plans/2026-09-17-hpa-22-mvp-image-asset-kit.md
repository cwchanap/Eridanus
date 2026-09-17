# HPA-22 Reusable MVP Image Asset Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HPA-237 placeholder rendering with the smallest generated runtime art kit actually consumed by the current village → Floor 1 → Floor 2 slice, prove it at real gameplay scale, and leave later content a stable extension seam.

**Architecture:** Gameplay/domain code remains unchanged. Processed PNGs live under `public/assets`; one explicit `src/phaser/assets.ts` catalog owns runtime paths, terrain/player mappings, the two-row open-state table, and a fail-closed entity resolver. `WorldScene` preloads/renders images and owns transient facing only. Fast tests enforce catalog bindings, open-state variants, file existence, and PNG dimensions; Playwright verifies real Vite serving.

**Tech Stack:** Bun 1.4.2, Vite 8, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, generated PNG assets.

**Spec:** `docs/superpowers/specs/2026-09-17-hpa-22-mvp-image-asset-kit-design.md`

## Global Constraints

- Deliver HPA-22 as one implementation PR; proof, generation, integration, and validation stay in that PR.
- Generate only assets consumed by the current HPA-237 slice. Do not pre-generate spare enemies, ordinary chests, portraits, or later-floor props.
- `TILE_SIZE` remains exactly `32`.
- Tile coordinates remain the only collision/interaction geometry.
- `src/game/` remains Phaser-free and does not import `AssetKey` or `ASSET_PATHS`.
- `BaseEntity.assetId?: string` remains unchanged.
- `MapDefinition.layout` remains ASCII `#` / `.` geometry.
- Do not add an atlas pipeline, auto-tiler, animation registry, generic asset manager, portrait framework, UI framework, image build plugin, or runtime PNG parser.
- Do not add entity kinds, durable state fields, save migrations, quests, inventory, keys, or gameplay rules.
- Preserve full-redraw `WorldScene`, camera follow, deterministic combat, persistence, and the existing browser journey.
- Unknown explicit asset IDs are development defects and must fail tests rather than silently use a kind fallback.
- Open reward/latch art is derived from existing progression arrays; facing remains transient.
- Terrain PNGs must be exactly `32×32`; every non-terrain runtime PNG must be at most `64×64`.
- The representative proof must pass before producing the remaining current-slice art.
- If a proof category fails twice, simplify that category to a flatter/iconic treatment and make one final pass. Do not ship placeholders.
- Use `docs/art/style-guide.md` as the durable reusable art contract.

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

docs/art/style-guide.md
```

### Modify

- `src/phaser/assets.ts` — explicit catalog, terrain/player maps, open variants, entity resolver, runtime-path helper.
- `src/phaser/assets.test.ts` — resolver, current-content, file-existence, and IHDR dimension coverage.
- `src/phaser/WorldScene.ts` — preload, image rendering, transient facing.
- `src/phaser/createGame.ts` — only if normal filtering wins the proof over the current `pixelArt: true`.
- `src/game/content/village.ts` — explicit content-specific bindings only.
- `src/game/content/floor1.ts` — explicit content-specific bindings only.
- `src/game/content/floor2.ts` — explicit directional portal bindings only.
- `tests/e2e/cross-floor.spec.ts` — catalog HTTP smoke while retaining the existing journey.

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

### 32 px readability

The Task 3 proof is a hard stop. If a category fails twice after regenerate/recrop attempts, simplify it to flat/iconic shapes and perform one final proof pass. Do not enlarge the gameplay grid or add renderer machinery to rescue unsuitable source art.

### Filtering mismatch

`src/phaser/createGame.ts` already has `pixelArt: true`. The proof must explicitly keep nearest-neighbor or switch once to normal filtering; no runtime toggle or per-texture filtering is allowed.

### Binary export dimensions

A regenerated source-resolution image can silently render many tiles tall. Fast tests read only PNG IHDR bytes 16–23: terrain must be exactly `32×32`; every other runtime file must be `≤64×64`. Do not add a PNG dependency or reusable parser.

### Persistent-open-art overlap

Open relic/gate art remains visible on walkable tiles. Task 5 must walk the player onto each and verify the player remains readable. Fix image crop/padding if needed; do not add per-entity offsets.

### Vite public-path mismatch

Files live under `public/assets`, catalog URLs use `/assets/...`. Task 6 verifies every URL with Playwright `request.get`; do not add a build plugin.

### Binding/open-state drift

One `Object.values(MAPS)` loop covers every current entity's live state and every reward/latch opened state. Do not maintain a per-ID snapshot.

---

### Task 1: Add the proof-stage catalog without breaking the existing tree

**Files:**

- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**

- Consumes: `Entity`, `GameState`, `MapId` from `src/game/types.ts`.
- Produces: proof-stage `ASSET_PATHS`, `AssetKey`, `resolveTerrainAssets`, `resolveEntityAsset`, `runtimeAssetFilePath`.
- Preserves: existing `resolveAssetId(entity)` until Task 3 rewrites `WorldScene` and removes its final consumer.

- [ ] **Step 1: Write failing catalog/resolver tests**

Replace the old one-case asset test with:

```ts
import { describe, expect, it } from 'vitest';
import type { EnemyEntity, RewardEntity } from '../game/types';
import { INITIAL_GAME_STATE } from '../game/state';
import {
  ASSET_PATHS,
  TILE_SIZE,
  resolveEntityAsset,
  resolveTerrainAssets,
} from './assets';

const testReward: RewardEntity = {
  kind: 'reward',
  id: 'test-reward',
  tile: { x: 1, y: 1 },
  assetId: 'chest-relic-closed',
  stat: 'attack',
  amount: 1,
};

const testEnemy: EnemyEntity = {
  kind: 'enemy',
  id: 'test-enemy',
  tile: { x: 1, y: 1 },
  assetId: 'enemy-ruin-guard',
  stats: { hp: 1, attack: 1, defense: 0 },
};

describe('asset seam', () => {
  it('keeps the 32px logical tile and maps every current map terrain', () => {
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

  it('uses the open variant for an opened reward', () => {
    expect(resolveEntityAsset(testReward, INITIAL_GAME_STATE)).toBe(
      'chest-relic-closed',
    );
    expect(
      resolveEntityAsset(testReward, {
        ...INITIAL_GAME_STATE,
        openedRewardIds: [testReward.id],
      }),
    ).toBe('chest-relic-open');
  });

  it('removes defeated enemies', () => {
    expect(resolveEntityAsset(testEnemy, INITIAL_GAME_STATE)).toBe(
      'enemy-ruin-guard',
    );
    expect(
      resolveEntityAsset(testEnemy, {
        ...INITIAL_GAME_STATE,
        defeatedEnemyIds: [testEnemy.id],
      }),
    ).toBeNull();
  });

  it('fails closed for an unknown explicit id', () => {
    expect(
      resolveEntityAsset(
        { ...testEnemy, assetId: 'typo-not-in-catalog' },
        INITIAL_GAME_STATE,
      ),
    ).toBeNull();
  });

  it('keeps every catalog URL under /assets', () => {
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

Expected: FAIL because the explicit catalog/resolvers do not exist.

- [ ] **Step 3: Extend `src/phaser/assets.ts`; do not remove `resolveAssetId` yet**

Keep these existing exports intact:

```ts
export const TILE_SIZE = 32;

export function resolveAssetId(entity: Entity): string {
  return entity.assetId ?? entity.kind;
}
```

Add beside them:

```ts
import type { Entity, GameState, MapId } from '../game/types';

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

function explicitAsset(assetId: string | undefined): AssetKey | null {
  if (assetId === undefined) return null;
  return assetId in ASSET_PATHS ? (assetId as AssetKey) : null;
}

function baseEntityAsset(entity: Entity): AssetKey | null {
  return explicitAsset(entity.assetId);
}

export function resolveTerrainAssets(mapId: MapId): TerrainAssets {
  return TERRAIN_BY_MAP[mapId];
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

  const opened =
    (entity.kind === 'reward' && state.openedRewardIds.includes(entity.id)) ||
    (entity.kind === 'latch' && state.openedShortcutIds.includes(entity.id));

  return opened ? (OPEN_VARIANT[base] ?? base) : base;
}

export function runtimeAssetFilePath(assetKey: AssetKey): string {
  return `public${ASSET_PATHS[assetKey]}`;
}
```

Do not add a kind-to-art switch.

- [ ] **Step 4: Verify the tree still compiles**

```bash
bunx vitest run src/phaser/assets.test.ts
bun run typecheck
```

Expected: both PASS. `WorldScene` still compiles because `resolveAssetId` remains available.

- [ ] **Step 5: Commit**

```bash
git add src/phaser/assets.ts src/phaser/assets.test.ts
git commit -m "feat: define HPA-22 proof asset seam"
```

---

### Task 2: Generate the representative proof sample and enforce binary size contracts

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
- Create: `docs/art/style-guide.md`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**

- Consumes: proof paths from `ASSET_PATHS`.
- Produces: nine proof PNGs plus the durable style guide.

- [ ] **Step 1: Generate only the proof sample**

Use shared prompt language:

```text
Top-down fantasy game asset for a compact grid-maze browser game, clear anime influence,
strong readable silhouette, restrained detail that survives downscaling, clean lighting,
transparent background for characters/interactables, no text, no UI border, no external
shadow, consistent game-art treatment.
```

Category variants:

```text
Village terrain: warm inhabited stone/wood language, simple repeatable 32×32 tile.
Dungeon terrain: cool ancient ruin language, slate/blue-gray stone, simple repeatable 32×32 tile.
Characters/enemy: one-tile logical footprint, feet centered at bottom, top-down/three-quarter view.
Relic pair: same object identity/camera angle; open state differs by silhouette, not glow alone.
```

- [ ] **Step 2: Process selected outputs**

For each selected image:

1. remove opaque background for non-terrain art;
2. crop transparent padding without clipping silhouette;
3. align character/interactable base to bottom-center;
4. export terrain exactly `32×32`;
5. export every non-terrain file no larger than `64×64`;
6. keep terrain edges repeatable;
7. save to the exact `ASSET_PATHS` path.

Do not add an image-processing script unless repeated manual processing becomes a demonstrated bottleneck.

- [ ] **Step 3: Add one catalog file + IHDR dimension test**

Append:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeAssetFilePath } from './assets';

it('ships catalog files at bounded runtime dimensions', () => {
  const keys = Object.keys(ASSET_PATHS) as (keyof typeof ASSET_PATHS)[];

  for (const key of keys) {
    const file = resolve(runtimeAssetFilePath(key));
    expect(existsSync(file), `${key} file missing`).toBe(true);

    const png = readFileSync(file);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    if (key.startsWith('terrain-')) {
      expect([width, height], `${key} must be exactly one tile`).toEqual([
        32, 32,
      ]);
    } else {
      expect(width, `${key} wider than two tiles`).toBeLessThanOrEqual(64);
      expect(height, `${key} taller than two tiles`).toBeLessThanOrEqual(64);
    }
  }
});
```

This fixed-header read is test-only. Do not extract a generic PNG utility or add a dependency.

- [ ] **Step 4: Run the proof catalog test**

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: PASS only when every proof file exists and satisfies its dimension contract.

- [ ] **Step 5: Create the durable style guide**

Create `docs/art/style-guide.md` with:

```markdown
# Eridanus Art Style Guide

## Runtime scale

## Chosen visual treatment

## Texture filtering

## Shared prompt language

## Village guidance

## Dungeon guidance

## Character and enemy guidance

## Interactable guidance

## Transparency, crop, and bottom-center anchoring

## Rejected proof directions

## Selected asset prompt variants
```

Before the proof is judged, `Chosen visual treatment` and `Texture filtering` state that the decision is pending Task 3 evaluation.

Under `Selected asset prompt variants`, keep one line per selected asset containing only:

```text
asset key — generator/model — prompt variant relative to the shared prompt
```

Do not record generation dates, seeds, or source dimensions.

- [ ] **Step 6: Commit**

```bash
git add public/assets docs/art/style-guide.md src/phaser/assets.test.ts
git commit -m "art: add HPA-22 visual proof sample"
```

---

### Task 3: Integrate only the proof visuals and pass the hard visual/filtering gate

**Files:**

- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/phaser/createGame.ts` only if normal filtering wins.
- Modify: `src/game/content/village.ts`
- Modify: `src/game/content/floor1.ts`
- Modify: `docs/art/style-guide.md`

**Interfaces:**

- Consumes: proof catalog/resolver and optional authored `assetId`.
- Produces: a playable proof checkpoint with terrain, south-facing player, village guide, relic, and ruin guard art. Unbound current entities intentionally render nothing at this checkpoint.

- [ ] **Step 1: Bind the three content-specific proof entities**

Add only:

```ts
// village-tower-lead
assetId: 'npc-village-guide',

// floor1-power-core
assetId: 'chest-relic-closed',

// floor1-gatekeeper
assetId: 'enemy-ruin-guard',
```

Do not add a temporary three-ID binding test. Task 5's generalized `MAPS` loop is the durable content coverage.

- [ ] **Step 2: Preload the proof catalog**

In `WorldScene` import `ASSET_PATHS`, `resolveTerrainAssets`, and `resolveEntityAsset`, then add:

```ts
preload(): void {
  for (const [assetKey, path] of Object.entries(ASSET_PATHS)) {
    this.load.image(assetKey, path);
  }
}
```

- [ ] **Step 3: Replace terrain rectangles with images**

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

- [ ] **Step 4: Replace entity text rendering with resolver-only image rendering**

Use:

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

There is no temporary legacy fallback. At the proof checkpoint, unbound portals/recovery/latch/clue simply have no sprite while their gameplay behavior remains unchanged.

- [ ] **Step 5: Render the south-facing proof player**

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

- [ ] **Step 6: Remove the now-unused placeholder helper**

Delete `resolveAssetId` from `src/phaser/assets.ts` and remove its `WorldScene` import in the same commit. It was intentionally retained through Task 1 so every prior commit compiled.

- [ ] **Step 7: Verify mechanics before judging art**

```bash
bun run typecheck
bun run test:unit
bun run build
bun run test:e2e
```

Expected: all PASS. The hidden/unbound proof-checkpoint sprites do not change domain interactions.

- [ ] **Step 8: Evaluate the proof at real scale**

Run:

```bash
bun run dev
```

At 100% browser zoom and the real 640×480 canvas verify:

1. player, guide, and guard silhouettes are distinct;
2. bases align to the logical tile;
3. village/dungeon terrain are clearly different;
4. relic closed/open differ by silhouette/shape;
5. important detail survives gameplay scale;
6. no asset needs a per-entity offset;
7. the treatment remains readable under the dimension limits;
8. the treatment is reproducible for the remaining current-slice assets.

For a failing category:

- regeneration/recrop round 1;
- regeneration/recrop round 2;
- if still failing, switch that category to a flatter/iconic treatment with less detail and perform one final pass.

Do not proceed to Task 4 until the proof passes. Do not ship a placeholder as the off-ramp.

- [ ] **Step 9: Decide texture filtering once**

The current game uses:

```ts
pixelArt: true,
```

Keep it if nearest-neighbor is clearer for the chosen treatment. If painterly/anime art is materially clearer with normal filtering, change it to:

```ts
pixelArt: false,
```

Reload the same proof scenes after the change. Do not add a runtime toggle.

- [ ] **Step 10: Record the proof result and commit**

Update `docs/art/style-guide.md` with:

- chosen treatment;
- final `pixelArt` value and reason;
- any rejected direction and what failed at 32 px;
- final crop/anchoring guidance.

Then:

```bash
git add src/phaser/assets.ts src/phaser/WorldScene.ts src/phaser/createGame.ts src/game/content/village.ts src/game/content/floor1.ts docs/art/style-guide.md public/assets
git commit -m "feat: prove generated art in the tower maze runtime"
```

If `createGame.ts` did not change, omit it from `git add`.

---

### Task 4: Generate the remaining current-slice art and finish catalog semantics

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
- Modify: `docs/art/style-guide.md`

**Interfaces:**

- Consumes: treatment/filtering/crop rules that passed Task 3.
- Produces: final `ASSET_PATHS`, `resolvePlayerAsset`, recovery/latch safe defaults, and both open-variant rows.

- [ ] **Step 1: Generate only the remaining consumed images**

Create the three missing player directions plus stairs up/down, recovery waystone, clue runes, and shortcut gate closed/open.

Do not generate ordinary chests or spare enemies.

- [ ] **Step 2: Normalize and verify dimensions**

Apply the exact style-guide rules. Terrain remains `32×32`; every non-terrain file remains `≤64×64`. Fix the image rather than adding offsets.

- [ ] **Step 3: Expand `ASSET_PATHS`**

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

- [ ] **Step 4: Write the player-facing and safe-default tests**

Add:

```ts
it('maps exactly four presentation-only player facings', () => {
  expect(resolvePlayerAsset('north')).toBe('player-north');
  expect(resolvePlayerAsset('south')).toBe('player-south');
  expect(resolvePlayerAsset('east')).toBe('player-east');
  expect(resolvePlayerAsset('west')).toBe('player-west');
});

it('does not invent art for an unbound directional portal', () => {
  const portal = {
    kind: 'portal' as const,
    id: 'test-portal',
    tile: { x: 1, y: 1 },
    target: { mapId: 'floor1' as const, tile: { x: 1, y: 1 } },
  };
  expect(resolveEntityAsset(portal, INITIAL_GAME_STATE)).toBeNull();
});
```

- [ ] **Step 5: Implement the player mapping and final open/default tables**

Add:

```ts
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

Extend `OPEN_VARIANT` to its final two rows:

```ts
const OPEN_VARIANT: Partial<Record<AssetKey, AssetKey>> = {
  'chest-relic-closed': 'chest-relic-open',
  'shortcut-gate-closed': 'shortcut-gate-open',
};
```

Change only `baseEntityAsset`:

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

Portal, enemy, clue, and reward retain no generic kind fallback.

- [ ] **Step 6: Re-run catalog/file/dimension tests**

The Task 2 loop automatically covers every newly added catalog file.

```bash
bunx vitest run src/phaser/assets.test.ts
bun run typecheck
```

Expected: PASS only when all final catalog files exist, fit the dimension contract, and resolver types agree.

- [ ] **Step 7: Extend durable style notes and commit**

Add one model + prompt-variant line for each new asset; do not add dates, seeds, or source dimensions.

```bash
git add public/assets src/phaser/assets.ts src/phaser/assets.test.ts docs/art/style-guide.md
git commit -m "art: complete current tower maze asset kit"
```

---

### Task 5: Bind all current content and enforce live/open coverage from `MAPS`

**Files:**

- Modify: `src/game/content/village.ts`
- Modify: `src/game/content/floor1.ts`
- Modify: `src/game/content/floor2.ts`
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**

- Consumes: final catalog/resolvers from Task 4.
- Produces: every current live entity rendered through images, transient directional player art, and one generalized content/catalog test covering live and opened states.

- [ ] **Step 1: Write the generalized `MAPS` coverage first**

Import `MAPS` and add:

```ts
it('resolves every current entity including open-state variants', () => {
  for (const map of Object.values(MAPS)) {
    const state = { ...INITIAL_GAME_STATE, mapId: map.id };

    for (const entity of map.entities) {
      if (entity.assetId !== undefined) {
        expect(
          entity.assetId in ASSET_PATHS,
          `${entity.id} has unknown assetId ${entity.assetId}`,
        ).toBe(true);
      }

      const closed = resolveEntityAsset(entity, state);
      expect(closed, `${entity.id} should resolve while live`).not.toBeNull();
      if (closed) {
        expect(
          closed in ASSET_PATHS,
          `${entity.id} resolved outside catalog`,
        ).toBe(true);
      }

      if (entity.kind === 'reward' || entity.kind === 'latch') {
        const openedState =
          entity.kind === 'reward'
            ? { ...state, openedRewardIds: [entity.id] }
            : { ...state, openedShortcutIds: [entity.id] };
        const open = resolveEntityAsset(entity, openedState);

        expect(open, `${entity.id} has no open art`).not.toBeNull();
        expect(open, `${entity.id} open art is identical to closed`).not.toBe(
          closed,
        );
        if (open) {
          expect(
            open in ASSET_PATHS,
            `${entity.id} open art outside catalog`,
          ).toBe(true);
        }
      }

      if (entity.kind === 'enemy') {
        expect(
          resolveEntityAsset(entity, {
            ...state,
            defeatedEnemyIds: [entity.id],
          }),
        ).toBeNull();
      }
    }
  }
});
```

This replaces per-ID open-state/binding snapshots.

- [ ] **Step 2: Run the focused test and verify missing bindings fail**

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL for current portals/clue that do not yet have explicit content-specific art IDs.

- [ ] **Step 3: Add the missing explicit current bindings**

Keep the three proof bindings and add:

```text
village-to-floor1             -> stairs-down
floor1-to-village             -> stairs-up
floor1-front-to-floor2        -> stairs-down
floor1-rear-to-floor2         -> stairs-down
floor1-lower-route-clue       -> clue-runes
floor2-front-to-floor1        -> stairs-up
floor2-rear-to-floor1         -> stairs-up
```

Do not add explicit IDs to `village-recovery` or `floor1-rear-latch`; those intentionally use the two safe single-visual defaults.

Do not alter layout rows, coordinates, text, stats, targets, or progression semantics.

- [ ] **Step 4: Re-run generalized coverage**

```bash
bunx vitest run src/phaser/assets.test.ts src/game/content.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add transient player facing**

Import `Direction` and `resolvePlayerAsset`, then add:

```ts
private playerFacing: Direction = 'south';
```

Update each movement listener:

```ts
keyboard.on(`keydown-${key}`, () => {
  this.playerFacing = direction;
  this.deps.onInput({ kind: 'move', direction });
});
```

Render the player with:

```ts
const player = this.add
  .image(
    (state.tile.x + 0.5) * TILE_SIZE,
    (state.tile.y + 1) * TILE_SIZE,
    resolvePlayerAsset(this.playerFacing),
  )
  .setOrigin(0.5, 1);
```

Do not persist facing.

- [ ] **Step 6: Run mechanics/build/browser regression checks**

```bash
bun run typecheck
bun run test:unit
bun run build
bun run test:e2e
```

Expected: all PASS.

- [ ] **Step 7: Verify persistent-open overlap in the real game**

Run:

```bash
bun run dev
```

Verify:

1. every current entity is visibly represented;
2. player facing changes north/south/east/west;
3. collected relic remains visibly open and its tile is walkable;
4. opened shortcut remains visibly open and its tile is walkable;
5. player standing on the open relic tile remains readable;
6. player standing on the open gate tile remains readable;
7. defeated gatekeeper disappears;
8. camera follow and interactions remain unchanged.

If overlap is unclear, recrop/simplify the PNG. Do not add per-entity offsets.

- [ ] **Step 8: Commit**

```bash
git add src/game/content/village.ts src/game/content/floor1.ts src/game/content/floor2.ts src/phaser/WorldScene.ts src/phaser/assets.test.ts public/assets
git commit -m "feat: replace tower maze placeholders with generated art"
```

---

### Task 6: Verify real asset serving and finish the implementation gate

**Files:**

- Modify: `tests/e2e/cross-floor.spec.ts`
- Modify: `docs/art/style-guide.md` only if final runtime inspection changes a durable rule.

**Interfaces:**

- Consumes: final `ASSET_PATHS` and the real Vite dev server.
- Produces: HTTP evidence that every catalog image is actually served alongside the unchanged player journey.

- [ ] **Step 1: Add the asset-serving smoke test**

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

- [ ] **Step 3: Capture review screenshots**

Attach real-game screenshots to the implementation PR showing:

1. village proof scene with player + guide;
2. dungeon proof scene with guard;
3. relic closed/open;
4. shortcut gate closed/open;
5. player overlapping the opened relic/gate visuals at normal gameplay scale.

Do not add committed screenshot fixtures or visual-regression tooling.

- [ ] **Step 4: Commit browser coverage**

```bash
git add tests/e2e/cross-floor.spec.ts docs/art/style-guide.md
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

Expected result: all commands pass; mechanics remain unchanged; every catalog PNG exists, satisfies the runtime dimension contract, and is served by Vite; every current live/open visual resolves through the catalog; the real game remains readable at 32 px logical scale.

## Implementation Handoff

Execute this plan on the same HPA-22 branch/PR. Recommended workflow: `superpowers:subagent-driven-development`. The hard checkpoint is Task 3: do not produce the remaining current-slice art until the proof treatment and filtering choice pass in the real game.
