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
- One authoritative plain-TypeScript `GameState` owns progression.
- Phaser handles rendering/input and dispatches domain actions; it does not own durable game rules.
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
- Playwright for the critical browser happy path;
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
   - install the required Playwright browser/dependencies;
   - launch the app through Playwright `webServer` or equivalent;
   - run the browser happy-path suite.

Keep the jobs separate so failures are immediately attributable. Avoid reusable-workflow abstractions, job matrices, cross-job artifacts, or CI orchestration that does not improve this small project.

## Architecture

### Pure game domain

Keep core rules independent of Phaser.

Suggested responsibilities:

- `state.ts` — `GameState`, player stats, location, durable flags.
- `content.ts` — closed authored map/entity types plus lookup/validation helpers.
- `movement.ts` — collision, movement, step-on portal resolution.
- `combat.ts` — deterministic preview and resolution.
- `actions.ts` — bump interactions for reward, clue, latch, recovery, and enemy encounters.
- `save.ts` — LocalStorage snapshot serialization/deserialization and load-result handling.

Exact file boundaries may change during implementation. Avoid creating abstractions before they are needed.

### Action result contract

Movement and interactions can either commit a new state or be blocked. Use one small result shape instead of ad-hoc booleans/exceptions per action.

```ts
type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };
```

Pure domain actions should follow the equivalent of:

```ts
(state, input) => ActionResult
```

Blocked actions do not mutate state. The DOM overlay shows the returned reason when it matters to the player, including blocked or unwinnable combat.

Do not expand this into a generic reducer/event framework.

## Closed authored content schema

Lock one schema before writing the maps so later floors extend the same model rather than inventing new shapes.

The exact property names may vary, but the implementation should preserve this shape:

```ts
type MapId = 'village' | 'floor1' | 'floor2';

type Tile = {
  x: number;
  y: number;
};

type BaseEntity = {
  id: string;
  tile: Tile;
  assetId: string;
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
  frontTile: Tile;
  rearTile: Tile;
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
  width: number;
  height: number;
  blockedTiles: readonly Tile[];
  spawnPoints: Readonly<Record<string, Tile>>;
  entities: readonly Entity[];
};
```

`MapId` is intentionally closed for the currently authored maps and grows when a later floor file is added. Entity instance IDs may remain strings; content tests enforce uniqueness.

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

Successful interactions may update state and presentation, but the player does not occupy the entity tile as part of that bump.

For combat specifically:

- Cancel leaves the player on the previous tile with unchanged state.
- A blocked/unwinnable fight leaves the player on the previous tile and returns a visible reason.
- A successful fight commits HP loss + enemy defeat exactly once; after defeat the tile becomes traversable.

### Step-on portal

Portals/stairs activate when the player successfully steps onto their tile. The action immediately resolves to the authored target map + tile; no confirmation prompt is required for this MVP.

Bidirectional authored stairs/portal pairs must be reciprocal in content tests: the intended return portal must target the original map and corresponding entry tile.

### Latch semantics

A latch is one authored tile with explicit `frontTile` and `rearTile` neighbors.

- Closed latch is non-walkable.
- Bumping it from `rearTile` opens it and records its ID in `openedShortcutIds`.
- Bumping it from `frontTile` while closed returns a blocked reason and does not mutate state.
- Once `openedShortcutIds.has(latch.id)`, the latch tile behaves as ordinary traversable floor from either direction.

Do not model one-way movement after the latch is open.

## Phaser presentation

One reusable `WorldScene` should:

- render the current authored map;
- follow the player with a scrolling camera;
- translate movement input into domain actions;
- update entity visuals from authoritative state;
- use a single tile-size constant from day one;
- use stable asset IDs rather than hard-coded paths in map content;
- render player/enemies with a one-tile logical footprint and bottom-center visual anchoring;
- use tile coordinates for collision/interaction rather than sprite bounds;
- swap map content when the domain state changes map/location.

Avoid independent progression flags on Phaser objects. Presentation should derive from state.

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

This makes the resource loop understandable to players and gives Playwright stable user-facing assertions without exposing internal game state.

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
- A blocked result explains why through the DOM overlay.

## Persistence

Persist one snapshot after completed durable actions.

Minimum state:

- current map and tile position;
- player HP/max HP, attack, defense;
- opened reward IDs;
- defeated enemy IDs;
- opened shortcut IDs.

Village recovery restores current HP to max HP but does not reset dungeon progression.

Load behavior is explicit:

- Missing save key → start a fresh game.
- Valid save → resume it.
- JSON parse failure or invalid snapshot shape → refuse to load silently and show a recovery/reset choice to the player.

The reset action may discard the bad snapshot and create a fresh game. No version field, save migrator, or backwards-compatibility layer is required.

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
- Closed shortcut/latch connecting the back route to the entrance side.

### Floor 2 — connector route

- Compact maze section with at least one loop/turn so it feels like exploration, not a straight corridor.
- Explicit stairs/portal returning to Floor 1 behind the original barrier.

### Floor 1 — payoff route

- Collect the permanent upgrade exactly once.
- Re-check the nearby enemy preview and make the reduced HP cost obvious.
- Open the persistent shortcut/latch from the rear side.
- Return toward the entrance/village through the newly opened two-way passage.

## Testing

### Vitest

Prioritize pure-rule and authored-content tests for:

- combat formulas and rejection cases;
- preview and resolution agreement;
- ActionResult blocked paths do not mutate state;
- reward cannot apply twice;
- latch only opens from the rear while closed;
- opened latch is traversable from both sides;
- village recovery heals without resetting progression;
- save/load round-trip for all durable state used by this slice;
- missing save starts fresh;
- malformed/invalid save produces a load failure instead of silently wiping progress;
- authored map/entity IDs are unique;
- authored references point to valid maps/tiles;
- intended bidirectional portal pairs are reciprocal.

### Playwright

Ship one critical E2E path that proves the actual browser build can complete the defining slice. It should cover the core progression from village through the cross-floor route and verify at least one reload/persistence boundary.

Drive the game through real keyboard/player interactions and assert persistent chrome / interaction UI. Do not expose a test-only internal game API and do not duplicate every unit-level edge case in Playwright.

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

The slice succeeds when a fresh player can complete the full cross-floor loop, understand the alternate route without an exact quest arrow, see HP/ATK/DEF throughout play, see the permanent upgrade materially change combat preview, open the rear-side latch into a permanent two-way shortcut, return to the village, reload, and resume with committed progression intact—and when malformed save data is surfaced rather than silently erased and the three CI jobs independently verify build/lint, unit tests, and Playwright E2E.
