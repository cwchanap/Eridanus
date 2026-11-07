# HPA-741 — Floors 6–10 Implementation Plan

> **Status:** Revised draft after PR #39 design review; implementation has **not** started.
>
> **Design:** `docs/superpowers/specs/2026-11-06-hpa-741-deep-floors-design.md`
>
> **Workflow:** **One HPA-741 ticket = one PR.** Add code commits to this existing draft PR after reviewing the design. Each stage below is a **commit/checkpoint**, not a separate ticket or PR. New Taproot/sluice art belongs exclusively to HPA-742.

## Verified base and blockers

The current `main` already has `MAPS`/`MapId`, reciprocal portals (including same-floor portals), fact/item `PortalLock`, linked levers, guarded/rear latches, one-time items and HP grants, idempotent fact progression, and replay from ordered `Blow[]`. Reuse these without adding new game systems.

The approved five annotated maps and `/mnt/project-files/floors-6-10/tools/f6.py` … `f10.py` are referenced in Linear HPA-741, **not stored in this repo**. No exact map coordinates, encounter list or Floor 6 **entry HP** have been independently verified in the docs-only branch. Map-data approval remains **conditional** until these values are committed as authored TypeScript and checked by tests.

**Preimplementation checks**

- [ ] Obtain the five HPA-741 approved annotated PNGs and, if available, the authoring tools `f6.py`–`f10.py`, `chain.py`, `explore.py`, `lib.py`. Use `lib.py emit()` once if helpful. Do **not** invent layout details or install these scripts as a runtime dependency.
- [ ] Transcribe the authoritative data into reviewable `src/game/content/floor6.ts` … `floor10.ts` files **through the vertical slices below**. Review entity coordinates, stats and grants in those diffs. The committed map definitions, `validateContent()`, named reachability checks and route test are the durable records; **not a comment or commit message**.
- [ ] Verify the complete cross-floor dependency graph with actual authored content. In particular Floor 8's east-side rift key must be accessible *before* its item-locked stair (possibly through Floor 9's underpass). If that test fails, report the exact approved-map conflict rather than silently changing the puzzle.
- [ ] Establish one canonical, fixed-RNG fully upgraded Floor 6 entry state with explicit `HP_ENTRY`, `ATK 43`, `DEF 43`. Pin `HP_ENTRY` as a **number** after the approved route/budget data are available. **Never guess it from the unrelated required-only previous ending at HP 4.**
- [ ] Check for source changes on `main` before adding runtime commits, especially Floor 5, combat, and release journeys.

## Checkpoint 1 — Combat traits, no floor code

**Modify:** `src/game/types.ts`, `src/game/combat.ts`, `src/game/combat.test.ts`. Optionally make the minimal preview-card change in `src/ui/InteractionOverlay.ts` in this checkpoint; full translations land alongside the first floor/enemy content that references them.

- [ ] Extend enemy stats with `firstStrike?: true`, `doubleStrike?: true`, `pierce?: number`. `doubleStrike` is a capability **flag**, with `DOUBLE_STRIKE_CHANCE = 0.4` in `combat.ts`. No probability registry/range validator is warranted for a single rate. Validate only nonnegative `pierce` in the existing content validator.
- [ ] An enemy turn is: roll the first blow's hit check; stop on hero death; if `doubleStrike`, roll `rng() < 0.4` **after** the first hit roll; if true, roll the follow-up hit and append another `Blow`. Run an opening enemy turn for `firstStrike`. Preserve hit/miss and existing `MAX_ROUNDS` behavior.
- [ ] Use effective hero DEF `max(0, hero.defense - (pierce ?? 0))` for incoming damage. Keep the old trait-free combat preview math **exactly** and add first-strike opening loss / expected follow-up count / pierce damage to traited forecasts.
- [ ] Test first-strike order (including when the hero could kill in one blow), independent first/follow-up hit checks, proc and no-proc rolls, `() => 0` always proccing + landing the follow-up, combined Taproot traits, low/high DEF pierce, preview/lethality, win/loss, and replay `Blow[]` order.
- [ ] Keep battle replay on the existing `Blow[]` path in `main.ts`/`WorldScene`. The decision-time preview shows localized trait descriptions. Replay conveys first strikes, follow-ups and piercing through the actual blow order/damage, **not new redundant static trait badges**.
- [ ] Verify: `bun run typecheck && bun run test:unit` (and formatter before committing).

