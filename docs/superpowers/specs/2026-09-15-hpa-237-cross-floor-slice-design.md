# HPA-237 Cross-Floor Exploration and Combat Loop Design

## Status

Approved product direction, rewritten through the Superpowers architectural brainstorming workflow. This document is the design contract for HPA-237; implementation details belong in the separate implementation plan.

## Context

Eridanus is a greenfield browser game inspired by 魔塔. The MVP is exploration-first: handcrafted maze navigation, authored clues and treasure, and fast deterministic combat used as a resource gate rather than as a separate tactical game.

HPA-237 is the first playable vertical slice. It must prove the cross-floor exploration loop before later tickets expand the village, additional floors, quests, story content, and generated art.

The slice is intentionally small but must be production-shaped. Its village, Floor 1 section, Floor 2 connector, state model, authored-content format, combat rules, persistence behavior, and rendering seams are foundations that later MVP tickets extend rather than replace.

## Goal

Prove this player-visible sequence end to end:

1. Start in a compact village and receive one concise exploration lead.
2. Enter Floor 1 and notice a clearly visible but unreachable permanent reward.
3. Inspect a clue or landmark implying an alternate route.
4. Descend into a compact Floor 2 maze section.
5. Re-enter Floor 1 behind the original barrier.
6. Collect the permanent upgrade exactly once.
7. Immediately see a nearby deterministic combat preview become cheaper.
8. Open a shortcut from its rear side.
9. Traverse that shortcut as a permanent two-way passage.
10. Return to the village, recover HP, reload the page, and resume at the exact saved location with committed progression intact.

## Success Criteria

The slice succeeds when all of the following are true:

- A fresh player can understand and complete the cross-floor route without an exact-route quest arrow.
- The unreachable reward is visible early enough to establish a clear exploration objective.
- Floor 2 feels like a small maze connector, not a straight hallway.
- The permanent upgrade visibly changes the deterministic preview of a nearby fight.
- Combat preview and combat resolution cannot disagree.
- A closed latch can only be opened from its authored rear side; after opening, its tile is ordinary walkable floor from either direction.
- HP, ATK, and DEF remain visible while playing so combat cost and progression are legible.
- Reload restores the exact current map/tile and durable progression.
- Missing saves start fresh; malformed or content-invalid saves are surfaced and require an explicit reset instead of silently deleting progress.
- Pure-rule/content/persistence tests and one real browser journey cover the defining behavior.
- CI reports Build & lint, Unit test, and Playwright test as three independent jobs.

## Scope

HPA-237 includes:

- Bun-managed Vite + TypeScript + Phaser browser runtime.
- Four-direction one-tile movement and tile-coordinate collision.
- One reusable `WorldScene` for village, Floor 1, and Floor 2.
- One authoritative durable `GameState` in plain TypeScript.
- One small transient `PendingInteraction` for modal combat state.
- One closed authored map/entity schema shared by all three maps.
- Compact ASCII map geometry plus typed authored entities.
- Bump-to-interact clue, reward, enemy, latch, and recovery entities.
- Step-on portal/stair travel.
- Deterministic Fight / Cancel combat preview and resolution.
- One permanent stat reward, one persistent latch/shortcut, one village recovery point.
- One LocalStorage snapshot with content-aware validation.
- A small framework-free DOM status/interaction overlay.
- Placeholder rendering with stable art-replacement seams for the later HPA-22 generated-asset task.
- ESLint, Prettier, Husky + lint-staged, Vitest, Playwright, and GitHub Actions.

## Non-Goals

Do not add:

- complete village or complete Floor 1/2 content beyond this slice;
- discovery/fog/map-reveal state;
- quest journal or generic quest engine;
- generic event/trigger scripting;
- ECS or a reusable RPG framework;
- battle scene, initiative system, skills, status effects, or tactical per-turn combat;
- inventory, equipment, shop, crafting, or random loot;
- procedural generation;
- map/content editor;
- backend, accounts, cloud save, or multiplayer;
- save versioning, migrations, or backwards-compatibility infrastructure;
- React, Svelte, Vue, or another UI framework;
- test-only game APIs;
- CI matrices, reusable-workflow abstractions, or cross-job orchestration.

## Design Principles

