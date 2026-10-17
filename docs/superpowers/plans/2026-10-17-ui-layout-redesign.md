# UI Layout Redesign Implementation Plan

**Goal:** Replace the bare text row under the canvas with a framed three-column game screen: hero sidebar, framed stage with a location banner and message box, and an always-open journal.

**Architecture:** Presentation-only. The overlay keeps rendering into `#ui` by `innerHTML`; `display: contents` lets its panels sit in the page grid beside `#game`. New pure string renderers sit beside `JournalPanel` and `HowToPlay`. No rule, state, content, or save change.

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
