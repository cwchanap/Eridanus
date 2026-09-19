# HPA-235 Complete Village and Floor 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Complete the starting village and Floor 1 with fact-driven dialogue/journal notes, a reusable Floor-2 access item, authored exploration content, and persisted discovery while retaining the HPA-237 rear-route regression loop.

**Architecture:** Extend the existing pure TypeScript domain with three durable ID arrays: carried items, facts, and discovered sections. One authored FACTS table owns valid durable facts and note copy; dialogue copy lives under game/content while pure game logic selects closed line IDs; journal logic returns closed lead IDs. Existing exhaustive switches, persistence, and assets are updated in one compile-safe contract cut.

**Tech Stack:** Bun 1.4.2, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, Vite 8, framework-free DOM UI.

**Spec:** docs/superpowers/specs/2026-09-18-hpa-235-village-floor1-design.md

## Global Constraints

- One ticket = one PR. Continue implementation on this same HPA-235 branch/PR.
- Do not add a generic quest engine, event DSL, branching narrative engine, inventory UI, UI framework, or second durable state owner.
- Do not add consumable keys.
- Do not add save versioning or migrations; old development snapshots may invalidate through the existing explicit reset flow.
- Do not generate new image art. Reuse the HPA-22 asset catalog; genuinely new art is a separate ticket/PR.
- Keep Floor 2 limited to the current connector, reciprocal-coordinate updates, and one discovery section.
- Required Floor-2 access must not depend on optional quest progress or optional treasure.
- Every task that advertises typecheck must update all immediately affected closed-union consumers and direct GameState literals.
- After Task 3 rewrites map geometry, the old Playwright route is expected to be red until Task 5 updates it. Intermediate commits may therefore fail the E2E CI job by design; the final branch must pass every CI-equivalent gate before review.
- Keep InteractionOverlay's current root-replacement strategy for this ticket. Preserve only journal.open across renders; do not introduce cached shell lifecycle/rebuild machinery.

---

## File Map

Create:

- src/game/content/facts.ts — canonical durable fact registry and optional journal-note copy.
- src/game/content/dialogue.ts — authored dialogue lines and NPC coverage table.
- src/game/progress.ts / progress.test.ts — idempotent fact/item recording and section discovery.
- src/game/dialogue.ts / dialogue.test.ts — pure NPC-state to DialogueLineId selection.
- src/game/journal.ts / journal.test.ts — derived lead IDs, known sections, and observation fact IDs.
- src/ui/JournalPanel.ts / JournalPanel.test.ts — lead/title copy and journal markup.

Modify:

- src/game/types.ts — DialogueLineId, ClueEntity.factId, NpcEntity, MapSection, PortalLock, discriminated rewards, durable state/effects.
- src/game/state.ts / state.test.ts — new durable arrays; final start tile in Task 3.
- src/game/content.ts / content.test.ts — section/item helpers, fact/NPC/section/lock validation, topology tests.
- src/game/content/village.ts — baseline section in Task 1; complete hub in Task 3.
- src/game/content/floor1.ts — baseline section + grant discriminant in Task 1; complete floor in Task 3.
- src/game/content/floor2.ts — connector section in Task 1; reciprocal target coordinates in Task 3.
- src/game/actions.ts / actions.test.ts — fact-aware clues/NPCs and discriminated rewards.
- src/game/movement.ts / movement.test.ts — section discovery and nested reusable-item portal lock.
- src/game/save.ts / save.test.ts — new durable fields and registry-backed validation.
- src/game/session.test.ts — direct GameState fixture update.
- src/phaser/assets.ts / assets.test.ts — NPC safe default and reward fixture update.
- src/ui/InteractionOverlay.ts — new effect kinds, stable data seams, journal-open snapshot/restore.
- src/main.ts — pass derived journal.
- src/styles.css — compact journal layout.
- tests/e2e/cross-floor.spec.ts — updated real-player journey.

---

### Task 1: Land the compile-safe content/progress contracts

**Files:**

- Create: src/game/content/facts.ts
- Create: src/game/content/dialogue.ts
- Create: src/game/progress.ts
- Create: src/game/progress.test.ts
- Create: src/game/dialogue.ts
- Create: src/game/dialogue.test.ts
- Modify: src/game/types.ts
- Modify: src/game/state.ts
- Modify: src/game/state.test.ts
- Modify: src/game/content.ts
- Modify: src/game/content.test.ts
- Modify: src/game/content/village.ts
- Modify: src/game/content/floor1.ts
- Modify: src/game/content/floor2.ts
- Modify: src/game/actions.ts
- Modify: src/game/actions.test.ts
- Modify: src/game/save.ts
- Modify: src/game/save.test.ts
- Modify: src/game/movement.test.ts
- Modify: src/game/session.test.ts
- Modify: src/phaser/assets.ts
- Modify: src/phaser/assets.test.ts

**Interfaces:**

- Produces GameState.itemIds, factIds, discoveredSectionIds.
- Produces FACTS and hasFact(id).
- Produces DIALOGUE_LINES and hasNpcDialogue(id).
- Produces DialogueLineId, MapSection, NpcEntity, RewardEntity.grant, PortalLock.
- Produces recordFact, recordFacts, addItem, discoverCurrentSection.
- Produces resolveNpcDialogue(npcId, state): DialogueLineId.
- Produces findSectionById and findItemRewardByItemId.

