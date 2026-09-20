# HPA-146 Complete Floor 2 and Clue-Driven Exploration Quests Implementation Plan

> **Ticket:** HPA-146 — Tower Maze: Complete Floor 2 and clue-driven exploration quests  
> **PR rule:** Keep the complete implementation on this one HPA-146 PR. Do not split architecture, content, quests, or tests into follow-up PRs.

## Goal

Expand the current small Floor 2 connector into the complete mid-game floor, resolve the heirloom and lost-route optional threads, advance the keeper-ledger thread, and move the missing character back to the village without adding a quest engine, mechanism framework, escort system, save migration, or new art.

## Design Source

Read first:

- `docs/superpowers/specs/2026-09-19-hpa-146-floor2-quests-design.md`
- `docs/superpowers/specs/2026-09-18-hpa-235-village-floor1-design.md`

Keep the HPA-237 architecture boundaries intact: pure TypeScript owns rules/content/state, Phaser owns rendering/input, DOM owns presentation, and LocalStorage owns only the current `GameState` snapshot.

## Implementation Shape

1. Add fact-gated NPC presence as one compile-safe runtime seam.
2. Extend facts, dialogue, and journal read models for HPA-146 story/quest outcomes.
3. Author the complete Floor 2 and reciprocal Floor 1 treasury connection.
4. Prove alternate order, exact-once progression, and persistence with focused unit/content tests.
5. Re-walk the real browser journey and finish with the full CI-equivalent gate.

No new `GameState` fields are planned.

---

## Task 1: Centralize entity presence, blocking, NPC IDs, and direction geometry

### Files

Modify:

- `src/game/types.ts`
- `src/game/content.ts`
- `src/game/movement.ts`
- `src/game/actions.ts`
- `src/game/save.ts`
- `src/game/dialogue.ts`
- `src/game/content/dialogue.ts`
- `src/phaser/WorldScene.ts`
- `src/phaser/assets.ts`
- `src/game/content.test.ts`
- `src/game/movement.test.ts`
- `src/game/save.test.ts`
- `src/phaser/assets.test.ts`

Create:

- `src/game/geometry.ts`

### Step 1: Write only pure/shared-rule tests first

Task 1 must not invent a synthetic MAPS occupant or maps-injection seam just to exercise runtime occupancy before the real subject entities exist.

Add focused tests for:

1. `NpcPresence` known/unknown behavior on object literals;
2. an always-present NPC;
3. defeated enemies being absent from the active-entity helper;
4. the shared blocking predicate preserving current semantics:
   - unopened reward blocks / opened reward does not;
   - undefeated enemy blocks / defeated enemy is inactive;
   - closed latch blocks / opened latch does not;
   - clue, recovery, active NPC block;
   - portal does not;
5. `validateContent` rejecting an unknown presence fact;
6. the shared direction helper returning the four cardinal neighbor tiles.

Keep current real-content regressions green, including the existing save test that standing on the village warden is invalid.

Expected first run: compile/test failure because the new types/helpers do not exist.

Run:

```sh
bun run typecheck
bunx vitest run src/game/content.test.ts src/game/movement.test.ts src/game/save.test.ts src/phaser/assets.test.ts
```

### Step 2: Close NPC IDs without adding future runtime drift

In `src/game/types.ts`, introduce `NpcId` for the **current four** village NPCs first and narrow `NpcEntity.id` to it.

Keep `BaseEntity.id: string` for every other entity kind.

Change `resolveNpcDialogue(npcId, state)` to accept `NpcId` and make its switch exhaustive with no default.

Remove the separate `NPC_DIALOGUE_IDS: Set<string>` / `hasNpcDialogue` coverage list and the corresponding content-validator branch. The type + exhaustive switch become the single dialogue-coverage contract.

Update the tests that existed only for the old stringly runtime failure:

- delete the `resolveNpcDialogue('nobody', ...)` throw test; an invalid ID should no longer type-check;
- remove the `village-mystery` "NPC without dialogue" validator case and keep its unrelated unknown-lock-item assertion as its own validation test.

Task 2 widens `NpcId` with the two HPA-146 subject IDs at the same time it adds their switch cases, keeping every intermediate commit compile-safe.

### Step 3: Add the narrow NPC presence type

Add:

```ts
export type NpcPresence = Readonly<{
  factId: string;
  when: 'known' | 'unknown';
}>;
```

