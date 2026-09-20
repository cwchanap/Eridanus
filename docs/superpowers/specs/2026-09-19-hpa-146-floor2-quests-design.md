# HPA-146 Complete Floor 2 and Clue-Driven Exploration Quests Design

## Status

Implemented. This PR is the single HPA-146 PR, built on the merged HPA-237, HPA-22, and HPA-235 foundation.

The implementation extends the current fact-first authored-content model. It introduces no quest engine, generic mechanism system, event bus, escort system, save migration layer, or new art pipeline.

Implementation deviations: none of the design contracts changed. Two test-facing consequences are worth recording. The browser journey now claims `floor1-future-treasury` before the Floor 1 rear-wing fights, so the gatekeeper previews resolve at 9/6 HP loss (previously 15/10) — a direct consequence of the +2 defense reward, not a combat-rule change. The rewritten journey also folds the old mid-journey discovery reload into the single HPA-146 reload checkpoint, which asserts section discovery, both opened releases, the vacated subject tile, the returned village subject, and the claimed treasury in one pass.

## Goal

Turn the small Floor 2 connector into the complete mid-game floor and deliver the MVP's strongest exploration payoffs:

- a complete Floor 2 built around a central area plus two connected wings, loops, shortcuts, and recognizable authored sections;
- two permanent route-opening mechanisms that can be completed in either order;
- a new Floor 2 -> sealed Floor 1 treasury connection that makes the previously visible reward reachable from behind;
- the missing-character encounter, followed by the character being back in the village without escort gameplay;
- resolution of the heirloom and lost-route optional threads;
- meaningful advancement, but not completion, of the keeper-ledger thread;
- deterministic combat, authored rewards, and save/reload behavior using the systems already present.

The player should feel that understanding the maze changes what becomes reachable. The floor should not read as a sequence of rooms to clear.

## Current Foundation

Main already has the required durable and presentation seams:

- `GameState` persists map/tile, player stats, opened reward IDs, defeated enemy IDs, opened shortcut IDs, carried item IDs, durable fact IDs, and discovered authored section IDs.
- `FACTS` is the single registry for legal durable facts and optional journal-note copy.
- NPC dialogue is selected from current state and returns closed `DialogueLineId` values.
- The journal is a derived read model; it persists no quest objects or statuses.
- `RewardEntity` already supports fixed stat rewards and authored carried items.
- `LatchEntity` already represents a permanent rear-opened passage and persists in `openedShortcutIds`.
- Portals already support reciprocal authored connections and durable traversal facts.
- save validation checks authored IDs against current content, with no versioning or migration.
- Phaser redraws from current `GameState`; the DOM overlay only presents typed results.
- HPA-22 already ships dungeon terrain, NPC, enemy, clue, gate, stairs, and reward art.

HPA-146 should use those seams directly.

## Chosen Approach

### 1. Keep mechanisms as authored latches

The two Floor 2 mechanisms are ordinary `LatchEntity` instances placed so the player reaches their rear sides through authored loops.

This is intentionally not a new switch/mechanism entity.

The existing latch contract already gives the required behavior:

- closed passage blocks from the front;
- reaching the rear side permanently opens it;
- the opened ID is durable;
- the tile then becomes two-way walkable;
- the existing closed/open gate art already communicates state.

The Floor 2 layout should make the two latch routes independently reachable so opening one is not a prerequisite for opening the other. Unit topology tests must prove both intended orders remain possible.

One or both latches may also serve as the floor's useful return shortcut. Do not add a separate fast-travel or door subsystem.

### 2. Persist story/quest evidence as facts, items, and existing opened IDs

HPA-146 adds no new `GameState` fields.

Progress is derived from:

- `factIds` for learned story/evidence/traversal facts;
- `openedRewardIds` for the Floor 1 treasury payoff;
- `openedShortcutIds` for the two Floor 2 mechanisms;
- existing `itemIds` where already meaningful;
- `discoveredSectionIds` for remembered areas.

Do not persist `questStatus`, `rescuedCharacterIds`, `mechanismIds`, or a generic flags dictionary.

Old development saves may become content-invalid as authored map IDs move during pre-release development. Use the existing explicit reset behavior; do not add migration compatibility.

### 3. Add one narrow fact-gated NPC presence seam and centralize runtime entity truth

The missing character must disappear from Floor 2 after the encounter and appear in the village. A static NPC cannot model that, while a new story-state subsystem would duplicate `factIds`.

Extend only `NpcEntity` with an optional fact gate, and narrow its ID to a closed `NpcId` union:

```ts
type NpcId =
  | 'village-warden'
  | 'village-artisan'
  | 'village-scout'
  | 'village-scribe'
  | 'floor2-missing-subject'
  | 'village-returned-subject';

type NpcPresence = Readonly<{
  factId: string;
  when: 'known' | 'unknown';
}>;

type NpcEntity = BaseEntity &
  Readonly<{
    id: NpcId;
    kind: 'npc';
    name: string;
    introFactId: string;
    presence?: NpcPresence;
  }>;
```

`resolveNpcDialogue` takes `NpcId` and uses an exhaustive switch with no default. The existing string `NPC_DIALOGUE_IDS` coverage set is removed rather than becoming a second list to maintain. Adding a mistyped or unhandled authored NPC must fail TypeScript, not at runtime.

Presence semantics:

- an NPC without `presence` is always present;
- `when: 'unknown'` is present only before the fact is known;
- `when: 'known'` is present only after the fact is known;
- the existing defeated-enemy disappearance is also centralized in the same runtime-presence helper rather than remaining hidden inside the asset resolver.

Add these small shared helpers beside the authored lookups in `src/game/content.ts`:

- `isEntityPresent(entity, state)` — runtime existence/visibility for conditional NPCs and defeated enemies;
- `getActiveEntities(state)` — current map entities filtered through that predicate;
- `getActiveEntityAt(state, tile)` — state-aware runtime lookup;
- `isEntityBlocking(entity, state)` plus a tile wrapper — the single rule for reward/enemy/latch consumption plus clue/recovery/NPC/portal blocking semantics.

Movement, save validation, and topology tests reuse the same blocking rule. `WorldScene` iterates `getActiveEntities(state)`. `resolveEntityAsset` becomes texture selection only; it no longer decides whether a defeated enemy exists.

Keep static authored lookups such as `getEntityAt(mapId, tile)`, `findEntityById`, and reciprocal-portal validation independent of runtime presence.

Content validation verifies any NPC presence fact exists in `FACTS`. No generic condition language is added.

## Missing Character Transition

Author two NPC instances with distinct globally unique entity IDs. Both use the same idempotent story fact for intro and presence:

- `floor2-missing-subject`: `introFactId: 'main-subject-returned'` and `presence: { factId: 'main-subject-returned', when: 'unknown' }`;
- `village-returned-subject`: `introFactId: 'main-subject-returned'` and `presence: { factId: 'main-subject-returned', when: 'known' }`.

The Floor 2 bump records `main-subject-returned` before dialogue selection, so the subject's Floor 2 and village lines must be selected by NPC ID rather than by checking whether that fact is already known. This preserves the one interaction that records the fact while avoiding a second "seen/reported" story flag. Repeating the village intro fact is intentionally idempotent.

After that action:

- the Floor 2 NPC is no longer rendered or blocking;
- the village NPC becomes rendered/blocking;
- save/reload derives the same placement from the fact;
- there is no escort path, companion entity, delayed timer, or second state owner.

The village warden and returned character receive state-aware dialogue acknowledging the return and preserving one unanswered Floor 3 question.

## Floor 2 Topology

Do not freeze an arbitrary tile count in the design. Choose a compact rectangular layout during implementation and validate relationships rather than quotas.

The completed floor should contain five recognizable authored areas:

- **Front Landing** — reciprocal entry from the existing Floor 1 front stair.
- **Central Hall** — the main landmark and route-choice hub.
- **West Archive** — clue/evidence-heavy wing.
- **East Service Wing** — alternate loop with fixed combat/reward pressure.
- **Rear Gallery** — connects to the existing HPA-237 rear Floor 1 stair and the new treasury-return route.

Exact section rectangles are implementation details, but every walkable tile remains covered by at least one section because that is an existing content invariant.

Required topology is verified against the game's real blocking rules, not layout glyphs alone.

Use a fresh required-state Floor 2 snapshot with unopened rewards, undefeated enemies, unopened latches, and `main-subject-returned` still unknown. Flood only floor tiles for which the shared runtime blocking predicate says the player may stand there. Bump-only entities such as the missing subject or ledger clue are targets via a reachable adjacent approach tile, not by pretending their occupied tile is walkable.

The compact proof is:

1. from `floor2-front-to-floor1`, the blocked-state flood reaches `floor2-rear-to-floor1`;
2. it reaches the rear approach of both Floor 2 latches, with each approach derived through the shared direction helper from `latch.tile` and `latch.rearSide`;
3. it reaches an interaction approach for the missing subject and ledger clue, plus the new treasury-return portal;
4. the new reciprocal stair reaches the sealed Floor 1 treasury pocket.