- [ ] **Step 1: Write the failing state/progress tests**

Add:

~~~ts
it('starts with empty facts/items and the current village section discovered', () => {
  expect(createInitialGameState()).toMatchObject({
    itemIds: [],
    factIds: [],
    discoveredSectionIds: ['village-square'],
  });
});

it('records facts and items once while preserving identity on repeats', () => {
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

- [ ] **Step 2: Add the fact registry**

src/game/content/facts.ts:

~~~ts
export const FACTS = {
  'main-missing-person-lead': {},
  'optional-heirloom-lead': {},
  'optional-route-lead': {},
  'optional-ledger-lead': {},
  'village-tower-stairs-used': {
    note: 'Stairs connect the village and Floor 1.',
  },
  'floor1-treasury-seen': {
    note: 'A sealed treasury is visible from the Entry Court.',
  },
  'floor1-treasury-sealed': {
    note: 'The treasury arch is bricked from this side.',
  },
  'floor1-route-mark-seen': {
    note: 'Route scratches point toward a connection that returns from below.',
  },
  'floor1-depth-seal-seen': {
    note: 'A crest-shaped socket seals the lower stair.',
  },
  'floor1-depth-stairs-used': {
    note: 'The lower stair reaches Floor 2.',
  },
  'floor1-rear-stairs-used': {
    note: 'A second stair returns to the Rear Wing.',
  },
} as const satisfies Record<string, { note?: string }>;

export function hasFact(id: string): boolean {
  return Object.hasOwn(FACTS, id);
}
~~~

Do not add a generic fact handler/registry class.

- [ ] **Step 3: Add authored dialogue content**

Add DialogueLineId to src/game/types.ts:

~~~ts
export type DialogueLineId =
  | 'warden-main-lead'
  | 'warden-sigil-found'
  | 'artisan-find-workshop'
  | 'artisan-workshop-seen'
  | 'artisan-find-other-entrance'
  | 'scout-find-marks'
  | 'scout-marks-seen'
  | 'scribe-find-ledger'
  | 'scribe-fragment-found';
~~~

src/game/content/dialogue.ts:

~~~ts
import type { DialogueLineId } from '../types';

export const DIALOGUE_LINES: Record<DialogueLineId, string> = {
  'warden-main-lead':
    'Search the first floor for the crest that opens the lower stair.',
  'warden-sigil-found':
    'That sigil matches the lower seal. The stair to the next floor should open now.',
  'artisan-find-workshop':
    'My family workshop was sealed inside the tower. Look for its treasury.',
  'artisan-workshop-seen':
    'You saw the workshop treasury from the entrance side. Find a way closer.',
  'artisan-find-other-entrance':
    'The arch is bricked from this side. There must be another entrance from below.',
  'scout-find-marks':
    'An old plan shows a return passage where no corridor should exist. Watch for route scratches.',
  'scout-marks-seen':
    'Those scratches match the old plan. The route probably rejoins from below.',
  'scribe-find-ledger':
    'The tower keeper recorded every mechanism. Bring back any ledger fragment you find.',
  'scribe-fragment-found':
    'This fragment mentions paired mechanisms. More pages must survive deeper in the tower.',
};

export const NPC_DIALOGUE_IDS = new Set([
  'village-warden',
  'village-artisan',
  'village-scout',
  'village-scribe',
]);

export function hasNpcDialogue(id: string): boolean {
  return NPC_DIALOGUE_IDS.has(id);
}
~~~

The initial warden interaction records main-missing-person-lead first, so the selected first line is warden-main-lead; no separate unaware intro line is needed.

- [ ] **Step 4: Extend the closed gameplay types**

In src/game/types.ts:

~~~ts
export type ClueEntity = BaseEntity &
  Readonly<{
    kind: 'clue';
    text: string;
    factId?: string;
  }>;

export type NpcEntity = BaseEntity &
  Readonly<{
    kind: 'npc';
    name: string;
    introFactId: string;
  }>;

export type RewardEntity = BaseEntity &
  Readonly<{ kind: 'reward' }> &
  (
    | Readonly<{ grant: 'stat'; stat: Stat; amount: number }>
    | Readonly<{ grant: 'item'; itemId: string; label: string }>
  );

export type PortalLock = Readonly<{
  requiresItemId: string;
  lockedText: string;
  lockedFactId: string;
}>;

export type PortalEntity = BaseEntity &
  Readonly<{
    kind: 'portal';
    target: Readonly<{ mapId: MapId; tile: Tile }>;
    factId?: string;
    lock?: PortalLock;
  }>;

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
~~~

Add NpcEntity to Entity, sections to MapDefinition, and to GameState:

~~~ts
itemIds: readonly string[];
factIds: readonly string[];
discoveredSectionIds: readonly string[];
~~~

Add ActionEffect variants:

~~~ts
| { kind: 'dialogue'; speaker: string; lineId: DialogueLineId }
| { kind: 'itemReward'; itemId: string; label: string }
| { kind: 'accessLocked'; text: string }
~~~

- [ ] **Step 5: Make current authored maps satisfy the required contracts**

Do not change current geometry/portal coordinates yet.

Add baseline sections:

~~~ts
// village
sections: [
  {
    id: 'village-square',
    name: 'Village Square',
    bounds: { minX: 1, maxX: 10, minY: 1, maxY: 6 },
  },
],

// floor1
sections: [
  {
    id: 'floor1-proof',
    name: 'Tower Floor 1',
    bounds: { minX: 1, maxX: 16, minY: 1, maxY: 10 },
  },
],

// floor2
sections: [
  {
    id: 'floor2-connector',
    name: 'Floor 2 Connector',
    bounds: { minX: 1, maxX: 14, minY: 1, maxY: 8 },
  },
],
~~~

Add grant: 'stat' to current floor1-power-core.

- [ ] **Step 6: Initialize the new durable fields without moving the current start tile**

Keep current tile { x: 2, y: 5 } until Task 3 changes village geometry.

Append:

~~~ts
itemIds: [],
factIds: [],
discoveredSectionIds: ['village-square'],
~~~

Update state.test.ts.

- [ ] **Step 7: Implement progress helpers**

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

- [ ] **Step 8: Implement dialogue selection as IDs only**

src/game/dialogue.ts:

~~~ts
import type { DialogueLineId, GameState } from './types';

export function resolveNpcDialogue(
  npcId: string,
  state: GameState,
): DialogueLineId {
  switch (npcId) {
    case 'village-warden':
      return state.itemIds.includes('tower-depth-sigil')
        ? 'warden-sigil-found'
        : 'warden-main-lead';

    case 'village-artisan':
      if (state.factIds.includes('floor1-treasury-sealed'))
        return 'artisan-find-other-entrance';
      if (state.factIds.includes('floor1-treasury-seen'))
        return 'artisan-workshop-seen';
      return 'artisan-find-workshop';

    case 'village-scout':
      return state.factIds.includes('floor1-route-mark-seen')
        ? 'scout-marks-seen'
        : 'scout-find-marks';

    case 'village-scribe':
      return state.itemIds.includes('ledger-fragment-1')
        ? 'scribe-fragment-found'
        : 'scribe-find-ledger';

    default:
      throw new Error('Unknown NPC: ' + npcId);
  }
}
~~~

Tests assert IDs:

~~~ts
expect(resolveNpcDialogue('village-artisan', {
  ...createInitialGameState(),
  factIds: ['floor1-treasury-sealed', 'optional-heirloom-lead'],
})).toBe('artisan-find-other-entrance');

expect(resolveNpcDialogue('village-scribe', {
  ...createInitialGameState(),
  itemIds: ['ledger-fragment-1'],
  factIds: ['optional-ledger-lead'],
})).toBe('scribe-fragment-found');
~~~

Do not assert dialogue prose in game-domain tests.

- [ ] **Step 9: Extend actions exhaustively**

Clue records factId when present.

NPC ordering is:

~~~ts
case 'npc': {
  const next = recordFact(state, entity.introFactId);
  const lineId = resolveNpcDialogue(entity.id, next);
  return {
    ok: true,
    state: next,
    effect: { kind: 'dialogue', speaker: entity.name, lineId },
  };
}
~~~

Reward branches on grant:

~~~ts
case 'reward': {
  if (state.openedRewardIds.includes(entity.id))
    return { ok: false, reason: 'reward-already-taken' };

  if (entity.grant === 'item') {
    const next = addItem(
      {
        ...state,
        openedRewardIds: [...state.openedRewardIds, entity.id],
      },
      entity.itemId,
    );
    return {
      ok: true,
      state: next,
      effect: {
        kind: 'itemReward',
        itemId: entity.itemId,
        label: entity.label,
      },
    };
  }

  const player = {
    ...state.player,
    [entity.stat]: state.player[entity.stat] + entity.amount,
  };
  if (entity.stat === 'maxHp') player.hp += entity.amount;

  return {
    ok: true,
    state: {
      ...state,
      player,
      openedRewardIds: [...state.openedRewardIds, entity.id],
    },
    effect: { kind: 'reward', stat: entity.stat, amount: entity.amount },
  };
}
~~~

Add a synthetic artisan NPC action test proving one bump appends optional-heirloom-lead and returns lineId artisan-find-other-entrance when floor1-treasury-sealed was already known.

- [ ] **Step 10: Add content helpers and validation**

Add:

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
        candidate.grant === 'item' &&
        candidate.itemId === itemId,
    );
  return entity?.kind === 'reward' && entity.grant === 'item'
    ? entity
    : undefined;
}
~~~

