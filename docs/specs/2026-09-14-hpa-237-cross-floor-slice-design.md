# HPA-237 — Cross-floor exploration and combat loop design

## Goal

Prove the defining Tower Maze MVP loop before expanding content:

1. Start in a compact village and receive one exploration lead.
2. Enter Floor 1 and notice a clearly visible but unreachable permanent reward.
3. Read a clue/landmark that implies an alternate route.
4. Descend into a small Floor 2 section.
5. Re-enter Floor 1 behind the original barrier.
6. Collect the permanent upgrade.
7. Immediately see a nearby deterministic combat preview become cheaper.
8. Open a persistent one-way latch/shortcut.
9. Return to the village, heal, reload, and resume with progression intact.

This is a real vertical slice, not a disposable prototype. The village, Floor 1 section, and Floor 2 section should become the foundation extended by later MVP tickets.

## Product decisions

- Exploration is the primary loop; combat is a fast deterministic blocker/resource check.
- Four-direction tile movement on a fixed grid.
- One reusable Phaser world scene displays all authored maps.
- One authoritative plain-TypeScript `GameState` owns progression.
- Phaser handles rendering/input and dispatches domain actions; it does not own durable game rules.
- Maps and interactables are compact authored TypeScript definitions keyed by stable IDs.
- Use one LocalStorage autosave snapshot.
- Placeholder visuals are expected, but stable asset IDs and alignment conventions must be established for the later image-asset task.
- No generic quest engine, event scripting framework, ECS, RPG framework, map editor, backend, or cloud save.

### Shortcut semantics

The Floor 1 latch is one-way only in how it is opened: the player can activate it only from the rear/back-route side. Once opened, that passage remains permanently open and is traversable in both directions. This gives the player a durable shortcut home without creating special one-way movement rules after activation.

## Technology and project tooling

Start Eridanus as a small Bun-managed browser game with:

- TypeScript;
- Vite;
- Phaser;
- ESLint using a small TypeScript-focused flat config;
- Prettier for formatting;
- Husky + lint-staged for lightweight pre-commit checks;
- Vitest for unit tests;
- Playwright for the critical browser happy path;
- GitHub Actions for CI.

Pin Bun to one explicit version in `package.json` via `packageManager`, and use that same version in GitHub Actions. Do not maintain separate local and CI version declarations that can drift.

Do not introduce a UI framework unless a concrete requirement makes it materially simpler than Phaser/DOM primitives.

### Local quality workflow

Keep the developer loop fast and predictable.

Expected scripts should include the equivalents of:

- `bun run dev`;
- `bun run build`;
- `bun run typecheck`;
- `bun run lint`;
- `bun run format`;
- `bun run format:check`;
- `bun run test:unit`;
- `bun run test:e2e`.

Use Husky for a pre-commit hook that runs lint-staged only. lint-staged should run ESLint fixes/checks and Prettier formatting on staged supported files. Do not run the full unit or Playwright suites on every commit; CI owns the slower gates.

### CI contract

Use one GitHub Actions workflow with exactly three independent jobs:

1. **Build & lint**
   - install the pinned Bun version;
   - install dependencies with the lockfile frozen;
   - TypeScript typecheck;
   - ESLint;
   - Prettier check;
   - production Vite build.
2. **Unit test**
   - install the pinned Bun version;
   - install dependencies with the lockfile frozen;
   - run Vitest in CI mode.
3. **Playwright test**
   - install the pinned Bun version;
   - install dependencies with the lockfile frozen;
   - install the required Playwright browser/dependencies;
   - launch the app through Playwright `webServer` or equivalent;
   - run the browser happy-path suite.

Keep the jobs separate so failures are immediately attributable. Avoid reusable-workflow abstractions, job matrices, cross-job artifacts, or CI orchestration that does not improve this small project.

## Architecture

### Pure game domain

Keep core rules independent of Phaser.

Suggested responsibilities:

- `state.ts` — `GameState`, player stats, location, durable flags.
- `content.ts` — authored map/entity definitions and lookup helpers.
- `movement.ts` — collision and movement resolution.
- `combat.ts` — deterministic preview and resolution.
- `actions.ts` — reward, clue, shortcut, healing, travel interactions.
- `save.ts` — LocalStorage snapshot serialization/deserialization.

Exact file boundaries may change during implementation. Avoid creating abstractions before they are needed.

### Authored content

Each map definition needs only:

- stable map ID;
- dimensions/collision grid;
- explicit spawn/entry points;
- discovery sections/rooms;
- interactable entities keyed by stable ID;
- explicit portal/stair destinations.

Entity variants required by this ticket:

- clue/landmark;
- permanent reward;
- stationary enemy;
- shortcut/latch;
- recovery point;
- portal/stairs.