- **Exploration first.** Combat supports the maze/resource loop instead of becoming a separate game mode.
- **One durable truth.** Durable progression lives in `GameState`; Phaser objects never become a second state store.
- **Transient means transient.** Combat-prompt state is typed and testable but never persisted.
- **Closed contracts over generic frameworks.** Map IDs, entity kinds, action effects, blocked reasons, and interaction semantics are small closed unions for the current game.
- **Author content once.** Village/Floor 1/Floor 2 use the same final content schema from the start.
- **YAGNI.** Add systems only when a player-visible feature consumes them.
- **Pure rules where practical.** Movement, interactions, combat, session gating, content validation, and save validation remain independent of Phaser.
- **Player-facing UI doubles as E2E surface.** Browser tests assert real HUD/interaction UI rather than an internal testing interface.

## Approaches Considered

### 1. Pure TypeScript domain + thin Phaser presentation — chosen

Durable rules, authored content, combat, movement, interactions, session gating, and persistence are plain TypeScript. Phaser renders the current map, accepts input, and adapts typed domain results to visuals. A small DOM layer handles persistent stats and modal interaction UI.

**Why this wins:** rules stay easy to unit test; one `WorldScene` can render every floor; later art replacement does not alter gameplay; the browser layer remains small; and the architecture matches the deterministic grid nature of a 魔塔-style game.

### 2. Phaser-owned gameplay state — rejected

`WorldScene` and Phaser objects could own player state, enemy flags, collision decisions, and combat mode.

**Why rejected:** it creates mutable scene-specific rules, makes preview/resolution and modal input gating harder to test, and encourages durable flags to leak into presentation objects. Later floors would copy scene behavior instead of reusing rules.

### 3. Generic RPG/event framework — rejected

A generic event engine, quest DSL, ECS, trigger system, or reusable RPG framework could model every interaction as data-driven scripted behavior.

**Why rejected:** HPA-237 has six known entity kinds and one modal interaction. Generalization would increase code and authoring complexity before any second use case exists. Closed unions are cheaper to understand and extend for the MVP.

## Architecture

The runtime has four responsibilities with explicit boundaries:

1. **Pure game domain** — state, authored content, movement, interactions, combat, and session gating.
2. **Persistence boundary** — serialize/validate durable `GameState` against current authored content.
3. **Phaser presentation** — render map/entities/player and translate real keyboard input into domain/session commands.
4. **DOM overlay** — render persistent stats, interaction feedback, combat controls, blocked reasons, and invalid-save recovery.

Data flows in one direction:

```text
keyboard / DOM action
        ↓
small pure session/input layer
        ↓
movement / interaction / combat rule
        ↓
ActionResult + next GameState
        ↓
(optional autosave if GameState changed)
        ↓
Phaser world + DOM overlay render typed result/state
```

Phaser does not decide durable game rules. The DOM overlay does not mutate `GameState` directly. Persistence does not infer gameplay decisions.

## Durable and Transient State

### Durable `GameState`

The persisted state contains only data required to resume the slice:

```ts
type MapId = 'village' | 'floor1' | 'floor2';

type Tile = Readonly<{ x: number; y: number }>;

type PlayerStats = Readonly<{
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}>;

type GameState = Readonly<{
  mapId: MapId;
  tile: Tile;
  player: PlayerStats;
  openedRewardIds: readonly string[];
  defeatedEnemyIds: readonly string[];
  openedShortcutIds: readonly string[];
}>;
```

The initial village start tile lives in the default `GameState`; there is no generic spawn-point registry.

### Transient `PendingInteraction`

Combat prompting is a two-phase interaction and needs a typed transient mode without becoming durable state:

```ts
type WinnableCombatPreview = {
  winnable: true;
  hitsNeeded: number;
  hpLoss: number;
};

type PendingInteraction =
  | null
  | {
      kind: 'combat';
      enemyId: string;
      preview: WinnableCombatPreview;
    };
```

Rules:

- Enemy bump may produce a combat-prompt effect and create pending combat.
- While combat is pending, movement commands are rejected/ignored by pure TypeScript session logic.
- Fight resolves the pending enemy against the current `GameState`.
- Cancel clears only `PendingInteraction`.
- Pending interaction is never saved.
- Phaser must not maintain a parallel combat-mode flag.

## Closed Action Boundary

Every domain decision returns typed output. Presentation must not rediscover what happened by inspecting mutated objects.

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
  | { kind: 'combatPrompt'; enemyId: string; preview: WinnableCombatPreview }
  | { kind: 'enemyDefeated'; enemyId: string; hpLost: number };

