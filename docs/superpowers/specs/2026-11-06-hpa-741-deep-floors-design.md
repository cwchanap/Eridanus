# HPA-741 — Floors 6–10: Deep Floors Design

> **Status:** Draft implementation design for review. The five annotated floor maps were approved on 2026-11-06; this document defines how to implement them, not a replacement layout.
>
> **Linear:** https://linear.app/cwchanap/issue/HPA-741/tower-maze-build-floors-6-10-the-deep-floors-below-the-heart
>
> **Delivery:** One HPA-741 PR, initially docs-only and subsequently extended with implementation on the _same branch/PR_. New Taproot/sluice artwork belongs to HPA-742, not this PR.

## Goal and player experience

After restoring the Floor 5 core and completing the existing village ending, the hero finds a newly unlocked stair beneath the sanctum and explores a second act: five authored floors, each with its own spatial puzzle and the six new enemy types. The new final boss, the Taproot, protects the heartwood. Bringing the heartwood to the village Warden completes a second, durable ending.

Keep the existing exploration-first experience. Enemies are resource gates, not tactical encounters. Keep the first ending and Floors 1–5 playable unchanged except for the specified Floor 5 sanctum edit.

## Approved source material — authoritative, external to the repo

Do **not** improvise the floor grids, entity coordinates, reward/stat tables, or required route from this prose. Transcribe the approved artifacts referenced in HPA-741:

- Annotated Floor 6–10 PNG maps, attached to the Linear issue, with numbered entities and the drawn required route.
- Project-file layouts and entity definitions: `/mnt/project-files/floors-6-10/tools/f6.py` through `f10.py`. `chain.py` links stairs and sizes waystones; `explore.py` checks maze constraints; `draw.py` redraws the maps; `lib.py` offers an `emit()` TypeScript output helper.
- The stats and enemy traits described in HPA-741, including the bestiary reference linked there.

Those private project-file paths are **not present in the current repository** and the map coordinates/stats have **not** been independently verified in this docs-only draft. **Mechanism review is not approval of the final map data.** The first implementation slices must commit the exact approved layouts, entity coordinates, stats and grants as version-controlled `floor6.ts`–`floor10.ts` source. Use `lib.py emit()` once as an authoring shortcut if available; if not, transcribe from the Linear attachments and review the diff against those images. No runtime generator or copies of private tooling are needed. The reviewed TypeScript, executable map tests and named route test become the reproducible source of truth; never leave the authoritative implementation dependent on an inaccessible `/mnt/project-files` path.

The alternate “Wellworks” written-spec branch (`8d64f74`) is **not** a layout source; only the already-approved narrative premise that the lower floors open after restoration is retained.

## Chosen architecture

Build on the current pure game rules and authored map model:

`input → session.ts → movement.ts/actions.ts/combat.ts → immutable GameState → Phaser/DOM rendering`

Existing seams are sufficient for ordinary portals (including same-floor portals), item/fact-gated portal locks, rear-side and guard/lever latches, linked levers, stat and item rewards, NPC interactions, section discovery, saves, and localized text.

Extend closed unions and registries where needed; **do not** introduce a new world scene, puzzle DSL, event system, ECS, quest engine, floor-specific controller, procedural map generator, generic condition evaluator, extra persisted state, or save migration.

### Floor-by-floor design contracts

| Floor             | Required play shape                                                                                                                                                            | Existing primitive / minimal extension                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **6 — Cisterns**  | Nine isolated tanks; only paired sluice pads connect tanks.                                                                                                                    | Reciprocal `portal` pairs with `target.mapId: 'floor6'`; a `sluice-pad` asset key temporarily points at existing art. No new teleport entity or portal rule.                                  |
| **7 — Cloister**  | Four quarter-turned wings surrounding a cloister; four linked bells control the central reliquary; two opposite pulls can leave all four thrown.                               | Existing `lever.links`, `openedShortcutIds` and `latch.leverIds`; preserve the approved links and placement exactly.                                                                          |
| **8 — Rift**      | Chasm divides west/east. Travel through a Floor 9 underpass to reach the other side; open bridge gate from the east; item-gated lower stair uses a rift key found in the east. | Reciprocal cross-floor `portal` pairs, item `PortalLock`, `reward` for key, rear-side `latch` for the bridge. No one-way portal extension unless the approved source proves it indispensable. |
| **9 — Crossways** | Three horizontal bands, each with three crossings guarded by different enemy types. One crossing per band suffices. Includes the Rift underpass.                               | Authored layout and ordinary enemy blockers, with reciprocal stairs between floors. Do not invent an additional dependency on defeating all three guards.                                     |
| **10 — Taproot**  | Root-shaped passages; defeat two root wardens to unlock the heart hatch; Taproot boss guards heartwood and the lift home.                                                      | `latch.guardIds`, ordinary `EnemyEntity` with traits, `reward` item, reciprocal lift `portal`.                                                                                                |