Authored stair/portal pairs used as bidirectional floor connections must be reciprocal: if one connection points from Floor 1 entry A to Floor 2 entry B, the paired return connection must resolve back to the intended Floor 1 destination. Validate this as content data rather than relying on manual map inspection.

Do not add inheritance, generic triggers, scripting DSLs, or ECS components.

### Phaser presentation

One reusable `WorldScene` should:

- render the current authored map;
- follow the player with a scrolling camera;
- translate movement input into domain actions;
- update entity visuals from authoritative state;
- swap map content when the domain state changes map/location.

Use a tiny framework-free DOM overlay when it makes interaction UI clearer and more testable. It may own the concise clue/interaction text, Fight / Cancel controls, and exact predicted HP-loss display. Keep it presentation-only: it reads current presentation state and dispatches actions but does not own progression rules.

This DOM surface is also the preferred Playwright seam. Use stable semantic roles/text or small `data-testid` hooks on real user-facing controls instead of exposing test-only internal game state or relying on pixel/screenshot assertions.

Avoid independent progression flags on Phaser objects or DOM elements. Presentation should derive from state.

## Deterministic combat contract

Base formulas:

```text
playerDamage = player.attack - enemy.defense
hitsNeeded = ceil(enemy.hp / playerDamage)
enemyDamage = max(0, enemy.attack - player.defense)
totalHpLoss = (hitsNeeded - 1) * enemyDamage
```

Rules:

- Player attacks first.
- If `playerDamage <= 0`, the fight is blocked.
- If predicted HP loss would be lethal, the fight is blocked.
- A defeated enemy does not retaliate after the final player hit.
- The exact same pure calculation must power both preview and resolution.
- Enemy defeat and HP loss commit exactly once before cosmetic feedback.

## Persistence

Persist one snapshot after completed durable actions.

Minimum state:

- current map and tile position;
- player HP/max HP, attack, defense;
- opened reward IDs;
- defeated enemy IDs;
- discovered section IDs;
- opened shortcut IDs.

Village recovery restores current HP to max HP but does not reset dungeon progression.

For this MVP, a missing or unusable save can start a fresh game. No save migration framework is required.

## Authored vertical slice

### Village

- Player spawn.
- One concise NPC/sign lead toward the tower.
- Recovery point that heals and autosaves.
- Entrance to Floor 1.

### Floor 1 — front route

- Readable entrance landmark.
- Permanent-upgrade treasure visible but inaccessible from the front route.
- Clue indicating an alternate lower/around route.
- One nearby enemy whose preview will visibly improve after the upgrade.
- Closed latch that cannot be opened from this side.

### Floor 2 — connector route

- Compact maze section with at least one loop/turn so it feels like exploration, not a straight corridor.
- Explicit stairs/portal returning to Floor 1 behind the original barrier.

### Floor 1 — payoff route

- Collect the permanent upgrade exactly once.
- Re-check the nearby enemy preview and make the reduced HP cost obvious.
- Open the latch from the rear side.
- The opened passage is then traversable both ways and provides a useful return path toward the entrance/village.

## Asset contract for HPA-22

Lock only the replacement seams needed by the later generated-asset task:

- one fixed tile size;
- stable asset IDs separate from file paths;
- one logical tile gameplay footprint for player/enemies;
- bottom-center sprite anchoring for characters/entities;
- interaction/collision based on tile coordinates rather than sprite bounds.

Do not build a general asset pipeline in this ticket.

## Testing

### Vitest

Prioritize pure-rule tests for:

- combat formulas and rejection cases;
- preview and resolution agreement;
- reward cannot apply twice;
- shortcut can only be activated from the rear side, then remains open and traversable in both directions after reload;
- village recovery heals without resetting progression;
- save/load round-trip for all durable state used by this slice;
- authored portal destinations resolve correctly;
- paired bidirectional floor connections are reciprocal.

### Playwright

Ship one critical E2E path that proves the actual browser build can complete the defining slice. It should cover the core progression from village through the cross-floor route and verify at least one reload/persistence boundary.

Use the real user-facing DOM interaction surface for stable assertions where practical. Do not expose a test-only game API and do not duplicate every unit-level edge case in Playwright.

## Non-goals

- Complete village or Floor 1/2 content.
- Quest journal.
- Shop/inventory/equipment/crafting.
- Random loot or encounters.
- Battle scene or tactical turn UI.
- Procedural generation.
- Map/content editor.
- Backend/accounts/cloud save.
- Generic save migrations.
- Generic event/quest scripting.
- elaborate CI matrices or reusable pipeline frameworks.

## Acceptance focus

The slice succeeds when a fresh player can complete the full cross-floor loop, understand the alternate route without an exact quest arrow, see the permanent upgrade materially change combat preview, open the rear-only latch and then use the resulting two-way shortcut, return to the village, reload, and resume with committed progression intact—and when the three CI jobs independently verify build/lint, unit tests, and Playwright E2E.
