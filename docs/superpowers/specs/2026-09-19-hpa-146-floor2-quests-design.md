# HPA-146 Complete Floor 2 and Clue-Driven Exploration Quests Design

## Status

Draft / planning only. This PR is the single HPA-146 PR and starts from the merged HPA-237, HPA-22, and HPA-235 foundation.

The implementation should extend the current fact-first authored-content model. It must not introduce a quest engine, generic mechanism system, event bus, escort system, save migration layer, or new art pipeline.

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

### 3. Add one narrow fact-gated NPC presence seam

The missing character must disappear from Floor 2 after the encounter and appear in the village. A static NPC cannot model that, while a new story-state subsystem would duplicate `factIds`.

Extend only `NpcEntity` with an optional fact gate:

```ts
type NpcPresence = Readonly<{
  factId: string;
  when: 'known' | 'unknown';
}>;

type NpcEntity = BaseEntity &
  Readonly<{
    kind: 'npc';
    name: string;
    introFactId: string;
    presence?: NpcPresence;
  }>;
```

Semantics:

- no `presence` means always present;
- `when: 'unknown'` is present only before the fact is known;
- `when: 'known'` is present only after the fact is known.

Add one pure helper such as `isEntityPresent(entity, state)` and one state-aware tile lookup such as `getActiveEntityAt(state, tile)`.

Use the state-aware lookup only where runtime occupancy matters:

- movement interaction/blocking;
- save validation of the current tile;
- Phaser entity rendering.

Keep static authored lookups such as `findEntityById` and reciprocal-portal validation independent of runtime presence.

Content validation verifies any NPC presence fact exists in `FACTS`.

This is not a generic conditional-entity scripting system. Only NPCs need it in HPA-146.

## Missing Character Transition

Author two NPC instances with distinct globally unique entity IDs:

- a Floor 2 missing-character NPC with `presence: { factId: 'main-subject-returned', when: 'unknown' }`;
- a village returned-character NPC with `presence: { factId: 'main-subject-returned', when: 'known' }`.

The Floor 2 NPC's existing `introFactId` behavior records `main-subject-returned` on the first interaction before dialogue selection. The returned dialogue can therefore say the character can make their own way back.

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

Required topology relationships:

1. Front Landing reaches Central Hall without optional rewards.
2. Both West Archive and East Service Wing are reachable from the central area.
3. The rear side of each Floor 2 latch is reachable without the other latch being open.
4. Opening either latch leaves the other mechanism completable.
5. The existing Floor 2 rear stair to the Floor 1 Rear Wing remains usable.
6. A new reciprocal stair reaches the sealed 3x3 Floor 1 treasury pocket.
7. The new treasury stair and missing-character encounter are reachable on the required story path without optional quest rewards.
8. Optional hidden evidence/reward may sit in a side alcove but must not gate the main route.

Complexity belongs in authored walls, loops, and connection placement. Do not add reversible switch state or procedural rooms.

## New Floor 1 Treasury Connection

Preserve the current sealed treasury pocket around `floor1-future-treasury`.

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

Extend the main lead sequence conceptually to:

1. existing village lead / sigil search;
2. descend into Floor 2;
3. search Floor 2 for the missing subject;
4. after `main-subject-returned`, point toward the unresolved deeper mystery / next-floor investigation.

Do not add a separate "reported to warden" durable flag merely to create another stage.

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

Floor 2 may add a small authored set of stationary enemies and fixed rewards to shape route pressure. Exact counts and stat numbers are tuning decisions, but these constraints are fixed:

- no random encounters;
- no roaming AI;
- no new combat commands;
- no XP or levels;
- no optional consumable key required for the main story route;
- a fresh required-story run remains completable using required progression only;
- optional treasury/hidden rewards may make later encounters cheaper but are not required to avoid a dead end.

Reuse `enemy-ruin-guard`, `chest-relic-closed/open`, gate, clue, NPC, and stairs assets. HPA-146 does not generate images.

