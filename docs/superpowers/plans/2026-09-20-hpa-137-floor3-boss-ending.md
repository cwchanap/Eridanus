# HPA-137 Complete Floor 3, Boss, and MVP Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Complete Floor 3, defeat the deterministic core guardian, recover the Restoration Core, close the optional keeper-ledger thread, and return to the village for a durable MVP ending.

**Architecture:** Extend the existing authored-content/fact-first model only. Floor 3 is another MapDefinition; the boss is another EnemyEntity; final progression derives from existing fact/item/defeated/opened arrays. Add only two narrow behavioral seams: a discriminated item-or-fact PortalLock and a pure NPC interaction result that may record one fact.

**Tech Stack:** Bun 1.4.2, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, Vite 8, LocalStorage.

**Spec:** docs/superpowers/specs/2026-09-20-hpa-137-floor3-boss-ending-design.md

## Global Constraints

- One ticket = one PR. Keep the entire HPA-137 implementation on this PR.
- Add no GameState field and no save migration/version layer.
- Keep pure TypeScript as rules/content/state owner; Phaser stays rendering/input; DOM stays presentation.
- Reuse previewCombat and resolveCombat unchanged for the boss.
- Pin floor3-core-guardian at HP 36 / ATK 7 / DEF 4.
- A full-health baseline player at HP 30 / ATK 10 / DEF 2 must preview the boss as 6 hits and 25 HP loss.
- Put a normal recovery waystone one bump from the sole boss-approach tile; never place the blocking RecoveryEntity on the corridor itself.
- Reuse HPA-22 assets only. Do not generate boss/Floor 3 art in this PR.
- Keep the optional ledger outcome derived from facts; do not add quest status.
- Keep the final ending fact idempotent and owned by the village warden interaction.
- Keep the existing string + FACTS runtime-validation model for fact IDs in HPA-137; do not add a FactId type migration in this content ticket.
- HPA-21 owns release balancing/polish; HPA-137 only proves required-path viability.

## Review Focus

- **Premature Floor 3 entry:** touching the Floor 2 depth portal before main-subject-returned must show the locked text and record only floor2-depth-seal-seen; it must not record the requirement fact or travel.
- **Ending outcome order:** the warden must record main-village-restored exactly once with the Restoration Core, and choose the expanded line only when floor3-keeper-final-record-read is already known.
- **Boss viability without optional rewards:** baseline full health must preview the boss at exactly 6 hits / 25 HP loss, and the sole boss-approach tile must be one bump from the recovery waystone so any attrition can be cleared immediately before the fight.
- **Dynamic save occupancy:** undefeated boss/unopened core tiles must reject saves while defeated/opened variants load and remain traversable.
- **Optional evidence before quest intro:** reading the final ledger record before speaking to the scribe must still resolve the ledger read model and later produce the expanded ending.

---

## Task 1: Generalize portal locks without changing current item-gate behavior

**Files:**
- Modify: src/game/types.ts
- Modify: src/game/movement.ts
- Modify: src/game/content.ts
- Modify: src/game/content/floor1.ts
- Modify: src/game/movement.test.ts
- Modify: src/game/content.test.ts

**Interfaces:**
- Consumes: existing PortalEntity.lock and GameState.itemIds/factIds.
- Produces: PortalLock as a two-variant discriminated union; movement/content validation that supports both variants.
- No later task may add a third requirement language or generic predicate.

- [ ] **Step 1: Write failing tests for the new lock union and old item behavior**

In src/game/movement.test.ts keep the existing Floor 1 sigil gate assertions and update the expected authored lock shape to include kind: 'item'.

In src/game/content.test.ts add a validator case with a reciprocal synthetic pair so the new fact-lock assertion cannot fail on portal topology first:

~~~ts
const maps = villageWith([
  {
    kind: 'portal',
    id: 'fact-locked-portal',
    tile: { x: 4, y: 3 },
    target: { mapId: 'village', tile: { x: 5, y: 3 } },
    lock: {
      kind: 'fact',
      requiresFactId: 'not-a-fact',
      lockedText: 'sealed',
      lockedFactId: 'main-missing-person-lead',
    },
  },
  {
    kind: 'portal',
    id: 'fact-locked-portal-back',
    tile: { x: 5, y: 3 },
    target: { mapId: 'village', tile: { x: 4, y: 3 } },
  },
]);
~~~

Both tiles are empty village floor. Assert the validator reports only:

~~~text
fact-locked-portal: unknown lock fact id: not-a-fact
~~~

When the union lands in Step 2, migrate **both** existing item-lock authoring sites in the same compile-safe edit:

- add kind: 'item' to floor1-front-to-floor2 in src/game/content/floor1.ts;
- add kind: 'item' to the existing unknown-item-lock fixture in src/game/content.test.ts.

Keep that existing fixture's established two-error expectation (unknown item + reciprocal portal missing); do not weaken it just to make the new union compile.

Run:

~~~sh
bunx vitest run src/game/movement.test.ts src/game/content.test.ts
~~~

Expected: FAIL at compile time because PortalLock has no kind/fact variant.

