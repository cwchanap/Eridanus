# HPA-741 — Floors 6–10 Implementation Plan

> **Status:** Draft; implementation has not started. Follow the approved HPA-741 maps rather than inventing a new layout.
>
> **Spec:** `docs/superpowers/specs/2026-11-06-hpa-741-deep-floors-design.md`
>
> **Workflow:** **One ticket, one PR.** Add implementation commits to this draft PR after review; do **not** create a separate implementation PR or split this ticket into per-floor PRs. HPA-742 remains a separate art-generation task/PR.

## Before writing map code: source and proof checks

- [ ] Retrieve the five annotated maps from HPA-741 (Floor 6–10), plus `/mnt/project-files/floors-6-10/tools/` if available to the implementing worker. These files are **not in the repository** at drafting time; the Linear attachments are the fallback source. Do not start by guessing map rows from the ticket description.
- [ ] Re-run or inspect `chain.py` and `explore.py` if the tools are available; record the 25 encounter sequence, every stat grant/waystone, coordinates/IDs, staircase pair, and expected end HP in the implementation commit. Treat `f6.py`–`f10.py` and the approved annotated PNGs as authoritative.
- [ ] **Resolve the Floor 8 dependency graph before implementation**: verify a player can reach the *east* key via a pre-key Floor 9 underpass/other approved route, then unlock the item-gated Floor 8 stair. If this is impossible in the approved maps, report the concrete cycle in the PR and have the source corrected; do not silently improvise a different maze.
- [ ] Trace the existing optional stat sources/shops/trades and the intended start state to substantiate the **ATK 43 / DEF 43** Floor 6 entry baseline. The existing required-only route ends at ATK 16 / DEF 6 / HP 4, so it is **not** the hero used to balance the second act.
- [ ] Inspect current `main` immediately before implementation for changes to combat, Floor 5, the content registry or release tests, and update the plan only where source has changed.

## Task 1 — Combat traits first (pure rules, tested)

**Modify:** `src/game/types.ts`, `src/game/combat.ts`, `src/game/combat.test.ts`.

- [ ] Add `firstStrike?: boolean`, `doubleStrike?: number`, `pierce?: number` to enemy stats. Document units (follow-up probability in [0,1]; pierce nonnegative DEF points) and validate authored values, without inventing a trait registry.
- [ ] Keep `hitChance`, `Rng`, the `Blow[]` contract and `resolveCombat` outcome ownership. Implement an enemy-turn helper: attempt a normal enemy strike; roll for an optional second strike; each strike gets its own hit roll and ends the fight immediately if HP reaches zero. Handle the initial enemy turn for first strike before hero attack.
- [ ] Use the same mechanics in `previewCombat`'s estimated HP loss. In the trait-free case retain the existing calculation exactly so all previous preview fixtures pass. For first strike, include the enemy's opening turn; for double strike, include its expected extra rate; for pierce, reduce effective hero DEF by at most `pierce`.
- [ ] Add focused fixtures for: traitless baseline; first-strike opening even if the hero would kill in one blow; Twinblade 0%, 40% and deterministic proc/no-proc paths; independent follow-up hit rolls; pierce when DEF is below/above 4; combined first-strike + pierce boss; lethal preview; loss/replay consistency; RNG sequence. Ensure zero-damage rounds still obey the current maximum-round guard.
- [ ] Verify: `bunx vitest run src/game/combat.test.ts`.

**Design constraint:** no second combat engine, no special boss scene, no new `GameState` fields and no unrelated rebalancing.

## Task 2 — Author the approved floor maps and portals

**Add:** `src/game/content/floor6.ts` through `floor10.ts`.

**Modify:** `src/game/types.ts` (`MapId`), `src/game/content.ts` (`MAPS`), `src/game/content/floor5.ts`, `src/game/content/village.ts`, `src/game/content/facts.ts`, and associated content tests.

