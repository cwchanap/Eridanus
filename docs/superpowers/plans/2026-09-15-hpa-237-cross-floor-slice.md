# HPA-237 Cross-Floor Exploration and Combat Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable Tower Maze vertical slice: village → Floor 1 blocked reward → Floor 2 alternate route → rear Floor 1 payoff → permanent upgrade → cheaper deterministic combat → persistent shortcut → village recovery/reload.

**Architecture:** Durable rules and progression live in pure TypeScript. Phaser renders the authored tile maps and forwards real input into a small pure session layer; a framework-free DOM overlay renders persistent stats, interaction copy, combat controls, blocked reasons, and invalid-save recovery. Authored content is closed, typed data using ASCII map layouts plus a discriminated entity union, and one LocalStorage snapshot persists only `GameState`.

**Tech Stack:** Bun 1.4.2, TypeScript, Vite, Phaser, ESLint, Prettier, Husky, lint-staged, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/specs/2026-09-14-hpa-237-cross-floor-slice-design.md`

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
    ci.yml                         # exactly three independent CI jobs
.husky/
  pre-commit                       # lint-staged only
src/
  main.ts                          # composition root: session, save, overlay, Phaser
  styles.css                       # page/canvas/HUD styling
  game/
    types.ts                       # shared closed types/unions
    state.ts                       # initial GameState
    state.test.ts
    content.ts                     # MAPS registry + lookups/validation
    content.test.ts
    content/
      village.ts                   # complete village slice
      floor1.ts                    # complete F1 front/rear slice
      floor2.ts                    # complete F2 connector slice
    combat.ts                      # previewCombat + resolveCombat
    combat.test.ts
    actions.ts                     # clue/reward/recovery/latch/enemy bump actions
    actions.test.ts
    movement.ts                    # tile movement + step-on portal resolution
    movement.test.ts
    session.ts                     # PendingInteraction + input gating/dispatch
    session.test.ts
    save.ts                        # LocalStorage snapshot + content-aware validation
    save.test.ts
  phaser/
    assets.ts                      # TILE_SIZE + placeholder asset resolver
    createGame.ts                  # Phaser.Game construction
    WorldScene.ts                  # one reusable rendered world scene
  ui/
    InteractionOverlay.ts          # HUD/transient copy/buttons/reset UI
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
    cross-floor.spec.ts            # starts as real HUD assertion; grows into journey
README.md
```

### Shared Interfaces Locked by This Plan

The following names/signatures are the contracts between tasks:

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

export type PendingInteraction =
  | null
  | { kind: 'combat'; enemyId: string; preview: WinnableCombatPreview };

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
- Produces: `InteractionOverlay.renderHud(state: GameState, mapName?: string): void`
- Produces: `createGame(parent: HTMLElement): Phaser.Game`
- Later tasks extend the shared types in `src/game/types.ts` without renaming the interfaces above.

- [ ] **Step 1: Initialize Bun package metadata and install dependencies**

Run:

```bash
bun init -y
bun add phaser
bun add -d typescript vite vitest @playwright/test eslint @eslint/js globals typescript-eslint prettier husky lint-staged
bunx husky init
```

Then set `package.json` to contain these scripts and the pinned package manager:

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

Keep the dependency sections generated by Bun; do not hand-remove installed packages.

- [ ] **Step 2: Add the failing initial-state unit test**

Create `src/game/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';

describe('createInitialGameState', () => {
  it('starts in the village with the intended baseline stats', () => {
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

Run:

```bash
bun run test:unit -- src/game/state.test.ts
```

Expected: FAIL because `./state` / `createInitialGameState` does not exist yet.

- [ ] **Step 4: Add the shared core types and minimal initial state**

Create `src/game/types.ts` with the shared interfaces from this plan header, initially including `MapId`, `Direction`, `Stat`, `Tile`, `PlayerStats`, and `GameState`. Add the remaining action/session unions in later tasks when their dependent types exist.

Create `src/game/state.ts`:

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

Create `tsconfig.json`:

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
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

Create `eslint.config.js`:

```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
);
```

Create `prettier.config.js`:

```js
export default {
  singleQuote: true,
  trailingComma: 'all',
};
```

Create `lint-staged.config.js`:

```js
export default {
  '*.{ts,js,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,css,html,yml,yaml}': ['prettier --write'],
};
```

Replace `.husky/pre-commit` with:

```sh
bunx lint-staged
```

- [ ] **Step 6: Add the minimal real HUD and Phaser boot path**

Create `src/ui/InteractionOverlay.ts`:

```ts
import type { GameState } from '../game/types';

export class InteractionOverlay {
  constructor(private readonly root: HTMLElement) {}

  renderHud(state: GameState, mapName = 'Village'): void {
    this.root.innerHTML = `
      <section data-testid="hud" aria-label="Player status">
        <span data-testid="map-name">${mapName}</span>
        <span data-stat="hp">HP ${state.player.hp}/${state.player.maxHp}</span>
        <span data-stat="attack">ATK ${state.player.attack}</span>
        <span data-stat="defense">DEF ${state.player.defense}</span>
        <div data-testid="interaction"></div>
      </section>
    `;
  }
}
```

Create `src/phaser/WorldScene.ts`:

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

Create `src/phaser/createGame.ts`:

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

Create `src/main.ts`:

```ts
import './styles.css';
import { createInitialGameState } from './game/state';
import { createGame } from './phaser/createGame';
import { InteractionOverlay } from './ui/InteractionOverlay';

const gameRoot = document.querySelector<HTMLElement>('#game');
const uiRoot = document.querySelector<HTMLElement>('#ui');

if (!gameRoot || !uiRoot) throw new Error('Missing app roots');

const state = createInitialGameState();
new InteractionOverlay(uiRoot).renderHud(state);
createGame(gameRoot);
```

Create `index.html`:

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

Create `src/styles.css` with only layout needed now:

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

- [ ] **Step 7: Add the first real Playwright assertion before wiring CI**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'bun run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

Create `tests/e2e/cross-floor.spec.ts`:

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

Expected: PASS. This is the first assertion in the final E2E file, not a disposable smoke test.

- [ ] **Step 8: Add the three-job CI workflow**

Create `.github/workflows/ci.yml`:

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
        with:
          bun-version: 1.4.2
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
        with:
          bun-version: 1.4.2
      - run: bun install --frozen-lockfile
      - run: bun run test:unit

  playwright-test:
    name: Playwright test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.4.2
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:e2e
```

