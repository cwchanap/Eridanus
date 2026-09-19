# HPA-235 Complete Village and Floor 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Complete the starting village and Floor 1 with fact-driven dialogue/journal notes, a reusable Floor-2 access item, authored exploration content, and persisted discovery while retaining the HPA-237 rear-route regression loop.

**Architecture:** Extend the existing pure TypeScript domain with three durable ID arrays: carried items, facts, and discovered sections. Dialogue and journal/map notes are pure derived views. Existing exhaustive switches, persistence, and assets are updated in the first compile-safe contract cut; final village/Floor-1 content and movement discovery/access rules land together so every task has an honest green gate.

**Tech Stack:** Bun 1.4.2, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, Vite 8, framework-free DOM UI.

**Spec:** docs/superpowers/specs/2026-09-18-hpa-235-village-floor1-design.md

## Global Constraints

- One ticket = one PR. Continue implementation on this same HPA-235 branch/PR.
- Do not add a generic quest engine, event DSL, branching narrative engine, inventory UI, UI framework, or second durable state owner.
- Do not add consumable keys in HPA-235.
- Do not add save versioning or migrations; old development snapshots may become invalid and use the existing explicit reset flow.
- Do not generate new image art in this ticket. Reuse the HPA-22 asset catalog. Any genuinely required new image work becomes a separate art ticket/PR.
- Keep Floor 2 limited to the already-shipped connector, reciprocal target-coordinate updates, and one discovery section.
- Required Floor-2 access must not depend on optional quest progress or optional treasure.
- Every task that advertises typecheck must update all closed-union consumers and direct GameState literals needed for that typecheck to pass.

---

## File Map

Create:

- src/game/progress.ts — idempotent fact/item recording and section discovery.
- src/game/progress.test.ts — progress helper coverage.
- src/game/dialogue.ts — explicit NPC dialogue resolver.
- src/game/dialogue.test.ts — first/follow-up and early-discovery dialogue tests.
- src/game/journal.ts — derived main/optional leads, known areas, and observations.
- src/game/journal.test.ts — early-discovery and journal derivation tests.
- src/ui/JournalPanel.ts — pure journal HTML string renderer.
- src/ui/JournalPanel.test.ts — stable markup seam coverage.

Modify:

- src/game/types.ts — ClueEntity.factId, NpcEntity, MapSection, discriminated reward grants, portal access metadata, durable state/effects.
- src/game/state.ts / state.test.ts — initialize new arrays; final start tile lands with final village content.
- src/game/content.ts / content.test.ts — section/fact/item helpers and stricter authored-content validation.
- src/game/content/village.ts — baseline section in Task 1; complete compact hub in Task 3.
- src/game/content/floor1.ts — baseline section + grant discriminant in Task 1; complete Floor-1 maze/content in Task 3.
- src/game/content/floor2.ts — connector section in Task 1; reciprocal target coordinates in Task 3.
- src/game/actions.ts / actions.test.ts — clue facts, NPC dialogue ordering, discriminated rewards.
- src/game/movement.ts / movement.test.ts — section discovery and reusable-item portal gate.
- src/game/save.ts / save.test.ts — new durable fields, NPC blocking, fact/item/section validation.
- src/game/session.test.ts — direct GameState fixture update.
- src/phaser/assets.ts / assets.test.ts — safe NPC default and discriminated reward fixture.
- src/ui/InteractionOverlay.ts — new effect text, stable attributes, JournalPanel integration, details-open preservation.
- src/main.ts — pass derived JournalView to overlay.
- src/styles.css — compact journal layout.
- tests/e2e/cross-floor.spec.ts — HPA-235 authored journey using stable data attributes.

---

### Task 1: Land the compile-safe progress contracts

**Files:**

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
- Produces MapSection and MapDefinition.sections.
- Produces ClueEntity.factId?, NpcEntity, RewardEntity.grant, and strict portal lock metadata.
- Produces recordFact(state, id), recordFacts(state, ids), addItem(state, id), discoverCurrentSection(state).
- Produces resolveNpcDialogue(npcId, state).
- Produces findSectionById(id), collectKnownFactIds(), findItemRewardByItemId(itemId).
- Keeps the repository compiling before final HPA-235 content is authored.

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

