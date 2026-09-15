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
8. Open a persistent rear-side shortcut/latch.
9. Return to the village, heal, reload, and resume with progression intact.

This is a real vertical slice, not a disposable prototype. The village, Floor 1 section, and Floor 2 section should become the foundation extended by later MVP tickets.

## Product decisions

- Exploration is the primary loop; combat is a fast deterministic blocker/resource check.
- Four-direction tile movement on a fixed grid.
- One reusable Phaser world scene displays all authored maps.
- One authoritative plain-TypeScript `GameState` owns durable progression.
- One small transient `PendingInteraction` value owns modal interaction state such as an open combat prompt. It is never persisted and never owned by Phaser.
- Phaser handles rendering/input and dispatches into pure TypeScript rules; it does not own progression or interaction-mode rules.
- A tiny framework-free DOM overlay owns persistent player stats plus interaction/combat copy and buttons.
- Maps and interactables use one closed authored schema keyed by stable IDs.
- Use one LocalStorage autosave snapshot.
- Placeholder visuals are expected, but stable asset IDs, tile size, one-tile footprints, and bottom-center alignment are part of the initial rendering contract.
- No generic quest engine, event scripting framework, ECS, RPG framework, map editor, backend, or cloud save.
- Do not persist discovery state in this slice; the scrolling camera already prevents revealing the whole maze, and no current feature consumes discovery flags.

## Technology and project tooling

Start Eridanus as a small Bun-managed browser game with:

- TypeScript;
- Vite;
- Phaser;
- ESLint using a small TypeScript-focused flat config;
- Prettier for formatting;
- Husky + lint-staged for lightweight pre-commit checks;
- Vitest for unit tests;
- Playwright for the critical browser journey;
- GitHub Actions for CI.

Pin Bun through the `packageManager` field in `package.json`, and use the same Bun version in CI.

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
   - install pinned Bun;
   - install dependencies with the lockfile frozen;
   - TypeScript typecheck;
   - ESLint;
   - Prettier check;
   - production Vite build.
2. **Unit test**
   - install pinned Bun;
   - install dependencies with the lockfile frozen;
   - run Vitest in CI mode.
3. **Playwright test**
   - install pinned Bun;
   - install dependencies with the lockfile frozen;
   - install the required Chromium browser/dependencies;
   - launch the app through Playwright `webServer` or equivalent;
   - run the browser suite.

Keep the jobs separate so failures are immediately attributable. Avoid reusable-workflow abstractions, job matrices, cross-job artifacts, or CI orchestration that does not improve this small project.

## Architecture

Keep core rules independent of Phaser.

Suggested responsibilities:

- `state.ts` — `GameState`, player stats, current location, durable flags, initial village start tile.
- `content.ts` — closed authored map/entity types, `MAPS`, lookup and validation helpers.
- `movement.ts` — collision, movement, step-on portal resolution.
- `combat.ts` — deterministic preview and resolution.
- `actions.ts` — bump interactions, transient pending interaction, and small pure input gating.
- `save.ts` — LocalStorage serialization, content-aware validation, and load-result handling.

Exact file boundaries may change during implementation. Avoid creating abstractions before they are needed.

## Closed action boundary

Every domain decision returns typed data. Do not make the scene rediscover what happened from mutable presentation state.

```ts
type BlockedReason =
  | 'wall'
  | 'out-of-bounds'
  | 'interaction-pending'
  | 'latch-closed-front'
  | 'combat-unwinnable'
  | 'combat-lethal'
  | 'reward-already-taken';

type ActionEffect =
  | { kind: 'moved' }
  | { kind: 'traveled'; mapId: MapId }
  | { kind: 'clue'; text: string }
  | { kind: 'reward'; stat: Stat; amount: number }
  | { kind: 'healed'; hp: number }
  | { kind: 'latchOpened'; id: string }
  | { kind: 'combatPrompt'; enemyId: string; preview: CombatPreview }
  | { kind: 'enemyDefeated'; enemyId: string; hpLost: number };

type ActionResult =
  | { ok: true; state: GameState; effect: ActionEffect }
  | { ok: false; reason: BlockedReason };
```