These checks imply either latch can be opened first while preserving the proven HPA-237 rear-stair route. Latches may shorten return routes but are not required to enter that loop. Optional hidden evidence/reward may sit in side alcoves but must not invalidate the blocked-state reachability proof.

Keep a separate layout-only flood only where it proves the Floor 1 treasury pocket remains geometrically isolated from ordinary Floor 1 front/rear entries.

Complexity belongs in authored walls, loops, and connection placement. Do not add reversible switch state or procedural rooms.

## New Floor 1 Treasury Connection

Preserve the current sealed treasury pocket around `floor1-future-treasury`.

Add an overlapping authored section for the payoff room:

```ts
{
  id: 'floor1-workshop-treasury',
  name: 'Workshop Treasury',
  bounds: { minX: 15, maxX: 17, minY: 6, maxY: 8 },
}
```

Overlapping sections are already legal, and `discoverCurrentSection` records every matching section. This gives the strongest cross-floor exploration payoff its own journal-visible place and a stable browser checkpoint rather than silently reusing the already-discovered broad Rear Wing section.

Add one new portal tile inside that isolated pocket and a reciprocal Floor 2 portal:

- `floor1-treasury-to-floor2`;
- `floor2-treasury-to-floor1`.

The Floor 2 -> Floor 1 direction records a new fact such as `floor1-treasury-return-used`.

That one durable traversal fact supports two different optional-thread interpretations:

- **Lost Route:** the supposedly inaccessible return connection has been verified.
- **Heirloom:** the player has found the other entrance and can now claim the visible treasury reward.

Collecting `floor1-future-treasury` remains the actual heirloom payoff. Do not add a second heirloom item or duplicate reward state.

The existing HPA-237 Floor 2 rear stair remains separate and continues to return to the Floor 1 Rear Wing. Do not repurpose or delete that proven loop.

## Quest Read Models

Quest progress stays derived. The journal continues to expose one closed lead ID per visible thread and no status field.

### Main story

Extend the main lead with explicit existing-state gates, in this precedence order:

1. `main-subject-returned` -> `investigate-deeper`;
2. `tower-depth-sigil` carried **and** `floor1-depth-stairs-used` known -> `search-floor2`;
3. `tower-depth-sigil` carried -> existing `descend`;
4. `main-missing-person-lead` known -> existing `find-sigil`;
5. otherwise -> existing `seek-warden`.

`floor1-depth-stairs-used` is the named required-stair descent fact. The depth fact alone, without the sigil, must not skip the earlier main-story lead. Do not add a separate "reported to warden" durable flag merely to create another stage.

### Heirloom

Derive the thread from existing facts/reward state:

- before the new route is used: find another entrance from below;
- after `floor1-treasury-return-used`: reach/claim the workshop treasury;
- after `openedRewardIds` contains `floor1-future-treasury`: resolved/completion copy.

If the player reaches/claims the treasury before first speaking with the artisan, the first artisan conversation must immediately acknowledge that state.

### Lost Route

Use the new treasury-return traversal fact as the completion evidence for the HPA-235 route scratches.

- route marks known -> verify the return connection;
- `floor1-treasury-return-used` known -> resolved/completion copy.

Do not require collecting markers or talking to the scout in a particular order.

### Keeper Ledger

Add one authored Floor 2 evidence clue that records a fact such as `floor2-paired-release-ledger-read`.

Its text/note should explain the two rear-release mechanisms and reinterpret the earlier "paired mechanisms" hint from the first fragment.

After this fact:

- the scribe dialogue acknowledges the later page/evidence;
- the journal advances to a lead that points toward missing final evidence deeper in the tower;
- the thread remains unfinished for HPA-137.

A `ClueEntity` is sufficient for this authored evidence because it already records a durable fact and displays authored content. Do not widen item-reward schema just to carry prose.

## Facts and Dialogue

Extend `FACTS` with only the facts needed by authored HPA-146 content, for example:

- `main-subject-returned`;
- `floor1-treasury-return-used`;
- `floor2-paired-release-ledger-read`;
- optional hidden clue/observation facts only if the final map actually uses them.

Facts with useful player-readable observations may include `note` copy. Pure story context facts do not need a note.

Extend the closed dialogue-line union and authored dialogue table for:

- missing subject on Floor 2;
- returned subject in the village;
- warden after the subject returns;
- artisan after treasury route/reward payoff;
- scout after lost-route verification;
- scribe after Floor 2 ledger evidence.