type ActionResult =
  | { ok: true; state: GameState; effect: ActionEffect }
  | { ok: false; reason: BlockedReason };
```

The exact exported names may vary during implementation, but both branches remain closed and exhaustively handled.

Human-readable copy belongs to the UI layer. The domain returns stable reason/effect identifiers, allowing copy to change without altering rules or breaking E2E assertions.

This is not a generic event bus or reducer framework; it is the closed return contract for the known actions in this slice.

## Authored Content Model

Maps use compact ASCII geometry plus typed entities.

```ts
type Direction = 'north' | 'south' | 'east' | 'west';
type Stat = 'attack' | 'defense' | 'maxHp';

type BaseEntity = {
  id: string;
  tile: Tile;
  assetId?: string;
};

type Entity =
  | (BaseEntity & { kind: 'clue'; text: string })
  | (BaseEntity & { kind: 'reward'; stat: Stat; amount: number })
  | (BaseEntity & {
      kind: 'enemy';
      stats: { hp: number; attack: number; defense: number };
    })
  | (BaseEntity & { kind: 'latch'; rearSide: Direction })
  | (BaseEntity & { kind: 'recovery' })
  | (BaseEntity & {
      kind: 'portal';
      target: { mapId: MapId; tile: Tile };
    });

type MapDefinition = {
  id: MapId;
  name: string;
  layout: readonly string[];
  entities: readonly Entity[];
};

const MAPS: Record<MapId, MapDefinition> = {
  village,
  floor1,
  floor2,
};
```

Geometry contract:

- `#` is blocked wall.
- `.` is walkable floor.
- Width derives from row length; height derives from row count.
- Rows are non-empty and rectangular.
- Collision is direct row/column lookup.
- Entity tiles and portal target tiles are in bounds and on floor.
- `MapId` is closed; adding a map ID must require adding its `MAPS` entry at compile time.
- Entity instance IDs are strings with uniqueness enforced by content tests.
- `assetId` is optional. The asset resolver defaults to entity kind; content overrides it only when a distinct sprite is needed.

ASCII rows were chosen over per-wall tile objects because maze geometry is the dominant content and must remain easy to hand-edit, diff, and tune.

## Interaction Language

Interaction behavior is fixed by entity kind. There is no generic trigger configuration.

### Bump-to-interact

The player remains on the previous tile when bumping into:

- clue;
- reward;
- enemy;
- latch;
- recovery point.

Effects:

- **Clue:** show authored clue text; no durable progression is required.
- **Reward:** apply its permanent stat increase once, record the reward ID, and stop blocking its tile; later movement may enter that tile.
- **Enemy:** open a deterministic combat prompt without immediately resolving the fight.
- **Latch:** apply the rear/front opening rule below.
- **Recovery:** restore current HP to max HP without resetting any dungeon progress.

A successful bump interaction does not move the player onto the entity tile as part of that same action.

### Step-on portal

Portals/stairs activate after the player successfully enters their tile. Travel resolves immediately to the authored target map/tile; there is no confirmation prompt.

Intended bidirectional stair/portal pairs are reciprocal authored connections and are validated by tests.

### Latch

A latch stores one tile plus `rearSide`. The front side is the opposite cardinal direction.

- Closed latch tile is non-walkable.
- Bump from the authored rear side opens it and records its ID in `openedShortcutIds`.
- Bump from the front while closed returns `latch-closed-front` and changes nothing.
- Once opened, the latch tile behaves as normal walkable floor from either direction.

There is no one-way traversal rule after opening.

## Deterministic Combat

Combat is a resource calculation with explicit Fight / Cancel confirmation, not a separate battle scene.

Preview result:

```ts
type CombatPreview =
  | WinnableCombatPreview
  | {
      winnable: false;
      reason: 'combat-unwinnable' | 'combat-lethal';
    };
```

Rules:

```text
playerDamage = player.attack - enemy.defense
hitsNeeded = ceil(enemy.hp / playerDamage)
enemyDamage = max(0, enemy.attack - player.defense)
totalHpLoss = (hitsNeeded - 1) * enemyDamage
```

- Check `playerDamage <= 0` before calculating `hitsNeeded`; return `combat-unwinnable` rather than producing Infinity.
- Player attacks first.
- The enemy does not retaliate after the final player hit.
- A fight is lethal when `totalHpLoss >= player.hp`; the player must finish above zero HP.
- The exact same pure preview calculation powers both the displayed result and resolution.
- Fight commits HP loss and enemy defeat exactly once.
- Cancel commits nothing.
- Blocked combat commits nothing and explains the reason through the UI.
- After defeat, the enemy tile becomes traversable.

