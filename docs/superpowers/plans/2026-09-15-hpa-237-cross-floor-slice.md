# HPA-237 Cross-Floor Exploration and Combat Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable Tower Maze vertical slice: village → Floor 1 blocked reward → Floor 2 alternate route → rear Floor 1 payoff → permanent upgrade → cheaper deterministic combat → persistent shortcut → village recovery/reload.

**Architecture:** Durable rules and progression live in pure TypeScript. Phaser renders the authored tile maps and forwards real input into a small pure session layer; a framework-free DOM overlay renders persistent stats, interaction copy, combat controls, blocked reasons, and invalid-save recovery. Authored content is closed, typed data using ASCII map layouts plus a discriminated entity union, and one LocalStorage snapshot persists only `GameState`.

**Tech Stack:** Bun 1.4.2, TypeScript, Vite, Phaser, ESLint, Prettier, Husky, lint-staged, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-15-hpa-237-cross-floor-slice-design.md`

## Global Constraints

- HPA-237 is one implementation PR. The commit checkpoints below all stay on the same HPA-237 branch/PR.
- Pin Bun as `bun@1.4.2` in `package.json` and use Bun 1.4.2 in CI.
- Use Vite + TypeScript + Phaser. Do not add React, Svelte, Vue, or another UI framework.
- Keep durable progression in one plain-TypeScript `GameState`; Phaser must not own progression or modal-state flags.
- Keep transient combat-prompt state in `PendingInteraction`; never persist it.
- Keep entity interaction semantics closed by kind: clue/reward/enemy/latch/recovery are bump interactions; portals are step-on travel.
- Closed latch opens only from its authored rear side; after opening, its tile is permanently traversable from both sides.
- Player attacks first. Combat is unwinnable when `player.attack - enemy.defense <= 0`. Combat is lethal when predicted HP loss is `>= player.hp`.
- Preview and resolution must share the same pure combat calculation.
- Autosave after every successful state-changing action, including ordinary movement. Do not save prompt-open or prompt-cancel because they do not mutate `GameState`.
- Missing save starts fresh. Malformed, shape-invalid, or content-invalid save must show an explicit reset path; never silently wipe it.
- No discovery/fog state, save version/migration system, backend, account system, ECS, generic quest/event scripting, generic trigger framework, battle scene, inventory/equipment/crafting, map editor, or procedural generation.
- Placeholder art is expected. Lock one tile-size constant, stable asset IDs, one-tile logical footprints, bottom-center entity anchors, and tile-coordinate collision from the first `WorldScene` implementation.
- Pre-commit runs lint-staged only. Full unit and Playwright suites run in CI.
- CI is one workflow with exactly three independent jobs: Build & lint, Unit test, Playwright test.

---

## File Structure

Create the project around these focused responsibilities:

```text
.github/
  workflows/
    ci.yml
.husky/
  pre-commit
src/
  main.ts
  styles.css
  game/
    types.ts
    state.ts
    state.test.ts
    content.ts
    content.test.ts
    content/
      village.ts
      floor1.ts
      floor2.ts
    combat.ts
    combat.test.ts
    actions.ts
    actions.test.ts
    movement.ts
    movement.test.ts
    session.ts
    session.test.ts
    save.ts
    save.test.ts
  phaser/
    assets.ts
    assets.test.ts
    createGame.ts
    WorldScene.ts
  ui/
    InteractionOverlay.ts
index.html
package.json
bun.lock
tsconfig.json
vite.config.ts
vitest.config.ts
playwright.config.ts
eslint.config.js
prettier.config.js
lint-staged.config.js
tests/
  e2e/
    cross-floor.spec.ts
README.md
```

### Shared Interfaces Locked by This Plan

```ts
export type MapId = 'village' | 'floor1' | 'floor2';
export type Direction = 'north' | 'south' | 'east' | 'west';
export type Stat = 'attack' | 'defense' | 'maxHp';
export type Tile = Readonly<{ x: number; y: number }>;

export type PlayerStats = Readonly<{
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}>;

export type GameState = Readonly<{
  mapId: MapId;
  tile: Tile;
  player: PlayerStats;
  openedRewardIds: readonly string[];
  defeatedEnemyIds: readonly string[];
  openedShortcutIds: readonly string[];
}>;

export type BlockedReason =
  | 'wall'
  | 'out-of-bounds'
  | 'interaction-pending'
  | 'latch-closed-front'
  | 'combat-unwinnable'
  | 'combat-lethal'
  | 'reward-already-taken';

export type ActionEffect =
  | { kind: 'moved' }
  | { kind: 'traveled'; mapId: MapId }
  | { kind: 'clue'; text: string }
  | { kind: 'reward'; stat: Stat; amount: number }
  | { kind: 'healed'; hp: number }
  | { kind: 'latchOpened'; id: string }
  | { kind: 'combatPrompt'; enemyId: string; preview: WinnableCombatPreview }
  | { kind: 'enemyDefeated'; enemyId: string; hpLost: number };

export type ActionResult =
  | { ok: true; state: GameState; effect: ActionEffect }
  | { ok: false; reason: BlockedReason };

export type PendingInteraction = null | {
  kind: 'combat';
  enemyId: string;
  preview: WinnableCombatPreview;
};

export type SessionState = Readonly<{
  game: GameState;
  pending: PendingInteraction;
}>;

export type InputCommand =
  | { kind: 'move'; direction: Direction }
  | { kind: 'fight' }
  | { kind: 'cancel' };
```

Do not add a generic event bus or state-machine framework around these types.

---

### Task 1: Bootstrap the Runtime, Quality Tooling, HUD, and CI

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `eslint.config.js`
- Create: `prettier.config.js`
- Create: `lint-staged.config.js`
- Create: `.husky/pre-commit`
- Create: `.github/workflows/ci.yml`
- Create: `index.html`
- Create: `src/game/types.ts`
- Create: `src/game/state.ts`
- Create: `src/game/state.test.ts`
- Create: `src/ui/InteractionOverlay.ts`
- Create: `src/phaser/createGame.ts`
- Create: `src/phaser/WorldScene.ts`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `tests/e2e/cross-floor.spec.ts`
- Modify: `README.md`

**Interfaces:**

- Produces: `createInitialGameState(): GameState`
- Produces: `InteractionOverlay.renderHud(state: GameState, mapName: string): void`
- Produces: `createGame(parent: HTMLElement): Phaser.Game`

- [ ] **Step 1: Initialize Bun package metadata and install dependencies**

```bash
bun init -y
bun add phaser
bun add -d typescript vite vitest @playwright/test eslint @eslint/js globals typescript-eslint prettier husky lint-staged
bunx husky init
```

Set `package.json` scripts/package manager:

```json
{
  "name": "eridanus",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.4.2",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "prepare": "husky"
  }
}
```

Keep Bun-generated dependency sections.

- [ ] **Step 2: Add the failing initial-state unit test**

`src/game/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';

