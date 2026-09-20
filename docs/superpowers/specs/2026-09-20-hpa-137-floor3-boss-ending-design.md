# HPA-137 Complete Floor 3, Boss, and MVP Story Design

## Status

Planning-only draft for the single HPA-137 PR.

This design builds directly on the merged HPA-237, HPA-22, HPA-235, and HPA-146 foundation. It keeps the current fact-first authored-content architecture and adds no quest engine, second combat system, generic ending framework, save migration layer, procedural generation, or new art pipeline.

## Goal

Complete the MVP with one dense authored Floor 3, one deterministic final boss, the final keeper evidence, the restoration resource that resolves the failing-tower mystery, and a concise village ending.

The final floor should reward understanding of the maze rather than raw system complexity:

- two readable routes from the entrance area toward the heart chamber;
- earlier route/release symbols echoed as navigation clues;
- one permanent shortcut opened from the far side;
- one optional hidden vault;
- one optional final ledger record;
- one mandatory boss using the existing combat contract;
- one final resource behind that boss;
- one return-to-village conversation that durably completes the main story.

The complete implementation remains one HPA-137 PR.

## Current Foundation

Main already has the seams this ticket needs:

- GameState persists map/tile, player stats, opened rewards, defeated enemies, opened latches, carried items, facts, and discovered sections.
- Facts are registered centrally in src/game/content/facts.ts.
- Journal state is derived from durable facts/items/opened/defeated IDs; there is no persisted quest object.
- RewardEntity already supports fixed stat and carried-item rewards.
- EnemyEntity already uses one deterministic preview/resolution path.
- LatchEntity already models a permanent rear-opened shortcut.
- PortalEntity already models reciprocal authored travel and item-gated locks.
- NPC dialogue is selected from current state and uses closed DialogueLineId/NpcId unions.
- Runtime entity presence/blocking is centralized in src/game/content.ts.
- Save validation checks the current authored content directly; there is no versioning or migration.
- HPA-22 already ships dungeon terrain, enemy, clue, latch, stairs, recovery, NPC, and chest images.
- The real browser journey already reaches the returned subject in the village after completing the HPA-146 loop.

HPA-137 should extend these contracts rather than create parallel ownership.

## Chosen Approach

### 1. Add Floor 3 as one more authored map

Extend MapId with floor3, add src/game/content/floor3.ts, register it in MAPS, and map it to the existing dungeon terrain assets.

Floor 3 is authored exactly like Floors 1 and 2: compact ASCII layout, fixed entities, named sections, reciprocal portals, deterministic enemies, fixed rewards, and permanent latches.

Do not create floor subclasses, a dungeon generator, an encounter table, a boss scene, or a floor-specific runtime controller.

### 2. Extend portal locks with one discriminated fact requirement

Floor 3 must not be reachable before the missing subject has returned. The existing item-only PortalLock cannot express that without inventing a fake key item.

Replace PortalLock with a closed two-variant union:

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

The existing Floor 1 depth stair becomes kind: 'item' with no behavior change.

The new Floor 2 -> Floor 3 stair uses:

- requiresFactId: main-subject-returned;
- lockedFactId: floor2-depth-seal-seen;
- factId on successful travel: floor2-depth-stairs-used.

Movement evaluates the appropriate variant. validateContent verifies both the lock requirement and lockedFactId against the corresponding authored registry.

Do not add a generic condition expression, AND/OR rules, or arbitrary predicates.

### 3. Keep the boss an ordinary EnemyEntity

The final boss is floor3-core-guardian and uses the same previewCombat and resolveCombat functions as every other enemy.

Pin its authored stats at:

- HP 36;
- ATK 7;
- DEF 4.

At the baseline starting stats (30 HP, 10 ATK, 2 DEF), a full-health player deals 6 damage per hit, needs 6 hits, and loses 25 HP. Therefore the boss is beatable without the optional Floor 1 treasury, Floor 2 caches, Floor 3 vault, or any consumable treasure.

Place an ordinary recovery waystone on the mandatory approach before the boss so reaching the fight with earlier attrition cannot make optional rewards mandatory.

The boss is distinguished by:

- the Heart Chamber section and authored approach;
- final-story clue context immediately before the fight;
- stronger authored stats;
- its unique entity ID;
- the restoration resource placed behind its blocking tile.

Reuse enemy-ruin-guard for this PR. If a unique boss image is desired later, create a separate art-generation ticket/PR; do not block HPA-137 on new art.

### 4. Keep all final progression in existing durable IDs

HPA-137 adds no GameState field.

Use:

- factIds for story/evidence/travel facts;
- defeatedEnemyIds for the boss result;
- openedRewardIds for the hidden vault and final resource chest;
- openedShortcutIds for the Floor 3 shortcut;
- itemIds for tower-restoration-core;
- discoveredSectionIds for Floor 3 landmarks.

No bossDefeated, endingSeen, questStatus, floor3PuzzleState, or generic flags field is added.

