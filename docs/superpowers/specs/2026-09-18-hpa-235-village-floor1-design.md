# HPA-235 Complete Village and Floor 1 Design

## Status

Planning design for HPA-235. This extends the merged HPA-237 gameplay foundation and HPA-22 image kit. The implementation stays on one HPA-235 PR.

This revision incorporates two external plan reviews. The architecture remains fact-first; the corrections tighten type sequencing, authored-content contracts, camera-truthful treasury semantics, journal/dialogue copy ownership, and topology validation.

## Goal

Turn the proof slice into the complete starting village and complete first floor while preserving the exploration-first model:

- a compact village with concise NPC interactions, free healing, one main lead, and three optional investigation threads;
- a memorable Floor 1 built around loops, route choices, landmarks, fixed encounters, authored rewards, one reusable depth-access item, and a visible but inaccessible treasury for HPA-146;
- a lightweight journal/map-notes view that remembers discovered areas and evidence without drawing the exact route;
- durable quest-relevant facts that remain valid even when discovered before the player talks to the relevant NPC;
- clean handoff into the existing small Floor 2 connector.

## Current Foundation

Main already has the right core seams:

- pure TypeScript owns GameState, movement, interactions, combat, content validation, and save validation;
- Phaser owns rendering/input only;
- InteractionOverlay owns framework-free DOM feedback and currently replaces its root with innerHTML on every render;
- maps are closed MapDefinition values with ASCII geometry and typed entities;
- durable progression is stored as ID arrays;
- LocalStorage stores one GameState snapshot and intentionally has no version/migration layer;
- HPA-22 provides explicit terrain, directional player, NPC, enemy, stairs, clue, gate, recovery, and chest PNGs through src/phaser/assets.ts.

HPA-235 extends those seams rather than adding a quest engine, scripting system, inventory framework, UI framework, or second state owner.

## Chosen Approach

Persist only gameplay facts, carried item IDs, and discovered authored sections. Derive dialogue selection, quest leads, known areas, and journal notes from those facts.

This naturally satisfies the early-discovery requirement. The player may see the treasury, inspect its sealed approach, or collect a ledger fragment before meeting the relevant NPC. Talking to that NPC adds only the missing context fact; the selected dialogue and derived journal immediately interpret evidence already present.

Do not persist quest objects or quest status. Do not add a generic event/quest DSL.

## Durable State

GameState gains exactly three arrays:

~~~ts
type GameState = Readonly<{
  mapId: MapId;
  tile: Tile;
  player: PlayerStats;
  openedRewardIds: readonly string[];
  defeatedEnemyIds: readonly string[];
  openedShortcutIds: readonly string[];
  itemIds: readonly string[];
  factIds: readonly string[];
  discoveredSectionIds: readonly string[];
}>;
~~~

Semantics:

- itemIds stores reusable or carried authored items. HPA-235 uses tower-depth-sigil and ledger-fragment-1.
- factIds stores observations and learned context, not derived quest status.
- discoveredSectionIds stores authored map-area IDs.
- dialogue selection, journal lead IDs, and note visibility are derived and are not separately persisted.
- old development saves missing these fields become invalid and use the existing explicit reset path. No migration is added.

## Authored Fact Registry

Add src/game/content/facts.ts as the single registry of valid durable facts:

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
~~~

Responsibilities:

- save validation accepts a fact only when Object.hasOwn(FACTS, id);
- journal observations are state.factIds whose FACTS row has note copy;
- validateContent verifies every authored fact carrier references a FACTS key.

This replaces collectKnownFactIds() and the separate hardcoded observation switch.

The registry is content, not a generic event system.

## Authored Content Extensions

### Map sections

MapDefinition gains authored rectangular sections:

~~~ts
type MapSection = Readonly<{
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

type MapDefinition = Readonly<{
  id: MapId;
  name: string;
  layout: readonly string[];
  sections: readonly MapSection[];
  entities: readonly Entity[];
}>;
~~~

A successful move/travel records every section containing the destination tile plus its section facts.

Every authored walkable floor tile must belong to at least one section. Sections may overlap and may include wall tiles; coverage is checked only for floor cells.

Floor 2 receives one floor2-connector section covering the existing connector map so journal discovery remains consistent without expanding Floor-2 gameplay.

### Treasury visibility

The 24x16 Floor 1 is only 768x512 pixels while the runtime viewport is 640x480. With camera bounds clamping and no occlusion/line-of-sight system, the chest at (16,7) is on-screen from the Entry Court and effectively from the entire walkable floor.

Therefore:

- floor1-entry-court has factIds: ['floor1-treasury-seen'];
- the journal may truthfully record the visible treasury immediately on Floor-1 arrival;
- floor1-treasury-overlook remains an optional clue, but records floor1-treasury-sealed: inspection reveals the approach is bricked/sealed from this side;
- the artisan's stronger "find another entrance" follow-up keys off floor1-treasury-sealed, not floor1-treasury-seen.

No fog, line-of-sight, camera changes, or occlusion system is introduced.

### Clues

ClueEntity gains one optional durable fact:

~~~ts
type ClueEntity = BaseEntity &
  Readonly<{
    kind: 'clue';
    text: string;
    factId?: string;
  }>;
~~~

Bumping the clue records factId first, when present, and returns the existing clue effect.

### NPCs

Add one blocking bump-interaction entity:

~~~ts
type NpcEntity = BaseEntity &
  Readonly<{
    kind: 'npc';
    name: string;
    introFactId: string;
  }>;
~~~

All four HPA-235 village NPCs use the existing npc-village-guide image through the safe NPC default in src/phaser/assets.ts. Unique NPC art is not generated in this ticket.

NPC dialogue copy lives in src/game/content/dialogue.ts with the other authored text. src/game/dialogue.ts contains only selection logic and returns a closed DialogueLineId.

Interaction order is:

~~~ts
const next = recordFact(state, entity.introFactId);
const lineId = resolveNpcDialogue(entity.id, next);
~~~

The first conversation therefore acknowledges already-known evidence.

validateContent verifies every authored NpcEntity ID is covered by the dialogue content table so a typo fails unit tests rather than throwing in the browser.

### Rewards

Keep reward as the one collectible/chest semantic, discriminated explicitly:

~~~ts
type RewardEntity = BaseEntity &
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

Both variants use openedRewardIds for one-time collection and become walkable after opening. Item rewards additionally add itemId to itemIds.

No consumable keys are added in HPA-235.

### Required-item portals

Represent a lock as one optional nested value so incomplete lock states are unrepresentable:

~~~ts
type PortalLock = Readonly<{
  requiresItemId: string;
  lockedText: string;
  lockedFactId: string;
}>;

type PortalEntity = BaseEntity &
  Readonly<{
    kind: 'portal';
    target: Readonly<{ mapId: MapId; tile: Tile }>;
    factId?: string;
    lock?: PortalLock;
  }>;
~~~

The Floor-1 front stair into Floor 2 uses:

~~~ts
lock: {
  requiresItemId: 'tower-depth-sigil',
  lockedText: 'A crest-shaped socket seals the lower stair.',
  lockedFactId: 'floor1-depth-seal-seen',
}
~~~

Missing the item does not travel; it records the lock fact and returns accessLocked. The item is never consumed.

accessLocked is intentionally ok: true rather than a BlockedReason because the interaction commits a durable observation fact; the failure arm of ActionResult cannot carry a changed GameState.

validateContent only needs the genuine cross-content lock rule: lock.requiresItemId must resolve to an authored item reward. The nested type owns lock-field completeness.

## Progress Helpers

Add a tiny pure progress module:

- recordFact(state, id): add once and preserve object identity on a repeat;
- recordFacts(state, ids): repeated recordFact;
- addItem(state, id): add once;
- discoverCurrentSection(state): inspect MAPS[state.mapId], add matching section IDs, and record section facts.

Movement calls discoverCurrentSection directly after a tile/map change. Bump interactions explicitly record only their own facts.

There is no trigger runner or event bus.

## Dialogue and Journal Read Models

### Dialogue

src/game/content/dialogue.ts owns the authored dialogue lines and NPC coverage table.

src/game/dialogue.ts owns only the state-to-line choice:

~~~ts
type DialogueLineId =
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

The exact line strings live in content/dialogue.ts. Tests assert selected line IDs, not English substrings.

### Journal

src/game/journal.ts returns structured IDs, not finished prose:

~~~ts
type LeadId =
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

type JournalEntry = Readonly<{
  id: 'main' | 'heirloom' | 'route' | 'ledger';
  lead: LeadId;
}>;

type JournalSection = Readonly<{
  id: string;
  name: string;
}>;

type JournalView = Readonly<{
  main: JournalEntry;
  optional: readonly JournalEntry[];
  sections: readonly JournalSection[];
  observationFactIds: readonly string[];
}>;
~~~

Rules:

- the main entry always exists;
- optional entries appear only after their NPC intro fact is known;
- early discoveries/items immediately influence the selected lead ID;
- sections are derived from discoveredSectionIds;
- observationFactIds includes only known FACTS rows with note copy;
- no entry contains tile coordinates or exact route sequences.

JournalPanel owns entry titles and lead copy through Record tables keyed by entry/lead IDs. It reads FACTS[id].note for observation copy.

There is no status field.

## Village Content

Use one compact 14x10 hub with no interiors.

Player starts at (2,8). The hub contains:

- free recovery point;
- village-warden;
- village-artisan;
- village-scout;
- village-scribe;
- stairs to Floor 1.

All NPCs use the NPC kind default art.

## Floor 1 Content

Floor 1 becomes a 24x16 authored maze with four remembered sections:

- Entry Court;
- Lower Loop;
- Upper Gallery;
- Rear Wing.

The section rectangles cover every walkable cell. The Rear Wing begins at x=11 so the latch tile at (11,8) is covered.

The layout has two approach choices out of the entry area, fixed enemies, a side defense cache, a route-mark clue, a ledger fragment, and the reusable Tower Sigil.

The front Floor-2 stair sits in the Upper Gallery and is sealed until the sigil is collected.

The future treasury at (16,7) is visibly present from arrival but sits in a sealed pocket with no Floor-1 entrance. HPA-146 later adds the secondary Floor-2 connection that reaches it from behind.

floor1-treasury-overlook remains optional authored evidence about the sealed approach; the required progression path does not depend on inspecting it.

The merged HPA-237 rear route remains intact:

- Floor 2 rear stair returns to the Rear Wing;
- floor1-power-core remains a permanent attack reward;
- floor1-gatekeeper remains nearby;
- floor1-rear-latch still opens only from the east/rear side and then becomes a two-way shortcut.

Required progression does not depend on the future treasury, optional evidence threads, defense cache, or HPA-237 power core.

## Floor 2 Content

Do not expand the connector.

Only:

- retain current Floor-2 geometry;
- update reciprocal Floor-1 portal target coordinates required by the new Floor-1 layout;
- add one floor2-connector section covering every existing walkable connector tile.

No mechanisms, quests, enemies, rewards, or story beats are added here.

## Assets

HPA-235 generates no images.

Reuse HPA-22 assets:

- npc-village-guide as the safe default for NpcEntity;
- enemy-ruin-guard for Floor-1 enemies;
- chest-relic-closed/open for stat and item rewards;
- clue-runes for environmental evidence;
- stairs-up/down, recovery-waystone, and shortcut-gate variants.

If a distinct new image later proves necessary, create a separate art ticket/PR.

## Presentation

Keep Phaser unchanged in responsibility.

InteractionOverlay gains effect rendering for:

- dialogue line IDs resolved through authored dialogue content;
- item reward;
- locked access.

Add JournalPanel as a pure string renderer. It maps closed lead IDs to display copy and renders FACTS note copy.

The journal uses native details/summary and no new InputCommand.

InteractionOverlay continues its existing full-root innerHTML render. Before replacement it snapshots the single presentation state HPA-235 introduces—journal.open—and restores it afterward. This is intentionally narrower than restructuring the overlay into cached shell nodes.

A persistent-shell refactor is deferred because the current invalid-save path replaces the root and then reuses the same InteractionOverlay instance when Reset save starts the runtime; cached child references would require an additional shell-rebuild lifecycle. HPA-235 needs only one native open bit, which is covered by Playwright.

Stable DOM seams:

- action feedback keeps data-effect for dialogue/itemReward/accessLocked;
- map name adds data-map-id;
- journal entries use data-lead;
- discovered areas use data-section;
- notes use data-note.

Authored prose is display content, not the test contract.

## Persistence and Validation

Extend shape validation for itemIds, factIds, and discoveredSectionIds.

Save content validation requires:

- every opened reward/enemy/shortcut ID resolves to the correct kind;
- every item ID resolves to exactly one authored item reward;
- every item reward in itemIds is also opened, and every opened item reward has its itemId carried;
- every saved fact ID is a FACTS key;
- every discoveredSectionId resolves to an authored section;
- dynamic walkability treats NPCs as blocking and preserves current reward/enemy/latch semantics.

Content validation requires:

- globally unique section IDs;
- globally unique itemIds;
- section bounds stay within their map;
- every walkable floor tile belongs to at least one section;
- every authored fact carrier references a FACTS key;
- every NpcEntity ID is covered by the dialogue content table;
- every portal lock item ID resolves to an authored item reward;
- portal reciprocity remains valid;
- the initial tile lies inside village-square.

No save version field, migration, compatibility adapter, or defaulting of old save shapes is added.

## Topology Tests

Task 3 adds geometry-level flood-fill tests as the immediate gate for the risky map rewrite.

Keep them simpler than a second game simulator:

- from the final village start tile, every village entity tile is floor-connected;
- on Floor 2, the front and rear portal tiles are connected by walkable geometry;
- on Floor 1, take the union of flood fills from the front entrance portal tile and rear Floor-2 portal tile; every Floor-1 entity tile except floor1-future-treasury is in that union;
- floor1-future-treasury is outside that union.

These tests intentionally ignore combat/resource costs and dynamic interaction state. Existing unit rules cover those mechanics; Playwright covers the real progression sequence.

## Testing Strategy

Unit tests cover:

- idempotent fact/item recording and section discovery;
- dialogue line selection, including first conversation after early evidence;
- journal lead IDs rather than prose;
- discriminated stat/item reward collection;
- missing-sigil portal observation vs successful non-consuming travel;
- save round-trip and invalid unknown fact/item/section IDs;
- NPC blocking and content validation;
- unique item IDs, fact registry references, section coverage, NPC dialogue coverage, portal-lock item references;
- complete authored-map validity and reciprocal portals;
- geometry reachability/sealed-treasury topology.

Playwright covers one real village -> Floor 1 -> sigil -> Floor 2 -> rear Floor 1 journey. It verifies stable data attributes, journal open-state preservation, reload persistence, and the HPA-237 rear reward/combat/latch loop.

## Implementation Sequencing Constraint

Adding NpcEntity, required GameState fields, sections, and the discriminated reward union touches existing exhaustive switches and literal fixtures immediately.

The implementation plan therefore makes Task 1 a compile-safe contract cut. It updates current map sections, switches, save shape/blocking, assets, and direct GameState literals before claiming typecheck.

The final map rewrite occurs before the final Playwright route update, so intermediate commits after that rewrite may fail the existing E2E suite. This is explicit and temporary inside the draft PR; the final branch must pass all CI-equivalent gates before review.

## Risks

1. Closed-union sequencing: Task 1 owns the complete compile cut.
2. E2E route fragility: map/entity movement changes counted routes; re-walk rather than adding test APIs.
3. Camera semantics: treasury visibility follows the actual 640x480 clamped camera, not imagined occlusion.
4. Section coverage: every walkable tile must belong to a section so discovery never silently misses a traversed tile.
5. Content/save drift: FACTS, item rewards, dialogue coverage, sections, and current authored IDs must validate together.
6. Art scope: all new content must resolve through HPA-22 assets.

## Non-Goals

Do not add:

- generic quest objects, registry, DSL, event scripting, or branching narrative engine;
- graphical minimap, fog-of-war grid, line-of-sight system, route arrows, or coordinate-based journal directions;
- consumable-key system or inventory management UI;
- persistent-shell UI framework/refactor beyond HPA-235's journal-open preservation;
- XP, equipment, skills, crafting, random loot, random encounters, or roaming enemies;
- new art generation or image-processing tooling;
- new Floor-2 gameplay beyond reciprocal coordinates + one discovery section;
- save versioning/migrations;
- backend.

## Self-Review

- Fact-first architecture remains unchanged.
- Treasury-seen now reflects actual camera behavior: Entry Court arrival records it.
- Overlook clue records a distinct sealed-approach fact.
- Portal lock is one nested optional object.
- FACTS centralizes durable fact validity and journal-note copy.
- Dialogue authored text moved into content; game logic selects line IDs.
- Journal logic returns closed lead IDs; presentation owns lead copy.
- Section coverage/NPC dialogue/fact-registry validations fail loudly at build time.
- Topology flood-fill protects the sealed treasury and connector geometry without duplicating gameplay rules.
- Snapshot/restore remains the smaller journal-open fix for the current overlay lifecycle.
- No new image generation, save migrations, or Floor-2 feature expansion.