- [ ] **Step 9: Run the complete Task 1 gate**

Run:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

Expected: all commands PASS.

Update `README.md` to list exactly those local commands and state that HPA-237 is the first Tower Maze vertical slice.

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
- Modify: `src/game/state.ts`
- Modify: `src/ui/InteractionOverlay.ts`

**Interfaces:**
- Produces: `Entity`, `MapDefinition`, `MAPS: Record<MapId, MapDefinition>`
- Produces: `getEntityAt(mapId: MapId, tile: Tile): Entity | undefined`
- Produces: `findEntityById(id: string): Entity | undefined`
- Produces: `isLayoutFloor(mapId: MapId, tile: Tile): boolean`
- Produces: `validateContent(): readonly string[]`
- Later movement/save tasks consume these exact helpers.

- [ ] **Step 1: Write failing content-schema tests**

Create `src/game/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAPS, findEntityById, validateContent } from './content';

describe('authored content', () => {
  it('defines all three current maps', () => {
    expect(Object.keys(MAPS).sort()).toEqual(['floor1', 'floor2', 'village']);
  });

  it('has no structural/content validation errors', () => {
    expect(validateContent()).toEqual([]);
  });

  it('keeps important entity ids globally resolvable', () => {
    expect(findEntityById('floor1-power-core')?.kind).toBe('reward');
    expect(findEntityById('floor1-gatekeeper')?.kind).toBe('enemy');
    expect(findEntityById('floor1-rear-latch')?.kind).toBe('latch');
  });
});
```

- [ ] **Step 2: Run the content test and verify it fails**

```bash
bun run test:unit -- src/game/content.test.ts
```

Expected: FAIL because `./content` does not exist.

- [ ] **Step 3: Add the closed content/entity types**

Append these types to `src/game/types.ts`:

```ts
export type BaseEntity = Readonly<{
  id: string;
  tile: Tile;
  assetId?: string;
}>;

export type ClueEntity = BaseEntity & Readonly<{
  kind: 'clue';
  text: string;
}>;

export type RewardEntity = BaseEntity & Readonly<{
  kind: 'reward';
  stat: Stat;
  amount: number;
}>;

export type EnemyEntity = BaseEntity & Readonly<{
  kind: 'enemy';
  stats: Readonly<{ hp: number; attack: number; defense: number }>;
}>;

export type LatchEntity = BaseEntity & Readonly<{
  kind: 'latch';
  rearSide: Direction;
}>;

export type RecoveryEntity = BaseEntity & Readonly<{
  kind: 'recovery';
}>;

export type PortalEntity = BaseEntity & Readonly<{
  kind: 'portal';
  target: Readonly<{ mapId: MapId; tile: Tile }>;
}>;

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

Geometry convention is zero-based `x/y`, `#` wall, `.` floor. Width comes from the first row; height comes from row count.

- [ ] **Step 4: Author the complete village map**

Create `src/game/content/village.ts`:

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
    {
      kind: 'recovery',
      id: 'village-recovery',
      tile: { x: 2, y: 2 },
    },
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

- [ ] **Step 5: Author Floor 1 once with the real front/rear payoff content**

Create `src/game/content/floor1.ts`:

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

This enemy deliberately costs 15 HP before the +2 ATK reward and 10 HP after it:

```text
ATK 10: damage 6 → ceil(20/6)=4 hits → 3 retaliations × 5 = 15 HP
ATK 12: damage 8 → ceil(20/8)=3 hits → 2 retaliations × 5 = 10 HP
```

- [ ] **Step 6: Author Floor 2 as the alternate connector route**

Create `src/game/content/floor2.ts`:

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

- [ ] **Step 7: Implement the registry/lookups/content validation**

Create `src/game/content.ts`:

```ts
import { floor1 } from './content/floor1';
import { floor2 } from './content/floor2';
import { village } from './content/village';
import type { Entity, MapDefinition, MapId, Tile } from './types';

export const MAPS: Record<MapId, MapDefinition> = {
  village,
  floor1,
  floor2,
};

export function isInBounds(mapId: MapId, tile: Tile): boolean {
  const map = MAPS[mapId];
  return tile.y >= 0 && tile.y < map.layout.length && tile.x >= 0 && tile.x < map.layout[0]!.length;
}

export function isLayoutFloor(mapId: MapId, tile: Tile): boolean {
  return isInBounds(mapId, tile) && MAPS[mapId].layout[tile.y]![tile.x] === '.';
}

export function getEntityAt(mapId: MapId, tile: Tile): Entity | undefined {
  return MAPS[mapId].entities.find((entity) => entity.tile.x === tile.x && entity.tile.y === tile.y);
}

export function findEntityById(id: string): Entity | undefined {
  return Object.values(MAPS).flatMap((map) => map.entities).find((entity) => entity.id === id);
}

export function validateContent(): readonly string[] {
  const errors: string[] = [];
  const entityIds = new Set<string>();

  for (const map of Object.values(MAPS)) {
    const width = map.layout[0]?.length ?? 0;
    if (width === 0 || map.layout.some((row) => row.length !== width)) {
      errors.push(`${map.id}: layout must be non-empty and rectangular`);
    }

    for (const entity of map.entities) {
      if (entityIds.has(entity.id)) errors.push(`duplicate entity id: ${entity.id}`);
      entityIds.add(entity.id);
      if (!isLayoutFloor(map.id, entity.tile)) errors.push(`${entity.id}: entity tile must be walkable floor`);

      if (entity.kind === 'portal') {
        if (!isLayoutFloor(entity.target.mapId, entity.target.tile)) {
          errors.push(`${entity.id}: portal target must be walkable floor`);
          continue;
        }
        const returnPortal = getEntityAt(entity.target.mapId, entity.target.tile);
        if (
          returnPortal?.kind !== 'portal' ||
          returnPortal.target.mapId !== map.id ||
          returnPortal.target.tile.x !== entity.tile.x ||
          returnPortal.target.tile.y !== entity.tile.y
        ) {
          errors.push(`${entity.id}: reciprocal portal missing`);
        }
      }
    }
  }

  return errors;
}
```

