# HPA-22 Reusable MVP Image Asset Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HPA-237 placeholder rendering with a small generated, runtime-ready visual kit that proves Eridanus's art direction at real gameplay scale and gives later Floor 1–3 tickets stable asset conventions.

**Architecture:** Keep gameplay/domain code unchanged. Store processed PNGs in `public/assets`, declare every runtime image in one explicit catalog in `src/phaser/assets.ts`, preload them in the existing `WorldScene`, and derive terrain/entity/player texture keys from authored content plus current `GameState`. Facing and open/closed visuals remain presentation-only state.

**Tech Stack:** Bun 1.4.2, Vite 8, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, generated PNG assets.

**Spec:** `docs/superpowers/specs/2026-09-17-hpa-22-mvp-image-asset-kit-design.md`

## Global Constraints

- This is one HPA-22 implementation PR; do not split proof, generation, and integration into separate PRs.
- HPA-22 is the standalone image-generation/art-production task. Do not pull HPA-235 village/Floor 1 content expansion into this PR.
- `TILE_SIZE` stays exactly `32`.
- Tile coordinates remain the only collision/interaction geometry.
- `src/game/` remains Phaser-free and must not import `AssetKey` or `ASSET_PATHS`.
- `MapDefinition.layout` remains ASCII `#` / `.` geometry.
- No atlas pipeline, auto-tiler, animation registry, generic asset manager, portrait framework, or new UI framework.
- No new entity kinds, durable state fields, save migrations, quests, inventory, keys, or gameplay rules.
- Generate the representative proof sample first and evaluate it in the real game before producing the full kit.
- Commit only selected processed runtime PNGs plus compact style/provenance notes; do not commit large discarded source generations.
- Preserve the existing real-player Playwright journey and existing CI shape.

---

## File Structure

### Create

- `public/assets/terrain/village-floor.png` — shared village ground tile.
- `public/assets/terrain/village-wall.png` — shared village blocking tile.
- `public/assets/terrain/dungeon-floor.png` — shared ruin ground tile.
- `public/assets/terrain/dungeon-wall.png` — shared ruin blocking tile.
- `public/assets/characters/player-north.png` — north-facing player still.
- `public/assets/characters/player-south.png` — south-facing player still.
- `public/assets/characters/player-east.png` — east-facing player still.
- `public/assets/characters/player-west.png` — west-facing player still.
- `public/assets/characters/npc-village-guide.png` — integrated current village clue/NPC baseline.
- `public/assets/enemies/ruin-guard.png` — integrated Floor 1 gatekeeper baseline.
- `public/assets/enemies/ruin-stalker.png` — reusable regular-enemy baseline.
- `public/assets/enemies/ruin-wisp.png` — reusable regular-enemy baseline.
- `public/assets/interactables/stairs-up.png` — upward/return stair treatment.
- `public/assets/interactables/stairs-down.png` — downward/deeper stair treatment.
- `public/assets/interactables/recovery-waystone.png` — village recovery point.
- `public/assets/interactables/clue-runes.png` — dungeon clue/landmark treatment.
- `public/assets/interactables/shortcut-gate-closed.png` — closed rear-openable shortcut.
- `public/assets/interactables/shortcut-gate-open.png` — opened, non-blocking shortcut visual.
- `public/assets/interactables/chest-ordinary-closed.png` — reusable ordinary treasure closed state.
- `public/assets/interactables/chest-ordinary-open.png` — reusable ordinary treasure open state.
- `public/assets/interactables/chest-relic-closed.png` — current important reward closed state.
- `public/assets/interactables/chest-relic-open.png` — current important reward collected/open state.
- `docs/art/hpa-22-style-guide.md` — final scale/style/prompt/provenance contract after proof evaluation.

### Modify