- [ ] **Step 2: Replace PortalLock with the closed two-variant union**

In src/game/types.ts define:

~~~ts
export type PortalLock =
  | Readonly<{
      kind: 'item';
      requiresItemId: string;
      lockedText: string;
      lockedFactId: string;
    }>
  | Readonly<{
      kind: 'fact';
      requiresFactId: string;
      lockedText: string;
      lockedFactId: string;
    }>;
~~~

Do not put both requirement IDs on one object.

Update floor1-front-to-floor2 to:

~~~ts
lock: {
  kind: 'item',
  requiresItemId: 'tower-depth-sigil',
  lockedFactId: 'floor1-depth-seal-seen',
  lockedText: 'A crest-shaped socket seals the lower stair.',
},
~~~

- [ ] **Step 3: Evaluate the union exhaustively in movement**

Add one small local helper in src/game/movement.ts:

~~~ts
function isPortalLocked(lock: PortalLock, state: GameState): boolean {
  switch (lock.kind) {
    case 'item':
      return !state.itemIds.includes(lock.requiresItemId);
    case 'fact':
      return !state.factIds.includes(lock.requiresFactId);
  }
}
~~~

Import PortalLock as a type. In attemptMove, use:

~~~ts
if (entity.lock && isPortalLocked(entity.lock, state)) {
  const next = recordFact(state, entity.lock.lockedFactId);
  return {
    ok: true,
    state: next,
    effect: { kind: 'accessLocked', text: entity.lock.lockedText },
  };
}
~~~

There is deliberately no default/fallback branch. Adding a future PortalLock variant must create a TypeScript exhaustiveness failure instead of silently unlocking it.

Do not generalize this helper into a condition engine.

- [ ] **Step 4: Validate both lock variants exhaustively**

In validateContent, keep the shared lockedFactId validation, then switch on lock.kind with no default:

~~~ts
if (entity.lock) {
  if (!hasFact(entity.lock.lockedFactId))
    errors.push(
      `${entity.id}: unknown lock fact id: ${entity.lock.lockedFactId}`,
    );

  switch (entity.lock.kind) {
    case 'item':
      if (!knownItemIds.has(entity.lock.requiresItemId))
        errors.push(
          `${entity.id}: unknown lock item id: ${entity.lock.requiresItemId}`,
        );
      break;
    case 'fact':
      if (!hasFact(entity.lock.requiresFactId))
        errors.push(
          `${entity.id}: unknown lock fact id: ${entity.lock.requiresFactId}`,
        );
      break;
  }
}
~~~

The duplicate wording for lockedFactId vs requiresFactId is acceptable because each message names the bad ID; do not add another error taxonomy just for this union.

Keep reciprocal portal validation unchanged.

- [ ] **Step 5: Run the focused gate**

~~~sh
bun run typecheck
bunx vitest run src/game/movement.test.ts src/game/content.test.ts
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~sh
git add src/game/types.ts src/game/movement.ts src/game/content.ts src/game/content/floor1.ts src/game/movement.test.ts src/game/content.test.ts
git commit -m "refactor: support fact-gated portals"
~~~

---

## Task 2: Add final-story facts, journal states, and idempotent NPC outcome facts

**Files:**
- Modify: src/game/types.ts
- Modify: src/game/content/facts.ts
- Modify: src/game/dialogue.ts
- Modify: src/game/content/dialogue.ts
- Modify: src/game/actions.ts
- Modify: src/game/dialogue.test.ts
- Modify: src/game/actions.test.ts
- Modify: src/game/journal.ts
- Modify: src/game/journal.test.ts
- Modify: src/ui/JournalPanel.ts

**Interfaces:**
- Consumes: recordFact, NpcId, DialogueLineId, current fact/item/defeated arrays.
- Produces: NpcInteractionResolution and resolveNpcInteraction; four final-story facts; five new journal lead IDs.
- The warden is the only HPA-137 interaction that returns an outcome fact.

- [ ] **Step 1: Add failing dialogue/action tests**

Add these DialogueLineId expectations:

- warden-restoration-ending;
- warden-restoration-ending-ledger;
- scribe-final-ledger-read.

Add a pure result type expectation:

~~~ts
type NpcInteractionResolution = Readonly<{
  lineId: DialogueLineId;
  factId?: string;
}>;
~~~

Pin the warden matrix:

~~~ts
const coreState = {
  ...createInitialGameState(),
  itemIds: ['tower-restoration-core'],
};

expect(resolveNpcInteraction('village-warden', coreState)).toEqual({
  lineId: 'warden-restoration-ending',
  factId: 'main-village-restored',
});

expect(
  resolveNpcInteraction('village-warden', {
    ...coreState,
    factIds: ['floor3-keeper-final-record-read'],
  }),
).toEqual({
  lineId: 'warden-restoration-ending-ledger',
  factId: 'main-village-restored',
});
~~~

In actions.test.ts bump the real village warden from a state carrying tower-restoration-core and assert main-village-restored appears exactly once after two interactions.

Run:

~~~sh
bunx vitest run src/game/dialogue.test.ts src/game/actions.test.ts
~~~

Expected: FAIL because resolveNpcInteraction and the new facts/line IDs do not exist.

- [ ] **Step 2: Register only the four HPA-137 facts**

In src/game/content/facts.ts add:

~~~ts
'floor2-depth-seal-seen': {
  note: 'A lower seal remains closed until the missing subject returns with the keeper warning.',
},
'floor2-depth-stairs-used': {
  note: 'The sealed lower stair reaches Floor 3.',
},
'floor3-keeper-final-record-read': {
  note: 'The final keeper record says the paired releases isolated a failed guardian control state while the tower continued feeding the village system.',
},
'main-village-restored': {},
~~~

Do not add a boss-defeated fact or a core-recovered fact; those remain derived from defeatedEnemyIds and itemIds.

- [ ] **Step 3: Replace line-only dialogue resolution with interaction resolution**

In src/game/types.ts export NpcInteractionResolution.

Rename resolveNpcDialogue to resolveNpcInteraction in src/game/dialogue.ts and all imports/tests.

Every existing case returns { lineId } except the warden ending branch.

Warden precedence:

~~~ts
case 'village-warden':
  if (state.itemIds.includes('tower-restoration-core')) {
    return {
      lineId: state.factIds.includes('floor3-keeper-final-record-read')
        ? 'warden-restoration-ending-ledger'
        : 'warden-restoration-ending',
      factId: 'main-village-restored',
    };
  }
  if (state.factIds.includes('main-subject-returned'))
    return { lineId: 'warden-subject-returned' };
  return {
    lineId: state.itemIds.includes('tower-depth-sigil')
      ? 'warden-sigil-found'
      : 'warden-main-lead',
  };
~~~

Scribe precedence starts with floor3-keeper-final-record-read -> scribe-final-ledger-read, then keeps the current Floor 2/fragment/default branches.

- [ ] **Step 4: Apply the optional outcome fact inside NPC actions**

In interactWithEntity's npc case:

~~~ts
const introduced = recordFact(state, entity.introFactId);
const interaction = resolveNpcInteraction(entity.id, introduced);
const next = interaction.factId
  ? recordFact(introduced, interaction.factId)
  : introduced;

return {
  ok: true,
  state: next,
  effect: {
    kind: 'dialogue',
    speaker: entity.name,
    lineId: interaction.lineId,
  },
};
~~~

recordFact already provides exact-once semantics. Do not add a new dedupe path.

- [ ] **Step 5: Add concise ending/ledger prose**

In src/game/content/dialogue.ts add:

~~~ts
'warden-restoration-ending':
  'The Restoration Core can restart the tower flow that keeps our village supplied. The guardian lock is broken; we can restore the system at last.',
'warden-restoration-ending-ledger':
  'The Restoration Core can restart the village supply. The keeper record explains the failure too: the paired releases isolated a guardian control fault, but the isolation was never cleared. We can restore the system with the truth intact.',
'scribe-final-ledger-read':
  'That final record closes the ledger. The guardians were trapped in an emergency isolation state, and the village kept depending on the same system they were defending.',
~~~

Keep the ending short; do not add a cutscene data model.

- [ ] **Step 6: Write failing journal tests for every final-state transition**

Add LeadId values:

- reach-heart-chamber;
- claim-restoration-core;
- return-restoration-core;
- story-complete;
- ledger-resolved.

Pin main precedence:

~~~ts
expect(main({ factIds: ['main-subject-returned'] })).toBe('investigate-deeper');
expect(main({ factIds: ['main-subject-returned', 'floor2-depth-stairs-used'] })).toBe('reach-heart-chamber');
expect(main({
  factIds: ['main-subject-returned', 'floor2-depth-stairs-used'],
  defeatedEnemyIds: ['floor3-core-guardian'],
})).toBe('claim-restoration-core');
expect(main({
  itemIds: ['tower-restoration-core'],
})).toBe('return-restoration-core');
expect(main({
  itemIds: ['tower-restoration-core'],
  factIds: ['main-village-restored'],
})).toBe('story-complete');
~~~

Use full GameState object spreads in the actual test helper so types stay honest.

Pin the optional-order case: floor3-keeper-final-record-read + optional-ledger-lead resolves ledger even if the Floor 2 evidence or scribe conversation happened earlier/later.

- [ ] **Step 7: Implement journal precedence and UI copy**

In mainLead, add the new checks above existing HPA-146 logic in this order:

1. main-village-restored;
2. tower-restoration-core item;
3. floor3-core-guardian defeated;
4. floor2-depth-stairs-used;
5. existing main-subject-returned and earlier checks.

In optionalEntries, ledger-resolved wins over ledger-follow-deeper-record.

Add exact JournalPanel text:

~~~ts
'reach-heart-chamber': 'Floor 3 is open. Follow the paired routes toward the tower heart.',
'claim-restoration-core': 'The core guardian is defeated. Recover the Restoration Core.',
'return-restoration-core': 'Bring the Restoration Core back to the village warden.',
'story-complete': 'The Restoration Core is back in the village. The tower can be restored.',
'ledger-resolved': 'The final keeper record explains the guardian isolation failure.',
~~~