- [ ] **Step 8: Make the HUD use authored map names**

Modify `InteractionOverlay.renderHud` to receive `mapName: string` without a default. Modify `src/main.ts` to call:

```ts
import { MAPS } from './game/content';

overlay.renderHud(state, MAPS[state.mapId].name);
```

- [ ] **Step 9: Run content + full unit tests**

```bash
bun run test:unit -- src/game/content.test.ts
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
- Produces: `previewCombat(player: PlayerStats, enemy: EnemyEntity['stats']): CombatPreview`
- Produces: `resolveCombat(state: GameState, enemy: EnemyEntity): ActionResult`
- Later session/actions use only these functions; they must not duplicate the formula.

- [ ] **Step 1: Add the failing combat tests**

Create `src/game/combat.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { findEntityById } from './content';
import { previewCombat, resolveCombat } from './combat';

const enemy = findEntityById('floor1-gatekeeper');
if (!enemy || enemy.kind !== 'enemy') throw new Error('test enemy missing');

describe('combat', () => {
  it('previews the exact baseline and upgraded HP loss', () => {
    expect(previewCombat({ hp: 30, maxHp: 30, attack: 10, defense: 2 }, enemy.stats)).toEqual({
      winnable: true,
      hitsNeeded: 4,
      hpLoss: 15,
    });
    expect(previewCombat({ hp: 30, maxHp: 30, attack: 12, defense: 2 }, enemy.stats)).toEqual({
      winnable: true,
      hitsNeeded: 3,
      hpLoss: 10,
    });
  });

  it('rejects zero player damage before division', () => {
    expect(previewCombat({ hp: 30, maxHp: 30, attack: 4, defense: 2 }, enemy.stats)).toEqual({
      winnable: false,
      reason: 'combat-unwinnable',
    });
  });

  it('treats finishing at zero HP as lethal', () => {
    expect(previewCombat({ hp: 15, maxHp: 30, attack: 10, defense: 2 }, enemy.stats)).toEqual({
      winnable: false,
      reason: 'combat-lethal',
    });
  });

  it('resolution uses the same preview and commits defeat once', () => {
    const state = { ...createInitialGameState(), mapId: 'floor1' as const, player: { hp: 30, maxHp: 30, attack: 12, defense: 2 } };
    const result = resolveCombat(state, enemy);
    expect(result).toEqual({
      ok: true,
      state: { ...state, player: { ...state.player, hp: 20 }, defeatedEnemyIds: ['floor1-gatekeeper'] },
      effect: { kind: 'enemyDefeated', enemyId: 'floor1-gatekeeper', hpLost: 10 },
    });
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
bun run test:unit -- src/game/combat.test.ts
```

Expected: FAIL because `combat.ts`, `CombatPreview`, and `ActionResult` are not defined yet.

- [ ] **Step 3: Add the typed result/effect/combat unions**

Add to `src/game/types.ts`:

```ts
export type WinnableCombatPreview = Readonly<{
  winnable: true;
  hitsNeeded: number;
  hpLoss: number;
}>;

export type CombatPreview =
  | WinnableCombatPreview
  | Readonly<{ winnable: false; reason: 'combat-unwinnable' | 'combat-lethal' }>;

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
```

- [ ] **Step 4: Implement preview and resolution**

Create `src/game/combat.ts`:

```ts
import type { ActionResult, CombatPreview, EnemyEntity, GameState, PlayerStats } from './types';

export function previewCombat(player: PlayerStats, enemy: EnemyEntity['stats']): CombatPreview {
  const playerDamage = player.attack - enemy.defense;
  if (playerDamage <= 0) return { winnable: false, reason: 'combat-unwinnable' };

  const hitsNeeded = Math.ceil(enemy.hp / playerDamage);
  const enemyDamage = Math.max(0, enemy.attack - player.defense);
  const hpLoss = (hitsNeeded - 1) * enemyDamage;

  if (hpLoss >= player.hp) return { winnable: false, reason: 'combat-lethal' };
  return { winnable: true, hitsNeeded, hpLoss };
}

export function resolveCombat(state: GameState, enemy: EnemyEntity): ActionResult {
  const preview = previewCombat(state.player, enemy.stats);
  if (!preview.winnable) return { ok: false, reason: preview.reason };

  if (state.defeatedEnemyIds.includes(enemy.id)) {
    return { ok: true, state, effect: { kind: 'enemyDefeated', enemyId: enemy.id, hpLost: 0 } };
  }

  return {
    ok: true,
    state: {
      ...state,
      player: { ...state.player, hp: state.player.hp - preview.hpLoss },
      defeatedEnemyIds: [...state.defeatedEnemyIds, enemy.id],
    },
    effect: { kind: 'enemyDefeated', enemyId: enemy.id, hpLost: preview.hpLoss },
  };
}
```

- [ ] **Step 5: Run combat tests and the unit suite**

```bash
bun run test:unit -- src/game/combat.test.ts
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
- Produces: `attemptMove(state: GameState, direction: Direction): ActionResult`
- Produces: `interactWithEntity(state: GameState, entity: Entity, fromTile: Tile): ActionResult`
- Produces: `dispatchInput(session: SessionState, input: InputCommand): SessionTransition`
- Produces: `PendingInteraction`, `SessionState`, `InputCommand`, `SessionTransition`
- Later `WorldScene` sends only `InputCommand`; it does not implement rule switches itself.

- [ ] **Step 1: Write failing movement/action tests**

Create `src/game/movement.test.ts` with these cases:

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
  it('blocks the closed latch from the front without moving', () => {
    expect(attemptMove(base, 'east')).toEqual({ ok: false, reason: 'latch-closed-front' });
  });

  it('opens the latch when bumped from the rear and stays on the previous tile', () => {
    const rear = { ...base, tile: { x: 8, y: 5 } };
    const result = attemptMove(rear, 'west');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.tile).toEqual({ x: 8, y: 5 });
    expect(result.state.openedShortcutIds).toContain('floor1-rear-latch');
  });

  it('walks through the latch after it is open', () => {
    const open = { ...base, openedShortcutIds: ['floor1-rear-latch'] };
    const result = attemptMove(open, 'east');
    expect(result.ok && result.state.tile).toEqual({ x: 7, y: 5 });
  });
});
```

Create `src/game/actions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findEntityById } from './content';
import { interactWithEntity } from './actions';
import { createInitialGameState } from './state';

