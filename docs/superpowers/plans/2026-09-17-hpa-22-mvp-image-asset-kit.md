# HPA-22 Reusable MVP Image Asset Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HPA-237 placeholder rendering with a small generated, runtime-ready visual kit that proves Eridanus's art direction at real gameplay scale and gives later Floor 1–3 tickets stable asset conventions.

**Architecture:** Keep gameplay/domain code unchanged. Prove a small set of generated PNGs in the real `WorldScene` first, then expand the approved treatment into the rest of the small kit. Runtime images live under `public/assets`; one explicit `src/phaser/assets.ts` catalog resolves terrain, entity, and player visuals from existing authored content and `GameState`. Facing and opened visuals remain presentation-only state.

**Tech Stack:** Bun 1.4.2, Vite 8, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, generated PNG assets.

**Spec:** `docs/superpowers/specs/2026-09-17-hpa-22-mvp-image-asset-kit-design.md`

## Global Constraints

- Deliver HPA-22 as one implementation PR; proof, art production, and integration stay in that PR.
- Keep HPA-22 the standalone image-generation/art-production slice. Do not pull HPA-235 village/Floor 1 content expansion into it.
- `TILE_SIZE` remains exactly `32`.
- Tile coordinates remain the only collision/interaction geometry.
- `src/game/` remains Phaser-free and does not import presentation asset types.
- `MapDefinition.layout` remains ASCII `#` / `.` geometry.
- Do not add an atlas pipeline, auto-tiler, animation registry, generic asset manager, portrait framework, or UI framework.
- Do not add entity kinds, durable state fields, save migrations, quests, inventory, keys, or gameplay rules.
- Generate the representative proof sample first, integrate it into the real game, and evaluate it at real scale before generating the remaining kit.
- Commit selected processed runtime PNGs and compact style/provenance notes; do not commit large discarded source generations.
- Preserve the existing real-player Playwright journey and existing three-job CI shape.

---

## Final File Structure

### Create

- `public/assets/terrain/village-floor.png`
- `public/assets/terrain/village-wall.png`
- `public/assets/terrain/dungeon-floor.png`
- `public/assets/terrain/dungeon-wall.png`
- `public/assets/characters/player-north.png`
- `public/assets/characters/player-south.png`
- `public/assets/characters/player-east.png`
- `public/assets/characters/player-west.png`
- `public/assets/characters/npc-village-guide.png`
- `public/assets/enemies/ruin-guard.png`
- `public/assets/enemies/ruin-stalker.png`
- `public/assets/enemies/ruin-wisp.png`
- `public/assets/interactables/stairs-up.png`
- `public/assets/interactables/stairs-down.png`
- `public/assets/interactables/recovery-waystone.png`
- `public/assets/interactables/clue-runes.png`
- `public/assets/interactables/shortcut-gate-closed.png`
- `public/assets/interactables/shortcut-gate-open.png`
- `public/assets/interactables/chest-ordinary-closed.png`
- `public/assets/interactables/chest-ordinary-open.png`
- `public/assets/interactables/chest-relic-closed.png`
- `public/assets/interactables/chest-relic-open.png`
- `docs/art/hpa-22-style-guide.md`

### Modify

- `src/phaser/assets.ts` — explicit catalog and presentation resolvers.
- `src/phaser/assets.test.ts` — resolver and committed-file coverage.
- `src/phaser/WorldScene.ts` — preload and image rendering.
- `src/game/content/village.ts` — current entity visual bindings only.
- `src/game/content/floor1.ts` — current entity visual bindings only.
- `src/game/content/floor2.ts` — current portal visual bindings only.
- `tests/e2e/cross-floor.spec.ts` — asset-serving smoke coverage while retaining the existing journey.

### Do Not Modify

- `src/game/types.ts`
- `src/game/actions.ts`
- `src/game/movement.ts`
- `src/game/combat.ts`
- `src/game/session.ts`
- `src/game/save.ts`
- `src/ui/InteractionOverlay.ts`

---

### Task 1: Establish the proof-stage asset catalog

**Files:**
- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: `MapId`, `Entity`, and `GameState` from `src/game/types.ts`.
- Produces for the proof stage: `ASSET_PATHS`, `AssetKey`, `resolveTerrainAssets(mapId)`, `resolveEntityAsset(entity, state)`, and `runtimeAssetFilePath(assetKey)`.
- The catalog intentionally starts with only the assets needed by the visual proof. Task 4 expands the same object after the proof passes; there is never a second manifest.

- [ ] **Step 1: Write failing tests for the proof-stage catalog and state-aware relic rendering**