Add optional `presence?: NpcPresence` to `NpcEntity` only.

Do not put fact conditions on `BaseEntity` and do not add a generic condition expression.

### Step 4: Extract direction geometry once

Create `src/game/geometry.ts` with the small cardinal helpers needed by current rules, including:

```ts
export function tileInDirection(tile: Tile, direction: Direction): Tile
export function directionFromTo(from: Tile, to: Tile): Direction | null
```

Use one private direction-delta table inside that module.

Update:

- `movement.ts` to compute its target with `tileInDirection`;
- `actions.ts` to import `directionFromTo`;
- later topology tests to derive each latch rear approach through `tileInDirection(latch.tile, latch.rearSide)`.

Do not add a broader geometry/vector library.

### Step 5: Centralize runtime entity presence and blocking

In `src/game/content.ts`, add:

- `isEntityPresent(entity, state)`;
- `getActiveEntities(state)`;
- `getActiveEntityAt(state, tile)`;
- `isEntityBlocking(entity, state)`;
- a small tile wrapper such as `isTileBlockedByEntity(state, tile)`.

Presence rules:

- defeated enemy -> absent;
- NPC with no presence -> present;
- NPC `when: 'known'` / `'unknown'` -> fact-gated;
- every other entity -> present.

Blocking rules preserve the current game behavior:

- reward blocks until opened;
- active enemy blocks until defeated (defeated enemies are already absent);
- latch blocks until opened;
- clue/recovery/active NPC block;
- portal does not.

Keep `getEntityAt(mapId, tile)` static for authored-content validation/lookup.

Extend `validateContent` so an authored NPC presence fact must exist in `FACTS`.

### Step 6: Route all runtime consumers through the shared rules

- `movement.ts`: use `getActiveEntityAt`; use the shared blocking predicate instead of the local reward/enemy/latch `passable` expression.
- `save.ts`: delete its private `isTileOccupiedByBlockingEntity` switch and call the shared tile predicate.
- `WorldScene.ts`: iterate `getActiveEntities(state)`.
- `assets.ts`: remove the defeated-enemy `return null` branch so `resolveEntityAsset` means texture selection only.
- `assets.test.ts`: stop asserting that the asset resolver hides defeated enemies; assert runtime activity through game/content tests instead.

Real movement/save occupancy for the new subject tiles waits until Task 4 after the authored NPCs exist.

### Step 7: Run the compile-safe gate

```sh
bun run typecheck
bunx vitest run src/game src/phaser/assets.test.ts
```

### Step 8: Commit

Suggested commit:

```text
refactor: centralize entity runtime rules
```

---

## Task 2: Extend HPA-146 facts, dialogue, and journal derivation

### Files

Modify:

- `src/game/content/facts.ts`
- `src/game/types.ts`
- `src/game/dialogue.ts`
- `src/game/content/dialogue.ts`
- `src/game/journal.ts`
- `src/ui/JournalPanel.ts`
- `src/game/dialogue.test.ts`
- `src/game/journal.test.ts`

### Step 1: Add failing read-model tests

Pin state semantics before adding prose/content.

Dialogue selection is ID-keyed and now typed by `NpcId`, so these tests may land before the subject entities are authored. Only movement/save occupancy waits for Task 4.

Add dialogue tests that prove:

- warden acknowledges `main-subject-returned`;
- artisan acknowledges the new treasury route and later the opened `floor1-future-treasury` reward;
- scout resolves the lost-route thread from `floor1-treasury-return-used`;
- scribe advances after `floor2-paired-release-ledger-read`;
- `floor2-missing-subject` returns its one-time "I can return" line;
- `village-returned-subject` returns its village follow-up line.

Add journal tests that prove:

- the existing depth facts without the carried sigil still leave the earlier main lead intact;
- carrying `tower-depth-sigil` without `floor1-depth-stairs-used` keeps the existing `descend` lead;
- carrying `tower-depth-sigil` **and** knowing `floor1-depth-stairs-used` selects `search-floor2`;
- `main-subject-returned` selects `investigate-deeper`;
- heirloom lead becomes `heirloom-claim-treasury` after the return stair fact;
- heirloom lead becomes `heirloom-resolved` after `floor1-future-treasury` is opened;
- route lead becomes `route-resolved` from the return stair fact;
- ledger lead becomes `ledger-follow-deeper-record` after the Floor 2 evidence fact;
- all optional outcomes work when the relevant discovery happened before the corresponding village NPC intro fact.