**Floor 8 progression invariant:** The ticket says the rift key is in the east half but a Floor 8 stair down needs that key. When Floors 8 and 9 are authored together, the **executable** cross-floor route test must reach the east-side rift key via an unlocked path (e.g. the Floor 9 underpass) **before** attempting that locked stair. If the approved layout fails the test, surface the concrete cycle for map review; do not silently move the key or invent a new portal rule.

### Floor 5 and village connections

- On Floor 5, move `floor5-heart-waystone` from `(11,9)` to `(10,9)` and place the new stair to Floor 6 at `(11,9)`.
- Gate the new stair on existing fact `main-village-restored` with a distinct observation `lockedFactId: 'floor5-deep-stair-seen'` (register that fact). Unlocking must occur only after the first Warden ending. The reciprocal Floor 6 arrival is `(5,15)`.
- Add the Floor 10 return lift at an unoccupied village tile with a reciprocal portal, **but lock the village → Floor 10 side** on the new heartwood item (`requiresItemId: 'tower-heartwood'`, `lockedFactId: 'village-heartwood-lift-seen'`). Otherwise a fresh player can step straight onto Floor 10 and bypass the second act. The Floor 10 → village return side should remain usable after the boss/heartwood. Keep the existing Floor 5 ↔ village lift. Add separate localized `access` and observation-note strings for both locked portals in all three languages. Prove a fresh `createInitialGameState()` yields `accessLocked` at the village endpoint.
- Every portal must satisfy `validateContent()`'s reciprocal-target rule; every entity must occupy a legal, unique floor tile and every floor tile must be section-covered.

### Combat traits (the only new rule behavior)

Extend `EnemyEntity['stats']` with exactly these optional values:

```ts
firstStrike?: true;   // enemy takes the opening turn
doubleStrike?: true;  // uses the one fixed 40% rule
pierce?: number;      // ignores up to N hero DEF
```

Rules:

1. No trait means byte-for-byte equivalent combat behavior and preview output to Floors 1–5.
2. `firstStrike` changes turn order: one enemy turn before the hero's first strike. It is not a separate recurring bonus attack.
3. `doubleStrike` means a fixed `DOUBLE_STRIKE_CHANCE = 0.4` in `combat.ts`, not a per-enemy probability field. On **each** enemy turn (including an opening `firstStrike` turn), roll the first blow's hit check, stop immediately if the hero fell, then roll the follow-up check: it occurs iff `rng() < DOUBLE_STRIKE_CHANCE`. Only when it procs, roll the follow-up blow's own hit check and append its own `Blow`. Use the injected `Rng` for all three rolls in that order. Thus `() => 0` represents the worst case (both attacks land and the follow-up procs).
4. `pierce` makes enemy damage `max(0, enemy.attack - max(0, hero.defense - pierce))`, without altering the hero's stored defense. Only nonnegative `pierce` needs a small content-validation check; the `true` trait flags need no probability validator.
5. The fight preview incorporates opening turns, the expected **0.4** follow-up rate, hit chances and piercing damage into its approximate HP-loss forecast. Preserve the old calculation for traitless enemies and existing `combat-lethal`/`combat-unwinnable` gates.
6. The **preview** shows localized trait descriptions so the player can make an informed decision. The existing battle replay already displays ordered `Blow[]`: first strikes and follow-ups appear as real attacks with the correct hit/miss, damage and HP totals (including armor piercing). Do not add redundant static trait badges or a second replay system unless a playtest demonstrates they are needed.

The six cast types are Ravager, Bulwark, Darter, Twinblade (40% follow-up), Ambusher (first strike), and Lancer (pierce 4). Darter's evasion remains ordinary AGI-based hit chance. The Taproot combines first strike and pierce 4, with pinned stats **96 HP / 59 ATK / 41 DEF / AGI 3**. Author each encounter's actual stats/position from the approved source; do not infer all stats from an enemy-type enum.

### Balance and progression