Extend validateContent with:

- global unique section IDs;
- global unique itemIds for grant: 'item';
- non-inverted/in-bounds section rectangles;
- every walkable '.' tile covered by at least one section;
- every section factId, NPC introFactId, clue factId, portal factId, and portal.lock.lockedFactId passes hasFact;
- every NpcEntity ID passes hasNpcDialogue;
- every portal.lock.requiresItemId resolves through findItemRewardByItemId;
- existing entity/portal validation unchanged.

No validator rules for missing lock text/fact fields: PortalLock makes those states unrepresentable.

- [ ] **Step 11: Extend save validation now**

hasValidShape requires itemIds, factIds, discoveredSectionIds string arrays.

isTileOccupiedByBlockingEntity adds npc -> true.

hasValidContent:

~~~ts
if (!state.factIds.every(hasFact)) return false;
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
    reward.grant === 'item' &&
    !state.itemIds.includes(reward.itemId)
  )
    return false;
}
~~~

- [ ] **Step 12: Add the NPC asset default and update fixtures**

In src/phaser/assets.ts, after explicit asset handling:

~~~ts
if (entity.kind === 'npc') return 'npc-village-guide';
~~~

Update the RewardEntity fixture to grant: 'stat' and add a synthetic NPC resolver test.

Update every direct GameState literal, including movement.test.ts base, session.test.ts pending.game, save.test.ts durable literal, and state.test.ts exact expectation, with the three new arrays.

