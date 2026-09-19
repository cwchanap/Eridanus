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

## Task 1: Add fact-gated NPC presence without changing save shape

### Files

Modify:

- `src/game/types.ts`
- `src/game/content.ts`
- `src/game/movement.ts`
- `src/game/save.ts`
- `src/phaser/WorldScene.ts`
- `src/game/content.test.ts`
- `src/game/movement.test.ts`
- `src/game/save.test.ts`

### Step 1: Write only the pure presence/validation tests first

Task 1 must not invent a synthetic MAPS occupant or a maps-injection seam just to test runtime occupancy before the real subject entities exist.

In `src/game/content.test.ts`, cover with object literals / the existing `villageWith` fixture:

1. an NPC with `presence: { factId, when: 'unknown' }` is active before the fact and inactive after it;
2. an NPC with `when: 'known'` behaves in the opposite direction;
3. an always-present NPC stays active;
4. `validateContent` rejects an unknown presence fact.

After wiring movement/save in Step 4, keep the existing real-content regressions green, including the current save test that standing on the village warden is invalid. Do **not** add a test-only `maps` parameter, throwaway village NPC, or synthetic presence tile for `attemptMove` / `loadGame`.

Real movement, vacated-tile, and save occupancy tests for `floor2-missing-subject` / `village-returned-subject` belong in Task 4 after those authored entities exist.

Expected first run: the pure helper/validator tests fail because the presence type/helper does not exist.

Run:

```sh
bunx vitest run src/game/content.test.ts src/game/movement.test.ts src/game/save.test.ts
```

### Step 2: Add the narrow type

In `src/game/types.ts` add:

```ts
export type NpcPresence = Readonly<{
  factId: string;
  when: 'known' | 'unknown';
}>;
```

Add optional `presence?: NpcPresence` to `NpcEntity` only.

Do not put fact gates on `BaseEntity` and do not add a generic condition expression.

### Step 3: Add one presence helper and one active lookup

In `src/game/content.ts` add a pure helper such as:

```ts
export function isEntityPresent(entity: Entity, state: GameState): boolean
```

Rules:

- non-NPC entities are always present;
- NPC without `presence` is always present;
- `known` checks `state.factIds.includes(factId)`;
- `unknown` negates that check.

Add:

```ts
export function getActiveEntityAt(
  state: GameState,
  tile: Tile,
): Entity | undefined
```

Keep existing `getEntityAt(mapId, tile)` static for authored-content lookup and reciprocal portal validation.

Extend `validateContent` so `NpcEntity.presence.factId`, when present, must exist in `FACTS`.

### Step 4: Route runtime occupancy through the active lookup

- `movement.ts`: use `getActiveEntityAt(state, target)`.
- `save.ts`: dynamic current-tile occupancy uses the active lookup.
- `WorldScene.ts`: skip entities for which `isEntityPresent(entity, state)` is false before resolving/drawing assets.

Do not change `resolveEntityAsset`; presence is world state, not an asset concern.

### Step 5: Run the narrow gate

```sh
bun run typecheck
bunx vitest run src/game/content.test.ts src/game/movement.test.ts src/game/save.test.ts
```

### Step 6: Commit

Suggested commit:

