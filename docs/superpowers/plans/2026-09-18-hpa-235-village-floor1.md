# HPA-235 Complete Village and Floor 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Complete the starting village and Floor 1 with fact-driven quests/journal notes, a reusable Floor-2 access item, authored exploration content, and persisted discovery while retaining the HPA-237 rear-route regression loop.

**Architecture:** Extend the existing pure TypeScript domain with three durable arrays: item IDs, fact IDs, and discovered section IDs. NPC dialogue and journal/map notes are pure derived read models; movement/interactions explicitly record authored facts and section discovery. Phaser remains presentation-only, the DOM overlay renders the derived journal, and the existing single LocalStorage snapshot remains the only persistence boundary.

**Tech Stack:** Bun 1.4.x, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, Vite 8, framework-free DOM UI.

**Spec:** docs/superpowers/specs/2026-09-18-hpa-235-village-floor1-design.md

## Global Constraints

- One ticket = one PR. Continue implementation on this same HPA-235 branch/PR.
- Do not add a generic quest engine, event DSL, branching narrative engine, inventory UI, UI framework, or second durable state owner.
- Do not add consumable keys in HPA-235.
- Do not add save versioning or migrations; old development snapshots may become invalid and use the existing explicit reset flow.
- Do not generate new image art in this ticket. Reuse the HPA-22 asset catalog. Any genuinely required new image work becomes a separate art ticket/PR.
- Keep Floor 2 limited to the already-shipped connector; only update reciprocal target coordinates required by the new Floor-1 layout.
- Required Floor-2 access must not depend on optional quest progress or optional treasure.

---

## File Map

Create:

- src/game/progress.ts — idempotent fact/item recording plus section discovery.
- src/game/progress.test.ts — progress helper coverage.
- src/game/dialogue.ts — explicit NPC dialogue resolver.
- src/game/dialogue.test.ts — first/follow-up and early-discovery dialogue tests.
- src/game/journal.ts — derived main/optional leads and map notes.
- src/game/journal.test.ts — early discovery and journal derivation tests.
- src/ui/JournalPanel.ts — framework-free journal markup renderer.

Modify:

- src/game/types.ts — NpcEntity, MapSection, item reward union, portal access metadata, durable state/effects.
- src/game/state.ts / state.test.ts — initialize new arrays and starting section.
- src/game/content.ts / content.test.ts — section helpers/validation and known fact/item discovery.
- src/game/content/village.ts — complete compact hub and four NPCs.
- src/game/content/floor1.ts — complete Floor-1 maze/content.
- src/game/content/floor2.ts — reciprocal portal targets only.
- src/game/actions.ts / actions.test.ts — NPC/fact/item reward behavior.
- src/game/movement.ts / movement.test.ts — section discovery and reusable-item portal gate.
- src/game/save.ts / save.test.ts — new durable fields and content validation.
- src/ui/InteractionOverlay.ts — dialogue/item/access effects plus JournalPanel.
- src/main.ts — pass derived JournalView into overlay.
- src/styles.css — compact journal layout.
- tests/e2e/cross-floor.spec.ts — replace coordinate assumptions with the HPA-235 authored journey while keeping HPA-237 rear-loop coverage.

---

### Task 1: Add durable fact, item, and section contracts

**Files:**

- Modify: src/game/types.ts
- Modify: src/game/state.ts
- Modify: src/game/state.test.ts
- Create: src/game/progress.ts
- Create: src/game/progress.test.ts
- Modify: src/game/content.ts
- Modify: src/game/content.test.ts

**Interfaces:**

- Produces GameState.itemIds, factIds, discoveredSectionIds.
- Produces MapSection and MapDefinition.sections.
- Produces recordFact(state, id), recordFacts(state, ids), addItem(state, id), discoverCurrentSection(state).
- Produces findSectionById(id), collectKnownFactIds(), findItemRewardByItemId(itemId).

- [ ] **Step 1: Write failing state/progress tests**

Add these expectations:

~~~ts
it('starts with empty facts/items and the village square discovered', () => {
  expect(createInitialGameState()).toMatchObject({
    itemIds: [],
    factIds: [],
    discoveredSectionIds: ['village-square'],
  });
});

it('records a fact and item once without creating duplicate state', () => {
  const start = createInitialGameState();
  const withFact = recordFact(start, 'optional-route-lead');
  expect(withFact.factIds).toEqual(['optional-route-lead']);
  expect(recordFact(withFact, 'optional-route-lead')).toBe(withFact);

  const withItem = addItem(withFact, 'tower-depth-sigil');
  expect(withItem.itemIds).toEqual(['tower-depth-sigil']);
  expect(addItem(withItem, 'tower-depth-sigil')).toBe(withItem);
});
~~~

Run:

~~~bash
bunx vitest run src/game/state.test.ts src/game/progress.test.ts
~~~

Expected: FAIL because the new fields/helpers do not exist.

- [ ] **Step 2: Extend the closed types**

In src/game/types.ts add:

~~~ts
export type MapSection = Readonly<{
  id: string;
  name: string;
  bounds: Readonly<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>;
  factIds?: readonly string[];
}>;