- [ ] **Step 13: Run the compile-safe Task 1 gate**

~~~bash
bunx vitest run   src/game/state.test.ts   src/game/progress.test.ts   src/game/dialogue.test.ts   src/game/actions.test.ts   src/game/content.test.ts   src/game/save.test.ts   src/phaser/assets.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run format:check
~~~

Expected: PASS.

- [ ] **Step 14: Commit**

~~~bash
git add src/game src/phaser/assets.ts src/phaser/assets.test.ts
git commit -m "feat: add fact-driven progress contracts"
~~~

---

### Task 2: Derive journal IDs and render authored copy at the UI edge

**Files:**

- Create: src/game/journal.ts
- Create: src/game/journal.test.ts
- Create: src/ui/JournalPanel.ts
- Create: src/ui/JournalPanel.test.ts

**Interfaces:**

- Produces LeadId, JournalEntry, JournalSection, JournalView, buildJournalView(state).
- JournalView carries lead IDs and observation fact IDs, not finished sentences.
- JournalPanel owns title/lead display copy and uses FACTS note copy.

- [ ] **Step 1: Add journal selection tests**

~~~ts
it('keeps optional quests hidden until context is learned', () => {
  const state = {
    ...createInitialGameState(),
    factIds: ['floor1-treasury-seen'],
  };
  expect(buildJournalView(state).optional).toEqual([]);
});

it('selects the stronger heirloom lead after the sealed approach is known', () => {
  const state = {
    ...createInitialGameState(),
    factIds: [
      'floor1-treasury-seen',
      'floor1-treasury-sealed',
      'optional-heirloom-lead',
    ],
  };
  const entry = buildJournalView(state).optional.find(
    (candidate) => candidate.id === 'heirloom',
  );
  expect(entry?.lead).toBe('heirloom-find-other-entrance');
});

it('selects only registered note facts as observations', () => {
  const state = {
    ...createInitialGameState(),
    factIds: ['main-missing-person-lead', 'floor1-treasury-seen'],
  };
  expect(buildJournalView(state).observationFactIds).toEqual([
    'floor1-treasury-seen',
  ]);
});
~~~

Do not use regex/prose assertions to prove absence of coordinates.

- [ ] **Step 2: Implement closed lead IDs**

src/game/journal.ts:

~~~ts
export type LeadId =
  | 'seek-warden'
  | 'find-sigil'
  | 'descend'
  | 'heirloom-find-workshop'
  | 'heirloom-inspect-treasury'
  | 'heirloom-find-other-entrance'
  | 'route-find-marks'
  | 'route-verify-return'
  | 'ledger-find-fragment'
  | 'ledger-find-later-pages';

export type JournalEntry = Readonly<{
  id: 'main' | 'heirloom' | 'route' | 'ledger';
  lead: LeadId;
}>;

export type JournalSection = Readonly<{
  id: string;
  name: string;
}>;

export type JournalView = Readonly<{
  main: JournalEntry;
  optional: readonly JournalEntry[];
  sections: readonly JournalSection[];
  observationFactIds: readonly string[];
}>;
~~~

Selection rules:

- main: seek-warden -> find-sigil -> descend;
- heirloom: hidden until optional-heirloom-lead, then find-workshop; if treasury-seen -> inspect-treasury; if treasury-sealed -> find-other-entrance;
- route: find-marks -> verify-return;
- ledger: find-fragment -> find-later-pages.

observationFactIds is:

~~~ts
state.factIds.filter((id) => hasFact(id) && FACTS[id as keyof typeof FACTS].note)
~~~

Use a small helper if needed to avoid repeating the cast; do not add a generic registry abstraction.

- [ ] **Step 3: Implement JournalPanel copy tables**

src/ui/JournalPanel.ts:

~~~ts
const ENTRY_TITLE: Record<JournalEntry['id'], string> = {
  main: 'Main',
  heirloom: 'Heirloom',
  route: 'Lost Route',
  ledger: 'Keeper Ledger',
};