### 5. Give NPC interaction one narrow state-aware outcome

The current NPC action always records introFactId and then resolves one dialogue line. The final warden conversation needs one additional durable side effect: when the player returns with the restoration core, it should record main-village-restored exactly once.

Replace resolveNpcDialogue with a pure resolveNpcInteraction returning:

~~~ts
export type NpcInteractionResolution = Readonly<{
  lineId: DialogueLineId;
  factId?: string;
}>;

export function resolveNpcInteraction(
  npcId: NpcId,
  state: GameState,
): NpcInteractionResolution;
~~~

interactWithEntity keeps the same ownership:

1. record the NPC introFactId;
2. resolve the interaction from that state;
3. record the optional result fact idempotently;
4. return the dialogue effect.

Only the final warden path uses factId in HPA-137. Existing NPC behavior remains line-only.

This is deliberately not a dialogue tree, scripting engine, callback, or generic action list.

### 6. Complete the story with a resource, not another subsystem

The tower is a guardian-and-regulation system that also stabilizes the underground flow the village depends on. The lower network entered a permanent defensive lockdown after a keeper isolation failure, leaving the core inaccessible and the village's supply deteriorating.

Floor 3 reveals this in short environmental evidence:

- familiar paired-release marks show that earlier mechanisms were part of emergency isolation;
- a final keeper record explains that the guardians were left defending a failed control state rather than serving as villains;
- the Heart Chamber contains the stalled guardian and the Restoration Core needed to restart the village-facing system.

After defeating floor3-core-guardian, the player can claim:

- reward entity: floor3-restoration-core;
- itemId: tower-restoration-core;
- label: Restoration Core.

The item is not consumed. Carrying it means the player can restore the village; speaking to the warden records main-village-restored.

Do not add crafting, repair gameplay, resource consumption, a cinematic engine, or post-game state.

## Floor 3 Topology

Use one compact rectangular map with six recognizable sections:

- Entry Vestibule — reciprocal arrival from the new Floor 2 depth stair.
- Twin Galleries — central landmark where the route visibly splits east/west.
- Keeper Archive — evidence-heavy east-side route containing the final ledger record.
- Hidden Vault — optional side pocket hinted by repeated route symbols.
- Heart Approach — both main routes reconnect here; contains the recovery waystone and the rear side of the shortcut.
- Heart Chamber — final clue, boss, and Restoration Core.

The exact rectangle size and tile coordinates are implementation details; tests should pin relationships, not arbitrary dimensions.

### Required route relationships

From the Floor 3 entry with no optional rewards claimed, no optional enemies defeated, and the shortcut closed:

1. the player can reach the Heart Approach through the west gallery;
2. the player can also reach it through the east gallery;
3. the final keeper record has a reachable interaction approach on the east route;
4. the hidden-vault clue/entrance has a reachable interaction approach without being on the main route;
5. the rear side of floor3-heart-shortcut is reachable from the Heart Approach;
6. the recovery waystone is reachable before the boss;
7. the boss blocks the only direct passage into the Restoration Core pocket.

Opening floor3-heart-shortcut creates a permanent shorter return from the Heart Approach to the Entry Vestibule. Do not add fast travel.

### Optional authored encounters

Keep ordinary Floor 3 encounters off the mandatory boss corridor.

Use a small fixed set only:

- floor3-archive-sentry near the optional ledger/archive side area;
- floor3-vault-sentry guarding the optional vault reward.

They reuse enemy-ruin-guard and do not become prerequisites for the main story.

The hidden vault reward is floor3-hidden-vault-cache, a fixed +2 defense stat reward. It may make the boss cheaper but is never required.

No consumable-key system is introduced in this ticket. The existing rule remains: if consumable keys are ever added, they may gate optional treasure only.

## Story and Journal Progression

Add only the facts actually used by authored content:

- floor2-depth-seal-seen — observation when the player reaches the lower sealed stair too early;
- floor2-depth-stairs-used — successful entry to Floor 3;
- floor3-keeper-final-record-read — final optional ledger evidence;
- main-village-restored — durable ending completion.

The boss result remains derived from defeatedEnemyIds containing floor3-core-guardian. Core recovery remains derived from itemIds containing tower-restoration-core.

Extend the main journal lead in this precedence order:

1. main-village-restored -> story-complete;
2. tower-restoration-core carried -> return-restoration-core;
3. floor3-core-guardian defeated -> claim-restoration-core;
4. floor2-depth-stairs-used -> reach-heart-chamber;
5. main-subject-returned -> investigate-deeper;
6. existing HPA-235/HPA-146 rules unchanged.

Extend Keeper Ledger:

- before Floor 2 evidence: existing leads;
- after floor2-paired-release-ledger-read: ledger-follow-deeper-record;
- after floor3-keeper-final-record-read: ledger-resolved.

The ledger thread must resolve correctly even if the player reads the final record before first speaking to the scribe.

