# HPA-235 Complete Village and Floor 1 Design

## Status

Planning design for HPA-235. This extends the merged HPA-237 gameplay foundation and HPA-22 image kit. The implementation stays on one HPA-235 PR.

This revision incorporates the first external plan review. The architecture remains fact-first; the corrections tighten type sequencing, first-conversation semantics, journal DOM behavior, visibility semantics, and content validation.

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

Persist only gameplay facts, owned items, and discovered authored sections. Derive dialogue, quest leads, and journal/map notes from those facts.

This naturally satisfies the early-discovery requirement. The player may inspect the treasury overlook or collect a ledger fragment before meeting the relevant NPC. Talking to that NPC adds only the missing context fact; the spoken line and derived journal immediately interpret the evidence already present.

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
- dialogue, current leads, stair notes, and observation labels are derived and are not separately persisted.
- old development saves missing these fields become invalid and use the existing explicit reset path. No migration is added.

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

A successful move/travel records every section containing the destination tile plus section facts.

Sections represent area discovery, not line-of-sight. The broad Upper Gallery does not set floor1-treasury-seen. That fact comes from a dedicated bumpable overlook clue placed where the sealed treasury is visible in the 640x480 runtime camera.

Floor 2 receives one floor2-connector section covering the existing connector map so journal discovery remains consistent without expanding Floor 2 content.

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

NPC dialogue is an explicit switch on NPC ID. Interaction order is important:

~~~ts
const next = recordFact(state, entity.introFactId);
const text = resolveNpcDialogue(entity.id, next);
~~~

The first conversation therefore acknowledges already-known evidence. If the player saw the treasury before meeting the artisan, that first conversation interprets it rather than playing an unaware introduction while the journal already knows better.

There is no branching dialogue-tree schema.

### Rewards

Keep reward as the one collectible/chest semantic, but discriminate the grant explicitly:

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

PortalEntity gains an optional reusable access requirement:

~~~ts
type PortalEntity = BaseEntity &
  Readonly<{
    kind: 'portal';
    target: Readonly<{ mapId: MapId; tile: Tile }>;
    factId?: string;
    requiresItemId?: string;
    lockedText?: string;
    lockedFactId?: string;
  }>;
~~~

The Floor 1 front stair into Floor 2 requires tower-depth-sigil. Missing the item does not travel; it records floor1-depth-seal-seen and returns an accessLocked effect. The item is never consumed.

Content validation makes the lock contract strict: whenever requiresItemId is present, lockedText and lockedFactId must both be present/non-empty and requiresItemId must resolve to an authored item reward. Movement therefore has no silent fallback copy.

Successful portal travel may record factId so the journal can remember used stair connections.

## Progress Helpers

Add a tiny pure progress module:

- recordFact(state, id): add once and return the same state object when already known;
- recordFacts(state, ids): repeated recordFact;
- addItem(state, id): add once;
- discoverCurrentSection(state): inspect MAPS[state.mapId], add matching section IDs, and record section facts.

Movement invokes section discovery only after a tile/map change. Bump interactions explicitly record only their own facts.

There is no trigger runner or event bus.

## Dialogue and Journal Read Models

### Dialogue

src/game/dialogue.ts exports resolveNpcDialogue(npcId, state).

The four NPC roles are:

- village-warden: main missing-person / silent-tower lead;
- village-artisan: spatial/heirloom thread;
- village-scout: route-discovery thread;
- village-scribe: evidence/ledger thread.

Follow-up dialogue is derived only from current facts/items.

### Journal

src/game/journal.ts exports:

~~~ts
type JournalEntry = Readonly<{
  id: string;
  title: string;
  lead: string;
}>;

type JournalSection = Readonly<{
  id: string;
  name: string;
}>;

type JournalObservation = Readonly<{
  id: string;
  text: string;
}>;

type JournalView = Readonly<{
  main: JournalEntry;
  optional: readonly JournalEntry[];
  sections: readonly JournalSection[];
  observations: readonly JournalObservation[];
}>;
~~~

There is no status field. HPA-235 does not complete the optional threads, and the main lead continues into Floor 2.

