# HPA-21 Balance, Polish, and Web MVP Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the required-only and explorer browser journeys, add the one missing ending selector, make the existing static build safe under a GitHub Pages subpath, and deploy exactly the artifact produced by green CI.

**Architecture:** Keep the authored-content/fact-first runtime unchanged. Browser proof stays in the existing Playwright file; existing Vitest coverage remains the owner of alternate ordering, exact-once behavior, persistence, and guardian math. Deployment extends the existing CI workflow instead of adding a parallel build/deploy pipeline.

**Tech Stack:** Bun 1.4.2, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, Vite 8, LocalStorage, GitHub Actions/Pages.

**Spec:** `docs/superpowers/specs/2026-10-15-hpa-21-release-balance-polish-design.md`

## Global Constraints

- One ticket = one PR.
- No new gameplay subsystem, save schema, progression system, recovery economy, route solver, scenario DSL, analytics, backend, or test-only game API.
- Keep `previewCombat` as the single combat truth; `src/game/combat.test.ts` remains the owner of baseline guardian winnability.
- Accept the optional Floor 3 fight → heart-waystone heal optimization for this MVP; do not add a heal cost/limit.
- Required completion must avoid optional quest acceptance and all optional stat/evidence rewards listed in the spec.
- No new generated image/audio scope.
- Deploy GitHub Pages only, from the build artifact produced by the existing CI workflow.
- Do not mark HPA-21 Done until the post-merge Pages deployment and live Desktop Chrome smoke pass.

## Review Focus

- **Required-only route accidentally consumes optional progression:** prove baseline `HP 30/30`, `ATK 10`, `DEF 2` immediately before the guardian.
- **Ending variants become prose-coupled:** distinguish standard vs expanded ending with `data-line`, not text matching.
- **Explorer regression from rewriting the current path:** extend the existing long journey rather than replacing working treasury/power/reload coverage.
- **Project-subpath deployment:** exercise the built artifact under `/Eridanus/` before merge, not only Vite dev at `/`.
- **Deploying a failing commit:** Pages deployment must depend on all three existing CI jobs and reuse `build-lint`'s `dist/` artifact.

---

## Task 1: Make the two release journeys explicit

**Files:**

- Modify: `tests/e2e/cross-floor.spec.ts`
- Modify: `src/ui/InteractionOverlay.ts`
- Modify: `CLAUDE.md`

**Interfaces:**

- Consumes: existing real keyboard/UI flow, `press()`, current `data-*` selectors, authored maps/entities, and the existing long story journey.
- Produces: `completes the required-only MVP route`, `completes the explorer MVP route with expanded ending context`, and a stable `data-line` selector for dialogue effects.
- Helpers stay file-local and mechanical only; no route search, scenario registry, or direct state injection.

- [x] **Step 1: Pin the existing boss-math owner before editing the long browser walk**

Run:

```sh
bunx vitest run src/game/combat.test.ts
```

Expected: PASS, including the existing baseline guardian preview of 25 HP loss from 30 HP.

Do not add a second guardian-winnability test.

- [x] **Step 2: Rename and extend the current journey as the explorer scenario**

Keep the current counted route and all working assertions. Add only the missing explorer proof:

- bump the artisan, scout, and scribe before leaving the village;
- keep the existing treasury loop, power-core pickup, gatekeeper preview payoff, and reload checkpoints;
- read the existing Floor 2 ledger evidence on the optional route;
- detour to `floor3-keeper-final-record` without making an optional enemy mandatory;
- finish the current boss/core/return path;
- assert the expanded ending line by `data-line="warden-restoration-ending-ledger"`;
- keep `story-complete` after reload.

Use stable IDs/attributes only; do not assert full dialogue prose.

- [x] **Step 3: Add the required-only journey using the shortest authored route**

Walk the real UI from a fresh save:

1. warden;
2. Floor 1 west sentry;
3. Tower Sigil;
4. Floor 2 Central Hall;
5. `floor2-missing-subject` from its south-adjacent tile;
6. depth stair directly — do not open either Floor 2 release;
7. Floor 3 west-spine route;
8. open `floor3-heart-shortcut` from its rear;
9. heart waystone;
10. guardian → Restoration Core → return to warden.

Explicitly avoid:

- `village-artisan`, `village-scout`, `village-scribe`;
- `village-recovery`;
- `floor1-ledger-fragment`;
- `floor1-west-cache`;
- `floor1-power-core`;
- `floor1-future-treasury`;
- `floor2-service-cache`;
- `floor2-archive-cache`;
- `floor3-hidden-vault-cache`;
- `floor3-keeper-final-record`.

Do not detour to the returned village subject; it is not required.

Immediately after the heart waystone and before the guardian, assert:

```ts
await expect(page.locator('[data-stat="hp"]')).toHaveText('HP 30/30');
await expect(page.locator('[data-stat="attack"]')).toHaveText('ATK 10');
await expect(page.locator('[data-stat="defense"]')).toHaveText('DEF 2');
```

Finish by asserting `data-line="warden-restoration-ending"`, `story-complete`, then reload and confirm `story-complete` remains.