- `src/phaser/assets.ts` — explicit catalog, terrain resolution, player-facing resolution, state-aware entity visual resolution, catalog-path helper.
- `src/phaser/assets.test.ts` — asset seam, render-state, and committed-file coverage.
- `src/phaser/WorldScene.ts` — preload catalog, track transient facing, render images instead of placeholder rectangles/text.
- `src/game/content/village.ts` — bind current village entities to stable visual IDs only.
- `src/game/content/floor1.ts` — bind current Floor 1 entities to stable visual IDs only.
- `src/game/content/floor2.ts` — bind current Floor 2 portals to stable visual IDs only.
- `tests/e2e/cross-floor.spec.ts` — preserve gameplay journey and add a narrow runtime-asset serving smoke test.

### Do Not Modify

- `src/game/types.ts` — no new durable/content contracts are required.
- `src/game/actions.ts`, `movement.ts`, `combat.ts`, `session.ts`, `save.ts` — HPA-22 does not change rules.
- `src/ui/InteractionOverlay.ts` — no portrait/UI framework is introduced.

---

### Task 1: Lock the explicit asset catalog and presentation resolvers

**Files:**
- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: `MapId`, `Entity`, `GameState`, `Direction` from `src/game/types.ts`.
- Produces: `ASSET_PATHS`, `AssetKey`, `resolveTerrainAssets(mapId)`, `resolvePlayerAsset(direction)`, `resolveEntityAsset(entity, state)`, and `runtimeAssetFilePath(assetKey)`.

- [ ] **Step 1: Replace the current single seam test with failing catalog/resolver tests**

Write tests with the following behavior:

```ts
import { describe, expect, it } from 'vitest';
import { findEntityById } from '../game/content';
import { INITIAL_GAME_STATE } from '../game/state';
import {
  ASSET_PATHS,
  TILE_SIZE,
  resolveEntityAsset,
  resolvePlayerAsset,
  resolveTerrainAssets,
} from './assets';

describe('asset seam', () => {
  it('keeps the 32px logical tile and maps every current map to terrain', () => {
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

  it('maps four presentation-only player facings to explicit assets', () => {
    expect(resolvePlayerAsset('north')).toBe('player-north');
    expect(resolvePlayerAsset('south')).toBe('player-south');
    expect(resolvePlayerAsset('east')).toBe('player-east');
    expect(resolvePlayerAsset('west')).toBe('player-west');
  });

  it('renders current reward and shortcut in closed/open states without new domain flags', () => {
    const reward = findEntityById('floor1-power-core');
    const latch = findEntityById('floor1-rear-latch');
    if (!reward || !latch) throw new Error('required HPA-237 entities missing');

    expect(resolveEntityAsset(reward, INITIAL_GAME_STATE)).toBe(
      'chest-relic-closed',
    );
    expect(
      resolveEntityAsset(reward, {
        ...INITIAL_GAME_STATE,
        openedRewardIds: [reward.id],
      }),
    ).toBe('chest-relic-open');

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

  it('removes defeated enemies from presentation', () => {
    const enemy = findEntityById('floor1-gatekeeper');
    if (!enemy) throw new Error('gatekeeper missing');
    expect(
      resolveEntityAsset(enemy, {
        ...INITIAL_GAME_STATE,
        defeatedEnemyIds: [enemy.id],
      }),
    ).toBeNull();
  });

  it('catalogs every key returned by the current resolvers', () => {
    for (const key of [
      resolvePlayerAsset('north'),
      resolvePlayerAsset('south'),
      resolvePlayerAsset('east'),
      resolvePlayerAsset('west'),
      resolveTerrainAssets('village').floor,
      resolveTerrainAssets('village').wall,
      resolveTerrainAssets('floor1').floor,
      resolveTerrainAssets('floor1').wall,
    ]) {
      expect(ASSET_PATHS[key]).toMatch(/^\/assets\//);
    }
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL because the new catalog/resolver exports do not exist yet.

- [ ] **Step 3: Implement the minimal explicit catalog and resolvers**

Use this concrete shape in `src/phaser/assets.ts`:

```ts
import type { Direction, Entity, GameState, MapId } from '../game/types';