Rules:

- the main entry always exists; before the warden conversation it points the player to the warden;
- optional entries appear only after their NPC intro fact is known;
- early discoveries/items immediately influence the first visible lead;
- sections are derived from discoveredSectionIds;
- observations remember used stairs, inspected route marks, the locked depth stair, and the inspected treasury overlook;
- no entry contains tile coordinates or exact route sequences.

The IDs are also presentation test seams, not durable UI state.

## Village Content

Use one compact 14x10 hub with no interiors.

Player starts at (2,8). The hub contains:

- free recovery point;
- village-warden;
- village-artisan;
- village-scout;
- village-scribe;
- stairs to Floor 1.

All NPCs use the NPC kind default art. Interaction text identifies the speaker.

## Floor 1 Content

Floor 1 becomes a 24x16 authored maze with four broad remembered sections:

- Entry Court;
- Lower Loop;
- Upper Gallery;
- Rear Wing.

The layout has two approach choices out of the entry area, fixed enemies, a side defense cache, a route-mark clue, a ledger fragment, and the reusable Tower Sigil.

The front Floor-2 stair sits in the Upper Gallery and is sealed until the sigil is collected.

The sealed future treasury is authored in the Rear Wing side of the map with no Floor-1 entrance. A separate floor1-treasury-overlook clue at (10,3) is adjacent to a reachable Upper Gallery tile from which the chest is on-camera. Bumping it records floor1-treasury-seen. The broad gallery section itself does not claim visibility.

The merged HPA-237 rear route remains intact as a regression loop:

- Floor 2 rear stair returns to the Rear Wing;
- floor1-power-core remains a permanent attack reward;
- floor1-gatekeeper remains nearby;
- floor1-rear-latch still opens only from the east/rear side and then becomes a two-way shortcut.

Required progression does not depend on the future treasury, ledger thread, route thread, heirloom thread, optional defense cache, or HPA-237 power core.

## Floor 2 Content

Do not expand the connector.

Only:

- retain the current Floor-2 geometry;
- update reciprocal Floor-1 portal target coordinates required by the new Floor-1 layout;
- add one floor2-connector section covering the existing walkable connector.

No mechanisms, quests, enemies, rewards, or story beats are added here.

## Assets

HPA-235 generates no images.

Reuse HPA-22 assets:

- npc-village-guide as the safe default for NpcEntity in baseEntityAsset;
- enemy-ruin-guard for Floor-1 enemies;
- chest-relic-closed/open for stat and item rewards;
- clue-runes for environmental evidence/overlook;
- stairs-up/down, recovery-waystone, and shortcut-gate variants.

If a distinct new image later proves necessary, create a separate art ticket/PR.

## Presentation

Keep Phaser unchanged in responsibility.

InteractionOverlay gains effect text for:

- dialogue;
- item reward;
- locked access.

Add a small JournalPanel string renderer. The journal uses native details/summary and no new InputCommand.

Because InteractionOverlay replaces its entire root with innerHTML on every render, it must preserve presentation-only open state explicitly:

~~~ts
const wasOpen =
  this.root.querySelector<HTMLDetailsElement>('[data-testid="journal"]')
    ?.open ?? false;

// replace root.innerHTML

const journal =
  this.root.querySelector<HTMLDetailsElement>('[data-testid="journal"]');
if (journal) journal.open = wasOpen;
~~~

Do not persist this state and do not add a second DOM root.

Stable DOM seams:

- action feedback keeps data-effect="dialogue", data-effect="itemReward", and data-effect="accessLocked";
- journal entries use data-lead="<entry id>";
- discovered areas use data-section="<section id>";
- notes use data-note="<observation id>".

Authored prose remains display content, not the primary E2E contract.

## Persistence and Validation

Extend shape validation for itemIds, factIds, and discoveredSectionIds.

Save content validation requires:

- every opened reward/enemy/shortcut ID resolves to the correct kind;
- every item ID resolves to exactly one authored item reward;
- every item reward in itemIds is also opened, and every opened item reward has its itemId carried;
- every saved fact ID is authored by an NPC intro, clue, portal/lock, or section;
- every discoveredSectionId resolves to an authored section;
- dynamic walkability treats NPCs as blocking and preserves current reward/enemy/latch semantics.

Content validation also requires:

- globally unique section IDs;
- globally unique itemIds;
- section bounds stay within their map;
- present fact IDs are non-empty;
- requiresItemId implies non-empty lockedText + lockedFactId and references an authored item reward;
- portal reciprocity remains valid;
- the initial tile lies inside village-square.

No version field, migration, compatibility adapter, or defaulting of old save shapes is added.

## Testing Strategy

Unit tests cover:

- idempotent fact/item recording and section discovery;
- dialogue progression from facts/items;
- first conversation acknowledging treasury/ledger evidence discovered earlier;
- journal derivation without a status enum or exact-route coordinates;
- discriminated stat/item reward collection;
- missing-sigil portal inspection vs successful non-consuming travel;
- save round-trip and invalid unknown fact/item/section IDs;
- NPC blocking and content validation;
- unique item IDs and strict portal-lock fields;
- complete authored-map validity and reciprocal portals;
- initial tile inside village-square;
- renderJournal emitting stable data-testid/data-lead/data-section/data-note seams.

Playwright covers one real village -> Floor 1 -> sigil -> Floor 2 -> rear Floor 1 journey. It verifies:

- stable data-effect/data-lead/data-section/data-note attributes rather than authored English copy;
- journal open state survives movement/re-render;
- reload preserves discovery/journal facts;
- the HPA-237 rear reward/combat/latch loop remains usable.

## Implementation Sequencing Constraint

Adding NpcEntity, required GameState fields, sections, and the discriminated reward union touches existing exhaustive switches and literal fixtures immediately.

The implementation plan therefore makes its first task a compile-safe contract cut. That task updates:

- all three current maps with baseline sections;
- existing stat rewards with grant: 'stat';
- actions.ts reward narrowing and the new NPC/clue branches;
- save.ts NPC blocking and new state-shape/content checks;
- assets.ts NPC default art;
- direct GameState literals in movement/session/save/state tests;
- the asset test RewardEntity fixture.

Typecheck is not advertised until all of those consumers compile.

## Risks

1. Closed-union sequencing: adding types without updating exhaustive consumers produces a false-green plan. Task 1 owns the whole compile cut.
2. Journal open state: root innerHTML replacement destroys native details state unless render snapshots/restores .open.
3. Treasury visibility: broad area discovery must not claim the player saw an off-camera chest. Only the overlook clue records the fact.
4. E2E route fragility: the map rewrite requires re-walking counted key presses; never add teleport/test APIs to compensate.
5. Content/save drift: lock fields, item IDs, facts, sections, and current authored IDs must remain validated together.
6. Art scope: all new content must resolve through HPA-22 assets; no image work belongs in HPA-235.

## Non-Goals

Do not add:

- generic quest objects, registry, DSL, event scripting, or branching narrative engine;
- graphical minimap, fog-of-war grid, line-of-sight system, route arrows, or coordinate-based journal directions;
- consumable-key system or inventory management UI;
- XP, equipment, skills, crafting, random loot, random encounters, or roaming enemies;
- new art generation or image-processing tooling;
- new Floor-2 content beyond reciprocal coordinates + one discovery section;
- save versioning/migrations;
- UI framework or backend.

## Self-Review

- The fact-first architecture remains unchanged.
- Early evidence is acknowledged on the first NPC bump because introFactId is recorded before dialogue resolution.
- ClueEntity.factId is explicit.
- RewardEntity uses a closed grant discriminant.
- JournalEntry.status is removed.
- Treasury visibility is tied to an inspectable overlook, not the whole gallery.
- Journal native open state is preserved across innerHTML replacement without persistent UI state.
- Content validation owns lock completeness and unique item IDs.
- Floor 2 has one discovery section but no expanded gameplay.
- Implementation sequencing keeps typecheck honest.
- E2E contracts use stable data attributes rather than authored prose.