- [x] **Step 4: Add the missing dialogue-line selector when the new ending assertions fail**

In `src/ui/InteractionOverlay.ts`, keep `data-effect="dialogue"` and add `data-line` only for dialogue effects, using the existing `effect.lineId`.

Do not change dialogue selection or text ownership.

- [x] **Step 5: Run the two focused release journeys**

```sh
bunx playwright test tests/e2e/cross-floor.spec.ts -g 'required-only|explorer'
```

Expected: both PASS.

If a counted route crosses an optional reward unexpectedly, re-walk the route. Do not change combat/recovery rules to make the test easier.

- [x] **Step 6: Update the canonical contributor instructions**

Edit `CLAUDE.md` directly; `AGENTS.md` is a symlink and must remain one.

- replace the stale example `bunx playwright test -g 'completes the mvp story journey'` with the new focused pattern;
- update the Testing note so layout changes require re-walking both release journeys.

- [x] **Step 7: Commit**

```sh
git add tests/e2e/cross-floor.spec.ts src/ui/InteractionOverlay.ts CLAUDE.md
git commit -m "test: prove mvp release journeys"
```

---

## Task 2: Tighten only concrete story/usability copy exposed by the journeys

**Files:**

- Modify only if required: `src/game/content/dialogue.ts`
- Modify only if required: `src/game/content/village.ts`
- Modify only if required: `src/game/content/floor1.ts`
- Modify only if required: `src/game/content/floor2.ts`
- Modify only if required: `src/game/content/floor3.ts`
- Modify only if required: the existing owning dialogue/content test.

**Interfaces:**

- Consumes: concrete readability/usability failures from Task 1 only.
- Produces: the smallest authored-copy correction needed for release.
- No combat tuning, recovery tuning, map-system work, or new runtime type is planned.

- [ ] **Step 1: Decide whether Task 1 exposed a real copy/usability defect**

If both journeys are understandable and pass, skip this task entirely.

The following are already accepted and are **not** release defects:

- required-only progression needs only one pre-waystone fight (`floor1-west-sentry`, 8 HP);
- Floor 2 releases are optional for the main route;
- the free Floor 3 waystone makes optional side fights cheap to reset between;
- the guardian remains a 25 HP baseline fight after the full heal.

- [ ] **Step 2: If needed, add one focused assertion at the existing owner and make the smallest copy edit**

Examples:

- wrong ending precedence → `src/game/dialogue.test.ts`;
- wrong optional lead wording/state → `src/game/journal.test.ts`;
- misleading authored clue → `src/game/content.test.ts` only if a structural/fact contract is affected.

Do not create a new test helper or subsystem for copy.

- [ ] **Step 3: Re-run the owner test and both browser journeys**

```sh
bunx vitest run <owning-test-file>
bunx playwright test tests/e2e/cross-floor.spec.ts -g 'required-only|explorer'
```

Expected: PASS.

- [ ] **Step 4: Commit only if this task changed files**

```sh
git commit -m "copy: tighten mvp release guidance"
```

---

## Existing release coverage to cite, not rebuild

Do not add the former Task 3 matrix. The repo already owns it:

- Floor 2 release order and no duplicate shortcut IDs: `src/game/movement.test.ts`;
- evidence-before-acceptance and optional lead convergence: `src/game/journal.test.ts` / `src/game/dialogue.test.ts`;
- main lead independence from optional facts: `src/game/journal.ts` plus its tests;
- exact-once stat/item rewards, enemies, latches, Restoration Core, and ending fact: `src/game/actions.test.ts`, `src/game/movement.test.ts`, `src/game/journal.test.ts`;
- valid late-game/boss/core persistence and occupancy: `src/game/save.test.ts` plus browser reload checkpoints;
- baseline guardian winnability: `src/game/combat.test.ts`.

The release checklist in Task 4 cites these passing owners instead of duplicating their branches with more rows.

---

## Task 3: Make the CI artifact Pages-safe and deploy only after green CI

**Files:**

- Modify: `vite.config.ts`
- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/assets.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**

- Consumes: existing `ASSET_PATHS`, `runtimeAssetFilePath()`, `bun run build`, and the three current CI jobs.
- Produces: one relative `dist/` artifact, uploaded by `build-lint` on `main`, then deployed only after build/lint, unit, and Playwright jobs all pass.

- [x] **Step 1: Enable GitHub Pages once at repository level**

Before relying on the deployment job, set repository **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.

This is one-time repository setup. Do not make the workflow try to provision Pages with its own `GITHUB_TOKEN`.

Record that setup is complete in the PR checklist.

- [x] **Step 2: Make the existing asset test fail on root-absolute URLs**

In `src/phaser/assets.test.ts`, change the runtime-path expectation so catalog values must:

- not begin with `/`;
- begin with `assets/`;
- still map through `runtimeAssetFilePath()` to existing `public/assets/...` PNGs.

Run:

```sh
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL on current `/assets/...` values.

- [x] **Step 3: Make Vite and runtime public assets relative**

Set:

```ts
export default defineConfig({ base: './' });
```

Change `ASSET_PATHS` values from `/assets/...` to `assets/...` and keep:

```ts
export function runtimeAssetFilePath(assetKey: AssetKey): string {
  return `public/${ASSET_PATHS[assetKey]}`;
}
```

Run:

```sh
bunx vitest run src/phaser/assets.test.ts
bun run build
```

Expected: PASS.

- [x] **Step 4: Extend the existing CI workflow instead of adding `deploy-pages.yml`**

In `.github/workflows/ci.yml`:

- keep the three existing jobs and their checkout `persist-credentials: false` behavior;
- after `bun run build` in `build-lint`, upload `dist/` with `actions/upload-pages-artifact` only when `github.event_name == 'push' && github.ref == 'refs/heads/main'`;
- add a `deploy` job with:
  - the same push-to-`main` condition;
  - `needs: [build-lint, unit-test, playwright-test]`;
  - environment `github-pages` and URL from the deploy step;
  - job-scoped `pages: write` and `id-token: write` permissions;
  - official Pages configure/deploy actions;
  - no checkout, install, or rebuild.

The deploy job must consume the Pages artifact uploaded by `build-lint`; it must not produce a second build.

- [x] **Step 5: Exercise the built artifact under a project subpath before merge**

Run:

```sh
bun run build
TMP_DIR="$(mktemp -d)"
mkdir -p "$TMP_DIR/site/Eridanus"
cp -R dist/. "$TMP_DIR/site/Eridanus/"
python3 -m http.server 4174 --directory "$TMP_DIR/site"
```

Open `http://127.0.0.1:4174/Eridanus/` in Desktop Chrome and verify:

- the HUD boots;
- generated JS/CSS load;
- runtime PNGs load;
- the Network panel has no 404s.

Stop the server and record the result in the PR checklist. Do not add a committed subpath-smoke framework for this one release proof.

- [x] **Step 6: Document deployment briefly**

Update `README.md` to state:

- `main` deploys the normal CI-built `dist/` artifact to GitHub Pages after all CI jobs pass;
- Pages source is GitHub Actions;
- the existing local quality gates remain authoritative.

- [x] **Step 7: Run focused production checks**

```sh
bun run typecheck
bun run lint
bun run format:check
bunx vitest run src/phaser/assets.test.ts
bun run build
```

Expected: PASS.

- [x] **Step 8: Commit**

```sh
git add vite.config.ts src/phaser/assets.ts src/phaser/assets.test.ts .github/workflows/ci.yml README.md
git commit -m "ci: gate github pages deploy on ci"
```

---

## Task 4: Run the release gate and capture ship evidence

**Files:**

- Modify: this plan only for completed checkboxes/status after execution.
- Update: PR body/checklist with evidence; no new release-report file.

**Interfaces:**

- Consumes: Tasks 1–3 plus existing unit coverage.
- Produces: one green pre-merge gate and one successful post-merge Pages/live smoke before HPA-21 completion.

- [x] **Step 1: Run the full CI-equivalent gate**

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

Expected: all PASS.

- [x] **Step 2: Record the release matrix in the PR**

Record:

- required-only fresh browser journey: PASS;
- explorer browser journey + expanded ending: PASS;
- baseline guardian owner `src/game/combat.test.ts`: PASS;
- alternate Floor 2 release-order owner `src/game/movement.test.ts`: PASS;
- evidence/order/main-lead owners `src/game/journal.test.ts` / `src/game/dialogue.test.ts`: PASS;
- exact-once owners `src/game/actions.test.ts` / `src/game/movement.test.ts` / `src/game/journal.test.ts`: PASS;
- persistence owners `src/game/save.test.ts` + browser reloads: PASS;
- production asset/build checks: PASS;
- local `/Eridanus/` subpath smoke: PASS;
- Pages source configured to GitHub Actions: PASS.

Do not create a separate release-report subsystem or artifact file.

- [x] **Step 3: Commit plan bookkeeping if checkboxes are updated**

```sh
git add docs/superpowers/plans/2026-10-15-hpa-21-release-balance-polish.md
git commit -m "docs: record hpa-21 release verification"
```

- [ ] **Step 4: After merge, verify gated Pages deployment and live Desktop Chrome smoke**

The `deploy` job on `main` must run only after all three existing CI jobs pass.

On the live site verify:

- app boot and all PNGs load;
- fresh-save movement works;
- one combat preview/Fight resolves correctly;
- reload resumes saved state;
- the critical required-only journey remains playable through the ending.

Only after this succeeds should HPA-21 move to Done.

## Self-Review

- **Spec coverage:** both real browser journeys, ending identity, accepted recovery behavior, deployment, subpath proof, and post-merge smoke have an owning task.
- **Step scan:** no task recreates alternate-order/save/idempotence coverage that already exists.
- **Type consistency:** no new runtime type or persistence contract is introduced; `ActionEffect.lineId`, `ASSET_PATHS`, and current CI job names are reused.
- **Review Focus:** optional-progression leakage, ending identity, explorer regression, project-subpath loading, and deploy-after-green-CI each have a direct assertion or verification step.
- **Proportion:** four tasks modify only the browser proof, one presentation selector, static path/deployment plumbing, and optional copy. No release framework or speculative balance work remains.