const LEAD_TEXT: Record<LeadId, string> = {
  'seek-warden': 'Speak with the village warden.',
  'find-sigil': 'Search Floor 1 for the reusable tower sigil.',
  descend: 'The sigil opens the lower stair. Descend to Floor 2.',
  'heirloom-find-workshop': 'Look for the sealed workshop treasury.',
  'heirloom-inspect-treasury': 'Find a way to inspect the visible treasury approach.',
  'heirloom-find-other-entrance':
    'The visible approach is sealed. Look for another entrance from below.',
  'route-find-marks': 'Look for the old route scratches.',
  'route-verify-return': 'Verify where the marked return connection leads.',
  'ledger-find-fragment': 'Search for a surviving keeper ledger fragment.',
  'ledger-find-later-pages': 'Look deeper in the tower for later ledger pages.',
};
~~~

Render stable attributes:

~~~text
data-testid="journal"
data-lead="<lead id>"
data-section="<section id>"
data-note="<fact id>"
~~~

For each observation fact ID, render FACTS[id].note.

All displayed text is authored source code/content; do not add a separate escaping utility or adversarial injection test in this ticket.

- [ ] **Step 4: Test markup contracts, not prose**

JournalPanel.test.ts uses a literal JournalView and asserts returned markup contains:

~~~text
data-testid="journal"
data-lead="heirloom-find-other-entrance"
data-section="floor1-upper-gallery"
data-note="floor1-treasury-sealed"
~~~

Do not assert exact English copy.

- [ ] **Step 5: Run Task 2 gate**

~~~bash
bunx vitest run src/game/journal.test.ts src/ui/JournalPanel.test.ts
bun run test:unit
bun run typecheck
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add src/game/journal.ts src/game/journal.test.ts src/ui/JournalPanel.ts src/ui/JournalPanel.test.ts
git commit -m "feat: derive exploration journal"
~~~

---

### Task 3: Author the complete maps, reusable gate, and topology proof

**Files:**

- Modify: src/game/state.ts
- Modify: src/game/state.test.ts
- Modify: src/game/content/village.ts
- Modify: src/game/content/floor1.ts
- Modify: src/game/content/floor2.ts
- Modify: src/game/content.test.ts
- Modify: src/game/movement.ts
- Modify: src/game/movement.test.ts
- Modify: src/game/actions.test.ts
- Modify: src/game/save.test.ts
- Test: src/phaser/assets.test.ts

**Interfaces:**

- Consumes Task 1 contracts and Task 2 read models.
- Produces final HPA-235 authored content.
- Produces movement-driven section discovery and PortalEntity.lock behavior.
- Adds geometry-level flood-fill tests for the rewritten maps.

- [ ] **Step 1: Replace the village layout and start tile atomically**

Village:

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

Entities:

~~~text
village-recovery: recovery (2,2)
village-warden: npc (3,7), name Warden, intro main-missing-person-lead
village-artisan: npc (6,7), name Artisan, intro optional-heirloom-lead
village-scout: npc (9,7), name Scout, intro optional-route-lead
village-scribe: npc (11,7), name Scribe, intro optional-ledger-lead
village-to-floor1: portal (11,2) -> floor1 (2,14)
  asset stairs-down
  factId village-tower-stairs-used
~~~

Update createInitialGameState tile to { x: 2, y: 8 } in the same change.

- [ ] **Step 2: Replace Floor-1 geometry and section coverage**

Use:

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
    factIds: ['floor1-treasury-seen'],
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
  },
  {
    id: 'floor1-rear-wing',
    name: 'Rear Wing',
    bounds: { minX: 11, maxX: 22, minY: 1, maxY: 14 },
  },
],
~~~

Rear Wing starts at x=11 so the latch floor tile is covered.

- [ ] **Step 3: Author final Floor-1 entities**

~~~text
floor1-to-village: portal (2,14) -> village (11,2), stairs-up

floor1-front-to-floor2: portal (9,2) -> floor2 (1,8), stairs-down
  factId floor1-depth-stairs-used
  lock:
    requiresItemId tower-depth-sigil
    lockedFactId floor1-depth-seal-seen
    lockedText "A crest-shaped socket seals the lower stair."

floor1-rear-to-floor2: portal (21,3) -> floor2 (14,1), stairs-down
  factId floor1-rear-stairs-used

floor1-route-mark: clue (9,4), clue-runes
  factId floor1-route-mark-seen

floor1-treasury-overlook: clue (10,3), clue-runes
  factId floor1-treasury-sealed
  text "The arch facing the visible treasury is bricked from this side."

floor1-ledger-fragment: reward (3,4), chest-relic-closed
  grant item, itemId ledger-fragment-1, label "Ledger Fragment"

floor1-west-cache: reward (7,13), chest-relic-closed
  grant stat, defense +1

floor1-depth-sigil: reward (9,10), chest-relic-closed
  grant item, itemId tower-depth-sigil, label "Tower Sigil"

floor1-west-sentry: enemy (3,11), hp 18, attack 6, defense 3
floor1-east-sentry: enemy (9,11), hp 22, attack 7, defense 4
floor1-rear-latch: latch (11,8), rearSide east
floor1-power-core: reward (13,8), grant stat, attack +2
floor1-gatekeeper: enemy (15,10), hp 20, attack 7, defense 4
floor1-future-treasury: reward (16,7), grant stat, defense +2
~~~

The future treasury remains sealed with no Floor-1 entrance.

- [ ] **Step 4: Keep Floor 2 to reciprocal coordinates + one section**