Dialogue selection remains direct state inspection in `resolveNpcDialogue`. Do not introduce a branching dialogue tree abstraction.

## Combat and Rewards

Reuse deterministic combat unchanged.

Floor 2 may add a small authored set of stationary enemies and fixed rewards to shape route pressure. Do not encode a separate English "enemy-free critical path" rule. The shared blocking predicate and required-state topology flood are the executable contract: if an undefeated enemy, clue, recovery point, NPC, closed latch, or unopened reward cuts the only route to a required interaction approach, the content test fails.

This is deliberately stronger and simpler than a second combat/path simulator. HPA-146 adds no combat mechanics, so the browser journey does not need a new Floor 2-specific combat detour; existing cross-floor browser coverage already proves Fight/Cancel integration.

Other constraints remain fixed:

- no random encounters;
- no roaming AI;
- no new combat commands;
- no XP or levels;
- no optional consumable key required for the main story route;
- optional treasury/hidden rewards may make later encounters cheaper but are not required to avoid a dead end.

Reuse `enemy-ruin-guard`, `chest-relic-closed/open`, gate, clue, NPC, and stairs assets. HPA-146 does not generate images.

If distinct new art is desired later, scope it as a separate art task/PR rather than mixing it into this implementation ticket.

## Runtime Presence and Save Validation

No save shape changes are needed.

Move the current save-only blocking switch into shared runtime content logic. Save validation calls that same predicate used by movement and topology tests.

Dynamic occupancy then follows one rule:

- inactive fact-gated NPCs and defeated enemies are absent from active lookup;
- unopened rewards, undefeated active enemies, closed latches, clues, recovery points, and active NPCs block;
- opened rewards/latches and portals do not block standing/traversal according to the existing semantics.

Add a regression case proving a save can load while standing on the former Floor 2 subject tile after `main-subject-returned` is known, while the same tile is blocking before that fact.

All new facts, sections, latches, rewards, enemies, and portals continue through the existing authored-ID validation.

## Content Validation

Keep `validateContent` as the single authored-content gate.

Extend it only for the new NPC presence field:

- presence fact ID must exist in `FACTS`.

Existing rules continue to cover:

- globally unique entity and section IDs;
- globally unique carried item IDs;
- valid entity floor tiles;
- complete section coverage;
- authored fact references;
- reciprocal portals;
- valid portal lock item references.

Dialogue coverage no longer needs a runtime Set/string validator once `NpcEntity.id` is a closed `NpcId` and `resolveNpcDialogue` is exhaustive.

Do not add a second validator for Floor 2.

## Presentation

No new HUD subsystem is required.

- `WorldScene` iterates `getActiveEntities(state)`; it does not own a second visibility filter.
- `resolveEntityAsset` becomes texture-only. Defeated-enemy disappearance moves to the shared presence predicate.
- Existing NPC guide art is reused for both subject instances.
- Existing effect rendering already handles dialogue, clue, reward, latch, travel, and combat.
- `JournalPanel` only needs new closed lead IDs and display copy.
- No minimap, quest tracker widget, escort marker, mechanism panel, or special story modal is added.

## Testing Strategy

### Unit/content tests

Cover the risky contracts directly:

- closed `NpcId` authoring and exhaustive dialogue selection;
- pure fact-gated NPC presence before/after `main-subject-returned` using object literals;
- defeated enemies and fact-hidden NPCs disappear through the same active-entity rule;
- the shared blocking predicate preserves current reward/enemy/latch/clue/recovery/NPC/portal semantics;
- content validation rejects an unknown NPC presence fact without adding a maps-injection seam;
- the shared `tileInDirection` / direction geometry drives movement, latch interaction, and topology rear-approach derivation;
- once the real subject entities are authored, movement sees only active NPC occupancy;
- once the real subject entities are authored, save validation allows the vacated Floor 2 NPC tile only after the presence fact;
- missing-character interaction records the return fact and returns the intended dialogue line;
- warden/artisan/scout/scribe dialogue acknowledges HPA-146 facts even when discoveries happened before first conversation;
- journal leads resolve heirloom and lost-route threads from existing facts/opened reward state and advance ledger without completing it;
- new treasury portals are reciprocal and traversal records `floor1-treasury-return-used`;
- treasury reward is reachable through the new connection and still collected exactly once;
- the blocked-state Floor 2 flood reaches the rear portal, both derived latch rear approaches, and interaction approaches for the subject/ledger plus the treasury portal;
- the Floor 1 treasury pocket remains geometrically isolated except through the new reciprocal portal;
- arriving in the pocket discovers `floor1-workshop-treasury`.