export type NpcEntity = BaseEntity &
  Readonly<{
    kind: 'npc';
    name: string;
    introFactId: string;
  }>;

export type RewardEntity =
  | (BaseEntity &
      Readonly<{ kind: 'reward'; stat: Stat; amount: number }>)
  | (BaseEntity &
      Readonly<{ kind: 'reward'; itemId: string; label: string }>);

export type PortalEntity = BaseEntity &
  Readonly<{
    kind: 'portal';
    target: Readonly<{ mapId: MapId; tile: Tile }>;
    factId?: string;
    requiresItemId?: string;
    lockedText?: string;
    lockedFactId?: string;
  }>;
~~~

Add NpcEntity to Entity, add sections to MapDefinition, and append these durable fields to GameState:

~~~ts
itemIds: readonly string[];
factIds: readonly string[];
discoveredSectionIds: readonly string[];
~~~

Add these ActionEffect variants:

~~~ts
| { kind: 'dialogue'; speaker: string; text: string }
| { kind: 'itemReward'; itemId: string; label: string }
| { kind: 'accessLocked'; text: string }
~~~

Keep the existing stat reward effect named reward.

- [ ] **Step 3: Initialize the new state**

src/game/state.ts:

~~~ts
export function createInitialGameState(): GameState {
  return {
    mapId: 'village',
    tile: { x: 2, y: 8 },
    player: { hp: 30, maxHp: 30, attack: 10, defense: 2 },
    openedRewardIds: [],
    defeatedEnemyIds: [],
    openedShortcutIds: [],
    itemIds: [],
    factIds: [],
    discoveredSectionIds: ['village-square'],
  };
}
~~~

- [ ] **Step 4: Implement progress helpers**

src/game/progress.ts:

~~~ts
import { MAPS } from './content';
import type { GameState } from './types';

export function recordFact(state: GameState, id: string): GameState {
  if (state.factIds.includes(id)) return state;
  return { ...state, factIds: [...state.factIds, id] };
}

export function recordFacts(
  state: GameState,
  ids: readonly string[],
): GameState {
  return ids.reduce(recordFact, state);
}

export function addItem(state: GameState, id: string): GameState {
  if (state.itemIds.includes(id)) return state;
  return { ...state, itemIds: [...state.itemIds, id] };
}

export function discoverCurrentSection(state: GameState): GameState {
  const sections = MAPS[state.mapId].sections.filter(
    ({ bounds }) =>
      state.tile.x >= bounds.minX &&
      state.tile.x <= bounds.maxX &&
      state.tile.y >= bounds.minY &&
      state.tile.y <= bounds.maxY,
  );

  let next = state;
  for (const section of sections) {
    if (!next.discoveredSectionIds.includes(section.id)) {
      next = {
        ...next,
        discoveredSectionIds: [...next.discoveredSectionIds, section.id],
      };
    }
    next = recordFacts(next, section.factIds ?? []);
  }
  return next;
}
~~~

- [ ] **Step 5: Add content lookup helpers and validation**

In src/game/content.ts add:

~~~ts
export function findSectionById(id: string): MapSection | undefined {
  return Object.values(MAPS)
    .flatMap((map) => map.sections)
    .find((section) => section.id === id);
}

export function findItemRewardByItemId(
  itemId: string,
): RewardEntity | undefined {
  const entity = Object.values(MAPS)
    .flatMap((map) => map.entities)
    .find(
      (candidate) =>
        candidate.kind === 'reward' &&
        'itemId' in candidate &&
        candidate.itemId === itemId,
    );
  return entity?.kind === 'reward' && 'itemId' in entity ? entity : undefined;
}

export function collectKnownFactIds(): ReadonlySet<string> {
  const facts = new Set<string>();
  for (const map of Object.values(MAPS)) {
    for (const section of map.sections)
      for (const id of section.factIds ?? []) facts.add(id);
    for (const entity of map.entities) {
      if (entity.kind === 'npc') facts.add(entity.introFactId);
      if (entity.kind === 'clue' && entity.factId) facts.add(entity.factId);
      if (entity.kind === 'portal') {
        if (entity.factId) facts.add(entity.factId);
        if (entity.lockedFactId) facts.add(entity.lockedFactId);
      }
    }
  }
  return facts;
}
~~~

Extend validateContent to require globally unique section IDs, section bounds inside the map rectangle, portal requiresItemId values that resolve to an authored item reward, and NPC/clue/portal fact IDs to remain ordinary non-empty strings.

- [ ] **Step 6: Run Task 1 gate**

~~~bash
bunx vitest run src/game/state.test.ts src/game/progress.test.ts src/game/content.test.ts
bun run typecheck
~~~

Expected: PASS.

- [ ] **Step 7: Commit**

~~~bash
git add src/game/types.ts src/game/state.ts src/game/state.test.ts src/game/progress.ts src/game/progress.test.ts src/game/content.ts src/game/content.test.ts
git commit -m "feat: add fact-driven exploration progress"
~~~

---

### Task 2: Add explicit NPC dialogue and derived journal/map notes

**Files:**