Keep existing layout.

Keep:

~~~ts
sections: [
  {
    id: 'floor2-connector',
    name: 'Floor 2 Connector',
    bounds: { minX: 1, maxX: 14, minY: 1, maxY: 8 },
  },
],
~~~

Change only targets:

~~~text
floor2-front-to-floor1 -> floor1 (9,2)
floor2-rear-to-floor1 -> floor1 (21,3)
~~~

- [ ] **Step 5: Wire movement directly through discoverCurrentSection**

Import discoverCurrentSection and recordFact.

Do not add a withDiscoveredPosition wrapper.

Whenever movement changes tile/map, call discoverCurrentSection(nextState) directly for:

- ordinary movement;
- portal travel;
- stepping over opened reward;
- stepping over defeated enemy;
- stepping through opened latch.

Portal lock:

~~~ts
if (
  entity.lock &&
  !state.itemIds.includes(entity.lock.requiresItemId)
) {
  const next = recordFact(state, entity.lock.lockedFactId);
  return {
    ok: true,
    state: next,
    effect: {
      kind: 'accessLocked',
      text: entity.lock.lockedText,
    },
  };
}
~~~

Successful portal travel records entity.factId when present, then discovers the destination section.

- [ ] **Step 6: Add focused interaction/movement tests**

Test:

- missing sigil records floor1-depth-seal-seen, leaves map/tile unchanged, returns accessLocked;
- sigil allows travel and remains in itemIds;
- arriving at Floor 1 records floor1-entry-court and floor1-treasury-seen;
- inspecting floor1-treasury-overlook records floor1-treasury-sealed;
- first artisan conversation with floor1-treasury-sealed already known returns lineId artisan-find-other-entrance.

- [ ] **Step 7: Add authored-content validation tests**

Assert validateContent() === [] and:

~~~ts
expect(findItemRewardByItemId('tower-depth-sigil')?.id).toBe(
  'floor1-depth-sigil',
);
expect(findSectionById('floor1-upper-gallery')?.name).toBe('Upper Gallery');
expect(findSectionById('floor2-connector')?.name).toBe('Floor 2 Connector');
~~~

Failure tests:

- duplicate itemId;
- section leaves at least one walkable floor cell uncovered;
- authored fact carrier references missing FACTS id;
- authored NPC id has no dialogue table row;
- portal lock references unknown item ID.

Do not add impossible lock-shape tests; PortalLock already enforces those fields.

- [ ] **Step 8: Add lean geometry flood-fill tests**

In content.test.ts add a local helper that flood-fills '.' cells from one or more start tiles, ignoring entity blocking/combat because this is geometry validation only.

Village:

~~~ts
const villageReachable = floodFloor(village, [createInitialGameState().tile]);
for (const entity of village.entities) {
  expect(villageReachable.has(tileKey(entity.tile))).toBe(true);
}
~~~

Floor 2:

~~~ts
const floor2Front = findEntityById('floor2-front-to-floor1');
const floor2Rear = findEntityById('floor2-rear-to-floor1');
// assert both are portals, then:
expect(
  floodFloor(floor2, [floor2Front.tile]).has(tileKey(floor2Rear.tile)),
).toBe(true);
~~~

Floor 1:

~~~ts
const front = findEntityById('floor1-to-village');
const rear = findEntityById('floor1-rear-to-floor2');
// assert portal kinds
const reachable = floodFloor(floor1, [front.tile, rear.tile]);

for (const entity of floor1.entities) {
  if (entity.id === 'floor1-future-treasury') {
    expect(reachable.has(tileKey(entity.tile))).toBe(false);
  } else {
    expect(reachable.has(tileKey(entity.tile)), entity.id).toBe(true);
  }
}
~~~

This proves the sealed-pocket promise and general map connectivity without recreating gameplay state transitions.

- [ ] **Step 9: Update save round-trip with a coherent final journey**

Use:

~~~ts
const state = {
  ...createInitialGameState(),
  mapId: 'floor1' as const,
  tile: { x: 14, y: 10 },
  player: { hp: 12, maxHp: 30, attack: 12, defense: 2 },
  openedRewardIds: ['floor1-depth-sigil', 'floor1-power-core'],
  defeatedEnemyIds: ['floor1-west-sentry', 'floor1-gatekeeper'],
  openedShortcutIds: ['floor1-rear-latch'],
  itemIds: ['tower-depth-sigil'],
  factIds: [
    'main-missing-person-lead',
    'village-tower-stairs-used',
    'floor1-treasury-seen',
    'floor1-depth-stairs-used',
    'floor1-rear-stairs-used',
  ],
  discoveredSectionIds: [
    'village-square',
    'village-north-path',
    'floor1-entry-court',
    'floor1-lower-loop',
    'floor1-upper-gallery',
    'floor2-connector',
    'floor1-rear-wing',
  ],
};
~~~

Also add invalid unknown fact/item/section tests.

- [ ] **Step 10: Verify HPA-22 asset reuse**

~~~bash
bunx vitest run src/phaser/assets.test.ts
~~~

Expected: PASS with no ASSET_PATHS additions and no PNG changes.

- [ ] **Step 11: Run Task 3 domain/content gate**