The authored permanent reward must change the nearby encounter's preview enough to be obvious without arithmetic from the player.

The encounter does not have to be a mandatory topology gate. The critical browser journey must still choose **Fight** once after observing the improved preview so combat resolution, HP loss, enemy defeat, and reload persistence are proven end to end.

## Presentation

### Phaser `WorldScene`

One reusable scene renders all authored maps.

Responsibilities:

- render ASCII-authored floor/wall geometry;
- render current entities from `GameState` + authored content;
- render/follow the player with Phaser camera follow;
- forward real keyboard commands to the pure session/domain boundary;
- rerender when map, entity visibility, or player location changes;
- never own durable progression or modal interaction rules.

Rendering contract locked from day one:

- one tile-size constant;
- one-tile logical footprint for player and enemies;
- bottom-center visual anchoring for character/entity sprites;
- tile coordinates, not sprite bounds, determine collision and interaction;
- asset identifiers are resolved centrally rather than embedding file paths in map definitions.

### DOM Interaction Overlay

Use one small framework-free DOM layer for real player-facing UI.

Persistent chrome:

- current map name;
- HP / max HP;
- ATK;
- DEF.

Transient UI:

- clue text;
- reward/recovery feedback;
- combat preview;
- Fight / Cancel controls;
- blocked-action feedback;
- malformed-save recovery/reset choice.

The overlay exhaustively handles closed action effects/reasons. Stable reason/effect identifiers may be exposed through `data-*` attributes so Playwright can assert behavior without coupling to prose.

## Persistence and Failure Behavior

Persist one LocalStorage snapshot containing durable `GameState` only.

### Autosave

Autosave after every successful action that changes `GameState`, including ordinary movement. This makes “restore the exact current tile” unambiguous.

Do not write for actions that only change transient pending state, such as opening or cancelling a combat prompt.

### Load outcomes

There are three explicit outcomes:

- **Missing save key:** create a fresh game.
- **Valid save:** resume it.
- **Invalid save:** do not silently reset; show an explicit reset/recovery choice.

Invalid includes:

- JSON parse failure;
- invalid object shape/types;
- current map not present in `MAPS`;
- current tile out of bounds or not walkable under the snapshot's own durable flags;
- opened reward ID that does not resolve to a reward entity;
- defeated enemy ID that does not resolve to an enemy entity;
- opened shortcut ID that does not resolve to a latch entity.

For load validation, dynamic walkability is evaluated from the snapshot itself: uncollected rewards, undefeated enemies, and closed latches still block their tiles; collected rewards, defeated enemies, and opened latches do not.

An explicit reset may delete the bad snapshot and create a fresh game.

No save version field, migration code, or compatibility layer is required before release.

## Authored Vertical Slice

### Village

The village contains only what the loop needs:

- initial player start tile;
- one `clue` entity used as the concise village lead/sign;
- recovery point;
- portal/stairs into Floor 1.

No separate NPC entity type is introduced in HPA-237.

### Floor 1 — front route

The entrance-side route establishes the objective:

- readable entrance landmark;
- permanent stat reward visibly present but unreachable from the front;
- clue suggesting a lower/around route;
- nearby stationary enemy whose preview is materially improved by the reward;
- closed latch separating the entrance side from the rear route.

### Floor 2 — connector

Floor 2 is a compact authored maze connector with at least one meaningful turn/loop so it reads as exploration rather than a corridor. It leads to a reciprocal portal/stair connection returning to the rear side of Floor 1.

### Floor 1 — rear payoff

From the rear side, the player can:

- reach and collect the permanent reward;
- inspect the nearby encounter's improved preview;
- choose Fight once in the critical E2E journey to prove combat resolution and persistence;
- open the latch from the rear;
- return toward the entrance/village through the now shorter two-way path.

The map topology does not require the enemy to block access to the latch. Combat is proven by the critical journey rather than by making the fight a mandatory route gate.

Exact geometry and numeric values are tuning concerns, but the authored route above is fixed by the feature contract.

## Asset Replacement Seam

HPA-22 is the later Tower Maze task that replaces placeholders with generated reusable art. HPA-237 must make that replacement mechanical rather than architectural.

