# HPA-21 Balance, Polish, and Web MVP Release Design

## Status

Planning design for the final MVP release pass. The complete HPA-21 implementation stays on one PR.

This design starts from the merged HPA-237, HPA-22, HPA-235, HPA-146, and HPA-137 foundation. It is intentionally a validation-and-correction pass, not a new feature phase.

## Goal

Ship the existing village + three-floor Tower Maze as a cohesive browser MVP by proving four release scenarios, correcting only issues those scenarios expose, and deploying the static build through the simplest project-owned host path.

Success means:

- the mandatory story can be completed from a fresh save without optional quests or optional treasure;
- an explorer can take the authored side content and receive the expanded ending context;
- supported alternate ordering of mechanisms/evidence remains valid;
- representative reload points preserve exact-once progression;
- combat preview remains truthful after any final tuning;
- the main route does not rely on repeated village healing;
- all shipped art resolves in the production build;
- the deployed site passes the critical Desktop Chrome journey.

## Current Foundation

Main already owns nearly every seam needed for the release pass:

- `GameState` persists map/tile, player stats, rewards, defeated enemies, opened shortcuts, items, facts, and discovered sections.
- `save.ts` validates current authored content directly and rejects invalid occupancy; there is no versioning or migration layer.
- `content.ts` validates map shape, entity placement, reciprocal portals, authored IDs, sections, and runtime blocking relationships.
- combat has one deterministic `previewCombat` / resolution contract.
- quest/story progress is derived from facts/items/defeated/opened IDs rather than a quest-state object.
- all four maps are authored `MapDefinition` values with explicit entities and sections.
- `tests/e2e/cross-floor.spec.ts` already drives the real UI with Desktop Chrome, exact counted key presses, effect selectors, and reload checkpoints.
- the current browser journey is an explorer-oriented run: it intentionally takes the Floor 1 treasury and power upgrade before finishing Floor 3. It therefore does **not** prove the HPA-21 required-only completion criterion.
- runtime images are explicit in `src/phaser/assets.ts` and are already covered by served-file and catalog tests.
- Vite already produces a static `dist/` build.

HPA-21 should reuse these seams rather than add a release engine, scenario DSL, solvability simulator, analytics, or new runtime state.

## Approaches Considered

### Chosen: two real browser journeys + focused authored-state regressions

Keep one required-only browser journey and one explorer browser journey in the existing Playwright file. Use existing unit-test seams for alternate ordering, exact-once state transitions, save occupancy, and combat math.

This gives strong player-facing proof without multiplying runtime abstractions or building a general test simulator.

### Rejected: general dungeon/release simulator

A reusable route solver could enumerate map states and prove more combinations, but it would create exactly the generic test harness HPA-21 rules out. It would also test a model of the game rather than the same player-facing interaction path shipped to users.

### Rejected: unit tests only

Pure tests are ideal for deterministic combat, persistence, and alternate-order matrices, but they cannot prove that the actual rendered browser journey, runtime assets, keyboard flow, and release build work together. HPA-21 explicitly needs a desktop-browser release journey.

## Chosen Design

### 1. Make the release scenarios explicit without introducing a scenario framework

Keep `tests/e2e/cross-floor.spec.ts` as the only browser-journey file.

Refactor only enough local test helpers to remove duplicated mechanics such as:

- clearing/reloading a fresh save;
- counted key presses with per-press blocked checks;
- combat Fight/Cancel actions;
- stable map/section/effect assertions.

Do **not** add route search, test-only game APIs, map injection, a scenario registry, or a mini DSL.

The four HPA-21 scenarios map to proof as follows:

1. **Main-route fresh run** — one full Playwright journey from fresh save to `story-complete`, deliberately avoiding optional quest NPCs, optional locked treasure, the Floor 1 treasury reward, the Floor 1 power core, Floor 2 side caches, Floor 3 hidden vault, and final optional ledger record. It may use mandatory story items and mandatory story NPCs only. It must not use `village-recovery`.
2. **Explorer run** — one full Playwright journey that accepts the optional village threads, takes the authored treasury/route/ledger side content, reads the final keeper record, and completes with the expanded restoration ending context. Optional rewards may make combat cheaper, but no optional reward becomes a prerequisite.
3. **Alternate-order run** — focused existing-domain tests prove both Floor 2 release orders and evidence-before-quest-acceptance behavior. Keep this out of another full browser playthrough unless a browser-only bug is discovered.
4. **Resume run** — focused save/action tests plus reload checkpoints in both browser journeys prove representative combat/reward/shortcut/floor/ending persistence. Do not create a separate save harness.