~~~bash
bunx vitest run   src/game/state.test.ts   src/game/content.test.ts   src/game/actions.test.ts   src/game/movement.test.ts   src/game/save.test.ts   src/game/journal.test.ts   src/phaser/assets.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run format:check
~~~

Expected: PASS.

The existing Playwright route is now stale and may fail until Task 5; do not weaken product behavior or add test APIs to keep it temporarily green.

- [ ] **Step 12: Commit**

~~~bash
git add src/game src/phaser/assets.test.ts
git commit -m "feat: complete village and floor one progression"
~~~

---

### Task 4: Integrate journal/effect presentation with the existing overlay lifecycle

**Files:**

- Modify: src/ui/InteractionOverlay.ts
- Modify: src/main.ts
- Modify: src/styles.css
- Test: src/ui/JournalPanel.test.ts

**Interfaces:**

- InteractionOverlay OverlayView gains journal: JournalView.
- Dialogue effects display DIALOGUE_LINES[lineId].
- Journal details open state remains DOM-only and is snapshotted/restored across root replacement.
- HUD adds data-map-id.

- [ ] **Step 1: Extend effect rendering**

Import DIALOGUE_LINES.

Add:

~~~ts
case 'dialogue':
  return effect.speaker + ': ' + DIALOGUE_LINES[effect.lineId];
case 'itemReward':
  return 'Obtained ' + effect.label + '.';
case 'accessLocked':
  return effect.text;
~~~

Keep data-effect equal to effect.kind.

- [ ] **Step 2: Add journal view + stable map ID**

OverlayView adds journal: JournalView.

Map span:

~~~html
<span data-testid="map-name" data-map-id="${state.mapId}">${mapName}</span>
~~~

Append renderJournal(journal) to the normal overlay template.

- [ ] **Step 3: Preserve the single new native UI state**

Before assigning root.innerHTML:

~~~ts
const journalWasOpen =
  this.root.querySelector<HTMLDetailsElement>('[data-testid="journal"]')
    ?.open ?? false;
~~~

After replacement:

~~~ts
const journalElement =
  this.root.querySelector<HTMLDetailsElement>('[data-testid="journal"]');
if (journalElement) journalElement.open = journalWasOpen;
~~~

Then rebind current Fight/Cancel listeners as today.

Do not rebuild InteractionOverlay as a persistent cached shell in this ticket. renderInvalidSave currently replaces the root and Reset save later reuses the same overlay instance; a cached-shell design would require an additional rebuild lifecycle that HPA-235 does not otherwise need.

- [ ] **Step 4: Pass buildJournalView(session.game) from main.ts**

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

- [ ] **Step 5: Add only compact journal CSS**

Keep the journal max-width aligned with the 640px game and use small h3/ul spacing. No modal, tabs, second root, router, or component framework.

- [ ] **Step 6: Run Task 4 gate**

~~~bash
bunx vitest run src/ui/JournalPanel.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run format:check
bun run build
~~~

Expected: PASS. Playwright still uses the old route until Task 5.

- [ ] **Step 7: Commit**

~~~bash
git add src/ui src/main.ts src/styles.css
git commit -m "feat: show exploration journal"
~~~

---

### Task 5: Update the real browser journey and run the final gate

**Files:**

- Modify: tests/e2e/cross-floor.spec.ts
- Modify product files only for concrete defects found by real-browser traversal.

**Interfaces:**

- Uses only real keyboard input and player-facing DOM.
- Uses data-effect, data-map-id, data-lead, data-section, data-note, existing data-stat/testids.
- No test-only game API.

- [ ] **Step 1: Update preload-input smoke coverage**

Fresh village starts at (2,8):

~~~text
Right -> (3,8)
Up -> bump village-warden
~~~

Assert data-effect="dialogue"; do not assert the line text.

- [ ] **Step 2: Prove journal open survives overlay rerenders**

Open the journal via summary, press Right, assert the details still has open, then press Up to talk to the warden.

- [ ] **Step 3: Travel to Floor 1 and assert camera-truthful treasury knowledge**

After the warden bump, player remains at (3,8):

~~~text
Right x5
Up x3
Right x3
Up x3 -> village portal -> Floor 1 (2,14)
~~~

Assert:

~~~ts
await expect(page.getByTestId('map-name')).toHaveAttribute(
  'data-map-id',
  'floor1',
);
await expect(page.locator('[data-section="floor1-entry-court"]')).toHaveCount(
  1,
);
await expect(page.locator('[data-note="floor1-treasury-seen"]')).toHaveCount(
  1,
);
~~~

The optional floor1-treasury-overlook clue is not required in this main E2E path; unit/content tests own floor1-treasury-sealed.

- [ ] **Step 4: Fight the west sentry and collect the Tower Sigil**

From Floor 1 (2,14):

~~~text
Right
Up x3 -> bump floor1-west-sentry
Fight

Up x2
Right x4
Up
Right x2
Down -> collect floor1-depth-sigil
~~~

Assert HP loss 8, HP 22/30, and data-effect="itemReward".

- [ ] **Step 5: Reach the front Floor-2 stair**

After collecting the sigil, player remains at (9,9).

Use the verified shortest authored path to (9,3):