const reward = findEntityById('floor1-power-core');
if (!reward || reward.kind !== 'reward') throw new Error('reward missing');

describe('reward action', () => {
  it('applies the permanent attack reward exactly once', () => {
    const state = { ...createInitialGameState(), mapId: 'floor1' as const, tile: { x: 9, y: 4 } };
    const first = interactWithEntity(state, reward, state.tile);
    expect(first.ok && first.state.player.attack).toBe(12);
    if (!first.ok) return;
    expect(interactWithEntity(first.state, reward, first.state.tile)).toEqual({
      ok: false,
      reason: 'reward-already-taken',
    });
  });
});
```

- [ ] **Step 2: Write failing session tests for modal combat gating**

Create `src/game/session.test.ts`:

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
  it('blocks movement while combat is pending', () => {
    expect(dispatchInput(pending, { kind: 'move', direction: 'north' })).toEqual({
      ok: false,
      session: pending,
      reason: 'interaction-pending',
    });
  });

  it('cancel clears pending without changing GameState', () => {
    expect(dispatchInput(pending, { kind: 'cancel' })).toEqual({
      ok: true,
      session: { ...pending, pending: null },
      effect: null,
    });
  });
});
```

- [ ] **Step 3: Run the focused tests and verify they fail**

```bash
bun run test:unit -- src/game/movement.test.ts src/game/actions.test.ts src/game/session.test.ts
```

Expected: FAIL because the modules/session types do not exist.

- [ ] **Step 4: Add session/input types**

Add to `src/game/types.ts`:

```ts
export type PendingInteraction =
  | null
  | Readonly<{ kind: 'combat'; enemyId: string; preview: WinnableCombatPreview }>;

export type SessionState = Readonly<{ game: GameState; pending: PendingInteraction }>;

export type InputCommand =
  | Readonly<{ kind: 'move'; direction: Direction }>
  | Readonly<{ kind: 'fight' }>
  | Readonly<{ kind: 'cancel' }>;

export type SessionTransition =
  | Readonly<{ ok: true; session: SessionState; effect: ActionEffect | null }>
  | Readonly<{ ok: false; session: SessionState; reason: BlockedReason }>;
```

- [ ] **Step 5: Implement closed entity actions**

Create `src/game/actions.ts` with an exhaustive switch:

```ts
import { previewCombat } from './combat';
import type { ActionResult, Direction, Entity, GameState, Tile } from './types';

const OPPOSITE: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

function directionFromTo(from: Tile, to: Tile): Direction | null {
  if (to.x === from.x && to.y === from.y - 1) return 'north';
  if (to.x === from.x && to.y === from.y + 1) return 'south';
  if (to.x === from.x - 1 && to.y === from.y) return 'west';
  if (to.x === from.x + 1 && to.y === from.y) return 'east';
  return null;
}

export function interactWithEntity(state: GameState, entity: Entity, fromTile: Tile): ActionResult {
  switch (entity.kind) {
    case 'clue':
      return { ok: true, state, effect: { kind: 'clue', text: entity.text } };
    case 'recovery': {
      const next = { ...state, player: { ...state.player, hp: state.player.maxHp } };
      return { ok: true, state: next, effect: { kind: 'healed', hp: next.player.hp } };
    }
    case 'reward': {
      if (state.openedRewardIds.includes(entity.id)) return { ok: false, reason: 'reward-already-taken' };
      const current = state.player[entity.stat];
      const player = { ...state.player, [entity.stat]: current + entity.amount };
      if (entity.stat === 'maxHp') player.hp += entity.amount;
      return {
        ok: true,
        state: { ...state, player, openedRewardIds: [...state.openedRewardIds, entity.id] },
        effect: { kind: 'reward', stat: entity.stat, amount: entity.amount },
      };
    }
    case 'latch': {
      if (state.openedShortcutIds.includes(entity.id)) {
        return { ok: true, state, effect: { kind: 'latchOpened', id: entity.id } };
      }
      const approach = directionFromTo(entity.tile, fromTile);
      if (approach !== entity.rearSide) return { ok: false, reason: 'latch-closed-front' };
      return {
        ok: true,
        state: { ...state, openedShortcutIds: [...state.openedShortcutIds, entity.id] },
        effect: { kind: 'latchOpened', id: entity.id },
      };
    }
    case 'enemy': {
      if (state.defeatedEnemyIds.includes(entity.id)) {
        return { ok: true, state, effect: { kind: 'enemyDefeated', enemyId: entity.id, hpLost: 0 } };
      }
      const preview = previewCombat(state.player, entity.stats);
      if (!preview.winnable) return { ok: false, reason: preview.reason };
      return { ok: true, state, effect: { kind: 'combatPrompt', enemyId: entity.id, preview } };
    }
    case 'portal':
      throw new Error('Portals are step-on movement, not bump interactions');
  }
}
```

Note: `directionFromTo(entity.tile, fromTile)` returns the side the player occupies relative to the latch. For `rearSide: 'east'`, the player must be at `x + 1`.

- [ ] **Step 6: Implement movement and step-on portals**

Create `src/game/movement.ts`:

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