describe('createInitialGameState', () => {
  it('starts in the village with baseline stats', () => {
    expect(createInitialGameState()).toEqual({
      mapId: 'village',
      tile: { x: 2, y: 5 },
      player: { hp: 30, maxHp: 30, attack: 10, defense: 2 },
      openedRewardIds: [],
      defeatedEnemyIds: [],
      openedShortcutIds: [],
    });
  });
});
```

- [ ] **Step 3: Run the unit test and verify it fails**

```bash
bunx vitest run src/game/state.test.ts
```

Expected: FAIL because `state.ts` does not exist.

- [ ] **Step 4: Add core types and initial state**

Create `src/game/types.ts` with `MapId`, `Direction`, `Stat`, `Tile`, `PlayerStats`, and `GameState` exactly as declared above.

`src/game/state.ts`:

```ts
import type { GameState } from './types';

export function createInitialGameState(): GameState {
  return {
    mapId: 'village',
    tile: { x: 2, y: 5 },
    player: { hp: 30, maxHp: 30, attack: 10, defense: 2 },
    openedRewardIds: [],
    defeatedEnemyIds: [],
    openedShortcutIds: [],
  };
}
```

- [ ] **Step 5: Add exact TypeScript/Vite/Vitest/lint/format configuration**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": [
    "src",
    "tests",
    "vite.config.ts",
    "vitest.config.ts",
    "playwright.config.ts"
  ]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
export default defineConfig({});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
```

`eslint.config.js`:

```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
);
```

`prettier.config.js`:

```js
export default { singleQuote: true, trailingComma: 'all' };
```

`lint-staged.config.js`:

```js
export default {
  '*.{ts,js,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,css,html,yml,yaml}': ['prettier --write'],
};
```

`.husky/pre-commit`:

```sh
bunx lint-staged
```

- [ ] **Step 6: Add the minimal real HUD and Phaser boot path**

`src/ui/InteractionOverlay.ts`:

```ts
import type { GameState } from '../game/types';

export class InteractionOverlay {
  constructor(private readonly root: HTMLElement) {}

  renderHud(state: GameState, mapName: string): void {
    this.root.innerHTML = `
      <section data-testid="hud" aria-label="Player status">
        <span data-testid="map-name">${mapName}</span>
        <span data-stat="hp">HP ${state.player.hp}/${state.player.maxHp}</span>
        <span data-stat="attack">ATK ${state.player.attack}</span>
        <span data-stat="defense">DEF ${state.player.defense}</span>
        <div data-testid="interaction"></div>
      </section>`;
  }
}
```

`src/phaser/WorldScene.ts`:

```ts
import Phaser from 'phaser';

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('world');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');
  }
}
```

`src/phaser/createGame.ts`:

```ts
import Phaser from 'phaser';
import { WorldScene } from './WorldScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 640,
    height: 480,
    scene: [WorldScene],
    pixelArt: true,
  });
}
```

`src/main.ts`:

```ts
import './styles.css';
import { createInitialGameState } from './game/state';
import { createGame } from './phaser/createGame';
import { InteractionOverlay } from './ui/InteractionOverlay';

const gameRoot = document.querySelector<HTMLElement>('#game');
const uiRoot = document.querySelector<HTMLElement>('#ui');
if (!gameRoot || !uiRoot) throw new Error('Missing app roots');

const state = createInitialGameState();
new InteractionOverlay(uiRoot).renderHud(state, 'Starting Village');
createGame(gameRoot);
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Eridanus</title>
  </head>
  <body>
    <main id="app">
      <div id="game"></div>
      <div id="ui"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/styles.css`:

```css
html,
body {
  margin: 0;
  min-height: 100%;
  background: #111;
  color: #fff;
  font-family: system-ui, sans-serif;
}
#app {
  position: relative;
  width: min(100vw, 640px);
  margin: 0 auto;
}
[data-testid='hud'] {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.5rem;
}
[data-testid='interaction'] {
  flex-basis: 100%;
}
```

- [ ] **Step 7: Add the first real Playwright assertion**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4173', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'bun run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

`tests/e2e/cross-floor.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('boots the real game with persistent player stats', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 10');
  await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 2');
});
```

Run:

```bash
bunx playwright install chromium
bun run test:e2e
```

Expected: PASS.

- [ ] **Step 8: Add the three-job CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-lint:
    name: Build & lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.4.2 }
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run format:check
      - run: bun run build

  unit-test:
    name: Unit test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.4.2 }
      - run: bun install --frozen-lockfile
      - run: bun run test:unit

  playwright-test:
    name: Playwright test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.4.2 }
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:e2e
```

- [ ] **Step 9: Run the Task 1 gate**

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

Expected: PASS.

- [ ] **Step 10: Commit Task 1**

```bash
git add package.json bun.lock tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts eslint.config.js prettier.config.js lint-staged.config.js .husky .github index.html src tests README.md
git commit -m "chore: bootstrap Eridanus web game"
```

---

### Task 2: Lock the Authored Content Schema and Author the Three Real Maps

**Files:**

- Modify: `src/game/types.ts`
- Create: `src/game/content.ts`
- Create: `src/game/content.test.ts`
- Create: `src/game/content/village.ts`
- Create: `src/game/content/floor1.ts`
- Create: `src/game/content/floor2.ts`
- Modify: `src/ui/InteractionOverlay.ts`
- Modify: `src/main.ts`

**Interfaces:**

- Produces: `Entity`, `MapDefinition`, `MAPS: Record<MapId, MapDefinition>`
- Produces: `getEntityAt(mapId, tile)`, `findEntityById(id)`, `isInBounds(mapId, tile)`, `isLayoutFloor(mapId, tile)`, `validateContent()`

- [ ] **Step 1: Write failing content tests**

`src/game/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAPS, findEntityById, validateContent } from './content';