- [ ] **Step 8: Run the read-model gate**

~~~sh
bun run typecheck
bunx vitest run src/game/dialogue.test.ts src/game/actions.test.ts src/game/journal.test.ts
~~~

Expected: PASS.

- [ ] **Step 9: Commit**

~~~sh
git add src/game/types.ts src/game/content/facts.ts src/game/dialogue.ts src/game/content/dialogue.ts src/game/actions.ts src/game/dialogue.test.ts src/game/actions.test.ts src/game/journal.ts src/game/journal.test.ts src/ui/JournalPanel.ts
git commit -m "feat: add final story read models"
~~~

---

## Task 3: Author Floor 3, the story gate, boss chamber, optional evidence, and shortcut

**Files:**
- Create: src/game/content/floor3.ts
- Modify: src/game/types.ts
- Modify: src/game/content.ts
- Modify: src/game/content/floor2.ts
- Modify: src/game/content.test.ts
- Modify: src/phaser/assets.ts
- Modify: src/phaser/assets.test.ts

**Interfaces:**
- Consumes: PortalLock fact variant, existing Entity union, runtime blocking helpers, existing HPA-22 asset IDs.
- Produces: MapId floor3, MAPS.floor3, reciprocal floor2-depth-to-floor3/floor3-to-floor2 portals, all authored HPA-137 entity IDs.
- Later tasks rely on floor3-core-guardian, floor3-restoration-core, floor3-heart-shortcut, floor3-heart-waystone, and floor3-keeper-final-record.

- [ ] **Step 1: Add failing map/asset/topology tests before registering Floor 3**

Update the authored-map expectation to:

~~~ts
expect(Object.keys(MAPS).sort()).toEqual([
  'floor1',
  'floor2',
  'floor3',
  'village',
]);
~~~

Add assertions that resolveTerrainAssets('floor3') returns the same dungeon floor/wall pair as Floors 1–2.

Add lookups for the required IDs listed in Interfaces.

Run:

~~~sh
bun run typecheck
bunx vitest run src/game/content.test.ts src/phaser/assets.test.ts
~~~

Expected: FAIL because floor3 is not a MapId/MAPS entry.

- [ ] **Step 2: Add MapId/registry/terrain support in one compile-safe change**

Change MapId to:

~~~ts
export type MapId = 'village' | 'floor1' | 'floor2' | 'floor3';
~~~

Import floor3 into src/game/content.ts and register:

~~~ts
export const MAPS: Record<MapId, MapDefinition> = {
  village,
  floor1,
  floor2,
  floor3,
};
~~~

Add floor3 to TERRAIN_BY_MAP with terrain-dungeon-floor / terrain-dungeon-wall.

Create src/game/content/floor3.ts in the same commit so Record exhaustiveness never breaks.

- [ ] **Step 3: Author the exact Floor 3 layout skeleton**

Use this 22x15 layout:

~~~ts
layout: [
  '######################',
  '##########.###########',
  '##########.###########',
  '######..........######',
  '######..........######',
  '##.###.###.####.###.##',
  '##..##.###.####.##..##',
  '##...#.###.####.#...##',
  '##.....###.####.....##',
  '##.#...###.####...#.##',
  '##...#.###.####.#...##',
  '####...###.####...####',
  '######..........######',
  '##########.###########',
  '######################',
],
~~~

The interior wall ribs deliberately make Floor 3 more corridor-heavy than Floor 2 while preserving the same two main spines and all pinned entity coordinates. Do not simplify the side wings back into open 5x6 rooms.

This shape intentionally creates:

- one entry tile at (10,13);
- two side routes from row 12 to the Heart Approach;
- a blocked central shortcut column at x=10;
- side pockets at (2,5) and (19,5);
- one narrow boss/core corridor at x=10,y=1..2.

Sections:

~~~ts
[
  { id: 'floor3-entry-vestibule', name: 'Entry Vestibule',
    bounds: { minX: 8, maxX: 12, minY: 12, maxY: 13 } },
  { id: 'floor3-twin-galleries', name: 'Twin Galleries',
    bounds: { minX: 2, maxX: 19, minY: 5, maxY: 12 } },
  { id: 'floor3-keeper-archive', name: 'Keeper Archive',
    bounds: { minX: 16, maxX: 19, minY: 5, maxY: 8 } },
  { id: 'floor3-hidden-vault', name: 'Hidden Vault',
    bounds: { minX: 2, maxX: 5, minY: 5, maxY: 8 } },
  { id: 'floor3-heart-approach', name: 'Heart Approach',
    bounds: { minX: 6, maxX: 15, minY: 3, maxY: 4 } },
  { id: 'floor3-heart-chamber', name: 'Heart Chamber',
    bounds: { minX: 10, maxX: 10, minY: 1, maxY: 2 } },
]
~~~

Overlaps are intentional and legal; every floor tile must remain section-covered.

