# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Eridanus is an exploration-first browser mini-game inspired by 魔塔 (Magic Tower): handcrafted grid mazes, authored clues/treasure, and fast deterministic combat used as a resource gate rather than a tactical mode.

The full design contract lives in `docs/superpowers/specs/2026-09-15-hpa-237-cross-floor-slice-design.md`, with the implementation plan alongside it. Read the spec's **Non-Goals** and **Design Principles** before adding systems — it explicitly rules out ECS, quest engines, event scripting, inventory, save migrations, UI frameworks, and test-only game APIs.

## Commands

Runtime is [Bun](https://bun.sh) (pinned to 1.4.2 via `packageManager` and CI).

```sh
bun install
bun run dev                 # vite dev server on 127.0.0.1
bun run typecheck           # tsc --noEmit
bun run lint                # eslint .
bun run format:check        # prettier --check . (CI gate; `bun run format` to fix)
bun run test:unit           # vitest run over src/**/*.test.ts
bun run test:e2e            # playwright; auto-starts dev server on :4173
bun run build
```

Single test runs:

```sh
bunx vitest run src/game/combat.test.ts
bunx vitest run -t 'blocks closed latch from front'
bunx playwright test -g 'completes the village-to-floor2 journey'
bunx playwright install --with-deps chromium   # first e2e run only
```

CI (`.github/workflows/ci.yml`) runs typecheck + lint + format:check + build, unit tests, and Playwright as three separate jobs. A Husky `pre-commit` hook runs lint-staged (eslint --fix + prettier).

## Architecture

Four layers with one-directional data flow. **Phaser never owns game rules; the DOM overlay never mutates state; persistence never infers gameplay decisions.**

```
keyboard (WorldScene) / button click (InteractionOverlay)
  → main.ts handleInput
  → dispatchInput (session.ts)        transient gating
  → attemptMove / interactWithEntity / resolveCombat   pure rules
  → ActionResult { ok, state, effect } | { ok: false, reason }
  → saveGame if GameState identity changed
  → scene.refresh() + overlay.render()
```

- **`src/game/`** — pure TypeScript, zero Phaser imports. `types.ts` holds every closed union; `state.ts` the initial state; `movement.ts` → `actions.ts` → `combat.ts` the rule chain; `session.ts` the pending-interaction gate; `save.ts` the localStorage boundary.
- **`src/game/content/`** — authored maps (`village`, `floor1`, `floor2`), re-exported through `content.ts` as `MAPS`.
- **`src/phaser/`** — `WorldScene.refresh()` clears and redraws every child each input from `GameState` plus the transient `playerFacing` (which selects the player texture); `createGame.ts` boots Phaser; `assets.ts` is the art-replacement seam (`ASSET_PATHS` catalog, terrain/player/entity resolvers, `TILE_SIZE`).
- **`src/ui/InteractionOverlay.ts`** — framework-free DOM, rendered by `innerHTML` + re-bound listeners. HUD, effect text, combat prompt, blocked reasons, invalid-save recovery.
- **`src/main.ts`** — the only stateful module: holds `session`, `effect`, `blocked`, wires input, autosaves, re-renders.

### State model

`GameState` (durable, persisted) is `mapId`, `tile`, `player` stats, and three id arrays: `openedRewardIds`, `defeatedEnemyIds`, `openedShortcutIds`. It is deeply `Readonly` — every rule returns a new object rather than mutating.

`PendingInteraction` (transient, never persisted) exists only for the two-phase combat prompt. `SessionState = { game, pending }`. While `pending` is set, moves are rejected with `interaction-pending`; Fight resolves, Cancel clears.

### Closed contracts

`MapId`, `Direction`, `Stat`, `Entity` kinds (`clue`, `reward`, `enemy`, `latch`, `recovery`, `portal`), `ActionEffect`, and `BlockedReason` are small closed unions in `types.ts`. Switches over them are exhaustive with no `default` — TypeScript's strict mode catches missed cases. Adding an entity kind or blocked reason means updating `actions.ts`, `movement.ts`, `save.ts`'s `isTileOccupiedByBlockingEntity`, `InteractionOverlay`'s `REASON_TEXT`/`effectText`, and `content.ts`'s validator.

### Movement is interaction

There is no separate "interact" key. Moving into an occupied tile calls `interactWithEntity` and the player normally _stays put_; only portals (step-on travel) and already-consumed entities (collected reward, defeated enemy, opened latch) let the player advance. Latches open only from their `rearSide` — `interactWithEntity` compares the direction from the latch back to the player's tile.

### Content authoring

Maps are rectangular ASCII rows using only `#` (wall) and `.` (floor), plus a list of entities placed by tile. `validateContent()` in `content.ts` enforces rectangularity, legal glyphs, globally unique ids, one entity per tile, entities on floor, and **reciprocal portals** (every portal's target tile must hold a portal pointing back). `content.test.ts` asserts it returns no errors — a bad map fails unit tests, not the browser.

### Persistence

`save.ts` validates loaded JSON in two stages: `hasValidShape` (structural) then `hasValidContent` (ids resolve to the right entity kind in current content, tile is floor, tile isn't blocked by an unconsumed entity). Invalid saves return `{ kind: 'invalid', reason }` and `main.ts` shows the reset panel _without booting Phaser_, so keyboard input stays dead until the player explicitly resets. There is deliberately no save versioning or migration.

## Testing

Unit tests sit beside their module (`src/game/combat.test.ts`) and drive pure functions with literal `GameState` objects. Playwright tests in `tests/e2e/` drive the **real player-facing UI** — arrow keys and HUD `data-testid`/`data-stat` selectors — never an internal test API. Keep e2e assertions on stable attributes (`data-effect="clue"`) rather than authored prose, so content edits don't break tests. E2E navigation is expressed as counted key presses against exact map coordinates, so moving an entity or changing a layout row requires re-walking `tests/e2e/cross-floor.spec.ts`.