it('records facts and items once while preserving object identity on repeats', () => {
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

- [ ] **Step 2: Extend the closed types completely**

In src/game/types.ts change ClueEntity to:

~~~ts
export type ClueEntity = BaseEntity &
  Readonly<{
    kind: 'clue';
    text: string;
    factId?: string;
  }>;
~~~

Add:

~~~ts
export type NpcEntity = BaseEntity &
  Readonly<{
    kind: 'npc';
    name: string;
    introFactId: string;
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

Replace RewardEntity with:

~~~ts
export type RewardEntity = BaseEntity &
  Readonly<{ kind: 'reward' }> &
  (
    | Readonly<{
        grant: 'stat';
        stat: Stat;
        amount: number;
      }>
    | Readonly<{
        grant: 'item';
        itemId: string;
        label: string;
      }>
  );
~~~

Extend PortalEntity:

~~~ts
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

Add NpcEntity to Entity, sections to MapDefinition, and append to GameState:

~~~ts
itemIds: readonly string[];
factIds: readonly string[];
discoveredSectionIds: readonly string[];
~~~

Add ActionEffect variants:

~~~ts
| { kind: 'dialogue'; speaker: string; text: string }
| { kind: 'itemReward'; itemId: string; label: string }
| { kind: 'accessLocked'; text: string }
~~~

- [ ] **Step 3: Make current authored content satisfy the new types before the full rewrite**

Do not change current geometry/portal coordinates yet.

Add baseline sections:

src/game/content/village.ts:

~~~ts
sections: [
  {
    id: 'village-square',
    name: 'Village Square',
    bounds: { minX: 1, maxX: 10, minY: 1, maxY: 6 },
  },
],
~~~

src/game/content/floor1.ts:

~~~ts
sections: [
  {
    id: 'floor1-proof',
    name: 'Tower Floor 1',
    bounds: { minX: 1, maxX: 16, minY: 1, maxY: 10 },
  },
],
~~~

src/game/content/floor2.ts:

~~~ts
sections: [
  {
    id: 'floor2-connector',
    name: 'Floor 2 Connector',
    bounds: { minX: 1, maxX: 14, minY: 1, maxY: 8 },
  },
],
~~~

Add grant: 'stat' to the existing floor1-power-core reward.

This baseline exists only to make the new required MapDefinition/reward contracts compile cleanly before Task 3 replaces the village/Floor-1 content.

- [ ] **Step 4: Initialize the new state without moving the current start tile yet**

Keep the current tile { x: 2, y: 5 } until Task 3 changes village geometry.

src/game/state.ts adds:

~~~ts
itemIds: [],
factIds: [],
discoveredSectionIds: ['village-square'],
~~~

Update state.test.ts accordingly.

- [ ] **Step 5: Implement progress helpers**

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

- [ ] **Step 6: Implement explicit dialogue before adding NPC content**

src/game/dialogue.ts:

~~~ts
import type { GameState } from './types';

export function resolveNpcDialogue(
  npcId: string,
  state: GameState,
): string {
  switch (npcId) {
    case 'village-warden':
      if (state.itemIds.includes('tower-depth-sigil'))
        return 'That sigil matches the lower seal. The stair to the next floor should open now.';
      if (state.factIds.includes('main-missing-person-lead'))
        return 'Search the first floor for the crest that opens the lower stair.';
      return 'Our courier entered the silent tower and never returned. Find what stopped the bells.';

    case 'village-artisan':
      if (state.factIds.includes('floor1-treasury-seen'))
        return 'That sealed treasury is the workshop. There must be another entrance from below.';
      if (state.factIds.includes('optional-heirloom-lead'))
        return 'Look for a sealed workshop or treasury on the first floor.';
      return 'My family workshop was sealed inside the tower. If you glimpse it, remember where it sits.';

    case 'village-scout':
      if (state.factIds.includes('floor1-route-mark-seen'))
        return 'Those scratches match the old plan. The route probably rejoins from below.';
      if (state.factIds.includes('optional-route-lead'))
        return 'Inspect the upper routes for old direction marks.';
      return 'An old plan shows a return passage where no corridor should exist. Watch for route scratches.';

    case 'village-scribe':
      if (state.itemIds.includes('ledger-fragment-1'))
        return 'This fragment mentions paired mechanisms. More pages must survive deeper in the tower.';
      if (state.factIds.includes('optional-ledger-lead'))
        return 'Search the first floor for a surviving ledger fragment.';
      return 'The tower keeper recorded every mechanism. Bring back any ledger fragment you find.';

    default:
      throw new Error('Unknown NPC: ' + npcId);
  }
}
~~~

Dialogue tests include the early-evidence cases directly, without requiring authored NPC entities yet:

~~~ts
it('acknowledges treasury evidence on the first artisan conversation state', () => {
  const state = {
    ...createInitialGameState(),
    factIds: ['floor1-treasury-seen', 'optional-heirloom-lead'],
  };
  expect(resolveNpcDialogue('village-artisan', state)).toContain(
    'another entrance',
  );
});

it('acknowledges an early ledger fragment on first scribe context', () => {
  const state = {
    ...createInitialGameState(),
    itemIds: ['ledger-fragment-1'],
    factIds: ['optional-ledger-lead'],
  };
  expect(resolveNpcDialogue('village-scribe', state)).toContain('fragment');
});
~~~

- [ ] **Step 7: Extend actions exhaustively now**

Import addItem, recordFact, and resolveNpcDialogue.

Clue:

~~~ts
case 'clue': {
  const next = entity.factId
    ? recordFact(state, entity.factId)
    : state;
  return {
    ok: true,
    state: next,
    effect: { kind: 'clue', text: entity.text },
  };
}
~~~

NPC ordering must be:

~~~ts
case 'npc': {
  const next = recordFact(state, entity.introFactId);
  const text = resolveNpcDialogue(entity.id, next);
  return {
    ok: true,
    state: next,
    effect: { kind: 'dialogue', speaker: entity.name, text },
  };
}
~~~

Reward uses the discriminant:

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

Add an actions test using a synthetic village-artisan NpcEntity and pre-existing floor1-treasury-seen. Assert one bump both appends optional-heirloom-lead and returns dialogue containing another entrance.

- [ ] **Step 8: Add content lookup helpers and strict validation**

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
        candidate.grant === 'item' &&
        candidate.itemId === itemId,
    );
  return entity?.kind === 'reward' && entity.grant === 'item'
    ? entity
    : undefined;
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

Extend validateContent so current/future authored maps fail for:

- duplicate section IDs;
- section bounds outside the map or inverted;
- duplicate itemIds across grant: 'item' rewards;
- empty present fact IDs;
- requiresItemId without non-empty lockedText;
- requiresItemId without non-empty lockedFactId;
- requiresItemId that does not match an authored item reward.

Keep reciprocal portal and existing geometry/entity checks.

Do not use lockedText ?? fallback in the future movement implementation; validation owns completeness.

- [ ] **Step 9: Extend save shape/content and exhaustive blocking now**

hasValidShape must require itemIds, factIds, discoveredSectionIds as string arrays.

isTileOccupiedByBlockingEntity adds:

~~~ts
case 'npc':
  return true;
~~~

hasValidContent adds:

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
    reward.grant === 'item' &&
    !state.itemIds.includes(reward.itemId)
  )
    return false;
}
~~~