## Checkpoint 2 — Floor 5 stair + Floor 6 vertical slice

**Add:** `src/game/content/floor6.ts`.

**Modify together:** `src/game/types.ts`, `src/game/content.ts`, `src/game/content/floor5.ts`, `src/game/content/facts.ts`, `src/phaser/assets.ts`, **all three** `src/i18n` language tables, `src/game/content.test.ts` and `src/game/movement.test.ts`.

- [ ] Author the approved nine disconnected tanks, their exact paired same-floor sluice portals, enemies, waystones, sections and **upstream Floor 5 ↔ 6 stair**. A `portal` already supports these pads; no new entity kind or teleport engine. **Stage forward connections:** do not author Floor 6 → 7 until Floor 7 exists in the next checkpoint (likewise Floor 7 → 8 and Floor 9 → 10). Add both ends of each new reciprocal connection in the **same** checkpoint, so `MapId` and `validateContent()` stay green throughout.
- [ ] Move `floor5-heart-waystone` `(11,9) → (10,9)`. Add a fact-locked Floor 5 → Floor 6 stair at `(11,9)` requiring `main-village-restored`, with `lockedFactId: 'floor5-deep-stair-seen'` and reciprocal Floor 6 arrival at `(5,15)`. Register the sighting fact and EN/繁中/日本語 note + access strings.
- [ ] Cherry-pick `2bec23f` **once** (it contains exactly the existing 12 PNGs for the six new enemy sprites and portraits). Register all six enemy art/portrait paths, a stable `enemy-taproot` placeholder alias to the ruin-sentinel sprite **and portrait**, and a stable `sluice-pad` placeholder alias. Do not generate new art in this PR.
- [ ] Add `floor6` to `MapId`, `MAPS`, `TERRAIN_BY_MAP`, EN/繁中/日本語 map/section/clue/enemy/item tables **in the same commit**. Keep assets and localization compile-complete; no `Record<MapId, ...>` holes.
- [ ] Extend existing `validateContent()` and `content.test.ts` rather than duplicating validation. Pin all nine reachable tanks via reciprocal pads and require the Floor 5 fact gate to deny/allow as authored.
- [ ] Verify: `bun run typecheck && bun run test:unit`.

## Checkpoint 3 — Floor 7 vertical slice

**Add:** `src/game/content/floor7.ts`.

**Modify together:** `MapId`, `MAPS`, `TERRAIN_BY_MAP`, EN/繁中/日本語 tables, `src/game/content.test.ts` and relevant existing movement tests.

- [ ] Use approved layout: quarter-rotated wings, bell levers and reliquary. Configure `lever.links` and wired `latch.leverIds` rather than a special puzzle rule.
- [ ] Record the two opposite lever bumps that leave all four thrown; reuse the existing gate/lever regression cases. **Add Floor 6 ↔ 7 portal endpoints together**; defer the Floor 7 ↔ 8 pair to the next checkpoint.
- [ ] Verify: `bun run typecheck && bun run test:unit`.

## Checkpoint 4 — Floors 8 **and** 9 in one green slice

**Add:** `src/game/content/floor8.ts` and `floor9.ts`.

**Modify together:** `MapId`, `MAPS`, `TERRAIN_BY_MAP`, EN/繁中/日本語 tables, `src/game/content.test.ts` and `src/game/movement.test.ts`.