- [ ] **Step 4: Add the reciprocal Floor 2 story gate**

In floor2.ts add:

~~~ts
{
  kind: 'portal',
  id: 'floor2-depth-to-floor3',
  tile: { x: 8, y: 1 },
  assetId: 'stairs-down',
  target: { mapId: 'floor3', tile: { x: 10, y: 13 } },
  factId: 'floor2-depth-stairs-used',
  lock: {
    kind: 'fact',
    requiresFactId: 'main-subject-returned',
    lockedFactId: 'floor2-depth-seal-seen',
    lockedText: 'The lower keeper seal will not release until the missing subject returns with the warning from below.',
  },
},
~~~

In floor3.ts add:

~~~ts
{
  kind: 'portal',
  id: 'floor3-to-floor2',
  tile: { x: 10, y: 13 },
  assetId: 'stairs-up',
  target: { mapId: 'floor2', tile: { x: 8, y: 1 } },
},
~~~

Add a movement regression using the real Floor 2 portal:

- without main-subject-returned: no travel, floor2-depth-seal-seen recorded, main-subject-returned still absent;
- with main-subject-returned: travel to floor3 (10,13), floor2-depth-stairs-used recorded.

This test owns the first Review Focus line.

- [ ] **Step 5: Author the Floor 3 entities**

Add these exact required entities:

~~~ts
{
  kind: 'latch',
  id: 'floor3-heart-shortcut',
  tile: { x: 10, y: 8 },
  rearSide: 'north',
},
{
  kind: 'recovery',
  id: 'floor3-heart-waystone',
  tile: { x: 11, y: 3 },
},
{
  kind: 'clue',
  id: 'floor3-heart-lockdown-record',
  tile: { x: 9, y: 3 },
  assetId: 'clue-runes',
  text: 'The keeper etched one final warning: the guardian lattice is still defending an isolation state. Break the stalled guardian, recover the Restoration Core, and return it to the village before the tower flow fails completely.',
},
{
  kind: 'clue',
  id: 'floor3-keeper-final-record',
  tile: { x: 18, y: 7 },
  assetId: 'clue-runes',
  text: 'Final keeper record: the paired releases isolated a guardian control fault. The isolation held, but nobody returned to clear it; the same tower flow continued feeding the village until the core began to fail.',
  factId: 'floor3-keeper-final-record-read',
},
{
  kind: 'clue',
  id: 'floor3-vault-route-mark',
  tile: { x: 3, y: 7 },
  assetId: 'clue-runes',
  text: 'The old route scratches repeat here, but one mark turns back toward the northwest wall instead of the tower heart.',
},
{
  kind: 'enemy',
  id: 'floor3-archive-sentry',
  tile: { x: 19, y: 6 },
  assetId: 'enemy-ruin-guard',
  stats: { hp: 24, attack: 7, defense: 4 },
},
{
  kind: 'enemy',
  id: 'floor3-vault-sentry',
  tile: { x: 2, y: 6 },
  assetId: 'enemy-ruin-guard',
  stats: { hp: 28, attack: 7, defense: 5 },
},
{
  kind: 'reward',
  id: 'floor3-hidden-vault-cache',
  tile: { x: 2, y: 5 },
  assetId: 'chest-relic-closed',
  grant: 'stat',
  stat: 'defense',
  amount: 2,
},
{
  kind: 'enemy',
  id: 'floor3-core-guardian',
  tile: { x: 10, y: 2 },
  assetId: 'enemy-ruin-guard',
  stats: { hp: 36, attack: 7, defense: 4 },
},
{
  kind: 'reward',
  id: 'floor3-restoration-core',
  tile: { x: 10, y: 1 },
  assetId: 'chest-relic-closed',
  grant: 'item',
  itemId: 'tower-restoration-core',
  label: 'Restoration Core',
},
~~~

The two ordinary enemies are optional side pressure. They must not occupy x=6 or x=15, the two mandatory side-route spines.

- [ ] **Step 6: Prove the topology through the shared runtime blocking rule**

Add these Floor 3 assertions **inside the existing describe('authored content') block** in src/game/content.test.ts. The tileKey, floodFloor, hasAdjacentApproach, portal, and latch helpers are scoped to that describe; reuse them there rather than copying them into a new top-level Floor 3 describe.

Create a required Floor 3 state:

~~~ts
const freshFloor3 = {
  ...createInitialGameState(),
  mapId: 'floor3' as const,
  factIds: ['main-subject-returned', 'floor2-depth-stairs-used'],
};
~~~

With floor3-heart-shortcut closed, optional enemies undefeated, and all rewards unopened:

- start at floor3-to-floor2.tile;
- assert the west spine reaches (6,4);
- assert the east spine reaches (15,4);
- assert an adjacent approach exists for floor3-keeper-final-record;
- assert an adjacent approach exists for floor3-vault-route-mark;
- assert the Hidden Vault section excludes the west main spine x=6 and the Keeper Archive section excludes the east main spine x=15;
- assert floor3-vault-route-mark lies west of x=6 and floor3-keeper-final-record lies east of x=15, so neither optional clue sits on a main spine;
- assert tileInDirection(shortcut.tile, shortcut.rearSide) is reachable;
- import directionFromTo beside tileInDirection and assert directionFromTo(waystone.tile, { x: 10, y: 3 }) is not null;
- assert an adjacent approach exists for floor3-core-guardian;
- assert hasAdjacentApproach(reachable, floor3-restoration-core.tile) is false while the boss is active.