## Ending Dialogue

The warden interaction owns the main ending because the player returns the restoration resource to the village.

Dialogue selection precedence for village-warden:

1. if tower-restoration-core is carried and floor3-keeper-final-record-read is known: expanded restoration ending;
2. if tower-restoration-core is carried: standard restoration ending;
3. if main-subject-returned is known: existing investigate-deeper line;
4. existing sigil/main-lead behavior.

Both ending variants return factId: main-village-restored. recordFact keeps repeated conversations idempotent.

The expanded ending adds understanding of the failed guardian/keeper isolation sequence. It does not unlock a different dungeon, alternate credits path, or separate ending state.

The scribe may acknowledge floor3-keeper-final-record-read with one resolved-ledger line. That conversation does not own main-story completion.

## Art and Presentation

No new image generation is required.

Reuse:

- terrain-dungeon-floor / terrain-dungeon-wall;
- enemy-ruin-guard;
- clue-runes;
- shortcut-gate-closed/open;
- recovery-waystone;
- stairs-up/down;
- chest-relic-closed/open;
- existing NPC art.

Add floor3 to TERRAIN_BY_MAP and bind entities to existing asset IDs.

Do not add an atlas, boss animation system, cutscene layer, portrait system, particle/VFX framework, or new asset loader.

## Save and Validation

The save shape does not change.

Current generic validation already covers new reward/enemy/latch/section IDs once Floor 3 is registered. Extend authored-content validation only for the new PortalLock union:

- item lock requires an authored item reward;
- fact lock requires a registered fact;
- lockedFactId must always be registered;
- reciprocal portal validation remains unchanged.

A saved player position cannot stand on the undefeated boss tile or unopened resource chest. After boss defeat / reward claim, those tiles become valid through the existing runtime blocking rule.

Old development saves that reference pre-HPA-137 content may be rejected by current validation. Keep explicit reset behavior; add no migration layer.

## Testing Strategy

### Pure/read-model tests

Pin:

- item lock behavior remains unchanged after the PortalLock union;
- fact lock blocks before main-subject-returned and opens after it;
- unknown fact lock requirements fail validateContent;
- resolveNpcInteraction returns no side effect for existing conversations;
- warden with tower-restoration-core returns the standard ending + main-village-restored;
- warden with the core plus final ledger evidence returns the expanded ending + the same completion fact;
- repeated ending interaction does not duplicate the completion fact;
- main journal transitions through Floor 3 entry, boss defeated, core claimed, and story complete;
- Keeper Ledger resolves from final evidence independent of NPC intro order.

### Authored-content/topology tests

Extend the existing flood helpers rather than create a Floor 3 pathfinding subsystem.

Prove:

- MAPS contains floor3 and all content validates;
- Floor 2 and Floor 3 depth portals are reciprocal;
- both main Floor 3 gallery routes reach the Heart Approach with runtime blocking;
- the final ledger and hidden-vault approaches are optional/reachable;
- the shortcut rear approach is reachable while closed;
- the recovery point is reachable before the boss;
- the undefeated boss separates entry-side reachability from the Restoration Core pocket;
- after marking the boss defeated, the resource pocket becomes reachable.

### Combat/progression/save tests

Use floor3-core-guardian authored stats directly.

Pin baseline preview at full initial stats:

- winnable: true;
- hitsNeeded: 6;
- hpLoss: 25.

Then prove:

- preview and resolution still use the same combat calculation;
- defeating the boss adds its ID exactly once;
- reload keeps the boss absent and its tile traversable;
- claiming floor3-restoration-core adds the reward ID/item exactly once;
- reload keeps the reward opened and the item carried;
- main-village-restored survives reload.

### Browser journey

Extend tests/e2e/cross-floor.spec.ts instead of creating a second harness.

Continue the existing fresh-save journey after the returned-subject checkpoint:

1. return to Floor 2;
2. verify the Floor 3 stair is available only after the subject-return fact;
3. enter Floor 3 and discover the entry/twin-gallery sections;
4. open the permanent Floor 3 shortcut from its rear;
5. reach the Heart Approach and heal;
6. preview then Fight the core guardian;
7. claim the Restoration Core;
8. reload once to prove boss/resource/shortcut persistence;
9. return through the existing floor chain to the village;
10. talk to the warden and assert story-complete.

Keep the optional ledger expanded-ending matrix in unit tests so the browser journey does not become two complete playthroughs.

## Non-Goals

- New post-game content.
- Multiple endings.
- Boss-specific combat commands or battle scene.
- Skill tree, equipment, party, XP, levels, crafting, or repair minigame.
- Generic quest/ending/cutscene scripting.
- Reversible puzzle-state framework.
- Procedural rooms.
- Consumable-key system.
- Save migration/versioning.
- New image generation or boss art in this PR.
- Final numerical balance/polish beyond proving the required path; HPA-21 owns the release pass.