Do not build a second simulator; the topology test reuses the same blocking predicate as the runtime.

### Playwright

Extend the existing real `tests/e2e/cross-floor.spec.ts`; do not create a test-only game API.

Keep the browser journey focused on integration surfaces unit tests cannot prove cheaply:

- fresh village -> Floor 1 -> Floor 2;
- after each authored Floor 2 navigation leg, assert the expected `data-section` checkpoint so a changed wall fails near the bad leg rather than much later;
- open both mechanisms through real rear-side movement;
- encounter the missing subject and prove the presence flip through real movement/rendering;
- use the new treasury-return stair;
- assert `floor1-workshop-treasury` on arrival and claim the previously sealed reward;
- assert one representative derived lead, `investigate-deeper`, to prove main-state -> journal -> DOM wiring;
- return to the village and interact with the returned subject;
- perform one reload checkpoint proving the new latch/subject/treasury state survives.

Do not duplicate all four journal leads or re-bump artisan/scout/scribe in E2E; Task 2 unit tests own those read-model branches. Existing browser coverage already proves combat and general reload behavior. Unit tests, not a second browser journey, prove the alternate mechanism order.

## Implementation Sequencing

The NPC presence field touches runtime occupancy and rendering but not durable state. Make that seam compile-safe first.

Recommended implementation order:

1. add closed presence/dialogue/journal type contracts plus active-entity helpers and tests;
2. add HPA-146 facts/dialogue/journal derivation;
3. author complete Floor 2, reciprocal treasury portal, returned village NPC, and topology tests;
4. add interaction/save regression coverage and tune combat/reward values;
5. extend the existing Playwright journey and run the full CI-equivalent gate.

The full HPA-146 implementation stays on this one PR.

## Risks

### Runtime blocking drift

If movement, save validation, rendering, and topology each encode their own entity-state rules, a content proof can pass while the real maze is soft-locked.

Mitigation: one runtime presence rule, one blocking predicate, and state-aware active lookups in shared game code. Movement, save validation, renderer iteration, and topology tests consume those helpers. Task 1 tests the pure helpers; real subject-tile occupancy is tested after authored entities exist. Do not add a maps-injection seam just for tests.

### Main-lead fact drift

The current journal intentionally does not advance from depth facts alone. An unnamed "descent" stage would make implementation and tests disagree.

Mitigation: `search-floor2` requires both the carried `tower-depth-sigil` and the existing `floor1-depth-stairs-used` fact; `main-subject-returned` then advances to `investigate-deeper`.

### Over-generalizing mechanisms

A remote switch/door framework is tempting because the ticket says "mechanisms."

Mitigation: use the already-proven rear-opened latch semantic. Author complexity into the map.

### Quest state duplication

Adding completed booleans would diverge from facts/rewards already proving the same events.

Mitigation: derive all HPA-146 journal/dialogue states from existing durable evidence.

### Browser route fragility

Replacing Floor 2 geometry invalidates current counted-key e2e navigation.

Mitigation: land runtime-aware topology proof with the map rewrite, then re-walk one trimmed Playwright route. Assert the expected journal section after each navigation leg to localize a bad wall immediately. Intermediate planning/implementation commits may temporarily fail that journey; the final branch must be green.

### Art scope creep

A complete new floor can invite unique portraits/enemy sets.

Mitigation: reuse HPA-22 runtime assets. Distinct art is a separate task if later warranted.

## Non-Goals

Do not add:

- Floor 3, final boss, or ending;
- a quest engine, quest-status persistence, event DSL, or generic trigger system;
- remote/reversible switch machinery;
- escort AI or companion movement;
- roaming/random encounters;
- procedural maps or loot;
- XP, levels, skill trees, equipment, or tactical combat commands;
- a minimap/fog system;
- save versions or migrations;
- new image generation or an asset pipeline;
- a second browser testing harness.

## Final Design Decision

HPA-146 is primarily authored-content expansion on top of HPA-235.

The only new gameplay behavior is a narrow fact-gated NPC presence rule so the missing character can move from Floor 2 to the village without adding story-state machinery.

Supporting refactors only consolidate rules that already exist: closed `NpcId` dialogue dispatch, shared direction geometry, shared runtime presence/blocking, and state-aware active-entity lookup. Everything else—mechanisms, quests, evidence, treasury payoff, combat, persistence, and journal updates—reuses the existing latch/fact/reward/portal/read-model seams.