The exact union members may be renamed while implementing, but keep both branches closed and exhaustively handled.

UI copy belongs in the UI layer, for example one `Record<BlockedReason, string>`. Playwright may assert a stable reason identifier/data attribute instead of brittle prose.

Do not expand this into a generic reducer/event framework.

## Transient interaction mode

Combat prompting is a two-phase interaction and must not become a mutable `WorldScene` flag.

```ts
type PendingInteraction =
  | null
  | {
      kind: 'combat';
      enemyId: string;
      preview: CombatPreview;
    };
```

- Bumping an enemy returns `effect: { kind: 'combatPrompt', ... }` and sets the transient pending value outside `GameState`.
- While combat is pending, movement input is rejected/ignored by a pure TypeScript input gate that can be unit tested.
- Fight calls combat resolution against current `GameState` and the pending enemy.
- Cancel clears the pending value without a domain mutation.
- Pending interaction state is never persisted.

The implementation may express this with a small `dispatchInput(state, pending, input)` function or equivalent. Keep it specific to the current input needs rather than building a generic state machine.

## Closed authored content schema

Use compact text rows for maze geometry and a typed entity list for authored objects.

```ts
type MapId = 'village' | 'floor1' | 'floor2';

type Tile = {
  x: number;
  y: number;
};

type Direction = 'north' | 'south' | 'east' | 'west';

type BaseEntity = {
  id: string;
  tile: Tile;
  assetId?: string;
};

type ClueEntity = BaseEntity & {
  kind: 'clue';
  text: string;
};

type RewardEntity = BaseEntity & {
  kind: 'reward';
  stat: 'attack' | 'defense' | 'maxHp';
  amount: number;
};

type EnemyEntity = BaseEntity & {
  kind: 'enemy';
  stats: {
    hp: number;
    attack: number;
    defense: number;
  };
};

type LatchEntity = BaseEntity & {
  kind: 'latch';
  rearSide: Direction;
};

type RecoveryEntity = BaseEntity & {
  kind: 'recovery';
};

type PortalEntity = BaseEntity & {
  kind: 'portal';
  target: {
    mapId: MapId;
    tile: Tile;
  };
};

type Entity =
  | ClueEntity
  | RewardEntity
  | EnemyEntity
  | LatchEntity
  | RecoveryEntity
  | PortalEntity;

type MapDefinition = {
  id: MapId;
  name: string;
  layout: readonly string[];
  entities: readonly Entity[];
};

const MAPS: Record<MapId, MapDefinition> = {
  // village, floor1, floor2
};
```

Geometry rules:

- `#` = blocked wall.
- `.` = walkable floor.
- Width is derived from row length; height is derived from row count.
- Rows must be non-empty and rectangular.
- Entity tiles and portal target tiles must be in bounds and land on walkable floor.
- Map IDs are intentionally closed and adding a new `MapId` must fail typechecking until `MAPS` provides it.
- Entity instance IDs remain strings; content tests enforce uniqueness.
- `assetId` is optional. The asset resolver defaults to the entity kind and authors override only when an entity needs a distinct sprite.
- The initial player start tile belongs to the default `GameState`, not an open-ended spawn-point registry.

This keeps walls easy to author/review and collision O(1) by row/column lookup.

Do not add inheritance, generic trigger objects, scripting DSLs, or ECS components.

## Interaction contract

Interaction semantics are fixed by entity kind so every floor uses the same player language.

### Bump-to-interact

The player remains on the previous tile while bumping into these adjacent entities:

- clue;
- reward;
- enemy;
- latch;
- recovery point.

Successful interactions return an `ActionEffect`; the player does not occupy the entity tile as part of the bump.

For combat specifically:

- Enemy bump opens the transient combat prompt; it does not resolve combat immediately.
- Cancel leaves the player on the previous tile with unchanged `GameState`.
- A blocked/unwinnable fight leaves the player on the previous tile and returns a typed reason.
- A successful fight commits HP loss + enemy defeat exactly once; after defeat the tile becomes traversable.

### Step-on portal

Portals/stairs activate when the player successfully steps onto their tile. The action immediately resolves to the authored target map + tile; no confirmation prompt is required for this MVP.