- [ ] Commit these two floors **together**, since their Rift underpass is one connected feature and half a reciprocal pair would fail validation. **Add Floor 7 ↔ 8**, all Floor 8 ↔ 9 underpass/regular reciprocal pairs, and their approved layouts together; defer Floor 9 ↔ 10 until Checkpoint 5. Transcribe the chasm, two-sided bridge, east-side key, item-locked stair, and three-by-three guarded Crossways bands.
- [ ] Preserve the intended alternative crossing paths (one guard choice per band), the bridge's `rearSide` east unlock and the key's natural discovery order. No new portal/latch runtime variant.
- [ ] Extend the existing `content.test.ts` gate/rear-latch table with `frontStair.floor8` and add one **actual rules-driven cross-floor replay** that travels via the Floor 9 underpass to the east-side key **while the key-gated stair is still locked**. Check the bridge can subsequently open from the east. A mere per-map flood fill cannot prove this.
- [ ] Pin reciprocal portals, lock-notice facts and texts in all three languages and test both locked/unlocked travel.
- [ ] Verify: `bun run typecheck && bun run test:unit`.

## Checkpoint 5 — Floor 10, return lift, and second ending

**Add:** `src/game/content/floor10.ts`.

**Modify together:** `src/game/types.ts`, `src/game/content.ts`, `src/game/content/village.ts`, `src/game/content/facts.ts`, `src/game/dialogue.ts`, `src/game/journal.ts`, `src/ui/JournalPanel.ts`, `src/phaser/assets.ts`, the three `src/i18n` tables and applicable unit tests.

- [ ] Author the Taproot root maze, two root wardens' guarded hatch, heartwood reward, boss (HP **96**, ATK **59**, DEF **41**, AGI **3**, `firstStrike`, `pierce: 4`) and Floor 10 → village lift from the approved map. **Add the reciprocal Floor 9 ↔ 10 pair here** to close the last staged forward connection.
- [ ] Make the village return-lift endpoint reciprocal **but item-locked on `tower-heartwood`**, with `lockedFactId: 'village-heartwood-lift-seen'`. Keep the Floor 10 → village return side usable. Add EN/繁中/日本語 `access` and observation `notes` entries. Add a fresh-save movement assertion: bumping the village lift returns `accessLocked` and never travels.
- [ ] Add the rift key and heartwood as existing item rewards. Give `village-warden` a highest-priority heartwood dialogue that records a new **idempotent** final fact. Keep `main-village-restored` and both old Restoration Core lines intact.
- [ ] Extend **the same** `mainLead` with ordered cases: second ending → final resolved lead; heartwood owned → return to Warden; first ending fact → descend below Floor 5. Add the final id to `RESOLVED_LEADS`. No new `JournalEntry` type or quest subsystem. Update the existing release journeys' `endStory` assertions from `story-complete` to the truthful deep-floor main lead while retaining all **dialogue and first-ending fact** checks.
- [ ] Add every new map/item/section/clue/enemy/trait/access/note/dialogue/lead string in **English, Traditional Chinese and Japanese**, and update `messages.test.ts` as needed.
- [ ] Extend `assets.test.ts`/existing runtime asset-serving e2e test rather than building another asset checker.
- [ ] Verify: `bun run typecheck && bun run test:unit`.

## Checkpoint 6 — Reusable full-clear **pure-rules** setup and economy proof

**Modify/add as appropriate:** `src/game/combat.test.ts`, `src/game/content.test.ts`, and a small reusable fixture/helper under `tests/e2e/` using current `Journey`/`dispatchInput`. This **is a separate work step inside HPA-741**, not a separate ticket or PR.

- [ ] Derive the Floors 1–5 spending budget **from authored content**, not hardcoded totals: sum 118 enemy gold drops (currently **1,054**), stat chests (+22 ATK / +30 DEF), last equipped wares (+7/+7), and ladder cost (**400** across nine wares). Eight trader purchases cost `30 + 40 + ... + 100 = 520`, leaving **134**. Assert the 4-ATK / 4-DEF split yields **43/43** from base 10/2, and the ninth trade costs 110 (allowing 42/44 or 44/42 to correct their deficient stat). The guaranteed deep route remains **43/43 only**; do not re-stat enemies for alternative splits.
- [ ] Build a reusable **real-rules, non-browser** progression setup to earn the necessary gold, collect the stat rewards, buy the wares, make eight trades, complete the first ending, and arrive beside the Floor 5 → 6 stair. This may require most/all 118 optional enemies: plan the encounters and purchases intentionally, without a fake save or a test-only game endpoint. Run it through the pure game `Journey` or extracted rule helpers rather than 118 unnecessary browser battles.
- [ ] Pin its exact **`HP_ENTRY` integer**, `ATK 43`, `DEF 43`, and acquired prerequisite facts/items, with `rng = () => 0` for reproducibility. Do not guess HP_ENTRY from the required-only 4-HP ending.
- [ ] Reuse the **same resulting legitimate save** to seed the deep-floor Playwright journey through the existing localStorage load path; verify the hero's actual HUD stats at the Floor 5 stair.