- Create: src/game/dialogue.ts
- Create: src/game/dialogue.test.ts
- Create: src/game/journal.ts
- Create: src/game/journal.test.ts

**Interfaces:**

- Produces resolveNpcDialogue(npcId, state): string.
- Produces JournalEntry, JournalView, buildJournalView(state).

- [ ] **Step 1: Write failing dialogue tests**

Use these fixed NPC IDs and progress IDs:

~~~ts
const MAIN = 'main-missing-person-lead';
const HEIRLOOM = 'optional-heirloom-lead';
const ROUTE = 'optional-route-lead';
const LEDGER = 'optional-ledger-lead';

it('recognizes treasury evidence found before the artisan introduces the quest', () => {
  const state = {
    ...createInitialGameState(),
    factIds: ['floor1-treasury-seen'],
  };
  expect(resolveNpcDialogue('village-artisan', state)).toContain('workshop');
  const introduced = recordFact(state, HEIRLOOM);
  expect(resolveNpcDialogue('village-artisan', introduced)).toContain(
    'another entrance',
  );
});

it('recognizes an early ledger fragment', () => {
  const state = {
    ...createInitialGameState(),
    itemIds: ['ledger-fragment-1'],
    factIds: [LEDGER],
  };
  expect(resolveNpcDialogue('village-scribe', state)).toContain('fragment');
});
~~~

- [ ] **Step 2: Implement explicit dialogue resolver**

src/game/dialogue.ts uses one switch on npcId. Use these concise lines:

~~~ts
case 'village-warden':
  if (!state.factIds.includes('main-missing-person-lead'))
    return 'Our courier entered the silent tower and never returned. Find what stopped the bells.';
  if (state.itemIds.includes('tower-depth-sigil'))
    return 'That sigil matches the lower seal. The stair to the next floor should open now.';
  return 'Search the first floor for the crest that opens the lower stair.';

case 'village-artisan':
  if (!state.factIds.includes('optional-heirloom-lead'))
    return 'My family workshop was sealed inside the tower. If you glimpse it, remember where it sits.';
  if (state.factIds.includes('floor1-treasury-seen'))
    return 'That sealed treasury is the workshop. There must be another entrance from below.';
  return 'Look for a sealed workshop or treasury on the first floor.';

case 'village-scout':
  if (!state.factIds.includes('optional-route-lead'))
    return 'An old plan shows a return passage where no corridor should exist. Watch for route scratches.';
  if (state.factIds.includes('floor1-route-mark-seen'))
    return 'Those scratches match the old plan. The route probably rejoins from below.';
  return 'Inspect the upper routes for old direction marks.';

case 'village-scribe':
  if (!state.factIds.includes('optional-ledger-lead'))
    return 'The tower keeper recorded every mechanism. Bring back any ledger fragment you find.';
  if (state.itemIds.includes('ledger-fragment-1'))
    return 'This fragment mentions paired mechanisms. More pages must survive deeper in the tower.';
  return 'Search the first floor for a surviving ledger fragment.';
~~~

Throw on an unknown NPC ID; authored content/tests own the closed set.

- [ ] **Step 3: Write failing journal tests**

~~~ts
it('keeps optional quests hidden until context is learned', () => {
  const state = {
    ...createInitialGameState(),
    factIds: ['floor1-treasury-seen'],
  };
  expect(buildJournalView(state).optional).toEqual([]);
});

it('immediately interprets an early treasury discovery after quest intro', () => {
  const state = {
    ...createInitialGameState(),
    factIds: ['floor1-treasury-seen', 'optional-heirloom-lead'],
  };
  const heirloom = buildJournalView(state).optional.find(
    (entry) => entry.id === 'heirloom',
  );
  expect(heirloom?.lead).toContain('another entrance');
});

it('never exposes tile coordinates as route guidance', () => {
  const view = buildJournalView({
    ...createInitialGameState(),
    factIds: ['main-missing-person-lead', 'floor1-depth-seal-seen'],
  });
  expect(JSON.stringify(view)).not.toMatch(/\b\d+,\d+\b/);
});
~~~

- [ ] **Step 4: Implement JournalView**

Define:

~~~ts
export type JournalEntry = Readonly<{
  id: string;
  title: string;
  status: 'active' | 'complete';
  lead: string;
}>;

export type JournalView = Readonly<{
  main: JournalEntry;
  optional: readonly JournalEntry[];
  sections: readonly string[];
  observations: readonly string[];
}>;
~~~

Main lead:

- before main-missing-person-lead: Speak with the village warden near the square.
- after intro but before tower-depth-sigil: Search Floor 1 for the reusable tower sigil.
- after sigil: The sigil opens the lower stair. Descend to Floor 2.

Optional entries appear only for their intro facts:

- heirloom lead switches to The sealed workshop is visible; look for another entrance from below. when floor1-treasury-seen exists;
- route lead switches to The route scratches match the old plan; verify where the impossible connection returns. when floor1-route-mark-seen exists;
- ledger lead switches to The first fragment mentions paired mechanisms; look for later pages below. when ledger-fragment-1 exists.

Build sections by resolving discoveredSectionIds through findSectionById.

Build observations in this order when facts exist:

~~~text
village-tower-stairs-used -> Stairs connect the village and Floor 1.
floor1-depth-seal-seen -> The lower stair is sealed by a reusable tower sigil.
floor1-treasury-seen -> A sealed treasury is visible from the Upper Gallery, but Floor 1 has no entrance.
floor1-route-mark-seen -> Route scratches point toward a connection that returns from below.
floor1-depth-stairs-used -> The lower stair reaches Floor 2.
floor1-rear-stairs-used -> A second stair returns to the Rear Wing.
~~~

- [ ] **Step 5: Run Task 2 gate**

~~~bash
bunx vitest run src/game/dialogue.test.ts src/game/journal.test.ts
bun run typecheck
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/game/dialogue.ts src/game/dialogue.test.ts src/game/journal.ts src/game/journal.test.ts
git commit -m "feat: derive dialogue and journal from progress"
~~~

---

### Task 3: Author the complete village and Floor 1

**Files:**

- Modify: src/game/content/village.ts
- Modify: src/game/content/floor1.ts
- Modify: src/game/content/floor2.ts
- Modify: src/game/content.test.ts
- Modify: src/phaser/assets.test.ts

**Interfaces:**

- Consumes the Task 1 content schema.
- Produces the complete HPA-235 authored content and keeps all entity visuals inside the existing HPA-22 catalog.

- [ ] **Step 1: Replace the village layout**

Use exactly:

~~~ts
layout: [
  '##############',
  '#............#',
  '#..##....##..#',
  '#............#',
  '#....####....#',
  '#............#',
  '#..##....##..#',
  '#............#',
  '#............#',
  '##############',
],
sections: [
  {
    id: 'village-square',
    name: 'Village Square',
    bounds: { minX: 1, maxX: 12, minY: 5, maxY: 8 },
  },
  {
    id: 'village-north-path',
    name: 'North Path',
    bounds: { minX: 1, maxX: 12, minY: 1, maxY: 4 },
  },
],
~~~

Use these entities:

~~~text
village-recovery: recovery at (2,2)
village-warden: npc at (3,7), introFactId main-missing-person-lead
village-artisan: npc at (6,7), introFactId optional-heirloom-lead
village-scout: npc at (9,7), introFactId optional-route-lead
village-scribe: npc at (11,7), introFactId optional-ledger-lead
village-to-floor1: portal at (11,2) -> floor1 (2,14), factId village-tower-stairs-used
~~~

Every NPC uses assetId npc-village-guide. Keep recovery/portal assets on their existing defaults/explicit IDs.

- [ ] **Step 2: Replace the Floor-1 geometry**

Use exactly:

~~~ts
layout: [
  '########################',
  '#....#.....#...........#',
  '#....#.....#.......#...#',
  '#....#.....#.......#...#',
  '#..........#...........#',
  '#....#.....#..######...#',
  '#....###.###..#...##...#',
  '#....#..#..#..#...##...#',
  '#....#..#.....#...##...#',
  '#....#.....#..######...#',
  '#.......#..#...........#',
  '###.#####.##.......#...#',
  '#....#.....###.###.#...#',
  '#..........#...........#',
  '#..........#...........#',
  '########################',
],
sections: [
  {
    id: 'floor1-entry-court',
    name: 'Entry Court',
    bounds: { minX: 1, maxX: 10, minY: 12, maxY: 14 },
  },
  {
    id: 'floor1-lower-loop',
    name: 'Lower Loop',
    bounds: { minX: 1, maxX: 10, minY: 7, maxY: 11 },
  },
  {
    id: 'floor1-upper-gallery',
    name: 'Upper Gallery',
    bounds: { minX: 1, maxX: 10, minY: 1, maxY: 6 },
    factIds: ['floor1-treasury-seen'],
  },
  {
    id: 'floor1-rear-wing',
    name: 'Rear Wing',
    bounds: { minX: 12, maxX: 22, minY: 1, maxY: 14 },
  },
],
~~~

- [ ] **Step 3: Author the Floor-1 entities**

Use these exact IDs/positions and existing images:

~~~text
floor1-to-village: portal (2,14) -> village (11,2), stairs-up
floor1-front-to-floor2: portal (9,2) -> floor2 (1,8), stairs-down
  requiresItemId tower-depth-sigil
  lockedFactId floor1-depth-seal-seen
  lockedText "A crest-shaped socket seals the lower stair."
  factId floor1-depth-stairs-used
floor1-rear-to-floor2: portal (21,3) -> floor2 (14,1), stairs-down
  factId floor1-rear-stairs-used

floor1-route-mark: clue (9,4), clue-runes
  factId floor1-route-mark-seen
  text "Old route scratches turn downward, then mark a return from the east."

floor1-ledger-fragment: item reward (3,4), chest-relic-closed
  itemId ledger-fragment-1
  label "Ledger Fragment"

floor1-west-cache: stat reward (7,13), chest-relic-closed
  defense +1

floor1-depth-sigil: item reward (9,10), chest-relic-closed
  itemId tower-depth-sigil
  label "Tower Sigil"

floor1-west-sentry: enemy (3,11), enemy-ruin-guard
  hp 18, attack 6, defense 3