Bidirectional authored stairs/portal pairs must be reciprocal in content tests: the intended return portal must target the original map and corresponding entry tile.

### Latch semantics

A latch is one authored tile with a `rearSide` direction. The front side is the opposite direction, so invalid diagonal/non-adjacent front/rear pairs are unrepresentable.

- Closed latch is non-walkable.
- Bumping it from the authored rear side opens it and records its ID in `openedShortcutIds`.
- Bumping it from the front side while closed returns `latch-closed-front` and does not mutate state.
- Once `openedShortcutIds.has(latch.id)`, the latch tile behaves as ordinary traversable floor from either direction.

Do not model one-way movement after the latch is open.

## Phaser presentation

One reusable `WorldScene` should:

- render the current authored map;
- follow the player with Phaser camera follow;
- translate keyboard input into pure TypeScript input/domain actions;
- update presentation from authoritative `GameState` + transient `PendingInteraction`;
- use a single tile-size constant from day one;
- resolve stable asset IDs to placeholder visuals;
- use one-tile logical player/enemy footprints;
- anchor character/entity visuals bottom-center;
- use tile coordinates for collision/interaction rather than sprite bounds;
- swap rendered map when domain state changes location.

Avoid independent progression or modal-state flags on Phaser objects. Presentation should derive from typed state/results.

## DOM interaction overlay

Use one tiny framework-free DOM layer for real player-facing UI rather than a test-only interface.

Persistent chrome should show:

- current map name;
- HP / max HP;
- ATK;
- DEF.

Transient interaction content can use the same layer for:

- clue/recovery/reward feedback;
- combat preview;
- Fight / Cancel controls;
- blocked-action reasons.

The overlay handles `ActionEffect` and `BlockedReason` exhaustively. Blocked reasons expose a stable identifier/data attribute so UI copy can change without breaking Playwright.

## Deterministic combat contract

Compute unwinnable combat before division.

```ts
type CombatPreview =
  | {
      winnable: true;
      hitsNeeded: number;
      hpLoss: number;
    }
  | {
      winnable: false;
      reason: 'combat-unwinnable' | 'combat-lethal';
    };
```

For a winnable fight:

```text
playerDamage = player.attack - enemy.defense
hitsNeeded = ceil(enemy.hp / playerDamage)
enemyDamage = max(0, enemy.attack - player.defense)
totalHpLoss = (hitsNeeded - 1) * enemyDamage
```

Rules:

- Player attacks first.
- If `playerDamage <= 0`, return `combat-unwinnable` before calculating `hitsNeeded`.
- A fight is lethal when `totalHpLoss >= player.hp`; the player must finish above zero HP.
- A defeated enemy does not retaliate after the final player hit.
- The exact same pure preview result powers both the prompt and resolution.
- Enemy defeat and HP loss commit exactly once before cosmetic feedback.

## Persistence

Persist one snapshot of durable `GameState` only. `PendingInteraction` is not saved.

Minimum state:

- current map and tile position;
- player HP/max HP, attack, defense;
- opened reward IDs;
- defeated enemy IDs;
- opened shortcut IDs.

Autosave after every successful state-changing action, including ordinary movement. The snapshot is small and this makes “restore current tile” unambiguous. Actions/effects that do not change `GameState` (for example opening or cancelling a combat prompt) do not need a write.

Village recovery restores current HP to max HP but does not reset dungeon progression.

Load behavior is explicit:

- Missing save key → start a fresh game.
- Valid save → resume it.
- JSON parse failure, invalid snapshot shape, or content-invalid references → refuse to load silently and show a recovery/reset choice to the player.

Content-aware validation checks at least:

- current `MapId` exists in `MAPS`;
- current tile is in bounds and walkable;
- every opened reward ID resolves to a reward entity;
- every defeated enemy ID resolves to an enemy entity;
- every opened shortcut ID resolves to a latch entity.

The reset action may discard the bad snapshot and create a fresh game. No version field, save migrator, or backwards-compatibility layer is required.

## Authored vertical slice

### Village

- Player start tile lives in initial `GameState`.
- One concise NPC/sign lead toward the tower.
- Recovery point that heals and autosaves.
- Entrance to Floor 1.

