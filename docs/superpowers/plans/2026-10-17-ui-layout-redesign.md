# UI Layout Redesign Implementation Plan

**Goal:** Replace the bare text row under the canvas with a game screen: the map fills the window, with a hero card, location banner, journal, and message box floating over it.

**Architecture:** Presentation-only. The overlay keeps rendering into `#ui` by `innerHTML`; `#ui` is a pointer-transparent grid laid over the full-window `#game`. Camera maths live in pure functions in `src/phaser/viewport.ts`. New pure string renderers sit beside `JournalPanel` and `HowToPlay`. No rule, state, content, or save change.

Tasks 1 to 5 first shipped a three-column frame around a fixed 640×480 stage; review moved to the full-screen map, and Task 6 rebuilt the layout on the same PR. The three-column frame never shipped.

**Spec:** `docs/superpowers/specs/2026-10-17-ui-layout-redesign-design.md`

## Task 1: Page grid and theme

**Files:** `index.html`, `src/styles.css`, `src/main.ts`, `package.json`, `src/phaser/createGame.ts`, `src/phaser/WorldScene.ts`

- [x] Add the wordmark to `index.html` and lay `#app` out as a three-column grid with two narrower fallbacks.
- [x] Self-host Cinzel 700 through `@fontsource/cinzel`.
- [x] Make the canvas transparent so the stage frame's vignette shows around small maps.

## Task 2: Hero sidebar

**Files:** `src/ui/StatusPanel.ts`, `src/ui/StatusPanel.test.ts`, `src/ui/icons.ts`, `src/ui/HowToPlay.ts`

- [x] Render the portrait, HP bar, and ATK/DEF tiles, keeping the `data-stat` text contract.
- [x] Render carried items by label.
- [x] Restyle the how-to-play card as a sidebar panel.

## Task 3: Location banner and message box

**Files:** `src/game/content.ts`, `src/game/progress.ts`, `src/ui/InteractionOverlay.ts`, `src/styles.css`, `index.html`, `tests/e2e/cross-floor.spec.ts`

- [x] Extract `findSectionsAt` and show the tightest section under the floor name.
- [x] Render effects as tagged messages with speaker and defeated-enemy portraits.
- [x] Turn the combat prompt into an encounter card without changing its test ids, text, or button names.
- [x] Fix the message box height, move tags onto its border, and render a refused move inside the encounter card; assert in both journeys that the stage never moves.

## Task 4: Journal panel

**Files:** `src/ui/JournalPanel.ts`, `src/ui/JournalPanel.test.ts`, `tests/e2e/cross-floor.spec.ts`

- [x] Render the journal always open; move places found to the sidebar.
- [x] Keep panel scroll positions across re-renders.
- [x] Replace the `<details>` toggle check in the required-only journey.

## Task 5: Docs and gate

- [x] Update `CLAUDE.md` for the new UI modules.
- [x] Run typecheck, lint, format:check, unit, e2e, and build.

## Task 6: Full-screen map with a floating HUD

**Files:** `index.html`, `src/styles.css`, `src/phaser/createGame.ts`, `src/phaser/WorldScene.ts`, `src/phaser/viewport.ts`, `src/phaser/viewport.test.ts`, `src/ui/InteractionOverlay.ts`, `src/ui/StatusPanel.ts`, `src/ui/StatusPanel.test.ts`, `src/ui/JournalPanel.ts`, `src/ui/JournalPanel.test.ts`, `tests/e2e/cross-floor.spec.ts`, `CLAUDE.md`

- [x] Size the canvas to the window (`Scale.RESIZE`) and pick a whole-number zoom that fills it.
- [x] Pad the camera bounds by the HUD's footprint and offset the follow, so the hero never sits under a panel; unit-test every floor tile at six window sizes.
- [x] Float the hero card, banner, journal, and message box over the map; stack the side panels under the banner below 1024 px.
- [x] On short windows at least 640 px wide, move the hero card and journal beside the banner, and cover small windows in unit and browser tests.
- [x] Merge the hero, items, and places panels: one hero card, places move into the journal.
- [x] Preview a fight's HP cost on the HP bar and outline the targeted enemy on the map.
- [x] Let the journal fold to its title bar with a button or `J`, as overlay-only view state.
- [x] Assert the message box keeps its size and place instead of the stage, and that `J` folds the journal.
- [x] Run typecheck, lint, format:check, unit, e2e, and build.