floor1-east-sentry: enemy (9,11), enemy-ruin-guard
  hp 22, attack 7, defense 4

floor1-rear-latch: latch (11,8), rearSide east

floor1-power-core: stat reward (13,8), chest-relic-closed
  attack +2

floor1-gatekeeper: enemy (15,10), enemy-ruin-guard
  hp 20, attack 7, defense 4

floor1-future-treasury: stat reward (16,7), chest-relic-closed
  defense +2
~~~

The treasury room at (16,7) has no Floor-1 entrance. Do not add a portal into it in HPA-235.

- [ ] **Step 4: Update only reciprocal Floor-2 targets**

Keep the current Floor-2 layout unchanged.

Change:

~~~text
floor2-front-to-floor1 target -> floor1 (9,2)
floor2-rear-to-floor1 target -> floor1 (21,3)
~~~

Do not add mechanisms, quests, enemies, rewards, or rooms to Floor 2.

- [ ] **Step 5: Extend content/asset coverage**

Content tests must assert:

~~~ts
expect(validateContent()).toEqual([]);
expect(findItemRewardByItemId('tower-depth-sigil')?.id).toBe(
  'floor1-depth-sigil',
);
expect(findSectionById('floor1-upper-gallery')?.name).toBe('Upper Gallery');
~~~

Extend the existing generalized asset test only as needed for the new Entity union. It must pass without adding ASSET_PATHS rows because all new entities reuse current assets.

- [ ] **Step 6: Run Task 3 gate**

~~~bash
bunx vitest run src/game/content.test.ts src/phaser/assets.test.ts
bun run typecheck
~~~

Expected: PASS and no new PNGs in git diff.

- [ ] **Step 7: Commit**

~~~bash
git add src/game/content src/game/content.ts src/game/content.test.ts src/phaser/assets.test.ts
git commit -m "feat: author complete village and floor one"
~~~

---

### Task 4: Record facts/items during interactions and gate Floor 2 with the sigil

**Files:**

- Modify: src/game/actions.ts
- Modify: src/game/actions.test.ts
- Modify: src/game/movement.ts
- Modify: src/game/movement.test.ts

**Interfaces:**

- Consumes recordFact, addItem, discoverCurrentSection, resolveNpcDialogue.
- Produces dialogue, itemReward, and accessLocked effects.

- [ ] **Step 1: Add failing NPC/item reward tests**

Add:

~~~ts
it('records NPC context while preserving earlier evidence', () => {
  const npc = findEntityById('village-artisan');
  if (!npc || npc.kind !== 'npc') throw new Error('artisan missing');
  const state = {
    ...createInitialGameState(),
    factIds: ['floor1-treasury-seen'],
  };
  const result = interactWithEntity(state, npc, { x: 6, y: 8 });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.state.factIds).toEqual([
    'floor1-treasury-seen',
    'optional-heirloom-lead',
  ]);
  expect(result.effect.kind).toBe('dialogue');
});

it('collects the reusable sigil exactly once', () => {
  const sigil = findEntityById('floor1-depth-sigil');
  if (!sigil || sigil.kind !== 'reward' || !('itemId' in sigil))
    throw new Error('sigil missing');
  const state = {
    ...createInitialGameState(),
    mapId: 'floor1' as const,
    tile: { x: 9, y: 9 },
  };
  const result = interactWithEntity(state, sigil, state.tile);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.state.itemIds).toContain('tower-depth-sigil');
  expect(result.state.openedRewardIds).toContain('floor1-depth-sigil');
  expect(result.effect).toEqual({
    kind: 'itemReward',
    itemId: 'tower-depth-sigil',
    label: 'Tower Sigil',
  });
});
~~~

- [ ] **Step 2: Extend interactWithEntity**

NPC branch:

~~~ts
case 'npc': {
  const text = resolveNpcDialogue(entity.id, state);
  const next = recordFact(state, entity.introFactId);
  return {
    ok: true,
    state: next,
    effect: { kind: 'dialogue', speaker: entity.name, text },
  };
}
~~~

Clue branch records entity.factId before returning its clue effect.

Reward branch first keeps the existing openedRewardIds guard, then:

- stat reward: existing stat mutation + reward effect;
- item reward: add itemId + openedRewardIds + itemReward effect.

Do not add an inventory object or consume item IDs.

- [ ] **Step 3: Add failing movement tests for the locked portal**

~~~ts
it('records the sealed stair without traveling when the sigil is missing', () => {
  const state = {
    ...createInitialGameState(),
    mapId: 'floor1' as const,
    tile: { x: 9, y: 3 },
    discoveredSectionIds: ['floor1-upper-gallery'],
  };
  const result = attemptMove(state, 'north');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.state.mapId).toBe('floor1');
  expect(result.state.tile).toEqual({ x: 9, y: 3 });
  expect(result.state.factIds).toContain('floor1-depth-seal-seen');
  expect(result.effect.kind).toBe('accessLocked');
});