Expected first run: type failures for the new closed IDs.

Run:

```sh
bunx vitest run src/game/dialogue.test.ts src/game/journal.test.ts
```

### Step 2: Add the minimal facts

In `FACTS`, add at least:

- `main-subject-returned`;
- `floor1-treasury-return-used` with useful route-note copy;
- `floor2-paired-release-ledger-read` with note copy explaining the paired rear-release mechanisms.

Add any optional hidden-clue fact only if the final authored map uses it. Do not pre-register speculative facts.

### Step 3: Extend closed NPC/dialogue IDs and authored prose

Widen `NpcId` with:

- `floor2-missing-subject`;
- `village-returned-subject`.

Add their exhaustive `resolveNpcDialogue` cases in the same compile-safe cut.

Add only the `DialogueLineId` values required by current HPA-146 state branches, for example:

- `warden-subject-returned`;
- `subject-returning`;
- `subject-village`;
- `artisan-treasury-route-found`;
- `artisan-heirloom-recovered`;
- `scout-route-verified`;
- `scribe-floor2-ledger-read`.

Update `DIALOGUE_LINES` for the new line IDs. There is no separate `NPC_DIALOGUE_IDS` set after Task 1.

Keep exact English in `src/game/content/dialogue.ts`; `src/game/dialogue.ts` should only select IDs through its exhaustive `NpcId` switch.

Selection precedence matters:

- `floor2-missing-subject` and `village-returned-subject` select their lines by NPC ID, not by whether `main-subject-returned` is known; the Floor 2 bump records that fact before resolving dialogue;
- warden: returned subject beats sigil-found;
- artisan: opened treasury beats route-found beats current Floor-1 evidence;
- scout: verified route beats route-mark seen;
- scribe: Floor-2 ledger evidence beats fragment-1 state.

### Step 4: Extend journal lead IDs

Add only these new semantic stages unless implementation reveals a concrete missing state:

- `search-floor2`;
- `investigate-deeper`;
- `heirloom-claim-treasury`;
- `heirloom-resolved`;
- `route-resolved`;
- `ledger-follow-deeper-record`.

Update `JournalPanel.ts` display copy for the new lead IDs.

Do not add a `status`, completion boolean, or quest object. A resolved lead ID is enough for completion copy.

### Step 5: Run the narrow gate

```sh
bun run typecheck
bunx vitest run src/game/dialogue.test.ts src/game/journal.test.ts
```

### Step 6: Commit

Suggested commit:

```text
feat: extend floor two story and quest read models
```

---

## Task 3: Author the complete Floor 2 and treasury return connection

### Files

Modify:

- `src/game/content/floor2.ts`
- `src/game/content/floor1.ts`
- `src/game/content/village.ts`
- `src/game/content.test.ts`
- `src/game/movement.test.ts`
- `src/game/save.test.ts`

### Step 1: Replace the connector with the complete authored floor

Rewrite `floor2.ts` as one compact rectangular maze organized into these authored sections:

- `floor2-front-landing` — Front Landing;
- `floor2-central-hall` — Central Hall;
- `floor2-west-archive` — West Archive;
- `floor2-east-service` — East Service Wing;
- `floor2-rear-gallery` — Rear Gallery.

Remove `floor2-connector` once every walkable cell is covered by the new sections.

In this same content commit:

- replace the current `findSectionById('floor2-connector')` assertion with the new section IDs;
- update the hardcoded Floor 2 front/rear portal coordinates in `src/game/movement.test.ts`;
- replace `floor2-connector` in the coherent `src/game/save.test.ts` discovered-section fixture.

Do not leave these fixture repairs for Task 4: deleting/moving the content and fixing all tests that name it is one atomic map rewrite.

Do not preserve the old section ID for compatibility; pre-release saves may use the existing invalid-save/reset path.

Preserve the existing portal IDs:

- `floor2-front-to-floor1`;
- `floor2-rear-to-floor1`.

Their Floor 2 coordinates may move with the new layout, but update the reciprocal Floor 1 portal targets in the same content commit.

### Step 2: Add the two permanent mechanism latches

Author:

- `floor2-west-release`;
- `floor2-east-release`.