export function attemptMove(state: GameState, direction: Direction): ActionResult {
  const delta = DELTA[direction];
  const target = { x: state.tile.x + delta.x, y: state.tile.y + delta.y };
  if (!isInBounds(state.mapId, target)) return { ok: false, reason: 'out-of-bounds' };
  if (!isLayoutFloor(state.mapId, target)) return { ok: false, reason: 'wall' };

  const entity = getEntityAt(state.mapId, target);
  if (entity) {
    if (entity.kind === 'portal') {
      return {
        ok: true,
        state: { ...state, mapId: entity.target.mapId, tile: entity.target.tile },
        effect: { kind: 'traveled', mapId: entity.target.mapId },
      };
    }
    if (entity.kind === 'latch' && state.openedShortcutIds.includes(entity.id)) {
      return { ok: true, state: { ...state, tile: target }, effect: { kind: 'moved' } };
    }
    if (entity.kind === 'enemy' && state.defeatedEnemyIds.includes(entity.id)) {
      return { ok: true, state: { ...state, tile: target }, effect: { kind: 'moved' } };
    }
    return interactWithEntity(state, entity, state.tile);
  }

  return { ok: true, state: { ...state, tile: target }, effect: { kind: 'moved' } };
}
```

- [ ] **Step 7: Implement the tiny pure session dispatcher**

Create `src/game/session.ts`:

```ts
import { findEntityById } from './content';
import { resolveCombat } from './combat';
import { attemptMove } from './movement';
import type { InputCommand, SessionState, SessionTransition } from './types';

export function dispatchInput(session: SessionState, input: InputCommand): SessionTransition {
  if (session.pending) {
    if (input.kind === 'move') return { ok: false, session, reason: 'interaction-pending' };
    if (input.kind === 'cancel') return { ok: true, session: { ...session, pending: null }, effect: null };

    const entity = findEntityById(session.pending.enemyId);
    if (!entity || entity.kind !== 'enemy') throw new Error('Pending combat enemy missing');
    const result = resolveCombat(session.game, entity);
    if (!result.ok) return { ok: false, session, reason: result.reason };
    return { ok: true, session: { game: result.state, pending: null }, effect: result.effect };
  }

  if (input.kind !== 'move') return { ok: true, session, effect: null };

  const result = attemptMove(session.game, input.direction);
  if (!result.ok) return { ok: false, session, reason: result.reason };
  if (result.effect.kind === 'combatPrompt') {
    return {
      ok: true,
      session: {
        game: result.state,
        pending: { kind: 'combat', enemyId: result.effect.enemyId, preview: result.effect.preview },
      },
      effect: result.effect,
    };
  }
  return { ok: true, session: { ...session, game: result.state }, effect: result.effect };
}
```

- [ ] **Step 8: Run the pure-domain tests**

```bash
bun run test:unit -- src/game/movement.test.ts src/game/actions.test.ts src/game/session.test.ts
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
- Modify: `src/phaser/WorldScene.ts`
- Modify: `src/phaser/createGame.ts`
- Modify: `src/ui/InteractionOverlay.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `TILE_SIZE = 32`
- Produces: `resolveAssetId(entity: Entity): string`
- `WorldScene` consumes `getSession(): SessionState` and `onInput(input: InputCommand): void`
- `InteractionOverlay` consumes `GameState`, `PendingInteraction`, `ActionEffect | null`, `BlockedReason | null`
- Main remains the only mutable composition root; Phaser and overlay receive state/results.

- [ ] **Step 1: Add a failing asset-contract unit test**

Create `src/phaser/assets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findEntityById } from '../game/content';
import { resolveAssetId, TILE_SIZE } from './assets';

describe('placeholder asset contract', () => {
  it('uses one fixed tile size and defaults entity asset ids to kind', () => {
    const reward = findEntityById('floor1-power-core');
    if (!reward) throw new Error('reward missing');
    expect(TILE_SIZE).toBe(32);
    expect(resolveAssetId(reward)).toBe('reward');
  });
});
```

Run:

```bash
bun run test:unit -- src/phaser/assets.test.ts
```

Expected: FAIL because `assets.ts` does not exist.

- [ ] **Step 2: Add the asset seam**

Create `src/phaser/assets.ts`:

```ts
import type { Entity } from '../game/types';

export const TILE_SIZE = 32;

export function resolveAssetId(entity: Entity): string {
  return entity.assetId ?? entity.kind;
}
```

- [ ] **Step 3: Replace the placeholder scene with authored tile/entity rendering**

Make `WorldScene` take runtime callbacks in its constructor:

```ts
import Phaser from 'phaser';
import { MAPS } from '../game/content';
import type { InputCommand, SessionState } from '../game/types';
import { resolveAssetId, TILE_SIZE } from './assets';

export type WorldSceneDeps = {
  getSession: () => SessionState;
  onInput: (input: InputCommand) => void;
};

export class WorldScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private renderedMapId?: string;

  constructor(private readonly deps: WorldSceneDeps) {
    super('world');
  }

  create(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.renderWorld();
  }

  update(): void {
    const command = this.readOneMoveCommand();
    if (command) this.deps.onInput(command);
    if (this.renderedMapId !== this.deps.getSession().game.mapId) this.renderWorld();
  }

  refresh(): void {
    this.renderWorld();
  }

  private renderWorld(): void {
    this.children.removeAll();
    const state = this.deps.getSession().game;
    const map = MAPS[state.mapId];
    this.renderedMapId = map.id;

    map.layout.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          cell === '#' ? 0x333333 : 0x777777,
        );
      });
    });

    for (const entity of map.entities) {
      if (entity.kind === 'reward' && state.openedRewardIds.includes(entity.id)) continue;
      if (entity.kind === 'enemy' && state.defeatedEnemyIds.includes(entity.id)) continue;
      const assetId = resolveAssetId(entity);
      const label = this.add.text(
        entity.tile.x * TILE_SIZE + TILE_SIZE / 2,
        entity.tile.y * TILE_SIZE + TILE_SIZE,
        assetId[0]!.toUpperCase(),
      );
      label.setOrigin(0.5, 1);
    }

    const player = this.add.text(
      state.tile.x * TILE_SIZE + TILE_SIZE / 2,
      state.tile.y * TILE_SIZE + TILE_SIZE,
      '@',
    );
    player.setOrigin(0.5, 1);
    this.cameras.main.startFollow(player, true);
    this.cameras.main.setBounds(0, 0, map.layout[0]!.length * TILE_SIZE, map.layout.length * TILE_SIZE);
  }

  private readOneMoveCommand(): InputCommand | null {
    if (!this.cursors) return null;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) return { kind: 'move', direction: 'north' };
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) return { kind: 'move', direction: 'south' };
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) return { kind: 'move', direction: 'west' };
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) return { kind: 'move', direction: 'east' };
    return null;
  }
}
```

`renderWorld()` may be optimized later only if a measured need appears. For this MVP slice, rebuilding a tiny map after committed actions is simpler than maintaining independent sprite flags.

- [ ] **Step 4: Update `createGame` to inject callbacks**

```ts
import Phaser from 'phaser';
import { WorldScene, type WorldSceneDeps } from './WorldScene';

