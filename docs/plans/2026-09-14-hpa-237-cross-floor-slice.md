# HPA-237 — Cross-floor exploration and combat loop implementation plan

## Goal

Implement the first playable Tower Maze slice in one PR and leave Eridanus with the smallest reusable foundation needed by the remaining MVP content tickets.

## Delivery rule

One ticket = one PR. Do not split project scaffolding, developer tooling, CI, gameplay foundation, content schema, combat, persistence, and authored vertical-slice content into separate PRs.

## Task 1 — Bootstrap the web game and developer tooling

Set up the greenfield project with Bun as the package manager.

Runtime/tooling:

- Vite + TypeScript;
- Phaser;
- ESLint with a small TypeScript-focused flat config;
- Prettier;
- Husky;
- lint-staged;
- Vitest;
- Playwright;
- GitHub Actions.

Pin Bun in `package.json` using `packageManager`, and use the same version in CI.

Expected scripts should include the equivalents of:

```text
bun run dev
bun run build
bun run typecheck
bun run lint
bun run format
bun run format:check
bun run test:unit
bun run test:e2e
```

Use a simple browser entrypoint that mounts Phaser plus a tiny framework-free DOM overlay. Do not add Svelte/React or another UI framework.

### Pre-commit behavior

Configure Husky with one lightweight pre-commit hook that invokes lint-staged.

lint-staged should run ESLint and Prettier against staged supported source/config files. Keep the hook fast: do not run the complete unit or Playwright suites on every commit.

### CI workflow

Add one `.github/workflows/ci.yml` with exactly three independent jobs.

#### Job 1 — Build & lint

Run:

- pinned Bun setup;
- frozen dependency install;
- TypeScript typecheck;
- ESLint;
- Prettier check;
- production Vite build.

#### Job 2 — Unit test

Run:

- pinned Bun setup;
- frozen dependency install;
- Vitest in CI mode.

#### Job 3 — Playwright test

Run:

- pinned Bun setup;
- frozen dependency install;
- install Playwright Chromium/dependencies;
- start the app through Playwright `webServer` or the simplest equivalent;
- execute the browser E2E suite.

Do not add job matrices, cross-job artifacts, reusable workflows, multiple workflow files, or CI orchestration that does not improve this small project.

Validation for Task 1:

- fresh frozen install succeeds after lockfile creation;
- typecheck succeeds;
- lint and format checks succeed;
- unit test command is wired;
- Playwright config/command is wired;
- production build succeeds;
- Husky/lint-staged installs through the normal package lifecycle.

Do not create a disposable Playwright smoke test here; the first browser test should be the real critical journey in Task 8.

## Task 2 — Lock the domain/content contracts and author the three real maps once

Create the engine-independent game boundary and write the actual village, Floor 1 slice, and Floor 2 slice immediately using one closed schema.

Implement:

- closed `MapId` for the current authored maps;
- shared `Tile` type;
- `MapDefinition`;
- discriminated `Entity` union for:
  - clue;
  - reward;
  - enemy;
  - latch;
  - recovery;
  - portal;
- stable map/entity/asset IDs;
- `GameState` with current map/tile, player stats, opened rewards, defeated enemies, and opened shortcuts;
- one small `ActionResult` union:

```ts
type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };
```

Author the complete three-map slice now rather than stubs:

- compact village;
- Floor 1 front route + rear payoff route + latch;
- Floor 2 connector route.

Content tests:

- map/entity IDs are unique;
- all entity tiles are in bounds;
- map/portal references resolve;
- intended bidirectional portal pairs are reciprocal;
- default state points to valid authored content;
- latch front/rear neighbors are valid authored tiles.

Do not add discovery sections, inheritance, generic trigger objects, scripting DSLs, floor subclasses, or ECS components.

## Task 3 — Implement movement, interaction semantics, rendering, and asset seams together

Add pure movement/collision helpers and connect them to one reusable Phaser `WorldScene`.