export const TILE_SIZE = 32;

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
  'enemy-ruin-stalker': '/assets/enemies/ruin-stalker.png',
  'enemy-ruin-wisp': '/assets/enemies/ruin-wisp.png',
  'stairs-up': '/assets/interactables/stairs-up.png',
  'stairs-down': '/assets/interactables/stairs-down.png',
  'recovery-waystone': '/assets/interactables/recovery-waystone.png',
  'clue-runes': '/assets/interactables/clue-runes.png',
  'shortcut-gate-closed': '/assets/interactables/shortcut-gate-closed.png',
  'shortcut-gate-open': '/assets/interactables/shortcut-gate-open.png',
  'chest-ordinary-closed': '/assets/interactables/chest-ordinary-closed.png',
  'chest-ordinary-open': '/assets/interactables/chest-ordinary-open.png',
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

const PLAYER_BY_DIRECTION: Record<Direction, AssetKey> = {
  north: 'player-north',
  south: 'player-south',
  east: 'player-east',
  west: 'player-west',
};

export function resolveTerrainAssets(mapId: MapId): TerrainAssets {
  return TERRAIN_BY_MAP[mapId];
}

export function resolvePlayerAsset(direction: Direction): AssetKey {
  return PLAYER_BY_DIRECTION[direction];
}

function explicitAsset(assetId: string | undefined): AssetKey | null {
  if (!assetId) return null;
  return assetId in ASSET_PATHS ? (assetId as AssetKey) : null;
}

export function resolveEntityAsset(
  entity: Entity,
  state: GameState,
): AssetKey | null {
  switch (entity.kind) {
    case 'enemy':
      if (state.defeatedEnemyIds.includes(entity.id)) return null;
      return explicitAsset(entity.assetId) ?? 'enemy-ruin-guard';
    case 'reward':
      return state.openedRewardIds.includes(entity.id)
        ? 'chest-relic-open'
        : (explicitAsset(entity.assetId) ?? 'chest-relic-closed');
    case 'latch':
      return state.openedShortcutIds.includes(entity.id)
        ? 'shortcut-gate-open'
        : 'shortcut-gate-closed';
    case 'clue':
      return explicitAsset(entity.assetId) ?? 'clue-runes';
    case 'recovery':
      return explicitAsset(entity.assetId) ?? 'recovery-waystone';
    case 'portal':
      return explicitAsset(entity.assetId) ?? 'stairs-down';
  }
}

export function runtimeAssetFilePath(assetKey: AssetKey): string {
  return `public${ASSET_PATHS[assetKey]}`;
}
```

Do not add a `default` branch to the entity switch; preserve exhaustiveness.

- [ ] **Step 4: Run the focused test**

Run:

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: PASS for resolver behavior. File-existence coverage is added only after the first PNGs exist in Task 2.

- [ ] **Step 5: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/phaser/assets.ts src/phaser/assets.test.ts
git commit -m "feat: define HPA-22 asset catalog"
```

---

### Task 2: Generate and evaluate the visual proof sample before full production

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
- Consumes: exact runtime paths already locked by `ASSET_PATHS`.
- Produces: the approved visual treatment and reproducible prompt/processing rules for Task 3.

- [ ] **Step 1: Generate only the representative sample**

Generate these nine selected runtime concepts before any remaining asset:

```text
terrain/village-floor.png
terrain/village-wall.png
terrain/dungeon-floor.png
terrain/dungeon-wall.png
characters/player-south.png
characters/npc-village-guide.png
enemies/ruin-guard.png
interactables/chest-relic-closed.png
interactables/chest-relic-open.png
```

Use one shared prompt language:

```text
Top-down fantasy game asset for a compact grid-maze browser game, clear anime influence,
strong readable silhouette, restrained detail that survives downscaling, clean lighting,
transparent background for characters/interactables, no text, no UI border, no drop shadow
outside the object, consistent hand-painted/anime game-art treatment.
```

Apply scene-specific guidance:

```text
Village: warm inhabited stone/wood language, welcoming amber warmth, clean shapes.
Dungeon: ancient cool ruin language, slate/blue-gray stone, subtle strange accents, clean shapes.
Characters: one-tile logical footprint, feet centered at bottom, readable from a top-down/three-quarter view.
Chest closed/open pair: identical object identity and angle; open state must read at 32px without relying on glow alone.
```

- [ ] **Step 2: Process selected outputs into runtime PNGs**

For each selected output:

1. remove opaque generation background;
2. crop transparent padding without cutting silhouettes;
3. normalize the bottom-center anchor for characters/interactables;
4. downscale with a high-quality filter to a runtime size that remains readable at a 32 px logical tile;
5. keep terrain tile edges clean enough to repeat without obvious seams;
6. save as transparent PNG at the exact catalog path.

Do not add a preprocessing script unless manual cleanup becomes demonstrably repetitive during this ticket.

- [ ] **Step 3: Add committed-file tests for the proof sample**

Append a filesystem assertion in `src/phaser/assets.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeAssetFilePath } from './assets';

it('ships every cataloged runtime file', () => {
  for (const assetKey of Object.keys(ASSET_PATHS) as (keyof typeof ASSET_PATHS)[]) {
    expect(existsSync(resolve(runtimeAssetFilePath(assetKey)))).toBe(true);
  }
});
```

At this point the test is expected to fail for catalog entries whose full-kit files have not been generated yet. Temporarily narrow the loop to the nine proof keys in the same test so the proof gate can pass without creating fake files:

```ts
const proofKeys = [
  'terrain-village-floor',
  'terrain-village-wall',
  'terrain-dungeon-floor',
  'terrain-dungeon-wall',
  'player-south',
  'npc-village-guide',
  'enemy-ruin-guard',
  'chest-relic-closed',
  'chest-relic-open',
] as const;
```

Task 3 expands this to the complete catalog after the remaining files exist.

- [ ] **Step 4: Create the style/provenance contract from the selected proof**

Write `docs/art/hpa-22-style-guide.md` with these exact sections:

```markdown
# HPA-22 Art Style and Generation Guide

## Runtime scale
## Chosen visual treatment
## Shared prompt language
## Village guidance
## Dungeon guidance
## Character/enemy guidance
## Interactable guidance
## Transparency, crop, and bottom-center anchoring
## Selected proof assets and provenance
## Rejected proof directions
## Rules for later Floor 1–3 assets
```

For each selected proof asset, record:

- runtime asset key/path;
- generator/model name;
- generation date;
- exact prompt used;
- seed/reference identifier when the tool exposes one;
- source dimensions;
- final runtime dimensions;
- one sentence describing cleanup/downscale decisions.

Do not record API keys, auth tokens, or provider credentials.

- [ ] **Step 5: Run proof file tests**

Run:

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: PASS for the resolver tests and the nine proof files.

- [ ] **Step 6: Render the proof sample in the real game for the scale gate**

Use the existing HPA-237 runtime rather than creating a fixture. Temporarily wire the proof textures only as needed on the working branch, run:

```bash
bun run dev
```

Evaluate at 100% browser zoom and the real 640×480 canvas. The proof passes only if:

- player/NPC/enemy silhouettes remain distinct;
- feet/base align to the logical tile;
- village and dungeon terrain read differently;
- relic chest closed/open states read without text;
- no important silhouette/detail turns into unreadable noise after downscale.

If any condition fails, regenerate or simplify the failing asset and update the provenance note before proceeding.

Do not continue to the full kit merely because a high-resolution source looks good.

- [ ] **Step 7: Commit the approved proof sample and style guide**