it('uses but does not consume the reusable sigil', () => {
  const state = {
    ...createInitialGameState(),
    mapId: 'floor1' as const,
    tile: { x: 9, y: 3 },
    itemIds: ['tower-depth-sigil'],
    openedRewardIds: ['floor1-depth-sigil'],
  };
  const result = attemptMove(state, 'north');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.state.mapId).toBe('floor2');
  expect(result.state.itemIds).toEqual(['tower-depth-sigil']);
  expect(result.state.factIds).toContain('floor1-depth-stairs-used');
});
~~~

- [ ] **Step 4: Centralize position discovery inside movement.ts**

Add a private helper:

~~~ts
function withDiscoveredPosition(state: GameState): GameState {
  return discoverCurrentSection(state);
}
~~~

Every branch that changes map/tile passes its next state through this helper before returning. This includes:

- ordinary movement;
- travel;
- stepping onto opened reward;
- stepping onto defeated enemy;
- stepping through opened latch.

Do not call it for bump interactions that leave the player on the previous tile.

- [ ] **Step 5: Add the required-item portal branch**

Before portal travel:

~~~ts
if (
  entity.requiresItemId &&
  !state.itemIds.includes(entity.requiresItemId)
) {
  const next = entity.lockedFactId
    ? recordFact(state, entity.lockedFactId)
    : state;
  return {
    ok: true,
    state: next,
    effect: {
      kind: 'accessLocked',
      text: entity.lockedText ?? 'The way is sealed.',
    },
  };
}
~~~

Successful travel records entity.factId, changes map/tile, then calls withDiscoveredPosition.

- [ ] **Step 6: Update NPC blocking semantics**

Movement naturally bumps NPCs through interactWithEntity. Keep NPC tiles blocking exactly like clue/recovery tiles.

- [ ] **Step 7: Run Task 4 gate**

~~~bash
bunx vitest run src/game/actions.test.ts src/game/movement.test.ts src/game/session.test.ts
bun run test:unit
bun run typecheck
~~~

Expected: PASS.

- [ ] **Step 8: Commit**

~~~bash
git add src/game/actions.ts src/game/actions.test.ts src/game/movement.ts src/game/movement.test.ts
git commit -m "feat: wire quest facts and floor access"
~~~

---

### Task 5: Persist and validate the new durable state

**Files:**

- Modify: src/game/save.ts
- Modify: src/game/save.test.ts

**Interfaces:**

- Consumes collectKnownFactIds, findSectionById, findItemRewardByItemId.
- Keeps the existing LoadResult contract.

- [ ] **Step 1: Extend the shape test**

hasValidShape must require string arrays for:

~~~text
itemIds
factIds
discoveredSectionIds
~~~

Do not default missing fields. A pre-HPA-235 development save becomes invalid-shape.

- [ ] **Step 2: Add failing content validation tests**

~~~ts
it('rejects unknown fact ids', () => {
  storage.setItem(
    'eridanus.save',
    JSON.stringify({
      ...createInitialGameState(),
      factIds: ['removed-fact'],
    }),
  );
  expect(loadGame(storage)).toEqual({
    kind: 'invalid',
    reason: 'invalid-content',
  });
});

it('rejects unknown item ids', () => {
  storage.setItem(
    'eridanus.save',
    JSON.stringify({
      ...createInitialGameState(),
      itemIds: ['removed-item'],
    }),
  );
  expect(loadGame(storage)).toEqual({
    kind: 'invalid',
    reason: 'invalid-content',
  });
});

it('rejects unknown discovered sections', () => {
  storage.setItem(
    'eridanus.save',
    JSON.stringify({
      ...createInitialGameState(),
      discoveredSectionIds: ['removed-section'],
    }),
  );
  expect(loadGame(storage)).toEqual({
    kind: 'invalid',
    reason: 'invalid-content',
  });
});
~~~

- [ ] **Step 3: Validate item/fact/section content**

In hasValidContent:

~~~ts
const knownFacts = collectKnownFactIds();
if (!state.factIds.every((id) => knownFacts.has(id))) return false;
if (!state.discoveredSectionIds.every((id) => findSectionById(id)))
  return false;

for (const itemId of state.itemIds) {
  const reward = findItemRewardByItemId(itemId);
  if (!reward || !state.openedRewardIds.includes(reward.id)) return false;
}

for (const openedId of state.openedRewardIds) {
  const reward = findEntityById(openedId);
  if (
    reward?.kind === 'reward' &&
    'itemId' in reward &&
    !state.itemIds.includes(reward.itemId)
  )
    return false;
}
~~~

Extend isTileOccupiedByBlockingEntity with:

~~~ts
case 'npc':
  return true;
~~~

- [ ] **Step 4: Update round-trip coverage**

The round-trips-every-durable-field test must include:

~~~ts
itemIds: ['tower-depth-sigil'],
factIds: [
  'main-missing-person-lead',
  'floor1-treasury-seen',
  'floor1-depth-stairs-used',
],
discoveredSectionIds: [
  'village-square',
  'floor1-entry-court',
  'floor1-upper-gallery',
],
~~~

and openedRewardIds must include floor1-depth-sigil so item consistency is valid.

- [ ] **Step 5: Run Task 5 gate**