### 2. Treat balance as evidence-driven authored-content edits

Do not pre-emptively redesign combat or add progression systems.

The required-only run is the balance baseline. It must finish with starting stats plus mandatory rewards only, and it must reach the Floor 3 waystone/boss without needing optional treasure or a village-heal loop.

If the required-only run fails, correct the smallest authored seam in this order:

1. move or remove a filler mandatory encounter;
2. tune that encounter's fixed stats;
3. tune an existing mandatory stat reward;
4. adjust shortcut/recovery placement;
5. only then consider any broader rule change.

Any numerical or placement correction must be pinned by the failing release scenario plus a focused unit/content assertion. Do not add XP, equipment, consumable recovery, difficulty modes, or a new economy.

`previewCombat` and combat resolution remain unchanged unless the release proof discovers an actual correctness bug. Any enemy-stat change must continue to use the authored entity directly in tests so preview and resolution cannot drift.

### 3. Use the main-route run as the recovery-pacing guardrail

The release criterion is not "free healing is impossible"; the village waystone is intentionally free. The criterion is that normal completion should not collapse into `fight -> walk home -> heal -> repeat`.

Use a concrete release proxy instead of inventing a recovery economy:

- the main-route fresh Playwright run never bumps `village-recovery`;
- it still completes the required story;
- the Floor 3 heart waystone remains the deliberate pre-boss reset point already established by HPA-137.

If that run cannot finish, change authored encounter/reward/shortcut pacing before changing recovery rules.

### 4. Tighten story/usability only at existing content/read-model seams

Use the two browser journeys and current journal/dialogue tests to verify:

- the mandatory lead remains understandable without talking to optional NPCs;
- optional artisan/scout/scribe threads have distinct purposes;
- evidence found before talking to the corresponding NPC still resolves correctly;
- the explorer run reads the final keeper record and receives the expanded ending line;
- the required-only run receives the standard ending line;
- `story-complete` derives from the durable restoration fact after reload.

If copy is too long or unclear, edit existing dialogue/clue strings. Do not add cutscenes, dialogue trees, route arrows, a minimap path, or new quest UI.

### 5. Keep presentation polish inside existing effect/art seams

The release pass should inspect and, only if necessary, correct:

- combat prompt/result feedback;
- opened chest/gate visual state;
- route-opening feedback;
- journal update visibility;
- placeholder or missing runtime images on the main route.

Use the existing `ActionEffect`/DOM overlay and `resolveEntityAsset` paths. Do not add a VFX subsystem, animation state machine, toast service, or asset manager.

No new generated image scope belongs in HPA-21. Small integration fixes to the established asset kit are allowed; new art direction is not.

### 6. Strengthen persistence proof at representative real states

Keep the save shape unchanged.

Extend existing save/action tests with representative real IDs rather than adding fixtures for every possible permutation. The release set should cover:

- post-treasure/reward state;
- defeated enemy tile occupancy;
- opened shortcut/mechanism state;
- Floor 2 -> Floor 3 progression fact state;
- defeated boss + claimed Restoration Core;
- restored-village ending fact.

For exact-once behavior, use existing idempotent action/reward/fact seams and assert duplicate interaction does not duplicate IDs or stats.

Do not add save versions, migrations, backup slots, cloud save, or timing locks around presentation.

### 7. Ship through GitHub Pages with host-agnostic static paths

Choose GitHub Pages for the MVP because the project is already on GitHub, the output is purely static, and it adds no account/backend/runtime service.

Keep the build host-agnostic rather than hardcoding `/Eridanus/` throughout runtime code:

- configure Vite with `base: './'` so generated JS/CSS references work from a project subpath;
- change runtime public asset URLs from root-absolute `/assets/...` to page-relative `assets/...`;
- keep `runtimeAssetFilePath()` mapping those URLs back to `public/assets/...` for source-tree asset tests;
- verify the normal `bun run build` output is the exact artifact deployed.

Add one GitHub Pages workflow that:

- runs on pushes to `main` and manual dispatch;
- installs Bun 1.4.2 with a frozen lockfile;
- runs the normal build;
- uploads `dist/` as the Pages artifact;
- deploys with the official Pages actions and minimal `pages` / `id-token` permissions.

Do not add Netlify/Vercel/Cloudflare configuration in parallel.

The implementation PR can prove the production artifact and workflow shape before merge. After merge, HPA-21 is not complete until the Pages deployment succeeds and the live site passes the critical Desktop Chrome smoke journey.

### 8. Keep release evidence in tests/PR, not a new runtime/reporting system

Do not create a release database, telemetry, analytics, or a versioned playtest framework.

The durable evidence is:

- regression tests committed with the fixes;
- CI on the HPA-21 PR;
- the GitHub Pages deployment run;
- a concise PR checklist/result summary recording the required-only, explorer, alternate-order, resume, production-build, and deployed-smoke outcomes.

## Expected File Shape

Likely changes are limited to:

- `tests/e2e/cross-floor.spec.ts` — split current long journey into explicit required-only and explorer journeys; keep helpers local.
- `src/game/content.test.ts`, `src/game/actions.test.ts`, `src/game/save.test.ts`, `src/game/journal.test.ts` — focused release regressions where existing coverage is missing.
- `src/game/content/*.ts` — only evidence-backed balance/placement/copy changes discovered during the release walks.
- `src/phaser/assets.ts` and `src/phaser/assets.test.ts` — relative runtime asset URLs for subpath hosting.
- `vite.config.ts` — relative static base.
- `.github/workflows/deploy-pages.yml` — production deployment.
- `README.md` — published site/release instructions after the workflow is in place.

No new runtime module is planned.

## Testing Strategy

### Required-only browser journey

From a fresh save:

- speak only to mandatory story NPCs;
- collect only mandatory story items;
- avoid optional quest acceptance and optional stat caches;
- do not touch `village-recovery`;
- complete the returned-subject gate;
- reach Floor 3;
- use the existing heart waystone before the boss;
- defeat the boss using the truthful preview;
- claim the Restoration Core;
- return to the village and receive the standard ending;
- reload and still show `story-complete`.

### Explorer browser journey

From a fresh save:

- accept the artisan/scout/scribe optional threads;
- exercise the cross-floor treasury route and optional authored discoveries;
- read the final keeper record;
- include at least one optional combat/reward payoff that measurably changes a later preview;
- complete the boss/core/return flow;
- receive the expanded ending context;
- reload representative optional progress once.

### Focused unit/content coverage

Pin:

- both Floor 2 release orders remain supported;
- evidence-before-acceptance still resolves optional quest read models;
- main-story journal progression never depends on optional quest facts;
- required-only authored stats keep the final boss winnable from a full heart-waystone heal;
- real reward/enemy/shortcut/boss/core/ending states round-trip through save validation;
- repeated reward/NPC/mechanism interaction remains idempotent;
- every runtime asset path maps to a shipped file and works with relative static hosting.

### Production/release gate

Before merge:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

After merge:

- GitHub Pages deployment succeeds from `main`;
- load the production URL in Desktop Chrome;
- verify boot, assets, fresh save, movement, one combat, save/reload, and the critical story journey;
- only then mark HPA-21 Done.

## Non-Goals

- New floors, towns, bosses, enemy AI, or combat commands.
- XP, levels, equipment, skill trees, consumable recovery, or a new economy.
- Quest engine, route solver, scenario DSL, generic dungeon simulator, or test-only game API.
- New save schema, migration layer, cloud save, account system, backend, or analytics.
- Mobile-specific UX work.
- New generated art, audio, music, or voice production.
- Parallel deployment providers or production infrastructure beyond static GitHub Pages.
- Post-game content or multiple ending branches.
