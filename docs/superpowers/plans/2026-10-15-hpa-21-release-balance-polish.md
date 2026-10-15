# HPA-21 Balance, Polish, and Web MVP Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the required-only and explorer playthroughs, correct only release-blocking balance/usability/persistence issues those proofs expose, and ship the static Eridanus MVP through GitHub Pages.

**Architecture:** Keep the existing authored-content/fact-first runtime unchanged unless a release regression proves a defect. Release proof lives in the existing Playwright journey plus focused Vitest coverage; deployment is a host-agnostic Vite `dist/` artifact uploaded to GitHub Pages. No new runtime subsystem, save schema, scenario framework, or deployment provider is introduced.

**Tech Stack:** Bun 1.4.2, TypeScript 5.9, Phaser 4.2, Vitest 5, Playwright 1.63, Vite 8, LocalStorage, GitHub Actions/Pages.

**Spec:** `docs/superpowers/specs/2026-10-15-hpa-21-release-balance-polish-design.md`

## Global Constraints

- One ticket = one PR. Keep planning, release regressions, any evidence-backed content fixes, and deployment workflow on HPA-21.
- No new major mechanic, floor, town, enemy AI mode, progression system, backend, analytics, or generic test harness.
- Keep pure TypeScript as rules/state owner; Phaser remains rendering/input; DOM remains presentation.
- Keep the current `GameState` shape and strict unversioned save policy; add no migration layer.
- Keep `previewCombat` as the single combat truth unless a correctness bug is proven.
- Main-story completion must not require optional quests, optional locked treasure, Floor 1 treasury/power upgrades, Floor 2 side caches, Floor 3 hidden vault, or final optional ledger evidence.
- The required-only browser run must complete without bumping `village-recovery`; the existing Floor 3 heart waystone remains the deliberate pre-boss heal.
- No new generated image/audio scope. If genuinely new art is required, split that into a separate ticket rather than mixing it into HPA-21.
- Deploy one provider only: GitHub Pages.
- Do not mark HPA-21 Done until the post-merge Pages deployment and live Desktop Chrome smoke pass.

## Review Focus

- **Required-only route accidentally consumes optional progression:** the fresh main-story journey must reach `story-complete` while avoiding optional NPC acceptance and optional stat/evidence rewards.
- **Free-heal dominant loop:** required completion must not need `village-recovery`; if it does, fix authored encounter/reward/shortcut pacing rather than adding a recovery economy.
- **Alternate-order state drift:** both Floor 2 release orders and evidence-before-NPC-intro paths must converge on the same valid durable progression.
- **Reload duplication:** reward stats/items, defeated enemies, opened shortcuts, boss/core state, and the ending fact must remain exact-once across representative reloads.
- **Subpath deployment breakage:** generated JS/CSS and every public PNG must load from the GitHub Pages project path, not assume web-root `/assets/...`.

---

## Task 1: Turn the browser proof into explicit required-only and explorer journeys

**Files:**

- Modify: `tests/e2e/cross-floor.spec.ts`

**Interfaces:**

- Consumes: the real keyboard/UI flow, existing `press()` helper, stable `data-*` selectors, real authored maps/entities.
- Produces: two named release journeys in the existing Playwright file: `completes the required-only MVP route` and `completes the explorer MVP route with expanded ending context`.
- Test helpers remain file-local and may only wrap repeated UI mechanics; they must not search maps or mutate game state directly.

- [ ] **Step 1: Extract only mechanical local helpers from the current long test**

Keep `press()` unchanged. Add small helpers only where both journeys repeat an interaction primitive, for example:

```ts
async function startFresh(page: Page): Promise<void>;
async function fight(page: Page): Promise<void>;
async function cancelFight(page: Page): Promise<void>;
async function expectMap(page: Page, mapId: MapId): Promise<void>;
```

Do not add pathfinding, route tables, direct `GameState` injection, or a scenario DSL. Counted arrow presses remain explicit in each route section.

- [ ] **Step 2: Rewrite the current journey as the explorer release scenario**

Preserve the existing real route and add the missing explorer-specific proof:

- accept the artisan, scout, and scribe optional leads before leaving the village;
- keep the Floor 1 treasury return and at least one optional stat reward;
- read `floor2-paired-release-ledger`;
- on Floor 3, detour through `floor3-keeper-final-record` before the boss;
- assert the ledger read model reaches its resolved state;
- finish the existing boss/core/return route;
- assert the warden renders the expanded restoration ending effect/line selector and `story-complete`;
- retain one reload checkpoint that proves optional discoveries/rewards survive.

Use stable IDs/effect attributes rather than asserting full prose.

- [ ] **Step 3: Add a separate required-only fresh-save journey**

Re-walk the authored maps and pin exact counted key presses in comments. The route must:

- speak only to the warden and returned subject when required by the main story;
- collect the Tower Sigil and Restoration Core because they are mandatory;
- avoid `village-artisan`, `village-scout`, `village-scribe`;
- avoid `floor1-future-treasury`, `floor1-power-core`, Floor 2 caches, `floor3-hidden-vault-cache`, and `floor3-keeper-final-record`;
- never bump `village-recovery`;
- use the Floor 3 heart waystone immediately before the guardian;
- assert the guardian preview is winnable from the actual required-only stats before clicking Fight;
- return the core to the warden and assert the standard ending path plus `story-complete`;
- reload after completion and assert `story-complete` remains.

If a mandatory path currently crosses an optional reward tile, re-route the counted walk first; do not claim the reward just to keep the test short.

- [ ] **Step 4: Run only the two release journeys**

```sh
bunx playwright test tests/e2e/cross-floor.spec.ts -g 'required-only|explorer'
```

Expected: both journeys complete. If either exposes a balance/usability/content problem, record the exact failing encounter/tile/read-model state and fix it in Task 2 rather than weakening the release assertion.

- [ ] **Step 5: Commit the release-scenario proof**

```sh
git add tests/e2e/cross-floor.spec.ts
git commit -m "test: prove mvp release journeys"
```

---

## Task 2: Correct only release-blocking authored balance or usability failures

**Files:**

- Modify only as failures require: `src/game/content/village.ts`
- Modify only as failures require: `src/game/content/floor1.ts`
- Modify only as failures require: `src/game/content/floor2.ts`
- Modify only as failures require: `src/game/content/floor3.ts`
- Modify only as failures require: `src/game/content/dialogue.ts`
- Modify only as failures require: `src/game/content/facts.ts`
- Modify only as failures require: `src/game/content.test.ts`
- Modify only as failures require: `src/game/combat.test.ts`
- Modify only as failures require: `src/game/dialogue.test.ts`
- Modify: `tests/e2e/cross-floor.spec.ts` only to update counted routes/assertions after an authored correction.

**Interfaces:**

- Consumes: concrete failures from Task 1 and existing authored entity/stat/copy seams.
- Produces: the smallest content-level correction that makes both release scenarios truthful and readable.
- No new runtime type or subsystem is planned.

- [ ] **Step 1: For each Task 1 failure, add one focused regression at the existing owner**

Examples of ownership:

- enemy/reward numeric balance -> `src/game/combat.test.ts` or a focused authored-entity assertion in `src/game/content.test.ts`;
- unreachable/mandatory optional content -> `src/game/content.test.ts` using the existing flood/runtime-blocking helpers;
- unclear/incorrect quest or ending precedence -> `src/game/dialogue.test.ts` / `src/game/journal.test.ts`;
- a moved entity/layout row -> update the exact Playwright counted walk in the same change.

Do not add speculative regressions for behavior that already passes both release scenarios.

- [ ] **Step 2: Apply the smallest authored correction in this priority order**

1. remove/move a filler mandatory encounter;
2. tune that encounter's fixed stats;
3. tune an existing mandatory reward;
4. adjust an existing shortcut/recovery placement;
5. tighten existing clue/dialogue copy.

Only change a rule function such as `previewCombat`, `attemptMove`, or save validation if the focused regression proves the rule itself is wrong.

- [ ] **Step 3: Re-run the focused owner test and both browser scenarios after every correction**