Then set defeatedEnemyIds: ['floor3-core-guardian'] and assert the boss tile is reachable and hasAdjacentApproach(reachableAfter, floor3-restoration-core.tile) is true.

Do not assert that the Core reward tile itself is in the flood: unopened rewards are blocking by design, so that assertion would be vacuous.

Do not build a second pathfinder.

- [ ] **Step 7: Run content and asset tests**

~~~sh
bun run typecheck
bunx vitest run src/game/content.test.ts src/game/movement.test.ts src/phaser/assets.test.ts
~~~

Expected: PASS.

- [ ] **Step 8: Commit**

~~~sh
git add src/game/types.ts src/game/content.ts src/game/content/floor2.ts src/game/content/floor3.ts src/game/content.test.ts src/game/movement.test.ts src/phaser/assets.ts src/phaser/assets.test.ts
git commit -m "feat: author floor three finale"
~~~

---

## Task 4: Prove boss viability, exact-once core progression, ending persistence, and dynamic save occupancy

**Files:**
- Modify: src/game/combat.test.ts
- Modify: src/game/actions.test.ts
- Modify: src/game/save.test.ts
- Modify: src/game/journal.test.ts
- Modify: src/game/dialogue.test.ts

**Interfaces:**
- Consumes: the real Floor 3 authored entities from Task 3 and final read models from Task 2.
- Produces: executable proof for HPA-137 acceptance criteria; no production API.

- [ ] **Step 1: Pin the exact boss preview against baseline required stats**

Fetch the real floor3-core-guardian with findEntityById and call previewCombat using createInitialGameState().player.

Assert:

~~~ts
expect(previewCombat(createInitialGameState().player, boss.stats)).toEqual({
  winnable: true,
  hitsNeeded: 6,
  hpLoss: 25,
});
~~~

Also assert the floor3-heart-waystone exists and Task 3 proves it is cardinally adjacent to the sole boss approach at (10,3). This is the structural guarantee that a full heal is always available immediately before combat without putting a blocking RecoveryEntity on the corridor.

Run:

~~~sh
bunx vitest run src/game/combat.test.ts src/game/content.test.ts
~~~

Expected: PASS.

- [ ] **Step 2: Prove boss resolution remains the ordinary combat path**

Using a full-health baseline Floor 3 state, call interactWithEntity on floor3-core-guardian and assert combatPrompt.preview equals the pure preview above.

Then call resolveCombat and assert:

- player HP becomes 5;
- defeatedEnemyIds contains floor3-core-guardian once;
- a second resolution with the defeated ID changes no state and reports hpLost: 0.

Do not add a boss branch to combat.ts.

- [ ] **Step 3: Prove the Restoration Core reward is exact-once**

Interact with floor3-restoration-core from a state whose defeatedEnemyIds contains floor3-core-guardian.

First claim must produce:

~~~ts
{
  kind: 'itemReward',
  itemId: 'tower-restoration-core',
  label: 'Restoration Core',
}
~~~

and add both floor3-restoration-core to openedRewardIds and tower-restoration-core to itemIds.

Second direct interaction must return reward-already-taken.

- [ ] **Step 4: Pin dynamic save occupancy before and after completion**

Add save fixtures for Floor 3:

1. mapId floor3, tile boss tile, boss undefeated -> invalid-content;
2. same tile with floor3-core-guardian defeated -> loaded;
3. tile Restoration Core chest, reward unopened -> invalid-content;
4. same tile with floor3-restoration-core opened and tower-restoration-core carried -> loaded.

Use the actual entity tiles, not copied coordinates.

- [ ] **Step 5: Pin ending persistence and optional-order behavior**

Use the real village warden with a state carrying tower-restoration-core.

Standard ending path:

- no final ledger fact -> warden-restoration-ending;
- resulting state contains main-village-restored once;
- serialize/reload -> main-village-restored remains and buildJournalView.main.lead is story-complete.

Expanded path:

- add floor3-keeper-final-record-read before talking to warden;
- line becomes warden-restoration-ending-ledger;
- completion fact is still the same main-village-restored;
- no second ending flag exists.

Optional-order path:

- start with floor3-keeper-final-record-read before optional-ledger-lead;
- later add optional-ledger-lead;
- journal ledger lead is ledger-resolved and scribe uses scribe-final-ledger-read.

- [ ] **Step 6: Run the progression/save gate**

~~~sh
bun run typecheck
bunx vitest run src/game/combat.test.ts src/game/actions.test.ts src/game/save.test.ts src/game/journal.test.ts src/game/dialogue.test.ts
~~~

Expected: PASS.

- [ ] **Step 7: Commit**