At this checkpoint current content has no item rewards/facts, so fresh/current saves remain valid and old development saves missing the new arrays become invalid-shape by design.

- [ ] **Step 10: Add the NPC safe asset default**

In src/phaser/assets.ts:

~~~ts
if (entity.kind === 'npc') return 'npc-village-guide';
~~~

Keep explicit assetId higher priority.

Update the RewardEntity test fixture:

~~~ts
const testReward: RewardEntity = {
  kind: 'reward',
  grant: 'stat',
  id: 'test-reward',
  tile: { x: 1, y: 1 },
  assetId: 'chest-relic-closed',
  stat: 'attack',
  amount: 1,
};
~~~

Add a synthetic NpcEntity resolver assertion:

~~~ts
expect(resolveEntityAsset(
  {
    kind: 'npc',
    id: 'test-npc',
    name: 'Guide',
    introFactId: 'test-guide-intro',
    tile: { x: 1, y: 1 },
  },
  createInitialGameState(),
)).toBe('npc-village-guide');
~~~

Do not add an ASSET_PATHS row.

- [ ] **Step 11: Update every direct GameState literal before typecheck**

At minimum update:

- src/game/movement.test.ts base GameState;
- src/game/session.test.ts pending.game;
- src/game/save.test.ts round-trips-every-durable-field literal;
- src/game/state.test.ts exact initial-state expectation.

Append:

~~~ts
itemIds: [],
factIds: [],
discoveredSectionIds: ['village-square'],
~~~

Use spreads from createInitialGameState where already present; do not duplicate new arrays unnecessarily.

- [ ] **Step 12: Run the real Task 1 gate**

~~~bash
bunx vitest run   src/game/state.test.ts   src/game/progress.test.ts   src/game/dialogue.test.ts   src/game/actions.test.ts   src/game/content.test.ts   src/game/save.test.ts   src/phaser/assets.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run format:check
~~~

Expected: PASS. This is the first advertised typecheck after every immediately affected closed-union consumer and fixture is updated.

- [ ] **Step 13: Commit**

~~~bash
git add src/game src/phaser/assets.ts src/phaser/assets.test.ts
git commit -m "feat: add fact-driven progress contracts"
~~~

---

### Task 2: Derive the journal and stable journal markup

**Files:**

- Create: src/game/journal.ts
- Create: src/game/journal.test.ts
- Create: src/ui/JournalPanel.ts
- Create: src/ui/JournalPanel.test.ts

**Interfaces:**