```sh
bunx vitest run <owning-test-file>
bunx playwright test tests/e2e/cross-floor.spec.ts -g 'required-only|explorer'
```

Expected: PASS with the original release assertion intact.

- [ ] **Step 4: Commit each cohesive correction**

Use the existing file owner and one behavior per commit, e.g.:

```sh
git commit -m "balance: keep required route viable"
```

If Task 1 passes with no gameplay/content changes, skip Task 2 rather than inventing polish.

---

## Task 3: Pin alternate-order, exact-once, and representative resume behavior

**Files:**

- Modify: `src/game/actions.test.ts`
- Modify: `src/game/movement.test.ts`
- Modify: `src/game/journal.test.ts`
- Modify: `src/game/save.test.ts`
- Modify: `src/game/content.test.ts` only when a topology assertion is missing.

**Interfaces:**

- Consumes: existing action/movement/journal/save APIs and real authored IDs.
- Produces: focused HPA-21 regression coverage for the alternate-order and resume scenarios without a new harness.

- [ ] **Step 1: Add the alternate Floor 2 release-order matrix at the action/movement owner**

Using real `floor2-west-release` and `floor2-east-release` entities, prove:

- west then east yields both IDs exactly once;
- east then west yields both IDs exactly once;
- crossing either opened release from the front remains legal;
- neither order changes the durable main-subject-returned/treasury route requirements.

Reuse the existing movement/action helpers; do not simulate a whole dungeon.

- [ ] **Step 2: Pin evidence-before-acceptance read models**

In `src/game/journal.test.ts`, assert that the optional route/heirloom/ledger evidence facts resolve their correct leads even when the corresponding village intro fact is added later. Keep main-story lead assertions independent of every optional intro/evidence fact.

- [ ] **Step 3: Replace the stale late-game save sample with release-representative checkpoints**

In `src/game/save.test.ts`, keep the generic malformed/shape/content cases and add compact real-state round trips for:

- opened stat/item reward + matching item invariant;
- opened shortcut + defeated enemy occupancy;
- Floor 3 entry facts/sections;
- defeated `floor3-core-guardian` + opened `floor3-restoration-core` + carried `tower-restoration-core`;
- `main-village-restored` ending state.

Prefer a small table of explicit valid `GameState` values over another save fixture builder.

- [ ] **Step 4: Pin exact-once release transitions at their action owner**

Assert repeated interaction does not duplicate or reapply:

- a stat reward amount;
- an item reward/item ID;
- an opened shortcut ID;
- the final `main-village-restored` fact.

Use existing real entities. Do not add presentation timing flags; exact-once ownership remains in durable state.

- [ ] **Step 5: Run the focused release regression set**

```sh
bunx vitest run src/game/actions.test.ts src/game/movement.test.ts src/game/journal.test.ts src/game/save.test.ts src/game/content.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add src/game/actions.test.ts src/game/movement.test.ts src/game/journal.test.ts src/game/save.test.ts src/game/content.test.ts
git commit -m "test: pin release persistence and ordering"
```

---

## Task 4: Make the production artifact subpath-safe and deploy it with GitHub Pages

**Files:**

