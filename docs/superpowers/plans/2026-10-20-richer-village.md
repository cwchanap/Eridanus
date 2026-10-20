# Richer Village Implementation Plan

**Goal:** A bigger, busier starting village with three shops, three new villagers, and sealed entrances to future mazes beside the existing tower stair.

**Architecture:** Two new closed entity kinds (`shop`, `sealed`) and one new player stat (`gold`) inside the existing rule chain. Purchases reuse the combat prompt's pending-interaction gate. Art is recolors bound through `assetId`. No new modules beyond `src/game/shop.ts`.

**Spec:** `docs/superpowers/specs/2026-10-20-richer-village-design.md`

## Task 1: Gold

**Files:** `src/game/types.ts`, `src/game/state.ts`, `src/game/combat.ts`, `src/game/content/floor{1,2,3}.ts`, `src/game/save.ts`, `src/ui/StatusPanel.ts`, `src/ui/icons.ts`, `src/styles.css`

- [x] Add `gold` to `PlayerStats` (initial 0) and a required `gold` drop to `EnemyEntity`.
- [x] Credit it in `resolveCombat` and report it on `enemyDefeated`.
- [x] Require it in the save's shape check.
- [x] Show a `Gold n` chip on the hero card; on the short-window layout the chip labels collapse to their icons so all three fit one row.

## Task 2: Shops

**Files:** `src/game/types.ts`, `src/game/shop.ts`, `src/game/actions.ts`, `src/game/session.ts`, `src/game/content.ts`, `src/game/save.ts`, `src/phaser/WorldScene.ts`, `src/main.ts`, `src/ui/InteractionOverlay.ts`

- [x] Add the `shop` entity kind and `ShopWare`; `nextWare` / `resolvePurchase` in `shop.ts`.
- [x] Bumping a counter yields `purchasePrompt` (or `soldOut`); the session turns it into a `purchase` pending interaction.
- [x] Rename the `fight` input to `confirm`; resolve whichever prompt is pending.
- [x] Add the `not-enough-gold` blocked reason.
- [x] Accept bought wares in saved `itemIds` and label them in the items list.
- [x] Validate shop wares: unique item ids, positive price and amount, non-empty stock.
- [x] Render the shop card in the encounter frame with Buy / Leave on Enter / Escape.

## Task 3: Sealed entrances and ambient villagers

**Files:** `src/game/types.ts`, `src/game/actions.ts`, `src/game/content.ts`, `src/game/dialogue.ts`, `src/game/content/dialogue.ts`

- [x] Add the `sealed` entity kind, blocking, answered with `accessLocked`, recording nothing.
- [x] Make `introFactId` optional and add the Elder, Guard, and Child with one line each.

## Task 4: Layout and art

**Files:** `src/game/content/village.ts`, `src/game/content/floor1.ts`, `src/game/state.ts`, `src/phaser/assets.ts`, `public/assets/{characters,interactables}/*.png`, `docs/art/style-guide.md`

- [x] Author the 24×15 village, its five sections, and the moved tower stair (Floor 1's return portal follows it).
- [x] Move the start tile below the Warden.
- [x] Add the six villager recolors and `stairs-sealed`, each exactly 32×32.

## Task 5: Phone map fit

**Files:** `src/phaser/mapFit.ts`, `src/phaser/WorldScene.ts`, `src/phaser/mapFit.test.ts`

- [x] Rest the map on the log strip instead of centring it in the band, so a width-limited map clears the stacked panels.

## Task 6: Tests and docs

**Files:** `src/**/*.test.ts`, `tests/e2e/*.spec.ts`, `CLAUDE.md`

- [x] Re-point unit fixtures at the new village tiles; add `shop.test.ts`, save, status, asset, and map-fit cases.
- [x] Re-walk both release journeys; add `village.spec.ts` for buying and sealed entrances; check the gold chip in the small-window HUD tests.
- [x] Update `CLAUDE.md` for the new kinds, the `confirm` input, gold, and the map fit.