- [ ] Transcribe each approved ASCII layout, sections and entity list; if `lib.py emit()` helps, use its output as a **one-time authoring aid** and review the generated TS. Do not add a runtime Python or map-generation dependency.
- [ ] **Floor 6:** Build all nine isolated tanks, paired same-floor reciprocal sluice-pad portals and approved rewards/fights. Use the temporary `sluice-pad` art key; no new entity kind.
- [ ] **Floor 7:** Build quarter-rotated wings and four linked levers; the two documented opposite pulls must throw all four and release the reliquary latch. Use the current lever/wired-latch semantics.
- [ ] **Floor 8:** Build split chasm, cross-floor underpass via Floor 9, east-side bridge latch, item-requiring stair and east-half rift-key reward. Pin the valid unlock/traversal order in tests.
- [ ] **Floor 9:** Build three horizontal bands with three independently guarded crossing choices per band. Author the required choice rather than changing the rule so each guard becomes globally mandatory. Connect its ordinary stairs and underpass reciprocity.
- [ ] **Floor 10:** Build two root-warden guards, guarded heart hatch, Taproot enemy, heartwood item and reciprocal village lift.
- [ ] **Floor 5:** Move the existing heart waystone `(11,9) → (10,9)`; add a fact-gated stair at `(11,9)` with `requiresFactId: 'main-village-restored'`, pointing to Floor 6 `(5,15)`. Keep old core guardian, Restoration Core and Floor 5 lift untouched.
- [ ] **Village:** Add the new reciprocal Floor 10 lift on an unoccupied floor tile, preserving `village-lift-to-floor5`. Pick the approved position and update its section if needed.
- [ ] Extend the existing content validator only when a *real* rule invariant is missing (e.g., nonnegative trait values); no generic condition language. Assert section coverage, no duplicate tile/ID, valid facts and items, and portal reciprocity.
- [ ] Verify: `bunx vitest run src/game/content.test.ts src/game/movement.test.ts`.

**Source-of-truth rule:** do not replace exact coordinates/stat grants in the approved maps with “roughly equivalent” placements. Every expected entity ID/coordinate and route gate comes from the maps/tools.

## Task 3 — Wire enemy art and trait presentation

**Modify:** `src/phaser/assets.ts`, `src/ui/InteractionOverlay.ts`, `src/phaser/assets.test.ts`, related presentational tests as appropriate.

- [ ] Selectively bring the existing **12** completed enemy PNG files from Git commit `2bec23f`: six map sprites under `public/assets/enemies/` and six portraits under `public/assets/portraits/`. Do not merge the whole art branch.
- [ ] Register six enemy keys and portrait paths. Add a stable `enemy-taproot` key temporarily pointing at the existing ruin-sentinel files, and `sluice-pad` temporarily pointing at a current floor interactable. Leave replacement art for HPA-742.
- [ ] Map Floors 6–10 to existing dungeon terrain, and add English/Chinese/Japanese enemy names via the current asset-key lookup.
- [ ] Show localized first-strike/follow-up/pierce indicators in `renderEncounter` **and** `renderBattle` using the enemy's authored stats. Keep one existing encounter card and replay pipeline; ordered `Blow[]` already drives visible first and consecutive strikes.
- [ ] Assert the UI accurately labels each trait and the replay displays enemy opening/follow-up blows and piercing effects. Avoid new overlay state or a trait-specific animation subsystem.
- [ ] Verify asset paths are served and portrait sizing remains within the established 96×96 map / 64×64 portrait contract.

## Task 4 — Items, story, journal, and three languages

**Modify:** `src/game/dialogue.ts`, `src/game/journal.ts`, `src/game/content/facts.ts`, `src/i18n/en.ts`, `src/i18n/zh-Hant.ts`, `src/i18n/ja.ts` and their unit tests.

- [ ] Use existing reward and item arrays for rift key and heartwood, with stable unique IDs in maps and locale tables. The rift key is the Floor 8 portal requirement; the heartwood is the new Warden ending prerequisite.
- [ ] Extend the Warden's state-derived dialogue with a **highest-priority heartwood** case, recording exactly one new fact for the second ending. Do not remove or repurpose `main-village-restored`; re-talking to the Warden is idempotent.
- [ ] Preserve the main quest's existing `story-complete` after the first restoration. Add one small derived second-act journal objective (explore the lower stair → recover heartwood → return to Warden → completed), based only on the existing fact and item arrays.
- [ ] Add all player-visible strings in **en**, **zh-Hant**, and **ja**: five maps, sections, items, clues, lock notices, six enemy types, trait descriptions, Warden lines and journal objectives. Use existing `messages.test.ts` coverage rather than a new localization framework.
- [ ] Verify existing Restoration Core dialogue variants and first-ending save/reload tests still pass, plus new heartwood branch and persistence tests.