```bash
git add public/assets docs/art/hpa-22-style-guide.md src/phaser/assets.test.ts
git commit -m "art: establish HPA-22 visual proof"
```

---

### Task 3: Complete the small reusable runtime kit

**Files:**
- Create: remaining PNG paths listed in the File Structure section.
- Modify: `docs/art/hpa-22-style-guide.md`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: approved proof style and fixed `ASSET_PATHS` keys.
- Produces: every cataloged runtime PNG required by the current vertical slice plus the deliberately small shared baseline.

- [ ] **Step 1: Generate the remaining three player directions from the approved player treatment**

Create:

```text
public/assets/characters/player-north.png
public/assets/characters/player-east.png
public/assets/characters/player-west.png
```

Keep outfit, body proportions, palette, camera angle, crop, and bottom-center feet alignment consistent with `player-south.png`. These are still frames only.

- [ ] **Step 2: Generate the remaining regular-enemy baseline**

Create:

```text
public/assets/enemies/ruin-stalker.png
public/assets/enemies/ruin-wisp.png
```

Use the same dungeon palette/shading language as `ruin-guard.png`. They are reusable style baselines and receive no gameplay stats in this ticket.

- [ ] **Step 3: Generate the shared interactables**

Create:

```text
public/assets/interactables/stairs-up.png
public/assets/interactables/stairs-down.png
public/assets/interactables/recovery-waystone.png
public/assets/interactables/clue-runes.png
public/assets/interactables/shortcut-gate-closed.png
public/assets/interactables/shortcut-gate-open.png
public/assets/interactables/chest-ordinary-closed.png
public/assets/interactables/chest-ordinary-open.png
```

For each open/closed pair, preserve object identity and camera angle. The open state must be distinguishable through shape, not only color/glow.

- [ ] **Step 4: Normalize every runtime file using the proof rules**

Apply the same transparency, crop, scale, and anchor decisions documented in `docs/art/hpa-22-style-guide.md`. Do not create a second style guide or alternate runtime sizes for the same asset.

- [ ] **Step 5: Expand provenance notes for every selected runtime asset**

Append one row/entry per new file to `docs/art/hpa-22-style-guide.md` using the same fields established in Task 2.

- [ ] **Step 6: Expand the file-existence test to the complete catalog**

Replace the temporary `proofKeys` check with:

```ts
it('ships every cataloged runtime file', () => {
  const keys = Object.keys(ASSET_PATHS) as (keyof typeof ASSET_PATHS)[];
  for (const assetKey of keys) {
    expect(existsSync(resolve(runtimeAssetFilePath(assetKey)))).toBe(true);
  }
});
```

- [ ] **Step 7: Run the focused test**

Run:

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: PASS with all catalog paths present.

- [ ] **Step 8: Commit**

```bash
git add public/assets docs/art/hpa-22-style-guide.md src/phaser/assets.test.ts
git commit -m "art: complete reusable tower maze asset kit"
```

---

### Task 4: Bind current authored content to explicit art IDs