- The second act is balanced against an **intentional ATK 43 / DEF 43** hero after extensive Floors 1–5 exploration and shopping, **not** an arbitrary “all content cleared” state. A content-derived budget check must pin what funds it: starting ATK/DEF **10/2**, all existing stat rewards **+22/+30**, top sword/armor wares **+7/+7** (39/39), and eight Status Trader purchases split **4 ATK / 4 DEF** (43/43). Current content has **118 enemies worth 1,054 gold**; nine ware purchases cost **400**, eight trades cost **520**, leaving **134 gold**. Recompute those numbers directly from authored content in a regression test, rather than baking the whole economy into implementation code.
- **Tolerance decision:** 43/43 is the one guaranteed balance target; the authored route is **not** required to clear at either 42/44 or 44/42. Those one-point-skew builds can afford a ninth trade at **110 gold** from the 134-gold remainder, correcting the missing point before attempting the deep floors. The combat preview must honestly indicate when the player cannot hurt an encounter, and the player can return to the village to buy the correction. Do not change approved enemy stats to make every spending split equivalent.
- New encounter numbers are authored against a required-route frame of ATK 16 / DEF 6 and shifted by **+37 enemy ATK / +27 enemy DEF**, per the issue's script notes. Do not re-stat Floors 1–5 or raise the hero's AGI.
- The approved deep-route sequence has **25 fights**, with chance-trait encounters off the required route. Simulate the worst case with all strikes landing, pinning **30 HP remaining** after the last fight. **Both entry HP and final HP must be explicit constants in that test**, from one canonical, fixed-RNG pre-Floor-6 full-clear fixture; an end-HP assertion alone is meaningless. The exact entry HP is **not verifiable from the docs-only PR** and must be pinned before approving implementation, not guessed from the first act's unrelated required-only 4 HP end state. Approximate total new waystone grants are **1,235 HP**; use exact per-waystone values emitted from the approved route instead of distributing this total by intuition.
- Save route state in existing `defeatedEnemyIds`, `openedRewardIds`, `openedShortcutIds`, `itemIds`, `factIds` and `discoveredSectionIds`. No new durable counter or puzzle state.

### Second ending, journal, and languages

Add the rift key and heartwood as ordinary item rewards and use existing item/portal-lock validation. Prioritize the heartwood branch in `resolveNpcInteraction('village-warden', state)`, recording one new idempotent second-ending fact, while keeping the original Restoration Core ending and `main-village-restored` fact intact.

Extend the existing `mainLead` **before** the `main-village-restored` branch: second-ending fact → new final resolved lead; heartwood held → return to Warden; first ending completed → descend beneath the heart. Continue using the **same** `JournalEntry { id: 'main' }`, with no side-quest entry kind, extra durable quest field or UI component. Update the two old `endStory` journey assertions to expect the new second-act lead **while retaining the exact original Warden dialogue and `main-village-restored` persistence checks**. Add the new final lead to the existing `RESOLVED_LEADS` set.

All new map names, sections, enemy names, items, clues, access messages, new dialogue, trait names and objective text must have **English, Traditional Chinese, and Japanese** entries in the existing `src/i18n` tables. No game prose in map modules.

### Art ownership

The existing six enemy sprites and portraits are available in GitHub commit `2bec23f` on `claude/project-thread-dyra9d`. Commit `2bec23f` contains **exactly those 12 PNGs**, so a cherry-pick of this one commit is appropriate. Register the six map keys and six portrait keys in `ASSET_PATHS`/`PORTRAIT_PATHS`; do not merge unrelated branch commits.

For the Taproot, register a stable `enemy-taproot` art key that temporarily aliases the existing ruin-sentinel sprite and portrait. For sluice pads, register a stable `sluice-pad` key temporarily pointing to a current interactable sprite. These keys let **HPA-742** replace just the paths/binaries after generation, without changing gameplay content.

No new artwork, animation, SFX or image generation is in HPA-741.

## Validation and acceptance

- `validateContent()` succeeds: unique IDs, valid sections, known locks/items/facts, reciprocal portals (including same-floor pad pairs and the village lift).
- Extend existing `content.test.ts` gate/reachability cases for all five maps and use an actual **cross-floor** journey/replay to verify the Rift's east-side key is reachable without it. Reuse `validateContent()` for entity/section/item/portal invariants instead of duplicating its checks.
- Combat tests cover trait-free parity, first strike, follow-up hit/miss/RNG sequencing, pierce-4 damage, combined Taproot traits, preview and ordered replay.
- A content-derived budget test verifies 43/43 and the ninth-trade correction are affordable. A canonical full-clear **pure-rules** setup must explicitly pin the Floor 6 entry HP alongside ATK 43 / DEF 43.
- New route test models the **25 named fights** with **RNG = () => 0**, collects approved grants, and pins **both entry HP and 30 HP at the end**. Confirm the required-only previous route cannot trivially clear Floor 6, and a fresh save cannot use the village → Floor 10 lift.
- Build a **reusable pure-rules full-clear setup** for an honest 43/43 Floor 6 entry; use it to seed the entity-named Playwright journey through the **real** input/save/DOM path, including travel, boss, heartwood, Warden second ending, reload, trait preview and ordered-blow replay. No test-only game API.
- Existing required-only and explorer release journeys still pass after the Floor 5 waystone edit and their first-ending tracker assertions are updated to the new, truthful second-act objective.
- Typecheck, lint, Prettier, build, unit tests, Playwright and runtime asset-file checks all pass.

## Exclusions

No generation of new boss/pad art (HPA-742), no alternative “Wellworks” layout, no enemy rebalancing on Floors 1–5, no hero AGI changes, no new persistence layer, no general-purpose combat status framework, no new UI framework, and no separate implementation PR for this ticket.