Both are ordinary `LatchEntity` values using current closed/open gate art.

Map them so the runtime-aware blocked-state flood from the front portal reaches:

- the existing rear portal;
- `tileInDirection(floor2-west-release.tile, floor2-west-release.rearSide)`;
- `tileInDirection(floor2-east-release.tile, floor2-east-release.rearSide)`.

That one proof guarantees the HPA-237 rear stair remains available and either latch can be opened first. At least one opened latch should materially shorten a return route through familiar space.

Do not add switch entities, remote door IDs, reversible state, or mechanism-specific save data.

### Step 3: Add the missing-character state transition

Add:

- `floor2-missing-subject` in the authored required-story route with
  `introFactId: 'main-subject-returned'` and
  `presence: { factId: 'main-subject-returned', when: 'unknown' }`;
- `village-returned-subject` on a safe village floor tile with
  `introFactId: 'main-subject-returned'` and
  `presence: { factId: 'main-subject-returned', when: 'known' }`.

Do not invent a second subject-seen/reported fact. Both intro writes are intentionally idempotent, and the two subject dialogue lines are selected by NPC ID.

Use the existing NPC default art.

The village placement must not overlap the initial tile, existing NPCs, recovery point, or portal.

### Step 4: Add the new treasury stair pair

Inside the currently isolated Floor 1 3x3 treasury pocket, add the overlapping section:

```ts
{
  id: 'floor1-workshop-treasury',
  name: 'Workshop Treasury',
  bounds: { minX: 15, maxX: 17, minY: 6, maxY: 8 },
}
```

Then add:

- `floor1-treasury-to-floor2`.

On Floor 2 add:

- `floor2-treasury-to-floor1`.

Make the portals reciprocal.

The Floor 2 -> Floor 1 portal records `floor1-treasury-return-used`.

Keep `floor1-future-treasury` as the existing defense reward; HPA-146 does not replace it with a quest item.

Do not repurpose `floor2-rear-to-floor1`; the HPA-237 rear-wing loop remains a separate connection.

### Step 5: Add authored Floor 2 evidence, enemies, and rewards

Add one clue entity for the ledger thread that records `floor2-paired-release-ledger-read` and whose text explains/reinterprets the paired rear-release mechanism hint.

Add a small fixed set of:

- stationary enemies using `enemy-ruin-guard` in optional branch/wing routes;
- authored stat/item rewards only where they improve route decisions;
- at least one optional hidden clue or reward in a side alcove.

Do not add a separate enemy-placement rule. The shared blocking predicate is the executable constraint: with a fresh required-state snapshot, the topology test must still reach all required interaction approaches while undefeated enemies and every other blocking entity are treated exactly as the runtime treats them.

Do not add random loot, roaming enemies, new combat rules, or required consumable keys. HPA-146 adds no combat mechanics, so no new Floor 2-specific E2E fight is required.

### Step 6: Prove runtime-aware topology with two small floods

Keep the helper local to `src/game/content.test.ts`; do not extract a map/pathfinding module.

Use two modes only:

1. **Floor 2 runtime-blocked flood** — start from the front portal with a fresh required-state Floor 2 snapshot and reject tiles through the shared `isTileBlockedByEntity` rule.
2. **Floor 1 layout-only flood** — preserve the existing geometric proof that the treasury pocket is isolated from ordinary front/rear Floor 1 entries.

For bump-only targets, assert a reachable adjacent approach tile rather than their occupied tile.

Use the shared `tileInDirection` helper for the exact latch rear approach.

The Floor 2 blocked-state proof only needs to assert:

- front portal -> existing rear portal;
- front portal -> west latch rear approach;
- front portal -> east latch rear approach;
- front portal -> reachable interaction approaches for the missing subject and ledger clue, and -> the treasury-return portal.

That replaces the previous overlapping 10-assertion topology list. It is stronger because clues, recovery points, NPCs, unopened rewards, undefeated enemies, and closed latches use the real runtime blocking rule.

Separately prove:

- the new Floor 1 treasury portal is reciprocal;
- ordinary Floor 1 layout flood still cannot enter the treasury pocket;
- entering through the new portal reaches `floor1-future-treasury`;
- the pocket is covered by/discovers `floor1-workshop-treasury`.

Use entity IDs rather than arbitrary coordinates wherever possible.