If distinct new art is desired later, scope it as a separate art task/PR rather than mixing it into this implementation ticket.

## Runtime Presence and Save Validation

No save shape changes are needed.

The only save-validation behavior change is dynamic occupancy:

- inactive fact-gated NPCs do not block saved current tiles;
- active NPCs still do.

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
- dialogue coverage for every NPC ID;
- authored fact references;
- reciprocal portals;
- valid portal lock item references.

Do not add a second validator for Floor 2.

## Presentation

No new HUD subsystem is required.

- `WorldScene` skips inactive NPCs before resolving/drawing their assets.
- Existing NPC guide art is reused for both subject instances.
- Existing effect rendering already handles dialogue, clue, reward, latch, travel, and combat.
- `JournalPanel` only needs new closed lead IDs and display copy.
- No minimap, quest tracker widget, escort marker, mechanism panel, or special story modal is added.

## Testing Strategy

### Unit/content tests

Cover the risky contracts directly:

- fact-gated NPC presence before/after `main-subject-returned`;
- movement sees only active NPC occupancy;
- save validation allows the vacated NPC tile only after the presence fact;
- content validation rejects an unknown NPC presence fact;
- missing-character interaction records the return fact and returns the intended dialogue line;
- warden/artisan/scout/scribe dialogue acknowledges HPA-146 facts even when discoveries happened before first conversation;
- journal leads resolve heirloom and lost-route threads from existing facts/opened reward state and advance ledger without completing it;
- each Floor 2 latch opens from its authored rear side and remains durable;
- the two latches are independently completable in either intended order;
- new treasury portals are reciprocal and traversal records `floor1-treasury-return-used`;
- treasury reward is reachable through the new connection and still collected exactly once;
- every Floor 2 walkable tile belongs to a section;
- required Floor 2 topology remains connected without optional rewards.

Prefer geometry/flood-fill assertions over a second simulation framework.

### Playwright

Extend the existing real `tests/e2e/cross-floor.spec.ts`; do not create a test-only game API.

The critical browser journey should prove one representative order:

- fresh village -> Floor 1 -> Floor 2;
- take real route choices through the completed floor;
- open both mechanisms;
- encounter the missing subject and commit the return fact;
- read the Floor 2 ledger evidence;
- use the new treasury-return stair;
- claim the previously sealed Floor 1 treasury reward;
- observe derived journal/dialogue payoff;
- return to the village and see the subject/warden updated there;
- reload at meaningful checkpoints and verify mechanisms, subject placement, evidence, opened treasure, and defeated enemies do not duplicate or regress.

Unit tests, not a duplicated second browser journey, prove the alternate mechanism order.

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

### Conditional NPC occupancy drift

If rendering filters an NPC but movement/save validation still use static authored occupancy, the subject can become invisible but continue blocking or invalidate legitimate saves.

Mitigation: one pure presence helper, used by the three runtime occupancy/rendering call sites.

### Over-generalizing mechanisms

A remote switch/door framework is tempting because the ticket says "mechanisms."

Mitigation: use the already-proven rear-opened latch semantic. Author complexity into the map.

### Quest state duplication

Adding completed booleans would diverge from facts/rewards already proving the same events.

Mitigation: derive all HPA-146 journal/dialogue states from existing durable evidence.

### Browser route fragility

Replacing Floor 2 geometry invalidates current counted-key e2e navigation.

Mitigation: land unit/topology proof with the map rewrite, then re-walk and update the existing Playwright route. Intermediate planning/implementation commits may temporarily fail that journey; the final branch must be green.

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

The only new runtime abstraction is a narrow fact-gated NPC presence rule so the missing character can move from Floor 2 to the village without adding story-state machinery. Everything else—mechanisms, quests, evidence, treasury payoff, combat, persistence, and journal updates—reuses the existing latch/fact/reward/portal/read-model seams.
