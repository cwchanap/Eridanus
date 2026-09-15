# HPA-237 — Cross-floor exploration and combat loop implementation plan

## Goal

Implement the first playable Tower Maze slice in one PR and leave Eridanus with the smallest reusable foundation needed by the remaining MVP content tickets.

## Delivery rule

One ticket = one PR. Do not split scaffolding, gameplay foundation, combat, persistence, and authored vertical-slice content into separate PRs.

## Task 1 — Bootstrap the web game

Set up:

- Vite + TypeScript;
- Phaser runtime;
- Vitest;
- simple browser entrypoint that mounts the Phaser game;
- lint/format/typecheck/build scripts kept intentionally small.

Do not add Svelte/React or another UI framework unless implementation proves Phaser/DOM primitives insufficient.

Validation:

- install succeeds;
- typecheck succeeds;
- unit tests run;
- production build succeeds.

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
- portal destination correctness.

## Task 4 — Implement deterministic combat

Create one pure `previewCombat` calculation used by both UI preview and resolution.

Cover:

- player attacks first;
- `playerDamage <= 0` blocks combat;
- lethal predicted outcomes block combat;
- final enemy hit causes no retaliation;
- exact predicted HP loss shown before confirmation;
- Fight / Cancel prompt pauses movement interaction;
- defeat and HP loss commit exactly once.

Keep presentation minimal: no battle scene, initiative, skills, status effects, or animation state machine.

Tests must explicitly prove preview/resolution agreement and formula edge cases.

## Task 5 — Implement required interactions

Add only the authored interactions needed for the loop:

- inspect clue/landmark;
- collect one permanent stat upgrade;
- open one shortcut/latch;
- heal at village recovery.

Rules:

- reward applies exactly once;
- shortcut remains open once activated;
- recovery heals current HP to max without resetting any dungeon state.

Tests:

- duplicate reward is a no-op;
- shortcut state controls traversal;
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
9. Player opens the one-way shortcut.
10. Shortcut provides a useful return path to the entrance/village.
11. Village recovery heals and autosaves.
12. Reload resumes correctly.

Tune enemy/reward values specifically so the upgrade changes the combat preview in an obvious, easy-to-read way.

## Task 8 — Lock minimal asset seams

Make placeholder rendering already obey the contracts needed by HPA-22:

- one tile-size constant;
- stable asset IDs;
- one-tile logical footprint for player/enemies;
- bottom-center entity sprite alignment;
- tile-coordinate collision/interaction rather than sprite-bound checks.

Do not generate final art in this ticket.

## Task 9 — Validation

Automated gate:

- typecheck passes;
- unit tests pass;
- production build passes;
- lint/format pass if retained.

Manual gate from a fresh save:

- village → Floor 1 front route;
- observe unreachable reward;
- follow clue → Floor 2;
- return to rear Floor 1;
- collect upgrade;
- verify improved combat preview;
- open shortcut;
- return to village;
- heal;
- reload and verify progression.

Repeat reload checks immediately after reward, combat, and shortcut activation to ensure no duplication or rollback.

## Likely compact structure

```text
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
```

Treat this as guidance, not a requirement. Merge or remove modules if implementation stays clearer with fewer files.

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
- abstractions justified only by hypothetical future games.

Prefer the simplest direct structure that cleanly supports the next Tower Maze content tickets.