```text
feat: add fact-gated npc presence
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

Dialogue selection is ID-keyed, so these tests may land before the subject entities are authored. Only movement/save occupancy waits for Task 4.

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

### Step 3: Extend closed dialogue IDs and authored prose

Add only the line IDs required by current HPA-146 entities/state branches, for example:

- `warden-subject-returned`;
- `subject-returning`;
- `subject-village`;
- `artisan-treasury-route-found`;
- `artisan-heirloom-recovered`;
- `scout-route-verified`;
- `scribe-floor2-ledger-read`.

Update `DIALOGUE_LINES` and `NPC_DIALOGUE_IDS` for the new NPC IDs.

Keep exact English in `src/game/content/dialogue.ts`; `src/game/dialogue.ts` should only select IDs.

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
- `src/phaser/assets.test.ts` only if an existing assertion needs to understand presence; do not add assets.

### Step 1: Replace the connector with the complete authored floor

Rewrite `floor2.ts` as one compact rectangular maze organized into these authored sections:

- `floor2-front-landing` — Front Landing;
- `floor2-central-hall` — Central Hall;
- `floor2-west-archive` — West Archive;
- `floor2-east-service` — East Service Wing;
- `floor2-rear-gallery` — Rear Gallery.

Remove `floor2-connector` once every walkable cell is covered by the new sections.

In this same content commit, replace the current `findSectionById('floor2-connector')` assertion in `src/game/content.test.ts` with assertions for the new section IDs so the first Task 3 test run does not fail for a stale lookup unrelated to the new topology.

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

Map them so:

- when both latch tiles are treated as closed walls, `floor2-front-to-floor1` can still reach `floor2-rear-to-floor1`; the proven HPA-237 rear stair is not mechanism-gated;
- each latch's rear approach is computed as the neighboring tile in its authored `rearSide` and is reachable from the front route without crossing either closed latch;
- opening one never prevents reaching/opening the other;
- at least one materially shortens a return route through familiar space.

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

Inside the currently isolated Floor 1 3x3 treasury pocket, add:

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

The critical structural route must be enemy-free: no enemy may be the only route from the front landing to the existing rear stair, either computed latch rear approach, the missing subject, or the treasury-return portal. This makes the topology proof sufficient for reachability and avoids a hidden dependency on optional Floor 1 rewards.

Do not add random loot, roaming enemies, new combat rules, or required consumable keys. The Playwright journey should deliberately detour to fight at least one optional Floor 2 enemy so combat is still proven end to end.

### Step 6: Replace topology assertions with HPA-146 relationships

Keep tests in `src/game/content.test.ts`; do not create a second map-validation framework.

Extend the existing test-local `floodFloor`; do not extract a topology module. Support two explicit modes where needed: layout-only floor connectivity, and floor connectivity with selected closed latch tiles treated as walls.

Compute each latch rear approach from its real `tile` + `rearSide` using the same direction geometry as `src/game/actions.ts`; do not hardcode separate coordinates.

Prove:

1. all authored content validates;
2. every Floor 2 walkable cell is covered by a section;
3. layout-only connectivity remains sane;
4. with both Floor 2 latch tiles treated as walls, the front portal still reaches the existing rear portal;
5. in that same closed-latch mode, each computed latch rear approach is reachable from the front route;
6. therefore either latch can be opened first, and after opening either one the other rear approach remains reachable;
7. the missing subject and new treasury portal are reachable on the critical enemy-free topology without optional rewards;
8. the new Floor 1 treasury portal sits inside the isolated pocket and the pocket flood reaches `floor1-future-treasury`;
9. the pocket remains unreachable from ordinary Floor 1 front/rear floor geometry alone;
10. the new portal pair is reciprocal.

Use entity IDs rather than pinning tests to arbitrary map dimensions where possible.

### Step 7: Run the content/asset gate

```sh
bun run typecheck
bunx vitest run src/game/content.test.ts src/phaser/assets.test.ts
```

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
- arrival discovers the containing Floor 1 section if applicable;
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

## Task 5: Re-walk the real browser journey and finish HPA-146

### Files

Modify:

- `tests/e2e/cross-floor.spec.ts`
- docs in this PR only to mark landed tasks/status after implementation.

Do not add a second E2E file unless a truly independent browser concern cannot fit the existing suite. Prefer extending the current player-facing journey.

### Step 1: Keep existing platform smoke coverage

Preserve:

- asset catalog serving test;
- basic HUD boot test;
- movement-during-asset-preload test.

Only update them if the changed content genuinely invalidates assumptions.

### Step 2: Extend the main journey from a fresh save

At the village start, talk to the warden plus artisan/scout/scribe so optional journal threads are visible before entering the tower.

Reuse the current Floor 1 route to obtain the reusable sigil and descend.

Once on the completed Floor 2:

1. assert the new Floor 2 section IDs appear as the player explores;
2. traverse one representative wing order;
3. open `floor2-west-release` and `floor2-east-release` through real rear-side movement;
4. deliberately detour into an optional branch and fight at least one Floor 2 enemy through the real Fight prompt;
5. inspect the ledger evidence;
6. interact with the missing subject and assert `data-effect="dialogue"`;
7. use the new Floor 2 -> Floor 1 treasury stair;
8. claim `floor1-future-treasury` and observe the defense change;
9. assert journal lead attributes show:
   - main `investigate-deeper`;
   - heirloom `heirloom-resolved`;
   - route `route-resolved`;
   - ledger `ledger-follow-deeper-record`;
10. return through existing authored connections to the village;
11. navigate to the returned subject and bump them, proving the village NPC is now present through the real player-facing interaction;
12. bump the warden/artisan/scout/scribe as useful and assert dialogue effect IDs/copy only through stable UI effects, not internal state.

Do not use screenshots or expose game internals for assertions.

### Step 3: Add meaningful reload checks

Reload after a committed Floor 2 checkpoint and/or after the final treasury/village payoff.

Verify through real behavior/UI that:

- opened latches remain traversable;
- returned subject no longer blocks/reappears on Floor 2;
- village returned subject remains interactable;
- ledger note/journal lead remains;
- treasury reward is not granted twice;
- defeated enemy stays gone/traversable;
- exact current position still resumes as before.

Keep one representative browser order. Alternate latch order belongs in unit/content tests from Tasks 3-4.

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
- [ ] With both latch tiles closed, the existing HPA-237 rear stair remains reachable from the front portal.
- [ ] Latch rear approaches are derived from `tile + rearSide`, not separately hardcoded.
- [ ] Both latch orders are proven without duplicating the whole browser journey.
- [ ] Missing subject moves Floor 2 -> village from the single shared `main-subject-returned` intro/presence fact, with no escort state.
- [ ] Heirloom and route completion are derived from treasury traversal/reward state.
- [ ] Ledger thread advances but does not finish.
- [ ] New reciprocal treasury stair reaches the formerly isolated Floor 1 pocket.
- [ ] Existing HPA-237 rear Floor 1 loop still works.
- [ ] `search-floor2` keys on carried `tower-depth-sigil` + `floor1-depth-stairs-used`; the depth fact alone does not skip earlier leads.
- [ ] The critical rear-stair/latch-rear/subject/treasury topology is enemy-free.
- [ ] Required progression does not depend on optional treasure/consumable keys.
- [ ] Save shape remains current-format-only with no migration/version layer.
- [ ] HPA-22 assets are reused; no generated art is mixed into this task.
- [ ] Real Playwright controls are used; no test-only game API exists.
- [ ] Full CI-equivalent gate is green.

## Expected Final PR Scope

A finished HPA-146 PR should mainly touch:

- fact-gated NPC presence at the existing content/movement/save/render boundaries;
- fact/dialogue/journal content and read-model logic;
- `floor2.ts`, one reciprocal Floor 1 portal, and one returned village NPC;
- focused domain/content/persistence tests;
- the existing cross-floor Playwright journey.

Anything substantially larger is a signal to re-check YAGNI before adding it.