~~~sh
git add src/game/combat.test.ts src/game/actions.test.ts src/game/save.test.ts src/game/journal.test.ts src/game/dialogue.test.ts
git commit -m "test: prove floor three completion state"
~~~

---

## Task 5: Extend the single fresh-save browser journey through the MVP ending

**Files:**
- Modify: tests/e2e/cross-floor.spec.ts

**Interfaces:**
- Consumes: the complete HPA-137 production behavior.
- Produces: one real-browser proof that a fresh save can reach Floor 3, defeat the boss, recover the core, persist, return home, and finish the story.

- [ ] **Step 1: Continue the existing journey instead of adding another full harness**

Keep the current test name and its HPA-146 path. Continue immediately after the existing village-returned-subject dialogue checkpoint.

Do not clone the entire village/Floor 1/Floor 2 setup into a second Playwright test.

- [ ] **Step 2: Re-enter Floor 2 with counted presses and prove the story gate is now open**

The existing HPA-146 journey ends at village (6,8) after bumping village-returned-subject. Re-enter the tower exactly:

~~~ts
// Village (6,8) -> village-to-floor1 (11,2) -> Floor 1 (2,14)
await press(page, 'ArrowRight', 1);
await press(page, 'ArrowUp', 3);
await press(page, 'ArrowRight', 2);
await press(page, 'ArrowUp', 2);
await press(page, 'ArrowRight', 2);
await press(page, 'ArrowUp', 1);

// Floor 1 (2,14) -> front Floor-2 stair (9,2) -> Floor 2 (8,10)
await press(page, 'ArrowUp', 2);
await press(page, 'ArrowRight', 1);
await press(page, 'ArrowUp', 8);
await press(page, 'ArrowRight', 3);
await press(page, 'ArrowUp', 2);
await press(page, 'ArrowRight', 3);

// Floor 2 central column -> depth stair (8,1) -> Floor 3 (10,13)
await press(page, 'ArrowUp', 9);
~~~

At floor2-depth-to-floor3:

- assert the travel succeeds because main-subject-returned is already durable;
- assert map-name data-map-id becomes floor3;
- assert floor3-entry-vestibule is discovered;
- assert the journal main lead becomes reach-heart-chamber.

The early-locked branch is already covered in Task 3 unit/movement tests; do not replay a second browser timeline.

- [ ] **Step 3: Walk the pinned west-spine route and open the shortcut from the rear**

From floor3-to-floor2 at (10,13), use this exact counted walk:

~~~ts
// Up: Entry Vestibule portal tile (10,13) -> Twin Galleries row (10,12)
await press(page, 'ArrowUp', 1);

// Left x4: move to the west spine at (6,12)
await press(page, 'ArrowLeft', 4);

// Up x8: follow the unobstructed west spine to Heart Approach (6,4)
await press(page, 'ArrowUp', 8);
await expect(
  page.locator('[data-section="floor3-heart-approach"]'),
).toHaveCount(1);

// The heart clue at (9,3) blocks a straight row-3 crossing,
// so dogleg through (8,4) before returning to the center column.
// Up -> (6,3), Right x2 -> (8,3), Down -> (8,4),
// Right x2 -> (10,4), Down x3 -> (10,7).
await press(page, 'ArrowUp', 1);
await press(page, 'ArrowRight', 2);
await press(page, 'ArrowDown', 1);
await press(page, 'ArrowRight', 2);
await press(page, 'ArrowDown', 3);

// Down: bump floor3-heart-shortcut (10,8) from rearSide=north
await press(page, 'ArrowDown', 1);
await expect(page.getByTestId('effect')).toHaveAttribute(
  'data-effect',
  'latchOpened',
);

// Down x2 crosses the opened latch to (10,9); Up x2 proves it is now two-way
await press(page, 'ArrowDown', 2);
await press(page, 'ArrowUp', 2);
await expect(page.getByTestId('blocked-reason')).toHaveCount(0);
~~~

The west route is intentionally independent of floor3-vault-sentry at (2,6). If the authored layout changes, update these counts in the same content change rather than turning the e2e into route-search logic.

- [ ] **Step 4: Heal, preview, and defeat the boss with counted presses**

After Step 3 the player is back at (10,7). The moved waystone is one bump from the only boss approach:

~~~ts
// Up x4 -> sole boss approach (10,3)
await press(page, 'ArrowUp', 4);

// Right: bump floor3-heart-waystone (11,3), staying at (10,3)
await press(page, 'ArrowRight', 1);
await expect(page.getByTestId('effect')).toHaveAttribute(
  'data-effect',
  'healed',
);
~~~

Assert HUD HP equals max HP after the heal.

Then:

~~~ts
// Up: bump core guardian (10,2) from the sole approach
await press(page, 'ArrowUp', 1);
~~~

Assert the combat prompt shows the HP loss calculated from the journey's **actual** current stats, then click Fight.

Assert:

- enemyDefeated effect;
- the player remains alive;
- one Up moves onto the former boss tile (10,2) without blocking.

Do not hardcode 25 HP loss in Playwright because the existing journey already collects optional Floor 1 rewards; Task 4 owns the baseline 25-loss contract.