**Files:**
- Modify: `src/game/content/village.ts`
- Modify: `src/game/content/floor1.ts`
- Modify: `src/game/content/floor2.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: existing `BaseEntity.assetId?: string`; no type/schema change.
- Produces: stable current-content bindings that `resolveEntityAsset` can map to catalog keys.

- [ ] **Step 1: Add failing tests for current content bindings**

Add assertions:

```ts
it('binds the current vertical slice to stable art ids', () => {
  expect(findEntityById('village-recovery')?.assetId).toBe('recovery-waystone');
  expect(findEntityById('village-tower-lead')?.assetId).toBe('npc-village-guide');
  expect(findEntityById('village-to-floor1')?.assetId).toBe('stairs-down');
  expect(findEntityById('floor1-to-village')?.assetId).toBe('stairs-up');
  expect(findEntityById('floor1-lower-route-clue')?.assetId).toBe('clue-runes');
  expect(findEntityById('floor1-power-core')?.assetId).toBe('chest-relic-closed');
  expect(findEntityById('floor1-gatekeeper')?.assetId).toBe('enemy-ruin-guard');
});
```

Also cover the reciprocal Floor 1 ↔ Floor 2 portals:

```ts
expect(findEntityById('floor1-front-to-floor2')?.assetId).toBe('stairs-down');
expect(findEntityById('floor2-front-to-floor1')?.assetId).toBe('stairs-up');
expect(findEntityById('floor1-rear-to-floor2')?.assetId).toBe('stairs-down');
expect(findEntityById('floor2-rear-to-floor1')?.assetId).toBe('stairs-up');
```

- [ ] **Step 2: Run the focused test and confirm failure**

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL because current authored entities have no explicit bindings.

- [ ] **Step 3: Add only the `assetId` fields shown by the test**

Example `village.ts` change:

```ts
{
  kind: 'recovery',
  id: 'village-recovery',
  tile: { x: 2, y: 2 },
  assetId: 'recovery-waystone',
},
{
  kind: 'clue',
  id: 'village-tower-lead',
  tile: { x: 4, y: 5 },
  assetId: 'npc-village-guide',
  text: 'The old tower path loops below the sealed first floor.',
},
```

Do not change coordinates, clue prose, stats, targets, or interaction semantics.

- [ ] **Step 4: Run content and asset tests**

```bash
bunx vitest run src/game/content.test.ts src/phaser/assets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/content/village.ts src/game/content/floor1.ts src/game/content/floor2.ts src/phaser/assets.test.ts
git commit -m "feat: bind vertical slice to generated art"
```

---

### Task 5: Replace placeholder rendering with preloaded images and transient facing

**Files:**
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: `ASSET_PATHS`, `resolveTerrainAssets`, `resolveEntityAsset`, `resolvePlayerAsset`, `TILE_SIZE`.
- Produces: image-based presentation only; input still calls the existing `onInput` dependency.

- [ ] **Step 1: Add a focused test for player-facing resolution only, not scene internals**

The resolver coverage from Task 1 is the unit seam. Do not create a mocked Phaser scene test. Confirm this test already passes:

```bash
bunx vitest run src/phaser/assets.test.ts -t "maps four presentation-only player facings"
```

Expected: PASS.

- [ ] **Step 2: Add `preload()` that registers the explicit catalog**

In `WorldScene.ts` import:

```ts
import {
  ASSET_PATHS,
  TILE_SIZE,
  resolveEntityAsset,
  resolvePlayerAsset,
  resolveTerrainAssets,
} from './assets';
```

Add:

```ts
preload(): void {
  for (const [assetKey, path] of Object.entries(ASSET_PATHS)) {
    this.load.image(assetKey, path);
  }
}
```

- [ ] **Step 3: Track facing as presentation-only scene state**

Add:

```ts
private playerFacing: Direction = 'south';
```

Import `Direction` from the domain types. In each keyboard handler, set the facing immediately before forwarding the existing move command:

```ts
keyboard.on(`keydown-${key}`, () => {
  this.playerFacing = direction;
  this.deps.onInput({ kind: 'move', direction });
});
```

Do not add facing to `GameState` or persistence.

- [ ] **Step 4: Render terrain through the fixed map-theme resolver**

Inside `refresh()` resolve:

```ts
const terrain = resolveTerrainAssets(state.mapId);
```

Replace each rectangle with:

```ts
const texture = isWall ? terrain.wall : terrain.floor;
this.add
  .image(x * TILE_SIZE, y * TILE_SIZE, texture)
  .setOrigin(0)
  .setDisplaySize(TILE_SIZE, TILE_SIZE);