## Checkpoint 7 — Combat balance, route test, new e2e journey, release regressions

**Modify:** `src/game/combat.test.ts`, `src/game/content.test.ts`, `src/game/movement.test.ts`, `src/game/save.test.ts`, `tests/e2e/cross-floor.spec.ts`; add `tests/e2e/deep-floors.spec.ts` only if that keeps the journeys clearer.

- [ ] Reuse/refactor the existing fixed-roll `combat.test.ts` route helper rather than copy its combat loop. Feed the canonical **HP_ENTRY, ATK 43, DEF 43** state into the 25 approved **named** fights and exact per-waystone grants. Assert every combat is winnable, the boss stats, total fight count **25**, opening/follow-up ordering when relevant, and final HP **30**. Chance-trait enemies stay off the required route. Every enemy blow must land under `() => 0`.
- [ ] Confirm the old required-only Floor 5 hero (ATK 16/DEF 6) cannot damage the intended initial Floor 6 gates. Validate save/reload for new map IDs, items, defeated enemies, portal arrivals, gate states, and second-ending fact. No save migrations.
- [ ] Add an **entity-named** deep-floor `Journey` with `j.travel(id)`, `j.fight(id)`, `j.drink(id)`, `j.expectBump(id, kind)` and rules-driven paths. Cover all five defining mechanics, the locked village lift, Taproot, heartwood, return lift, Warden dialogue and persisted ending. Test trait descriptions on the **preview** and actual ordering/damage in the **replay**; skip duplicate static replay badges.
- [ ] Use earlier pure-rules setup/replay without browser wherever possible. Preserve the two existing **required-only** and **explorer** journey story outcomes; only their main-tracker expectations change because the new act follows the first ending.
- [ ] Verify exact authored art/portrait filenames are served through existing asset tests and the browser has no missing textures.

## Final gates (one PR)

Every implementation checkpoint should finish with green typecheck/unit tests. Before marking PR #39 ready for review, run all gates and verify manually the Floor 6 portals, Floor 7 levers, Floor 8/9 route and key sequence, Floor 10 gate, one-point economy recovery, combat preview/replay and both endings:

```sh
bun run typecheck
bun run lint
bun run format:check
bun run build
bun run test:unit
bun run test:e2e
```

### Done when

- [ ] Approved Floor 6–10 grids, coords and route costs exist as reviewable TypeScript; no unverifiable “source only on a machine” dependency remains.
- [ ] All five floors reachable using their authored puzzles; Floor 8 key-before-stair rule proven across Floor 9.
- [ ] Locked village → Floor 10 lift prevents a fresh-run sequence break.
- [ ] 43/43 budget test and canonical **entry HP** are pinned; the **25-fight** all-hits-land route ends with **30 HP**.
- [ ] First Warden ending and new second ending both persist; HUD shows the next objective instead of a premature completed quest.
- [ ] All new player-facing content is translated in EN / 繁中 / 日本語; six existing enemy arts load and temporary Taproot/sluice keys work.
- [ ] Existing required-only/explorer release journeys and new deep journey are green; PR remains **one implementation PR** for HPA-741.

## Out of scope

Do not generate new boss/pad art or SFX. [HPA-742](https://linear.app/cwchanap/issue/HPA-742/tower-maze-art-for-the-taproot-boss-and-the-sluice-pad) will replace the temporary `enemy-taproot` sprite/portrait and `sluice-pad` texture after this feature lands. Also no enemy re-statting on Floors 1–5, AGI upgrades, event/puzzle engines, procedural maps, new persistence schema, or backward-compatibility migrations.