- [ ] **Step 5: Claim the Restoration Core and reload once**

After stepping onto the defeated boss tile (10,2), press Up once to bump floor3-restoration-core at (10,1). Assert itemReward text contains Restoration Core.

Assert the main lead becomes return-restoration-core.

Reload the page and assert:

- map remains floor3;
- the boss tile stays traversable;
- the core chest stays opened/non-blocking;
- floor3-heart-shortcut remains open;
- return-restoration-core remains visible.

This is the HPA-137 persistence checkpoint.

- [ ] **Step 6: Return through the existing floor chain with counted presses and finish at the warden**

After the HPA-137 reload, the player is at (10,2). Return exactly:

~~~ts
// Floor 3 (10,2) -> opened center shortcut -> floor3-to-floor2 (10,13)
// The 11th Down steps on the portal and arrives at Floor 2 (8,1).
await press(page, 'ArrowDown', 11);

// Floor 2 Rear Gallery -> floor2-rear-to-floor1 (16,1) -> Floor 1 (21,3)
await press(page, 'ArrowRight', 8);

// Floor 1 rear wing -> opened rear latch -> village portal (2,14)
await press(page, 'ArrowDown', 1);
await press(page, 'ArrowLeft', 8);
await press(page, 'ArrowDown', 4);
await press(page, 'ArrowLeft', 3);
await press(page, 'ArrowDown', 1);
await press(page, 'ArrowLeft', 3);
await press(page, 'ArrowDown', 1);
await press(page, 'ArrowLeft', 4);
await press(page, 'ArrowDown', 4);
await press(page, 'ArrowLeft', 1);

// Village arrival is (11,2). Route around the standing NPCs to (4,7).
await press(page, 'ArrowDown', 3);
await press(page, 'ArrowLeft', 3);
await press(page, 'ArrowDown', 1);
await press(page, 'ArrowLeft', 3);
await press(page, 'ArrowDown', 1);
await press(page, 'ArrowLeft', 1);

// Left: bump village-warden at (3,7)
await press(page, 'ArrowLeft', 1);
~~~

Assert:

- effect data-effect=dialogue;
- dialogue contains Restoration Core;
- journal has data-lead=story-complete.

Reload in the village and assert story-complete still renders. This proves the ending fact persisted rather than being transient dialogue state.

- [ ] **Step 7: Run the browser test**

~~~sh
bun run test:e2e
~~~

Expected: all Playwright tests PASS.

- [ ] **Step 8: Commit**

~~~sh
git add tests/e2e/cross-floor.spec.ts
git commit -m "test: complete the fresh-save mvp journey"
~~~

---

## Task 6: Final CI-equivalent verification and plan bookkeeping

**Files:**
- Modify: docs/superpowers/plans/2026-09-20-hpa-137-floor3-boss-ending.md

**Interfaces:**
- Consumes: all completed tasks.
- Produces: a verified branch with the plan checkboxes/status updated; no new gameplay behavior.

- [ ] **Step 1: Run the full local CI-equivalent gate**

~~~sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run build
bun run test:unit
bun run test:e2e
~~~

Expected: every command exits 0.

- [ ] **Step 2: Re-read the HPA-137 acceptance criteria against the branch**

Verify explicitly, keeping the required-only and browser evidence separate:

- **Unit/content proof of required-path viability:** full baseline HP 30 / ATK 10 / DEF 2 previews floor3-core-guardian at 6 hits / 25 HP loss; the sole boss approach is one bump from the recovery waystone; the Floor 3 fact lock works; the ending fact is idempotent; final ledger evidence resolves even when discovered before the scribe.
- **Single browser proof:** the existing fresh-save Playwright journey reaches data-lead="story-complete". It may keep the optional Floor 1/Floor 2 rewards already exercised by that journey; it is not the proof that optionals are unnecessary.
- Floor 3 has two route spines, a permanent shortcut, and optional hidden vault.
- Boss uses unchanged preview/resolution.
- Final ledger evidence resolves the optional thread.
- Expanded ending uses the same main-village-restored fact.
- Boss/core/shortcut/ending survive reload.
- No new GameState field, save migration, combat subsystem, quest engine, or art asset exists.
- Do **not** add a second Playwright playthrough to prove required-only viability; the unit/content proof above owns that acceptance condition.

- [ ] **Step 3: Mark completed plan checkboxes/status only after verification**

Update this plan's checkboxes to reflect actual completed work and add a short status note at the top naming the verified commit.

Do not rewrite the design after implementation unless a real design contract changed.

- [ ] **Step 4: Commit bookkeeping**

~~~sh
git add docs/superpowers/plans/2026-09-20-hpa-137-floor3-boss-ending.md
git commit -m "docs: complete hpa-137 implementation plan"
~~~

- [ ] **Step 5: Keep the implementation on this PR**

Do not open a follow-up implementation PR for HPA-137. If unique Floor 3/boss art is desired after gameplay review, create a separate art ticket because asset generation is intentionally outside this coding PR.