```

Do not add neighbor analysis or wall auto-tiling.

- [ ] **Step 5: Render entities through the state-aware resolver**

Replace the current collected/defeated/opened skip sets and text rendering with:

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

This intentionally allows an open relic chest or open shortcut gate to remain visible after it stops blocking the tile.

- [ ] **Step 6: Render the player with directional stills**

Replace `@` text with:

```ts
const player = this.add
  .image(
    (state.tile.x + 0.5) * TILE_SIZE,
    (state.tile.y + 1) * TILE_SIZE,
    resolvePlayerAsset(this.playerFacing),
  )
  .setOrigin(0.5, 1);
```

Do not add walk animations.

- [ ] **Step 7: Run typecheck, unit tests, and build**

```bash
bun run typecheck
bun run test:unit
bun run build
```

Expected: all PASS.

- [ ] **Step 8: Manually verify the actual proof criteria in the running game**

Run:

```bash
bun run dev
```

Verify:

1. village terrain is warm/readable;
2. dungeon terrain is visually distinct;
3. player turns to all four stills when arrow keys are pressed;
4. village clue shows the NPC visual;
5. Floor 1 clue, enemy, reward, latch, and stairs are recognizable;
6. collecting the reward leaves the open relic visual while its tile becomes walkable;
7. opening the latch leaves the open gate visual while its tile becomes walkable;
8. defeating the gatekeeper removes the enemy visual;
9. camera follow and all movement remain unchanged.

If a sprite's visual base is not aligned, fix the runtime crop/transparent padding rather than adding per-entity pixel offsets to authored content.

- [ ] **Step 9: Commit**

```bash
git add src/phaser/WorldScene.ts src/phaser/assets.ts src/phaser/assets.test.ts
git commit -m "feat: render generated tower maze assets"
```

---

### Task 6: Add real-browser asset serving coverage and finish verification

**Files:**
- Modify: `tests/e2e/cross-floor.spec.ts`
- Modify: `docs/art/hpa-22-style-guide.md` only if final visual verification changes the chosen processing rules.

**Interfaces:**
- Consumes: `ASSET_PATHS` from presentation code and the real Vite server.
- Produces: browser evidence that catalog paths are served and existing gameplay still works after the visual swap.

- [ ] **Step 1: Add an asset-serving smoke test without a test-only game API**

At the top of `tests/e2e/cross-floor.spec.ts`, import:

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

- [ ] **Step 2: Run the full browser suite**

```bash
bun run test:e2e
```

Expected: PASS, including the existing village → Floor 1 → Floor 2 → reward → combat → shortcut → village journey.

- [ ] **Step 3: Run the complete local gate**

```bash
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run build
bun run test:e2e
```

Expected: all PASS.

- [ ] **Step 4: Capture review evidence from the real game**

Attach screenshots to the implementation PR description or a PR comment showing:

1. village proof corner with player + village guide;
2. dungeon room with ruin guard + clue landmark;
3. relic chest closed and open;
4. shortcut gate closed and open;
5. player/NPC/enemy at normal gameplay scale.

Do not add a visual-regression framework or committed screenshot corpus.

- [ ] **Step 5: Final scope audit against HPA-22**

Confirm in the PR description:

- proof sample was evaluated before full production;
- current HPA-237 placeholders are replaced;
- current asset IDs resolve with no missing-image errors;
- prompt/provenance notes are committed;
- no Floor 1–3 content expansion, portrait framework, animation system, or asset manager was added;
- later content can add a small number of new PNG/catalog entries without renderer redesign.

- [ ] **Step 6: Commit final browser coverage**

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

Expected result: every command passes; the vertical slice remains mechanically identical; all catalog PNGs are present and served; the selected art is readable at the real 32 px gameplay scale.

## Implementation Handoff

Execute this plan in the same HPA-22 implementation PR. Recommended workflow: `superpowers:subagent-driven-development`, with the visual proof gate completed before delegating full-kit generation or renderer integration beyond the proof sample.