~~~bash
bunx vitest run src/game/save.test.ts
bun run test:unit
bun run typecheck
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/game/save.ts src/game/save.test.ts
git commit -m "feat: persist journal and discovery facts"
~~~

---

### Task 6: Render dialogue, item/access feedback, and the lightweight journal

**Files:**

- Create: src/ui/JournalPanel.ts
- Modify: src/ui/InteractionOverlay.ts
- Modify: src/main.ts
- Modify: src/styles.css

**Interfaces:**

- JournalPanel consumes JournalView only.
- InteractionOverlay OverlayView gains journal: JournalView.
- main.ts produces buildJournalView(session.game) at render time.

- [ ] **Step 1: Create JournalPanel**

src/ui/JournalPanel.ts exports:

~~~ts
import type { JournalView } from '../game/journal';

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderJournal(view: JournalView): string {
  const optional = view.optional
    .map(
      (entry) =>
        '<li><strong>' +
        escapeText(entry.title) +
        '</strong>: ' +
        escapeText(entry.lead) +
        '</li>',
    )
    .join('');

  const sections = view.sections
    .map((section) => '<li>' + escapeText(section) + '</li>')
    .join('');

  const observations = view.observations
    .map((note) => '<li>' + escapeText(note) + '</li>')
    .join('');

  return (
    '<details data-testid="journal">' +
    '<summary>Journal</summary>' +
    '<h3>Main</h3><p data-testid="main-lead">' +
    escapeText(view.main.lead) +
    '</p>' +
    '<h3>Optional</h3><ul data-testid="optional-leads">' +
    optional +
    '</ul>' +
    '<h3>Known areas</h3><ul data-testid="known-areas">' +
    sections +
    '</ul>' +
    '<h3>Notes</h3><ul data-testid="map-notes">' +
    observations +
    '</ul>' +
    '</details>'
  );
}
~~~

Use this tiny escaping helper because journal/dialogue copy now enters a larger innerHTML surface. Do not add a templating dependency.

- [ ] **Step 2: Extend overlay effect text**

Handle:

~~~ts
case 'dialogue':
  return effect.speaker + ': ' + effect.text;
case 'itemReward':
  return 'Obtained ' + effect.label + '.';
case 'accessLocked':
  return effect.text;
~~~

Add journal: JournalView to OverlayView and append renderJournal(journal) beside/below the existing HUD.

- [ ] **Step 3: Pass the derived view from main.ts**

In renderOverlay:

~~~ts
overlay.render({
  state: session.game,
  mapName: MAPS[session.game.mapId].name,
  pending: session.pending,
  effect,
  blocked,
  journal: buildJournalView(session.game),
});
~~~

Do not persist whether native details is expanded.

- [ ] **Step 4: Keep the journal compact in CSS**

Add only layout/readability rules:

~~~css
#ui {
  display: grid;
  gap: 0.5rem;
}

[data-testid='journal'] {
  max-width: 640px;
  font-size: 0.9rem;
}

[data-testid='journal'] h3 {
  margin: 0.5rem 0 0.2rem;
}

[data-testid='journal'] ul {
  margin: 0.2rem 0;
  padding-left: 1.25rem;
}
~~~

No modal, tabs, router, or component framework.

- [ ] **Step 5: Run Task 6 gate**

~~~bash
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run build
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/ui/JournalPanel.ts src/ui/InteractionOverlay.ts src/main.ts src/styles.css
git commit -m "feat: show journal and map notes"
~~~

---

### Task 7: Prove the complete HPA-235 browser journey and preserve the HPA-237 loop

**Files:**

- Modify: tests/e2e/cross-floor.spec.ts
- Modify product files only for concrete route/readability defects found by the real browser test.

**Interfaces:**

- Uses only real keyboard input and player-facing DOM.
- No test-only game API.

- [ ] **Step 1: Update the preload-input smoke test**

The old test bumps a clue at a coordinate removed by HPA-235. Replace it with a move that bumps the warden while PNG requests are held:

~~~text
Fresh village starts at (2,8)
Right -> (3,8)
Up -> bump village-warden at (3,7)
~~~

Assert data-effect dialogue and non-empty text while assets are still blocked.

- [ ] **Step 2: Add the main progression browser path**

From fresh village:

~~~text
Right, Up -> talk to warden
Right x5, Up x3, Right x3, Up x3 -> village stair at (11,2) -> Floor 1 (2,14)
Right, Up x2 -> bump/fight west sentry at (3,11)
Fight
Up x2, Right x4, Up, Right x2, Down -> collect Tower Sigil at (9,10)
Left x3, Down, Left x2, Up x6, Right x4, Up, Right, Up -> front Floor-2 stair (9,2)
~~~

Before the sigil collection, add a focused unit test for the locked stair rather than detouring the browser journey to the seal and back.

At the browser checkpoints assert:

~~~ts
await expect(page.getByTestId('main-lead')).toContainText('reusable tower sigil');
await expect(page.getByTestId('interaction')).toContainText('Tower Sigil');
await expect(page.getByTestId('main-lead')).toContainText('Descend to Floor 2');
await expect(page.getByTestId('map-notes')).toContainText('sealed treasury');
await expect(page.getByTestId('map-name')).toHaveText('Tower Floor 2');
~~~