export function createGame(parent: HTMLElement, deps: WorldSceneDeps): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 640,
    height: 480,
    scene: [new WorldScene(deps)],
    pixelArt: true,
  });
}
```

- [ ] **Step 5: Make the DOM overlay exhaustive and user-facing**

Extend `InteractionOverlay` with stable blocked-reason copy and combat controls:

```ts
import type { ActionEffect, BlockedReason, GameState, PendingInteraction } from '../game/types';

const REASON_TEXT: Record<BlockedReason, string> = {
  wall: 'A wall blocks the way.',
  'out-of-bounds': 'You cannot go that way.',
  'interaction-pending': 'Finish the current interaction first.',
  'latch-closed-front': 'The latch only opens from the other side.',
  'combat-unwinnable': 'Your attack cannot damage this enemy.',
  'combat-lethal': 'This fight would defeat you.',
  'reward-already-taken': 'The reward has already been claimed.',
};

export type OverlayView = {
  state: GameState;
  mapName: string;
  pending: PendingInteraction;
  effect: ActionEffect | null;
  blocked: BlockedReason | null;
};
```

Render persistent HUD plus transient area. For blocked output use:

```html
<div data-testid="blocked-reason" data-reason="combat-lethal">This fight would defeat you.</div>
```

For pending combat render:

```html
<section data-testid="combat-prompt">
  <span data-testid="combat-hp-loss">HP loss: 10</span>
  <button type="button" data-action="fight">Fight</button>
  <button type="button" data-action="cancel">Cancel</button>
</section>
```

Add callbacks to the overlay constructor:

```ts
constructor(
  private readonly root: HTMLElement,
  private readonly onFight: () => void,
  private readonly onCancel: () => void,
) {}
```

After each render, wire `[data-action="fight"]` and `[data-action="cancel"]` buttons to those callbacks.

- [ ] **Step 6: Compose session + scene + overlay in `main.ts` without putting rules there**

Use this shape:

```ts
import { MAPS } from './game/content';
import { createInitialGameState } from './game/state';
import { dispatchInput } from './game/session';
import type { ActionEffect, BlockedReason, InputCommand, SessionState } from './game/types';

let session: SessionState = { game: createInitialGameState(), pending: null };
let effect: ActionEffect | null = null;
let blocked: BlockedReason | null = null;

function renderUi(): void {
  overlay.render({ state: session.game, mapName: MAPS[session.game.mapId].name, pending: session.pending, effect, blocked });
}

function handleInput(input: InputCommand): void {
  const transition = dispatchInput(session, input);
  if (transition.ok) {
    session = transition.session;
    effect = transition.effect;
    blocked = null;
  } else {
    blocked = transition.reason;
  }
  scene.refresh();
  renderUi();
}
```

The exact variable ordering can differ, but rule decisions must stay inside pure modules.

- [ ] **Step 7: Run the presentation gate**

```bash
bun run test:unit -- src/phaser/assets.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run test:e2e
```

Expected: PASS. The existing Playwright HUD test must still pass against the real rendered app.

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
- Modify: `src/game/content.ts`
- Modify: `src/ui/InteractionOverlay.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `saveGame(storage: Storage, state: GameState): void`
- Produces: `loadGame(storage: Storage): LoadResult`
- Produces: `resetGame(storage: Storage): GameState`
- Produces: `LoadResult = fresh | loaded | invalid`
- Main calls `saveGame` only when `GameState` identity changes after a successful transition.

- [ ] **Step 1: Write failing persistence tests including stale-content validation**

Create `src/game/save.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { loadGame, saveGame } from './save';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

let storage: MemoryStorage;
beforeEach(() => { storage = new MemoryStorage(); });

describe('save/load', () => {
  it('starts fresh only when the key is missing', () => {
    expect(loadGame(storage)).toEqual({ kind: 'fresh', state: createInitialGameState() });
  });

  it('round-trips ordinary movement position', () => {
    const moved = { ...createInitialGameState(), tile: { x: 3, y: 5 } };
    saveGame(storage, moved);
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state: moved });
  });

  it('rejects malformed JSON instead of silently starting fresh', () => {
    storage.setItem('eridanus.save', '{bad');
    expect(loadGame(storage)).toEqual({ kind: 'invalid', reason: 'malformed-json' });
  });

  it('rejects a snapshot that references removed content', () => {
    storage.setItem('eridanus.save', JSON.stringify({
      ...createInitialGameState(),
      defeatedEnemyIds: ['removed-enemy'],
    }));
    expect(loadGame(storage)).toEqual({ kind: 'invalid', reason: 'invalid-content' });
  });
});
```

- [ ] **Step 2: Run persistence tests and verify they fail**

```bash
bun run test:unit -- src/game/save.test.ts
```

Expected: FAIL because `save.ts` does not exist.

- [ ] **Step 3: Implement shape + content validation with no migrations**

Create `src/game/save.ts`:

```ts
import { findEntityById, isLayoutFloor, MAPS } from './content';
import { createInitialGameState } from './state';
import type { GameState, MapId } from './types';

const SAVE_KEY = 'eridanus.save';

export type LoadResult =
  | { kind: 'fresh'; state: GameState }
  | { kind: 'loaded'; state: GameState }
  | { kind: 'invalid'; reason: 'malformed-json' | 'invalid-shape' | 'invalid-content' };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function parseShape(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<GameState>;
  if (typeof candidate.mapId !== 'string' || !candidate.tile || !candidate.player) return null;
  if (!isStringArray(candidate.openedRewardIds) || !isStringArray(candidate.defeatedEnemyIds) || !isStringArray(candidate.openedShortcutIds)) return null;
  if (typeof candidate.tile.x !== 'number' || typeof candidate.tile.y !== 'number') return null;
  if (typeof candidate.player.hp !== 'number' || typeof candidate.player.maxHp !== 'number' || typeof candidate.player.attack !== 'number' || typeof candidate.player.defense !== 'number') return null;
  return candidate as GameState;
}

function isContentValid(state: GameState): boolean {
  if (!(state.mapId in MAPS)) return false;
  if (!isLayoutFloor(state.mapId as MapId, state.tile)) return false;
  if (!state.openedRewardIds.every((id) => findEntityById(id)?.kind === 'reward')) return false;
  if (!state.defeatedEnemyIds.every((id) => findEntityById(id)?.kind === 'enemy')) return false;
  if (!state.openedShortcutIds.every((id) => findEntityById(id)?.kind === 'latch')) return false;
  return true;
}

export function saveGame(storage: Storage, state: GameState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(storage: Storage): LoadResult {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return { kind: 'fresh', state: createInitialGameState() };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'malformed-json' };
  }

  const state = parseShape(parsed);
  if (!state) return { kind: 'invalid', reason: 'invalid-shape' };
  if (!isContentValid(state)) return { kind: 'invalid', reason: 'invalid-content' };
  return { kind: 'loaded', state };
}

export function resetGame(storage: Storage): GameState {
  storage.removeItem(SAVE_KEY);
  return createInitialGameState();
}
```

- [ ] **Step 4: Add the invalid-save recovery UI**

Extend `InteractionOverlay` with:

```ts
renderInvalidSave(onReset: () => void): void {
  this.root.innerHTML = `
    <section role="alert" data-testid="invalid-save">
      <p>The local save cannot be loaded.</p>
      <button type="button" data-action="reset-save">Reset save</button>
    </section>
  `;
  this.root.querySelector<HTMLButtonElement>('[data-action="reset-save"]')?.addEventListener('click', onReset);
}
```

- [ ] **Step 5: Make `main.ts` load first and autosave every state change**

At startup:

```ts
const load = loadGame(window.localStorage);
if (load.kind === 'invalid') {
  overlay.renderInvalidSave(() => {
    session = { game: resetGame(window.localStorage), pending: null };
    startRuntime();
  });
} else {
  session = { game: load.state, pending: null };
  startRuntime();
}
```

In `handleInput`, capture the prior durable state and save only when a successful transition changes it:

```ts
const previousGame = session.game;
const transition = dispatchInput(session, input);
if (transition.ok) {
  session = transition.session;
  if (session.game !== previousGame) saveGame(window.localStorage, session.game);
}
```

This saves ordinary movement, travel, reward, recovery, latch opening, and combat resolution, but not opening/cancelling a combat prompt.

- [ ] **Step 6: Run persistence and full gates**

```bash
bun run test:unit -- src/game/save.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run test:e2e
```

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add src/game/save.ts src/game/save.test.ts src/ui/InteractionOverlay.ts src/main.ts
git commit -m "feat: persist tower progress locally"
```

---

### Task 7: Expand the Playwright Spec into the Complete HPA-237 Journey

**Files:**
- Modify: `tests/e2e/cross-floor.spec.ts`
- Modify only if the test exposes real gameplay readability issues: `src/game/content/village.ts`, `src/game/content/floor1.ts`, `src/game/content/floor2.ts`
- Modify only if user-facing copy needs clarity: `src/ui/InteractionOverlay.ts`

**Interfaces:**
- Consumes the real keyboard path, HUD, combat controls, LocalStorage persistence, and authored maps.
- Produces no test-only game API.

- [ ] **Step 1: Add small real-input helpers inside the E2E file**

At the top of `tests/e2e/cross-floor.spec.ts` add:

```ts
import type { Page } from '@playwright/test';

async function press(page: Page, key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight', count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) await page.keyboard.press(key);
}
```

Do not import game internals into Playwright.

- [ ] **Step 2: Add the failing full journey test**

Append:

```ts
test('completes the cross-floor reward, combat, shortcut, recovery, and reload loop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Village lead: start (2,5), move to (3,5), bump clue at (4,5).
  await press(page, 'ArrowRight', 2);
  await expect(page.getByTestId('interaction')).toContainText('old tower path');

  // Reach village portal at (9,2) and enter Floor 1 at (2,9).
  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight', 6);
  await expect(page.getByTestId('map-name')).toHaveText('Tower Floor 1');

  // Reach the Floor 1 clue from below, then route around it to the Floor 2 portal.
  await press(page, 'ArrowRight', 3);
  await press(page, 'ArrowUp', 4);
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('interaction')).toContainText('Scratches on the stone');
  await page.keyboard.press('ArrowLeft');
  await press(page, 'ArrowUp', 3);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('map-name')).toHaveText('Tower Floor 2');

  // Cross Floor 2 from (1,8) to rear portal (14,1).
  await press(page, 'ArrowRight', 13);
  await press(page, 'ArrowUp', 7);
  await expect(page.getByTestId('map-name')).toHaveText('Tower Floor 1');

  // Rear arrival at (14,2): approach enemy at (11,5), preview before reward, then cancel.
  await press(page, 'ArrowDown', 3);
  await press(page, 'ArrowLeft', 2);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 15');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Route around enemy and collect +2 ATK reward at (9,5).
  await page.keyboard.press('ArrowUp');
  await press(page, 'ArrowLeft', 3);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');

  // Return to enemy, verify cheaper preview, then fight.
  await press(page, 'ArrowRight', 3);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 10');
  await page.getByRole('button', { name: 'Fight' }).click();
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 20/30');

  // Walk to latch rear, open it, then reload while standing at (8,5).
  await press(page, 'ArrowLeft', 3);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('interaction')).toContainText('shortcut');
  await page.reload();
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 20/30');

  // Traverse the now-open latch to the front and return through the village portal.
  await press(page, 'ArrowLeft', 2);
  await press(page, 'ArrowLeft', 4);
  await press(page, 'ArrowDown', 4);
  await expect(page.getByTestId('map-name')).toHaveText('Starting Village');

  // Move from village portal (9,2) to (3,2), bump recovery at (2,2), and heal.
  await press(page, 'ArrowLeft', 7);
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');

  // Final reload preserves permanent progression and current village position.
  await page.reload();
  await expect(page.getByTestId('map-name')).toHaveText('Starting Village');
  await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 12');
  await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
});
```

If a move count fails, inspect the actual authored map and fix the map/readability or the explicit path in this test. Do not add a teleport/test API.

- [ ] **Step 3: Run the E2E test and capture the first real failure**

```bash
bun run test:e2e -- tests/e2e/cross-floor.spec.ts
```

Expected before final integration polish: at least one assertion/path may fail due to missing transient copy or scene refresh behavior. Fix the product behavior, not the test by bypassing gameplay.

- [ ] **Step 4: Make the minimum user-facing corrections exposed by E2E**

Allowed corrections in this task are limited to:

```text
- map geometry that makes the intended route impossible/unclear
- interaction copy needed to understand clue/reward/latch feedback
- scene refresh after a committed state change
- button wiring/focus that prevents Fight/Cancel from working
- the exact enemy/reward numbers already locked to 15 HP → 10 HP
```

Do not introduce new systems or additional floor content.

For latch feedback, use copy such as:

```ts
case 'latchOpened':
  return 'The rear latch opens. The shortcut is now usable from both sides.';