- Produces JournalEntry, JournalSection, JournalObservation, JournalView.
- Produces buildJournalView(state).
- Produces renderJournal(view): string with stable data attributes.
- Does not mutate state or depend on DOM APIs.

- [ ] **Step 1: Write failing journal tests**

Add:

~~~ts
it('keeps optional quests hidden until context is learned', () => {
  const state = {
    ...createInitialGameState(),
    factIds: ['floor1-treasury-seen'],
  };
  expect(buildJournalView(state).optional).toEqual([]);
});

it('interprets an early treasury observation as soon as its context is learned', () => {
  const state = {
    ...createInitialGameState(),
    factIds: ['floor1-treasury-seen', 'optional-heirloom-lead'],
  };
  const heirloom = buildJournalView(state).optional.find(
    (entry) => entry.id === 'heirloom',
  );
  expect(heirloom?.lead).toContain('another entrance');
});

it('does not expose exact coordinates as guidance', () => {
  const view = buildJournalView({
    ...createInitialGameState(),
    factIds: ['main-missing-person-lead', 'floor1-depth-seal-seen'],
  });
  expect(JSON.stringify(view)).not.toMatch(/\b\d+,\d+\b/);
});
~~~

- [ ] **Step 2: Implement JournalView without a status field**

src/game/journal.ts defines:

~~~ts
export type JournalEntry = Readonly<{
  id: string;
  title: string;
  lead: string;
}>;

export type JournalSection = Readonly<{
  id: string;
  name: string;
}>;

export type JournalObservation = Readonly<{
  id: string;
  text: string;
}>;

export type JournalView = Readonly<{
  main: JournalEntry;
  optional: readonly JournalEntry[];
  sections: readonly JournalSection[];
  observations: readonly JournalObservation[];
}>;
~~~

Main entry:

- no main-missing-person-lead -> Speak with the village warden near the square.
- main lead learned, no tower-depth-sigil -> Search Floor 1 for the reusable tower sigil.
- tower-depth-sigil carried -> The sigil opens the lower stair. Descend to Floor 2.

Optional entries appear only when their intro fact exists:

- heirloom: switches to another-entrance wording when floor1-treasury-seen exists;
- route: switches to verify-return wording when floor1-route-mark-seen exists;
- ledger: switches to later-pages wording when ledger-fragment-1 is carried.

Sections resolve discoveredSectionIds through findSectionById into { id, name }.

Observations are { id, text } values for:

~~~text
village-tower-stairs-used
floor1-depth-seal-seen
floor1-treasury-seen
floor1-route-mark-seen
floor1-depth-stairs-used
floor1-rear-stairs-used
~~~

- [ ] **Step 3: Implement the pure JournalPanel renderer**

src/ui/JournalPanel.ts includes a tiny local escapeText helper and emits:

~~~html
<details data-testid="journal">
  <summary>Journal</summary>
  <h3>Main</h3>
  <p data-testid="main-lead" data-lead="main">...</p>
  <h3>Optional</h3>
  <ul data-testid="optional-leads">
    <li data-lead="heirloom">...</li>
  </ul>
  <h3>Known areas</h3>
  <ul data-testid="known-areas">
    <li data-section="floor1-upper-gallery">Upper Gallery</li>
  </ul>
  <h3>Notes</h3>
  <ul data-testid="map-notes">
    <li data-note="floor1-treasury-seen">...</li>
  </ul>
</details>
~~~

Render actual view data rather than hardcoding these example rows.

- [ ] **Step 4: Test stable markup seams**

JournalPanel.test.ts calls renderJournal with a literal JournalView and asserts the returned string contains:

~~~text
data-testid="journal"
data-lead="main"
data-lead="heirloom"
data-section="floor1-upper-gallery"
data-note="floor1-treasury-seen"
~~~

Also assert escaped display text does not inject a literal <script> tag.

No jsdom/UI framework dependency is needed because renderJournal returns a string.

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
git commit -m "feat: derive journal from exploration facts"
~~~

---

### Task 3: Author the complete village/Floor 1 and wire exploration access

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

- Consumes Task 1 contracts/helpers and Task 2 read models.
- Produces the complete HPA-235 authored content.
- Produces movement-driven section discovery and reusable-item portal locking.
- Keeps Floor 2 as the existing connector plus floor2-connector discovery.

- [ ] **Step 1: Replace the village layout and move the start tile atomically**

src/game/content/village.ts:

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

Use:

~~~text
village-recovery: recovery at (2,2)
village-warden: npc at (3,7), name Warden, introFactId main-missing-person-lead
village-artisan: npc at (6,7), name Artisan, introFactId optional-heirloom-lead
village-scout: npc at (9,7), name Scout, introFactId optional-route-lead
village-scribe: npc at (11,7), name Scribe, introFactId optional-ledger-lead
village-to-floor1: portal at (11,2) -> floor1 (2,14), factId village-tower-stairs-used, asset stairs-down
~~~

