# HPA-237 — Cross-floor exploration and combat loop implementation plan

## Goal

Implement the first playable Tower Maze slice in one PR and leave Eridanus with the smallest reusable foundation needed by the remaining MVP content tickets.

## Delivery rule

One ticket = one PR. Do not split project scaffolding, developer tooling, CI, gameplay foundation, combat, persistence, and authored vertical-slice content into separate PRs.

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

Pin Bun to one explicit version in `package.json` using `packageManager`, and configure GitHub Actions to install the same version. Treat that single pinned version as the source of truth for local/CI reproducibility.

Use a simple browser entrypoint that mounts Phaser. Do not add Svelte/React or another UI framework unless implementation proves Phaser/DOM primitives insufficient.

### Pre-commit behavior

Configure Husky with one lightweight pre-commit hook that invokes lint-staged.

lint-staged should run ESLint and Prettier against staged supported source/config files. Keep the hook fast: do not run the complete unit or Playwright suites on every commit.

### CI workflow

Add one `.github/workflows/ci.yml` with exactly three independent jobs.

#### Job 1 — Build & lint

Run:

- install the pinned Bun version;
- frozen dependency install;
- TypeScript typecheck;
- ESLint;
- Prettier check;
- production Vite build.

This is the static/build quality gate.

#### Job 2 — Unit test

Run:

- install the pinned Bun version;
- frozen dependency install;
- Vitest in CI mode.

Keep game-rule, persistence, and content-validation tests here.

#### Job 3 — Playwright test

Run:

- install the pinned Bun version;
- frozen dependency install;
- install the required Playwright Chromium browser/dependencies;
- start the application using Playwright `webServer` or the simplest equivalent;
- execute the browser E2E suite.

Do not add job matrices, cross-job artifacts, reusable workflows, or multiple workflow files unless implementation demonstrates a real need.

Validation for Task 1:

- fresh `bun install --frozen-lockfile` succeeds after lockfile creation;
- typecheck succeeds;
- lint and format checks succeed;
- unit-test command is wired and runnable;
- Playwright is configured and `test:e2e` is wired for the real journey added in Task 8;
- production build succeeds;
- Husky/lint-staged hook is installed through the normal package lifecycle.

Do not add a disposable Playwright smoke test during bootstrap. Task 8 owns the first meaningful browser test.

## Task 2 — Define authoritative state and authored content

Create a small engine-independent game boundary.

Implement:

- `GameState` with current map/tile, player stats, discoveries, rewards, defeated enemies, and shortcuts;
- stable map/entity/asset IDs;
- compact authored map/entity definitions;
- village, Floor 1 slice, and Floor 2 slice content;
- default new-game state.

Tests:

- unique authored IDs;
- valid map references;
- portal destinations resolve;
- paired bidirectional floor connections are reciprocal;
- default state points to valid content.

Avoid generic repository/domain layers or content frameworks.

## Task 3 — Implement movement, collision, discovery, and travel

Add pure movement/travel helpers and connect them to one reusable Phaser `WorldScene`.

Behavior:

- four-direction one-tile movement;
- blocked tiles reject movement;
- entering an authored section marks it discovered;
- stairs/portals change map + spawn explicitly;
- camera follows the player and keeps the whole maze from being revealed automatically.

Tests:

- allowed and blocked movement;
- discovery commits once;
- portal destination correctness;
- reciprocal stairs/portal definitions return to the intended authored destination.

## Task 4 — Implement deterministic combat and interaction UI

Create one pure `previewCombat` calculation used by both UI preview and resolution.

Cover:

- player attacks first;
- `playerDamage <= 0` blocks combat;
- lethal predicted outcomes block combat;
- final enemy hit causes no retaliation;
- exact predicted HP loss shown before confirmation;
- Fight / Cancel prompt pauses movement interaction;
- defeat and HP loss commit exactly once.

Use a tiny framework-free DOM overlay for user-facing interaction text and the Fight / Cancel prompt when that is simpler and more testable than rendering controls inside the Phaser canvas. The overlay must remain presentation-only and dispatch game actions rather than own progression state.

Prefer semantic buttons/text and small stable `data-testid` hooks only where needed by Playwright. Do not expose a test-only internal game API.

Keep presentation minimal: no battle scene, initiative, skills, status effects, or animation state machine.

Tests must explicitly prove preview/resolution agreement and formula edge cases.

## Task 5 — Implement required interactions

Add only the authored interactions needed for the loop:

- inspect clue/landmark;
- collect one permanent stat upgrade;
- open one rear-only shortcut/latch;
- heal at village recovery.