The route to the upper gallery records floor1-treasury-seen through section discovery before entering Floor 2.

- [ ] **Step 3: Continue through the existing Floor-2 connector to the Rear Wing**

Keep the current connector route from floor2 (1,8):

~~~text
Right x13, Up x7 -> rear portal -> Floor 1 (21,3)
~~~

Then route to the existing HPA-237 power core/gatekeeper/latch using the new Floor-1 geometry. Do not change combat formulas or latch semantics to make the test easier.

The assertions must still prove:

- floor1-power-core increases ATK by 2;
- the nearby deterministic combat preview changes after the reward;
- Fight records HP loss and defeated enemy persistence;
- floor1-rear-latch opens only from the east/rear side;
- the opened latch becomes two-way.

If exact arrow counts differ after the first real-browser pass, correct only the authored route counts in this test; do not add teleport/test APIs.

- [ ] **Step 4: Prove journal/save persistence**

After entering Floor 2 and again after opening the rear latch:

~~~ts
await page.reload();
await expect(page.getByTestId('journal')).toBeVisible();
await expect(page.getByTestId('known-areas')).toContainText('Upper Gallery');
await expect(page.getByTestId('map-notes')).toContainText('sealed treasury');
await expect(page.getByTestId('main-lead')).toContainText('Descend to Floor 2');
~~~

Also assert the sigil is not consumed by using the front stair after a return path and confirming travel still succeeds.

- [ ] **Step 5: Keep early-discovery ordering in unit tests, not a second long E2E**

journal.test.ts and dialogue.test.ts already prove:

- evidence can exist before quest intro;
- optional entry stays hidden until context is learned;
- the first visible entry immediately reflects old evidence.

Do not add a second browser journey solely for this ordering.

- [ ] **Step 6: Run the full browser gate**

~~~bash
bun run test:e2e -- tests/e2e/cross-floor.spec.ts
~~~

Expected: PASS.

- [ ] **Step 7: Run every CI-equivalent gate**

~~~bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run build
bunx playwright install chromium
bun run test:e2e
~~~

Expected: PASS.

- [ ] **Step 8: Inspect scope before review**

~~~bash
git diff main...HEAD --stat
git diff main...HEAD -- public/assets
~~~

Expected:

- no new/changed PNG assets;
- no Floor-2 expansion beyond reciprocal coordinate changes;
- no save migration/version field;
- no quest/event DSL;
- no UI framework;
- no consumable-key subsystem.

- [ ] **Step 9: Commit the browser proof**

~~~bash
git add tests/e2e/cross-floor.spec.ts
git commit -m "test: cover complete floor one progression"
~~~

Include any small route/readability product corrections in this same commit only when they were required by the real browser proof.

---

## Final Verification

Before marking HPA-235 ready for review:

~~~bash
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run build
bun run test:e2e
~~~

Manually verify at normal browser scale:

1. four village NPCs are understandable despite sharing the current guide sprite because interaction text identifies them;
2. journal leads update after talking/discovering/collecting;
3. the Upper Gallery visibly exposes the sealed future treasury without a Floor-1 route into it;
4. the Tower Sigil opens the Floor-2 stair and is not consumed;
5. Floor 1 has at least two meaningful approach choices from the entry area;
6. optional defense cache/ledger/quest observations are not required for main progression;
7. the HPA-237 rear reward/combat/latch loop still works;
8. reload preserves exact position, stats, opened/defeated entities, items, facts, and discovered sections.

## Self-Review

### Spec coverage

- Complete compact village + four story/quest NPC interactions + healing: Tasks 2, 3, 4, 6.
- Complete Floor 1 with route choices, fixed enemies/rewards, shortcut, reusable progression item, and visible future treasury: Tasks 3, 4, 7.
- Main quest + three optional clue/discovery threads without a generic quest system: Tasks 2, 3, 4.
- Early discovery before formal quest context: Task 2 unit tests and fact-first state model.
- Remember authored sections, stairs, visible treasury, route marks, and locked depth stair: Tasks 1, 2, 3, 4.
- Journal/map guidance gives leads rather than exact routes: Task 2 and JournalPanel.
- Save/reload persists journal/map progress: Task 5 + Task 7.
- Floor 2 remains the existing small connector: Task 3.
- No new image generation: global constraint + Task 3 asset gate + Task 7 diff check.

### Placeholder scan

No TBD/TODO/future implementation placeholders remain. HPA-146-owned content is explicitly represented only as the sealed treasury connection non-goal; HPA-235 ships the visible chest and observation now.

### Type consistency

The plan consistently uses itemIds, factIds, discoveredSectionIds, MapSection, NpcEntity, RewardEntity item/stat variants, recordFact, recordFacts, addItem, discoverCurrentSection, resolveNpcDialogue, buildJournalView, JournalView, findSectionById, collectKnownFactIds, and findItemRewardByItemId.

## Implementation Handoff

Execute this plan on the same HPA-235 branch/PR. Recommended workflow: superpowers:subagent-driven-development. Do not open a second implementation PR for HPA-235.
