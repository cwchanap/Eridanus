# HPA-442 First-Impression Polish Implementation Plan

**Goal:** Make the shipped MVP readable and approachable in its first minute: legible terrain, a distinct cast, keyboard combat, and a fresh-run controls hint.

**Architecture:** Presentation-only. Art changes go through `ASSET_PATHS` and content `assetId`s; input mapping and draw order stay in `WorldScene`; the hint is a pure render function beside `JournalPanel`. No rule, state, or save change.

**Spec:** `docs/superpowers/specs/2026-10-16-hpa-442-first-impression-polish-design.md`

## Task 1: Readable terrain and centred small maps

**Files:** `public/assets/terrain/*.png`, `src/phaser/WorldScene.ts`

- [x] Re-crop both floor textures inside the light border and resample to 32×32.
- [x] Darken both wall textures.
- [x] Pad camera bounds when a map is smaller than the viewport.

## Task 2: Distinct cast and draw order

**Files:** `public/assets/{characters,enemies}/*.png`, `src/phaser/assets.ts`, `src/game/content/{village,floor2,floor3}.ts`, `src/phaser/assets.test.ts`, `src/phaser/WorldScene.ts`

- [x] Add the sentinel, guardian, warden, scout, scribe, and subject recolors to `ASSET_PATHS`.
- [x] Bind them by `assetId` in content.
- [x] Assert distinct villager art, shared subject art, and unique guardian art.
- [x] Halve every sprite to exactly 32×32 so each fits one grid cell, and require one-tile dimensions for every catalog file.

## Task 3: Keyboard combat

**Files:** `src/phaser/WorldScene.ts`, `src/ui/InteractionOverlay.ts`, `src/styles.css`, `tests/e2e/cross-floor.spec.ts`

- [x] Map `Enter`/`Escape` to fight/cancel only while a prompt is pending.
- [x] Show the keys on the prompt buttons without changing their accessible names.
- [x] Drive the explorer journey's cancel and fight from the keyboard.

## Task 4: How-to-play hint

**Files:** `src/ui/HowToPlay.ts`, `src/ui/HowToPlay.test.ts`, `src/ui/InteractionOverlay.ts`, `src/styles.css`, `tests/e2e/cross-floor.spec.ts`

- [x] Render the controls card while `factIds` is empty.
- [x] Assert it in a unit test and in the required-only journey.

## Task 5: Docs and gate

- [x] Record the recolor and draw-order decisions in `docs/art/style-guide.md` and `CLAUDE.md`.
- [x] Run typecheck, lint, format:check, unit, e2e, and build.