~~~text
Left x2
Down
Left x3
Up x6
Right x2
Up
Right x3
~~~

This is 18 movement presses. Removing the optional overlook bump saves only that bump; the stair still requires the maze traversal.

Then:

~~~text
Up -> front Floor-2 portal -> Floor 2 (1,8)
~~~

Assert data-map-id="floor2" and data-section="floor2-connector".

Reload and assert floor1-entry-court/floor1-treasury-seen/floor2-connector discovery survives.

- [ ] **Step 6: Traverse Floor 2 to rear Floor 1**

From (1,8):

~~~text
Right x13
Up x7 -> rear portal -> Floor 1 (21,3)
~~~

Assert data-map-id="floor1".

- [ ] **Step 7: Prove the HPA-237 power-core/combat/latch loop**

From rear arrival:

~~~text
Left
Down x7
Left x4
Left -> gatekeeper prompt
Cancel
~~~

Assert HP loss 15.

Then:

~~~text
Down
Left x3
Up x3 -> collect floor1-power-core
~~~

Assert ATK 12.

Then:

~~~text
Down
Right x2 -> gatekeeper prompt
Fight
~~~

Assert HP loss 10 and final HP 12/30 after the earlier west-sentry fight.

Then:

~~~text
Left x2
Up x2
Left -> open rear latch
Left x2 -> cross to front
~~~

Reload, traverse the open latch in both directions, and assert no blocked-reason.

- [ ] **Step 8: Keep early-discovery ordering and topology in unit tests**

Do not add a second long E2E for artisan/scribe ordering or the sealed treasury pocket.

Unit/content tests already prove:

- first NPC selection acknowledges prior evidence;
- journal lead IDs change from facts/items;
- the treasury is geometry-sealed;
- all other authored entity tiles are floor-connected from legitimate front/rear entries.

- [ ] **Step 9: Run Playwright**

~~~bash
bun run test:e2e -- tests/e2e/cross-floor.spec.ts
~~~

Expected: PASS.

If a count fails, re-walk the authored maze and fix the test or real map defect. Do not add teleport APIs or hidden game-state hooks.

- [ ] **Step 10: Run every CI-equivalent gate**

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

- [ ] **Step 11: Inspect scope**

~~~bash
git diff main...HEAD --stat
git diff main...HEAD -- public/assets
~~~

Confirm:

- no new/changed PNGs;
- no Floor-2 gameplay expansion;
- no save migration/version field;
- no quest/event DSL;
- no UI framework/persistent-shell refactor;
- no consumable-key system.

- [ ] **Step 12: Commit browser coverage**

~~~bash
git add tests/e2e/cross-floor.spec.ts
git commit -m "test: cover complete floor one progression"
~~~

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

Manually verify:

1. four village NPCs are understandable while sharing the guide sprite;
2. first conversations select context-aware lines for previously discovered evidence;
3. journal remains open while moving;
4. journal uses lead IDs/registered fact notes and provides no exact route;
5. treasury is visibly present on Floor-1 arrival and the optional overlook explains that the approach is sealed;
6. Tower Sigil opens the Floor-2 stair and is not consumed;
7. Floor 1 has two meaningful entry approaches;
8. optional cache/ledger/quest evidence is not required for progression;
9. HPA-237 rear reward/combat/latch loop still works;
10. reload preserves exact position, stats, opened/defeated entities, items, facts, and sections.

## Risks to Watch During Execution

1. **Closed-union cut:** Task 1 must update actions/save/assets/content/fixtures together before claiming typecheck.
2. **Camera truth:** floor1-treasury-seen is an Entry Court fact because the actual clamped viewport displays the chest there.
3. **Section coverage:** every floor cell must resolve to at least one authored section.
4. **E2E key counts:** the geometry rewrite intentionally invalidates the old route until Task 5.
5. **Fact drift:** every fact carrier must point at FACTS; save validation should never scrape carriers to discover legal IDs.
6. **Dialogue drift:** every NPC ID must have authored dialogue coverage.
7. **Overlay lifecycle:** snapshot/restore only journal.open; do not introduce cached-shell rebuild complexity.
8. **Art scope:** all new content uses HPA-22 assets.

## Self-Review

### Review findings addressed

- Treasury visibility follows the actual camera; seen is recorded on Entry Court arrival, sealed is a separate optional clue.
- Domain journal tests assert lead IDs, not prose; JournalPanel owns lead copy.
- Dialogue copy moved into game/content; selector returns DialogueLineId.
- Portal lock is one nested optional object.
- FACTS replaces collectKnownFactIds and the observation-text switch.
- Section coverage, fact references, NPC dialogue coverage, and lock item reference are build-time validation.
- Geometry flood fill protects the sealed treasury and connector path.
- E2E-red intermediate map commits are explicitly documented.
- Save fixture includes the facts expected from its reference journey.
- No redundant discoverCurrentSection wrapper, coordinate-regex test, or injection test remains.
- Persistent-shell overlay refactor was intentionally not taken: the current invalid-save reset lifecycle makes it broader than the single journal-open requirement.

### Scope

The implementation remains one PR, no new art, no save migration, no quest engine, no Floor-2 feature expansion, and no UI framework.