The seam consists of:

- one tile-size constant;
- stable centralized asset IDs;
- optional per-entity asset override with kind fallback;
- one-tile gameplay footprints;
- bottom-center anchors;
- gameplay collision/interaction based on tiles rather than pixels.

HPA-237 does not build a general asset pipeline and does not generate final art.

## Tooling and CI Contract

Project tooling is part of the greenfield foundation:

- Bun pinned through `packageManager` and the same version used in CI;
- Vite + TypeScript + Phaser;
- ESLint + Prettier;
- Husky + lint-staged, with pre-commit limited to staged lint/format work;
- Vitest for pure domain/content/persistence tests;
- Playwright Chromium for the real browser journey.

Use one GitHub Actions workflow with exactly three independent jobs:

1. **Build & lint:** frozen install, typecheck, ESLint, Prettier check, production build.
2. **Unit test:** frozen install, Vitest.
3. **Playwright test:** frozen install, Chromium/dependencies, app web server, browser suite.

Do not add matrices, reusable workflows, cross-job artifacts, or unrelated deployment work.

## Testing Strategy

### Vitest

Unit/content tests cover the contracts that should not depend on browser rendering:

- rectangular ASCII layouts;
- entity/portal tiles valid and walkable;
- unique authored IDs;
- `MAPS` completeness for the closed `MapId` set;
- reciprocal intended portal pairs;
- wall/out-of-bounds movement;
- fixed bump vs step-on interaction semantics;
- reward applies exactly once and its tile becomes traversable after collection;
- recovery preserves dungeon progress;
- latch front/rear/open behavior;
- typed blocked results never mutate state;
- enemy bump creates combat prompt without durable mutation;
- movement is gated while combat is pending;
- combat zero-damage/unwinnable behavior;
- equality-at-zero lethality;
- no retaliation after the last hit;
- preview/resolution agreement;
- Fight commits once; Cancel commits nothing;
- save round-trip of every durable field;
- ordinary movement position survives round-trip;
- missing save starts fresh;
- malformed/shape-invalid/content-invalid saves fail loudly;
- stale/removed entity IDs invalidate saves;
- saved current-tile walkability is checked against collected/defeated/opened flags.

### Playwright

Use one real `tests/e2e/cross-floor.spec.ts` from the beginning. Its first assertion proves that the real browser/webServer path and persistent HUD render. Grow that same test into the critical journey rather than creating a disposable smoke suite.

The final journey covers:

- fresh start and persistent status chrome;
- village → Floor 1;
- visible unreachable objective and clue;
- alternate Floor 2 route;
- rear Floor 1 re-entry;
- permanent reward and visible stat change;
- cheaper combat preview;
- movement gated while Fight / Cancel is active;
- choosing Fight once and observing the committed combat result;
- latch opened from the rear and traversable both ways;
- ordinary movement followed by reload restoring the exact position;
- committed reward/enemy/latch behavior surviving reload.

Browser tests drive real keyboard and DOM controls. They do not inspect an internal game API and do not use screenshots as the primary assertion mechanism.

## Risks and Mitigations

### Combat modal desynchronization

**Risk:** modal state stored in Phaser can diverge from domain state or allow movement while a prompt is open.

**Mitigation:** keep `PendingInteraction` outside Phaser and persistence; gate input through pure TypeScript and cover it with Vitest.

### Authored-content drift

**Risk:** maze tuning can create ragged layouts, invalid entity placement, or broken portal connections.

**Mitigation:** central content validation plus compile-time `Record<MapId, MapDefinition>` completeness.

### Save/content drift

**Risk:** pre-release map/content changes can leave an old snapshot structurally valid but semantically impossible.

**Mitigation:** validate saves against current authored maps/entities and surface an explicit reset path. Do not build migrations for pre-release data.

### Scope expansion

**Risk:** the first slice becomes a generic RPG engine, content editor, or quest framework.

**Mitigation:** keep the closed schemas and non-goals above; prefer direct code that supports the next Tower Maze MVP tickets.

## Final Design Decision

HPA-237 ships one small, production-shaped vertical slice with a pure TypeScript domain, compact authored maps, deterministic combat, explicit transient modal state, one validated local save, one Phaser world scene, and one framework-free HUD/interaction overlay.

The design intentionally optimizes for extending handcrafted Tower Maze content quickly. It does not optimize for arbitrary games, generic RPG scripting, or backwards compatibility before release.