Replace the current one-case seam test with:

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

  it('removes a defeated proof enemy from presentation', () => {
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

  it('keeps all proof catalog paths under /assets', () => {
    for (const path of Object.values(ASSET_PATHS)) {
      expect(path).toMatch(/^\/assets\//);
    }
  });
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL because the proof-stage catalog/resolvers do not exist yet.

- [ ] **Step 3: Implement the proof-stage catalog**

Use this exact starting catalog in `src/phaser/assets.ts`:

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

export function resolveTerrainAssets(mapId: MapId): TerrainAssets {
  return TERRAIN_BY_MAP[mapId];
}

function explicitAsset(assetId: string | undefined): AssetKey | null {
  if (!assetId) return null;
  return assetId in ASSET_PATHS ? (assetId as AssetKey) : null;
}

export function resolveEntityAsset(
  entity: Entity,
  state: GameState,
): AssetKey | null {
  if (entity.kind === 'enemy' && state.defeatedEnemyIds.includes(entity.id)) {
    return null;
  }
  if (entity.kind === 'reward' && state.openedRewardIds.includes(entity.id)) {
    return entity.assetId === 'chest-relic-closed' ? 'chest-relic-open' : null;
  }
  return explicitAsset(entity.assetId);
}

export function runtimeAssetFilePath(assetKey: AssetKey): string {
  return `public${ASSET_PATHS[assetKey]}`;
}
```

This is deliberately not the final resolver. It only knows the proof assets that exist before the proof gate.

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

### Task 2: Generate the representative proof sample

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
- Produces: the selected visual treatment, nine runtime proof PNGs, and a reproducible style/provenance contract.

- [ ] **Step 1: Generate only the proof sample**

Generate the nine cataloged concepts using this common prompt language:

```text
Top-down fantasy game asset for a compact grid-maze browser game, clear anime influence,
strong readable silhouette, restrained detail that survives downscaling, clean lighting,
transparent background for characters/interactables, no text, no UI border, no external
shadow, consistent hand-painted/anime game-art treatment.
```

Add these constraints by category:

```text
Village terrain: warm inhabited stone/wood language, welcoming amber warmth, seamless simple tile.
Dungeon terrain: cool ancient ruin language, slate/blue-gray stone, subtle strange accents, seamless simple tile.
Characters/enemy: one-tile logical footprint, feet centered at bottom, top-down/three-quarter view.
Relic chest pair: same object identity and camera angle; open state must differ by silhouette, not glow alone.
```

- [ ] **Step 2: Process selected outputs into exact runtime files**

For each selected output:

1. remove opaque generation background for non-terrain assets;
2. crop transparent padding without clipping the silhouette;
3. align character/interactable base to bottom-center;
4. downscale to a runtime size that remains readable on a 32 px logical tile;
5. keep terrain edges repeatable without obvious seams;
6. save as PNG at the exact path from `ASSET_PATHS`.

Do not add an image-processing script unless repeated manual processing becomes the actual bottleneck during this ticket.

- [ ] **Step 3: Add proof file-existence coverage**

Append:

```ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeAssetFilePath } from './assets';

it('ships every proof-stage catalog file', () => {
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

Expected: PASS with all nine proof files present.

- [ ] **Step 5: Create the style/provenance guide**

Write `docs/art/hpa-22-style-guide.md` with exactly these sections:

```markdown
# HPA-22 Art Style and Generation Guide

## Runtime scale
## Chosen visual treatment
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

For each proof asset record generator/model, generation date, exact prompt, source dimensions, final runtime dimensions, useful seed/reference identifier when available, and the cleanup/downscale decision. Never record provider credentials.

- [ ] **Step 6: Commit the proof files and guide**

```bash
git add public/assets docs/art/hpa-22-style-guide.md src/phaser/assets.test.ts
git commit -m "art: add HPA-22 visual proof sample"
```

---

### Task 3: Integrate the proof sample into the real game and pass the visual gate

**Files:**
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/game/content/village.ts`
- Modify: `src/game/content/floor1.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: proof `ASSET_PATHS`, `resolveTerrainAssets`, `resolveEntityAsset`, existing `assetId` seam.
- Produces: a temporary proof-stage renderer where proof assets are real images and unconverted current interactables remain the existing text placeholders. Task 5 removes the fallback after the full kit exists.

- [ ] **Step 1: Bind only the three proof entities**

Add these `assetId` fields and nothing else:

```ts
// village.ts
{
  kind: 'clue',
  id: 'village-tower-lead',
  tile: { x: 4, y: 5 },
  assetId: 'npc-village-guide',
  text: 'The old tower path loops below the sealed first floor.',
}
```

```ts
// floor1.ts reward
assetId: 'chest-relic-closed'
```

```ts
// floor1.ts enemy
assetId: 'enemy-ruin-guard'
```

Do not change coordinates, text, stats, or targets.

- [ ] **Step 2: Add proof binding assertions**

Add:

```ts
it('binds only the proof entities before full-kit production', () => {
  expect(findEntityById('village-tower-lead')?.assetId).toBe('npc-village-guide');
  expect(findEntityById('floor1-power-core')?.assetId).toBe('chest-relic-closed');
  expect(findEntityById('floor1-gatekeeper')?.assetId).toBe('enemy-ruin-guard');
});
```

Run:

```bash
bunx vitest run src/phaser/assets.test.ts src/game/content.test.ts
```

Expected: PASS after the three bindings are added.

- [ ] **Step 3: Preload the proof catalog in `WorldScene`**

Import `ASSET_PATHS`, `resolveTerrainAssets`, and `resolveEntityAsset`, then add:

```ts
preload(): void {
  for (const [assetKey, path] of Object.entries(ASSET_PATHS)) {
    this.load.image(assetKey, path);
  }
}
```

- [ ] **Step 4: Render proof terrain as images**

Inside `refresh()`:

```ts
const terrain = resolveTerrainAssets(state.mapId);
```

Replace each solid rectangle with:

```ts
const texture = isWall ? terrain.wall : terrain.floor;
this.add
  .image(x * TILE_SIZE, y * TILE_SIZE, texture)
  .setOrigin(0)
  .setDisplaySize(TILE_SIZE, TILE_SIZE);
```

- [ ] **Step 5: Render proof entities as images while retaining exact legacy text fallback for unconverted entities**

Replace the current entity drawing block with:

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
      resolveAssetId(entity),
      { fontSize: '10px', color: '#ffdd66' },
    )
    .setOrigin(0.5, 1);
}
```

Keep `resolveAssetId` temporarily for this proof fallback. Task 5 deletes the fallback once every current vertical-slice entity has art.

- [ ] **Step 6: Render the proof player still**

Replace `@` with the south-facing proof image:

```ts
const player = this.add
  .image(
    (state.tile.x + 0.5) * TILE_SIZE,
    (state.tile.y + 1) * TILE_SIZE,
    'player-south',
  )
  .setOrigin(0.5, 1);
```

Do not add facing state yet; the proof gate evaluates one stable player treatment first.

- [ ] **Step 7: Run typecheck, unit tests, build, and the existing browser journey**

```bash
bun run typecheck
bun run test:unit
bun run build
bun run test:e2e
```

Expected: all PASS. Gameplay must remain unchanged while the proof visuals are present.

- [ ] **Step 8: Evaluate the proof in the real game before generating more assets**

Run:

```bash
bun run dev
```

At 100% browser zoom and the real 640×480 canvas verify all of the following:

1. player, village guide, and ruin guard have distinct silhouettes;
2. feet/base align to the same logical tile contract as the old placeholders;
3. village and dungeon terrain are immediately distinguishable;
4. relic closed/open states are distinguishable without text or glow alone;
5. important details remain readable after downscale;
6. the style is simple enough to reproduce for the remaining small kit.

If a criterion fails, regenerate/simplify that proof asset, update its provenance note, and repeat this step. Do not continue to Task 4 until every criterion passes.

- [ ] **Step 9: Record the proof outcome and commit**

In `docs/art/hpa-22-style-guide.md`, make `## Chosen visual treatment` describe the treatment that actually passed. Record rejected directions under `## Rejected proof directions`.

```bash
git add src/phaser/WorldScene.ts src/game/content/village.ts src/game/content/floor1.ts src/phaser/assets.test.ts docs/art/hpa-22-style-guide.md public/assets
git commit -m "feat: prove generated art in the tower maze runtime"
```

---

### Task 4: Expand the approved proof into the complete small kit

**Files:**
- Create: all remaining PNGs from the Final File Structure.
- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/assets.test.ts`
- Modify: `docs/art/hpa-22-style-guide.md`

**Interfaces:**
- Consumes: the proof treatment that passed Task 3.
- Produces: the final `ASSET_PATHS`, `resolvePlayerAsset(direction)`, and complete current-entity state resolver used by Task 5.

- [ ] **Step 1: Generate the remaining three directional player stills**

Create:

```text
public/assets/characters/player-north.png
public/assets/characters/player-east.png
public/assets/characters/player-west.png
```

Match the approved `player-south.png` outfit, proportions, camera angle, crop, palette, and bottom-center feet alignment. Do not add walk-cycle frames.

- [ ] **Step 2: Generate the two additional regular-enemy baseline assets**

Create:

```text
public/assets/enemies/ruin-stalker.png
public/assets/enemies/ruin-wisp.png
```

They establish later-floor visual language only; do not add stats or encounters in HPA-22.

- [ ] **Step 3: Generate the remaining shared interactables**

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

For both open/closed pairs, keep identity and angle fixed and make state readable by silhouette/shape.

- [ ] **Step 4: Normalize every new PNG using the approved proof rules**

Apply the exact transparency, crop, scale, and anchoring rules recorded in `docs/art/hpa-22-style-guide.md`. Fix source art rather than adding per-entity pixel offsets to content.

- [ ] **Step 5: Expand `ASSET_PATHS` to its final entries**

Add:

```ts
'player-north': '/assets/characters/player-north.png',
'player-east': '/assets/characters/player-east.png',
'player-west': '/assets/characters/player-west.png',
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
```

Retain the proof entries already present. This object is the only runtime manifest.

- [ ] **Step 6: Write failing tests for final player facing and opened shortcut state**

Add:

```ts
it('maps four presentation-only player facings', () => {
  expect(resolvePlayerAsset('north')).toBe('player-north');
  expect(resolvePlayerAsset('south')).toBe('player-south');
  expect(resolvePlayerAsset('east')).toBe('player-east');
  expect(resolvePlayerAsset('west')).toBe('player-west');
});

it('renders shortcut closed and open from existing progression state', () => {
  const latch = findEntityById('floor1-rear-latch');
  if (!latch) throw new Error('floor1-rear-latch missing');
  const boundLatch = { ...latch, assetId: 'shortcut-gate-closed' };

  expect(resolveEntityAsset(boundLatch, INITIAL_GAME_STATE)).toBe(
    'shortcut-gate-closed',
  );
  expect(
    resolveEntityAsset(boundLatch, {
      ...INITIAL_GAME_STATE,
      openedShortcutIds: [latch.id],
    }),
  ).toBe('shortcut-gate-open');
});
```

- [ ] **Step 7: Implement final player and entity resolvers**

Add:

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

Replace `resolveEntityAsset` with an exhaustive switch:

```ts
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
```

- [ ] **Step 8: Expand file-existence coverage automatically through the catalog**

The Task 2 test already iterates all `ASSET_PATHS` entries. After the catalog expands, run:

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: PASS only when every final catalog PNG exists.

- [ ] **Step 9: Extend provenance for every newly selected runtime asset**

Add generator/model, date, exact prompt, source/final dimensions, available seed/reference identifier, and processing note for every new PNG. Keep the same guide; do not create a second manifest document.

- [ ] **Step 10: Commit**

```bash
git add public/assets src/phaser/assets.ts src/phaser/assets.test.ts docs/art/hpa-22-style-guide.md
git commit -m "art: complete reusable tower maze asset kit"
```

---

### Task 5: Finish current-content bindings and remove all placeholders from the vertical slice

**Files:**
- Modify: `src/game/content/village.ts`
- Modify: `src/game/content/floor1.ts`
- Modify: `src/game/content/floor2.ts`
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/phaser/assets.test.ts`

**Interfaces:**
- Consumes: final catalog/resolvers from Task 4.
- Produces: all-image rendering for every current HPA-237 entity plus transient player facing; the temporary proof fallback is deleted.

- [ ] **Step 1: Write failing tests for the final current-content bindings**

Add:

```ts
it('binds the complete current vertical slice to stable art ids', () => {
  expect(findEntityById('village-recovery')?.assetId).toBe('recovery-waystone');
  expect(findEntityById('village-tower-lead')?.assetId).toBe('npc-village-guide');
  expect(findEntityById('village-to-floor1')?.assetId).toBe('stairs-down');
  expect(findEntityById('floor1-to-village')?.assetId).toBe('stairs-up');
  expect(findEntityById('floor1-front-to-floor2')?.assetId).toBe('stairs-down');
  expect(findEntityById('floor1-rear-to-floor2')?.assetId).toBe('stairs-down');
  expect(findEntityById('floor1-lower-route-clue')?.assetId).toBe('clue-runes');
  expect(findEntityById('floor1-rear-latch')?.assetId).toBe('shortcut-gate-closed');
  expect(findEntityById('floor1-power-core')?.assetId).toBe('chest-relic-closed');
  expect(findEntityById('floor1-gatekeeper')?.assetId).toBe('enemy-ruin-guard');
  expect(findEntityById('floor2-front-to-floor1')?.assetId).toBe('stairs-up');
  expect(findEntityById('floor2-rear-to-floor1')?.assetId).toBe('stairs-up');
});
```

Run:

```bash
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL for current entities not yet bound.

- [ ] **Step 2: Add only the missing `assetId` fields**

Do not alter map rows, coordinates, text, stats, portal targets, or gameplay semantics.

- [ ] **Step 3: Add presentation-only facing to `WorldScene`**

Import `Direction` and `resolvePlayerAsset`, then add:

```ts
private playerFacing: Direction = 'south';
```

Change each keydown listener to:

```ts
keyboard.on(`keydown-${key}`, () => {
  this.playerFacing = direction;
  this.deps.onInput({ kind: 'move', direction });
});
```

Facing remains transient and is never saved.

- [ ] **Step 4: Replace the proof-stage entity fallback with final image rendering**

Delete the proof-stage text fallback and `resolveAssetId` import. Render:

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

This deliberately keeps open relic and open shortcut visuals on walkable tiles while defeated enemies disappear.

- [ ] **Step 5: Replace the fixed proof player with the directional resolver**

```ts
const player = this.add
  .image(
    (state.tile.x + 0.5) * TILE_SIZE,
    (state.tile.y + 1) * TILE_SIZE,
    resolvePlayerAsset(this.playerFacing),
  )
  .setOrigin(0.5, 1);
```

No walk animation is added.

- [ ] **Step 6: Run content, asset, type, build, and browser tests**

```bash
bunx vitest run src/game/content.test.ts src/phaser/assets.test.ts
bun run typecheck
bun run build
bun run test:e2e
```

Expected: all PASS.

- [ ] **Step 7: Manually verify final visual states in the real game**

Run:

```bash
bun run dev
```

Verify:

1. recovery, guide, stairs, clue, gate, relic chest, and enemy are recognizable;
2. player changes north/south/east/west still on arrow input;
3. collecting the reward leaves the open relic visual and the tile is walkable;
4. opening the shortcut leaves the open gate visual and the tile is walkable;
5. defeating the gatekeeper removes its sprite;
6. camera follow and every gameplay interaction remain unchanged.

If alignment is wrong, fix the PNG crop/transparent padding instead of adding content-coordinate offsets.

- [ ] **Step 8: Commit**

```bash
git add src/game/content/village.ts src/game/content/floor1.ts src/game/content/floor2.ts src/phaser/WorldScene.ts src/phaser/assets.test.ts public/assets
git commit -m "feat: replace vertical slice placeholders with generated art"
```

---

### Task 6: Add browser asset-serving coverage and complete the delivery gate

**Files:**
- Modify: `tests/e2e/cross-floor.spec.ts`
- Modify: `docs/art/hpa-22-style-guide.md` only if final runtime inspection changes a documented processing rule.

**Interfaces:**
- Consumes: final `ASSET_PATHS` and the real Vite server.
- Produces: browser evidence that every catalog PNG is served while the existing player journey still passes.

- [ ] **Step 1: Add an asset-serving smoke test**

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

This uses the public HTTP surface and does not add a game test API.

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

Attach screenshots to the implementation PR description or a PR comment showing:

1. village corner with player + village guide;
2. dungeon area with ruin guard + clue treatment;
3. relic chest closed and open;
4. shortcut gate closed and open;
5. player/NPC/enemy at normal gameplay scale.

Do not add a visual-regression framework or committed screenshot corpus.

- [ ] **Step 4: Audit the final diff against HPA-22**

Confirm the implementation PR description states:

- proof sample was integrated and evaluated before full-kit generation;
- all HPA-237 vertical-slice placeholders are replaced;
- catalog paths and current `assetId` bindings resolve with no missing-image errors;
- prompt/style/provenance notes are committed;
- no HPA-235 content expansion, portrait framework, animation system, auto-tiler, atlas pipeline, or generic asset manager was added;
- later floor tickets can add a few PNG/catalog entries without renderer redesign.

- [ ] **Step 5: Commit final browser coverage**

```bash
git add tests/e2e/cross-floor.spec.ts docs/art/hpa-22-style-guide.md
git commit -m "test: verify runtime asset delivery"
```

---

## Final Verification

Before marking the HPA-22 implementation ready for review, run:

```bash
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run build
bun run test:e2e
```

Expected result: all commands pass; mechanics are unchanged; every catalog PNG exists and is served; the generated art remains readable at the real 32 px logical tile scale.

## Implementation Handoff

Execute this plan on the same HPA-22 branch/PR. Recommended workflow: `superpowers:subagent-driven-development`. The hard execution checkpoint is Task 3: do not start Task 4 full-kit generation until the proof sample has passed in the real game.