```

- [ ] **Step 5: Run the complete browser journey until green**

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
- Modify only if verification finds a concrete defect: files from Tasks 1–7

**Interfaces:**
- No new interfaces. This task verifies the complete HPA-237 contract and keeps the PR planning/execution artifacts accurate.

- [ ] **Step 1: Run all three CI-equivalent commands locally**

Build & lint equivalent:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run build
```

Expected: PASS.

Unit-test equivalent:

```bash
bun run test:unit
```

Expected: PASS.

Playwright equivalent:

```bash
bunx playwright install chromium
bun run test:e2e
```

Expected: PASS.

- [ ] **Step 2: Verify malformed-save recovery manually**

Open browser devtools and execute:

```js
localStorage.setItem('eridanus.save', '{bad');
location.reload();
```

Expected: the app shows the explicit invalid-save recovery UI, not a fresh game.

Click **Reset save**.

Expected: HUD returns to Starting Village, HP 30/30, ATK 10, DEF 2.

- [ ] **Step 3: Verify pre-commit behavior stays lightweight**

Make a harmless formatting-only edit to `README.md`, stage it, then run:

```bash
.husky/pre-commit
```

Expected: lint-staged runs only staged ESLint/Prettier work; it does not run Vitest or Playwright.

Restore or keep the formatted README edit as appropriate.

- [ ] **Step 4: Finish README with architecture and development commands**

README must contain these sections with concrete commands:

```markdown
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
```
```

- [ ] **Step 5: Inspect the final diff for scope creep**

Run:

```bash
git diff main...HEAD --stat
git diff main...HEAD -- . ':!docs/superpowers/plans/2026-09-15-hpa-237-cross-floor-slice.md'
```

Confirm there is no implementation of:

```text
discovery/fog
save migrations/versioning
backend/accounts
ECS
quest/event DSL
battle scene
inventory/equipment/crafting
map editor
procedural generation
test-only game API
```

- [ ] **Step 6: Commit final documentation/verification fixes**

```bash
git add README.md
git commit -m "docs: document Eridanus development workflow"
```

If README already matches exactly and no code defect was found, skip an empty commit.

---

## Risks to Watch During Execution

1. **Combat prompt ownership:** if movement gating or pending enemy identity appears inside `WorldScene`, stop and move it back into `PendingInteraction` + `dispatchInput` before continuing.
2. **Content drift:** if a map change requires a new one-off entity shape, first prove the existing closed union cannot represent the mechanic. Do not add generic trigger objects.
3. **Save drift:** if authored geometry/entity IDs change, keep load validation strict and let old development saves fail into explicit reset; do not add migration code.
4. **Presentation duplication:** if Phaser and the DOM overlay both start deriving combat/reward decisions, move the decision back into `ActionEffect`/`BlockedReason`; presentation should only render typed results.

## Self-Review

### Spec coverage

- Tooling, Bun pin, ESLint/Prettier/Husky/lint-staged: Task 1.
- Three independent CI jobs: Task 1.
- One plain durable GameState + no discovery state: Tasks 1–2.
- Closed authored map/entity schema and reciprocal portals: Task 2.
- Deterministic combat formula, no final retaliation, unwinnable/lethal blocking: Task 3.
- Rear-only latch opening then two-way traversal: Task 4.
- Bump interactions and step-on portals: Task 4.
- Transient combat prompt and movement gating outside Phaser/durable state: Task 4.
- One reusable WorldScene, camera follow, tile-coordinate collision, placeholder asset seam: Task 5.
- Persistent map/HP/ATK/DEF HUD plus Fight/Cancel and blocked reasons: Task 5.
- One LocalStorage snapshot, movement autosave, malformed/content-invalid explicit reset: Task 6.
- Complete village → F1 → F2 → rear F1 → reward → cheaper combat → latch → village → reload path: Task 7.
- Final art remains deferred to HPA-22; no generated art work is mixed into HPA-237.

No spec requirement is left without an implementation task.

### Placeholder scan

The plan contains no `TBD`, `TODO`, “implement later”, generic “add tests”, or “similar to Task N” instructions. Every coding task has named files, concrete interfaces, test examples, commands, expected outcomes, and commit checkpoints.

### Type consistency

The plan consistently uses:

```text
MapId / Tile / Direction / Stat
GameState
Entity / MapDefinition / MAPS
CombatPreview / WinnableCombatPreview
BlockedReason / ActionEffect / ActionResult
PendingInteraction / SessionState / InputCommand / SessionTransition
attemptMove / interactWithEntity / previewCombat / resolveCombat / dispatchInput
saveGame / loadGame / resetGame
```

No later task renames those interfaces.