Do not set assetId on NPCs; the Task 1 NPC default owns that shared visual.

In the same step update createInitialGameState tile to { x: 2, y: 8 } and keep discoveredSectionIds: ['village-square'].

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
  },
  {
    id: 'floor1-rear-wing',
    name: 'Rear Wing',
    bounds: { minX: 12, maxX: 22, minY: 1, maxY: 14 },
  },
],
~~~

Do not attach floor1-treasury-seen to the whole Upper Gallery.

- [ ] **Step 3: Author the Floor-1 entities with explicit grant discriminants**

Use:

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

floor1-treasury-overlook: clue (10,3), clue-runes
  factId floor1-treasury-seen
  text "Through a broken arch, a sealed treasury is visible across the stonework."

floor1-ledger-fragment: reward (3,4), chest-relic-closed
  grant item
  itemId ledger-fragment-1
  label "Ledger Fragment"

floor1-west-cache: reward (7,13), chest-relic-closed
  grant stat
  stat defense
  amount 1

floor1-depth-sigil: reward (9,10), chest-relic-closed
  grant item
  itemId tower-depth-sigil
  label "Tower Sigil"

floor1-west-sentry: enemy (3,11), enemy-ruin-guard
  hp 18, attack 6, defense 3

floor1-east-sentry: enemy (9,11), enemy-ruin-guard
  hp 22, attack 7, defense 4

floor1-rear-latch: latch (11,8), rearSide east

floor1-power-core: reward (13,8), chest-relic-closed
  grant stat
  stat attack
  amount 2

floor1-gatekeeper: enemy (15,10), enemy-ruin-guard
  hp 20, attack 7, defense 4

floor1-future-treasury: reward (16,7), chest-relic-closed
  grant stat
  stat defense
  amount 2
~~~

The treasury room has no Floor-1 entrance.

- [ ] **Step 4: Keep Floor 2 unchanged except reciprocal coordinates**

Keep its Task 1 floor2-connector section and existing layout.

Change only:

~~~text
floor2-front-to-floor1 target -> floor1 (9,2)
floor2-rear-to-floor1 target -> floor1 (21,3)
~~~

Do not add other Floor-2 content.

- [ ] **Step 5: Add movement-driven section discovery**

In src/game/movement.ts:

~~~ts
function withDiscoveredPosition(state: GameState): GameState {
  return discoverCurrentSection(state);
}
~~~

Every branch that changes map/tile passes the next state through that helper:

- ordinary movement;
- portal travel;
- stepping onto an opened reward;
- stepping onto a defeated enemy;
- stepping through an opened latch.

Bump interactions do not call it because the player did not change position.

- [ ] **Step 6: Add the strict reusable-item portal branch**

Before portal travel:

~~~ts
if (
  entity.requiresItemId &&
  !state.itemIds.includes(entity.requiresItemId)
) {
  const next = recordFact(state, entity.lockedFactId!);
  return {
    ok: true,
    state: next,
    effect: {
      kind: 'accessLocked',
      text: entity.lockedText!,
    },
  };
}
~~~

The non-null assertions are allowed here because validateContent rejects any requiresItemId portal missing either field. Do not add fallback lock copy.

Successful travel:

1. records entity.factId when present;
2. changes map/tile;
3. calls withDiscoveredPosition.

The required item remains in itemIds.

- [ ] **Step 7: Add focused movement/action tests**

Locked stair:

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
~~~

Reusable item:

~~~ts
it('uses but does not consume the tower sigil', () => {
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
  expect(result.state.discoveredSectionIds).toContain('floor2-connector');
});
~~~

Treasury overlook:

~~~ts
it('records the treasury only when the overlook clue is inspected', () => {
  const clue = findEntityById('floor1-treasury-overlook');
  if (!clue || clue.kind !== 'clue') throw new Error('overlook missing');
  const state = {
    ...createInitialGameState(),
    mapId: 'floor1' as const,
    tile: { x: 9, y: 3 },
    discoveredSectionIds: ['floor1-upper-gallery'],
  };
  const result = interactWithEntity(state, clue, state.tile);
  expect(result.ok && result.state.factIds).toContain('floor1-treasury-seen');
});
~~~

- [ ] **Step 8: Tighten content tests with the final authored content**

Assert:

~~~ts
expect(validateContent()).toEqual([]);
expect(findItemRewardByItemId('tower-depth-sigil')?.id).toBe(
  'floor1-depth-sigil',
);
expect(findSectionById('floor1-upper-gallery')?.name).toBe('Upper Gallery');
expect(findSectionById('floor2-connector')?.name).toBe('Floor 2 Connector');
~~~