Shortcut rule:

- the latch may only be activated from its rear/back-route side;
- once activated, the passage remains permanently open and traversable in both directions.

Other rules:

- reward applies exactly once;
- recovery heals current HP to max without resetting any dungeon state.

Tests:

- duplicate reward is a no-op;
- latch cannot be activated from the front side;
- once opened, the shortcut allows traversal in both directions;
- shortcut remains open after reload;
- recovery preserves discoveries/rewards/enemies/shortcuts.

## Task 6 — Add autosave and reload

Use one LocalStorage snapshot.

Persist after completed durable actions, including:

- movement/map travel;
- discovery;
- reward collection;
- combat resolution;
- shortcut opening;
- village recovery.

A missing or malformed snapshot may start a fresh game. Do not add migration/versioning infrastructure.

Tests:

- save/load round-trip;
- reward does not duplicate after reload;
- defeated enemy remains defeated after reload;
- HP loss remains committed after reload;
- shortcut remains open after reload;
- current map/tile restores correctly.

## Task 7 — Author the complete player-visible slice

Build the map layout around the required sequence:

1. Village lead directs attention toward the tower.
2. Floor 1 shows the unreachable permanent upgrade early.
3. A clue implies an alternate route without revealing the exact path.
4. Player descends into Floor 2.
5. Floor 2 has enough turns/looping to feel like exploration rather than a corridor.
6. Player returns to Floor 1 behind the barrier.
7. Player collects the permanent upgrade.
8. Nearby enemy preview now costs visibly less HP than before.
9. Player opens the latch from the rear side.
10. The now-open passage works in both directions and provides a useful return path to the entrance/village.
11. Village recovery heals and autosaves.
12. Reload resumes correctly.

Tune enemy/reward values specifically so the upgrade changes the combat preview in an obvious, easy-to-read way.

## Task 8 — Add the critical Playwright journey

Implement one small browser-level happy path proving that the runtime wiring, input, authored content, user-facing interaction UI, and persistence work together.

The E2E should cover the critical progression rather than every branch:

- launch from a fresh save;
- leave the village and enter Floor 1;
- reach the alternate Floor 2 route;
- return behind the Floor 1 barrier;
- collect the permanent reward;
- verify the relevant combat preview changes through the real DOM interaction surface;
- open the rear-only latch;
- verify the opened passage can be used as the shortcut;
- cross at least one reload boundary and verify committed progression remains.

Prefer semantic DOM assertions and stable user-facing controls over pixel/screenshot assertions. Do not mirror unit tests in E2E and do not add test-only game-state accessors.

## Task 9 — Lock minimal asset seams

Make placeholder rendering already obey the contracts needed by HPA-22:

- one tile-size constant;
- stable asset IDs;
- one-tile logical footprint for player/enemies;
- bottom-center entity sprite alignment;
- tile-coordinate collision/interaction rather than sprite-bound checks.

Do not generate final art in this ticket.

## Task 10 — Final validation

The PR is ready for implementation review only when all three CI jobs pass independently.

### Build & lint job

- pinned Bun version matches `packageManager`;
- frozen install;
- typecheck;
- ESLint;
- Prettier check;
- production build.

### Unit test job

- Vitest passes for domain rules, persistence, content validation, reciprocal floor connections, and shortcut semantics.

### Playwright test job

- critical browser journey passes in Chromium.

Manual gate from a fresh save:

- village → Floor 1 front route;
- observe unreachable reward;
- follow clue → Floor 2;
- return to rear Floor 1;
- collect upgrade;
- verify improved combat preview;
- open latch from the rear;
- use the opened two-way shortcut;
- return to village;
- heal;
- reload and verify progression.

Repeat reload checks immediately after reward, combat, and shortcut activation to ensure no duplication or rollback.

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

Treat this as guidance, not a requirement. The DOM interaction overlay can remain a single small module or be colocated with bootstrap code if that is clearer. Merge or remove modules if implementation stays simpler with fewer files.

## Scope guardrails

Do not add:

- ECS;
- generic quest/event scripting;
- dependency injection framework;
- repository abstraction over LocalStorage;
- save migration framework;
- map editor;
- battle scene;
- inventory/equipment/shop/crafting;
- procedural generation;
- backend/accounts/cloud save;
- CI matrices or reusable-workflow abstractions;
- test-only internal game APIs;
- abstractions justified only by hypothetical future games.

Prefer the simplest direct structure that cleanly supports the next Tower Maze content tickets.
