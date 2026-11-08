# HPA-742 — Taproot Boss and Sluice Pad Implementation Plan

> **Status:** Proposed. Planning files only are committed initially; implementation commits must extend **the same draft PR**.
>
> **Design:** docs/superpowers/specs/2026-11-08-hpa-742-taproot-sluice-art-design.md
>
> **Linear:** https://linear.app/cwchanap/issue/HPA-742/tower-maze-art-for-the-taproot-boss-and-the-sluice-pad

## Approach

This is the **separate artwork task** created after HPA-741's completed gameplay implementation. Produce exactly three art files, change three catalog paths, and add one focused asset assertion. The existing game content references the keys already, so there is no reason to touch maps, mechanics, or renderer code. Keep one ticket = one PR; steps below are checkpoints on this branch, not separate PRs.

## Checkpoint 1 — Generate and approve the three images

**Output:** Final image files only; raw drafts can stay in a local scratch directory.

- [ ] On Hapadona's Mac, follow the Linear agent note: run Codex from ~/workspace/Eridanus using **codex --model gpt-6.1-terra -c model_reasoning_effort=xhigh** in a Remote Control session. Reference docs/art/style-guide.md, the six existing enemy sprites and busts, and the HPA-742 attached style reference.
- [ ] Generate the **Taproot map sprite** as a single top-down 3/4, chibi 16-bit boss figure on uniform #FF00FF: a living dark-bark/root monster with a thick trunk silhouette, hooked thorns, carved face and large amber/green eyes. Keep the whole figure inside one cell after processing. Avoid a humanoid armored sentinel silhouette.
- [ ] Generate the **Taproot bust** as a single matching front-facing head-and-shoulders portrait on uniform #FF00FF. Big eyes, coherent bark/crown palette, crisp outlines; portrait shoulders reach the lower edge.
- [ ] Generate the **sluice pad** as a single low circular slate ring with a central luminous cyan water vortex on uniform #FF00FF, viewed mostly from above. Avoid stair geometry, standing crystals and compass/rune plate shapes. No text, vignette, shadow or animation.
- [ ] View each source alongside the six existing enemy references, ruin-sentinel, stairs-down, recovery-waystone and clue-runes. Approve by **readability at 96 px (and at one 32-unit tile in-game)**, not by raw full-resolution detail. Limit revisions to a small number of silhouette/color fixes.

## Checkpoint 2 — Export runtime-ready PNGs

**Create:**

- public/assets/enemies/taproot.png — 96×96, transparent, 0/255 alpha.
- public/assets/portraits/enemy-taproot.png — 64×64, transparent, 0/255 alpha.
- public/assets/interactables/sluice-pad.png — 96×96, transparent, 0/255 alpha.

- [ ] Export the map images with the existing tools, which already recognize the keys. **Pass explicit output paths until the catalog is updated**, or the default output would overwrite the borrowed ruin-sentinel and stairs-down art:

```sh
bun run sprite enemy-taproot path/to/raw-taproot.png public/assets/enemies/taproot.png
bun run sprite sluice-pad path/to/raw-sluice.png public/assets/interactables/sluice-pad.png
```
- [ ] Check the map exports for transparent corners, centered composition, bottom-centered boss feet, and absence of magenta fringes. If outlines carry blended magenta, clean the source edge pixels to solid key color and re-export as described in HPA-742.
- [ ] Process the bust to **64×64** with the established portrait method in docs/art/style-guide.md (key background, square crop, limited palette, downscale without dithering, hard alpha). The sprite command is **not** a portrait exporter; do not modify it for one image.
- [ ] Inspect all three at native size. Do not commit raw experiments, extra candidates, generators, or new dependencies.

## Checkpoint 3 — Switch the existing asset catalog and pin the contract

**Modify:** src/phaser/assets.ts and src/phaser/assets.test.ts.

- [ ] Update ASSET_PATHS['enemy-taproot'] to assets/enemies/taproot.png.
- [ ] Update PORTRAIT_PATHS['enemy-taproot'] to assets/portraits/enemy-taproot.png.
- [ ] Update ASSET_PATHS['sluice-pad'] to assets/interactables/sluice-pad.png.
- [ ] Add one small test to src/phaser/assets.test.ts that asserts these exact dedicated paths and confirms they are different from the ruin-sentinel sprite/portrait and stairs-down path. Existing tests already validate file presence and exact dimensions for all catalog assets and portraits.
- [ ] Do not change src/game/content/floor6.ts, floor10.ts, WorldScene.ts, portrait lookup, portal rules, save format or localization. No extra asset IDs or game logic are needed.

Suggested narrow test (add near the other catalog tests):

```ts
it('uses dedicated Taproot and sluice-pad art', () => {
  expect(ASSET_PATHS['enemy-taproot']).toBe('assets/enemies/taproot.png');
  expect(PORTRAIT_PATHS['enemy-taproot']).toBe(
    'assets/portraits/enemy-taproot.png',
  );
  expect(ASSET_PATHS['sluice-pad']).toBe(
    'assets/interactables/sluice-pad.png',
  );
  expect(ASSET_PATHS['enemy-taproot']).not.toBe(
    ASSET_PATHS['enemy-ruin-sentinel'],
  );
  expect(PORTRAIT_PATHS['enemy-taproot']).not.toBe(
    PORTRAIT_PATHS['enemy-ruin-sentinel'],
  );
  expect(ASSET_PATHS['sluice-pad']).not.toBe(ASSET_PATHS['stairs-down']);
});
```

## Checkpoint 4 — Validate and attach visual proof

- [ ] Run the normal quality gates locally:

```sh
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

- [ ] In the running game, inspect several Floor 6 sluice pads at desktop and narrow-window zoom. Confirm pad legibility against dungeon floor and against stairs, waystones and clue-runes. Verify travel still happens on stepping onto a pad.
- [ ] Inspect the Floor 10 Taproot sprite beside ordinary enemies and its distinct 64×64 bust in the actual combat card. Verify no clipping, texture fallback, transparency fringe or neighboring-cell overlap.
- [ ] Attach three useful screenshots to the PR description/comment: Floor 6 pad near stairs, Floor 10 boss on the map, Taproot fight-card portrait. Existing deep-floor journey tests are sufficient; do not create a dedicated image-only Playwright journey.
- [ ] Mark the draft PR ready only once the three images are committed, reviewable and the existing gates are green.

## Expected final diff

```text
ADD    public/assets/enemies/taproot.png
ADD    public/assets/portraits/enemy-taproot.png
ADD    public/assets/interactables/sluice-pad.png
MODIFY src/phaser/assets.ts                  (3 path values)
MODIFY src/phaser/assets.test.ts             (1 focused test)
ADD    docs/superpowers/specs/2026-11-08-hpa-742-taproot-sluice-art-design.md
ADD    docs/superpowers/plans/2026-11-08-hpa-742-taproot-sluice-art.md
```

**Out of scope:** Any gameplay/map/stat/save/i18n change, unrelated art such as HPA-829 clue-runes, new animations, renderer effects, generic asset tooling, or a second PR.
