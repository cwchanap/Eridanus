# HPA-237 — Cross-floor exploration and combat loop implementation plan

## Goal

Implement the first playable Tower Maze slice in one PR and leave Eridanus with the smallest reusable foundation needed by the remaining MVP content tickets.

## Delivery rule

One ticket = one PR. Do not split project scaffolding, developer tooling, CI, gameplay foundation, content schema, combat, persistence, and authored vertical-slice content into separate PRs.

## Task 1 — Bootstrap the web game and prove the browser toolchain

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

Create `tests/e2e/cross-floor.spec.ts` immediately with its first real assertion that the actual app shell/browser path renders successfully (for example the Phaser canvas and persistent status chrome). This same file grows into the final journey later; do not create a disposable smoke test.

Validation for Task 1:

- fresh frozen install succeeds after lockfile creation;
- typecheck succeeds;
- lint and format checks succeed;
- unit test command executes;
- Playwright Chromium/webServer/CI job executes at least the first real app assertion;
- production build succeeds;
- Husky/lint-staged installs through the normal package lifecycle.

## Task 2 — Lock the content/state contracts and author the three real maps once

Create the engine-independent game boundary and write the actual village, Floor 1 slice, and Floor 2 slice immediately using one closed schema.

Implement:

- closed `MapId` for `village | floor1 | floor2`;
- shared `Tile` and `Direction` types;
- `MapDefinition` using rectangular ASCII `layout: readonly string[]` (`#` wall, `.` floor);
- `MAPS: Record<MapId, MapDefinition>` so every closed map ID must have a definition at compile time;
- discriminated `Entity` union for clue, reward, enemy, latch, recovery, and portal;
- optional `assetId` with central fallback to entity kind;
- latch `rearSide` instead of separately authored front/rear tiles;
- `GameState` with current map/tile, player stats, opened rewards, defeated enemies, and opened shortcuts;
- initial village start tile in default `GameState` rather than a generic spawn-point registry;
- closed `BlockedReason`, `ActionEffect`, and `ActionResult` unions.

Author the complete three-map slice now rather than stubs:

- compact village;
- Floor 1 front route + rear payoff route + latch;
- Floor 2 connector route.

Content tests:

- layouts are non-empty and rectangular;
- map/entity IDs are unique;
- entity tiles are in bounds and on floor;
- portal target tiles are valid floor tiles;
- intended bidirectional portal pairs are reciprocal;
- `MAPS` covers the closed `MapId` set;
- default state points to valid authored content.

Do not add discovery sections, width/height duplication, blocked-tile object lists, inheritance, generic trigger objects, scripting DSLs, floor subclasses, or ECS components.

## Task 3 — Implement pure movement and interaction actions

Build the domain rules before Phaser presentation.

### Movement

- four-direction one-tile movement using O(1) ASCII row/column collision lookup;
- wall/out-of-bounds moves return typed `BlockedReason` without mutating state;
- successful ordinary movement returns `ActionEffect: moved`;
- portals are step-on travel and return `ActionEffect: traveled`;
- defeated enemy tiles and opened latch tiles become traversable.

### Fixed bump interaction language

Use entity kind to determine interaction behavior; do not introduce a generic interaction engine.

Bump-to-interact:

- clue → clue effect/text;
- reward → permanent stat effect exactly once;
- enemy → combat prompt effect, not immediate combat resolution;
- latch → rear-only opening rule;
- recovery → heal effect.

The player remains on the previous tile during bump interactions.

### Latch behavior

Each latch stores only its tile plus `rearSide`.

- front side is the opposite direction;
- closed latch is non-walkable;
- bump from rear opens it and records its ID;
- bump from front while closed returns `latch-closed-front`;
- once open, its tile is ordinary two-way floor.

Unit tests:

- allowed/blocked movement;
- bump interactions preserve player tile;
- reward cannot apply twice;
- recovery preserves reward/enemy/latch progress;
- portal travel targets correct map/tile;
- latch rear/front/open behavior;
- all blocked actions preserve original state;
- returned effects/reasons are the expected closed union members.

## Task 4 — Add transient pending interaction and deterministic combat

Combat is the only modal interaction in this slice. Keep its pending mode typed, transient, pure, and outside both durable `GameState` and Phaser objects.

Implement:

```ts
type PendingInteraction =
  | null
  | { kind: 'combat'; enemyId: string; preview: CombatPreview };
```

A small pure input gate/dispatcher should enforce:

- enemy bump produces `combatPrompt` effect + pending combat;
- while pending combat exists, movement input is blocked/ignored in pure TypeScript;
- Cancel clears pending without mutating `GameState`;
- Fight resolves the pending enemy through the same combat preview contract.

`previewCombat` should return a discriminated result:

```ts
type CombatPreview =
  | { winnable: true; hitsNeeded: number; hpLoss: number }
  | { winnable: false; reason: 'combat-unwinnable' | 'combat-lethal' };
```

Rules:

- check `playerDamage <= 0` before division/`ceil`;
- player attacks first;
- final enemy hit does not retaliate;
- lethal means `hpLoss >= player.hp`; the player must finish above zero;
- exact same preview powers confirmation and resolution;
- successful defeat + HP loss commits exactly once;
- defeated enemy tile becomes traversable.

Tests:

- zero/negative player damage returns `combat-unwinnable` without Infinity math;
- equality-at-zero HP is lethal;
- preview/resolution agree;
- combat prompt itself does not mutate durable state;
- movement is blocked/ignored while prompt is pending;
- Cancel changes only transient pending state;
- successful Fight clears pending and commits defeat/HP loss once.

Do not build a generic state machine or event bus.

## Task 5 — Implement WorldScene, DOM overlay, and asset replacement seam

Connect the pure TypeScript domain to one reusable Phaser `WorldScene`.

### WorldScene

- render ASCII-authored map geometry;
- follow the player with Phaser camera follow;
- translate keyboard input to the pure domain/input gate;
- render from authoritative `GameState` + transient `PendingInteraction`;
- use one tile-size constant;
- resolve optional asset IDs centrally, defaulting to entity kind;
- use one-tile logical player/enemy footprints;
- anchor character/entity visuals bottom-center;
- use tile coordinates rather than sprite bounds for collision/interaction;
- swap rendered map on travel.

Do not store progression or modal flags independently on Phaser objects.

### DOM overlay

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

Use one UI mapping such as `Record<BlockedReason, string>` for human copy, and expose stable reason identifiers/data attributes so copy tuning does not break Playwright.

This rendering/asset contract is the replacement seam for HPA-22, the later task that swaps placeholder visuals for generated reusable Tower Maze art. Do not build a general asset pipeline here.

## Task 6 — Implement autosave and content-aware load validation

Use one LocalStorage snapshot of durable `GameState`; never persist `PendingInteraction`.

Persist:

- current map and tile;
- HP/max HP, attack, defense;
- opened reward IDs;
- defeated enemy IDs;
- opened shortcut IDs.

Autosave after every successful state-changing domain action, including ordinary movement. Actions that only open/cancel a transient prompt do not write because `GameState` did not change.

Load behavior:

- missing key → fresh game;
- valid snapshot → resume;
- JSON parse failure → explicit load failure/reset choice;
- shape-invalid snapshot → explicit load failure/reset choice;
- content-invalid snapshot → explicit load failure/reset choice.

Content-aware validation must check at least:

- current map exists in `MAPS`;
- current tile is in bounds and walkable;
- opened reward IDs resolve to reward entities;
- defeated enemy IDs resolve to enemy entities;
- opened shortcut IDs resolve to latch entities.

Do not add save version fields, migrations, repositories, IndexedDB, backend storage, or backward-compatibility infrastructure.

Tests:

- round-trip all durable fields;
- plain movement position survives round-trip;
- missing save returns fresh game;
- malformed JSON/invalid shape fail loudly;
- removed/nonexistent entity IDs fail content validation;
- reward does not duplicate after reload;
- defeated enemy + HP loss remain committed;
- latch remains open;
- map/tile restores exactly.

## Task 7 — Grow the real Playwright spec into the critical journey

Extend the same `tests/e2e/cross-floor.spec.ts` created in Task 1; do not replace it with a new suite.

Cover:

- launch from fresh save;
- verify persistent map/HP/ATK/DEF chrome;
- leave village and enter Floor 1;
- observe the unreachable reward / clue path;
- take the alternate Floor 2 route;
- return behind the Floor 1 barrier;
- collect the permanent reward;
- assert ATK (or chosen stat) visibly changes;
- verify relevant combat preview is cheaper;
- verify movement input is gated while Fight / Cancel is open;
- open latch from rear;
- verify shortcut is usable both ways;
- make at least one ordinary move, reload, and assert the exact current position/progression remains;
- verify committed reward/enemy/latch state through user-facing behavior/UI.

Prefer role/text/data attributes on the real DOM overlay where useful. Do not use screenshots as the primary assertion and do not expose a test-only internal game API.

## Task 8 — Tune the authored slice, do not re-author it

Task 2 already contains the complete three real maps. This task is only gameplay/content tuning after all rules are wired.

Tune:

- ASCII map geometry where route readability is poor;
- enemy/reward numbers so the permanent upgrade changes combat preview obviously;
- clue text so the alternate route is understandable without an exact-route quest arrow;
- shortcut placement so it meaningfully shortens the return trip;
- interaction copy if blocked states are unclear.

Do not introduce a second content schema or rewrite maps into another format.

## Task 9 — Final validation

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

- content/layout validation;
- movement/interaction rules;
- typed effects/reasons;
- pending combat input gating;
- combat preview/resolution;
- latch semantics;
- reward/recovery actions;
- persistence and content-aware malformed-save handling.

### Playwright test job

The critical browser journey passes in Chromium.

Manual gate from a fresh save:

- village → Floor 1 front route;
- observe unreachable reward;
- follow clue → Floor 2;
- return to rear Floor 1;
- collect upgrade;
- verify visible stat change and improved combat preview;
- open latch from rear;
- traverse the now two-way shortcut;
- return to village;
- heal;
- move to a specific tile;
- reload and verify exact position/progression.

Also manually inject malformed/content-invalid LocalStorage data once and verify the game offers an explicit reset rather than silently wiping the save.

## Risks

- **Combat modal desync:** pending combat must stay outside Phaser and durable state or movement gating becomes difficult to reason about/test.
- **Authored-content drift:** ASCII geometry, entity placement, and portal targets are easy to tune; centralized validation must fail fast when a change breaks them.
- **Save/content drift:** pre-release map/content changes can invalidate snapshots; content-aware validation must reject them loudly rather than attempting migration.

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
- generic reducer/event bus/state-machine framework;
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