### Step 7: Run the full game-domain gate for the map rewrite

```sh
bun run typecheck
bunx vitest run src/game
```

This deliberately includes `movement.test.ts` and `save.test.ts` so moved portal coordinates and removed section IDs cannot hide until Task 4.

Expected note: the existing Playwright journey will now be stale because counted movement through Floor 2 changed. Do not add a temporary test API. Task 5 re-walks the real route.

### Step 8: Commit

Suggested commit:

```text
feat: complete floor two authored content
```

---

## Task 4: Prove interactions, alternate order, and persistence

### Files

Modify:

- `src/game/actions.test.ts`
- `src/game/movement.test.ts`
- `src/game/save.test.ts`
- `src/game/journal.test.ts`
- `src/game/dialogue.test.ts`
- implementation files only if these tests expose a real gap.

### Step 1: Test the actual missing-character interaction

Resolve `floor2-missing-subject` through authored content and call the real action path.

Prove:

- before the fact, the Floor 2 subject is active/blocking and the returned village subject is inactive;
- first bump records `main-subject-returned`;
- effect line is `subject-returning` even though the fact was recorded before dialogue selection;
- second runtime lookup no longer returns the Floor 2 subject;
- movement can walk onto the vacated Floor 2 subject tile;
- village runtime lookup returns `village-returned-subject`, which is now blocking/interactable;
- save validation rejects standing on the Floor 2 subject tile before the fact and accepts that same tile after the fact;
- repeating the shared intro fact remains idempotent.

Do not add a dedicated rescue action or maps-injection seam.

### Step 2: Test both actual Floor 2 latches

For each latch:

- front bump blocks with `latch-closed-front`;
- rear bump adds its ID to `openedShortcutIds`;
- repeat/open traversal is idempotent and two-way.

Add one state-level test for both orders:

- west then east;
- east then west.

The final opened ID set may differ in array order. Assert membership/length, not an artificial canonical sort unless the game already needs one.

### Step 3: Test the new treasury route and reward

Use real authored portals/reward.

Prove:

- Floor 2 -> treasury travel records `floor1-treasury-return-used`;
- arrival discovers `floor1-workshop-treasury`;
- the existing `floor1-future-treasury` reward still applies once;
- the opened reward tile becomes traversable;
- journal heirloom/route leads immediately reflect the traversal/reward state.

### Step 4: Extend coherent save coverage

Update the late-game round-trip fixture so it contains representative HPA-146 state:

- both Floor 2 latch IDs;
- returned-subject fact;
- treasury-return fact;
- Floor 2 ledger evidence fact;
- opened Floor 1 treasury;
- representative Floor 2 defeated enemy/reward IDs;
- new Floor 2 discovered section IDs.

No shape change is expected.

Add the active/inactive subject-tile validation case from Task 1 using the real authored subject tile once it exists.

### Step 5: Run the domain gate

```sh
bun run typecheck
bunx vitest run src/game/actions.test.ts src/game/movement.test.ts src/game/save.test.ts src/game/journal.test.ts src/game/dialogue.test.ts src/game/content.test.ts
```

### Step 6: Commit

Suggested commit:

```text
test: prove floor two progression and persistence
```

---

## Task 5: Re-walk one focused real browser journey and finish HPA-146

### Files

Modify:

- `tests/e2e/cross-floor.spec.ts`
- docs in this PR only to mark landed tasks/status after implementation.

Do not add a second E2E file or a test-only game API.

### Step 1: Keep the existing platform/integration coverage

Preserve the current:

- asset catalog serving test;
- basic HUD boot test;
- movement-during-asset-preload test;
- existing combat/Fight-Cancel integration coverage where the rewritten route still exercises it.

HPA-146 itself does not need a second Floor 2 combat detour.

### Step 2: Re-walk one representative Floor 2 order with section checkpoints

Reuse the current village/Floor 1 route to obtain the sigil and descend.

For every significant new Floor 2 navigation leg, assert the expected player-facing journal section immediately after the leg, for example:

- `floor2-front-landing`;
- `floor2-central-hall`;
- `floor2-west-archive` / `floor2-east-service`;
- `floor2-rear-gallery`.

These checkpoints are the debugging seam: a changed wall should fail at the leg that became wrong, not ten actions later.

The HPA-146 browser additions should prove only integration surfaces not already owned by unit tests:

1. open both Floor 2 latches through real rear-side movement in one representative order;
2. interact with the missing subject and then prove its Floor 2 tile is no longer blocking/rendered;
3. use the new Floor 2 -> Floor 1 treasury stair;
4. assert `data-section="floor1-workshop-treasury"` on arrival;
5. claim `floor1-future-treasury` and observe the real stat change;
6. assert one representative journal wiring result: `data-lead="investigate-deeper"`;
7. return to the village and interact with `village-returned-subject`.

Do not duplicate the heirloom/route/ledger lead matrix or re-bump artisan/scout/scribe here; Task 2 unit tests own those branches.

### Step 3: Use one HPA-146 reload checkpoint

Reload once after a meaningful committed HPA-146 checkpoint.

Through real behavior/UI, prove the new durable state survives:

- both opened Floor 2 latches remain usable;
- the Floor 2 subject remains absent;
- the returned village subject remains present/interactable;
- the treasury reward is not re-granted.

Do not duplicate every existing generic reload/combat assertion in the new Floor 2 tail.

Alternate latch order belongs in unit/domain tests.

### Step 4: Run the full gate

```sh
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

All commands must pass on the final branch.

### Step 5: Update planning docs in place

In the design spec:

- change Status from planning-only to implemented when complete;
- record any small implementation deviations that were necessary.

In this plan:

- mark completed tasks;
- do not rewrite the plan into a retrospective.

### Step 6: Commit

Suggested final implementation commit:

```text
test: complete floor two browser journey
```

---

## Review Checklist

Before marking the PR ready:

- [ ] HPA-146 remains one PR.
- [ ] No new `GameState` field was added unless a concrete requirement proved facts/opened IDs insufficient.
- [ ] No generic quest/mechanism/event framework exists.
- [ ] Both Floor 2 mechanisms use existing latch semantics.
- [ ] Runtime presence/blocking has one shared implementation used by movement, save validation, rendering/topology as appropriate.
- [ ] Defeated-enemy disappearance is owned by active-entity lookup, not `resolveEntityAsset`.
- [ ] `NpcEntity.id` is a closed `NpcId`; `resolveNpcDialogue` is exhaustive with no string coverage Set.
- [ ] Direction math is shared through `tileInDirection` / `directionFromTo`.
- [ ] With runtime blocking applied, the existing HPA-237 rear stair remains reachable from the front portal.
- [ ] Latch rear approaches are derived from `tileInDirection(latch.tile, latch.rearSide)`, not separately hardcoded.
- [ ] Both latch orders are proven without duplicating the whole browser journey.
- [ ] Missing subject moves Floor 2 -> village from the single shared `main-subject-returned` intro/presence fact, with no escort state.
- [ ] Heirloom and route completion are derived from treasury traversal/reward state.
- [ ] Ledger thread advances but does not finish.
- [ ] New reciprocal treasury stair reaches the formerly isolated Floor 1 pocket.
- [ ] Existing HPA-237 rear Floor 1 loop still works.
- [ ] `search-floor2` keys on carried `tower-depth-sigil` + `floor1-depth-stairs-used`; the depth fact alone does not skip earlier leads.
- [ ] Runtime-blocked topology reaches the rear stair, both latch rear approaches, subject/ledger interaction approaches, and treasury portal from the front.
- [ ] Floor 1 gains the overlapping `floor1-workshop-treasury` discovery section.
- [ ] Required progression does not depend on optional treasure/consumable keys.
- [ ] Save shape remains current-format-only with no migration/version layer.
- [ ] HPA-22 assets are reused; no generated art is mixed into this task.
- [ ] Real Playwright controls are used; no test-only game API exists.
- [ ] Full CI-equivalent gate is green.

## Expected Final PR Scope

A finished HPA-146 PR should mainly touch:

- fact-gated NPC presence plus consolidation of existing active/blocking rules at the content/movement/save/render boundaries;
- one tiny shared cardinal-geometry module;
- closed NPC/dialogue IDs and HPA-146 fact/journal read-model logic;
- `floor2.ts`, one reciprocal Floor 1 portal, the workshop-treasury section, and one returned village NPC;
- focused domain/content/persistence tests;
- one trimmed extension of the existing cross-floor Playwright journey.

Anything substantially larger is a signal to re-check YAGNI before adding it.