- Modify: `vite.config.ts`
- Modify: `src/phaser/assets.ts`
- Modify: `src/phaser/assets.test.ts`
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`

**Interfaces:**

- Consumes: existing `ASSET_PATHS`, `runtimeAssetFilePath()`, normal `bun run build` output.
- Produces: one host-agnostic static `dist/` artifact and one GitHub Pages deployment workflow.

- [ ] **Step 1: Write the failing static-path asset tests**

In `src/phaser/assets.test.ts`, update/add assertions so every runtime URL:

- does not begin with `/`;
- begins with `assets/`;
- maps through `runtimeAssetFilePath()` to an existing `public/assets/...` PNG.

Run:

```sh
bunx vitest run src/phaser/assets.test.ts
```

Expected: FAIL because current `ASSET_PATHS` values are root-absolute `/assets/...`.

- [ ] **Step 2: Make Vite and public assets location-relative**

In `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({ base: './' });
```

In `src/phaser/assets.ts`, change catalog values from `/assets/...` to `assets/...` and change:

```ts
export function runtimeAssetFilePath(assetKey: AssetKey): string {
  return `public/${ASSET_PATHS[assetKey]}`;
}
```

No environment-specific `/Eridanus/` constant is needed.

- [ ] **Step 3: Verify the normal build is the production artifact**

```sh
bun run build
bunx vitest run src/phaser/assets.test.ts
```

Expected: PASS; `dist/index.html` references generated assets relatively and copied public PNGs remain under `dist/assets/...`.

- [ ] **Step 4: Add one GitHub Pages workflow**

Create `.github/workflows/deploy-pages.yml` with:

- trigger: push to `main` and `workflow_dispatch`;
- `permissions.contents: read`, `permissions.pages: write`, `permissions.id-token: write`;
- concurrency group `pages`, cancel-in-progress false;
- checkout;
- Bun 1.4.2 setup;
- `bun install --frozen-lockfile`;
- `bun run build`;
- official Pages configuration/upload/deploy actions;
- upload path `dist`;
- environment `github-pages` using the deploy step's `page_url`.

Do not add another hosting provider or a second production build command.

- [ ] **Step 5: Document the published build path**

Update `README.md` with a short `Deployment` section stating that `main` deploys the normal `dist/` build to GitHub Pages and that the same local quality gates remain authoritative.

Do not document manual asset-copy steps or provider-specific local setup.

- [ ] **Step 6: Run focused and production checks**

```sh
bun run typecheck
bun run lint
bun run format:check
bunx vitest run src/phaser/assets.test.ts
bun run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```sh
git add vite.config.ts src/phaser/assets.ts src/phaser/assets.test.ts .github/workflows/deploy-pages.yml README.md
git commit -m "ci: deploy mvp to github pages"
```

---

## Task 5: Run the complete release gate and capture ship evidence

**Files:**

- Modify: `docs/superpowers/plans/2026-10-15-hpa-21-release-balance-polish.md` only to check completed steps/status after execution.
- No runtime file should change in this task unless verification exposes a regression; route that regression back to its owning earlier task.

**Interfaces:**

- Consumes: all HPA-21 implementation changes.
- Produces: one green pre-merge gate, then one successful post-merge Pages deployment/live smoke before Linear completion.

- [ ] **Step 1: Run the full CI-equivalent gate**

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

Expected: all commands PASS.

- [ ] **Step 2: Verify the release matrix before marking the PR ready**

Record in the PR body:

- required-only fresh run: PASS;
- explorer run + expanded ending: PASS;
- alternate-order focused proof: PASS;
- representative resume/exact-once proof: PASS;
- production build/assets: PASS.

Do not create a separate release-report subsystem or artifact file for this checklist.

- [ ] **Step 3: Commit plan bookkeeping if execution checks boxes**

```sh
git add docs/superpowers/plans/2026-10-15-hpa-21-release-balance-polish.md
git commit -m "docs: record hpa-21 release verification"
```

- [ ] **Step 4: After merge, verify the Pages deployment and live Desktop Chrome smoke**

The deployment workflow from `main` must succeed. On the deployed URL verify:

- app boot and all PNGs load;
- fresh-save movement works;
- one combat preview/Fight resolves correctly;
- reload resumes the saved state;
- the critical required-only journey remains playable through the ending.

Only after this succeeds should HPA-21 move to Done.

## Self-Review

- **Spec coverage:** all four Linear release scenarios map to explicit proof; production build/deploy and post-merge smoke are included.
- **Step scan:** runtime changes are planned only where current evidence requires them; no speculative balance numbers are invented before the required-only playthrough exists.
- **Type consistency:** the plan reuses current `GameState`, `MapId`, `ActionEffect`, `ASSET_PATHS`, and save/content APIs; it defines no parallel runtime contract.
- **Review Focus:** required-only optional-content leakage, heal-loop pressure, alternate order, reload duplication, and Pages subpath assets each have an owning task/test.
- **Proportion:** two browser journeys + focused existing-owner regressions + one static workflow are sufficient; no route solver, release service, second E2E harness, or backend is introduced.