Add explicit failure tests for:

- duplicate itemId;
- requiresItemId with missing lockedText;
- requiresItemId with missing lockedFactId;
- unknown requiresItemId.

Assert initial placement:

~~~ts
const start = createInitialGameState();
const startSection = findSectionById('village-square');
expect(startSection).toBeDefined();
expect(start.mapId).toBe('village');
expect(start.tile.x).toBeGreaterThanOrEqual(startSection!.bounds.minX);
expect(start.tile.x).toBeLessThanOrEqual(startSection!.bounds.maxX);
expect(start.tile.y).toBeGreaterThanOrEqual(startSection!.bounds.minY);
expect(start.tile.y).toBeLessThanOrEqual(startSection!.bounds.maxY);
~~~

- [ ] **Step 9: Add final save validation coverage**

Add unknown fact/item/section rejection tests.

Update the durable round-trip with internally consistent final content:

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
    'floor1-treasury-seen',
    'floor1-depth-stairs-used',
  ],
  discoveredSectionIds: [
    'village-square',
    'floor1-entry-court',
    'floor1-lower-loop',
    'floor1-upper-gallery',
    'floor2-connector',
    'floor1-rear-wing',
  ],
};
~~~

- [ ] **Step 10: Verify every new entity resolves through existing HPA-22 art**

~~~bash
bunx vitest run src/phaser/assets.test.ts
~~~

Expected: PASS without changing ASSET_PATHS and without new PNG files.

- [ ] **Step 11: Run Task 3 gate**

~~~bash
bunx vitest run   src/game/state.test.ts   src/game/content.test.ts   src/game/actions.test.ts   src/game/movement.test.ts   src/game/save.test.ts   src/game/journal.test.ts   src/phaser/assets.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run format:check
~~~

Expected: PASS.

- [ ] **Step 12: Commit**

~~~bash
git add src/game src/phaser/assets.test.ts
git commit -m "feat: complete village and floor one progression"
~~~

---

### Task 4: Integrate the journal without losing native open state

**Files:**

- Modify: src/ui/InteractionOverlay.ts
- Modify: src/main.ts
- Modify: src/styles.css
- Test: src/ui/JournalPanel.test.ts

**Interfaces:**

- InteractionOverlay OverlayView gains journal: JournalView.
- main.ts builds JournalView from session.game on every render.
- Journal details open/closed state remains DOM-only but survives root innerHTML replacement.
- HUD exposes data-map-id for stable E2E map assertions.

- [ ] **Step 1: Extend effect text exhaustively**

Add:

~~~ts
case 'dialogue':
  return effect.speaker + ': ' + effect.text;
case 'itemReward':
  return 'Obtained ' + effect.label + '.';
case 'accessLocked':
  return effect.text;
~~~

Keep existing action markup with data-effect equal to effect.kind so dialogue/itemReward/accessLocked are asserted by kind, not English copy.

- [ ] **Step 2: Add JournalView to OverlayView**

Import JournalView and renderJournal, then add:

~~~ts
journal: JournalView;
~~~

Add a stable map ID to the existing map-name span:

~~~html
<span data-testid="map-name" data-map-id="${state.mapId}">${mapName}</span>
~~~

- [ ] **Step 3: Snapshot journal open state before replacing innerHTML**

At the start of render():

~~~ts
const journalWasOpen =
  this.root.querySelector<HTMLDetailsElement>('[data-testid="journal"]')
    ?.open ?? false;
~~~

Append renderJournal(journal) to the root template.

After assigning innerHTML:

~~~ts
const journalElement =
  this.root.querySelector<HTMLDetailsElement>('[data-testid="journal"]');
if (journalElement) journalElement.open = journalWasOpen;
~~~

Then re-bind Fight/Cancel listeners exactly as today.

Do not store journalWasOpen on GameState, SessionState, InteractionOverlay fields, or LocalStorage.

- [ ] **Step 4: Pass the derived journal from main.ts**

renderOverlay():

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

Invalid-save rendering remains its separate reset-only view.

- [ ] **Step 5: Add only compact journal CSS**

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

No modal, tabs, router, component framework, or second UI root.

- [ ] **Step 6: Run Task 4 gate**

~~~bash
bunx vitest run src/ui/JournalPanel.test.ts
bun run test:unit
bun run typecheck
bun run lint
bun run format:check
bun run build
~~~

Expected: PASS. The exhaustive ActionEffect switch makes omitted new effects a compile error.

- [ ] **Step 7: Commit**

~~~bash
git add src/ui src/main.ts src/styles.css
git commit -m "feat: show persistent exploration journal"
~~~