## Task 5 — Prove route integrity and balance

**Modify:** `src/game/combat.test.ts`, `src/game/content.test.ts`, `src/game/movement.test.ts`, `src/game/dialogue.test.ts`, `src/game/journal.test.ts`, `src/game/save.test.ts` (only where applicable).

- [ ] Add table-driven reachability checks for each floor's defining trick: isolated Floor 6 tanks reachable only through portal pairs; Floor 7 lever pairing; Floor 8 key-before-stair progression and bridge from east; Floor 9 alternate guarded crossings; Floor 10 two-warden gate. Use actual content/rules rather than an invented traversal implementation.
- [ ] Write a **second-act required route** test with the approved entry-state stats and the exact 25 named fights/grants. Simulate with `() => 0` (all attacks land; the chance-trait enemies are off this route). Pin total fights, every step winnable, waystone consumption and **30 HP** at the end. Assert Taproot authored stats exactly as HPA-741.
- [ ] Verify optional evasive/double-strike enemies produce bounded/accurate previews and that a prematurely arrived required-only Floors 1–5 hero cannot damage the intended Floor 6 gatekeepers.
- [ ] Add locked/unlocked stair tests and save validity for newly added floor IDs, portal arrival tiles, opened rewards, gate state and the second-ending fact. Keep the current save schema, and do not add backward-compatibility migrations.

## Task 6 — One real browser journey; preserve both releases

**Modify:** `tests/e2e/cross-floor.spec.ts` and/or add `tests/e2e/deep-floors.spec.ts` using existing `Journey` and `journeyChapters`. No test-only game API.

- [ ] Keep the existing **required-only** and **explorer** release journeys intact and green. Reuse their `Journey` helpers; if the new test needs a complete upgraded hero, replay earlier authored chapters and legitimately collect/buy the requisite upgrades, rather than injecting made-up state via an internal hook.
- [ ] Add a deep-floor journey expressed as `j.travel(id)`, `j.fight(id)`, `j.drink(id)`, `j.expectBump(id, kind)`, etc., never tile-by-tile key counts. Cover unlocking Floor 5 stair, all five floors' distinguishing mechanics, Taproot, heartwood, new lift and Warden's second ending.
- [ ] Check trait badges in both combat prompt and battle replay, correct enemy blow order, and one post-ending reload with preserved state.
- [ ] Where earlier chapters are pure-state setup, use `replayOnly` rather than repeating slow browser steps. Avoid gratuitous changes to the working release journeys.

## Final same-PR verification

Run the full existing quality gates (all must be green):

```sh
bun run typecheck
bun run lint
bun run format:check
bun run build
bun run test:unit
bun run test:e2e
```

Then verify manually in browser the five distinctive room designs, the sound/readability of multi-blow replays, the distinct temporary pad/boss art, the 43/43 full-exploration entry and the final Warden interaction.

### Acceptance checklist

- [ ] Approved Floor 6–10 authored maps faithfully shipped; all required paths traversable and each floor's mechanic recognizable.
- [ ] Floor 5 unlock/waystone adjustment and Floor 10 village lift reciprocal; original first ending unchanged.
- [ ] Six new enemy arts available, traits behave and display in preview + replay; no new art generation in HPA-741.
- [ ] 25-fight fixed-roll route finishes with 30 HP, and under-upgraded hero is gated by damage.
- [ ] Second-ending fact persists and produces localized dialogue in EN / 繁中 / 日本語.
- [ ] New e2e deep journey and both existing release journeys green.
- [ ] Everything implemented on this **same** HPA-741 PR, which can be marked ready for review only after verification.

## Deferred work

**HPA-742** generates and integrates the final 96×96 Taproot map sprite, 64×64 Taproot portrait, and 96×96 sluice-pad sprite in its **own PR**. Once the stable asset keys from this ticket exist, that task should require only asset files/path updates—not gameplay code.