### Movement

- four-direction one-tile movement;
- blocked floor/latch/enemy tiles reject ordinary movement;
- blocked moves return `{ ok: false, reason }` without mutating state;
- successful movement returns committed state.

### Fixed interaction language

Use entity kind to determine interaction behavior; do not introduce a generic interaction engine.

**Bump-to-interact:**

- clue;
- reward;
- enemy;
- latch;
- recovery point.

The player remains on the previous tile during those interactions.

**Step-on:**

- portals/stairs.

Successful entry immediately resolves to the authored target map/tile without a confirmation dialog.

### Latch behavior

Author each latch with:

- its tile;
- `frontTile`;
- `rearTile`.

Rules:

- closed latch is non-walkable;
- bump from rear opens it and records its ID;
- bump from front while closed returns a blocked reason;
- once open, its tile is normal walkable floor from either direction.

### WorldScene + asset contract from day one

`WorldScene` should:

- render the current authored map;
- follow the player with a scrolling camera;
- translate keyboard input into pure domain actions;
- update presentation from authoritative state;
- use one tile-size constant;
- resolve stable asset IDs to placeholder visuals;
- use one-tile logical player/enemy footprints;
- anchor character/entity visuals bottom-center;
- use tile coordinates, not sprite bounds, for collision/interaction;
- swap rendered map when domain state changes location.

This is the HPA-22 replacement seam; do not defer it to a later retrofit task.

Unit tests:

- allowed and blocked movement;
- bump interactions do not move the player onto the entity tile;
- portal entry resolves to the correct target;
- reciprocal authored routes work as intended;
- latch rear/front/open behavior;
- blocked actions preserve the original state.

## Task 4 — Add the persistent DOM interaction/status overlay

Create one tiny framework-free DOM layer as real player-facing UI.

Persistent chrome:

- current map name;
- HP / max HP;
- ATK;
- DEF.

Transient content:

- clue text;
- reward/recovery feedback;
- combat preview;
- Fight / Cancel controls;
- blocked-action reasons.

Do not expose internal game state through a test-only API. Playwright should assert this user-facing UI while driving real keyboard input.

## Task 5 — Implement deterministic combat

Create one pure `previewCombat` calculation used by both UI preview and resolution.

Cover:

- player attacks first;
- `playerDamage <= 0` blocks combat;
- lethal predicted outcomes block combat;
- final enemy hit causes no retaliation;
- exact predicted HP loss is shown before confirmation;
- Fight / Cancel blocks normal movement while the prompt is active;
- Cancel leaves state and player tile unchanged;
- blocked combat leaves state/tile unchanged and returns a visible reason;
- successful defeat + HP loss commit exactly once;
- defeated enemy tile becomes traversable.

Keep presentation minimal: no battle scene, initiative, skills, status effects, or animation state machine.

Tests must explicitly prove preview/resolution agreement and formula edge cases.

## Task 6 — Implement reward, recovery, and other required domain actions

Add only the authored actions needed for the loop:

- inspect clue;
- collect one permanent stat upgrade;
- heal at village recovery;
- open latch from rear.

Rules:

- reward applies exactly once;
- recovery heals current HP to max without resetting any durable dungeon state;
- all blocked/successful paths use `ActionResult` consistently;
- every committed durable action autosaves through the persistence boundary.

Tests:

- duplicate reward is a no-op/blocked result without a second stat gain;
- recovery preserves reward/enemy/latch state;
- latch open state remains authoritative for walkability.

## Task 7 — Add explicit save/load failure handling

Use one LocalStorage snapshot.

Persist:

- current map and tile;
- HP/max HP, attack, defense;
- opened reward IDs;
- defeated enemy IDs;
- opened shortcut IDs.

Do not persist discovery state.

Load behavior:

- missing key → fresh game;
- valid snapshot → resume;
- JSON parse failure or invalid shape → do not silently reset;
- show an explicit recovery/reset choice through the DOM UI;
- reset may delete the bad snapshot and start fresh.

