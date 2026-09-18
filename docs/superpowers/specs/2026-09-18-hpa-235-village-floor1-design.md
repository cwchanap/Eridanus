# HPA-235 Complete Village and Floor 1 Design

## Status

Planning design for HPA-235. This extends the merged HPA-237 gameplay foundation and HPA-22 image kit. The implementation stays on one HPA-235 PR.

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
- InteractionOverlay owns framework-free DOM feedback;
- maps are closed MapDefinition values with ASCII geometry and typed entities;
- durable progression is stored as ID arrays;
- LocalStorage stores one GameState snapshot and intentionally has no version/migration layer;
- HPA-22 provides explicit terrain, directional player, NPC, enemy, stairs, clue, gate, recovery, and chest PNGs through src/phaser/assets.ts.

HPA-235 should extend those seams rather than add a quest engine, scripting system, inventory framework, UI framework, or second state owner.

## Chosen Approach

Persist only gameplay facts, owned items, and discovered authored sections. Derive dialogue, quest status, journal leads, and map notes from those facts.

This is preferred over persisting quest objects because the ticket explicitly requires early discoveries to remain valid. A fact-first model naturally handles that: the player can see the treasury or find a ledger fragment first; later talking to the NPC only adds the quest-context fact, and the derived journal immediately interprets the already-known evidence.

It is also preferred over a generic event/quest DSL. HPA-235 has four village NPCs, a small fixed set of authored facts, and three known optional quest threads. Explicit pure functions are cheaper to read and extend into HPA-146.

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
- discoveredSectionIds stores authored map-area IDs for the journal/map-notes view.
- quest status, current lead text, NPC dialogue, known stairs, and observation labels are derived and are not separately persisted.
- old development saves missing these fields become invalid and use the existing explicit reset path. No migration is added.

## Authored Content Extensions

### Sections

MapDefinition gains authored section metadata:

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

A successful move/travel records every section containing the destination tile plus any facts attached to that section. Rectangular bounds are sufficient for the few authored areas in this MVP; no fog grid or per-tile discovery bitmap is added.

The upper-gallery section records floor1-treasury-seen. That is how the journal remembers the visible but inaccessible treasury without implementing line-of-sight or a minimap.

### NPC

Add one blocking bump-interaction entity:

~~~ts
type NpcEntity = BaseEntity &
  Readonly<{
    kind: 'npc';
    name: string;
    introFactId: string;
  }>;
~~~

All four HPA-235 village NPCs reuse the existing npc-village-guide image. Unique NPC art is not generated in this ticket.

NPC dialogue is resolved by an explicit switch on NPC entity ID. The first conversation records introFactId. Follow-up text depends on already-known facts/items. There is no branching dialogue tree schema.

### Item rewards

Keep reward as the one collectible/chest semantic, but make it a closed union:

~~~ts
type RewardEntity =
  | (BaseEntity &
      Readonly<{
        kind: 'reward';
        stat: Stat;
        amount: number;
      }>)
  | (BaseEntity &
      Readonly<{
        kind: 'reward';
        itemId: string;
        label: string;
      }>);
~~~

Both variants still use openedRewardIds for one-time collection and become walkable after opening. Item rewards additionally add itemId to itemIds.

No consumable keys are added in HPA-235.

### Required-item portal

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

The Floor 1 front stair into Floor 2 requires tower-depth-sigil. Missing the item does not travel; it records floor1-depth-seal-seen and returns an accessLocked effect for UI copy. The item is never consumed.

Successful portal travel may record factId so the journal can remember used stair connections.

## Progress Helpers

Add a tiny pure progress module with four responsibilities:

- recordFact(state, id): add once and return the same state object when already known;
- recordFacts(state, ids): repeated recordFact;
- addItem(state, id): add once;
- discoverCurrentSection(state): inspect MAPS[state.mapId], add matching section IDs, and record section facts.

There is no generic trigger runner. Movement explicitly invokes section discovery after position changes, and interactions explicitly record the facts they own.

## Dialogue and Journal Read Models

### Dialogue

src/game/dialogue.ts exports resolveNpcDialogue(npcId, state).

The four NPC roles are:

- village-warden: main missing-person / silent-tower lead;
- village-artisan: spatial/heirloom thread;
- village-scout: route-discovery thread;
- village-scribe: evidence/ledger thread.

Follow-up dialogue uses only current fact/item state. Examples:

- artisan recognizes floor1-treasury-seen even when the player saw the treasury before the first conversation;
- scout reacts to floor1-route-mark-seen;
- scribe reacts to ledger-fragment-1;
- warden reacts to tower-depth-sigil.

### Journal

src/game/journal.ts exports a derived JournalView:

~~~ts
type JournalEntry = Readonly<{
  id: string;
  title: string;
  status: 'active' | 'complete';
  lead: string;
}>;

type JournalView = Readonly<{
  main: JournalEntry;
  optional: readonly JournalEntry[];
  sections: readonly string[];
  observations: readonly string[];
}>;
~~~

Rules:

- the main entry always exists; before the warden conversation it points the player to the warden;
- optional entries appear only after their NPC intro fact is known;
- early discoveries/items immediately influence the lead when an optional entry first appears;
- sections are labels from discoveredSectionIds;
- observations include remembered stairs, inspected route marks, the locked depth stair, and the visible treasury;
- no entry contains a tile coordinate or exact route sequence.

Quest status is derived. HPA-235 leaves the three optional threads open for HPA-146; it does not persist active/completed quest records.

## Village Content

Use one compact 14x10 hub with no interiors.

Player starts at (2,8). The hub contains:

- free recovery point;
- village-warden;
- village-artisan;
- village-scout;
- village-scribe;
- stairs to Floor 1.

All NPCs reuse npc-village-guide. Interaction copy identifies speaker role/name, so art duplication does not hide which conversation occurred.

## Floor 1 Content

Floor 1 becomes a 24x16 authored maze with four broad remembered sections:

- Entry Court;
- Lower Loop;
- Upper Gallery;
- Rear Wing.

The layout uses two different openings from the entry area into the lower loop, fixed enemies on those approaches, a side defense cache, a route-mark clue, a ledger fragment, and the reusable tower sigil.

The front Floor-2 stair sits in the Upper Gallery and is sealed until the sigil is collected. Reaching the Upper Gallery also records that a separate sealed treasury is visible but unreachable from Floor 1.

The merged HPA-237 rear route remains intact as a regression loop:

- Floor 2 rear stair returns to the Rear Wing;
- floor1-power-core remains a permanent attack reward;
- floor1-gatekeeper remains nearby;
- floor1-rear-latch still opens only from the east/rear side and then becomes a two-way shortcut.

A new floor1-future-treasury chest is authored inside a sealed room that has no Floor-1 entrance in this ticket. HPA-146 will add the secondary Floor-2 connection that reaches it from behind.

Required progression does not depend on the future treasury, ledger thread, route thread, heirloom thread, optional defense cache, or the HPA-237 power core.

## Assets

HPA-235 generates no images.

Reuse HPA-22 assets:

- npc-village-guide for all village NPCs;
- enemy-ruin-guard for Floor-1 enemies;
- chest-relic-closed/open for stat and item rewards;
- clue-runes for environmental evidence;
- stairs-up/down, recovery-waystone, and shortcut gate variants as already integrated.

If later review shows that a distinct new image is genuinely required, create a separate art ticket/PR rather than mixing image generation into HPA-235.

## Presentation

Keep the existing Phaser scene unchanged in responsibility.

InteractionOverlay gains text handling for:

- dialogue;
- item reward;
- locked access.

Add a small JournalPanel renderer used by InteractionOverlay. Render the journal as native details/summary markup so opening/closing it is presentation-only DOM state and does not require a new InputCommand or durable UI field.

The journal contains Main lead, Optional leads, Known areas, and Notes. It does not draw a graphical minimap.

## Persistence and Validation

Extend current shape validation for the three new string arrays.

Content validation for saves requires:

- every opened reward/enemy/shortcut ID still resolves to the correct entity kind;
- every item ID resolves to an authored item reward;
- each item reward listed in itemIds is also opened;
- every saved fact ID exists in authored NPC intro facts, clue facts, portal facts/locked facts, or section facts;
- every discoveredSectionId resolves to an authored section;
- dynamic walkability validation treats NPCs as blocking and preserves existing opened reward/defeated enemy/open latch semantics.

No version field, migration, compatibility adapter, or defaulting of old save shapes is added.

## Testing Strategy

Unit tests cover:

- idempotent fact/item recording and section discovery;
- dialogue progression from facts/items;
- early discovery before quest introduction;
- journal derivation and no exact-route coordinates;
- item reward collection;
- missing-sigil portal inspection vs successful travel;
- save round-trip and invalid unknown fact/item/section IDs;
- NPC blocking and content validation;
- complete authored-map validity and reciprocal portals.

Playwright covers one real village -> Floor 1 -> sigil -> Floor 2 journey, verifies journal/map notes update, reload persistence, and the existing rear-route reward/combat/latch loop remains usable.

## Non-Goals

Do not add:

- generic quest objects, quest registry, quest DSL, event scripting, or branching narrative engine;
- graphical minimap, fog-of-war grid, route arrows, or coordinate-based journal directions;
- consumable-key system or inventory management UI;
- XP, equipment, skills, crafting, random loot, random encounters, or roaming enemies;
- new art generation or image-processing tooling;
- new Floor-2 content beyond keeping the existing connector reciprocal with the changed Floor-1 coordinates;
- save versioning/migrations;
- UI framework or backend.

## Self-Review

- No placeholder requirements remain.
- The design preserves one ticket = one PR.
- Every HPA-235 acceptance criterion maps to persisted facts/items/sections, authored Floor-1 content, derived journal/dialogue, save validation, and browser/unit coverage.
- HPA-146 can extend the same facts/journal/content seams without introducing a second quest subsystem.
- New image generation is explicitly excluded from this coding ticket.