describe('authored content', () => {
  it('defines all current maps', () => {
    expect(Object.keys(MAPS).sort()).toEqual(['floor1', 'floor2', 'village']);
  });

  it('has no validation errors', () => {
    expect(validateContent()).toEqual([]);
  });

  it('keeps important ids resolvable', () => {
    expect(findEntityById('floor1-power-core')?.kind).toBe('reward');
    expect(findEntityById('floor1-gatekeeper')?.kind).toBe('enemy');
    expect(findEntityById('floor1-rear-latch')?.kind).toBe('latch');
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
bunx vitest run src/game/content.test.ts
```

Expected: FAIL because `content.ts` does not exist.

- [ ] **Step 3: Add closed content/entity types**

Append to `src/game/types.ts`:

```ts
export type BaseEntity = Readonly<{ id: string; tile: Tile; assetId?: string }>;
export type ClueEntity = BaseEntity & Readonly<{ kind: 'clue'; text: string }>;
export type RewardEntity = BaseEntity &
  Readonly<{ kind: 'reward'; stat: Stat; amount: number }>;
export type EnemyEntity = BaseEntity &
  Readonly<{
    kind: 'enemy';
    stats: Readonly<{ hp: number; attack: number; defense: number }>;
  }>;
export type LatchEntity = BaseEntity &
  Readonly<{ kind: 'latch'; rearSide: Direction }>;
export type RecoveryEntity = BaseEntity & Readonly<{ kind: 'recovery' }>;
export type PortalEntity = BaseEntity &
  Readonly<{ kind: 'portal'; target: Readonly<{ mapId: MapId; tile: Tile }> }>;
export type Entity =
  | ClueEntity
  | RewardEntity
  | EnemyEntity
  | LatchEntity
  | RecoveryEntity
  | PortalEntity;
export type MapDefinition = Readonly<{
  id: MapId;
  name: string;
  layout: readonly string[];
  entities: readonly Entity[];
}>;
```

- [ ] **Step 4: Author village**

`src/game/content/village.ts`:

```ts
import type { MapDefinition } from '../types';

export const village: MapDefinition = {
  id: 'village',
  name: 'Starting Village',
  layout: [
    '############',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '############',
  ],
  entities: [
    { kind: 'recovery', id: 'village-recovery', tile: { x: 2, y: 2 } },
    {
      kind: 'clue',
      id: 'village-tower-lead',
      tile: { x: 4, y: 5 },
      text: 'The old tower path loops below the sealed first floor.',
    },
    {
      kind: 'portal',
      id: 'village-to-floor1',
      tile: { x: 9, y: 2 },
      target: { mapId: 'floor1', tile: { x: 2, y: 9 } },
    },
  ],
};
```

- [ ] **Step 5: Author Floor 1**

`src/game/content/floor1.ts`:

```ts
import type { MapDefinition } from '../types';

export const floor1: MapDefinition = {
  id: 'floor1',
  name: 'Tower Floor 1',
  layout: [
    '##################',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '#................#',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '#......#.........#',
    '##################',
  ],
  entities: [
    {
      kind: 'portal',
      id: 'floor1-to-village',
      tile: { x: 2, y: 9 },
      target: { mapId: 'village', tile: { x: 9, y: 2 } },
    },
    {
      kind: 'portal',
      id: 'floor1-front-to-floor2',
      tile: { x: 5, y: 2 },
      target: { mapId: 'floor2', tile: { x: 1, y: 8 } },
    },
    {
      kind: 'portal',
      id: 'floor1-rear-to-floor2',
      tile: { x: 14, y: 2 },
      target: { mapId: 'floor2', tile: { x: 14, y: 1 } },
    },
    {
      kind: 'clue',
      id: 'floor1-lower-route-clue',
      tile: { x: 5, y: 4 },
      text: 'Scratches on the stone point down before they turn back east.',
    },
    {
      kind: 'latch',
      id: 'floor1-rear-latch',
      tile: { x: 7, y: 5 },
      rearSide: 'east',
    },
    {
      kind: 'reward',
      id: 'floor1-power-core',
      tile: { x: 9, y: 5 },
      stat: 'attack',
      amount: 2,
    },
    {
      kind: 'enemy',
      id: 'floor1-gatekeeper',
      tile: { x: 11, y: 5 },
      stats: { hp: 20, attack: 7, defense: 4 },
    },
  ],
};
```

Locked payoff:

```text
ATK 10 → 15 HP loss
ATK 12 after reward → 10 HP loss
```

- [ ] **Step 6: Author Floor 2**

`src/game/content/floor2.ts`:

```ts
import type { MapDefinition } from '../types';

export const floor2: MapDefinition = {
  id: 'floor2',
  name: 'Tower Floor 2',
  layout: [
    '################',
    '#..............#',
    '#.####.#####...#',
    '#....#.....#...#',
    '####.#.###.#.#.#',
    '#....#...#...#.#',
    '#.######.#####.#',
    '#..............#',
    '#..............#',
    '################',
  ],
  entities: [
    {
      kind: 'portal',
      id: 'floor2-front-to-floor1',
      tile: { x: 1, y: 8 },
      target: { mapId: 'floor1', tile: { x: 5, y: 2 } },
    },
    {
      kind: 'portal',
      id: 'floor2-rear-to-floor1',
      tile: { x: 14, y: 1 },
      target: { mapId: 'floor1', tile: { x: 14, y: 2 } },
    },
  ],
};
```

- [ ] **Step 7: Implement registry/lookups/content validation**

`src/game/content.ts`:

```ts
import { floor1 } from './content/floor1';
import { floor2 } from './content/floor2';
import { village } from './content/village';
import type { Entity, MapDefinition, MapId, Tile } from './types';

export const MAPS: Record<MapId, MapDefinition> = { village, floor1, floor2 };

export function isInBounds(mapId: MapId, tile: Tile): boolean {
  const map = MAPS[mapId];
  return (
    tile.y >= 0 &&
    tile.y < map.layout.length &&
    tile.x >= 0 &&
    tile.x < map.layout[0]!.length
  );
}

export function isLayoutFloor(mapId: MapId, tile: Tile): boolean {
  return isInBounds(mapId, tile) && MAPS[mapId].layout[tile.y]![tile.x] === '.';
}

export function getEntityAt(mapId: MapId, tile: Tile): Entity | undefined {
  return MAPS[mapId].entities.find(
    (entity) => entity.tile.x === tile.x && entity.tile.y === tile.y,
  );
}

export function findEntityById(id: string): Entity | undefined {
  return Object.values(MAPS)
    .flatMap((map) => map.entities)
    .find((entity) => entity.id === id);
}

export function validateContent(): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const map of Object.values(MAPS)) {
    const width = map.layout[0]?.length ?? 0;
    if (width === 0 || map.layout.some((row) => row.length !== width))
      errors.push(`${map.id}: layout must be rectangular`);

    for (const entity of map.entities) {
      if (ids.has(entity.id)) errors.push(`duplicate entity id: ${entity.id}`);
      ids.add(entity.id);
      if (!isLayoutFloor(map.id, entity.tile))
        errors.push(`${entity.id}: entity tile must be floor`);

      if (entity.kind === 'portal') {
        if (!isLayoutFloor(entity.target.mapId, entity.target.tile)) {
          errors.push(`${entity.id}: portal target must be floor`);
          continue;
        }
        const back = getEntityAt(entity.target.mapId, entity.target.tile);
        if (
          back?.kind !== 'portal' ||
          back.target.mapId !== map.id ||
          back.target.tile.x !== entity.tile.x ||
          back.target.tile.y !== entity.tile.y
        )
          errors.push(`${entity.id}: reciprocal portal missing`);
      }
    }
  }

  return errors;
}
```

- [ ] **Step 8: Make HUD map names come from MAPS**

```ts
import { MAPS } from './game/content';
overlay.renderHud(state, MAPS[state.mapId].name);
```

- [ ] **Step 9: Run content gate**

```bash
bunx vitest run src/game/content.test.ts
bun run test:unit
bun run typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit Task 2**

```bash
git add src/game src/ui/InteractionOverlay.ts src/main.ts
git commit -m "feat: define authored tower maps"
```

---

### Task 3: Implement Deterministic Combat Rules First

**Files:**

- Modify: `src/game/types.ts`
- Create: `src/game/combat.ts`
- Create: `src/game/combat.test.ts`

**Interfaces:**

- Produces: `CombatPreview`, `WinnableCombatPreview`
- Produces: `previewCombat(player, enemy)` and `resolveCombat(state, enemy)`

- [ ] **Step 1: Add failing combat tests**

`src/game/combat.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { findEntityById } from './content';
import { previewCombat, resolveCombat } from './combat';

const enemy = findEntityById('floor1-gatekeeper');
if (!enemy || enemy.kind !== 'enemy') throw new Error('test enemy missing');

describe('combat', () => {
  it('previews baseline and upgraded HP loss', () => {
    expect(
      previewCombat({ hp: 30, maxHp: 30, attack: 10, defense: 2 }, enemy.stats),
    ).toEqual({ winnable: true, hitsNeeded: 4, hpLoss: 15 });
    expect(
      previewCombat({ hp: 30, maxHp: 30, attack: 12, defense: 2 }, enemy.stats),
    ).toEqual({ winnable: true, hitsNeeded: 3, hpLoss: 10 });
  });

  it('rejects zero player damage before division', () => {
    expect(
      previewCombat({ hp: 30, maxHp: 30, attack: 4, defense: 2 }, enemy.stats),
    ).toEqual({ winnable: false, reason: 'combat-unwinnable' });
  });

  it('treats ending at zero HP as lethal', () => {
    expect(
      previewCombat({ hp: 15, maxHp: 30, attack: 10, defense: 2 }, enemy.stats),
    ).toEqual({ winnable: false, reason: 'combat-lethal' });
  });

  it('resolution commits exactly the previewed loss', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      player: { hp: 30, maxHp: 30, attack: 12, defense: 2 },
    };
    const result = resolveCombat(state, enemy);
    expect(result).toEqual({
      ok: true,
      state: {
        ...state,
        player: { ...state.player, hp: 20 },
        defeatedEnemyIds: ['floor1-gatekeeper'],
      },
      effect: {
        kind: 'enemyDefeated',
        enemyId: 'floor1-gatekeeper',
        hpLost: 10,
      },
    });
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
bunx vitest run src/game/combat.test.ts
```

Expected: FAIL because `combat.ts`/combat result types do not exist.

- [ ] **Step 3: Add combat/action result types**

Add the `WinnableCombatPreview`, `CombatPreview`, `BlockedReason`, `ActionEffect`, and `ActionResult` unions exactly as defined in the shared interfaces section.

- [ ] **Step 4: Implement combat**

`src/game/combat.ts`:

```ts
import type {
  ActionResult,
  CombatPreview,
  EnemyEntity,
  GameState,
  PlayerStats,
} from './types';

export function previewCombat(
  player: PlayerStats,
  enemy: EnemyEntity['stats'],
): CombatPreview {
  const playerDamage = player.attack - enemy.defense;
  if (playerDamage <= 0)
    return { winnable: false, reason: 'combat-unwinnable' };
  const hitsNeeded = Math.ceil(enemy.hp / playerDamage);
  const enemyDamage = Math.max(0, enemy.attack - player.defense);
  const hpLoss = (hitsNeeded - 1) * enemyDamage;
  if (hpLoss >= player.hp) return { winnable: false, reason: 'combat-lethal' };
  return { winnable: true, hitsNeeded, hpLoss };
}

export function resolveCombat(
  state: GameState,
  enemy: EnemyEntity,
): ActionResult {
  const preview = previewCombat(state.player, enemy.stats);
  if (!preview.winnable) return { ok: false, reason: preview.reason };
  if (state.defeatedEnemyIds.includes(enemy.id)) {
    return {
      ok: true,
      state,
      effect: { kind: 'enemyDefeated', enemyId: enemy.id, hpLost: 0 },
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      player: { ...state.player, hp: state.player.hp - preview.hpLoss },
      defeatedEnemyIds: [...state.defeatedEnemyIds, enemy.id],
    },
    effect: {
      kind: 'enemyDefeated',
      enemyId: enemy.id,
      hpLost: preview.hpLoss,
    },
  };
}
```

- [ ] **Step 5: Run combat gate**

```bash
bunx vitest run src/game/combat.test.ts
bun run test:unit
bun run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/game/types.ts src/game/combat.ts src/game/combat.test.ts
git commit -m "feat: add deterministic combat rules"
```

---

### Task 4: Implement Pure Movement, Interactions, and Transient Session Gating

**Files:**

- Modify: `src/game/types.ts`
- Create: `src/game/actions.ts`
- Create: `src/game/actions.test.ts`
- Create: `src/game/movement.ts`
- Create: `src/game/movement.test.ts`
- Create: `src/game/session.ts`
- Create: `src/game/session.test.ts`

**Interfaces:**

- Produces: `attemptMove(state, direction): ActionResult`
- Produces: `interactWithEntity(state, entity, fromTile): ActionResult`
- Produces: `dispatchInput(session, input): SessionTransition`

- [ ] **Step 1: Add failing movement/action tests**

`src/game/movement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { attemptMove } from './movement';
import type { GameState } from './types';

const base: GameState = {
  mapId: 'floor1',
  tile: { x: 6, y: 5 },
  player: { hp: 30, maxHp: 30, attack: 10, defense: 2 },
  openedRewardIds: [],
  defeatedEnemyIds: [],
  openedShortcutIds: [],
};

describe('attemptMove', () => {
  it('blocks closed latch from front', () => {
    expect(attemptMove(base, 'east')).toEqual({
      ok: false,
      reason: 'latch-closed-front',
    });
  });

  it('opens latch from rear without moving onto it', () => {
    const rear = { ...base, tile: { x: 8, y: 5 } };
    const result = attemptMove(rear, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual({ x: 8, y: 5 });
    expect(result.state.openedShortcutIds).toContain('floor1-rear-latch');
  });

  it('walks through open latch', () => {
    const open = { ...base, openedShortcutIds: ['floor1-rear-latch'] };
    const result = attemptMove(open, 'east');
    expect(result.ok && result.state.tile).toEqual({ x: 7, y: 5 });
  });

  it('steps on portal and travels', () => {
    const state = { ...base, mapId: 'village' as const, tile: { x: 8, y: 2 } };
    const result = attemptMove(state, 'east');
    expect(result.ok && result.state).toMatchObject({
      mapId: 'floor1',
      tile: { x: 2, y: 9 },
    });
  });
});
```

`src/game/actions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findEntityById } from './content';
import { interactWithEntity } from './actions';
import { createInitialGameState } from './state';

const reward = findEntityById('floor1-power-core');
const recovery = findEntityById('village-recovery');
if (!reward || reward.kind !== 'reward') throw new Error('reward missing');
if (!recovery || recovery.kind !== 'recovery')
  throw new Error('recovery missing');

describe('actions', () => {
  it('applies reward once', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 9, y: 4 },
    };
    const first = interactWithEntity(state, reward, state.tile);
    expect(first.ok && first.state.player.attack).toBe(12);
    if (!first.ok) return;
    expect(interactWithEntity(first.state, reward, first.state.tile)).toEqual({
      ok: false,
      reason: 'reward-already-taken',
    });
  });

  it('heals without resetting dungeon progress', () => {
    const state = {
      ...createInitialGameState(),
      player: { hp: 8, maxHp: 30, attack: 12, defense: 2 },
      openedRewardIds: ['floor1-power-core'],
      defeatedEnemyIds: ['floor1-gatekeeper'],
      openedShortcutIds: ['floor1-rear-latch'],
    };
    const result = interactWithEntity(state, recovery, { x: 3, y: 2 });
    expect(result.ok && result.state).toMatchObject({
      player: { hp: 30, maxHp: 30, attack: 12, defense: 2 },
      openedRewardIds: ['floor1-power-core'],
      defeatedEnemyIds: ['floor1-gatekeeper'],
      openedShortcutIds: ['floor1-rear-latch'],
    });
  });
});
```

- [ ] **Step 2: Add failing session tests**

`src/game/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dispatchInput } from './session';
import type { SessionState } from './types';

const pending: SessionState = {
  game: {
    mapId: 'floor1',
    tile: { x: 12, y: 5 },
    player: { hp: 30, maxHp: 30, attack: 12, defense: 2 },
    openedRewardIds: ['floor1-power-core'],
    defeatedEnemyIds: [],
    openedShortcutIds: [],
  },
  pending: {
    kind: 'combat',
    enemyId: 'floor1-gatekeeper',
    preview: { winnable: true, hitsNeeded: 3, hpLoss: 10 },
  },
};

describe('dispatchInput', () => {
  it('blocks movement while combat pending', () => {
    expect(
      dispatchInput(pending, { kind: 'move', direction: 'north' }),
    ).toEqual({ ok: false, session: pending, reason: 'interaction-pending' });
  });

  it('cancel clears only pending state', () => {
    expect(dispatchInput(pending, { kind: 'cancel' })).toEqual({
      ok: true,
      session: { ...pending, pending: null },
      effect: null,
    });
  });

  it('fight resolves enemy and clears prompt', () => {
    const result = dispatchInput(pending, { kind: 'fight' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.pending).toBeNull();
    expect(result.session.game.player.hp).toBe(20);
    expect(result.session.game.defeatedEnemyIds).toEqual(['floor1-gatekeeper']);
  });
});
```

- [ ] **Step 3: Run and verify failure**

```bash
bunx vitest run src/game/movement.test.ts src/game/actions.test.ts src/game/session.test.ts
```

Expected: FAIL because movement/actions/session modules do not exist.

- [ ] **Step 4: Add session/input types**

Add `PendingInteraction`, `SessionState`, `InputCommand`, and `SessionTransition` exactly as declared in the shared interfaces section, with:

```ts
export type SessionTransition =
  | Readonly<{ ok: true; session: SessionState; effect: ActionEffect | null }>
  | Readonly<{ ok: false; session: SessionState; reason: BlockedReason }>;
```

- [ ] **Step 5: Implement closed entity actions**

`src/game/actions.ts`:

```ts
import { previewCombat } from './combat';
import type { ActionResult, Direction, Entity, GameState, Tile } from './types';

function directionFromTo(from: Tile, to: Tile): Direction | null {
  if (to.x === from.x && to.y === from.y - 1) return 'north';
  if (to.x === from.x && to.y === from.y + 1) return 'south';
  if (to.x === from.x - 1 && to.y === from.y) return 'west';
  if (to.x === from.x + 1 && to.y === from.y) return 'east';
  return null;
}

export function interactWithEntity(
  state: GameState,
  entity: Entity,
  fromTile: Tile,
): ActionResult {
  switch (entity.kind) {
    case 'clue':
      return { ok: true, state, effect: { kind: 'clue', text: entity.text } };
    case 'recovery': {
      const next = {
        ...state,
        player: { ...state.player, hp: state.player.maxHp },
      };
      return {
        ok: true,
        state: next,
        effect: { kind: 'healed', hp: next.player.hp },
      };
    }
    case 'reward': {
      if (state.openedRewardIds.includes(entity.id))
        return { ok: false, reason: 'reward-already-taken' };
      const player = {
        ...state.player,
        [entity.stat]: state.player[entity.stat] + entity.amount,
      };
      if (entity.stat === 'maxHp') player.hp += entity.amount;
      return {
        ok: true,
        state: {
          ...state,
          player,
          openedRewardIds: [...state.openedRewardIds, entity.id],
        },
        effect: { kind: 'reward', stat: entity.stat, amount: entity.amount },
      };
    }
    case 'latch': {
      if (state.openedShortcutIds.includes(entity.id))
        return {
          ok: true,
          state,
          effect: { kind: 'latchOpened', id: entity.id },
        };
      if (directionFromTo(entity.tile, fromTile) !== entity.rearSide)
        return { ok: false, reason: 'latch-closed-front' };
      return {
        ok: true,
        state: {
          ...state,
          openedShortcutIds: [...state.openedShortcutIds, entity.id],
        },
        effect: { kind: 'latchOpened', id: entity.id },
      };
    }
    case 'enemy': {
      if (state.defeatedEnemyIds.includes(entity.id))
        return {
          ok: true,
          state,
          effect: { kind: 'enemyDefeated', enemyId: entity.id, hpLost: 0 },
        };
      const preview = previewCombat(state.player, entity.stats);
      if (!preview.winnable) return { ok: false, reason: preview.reason };
      return {
        ok: true,
        state,
        effect: { kind: 'combatPrompt', enemyId: entity.id, preview },
      };
    }
    case 'portal':
      throw new Error('Portals are step-on movement');
  }
}
```

- [ ] **Step 6: Implement movement**

`src/game/movement.ts`:

```ts
import { getEntityAt, isInBounds, isLayoutFloor } from './content';
import { interactWithEntity } from './actions';
import type { ActionResult, Direction, GameState, Tile } from './types';

const DELTA: Record<Direction, Tile> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

export function attemptMove(
  state: GameState,
  direction: Direction,
): ActionResult {
  const delta = DELTA[direction];
  const target = { x: state.tile.x + delta.x, y: state.tile.y + delta.y };
  if (!isInBounds(state.mapId, target))
    return { ok: false, reason: 'out-of-bounds' };
  if (!isLayoutFloor(state.mapId, target)) return { ok: false, reason: 'wall' };

  const entity = getEntityAt(state.mapId, target);
  if (entity) {
    if (entity.kind === 'portal') {
      return {
        ok: true,
        state: {
          ...state,
          mapId: entity.target.mapId,
          tile: entity.target.tile,
        },
        effect: { kind: 'traveled', mapId: entity.target.mapId },
      };
    }
    if (entity.kind === 'latch' && state.openedShortcutIds.includes(entity.id))
      return {
        ok: true,
        state: { ...state, tile: target },
        effect: { kind: 'moved' },
      };
    if (entity.kind === 'enemy' && state.defeatedEnemyIds.includes(entity.id))
      return {
        ok: true,
        state: { ...state, tile: target },
        effect: { kind: 'moved' },
      };
    return interactWithEntity(state, entity, state.tile);
  }

  return {
    ok: true,
    state: { ...state, tile: target },
    effect: { kind: 'moved' },
  };
}
```

- [ ] **Step 7: Implement pure session dispatcher**

`src/game/session.ts`:

```ts
import { findEntityById } from './content';
import { resolveCombat } from './combat';
import { attemptMove } from './movement';
import type { InputCommand, SessionState, SessionTransition } from './types';

export function dispatchInput(
  session: SessionState,
  input: InputCommand,
): SessionTransition {
  if (session.pending) {
    if (input.kind === 'move')
      return { ok: false, session, reason: 'interaction-pending' };
    if (input.kind === 'cancel')
      return { ok: true, session: { ...session, pending: null }, effect: null };
    const entity = findEntityById(session.pending.enemyId);
    if (!entity || entity.kind !== 'enemy')
      throw new Error('Pending combat enemy missing');
    const result = resolveCombat(session.game, entity);
    if (!result.ok) return { ok: false, session, reason: result.reason };
    return {
      ok: true,
      session: { game: result.state, pending: null },
      effect: result.effect,
    };
  }

  if (input.kind !== 'move') return { ok: true, session, effect: null };
  const result = attemptMove(session.game, input.direction);
  if (!result.ok) return { ok: false, session, reason: result.reason };
  if (result.effect.kind === 'combatPrompt') {
    return {
      ok: true,
      session: {
        game: result.state,
        pending: {
          kind: 'combat',
          enemyId: result.effect.enemyId,
          preview: result.effect.preview,
        },
      },
      effect: result.effect,
    };
  }
  return {
    ok: true,
    session: { ...session, game: result.state },
    effect: result.effect,
  };
}
```

- [ ] **Step 8: Run domain gate**

```bash
bunx vitest run src/game/movement.test.ts src/game/actions.test.ts src/game/session.test.ts
bun run test:unit
bun run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit Task 4**

```bash
git add src/game
git commit -m "feat: add movement and interaction rules"
```

---

### Task 5: Render the Authored World and Wire the Real Interaction Overlay

**Files:**

- Create: `src/phaser/assets.ts`
- Create: `src/phaser/assets.test.ts`
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/phaser/createGame.ts`
- Modify: `src/ui/InteractionOverlay.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

**Interfaces:**

- Produces: `TILE_SIZE = 32`, `resolveAssetId(entity)`
- `WorldScene` consumes `getSession()` + `onInput()` callbacks
- `createGame()` returns `{ game, scene }`
- Overlay exhaustively renders `ActionEffect`/`BlockedReason`/`PendingInteraction`

- [ ] **Step 1: Add failing asset test**

`src/phaser/assets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findEntityById } from '../game/content';
import { resolveAssetId, TILE_SIZE } from './assets';

describe('asset seam', () => {
  it('locks tile size and defaults asset id to entity kind', () => {
    const reward = findEntityById('floor1-power-core');
    if (!reward) throw new Error('reward missing');
    expect(TILE_SIZE).toBe(32);
    expect(resolveAssetId(reward)).toBe('reward');
  });
});
```

Run `bunx vitest run src/phaser/assets.test.ts`; expected FAIL.

- [ ] **Step 2: Add asset seam**

`src/phaser/assets.ts`:

```ts
import type { Entity } from '../game/types';
export const TILE_SIZE = 32;
export function resolveAssetId(entity: Entity): string {
  return entity.assetId ?? entity.kind;
}
```

- [ ] **Step 3: Render authored map in one WorldScene**

Use `WorldSceneDeps = { getSession: () => SessionState; onInput: (input: InputCommand) => void }`.

`WorldScene.refresh()` must:

```ts
const state = this.deps.getSession().game;
const map = MAPS[state.mapId];
this.children.removeAll();
```

Render each `#`/`.` as a 32×32 rectangle, render non-collected rewards/non-defeated enemies plus other entities as bottom-centered placeholder labels from `resolveAssetId`, render player as `@`, then:

```ts
this.cameras.main.startFollow(player, true);
this.cameras.main.setBounds(
  0,
  0,
  map.layout[0]!.length * TILE_SIZE,
  map.layout.length * TILE_SIZE,
);
```

Keyboard `JustDown` mapping is exactly:

```ts
ArrowUp -> { kind: 'move', direction: 'north' }
ArrowDown -> { kind: 'move', direction: 'south' }
ArrowLeft -> { kind: 'move', direction: 'west' }
ArrowRight -> { kind: 'move', direction: 'east' }
```

Do not store progression or pending combat fields in the scene.

- [ ] **Step 4: Return the scene from createGame**

```ts
export type CreatedGame = { game: Phaser.Game; scene: WorldScene };

export function createGame(
  parent: HTMLElement,
  deps: WorldSceneDeps,
): CreatedGame {
  const scene = new WorldScene(deps);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 640,
    height: 480,
    scene: [scene],
    pixelArt: true,
  });
  return { game, scene };
}
```

- [ ] **Step 5: Make overlay exhaustively render typed results**

`InteractionOverlay.ts` uses:

```ts
const REASON_TEXT: Record<BlockedReason, string> = {
  wall: 'A wall blocks the way.',
  'out-of-bounds': 'You cannot go that way.',
  'interaction-pending': 'Finish the current interaction first.',
  'latch-closed-front': 'The latch only opens from the other side.',
  'combat-unwinnable': 'Your attack cannot damage this enemy.',
  'combat-lethal': 'This fight would defeat you.',
  'reward-already-taken': 'The reward has already been claimed.',
};
```

`effectText()` switch:

```ts
moved/traveled/combatPrompt -> ''
clue -> effect.text
reward -> `${effect.stat.toUpperCase()} increased by ${effect.amount}.`
healed -> `Recovered to ${effect.hp} HP.`
latchOpened -> 'The rear latch opens. The shortcut is now usable from both sides.'
enemyDefeated -> `Enemy defeated. HP lost: ${effect.hpLost}.`
```

`render(view)` always renders map name + HP/max HP + ATK + DEF. Transient priority is:

```text
blocked reason > pending combat prompt > action effect text
```

Blocked reason markup:

```html
<div data-testid="blocked-reason" data-reason="combat-lethal">
  This fight would defeat you.
</div>
```

Pending combat markup:

```html
<section data-testid="combat-prompt">
  <span data-testid="combat-hp-loss">HP loss: 10</span>
  <button type="button" data-action="fight">Fight</button>
  <button type="button" data-action="cancel">Cancel</button>
</section>
```

Wire those buttons to constructor callbacks `onFight`/`onCancel`. Keep `renderInvalidSave(onReset)` in the same overlay with one `Reset save` button.

- [ ] **Step 6: Compose runtime in main.ts**

Use one mutable `SessionState` in the composition root, not in Phaser:

```ts
let session: SessionState = { game: createInitialGameState(), pending: null };
let effect: ActionEffect | null = null;
let blocked: BlockedReason | null = null;
let created: CreatedGame;

function handleInput(input: InputCommand): void {
  const transition = dispatchInput(session, input);
  if (transition.ok) {
    session = transition.session;
    effect = transition.effect;
    blocked = null;
  } else {
    blocked = transition.reason;
  }
  created.scene.refresh();
  overlay.render({
    state: session.game,
    mapName: MAPS[session.game.mapId].name,
    pending: session.pending,
    effect,
    blocked,
  });
}

created = createGame(gameRoot, {
  getSession: () => session,
  onInput: handleInput,
});
overlay.render({
  state: session.game,
  mapName: MAPS[session.game.mapId].name,
  pending: null,
  effect: null,
  blocked: null,
});
```

Overlay constructor callbacks call `handleInput({ kind: 'fight' })` / `handleInput({ kind: 'cancel' })`.

- [ ] **Step 7: Run presentation gate**

```bash
bunx vitest run src/phaser/assets.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run test:e2e
```

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add src/phaser src/ui src/main.ts src/styles.css
git commit -m "feat: render authored maze world"
```

---

### Task 6: Add Content-Aware LocalStorage Persistence and Explicit Recovery

**Files:**

- Create: `src/game/save.ts`
- Create: `src/game/save.test.ts`
- Modify: `src/main.ts`

**Interfaces:**

- Produces: `saveGame(storage, state)`, `loadGame(storage)`, `resetGame(storage)`
- Produces: `LoadResult = fresh | loaded | invalid`

- [ ] **Step 1: Add failing persistence tests**

`src/game/save.test.ts` includes:

```ts
it('starts fresh only when key is missing', () => {
  expect(loadGame(storage)).toEqual({
    kind: 'fresh',
    state: createInitialGameState(),
  });
});

it('round-trips ordinary movement position', () => {
  const moved = { ...createInitialGameState(), tile: { x: 3, y: 5 } };
  saveGame(storage, moved);
  expect(loadGame(storage)).toEqual({ kind: 'loaded', state: moved });
});

it('rejects malformed JSON', () => {
  storage.setItem('eridanus.save', '{bad');
  expect(loadGame(storage)).toEqual({
    kind: 'invalid',
    reason: 'malformed-json',
  });
});

it('rejects removed entity ids', () => {
  storage.setItem(
    'eridanus.save',
    JSON.stringify({
      ...createInitialGameState(),
      defeatedEnemyIds: ['removed-enemy'],
    }),
  );
  expect(loadGame(storage)).toEqual({
    kind: 'invalid',
    reason: 'invalid-content',
  });
});
```

Use a tiny in-memory `Storage` test double implementing `getItem/setItem/removeItem/clear/key/length`.

- [ ] **Step 2: Run and verify failure**

```bash
bunx vitest run src/game/save.test.ts
```

Expected: FAIL because `save.ts` does not exist.

- [ ] **Step 3: Implement save/load/reset**

`src/game/save.ts`:

```ts
const SAVE_KEY = 'eridanus.save';

export type LoadResult =
  | { kind: 'fresh'; state: GameState }
  | { kind: 'loaded'; state: GameState }
  | {
      kind: 'invalid';
      reason: 'malformed-json' | 'invalid-shape' | 'invalid-content';
    };
```

Shape validation requires mapId string, numeric tile x/y, numeric player hp/maxHp/attack/defense, and string arrays for reward/enemy/shortcut IDs.

Content validation requires:

```ts
state.mapId in MAPS;
isLayoutFloor(state.mapId, state.tile);
openedRewardIds.every((id) => findEntityById(id)?.kind === 'reward');
defeatedEnemyIds.every((id) => findEntityById(id)?.kind === 'enemy');
openedShortcutIds.every((id) => findEntityById(id)?.kind === 'latch');
```

Implement exact load behavior:

```ts
missing key -> { kind: 'fresh', state: createInitialGameState() }
JSON.parse throws -> { kind: 'invalid', reason: 'malformed-json' }
shape fails -> { kind: 'invalid', reason: 'invalid-shape' }
content fails -> { kind: 'invalid', reason: 'invalid-content' }
valid -> { kind: 'loaded', state }
```

`saveGame()` writes `JSON.stringify(state)`. `resetGame()` removes `eridanus.save` and returns `createInitialGameState()`.

- [ ] **Step 4: Wire startup recovery and movement autosave in main.ts**

Startup:

```ts
const load = loadGame(window.localStorage);
if (load.kind === 'invalid') {
  overlay.renderInvalidSave(() => startRuntime(resetGame(window.localStorage)));
} else {
  startRuntime(load.state);
}
```

Input handler:

```ts
const previousGame = session.game;
const transition = dispatchInput(session, input);
if (transition.ok) {
  session = transition.session;
  effect = transition.effect;
  blocked = null;
  if (session.game !== previousGame)
    saveGame(window.localStorage, session.game);
} else {
  blocked = transition.reason;
}
render();
```

This saves movement/travel/reward/recovery/latch/combat resolution and skips prompt open/cancel.

- [ ] **Step 5: Run persistence gate**

```bash
bunx vitest run src/game/save.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run test:e2e
```

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```bash
git add src/game/save.ts src/game/save.test.ts src/main.ts
git commit -m "feat: persist tower progress locally"
```

---

### Task 7: Expand Playwright into the Complete HPA-237 Journey

**Files:**

- Modify: `tests/e2e/cross-floor.spec.ts`
- Modify only for real route/readability defects: `src/game/content/*.ts`, `src/ui/InteractionOverlay.ts`, `src/phaser/WorldScene.ts`

**Interfaces:**

- Uses only keyboard input and real user-facing DOM; no test-only game API.

- [ ] **Step 1: Add real-input helper**

```ts
async function press(
  page: Page,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i += 1) await page.keyboard.press(key);
}
```

- [ ] **Step 2: Add failing full journey test**

The test performs this exact route:

```text
Fresh village (2,5)
→ Right ×2: bump village clue
→ Up ×3, Right ×6: village portal → Floor 1 (2,9)
→ Right ×3, Up ×4, Up: bump F1 clue
→ Left ×1, Up ×3, Right ×1: F1 front portal → Floor 2 (1,8)
→ Right ×13, Up ×7: F2 rear portal → F1 rear (14,2)
→ Down ×3, Left ×2, Left: preview enemy at 15 HP loss; Cancel
→ Up ×1, Left ×3, Down: collect reward; assert ATK 12
→ Right ×3, Down ×1, Left: preview enemy at 10 HP loss; Fight; assert HP 20/30
→ Left ×4, Left: open latch from rear while remaining at (8,5)
→ Reload: assert ATK 12 + HP 20/30
→ Left ×2: cross open latch to front
→ Left ×4, Down ×4: F1 portal → village (9,2)
→ Left ×7: bump recovery; assert HP 30/30
→ Reload: assert Starting Village, ATK 12, HP 30/30
```

Use these assertions at the relevant points:

```ts
await expect(page.getByTestId('map-name')).toHaveText('Tower Floor 1');
await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 15');
await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');
await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 10');
await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 20/30');
await expect(page.getByTestId('interaction')).toContainText('shortcut');
await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
```

Fight/Cancel clicks:

```ts
await page.getByRole('button', { name: 'Cancel' }).click();
await page.getByRole('button', { name: 'Fight' }).click();
```

- [ ] **Step 3: Run the journey and inspect first failure**

```bash
bun run test:e2e -- tests/e2e/cross-floor.spec.ts
```

Expected before final polish: a route/copy/refresh defect may surface. Fix the product behavior, not the test by bypassing gameplay.

- [ ] **Step 4: Restrict corrections to authored-slice issues**

Allowed corrections only:

```text
map geometry that makes intended route impossible/confusing
interaction copy needed for clue/reward/latch feedback
scene refresh after committed state change
Fight/Cancel button wiring/focus
the locked 15 HP -> 10 HP payoff
```

No new systems/floors.

- [ ] **Step 5: Run journey until green**

```bash
bun run test:e2e -- tests/e2e/cross-floor.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 7**

```bash
git add tests/e2e/cross-floor.spec.ts src/game/content src/ui src/phaser
git commit -m "test: cover cross-floor gameplay journey"
```

---

### Task 8: Final Verification and Documentation Gate

**Files:**

- Modify: `README.md`
- Modify other files only for concrete defects found by verification

- [ ] **Step 1: Run all CI-equivalent gates**

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run build
bun run test:unit
bunx playwright install chromium
bun run test:e2e
```

Expected: PASS.

- [ ] **Step 2: Verify malformed-save recovery manually**

```js
localStorage.setItem('eridanus.save', '{bad');
location.reload();
```

Expected: invalid-save recovery UI, not fresh-game fallback. Click **Reset save** and expect Starting Village / HP 30/30 / ATK 10 / DEF 2.

- [ ] **Step 3: Verify pre-commit stays lightweight**

Stage a harmless README formatting edit and run:

```bash
.husky/pre-commit
```

Expected: lint-staged ESLint/Prettier only; no Vitest or Playwright.

- [ ] **Step 4: Finish README**

Add/merge this content:

````markdown
## Development

```sh
bun install
bun run dev
```

## Quality gates

```sh
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

## Architecture

- Pure TypeScript owns durable gameplay rules and save state.
- Phaser renders one reusable authored-map scene and forwards input.
- A framework-free DOM overlay renders HUD, interaction copy, combat controls, and save recovery.
- Content is authored as closed typed entities plus compact ASCII map rows.
````

- [ ] **Step 5: Inspect final diff for scope creep**

```bash
git diff main...HEAD --stat
git diff main...HEAD -- . ':!docs/superpowers/plans/2026-09-15-hpa-237-cross-floor-slice.md'
```

Confirm no discovery/fog, migrations/versioning, backend/accounts, ECS, quest/event DSL, battle scene, inventory/equipment/crafting, map editor, procedural generation, or test-only game API landed.

- [ ] **Step 6: Commit final documentation fixes**

```bash
git add README.md
git commit -m "docs: document Eridanus development workflow"
```

Skip an empty commit if README already matches.

---

## Risks to Watch During Execution

1. **Combat prompt ownership:** movement gating and pending enemy identity stay in `PendingInteraction` + `dispatchInput`, never `WorldScene`.
2. **Content drift:** new floor edits must continue using the closed union + ASCII map model unless a concrete mechanic cannot be represented.
3. **Save drift:** pre-release content changes invalidate old development saves through explicit reset; never add migration code for this MVP.
4. **Presentation duplication:** Phaser/DOM render `ActionEffect`/`BlockedReason`; they do not independently re-decide game rules.

## Self-Review

### Spec coverage

- Tooling/Bun/ESLint/Prettier/Husky/lint-staged + 3 CI jobs: Task 1.
- Durable state + closed authored maps/entities + reciprocal portals: Tasks 1–2.
- Deterministic combat and lethal/unwinnable rules: Task 3.
- Bump/step interactions, rear latch, transient prompt/input gating: Task 4.
- One WorldScene/camera/tile collision/asset seam + persistent HUD/Fight/Cancel/reasons: Task 5.
- LocalStorage, movement autosave, malformed/content-invalid explicit reset: Task 6.
- Complete village → F1 → F2 → rear F1 → reward → cheaper combat → latch → village → reload path: Task 7.
- Final generated art remains separate under HPA-22.

No spec requirement lacks an implementation task.

### Placeholder scan

No unresolved placeholder instructions remain. Coding tasks contain exact files, interfaces, code/test examples, commands, expected outcomes, and commit checkpoints.

### Type consistency

The plan consistently uses `MapId`, `Tile`, `Direction`, `Stat`, `GameState`, `Entity`, `MapDefinition`, `MAPS`, `CombatPreview`, `WinnableCombatPreview`, `BlockedReason`, `ActionEffect`, `ActionResult`, `PendingInteraction`, `SessionState`, `InputCommand`, `SessionTransition`, `attemptMove`, `interactWithEntity`, `previewCombat`, `resolveCombat`, `dispatchInput`, `saveGame`, `loadGame`, and `resetGame`.