Do not add save version fields, migrations, repositories, IndexedDB, backend storage, or backward-compatibility infrastructure.

Tests:

- round-trip all durable fields;
- missing save returns a fresh game;
- malformed JSON returns a load failure;
- shape-invalid data returns a load failure;
- reward does not duplicate after reload;
- defeated enemy + HP loss remain committed;
- latch remains open;
- map/tile restores correctly.

## Task 8 — Add the critical Playwright journey

Implement one browser-level happy path proving that runtime wiring, real input, authored content, UI, and persistence work together.

Cover:

- launch from a fresh save;
- verify persistent map/HP/ATK/DEF chrome;
- leave the village and enter Floor 1;
- observe the unreachable reward / clue path;
- take the alternate Floor 2 route;
- return behind the Floor 1 barrier;
- collect the permanent reward;
- assert ATK (or whichever chosen stat) visibly changes;
- verify the relevant combat preview is cheaper;
- open the latch from the rear;
- verify the shortcut is usable;
- cross at least one reload boundary and assert committed progression through the user-facing UI.

Prefer role/text/data attributes on the real DOM overlay where useful. Do not use screenshots as the primary assertion and do not expose a test-only internal game API.

## Task 9 — Tune the authored slice, do not re-author it

Task 2 already contains the complete three real maps. This task is only for gameplay tuning after all rules are wired.

Tune:

- map geometry where route readability is poor;
- enemy/reward numbers so the permanent upgrade changes combat preview obviously;
- clue text so the alternate route is understandable without an exact-route quest arrow;
- shortcut placement so it meaningfully shortens the return trip;
- interaction copy if blocked states are unclear.

Do not introduce a second content schema or rewrite the maps into another format.

## Task 10 — Final validation

The PR is ready for implementation review only when all three CI jobs pass independently.

### Build & lint job

- pinned Bun;
- frozen install;
- typecheck;
- ESLint;
- Prettier check;
- production build.

### Unit test job

Vitest passes for:

- content validation;
- movement/interaction rules;
- latch semantics;
- combat;
- reward/recovery actions;
- persistence and malformed-save handling.

### Playwright test job

The critical browser journey passes in Chromium.

Manual gate from a fresh save:

- village → Floor 1 front route;
- observe unreachable reward;
- follow clue → Floor 2;
- return to rear Floor 1;
- collect upgrade;
- verify visible stat change and improved combat preview;
- open latch from the rear;
- traverse the now two-way shortcut;
- return to village;
- heal;
- reload and verify progression.

Also manually inject malformed LocalStorage data once and verify the game offers an explicit reset rather than silently wiping the save.

## Likely compact structure

```text
.github/
  workflows/
    ci.yml
.husky/
  pre-commit
src/
  main.ts
  game/
    state.ts
    content.ts
    movement.ts
    combat.ts
    actions.ts
    save.ts
    content/
      village.ts
      floor1.ts
      floor2.ts
  phaser/
    createGame.ts
    WorldScene.ts
  ui/
    InteractionOverlay.ts
tests/
  e2e/
    cross-floor.spec.ts
eslint.config.js
prettier.config.js
playwright.config.ts
vite.config.ts
vitest.config.ts
```

Treat this as guidance, not a requirement. Merge or remove modules if implementation stays clearer with fewer files.

## Scope guardrails

Do not add:

- discovery/fog state;
- ECS;
- generic quest/event scripting;
- generic interaction/trigger framework;
- dependency injection framework;
- repository abstraction over LocalStorage;
- save migration/version framework;
- map editor;
- battle scene;
- inventory/equipment/shop/crafting;
- procedural generation;
- backend/accounts/cloud save;
- CI matrices or reusable-workflow abstractions;
- test-only game APIs;
- abstractions justified only by hypothetical future games.

Prefer the simplest direct structure that cleanly supports the next Tower Maze content tickets.