---

### Task 5: Prove the HPA-235 browser journey and retained HPA-237 loop

**Files:**

- Modify: tests/e2e/cross-floor.spec.ts
- Modify product files only for concrete route/readability defects found by the real browser proof.

**Interfaces:**

- Uses only real keyboard input and player-facing DOM.
- Uses data-effect, data-map-id, data-lead, data-section, data-note, and existing data-stat/testids.
- No test-only game API.

- [ ] **Step 1: Update the preload-input smoke test**

Hold PNG requests as today.

Fresh village starts at (2,8):

~~~text
Right -> (3,8)
Up -> bump village-warden at (3,7)
~~~

Assert data-effect="dialogue". Do not assert the authored sentence.

- [ ] **Step 2: Prove journal open state survives movement**

At fresh start:

~~~ts
const journal = page.getByTestId('journal');
await journal.locator('summary').click();
await expect(journal).toHaveAttribute('open', '');

await page.keyboard.press('ArrowRight', { delay: 50 });
await expect(journal).toHaveAttribute('open', '');
~~~

Continue with Up to talk to the warden and assert data-effect="dialogue".

- [ ] **Step 3: Travel through the village using the final authored route**

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
await expect(page.locator('[data-lead="main"]')).toHaveCount(1);
~~~

Do not assert the English main-lead copy.

- [ ] **Step 4: Fight the west sentry and collect the required sigil**

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

Assertions:

~~~ts
await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 8');
await page.getByRole('button', { name: 'Fight' }).click();
await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 22/30');

const itemEffect = page
  .getByTestId('interaction')
  .locator('[data-effect="itemReward"]');
await expect(itemEffect).toHaveAttribute('data-effect', 'itemReward');
~~~

The HP/combat numbers are rule outputs, not authored prose.

- [ ] **Step 5: Reach the actual treasury overlook before Floor 2**

After collecting the sigil, player remains at (9,9):

~~~text
Left x3
Down
Left x2
Up x6
Right x4
Up
Right -> (9,3)
Right -> bump floor1-treasury-overlook at (10,3)
~~~

Assert:

~~~ts
await expect(page.locator('[data-section="floor1-upper-gallery"]')).toHaveCount(
  1,
);
await expect(page.locator('[data-note="floor1-treasury-seen"]')).toHaveCount(
  1,
);
~~~

This proves the treasury note appears only after the explicit overlook inspection, not merely on first entering the broad gallery.

- [ ] **Step 6: Use the reusable sigil to enter Floor 2**

From (9,3):

~~~text
Up -> floor1-front-to-floor2 -> Floor 2 (1,8)
~~~

Assert data-map-id="floor2" and data-section="floor2-connector".

Reload immediately and assert:

- data-map-id remains floor2;
- data-section="floor1-upper-gallery" still exists;
- data-note="floor1-treasury-seen" still exists.

The focused movement unit test already proves tower-depth-sigil remains in itemIds after travel; do not add a second long browser detour just to inspect the array indirectly.

- [ ] **Step 7: Traverse the existing Floor-2 connector to the rear Floor-1 portal**

From Floor 2 (1,8):

~~~text
Right x13
Up x7 -> rear portal -> Floor 1 (21,3)
~~~

Assert data-map-id="floor1".

- [ ] **Step 8: Prove the HPA-237 reward/combat/latch regression with exact final geometry**

From Floor 1 rear arrival at (21,3):

~~~text
Left
Down x7
Left x4
Left -> bump floor1-gatekeeper
Cancel
~~~

Before the power core:

~~~ts
await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 15');
await page.getByRole('button', { name: 'Cancel' }).click();
~~~

Collect power core from player tile (16,10):

~~~text
Down
Left x3
Up x3 -> collect floor1-power-core
~~~

Assert ATK 12.

Re-approach gatekeeper from player tile (13,9):

~~~text
Down
Right x2 -> bump gatekeeper
Fight
~~~

Assert:

~~~ts
await expect(page.getByTestId('combat-hp-loss')).toHaveText('HP loss: 10');
await page.getByRole('button', { name: 'Fight' }).click();
await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 12/30');
~~~

The earlier west-sentry fight costs 8 HP, then this fight costs 10 HP.

From player tile (14,10):

~~~text
Left x2
Up x2
Left -> open floor1-rear-latch from east/rear side
Left x2 -> cross open latch to front side
~~~

Reload. Then walk:

~~~text
Right x2
Left x2
~~~

Assert no blocked-reason appears; unit tests continue to own exact latch-side semantics.

- [ ] **Step 9: Keep early-discovery ordering in unit tests**

Do not add another long Playwright route solely to discover evidence before talking to the artisan/scribe.

dialogue.test.ts and journal.test.ts already prove:

- evidence can predate quest context;
- first NPC bump resolves dialogue after introFactId is recorded;
- optional journal entry stays hidden until context exists;
- once context appears, the entry immediately interprets prior evidence.

- [ ] **Step 10: Run the browser proof**

~~~bash
bun run test:e2e -- tests/e2e/cross-floor.spec.ts
~~~

Expected: PASS.

If counted key presses fail, re-walk the authored route and correct the test or genuine map defect. Do not add teleport APIs, hidden state hooks, or route arrows.

- [ ] **Step 11: Run every CI-equivalent gate**

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

- [ ] **Step 12: Inspect scope before review**

~~~bash
git diff main...HEAD --stat
git diff main...HEAD -- public/assets
~~~

Expected:

- no new/changed PNG assets;
- no Floor-2 expansion beyond reciprocal coordinates + floor2-connector section;
- no save migration/version field;
- no quest/event DSL;
- no UI framework;
- no consumable-key subsystem.

- [ ] **Step 13: Commit browser coverage**

~~~bash
git add tests/e2e/cross-floor.spec.ts
git commit -m "test: cover complete floor one progression"
~~~

Include small product corrections in this commit only when required by the real browser proof.

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

1. four village NPCs are understandable despite sharing the guide sprite because interaction text identifies them;
2. first conversations acknowledge previously discovered treasury/ledger evidence;
3. journal stays open while moving;
4. journal leads/areas/notes update without exact route coordinates;
5. the sealed future treasury is on-camera from the overlook clue but has no Floor-1 route into it;
6. the Tower Sigil opens the Floor-2 stair and is not consumed;
7. Floor 1 has two meaningful entry approaches;
8. optional defense cache/ledger/quest observations are not required for main progression;
9. the HPA-237 rear reward/combat/latch loop still works;
10. reload preserves exact position, stats, opened/defeated entities, items, facts, and discovered sections.

## Risks to Watch During Execution

1. **Closed-union cut:** Task 1 must touch actions/save/assets/content and direct fixtures in the same commit before claiming typecheck.
2. **Journal DOM state:** InteractionOverlay replaces innerHTML on every input; details.open must be snapshotted/restored every render.
3. **Treasury truthfulness:** floor1-treasury-seen belongs to the overlook clue, never the broad Upper Gallery section.
4. **E2E key counts:** map/entity movement changes counted routes; re-walk them rather than weakening assertions with test APIs.
5. **Reward narrowing:** use grant everywhere; do not reintroduce itemId-in checks as a pseudo-discriminant.
6. **Validation ownership:** requiresItemId portals cannot rely on runtime fallback locked copy; invalid authoring must fail content tests.
7. **Art scope:** all entities resolve through HPA-22; do not expand the asset catalog in this ticket.

## Self-Review

### Spec coverage

- Complete compact village + four NPC interactions + healing: Tasks 1, 3, 4.
- Main quest + three optional clue/discovery threads without quest objects: Tasks 1–2.
- Early discovery acknowledged on first conversation: Task 1 action/dialogue tests.
- Complete Floor 1 with two route approaches, fixed enemies/rewards, shortcut, reusable progression item, and visible future treasury: Task 3.
- Treasury seen only from a truthful inspectable overlook: Task 3.
- Remember areas, stairs, route marks, locked stair, and treasury: Tasks 2–3.
- Journal/map guidance with stable test seams and no exact route: Tasks 2, 4.
- Journal open state survives render churn: Tasks 4–5.
- Save/reload persists progress: Tasks 1, 3, 5.
- HPA-237 rear reward/combat/latch loop retained: Task 5.
- Floor 2 remains a connector: Tasks 1 and 3.
- No new image generation: global constraint + Tasks 1/3/5 asset checks.

### Placeholder scan

No TBD/TODO/future implementation placeholders remain. HPA-146 owns only the later secondary route into floor1-future-treasury; HPA-235 ships the sealed chest and truthful observation now.

### Type consistency

The plan consistently uses:

- RewardEntity.grant = 'stat' | 'item';
- ClueEntity.factId?;
- NpcEntity.introFactId;
- itemIds, factIds, discoveredSectionIds;
- MapSection;
- recordFact, recordFacts, addItem, discoverCurrentSection;
- resolveNpcDialogue;
- JournalEntry/JournalSection/JournalObservation/JournalView;
- buildJournalView and renderJournal;
- findSectionById, collectKnownFactIds, findItemRewardByItemId;
- data-effect, data-map-id, data-lead, data-section, data-note.

## Implementation Handoff

Execute this plan on the same HPA-235 branch/PR. Recommended workflow: superpowers:subagent-driven-development. Do not open a second implementation PR for HPA-235.