### Floor 1 — front route

- Readable entrance landmark.
- Permanent-upgrade treasure visible but inaccessible from the front route.
- Clue indicating an alternate lower/around route.
- One nearby enemy whose preview will visibly improve after the upgrade.
- Closed shortcut/latch connecting the back route to the entrance side.

### Floor 2 — connector route

- Compact maze section with at least one loop/turn so it feels like exploration, not a straight corridor.
- Explicit stairs/portal returning to Floor 1 behind the original barrier.

### Floor 1 — payoff route

- Collect the permanent upgrade exactly once.
- Re-check the nearby enemy preview and make the reduced HP cost obvious.
- Open the persistent shortcut/latch from the rear side.
- Return toward the entrance/village through the newly opened two-way passage.

## Asset replacement seam

A later Tower Maze asset task (HPA-22) will replace placeholder visuals with generated reusable art. HPA-237 only needs to lock the runtime seam so that replacement does not require map/rule changes:

- one tile-size constant;
- stable asset IDs resolved centrally;
- one-tile logical footprints;
- bottom-center anchors;
- tile-coordinate collision/interaction.

Do not build a general asset pipeline in this ticket.

## Testing

### Vitest

Prioritize pure-rule and authored-content tests for:

- rectangular map layouts and valid walkable entity tiles;
- unique map/entity IDs;
- `MAPS` covers every `MapId`;
- portal targets resolve and intended bidirectional portal pairs are reciprocal;
- combat preview variants and formula edge cases;
- equality-at-zero lethality (`hpLoss >= hp` blocks);
- preview and resolution agreement;
- typed blocked paths do not mutate state;
- enemy bump produces a combat-prompt effect without changing durable state;
- movement is blocked/ignored while combat is pending;
- reward cannot apply twice;
- latch only opens from the rear while closed;
- opened latch is traversable from both sides;
- village recovery heals without resetting progression;
- save/load round-trip for all durable state used by this slice;
- ordinary movement position survives a round-trip;
- missing save starts fresh;
- malformed/shape-invalid/content-invalid saves produce a load failure instead of silently wiping progress;
- a save referencing a removed/nonexistent entity ID fails validation.

### Playwright

Use one real `tests/e2e/cross-floor.spec.ts` from the start. Its first assertion should prove the actual browser/webServer path is working (for example the game shell/canvas and persistent status chrome render). Grow that same test into the critical journey; do not create a disposable smoke test.

The final journey should cover village → Floor 1 → Floor 2 → rear Floor 1 → reward → improved combat preview → latch → reload/persistence.

Drive the game through real keyboard/player interactions and assert real DOM UI. Do not expose a test-only internal game API and do not duplicate every unit-level edge case in Playwright.

## Risks

- **Combat modal desync:** if pending combat state leaks into `WorldScene`, movement gating becomes hard to test. Keep pending interaction typed and pure outside Phaser.
- **Authored-content drift:** malformed ASCII layouts, portal targets, or entity IDs can break later floors. Keep validation centralized and cheap.
- **Save/content drift:** map tuning can invalidate previously valid-looking snapshots. Validate saves against current authored content and fail loudly.

## Non-goals

- Complete village or Floor 1/2 content beyond this slice.
- Discovery/fog/map-reveal state.
- Quest journal.
- Shop/inventory/equipment/crafting.
- Random loot or encounters.
- Battle scene or tactical turn UI.
- Procedural generation.
- Map/content editor.
- Backend/accounts/cloud save.
- Generic save migrations.
- Generic event/quest scripting.
- Elaborate CI matrices or reusable pipeline frameworks.

## Acceptance focus

The slice succeeds when a fresh player can complete the full cross-floor loop, understand the alternate route without an exact quest arrow, see HP/ATK/DEF throughout play, see the permanent upgrade materially change combat preview, open the rear-side latch into a permanent two-way shortcut, return to the village, reload at the exact current tile, and resume with committed progression intact. Malformed/content-invalid save data must be surfaced rather than silently erased, and the three CI jobs must independently verify build/lint, unit tests, and Playwright E2E.