# HPA-741 — Floors 6–10: Deep Floors Design

> **Status:** Draft implementation design for review. The five annotated floor maps were approved on 2026-11-06; this document defines how to implement them, not a replacement layout.
>
> **Linear:** https://linear.app/cwchanap/issue/HPA-741/tower-maze-build-floors-6-10-the-deep-floors-below-the-heart
>
> **Delivery:** One HPA-741 PR, initially docs-only and subsequently extended with implementation on the *same branch/PR*. New Taproot/sluice artwork belongs to HPA-742, not this PR.

## Goal and player experience

After restoring the Floor 5 core and completing the existing village ending, the hero finds a newly unlocked stair beneath the sanctum and explores a second act: five authored floors, each with its own spatial puzzle and the six new enemy types. The new final boss, the Taproot, protects the heartwood. Bringing the heartwood to the village Warden completes a second, durable ending.

Keep the existing exploration-first experience. Enemies are resource gates, not tactical encounters. Keep the first ending and Floors 1–5 playable unchanged except for the specified Floor 5 sanctum edit.

## Approved source material — authoritative, external to the repo

Do **not** improvise the floor grids, entity coordinates, reward/stat tables, or required route from this prose. Transcribe the approved artifacts referenced in HPA-741:

- Annotated Floor 6–10 PNG maps, attached to the Linear issue, with numbered entities and the drawn required route.
- Project-file layouts and entity definitions: `/mnt/project-files/floors-6-10/tools/f6.py` through `f10.py`. `chain.py` links stairs and sizes waystones; `explore.py` checks maze constraints; `draw.py` redraws the maps; `lib.py` offers an `emit()` TypeScript output helper.
- The stats and enemy traits described in HPA-741, including the bestiary reference linked there.

Those private project-file paths are **not present in the current repository**. They must be available to the implementation worker before map transcription; use the attached maps when scripts are unavailable. No source-map contents have been independently verified in this planning PR.

The alternate “Wellworks” written-spec branch (`8d64f74`) is **not** a layout source; only the already-approved narrative premise that the lower floors open after restoration is retained.

## Chosen architecture

Build on the current pure game rules and authored map model:

`input → session.ts → movement.ts/actions.ts/combat.ts → immutable GameState → Phaser/DOM rendering`

Existing seams are sufficient for ordinary portals (including same-floor portals), item/fact-gated portal locks, rear-side and guard/lever latches, linked levers, stat and item rewards, NPC interactions, section discovery, saves, and localized text.

Extend closed unions and registries where needed; **do not** introduce a new world scene, puzzle DSL, event system, ECS, quest engine, floor-specific controller, procedural map generator, generic condition evaluator, extra persisted state, or save migration.

### Floor-by-floor design contracts

| Floor | Required play shape | Existing primitive / minimal extension |
| --- | --- | --- |
| **6 — Cisterns** | Nine isolated tanks; only paired sluice pads connect tanks. | Reciprocal `portal` pairs with `target.mapId: 'floor6'`; a `sluice-pad` asset key temporarily points at existing art. No new teleport entity or portal rule. |
| **7 — Cloister** | Four quarter-turned wings surrounding a cloister; four linked bells control the central reliquary; two opposite pulls can leave all four thrown. | Existing `lever.links`, `openedShortcutIds` and `latch.leverIds`; preserve the approved links and placement exactly. |
| **8 — Rift** | Chasm divides west/east. Travel through a Floor 9 underpass to reach the other side; open bridge gate from the east; item-gated lower stair uses a rift key found in the east. | Reciprocal cross-floor `portal` pairs, item `PortalLock`, `reward` for key, rear-side `latch` for the bridge. No one-way portal extension unless the approved source proves it indispensable. |
| **9 — Crossways** | Three horizontal bands, each with three crossings guarded by different enemy types. One crossing per band suffices. Includes the Rift underpass. | Authored layout and ordinary enemy blockers, with reciprocal stairs between floors. Do not invent an additional dependency on defeating all three guards. |
| **10 — Taproot** | Root-shaped passages; defeat two root wardens to unlock the heart hatch; Taproot boss guards heartwood and the lift home. | `latch.guardIds`, ordinary `EnemyEntity` with traits, `reward` item, reciprocal lift `portal`. |

**Floor 8 progression invariant:** The ticket says the rift key is in the east half but the Floor 8 stair down needs that key. The approved map/routes must explicitly prove the east half can first be reached through another unlocked path (e.g. the Floor 9 underpass); otherwise this would be a softlock. Validate the actual portal graph *before* transcribing the map; if the approved artifacts contradict each other, document the specific route conflict for resolution instead of silently moving the key or lock.

### Floor 5 and village connections

- On Floor 5, move `floor5-heart-waystone` from `(11,9)` to `(10,9)` and place the new stair to Floor 6 at `(11,9)`.
- Gate the new stair on existing fact `main-village-restored`. Unlocking must occur only after the first Warden ending. The reciprocal Floor 6 arrival is `(5,15)`.
- Add the authored return lift from Floor 10 to a **new, unoccupied** village tile, with its reciprocal portal. Keep the existing Floor 5 ↔ village lift.
- Every portal must satisfy `validateContent()`'s reciprocal-target rule; every entity must occupy a legal, unique floor tile and every floor tile must be section-covered.

### Combat traits (the only new rule behavior)

Extend `EnemyEntity['stats']` with exactly these optional values:

```ts
firstStrike?: boolean; // enemy takes the opening turn
doubleStrike?: number;  // per-enemy-turn probability, e.g. 0.4
pierce?: number;        // ignores up to N hero DEF
```

Rules:

1. No trait means byte-for-byte equivalent combat behavior and preview output to Floors 1–5.
2. `firstStrike` changes turn order: one enemy turn before the hero's first strike. It is not a separate recurring bonus attack.
3. On *each enemy turn*, `doubleStrike` independently rolls once for a follow-up blow; each blow independently uses normal hit chance. This includes the opening turn, if applicable. Keep all rolls through the injected `Rng`.
4. `pierce` makes enemy damage `max(0, enemy.attack - max(0, hero.defense - pierce))`, without altering the hero's stored defense.
5. The fight preview incorporates opening turns, the expected follow-up rate, hit chances and piercing damage into its approximate HP-loss forecast. Preserve the old calculation for traitless enemies and existing `combat-lethal`/`combat-unwinnable` gates.
6. The replay uses its existing ordered `Blow[]`: first blows and follow-ups are actual distinct entries, with normal lunge, hit/miss and HP displays. Show localized trait labels on both the preview and replay encounter cards; keep these presentational labels derived from enemy stats rather than adding save fields or building another animation pipeline.

The six cast types are Ravager, Bulwark, Darter, Twinblade (40% follow-up), Ambusher (first strike), and Lancer (pierce 4). Darter's evasion remains ordinary AGI-based hit chance. The Taproot combines first strike and pierce 4, with pinned stats **96 HP / 59 ATK / 41 DEF / AGI 3**. Author each encounter's actual stats/position from the approved source; do not infer all stats from an enemy-type enum.

### Balance and progression

- Approved full-exploration hero enters Floor 6 at **ATK 43 / DEF 43**. The required-only Floors 1–5 hero remains unable to damage the new encounters and must revisit missed upgrades.
- New encounter numbers are authored against a required-route frame of ATK 16 / DEF 6 and shifted by **+37 enemy ATK / +27 enemy DEF**, per the issue's script notes. Do not re-stat Floors 1–5 or raise the hero's AGI.
- The approved deep-route sequence has **25 fights**, with chance-trait encounters off the required route. Simulate the worst case with all strikes landing, pinning **30 HP remaining** after the last fight. Approximate total new waystone grants are **1,235 HP**; use exact per-waystone values emitted from the approved route instead of distributing this total by intuition.
- Save route state in existing `defeatedEnemyIds`, `openedRewardIds`, `openedShortcutIds`, `itemIds`, `factIds` and `discoveredSectionIds`. No new durable counter or puzzle state.

### Second ending, journal, and languages

Add the rift key and heartwood as ordinary item rewards and use existing item/portal-lock validation. Prioritize the heartwood branch in `resolveNpcInteraction('village-warden', state)`, recording one new idempotent second-ending fact, while keeping the original Restoration Core ending and `main-village-restored` fact intact.

**Preserve the existing `story-complete` main lead after the first ending**, because both release journeys assert it. Derive a *second-act* objective from the existing first-ending fact, the key/heartwood items and the second-ending fact (a small new journal entry is sufficient). This avoids rewriting the first ending or storing quest status.

All new map names, sections, enemy names, items, clues, access messages, new dialogue, trait names and objective text must have **English, Traditional Chinese, and Japanese** entries in the existing `src/i18n` tables. No game prose in map modules.

### Art ownership

The existing six enemy sprites and portraits are available in GitHub commit `2bec23f` on `claude/project-thread-dyra9d`. Bring **only** those 12 already-made images into HPA-741 and register them in `ASSET_PATHS`/`PORTRAIT_PATHS`; do not merge unrelated branch commits.

For the Taproot, register a stable `enemy-taproot` art key that temporarily aliases the existing ruin-sentinel sprite and portrait. For sluice pads, register a stable `sluice-pad` key temporarily pointing to a current interactable sprite. These keys let **HPA-742** replace just the paths/binaries after generation, without changing gameplay content.

No new artwork, animation, SFX or image generation is in HPA-741.

## Validation and acceptance

- `validateContent()` succeeds: unique IDs, valid sections, known locks/items/facts, reciprocal portals (including same-floor pad pairs and the village lift).
- Path/reachability tests verify all nine tanks, the four linked levers, east-side Rift access before collecting the key, the bridge shortcut, a choice of Floor 9 crossings and the two-warden heart hatch.
- Combat tests cover trait-free parity, first strike, follow-up hit/miss/RNG sequencing, pierce-4 damage, combined Taproot traits, preview and ordered replay.
- New route test models the 25 required fights with **RNG = () => 0**, collects approved grants, and pins the 30 HP final balance. Confirm the required-only previous route cannot trivially clear Floor 6.
- An entity-named Playwright journey traverses new floors through the **real** input/save/DOM path, including travel, boss, heartwood, Warden second ending, reload, trait preview and replay visibility.
- Existing required-only and explorer release journeys still pass after the Floor 5 waystone edit.
- Typecheck, lint, Prettier, build, unit tests, Playwright and runtime asset-file checks all pass.

## Exclusions

No generation of new boss/pad art (HPA-742), no alternative “Wellworks” layout, no enemy rebalancing on Floors 1–5, no hero AGI changes, no new persistence layer, no general-purpose combat status framework, no new UI framework, and no separate implementation PR for this ticket.
