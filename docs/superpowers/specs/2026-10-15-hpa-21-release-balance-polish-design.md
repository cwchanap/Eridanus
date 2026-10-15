# HPA-21 Balance, Polish, and Web MVP Release Design

## Status

Planning design for the final MVP release pass. The complete HPA-21 implementation stays on one PR.

This is a validation-and-release pass over the merged village + three-floor game. It should remove uncertainty, not add systems.

## Goal

Ship the existing Tower Maze as a cohesive static browser MVP by:

- proving one required-only player journey and one explorer journey in the real UI;
- reusing existing unit coverage for alternate ordering, idempotence, persistence, and boss math;
- making the production build safe under a GitHub Pages project subpath;
- deploying only after the existing CI jobs pass;
- completing one live Desktop Chrome smoke after merge.

No new gameplay subsystem, save schema, progression system, recovery economy, route solver, analytics, or backend is introduced.

## Current Evidence

The repo already owns almost all release invariants:

- `src/game/combat.test.ts` pins the Floor 3 guardian at baseline stats to 25 HP loss out of 30 HP.
- `src/game/movement.test.ts` already proves both Floor 2 release orders, front/rear behavior, two-way traversal, and no duplicate shortcut IDs.
- `src/game/journal.test.ts` already proves evidence-before-acceptance behavior, main-story precedence, ending persistence through `loadGame`, and final ledger resolution.
- `src/game/actions.test.ts` already proves exact-once stat rewards, item rewards, enemies, latches, the Restoration Core, and the ending fact.
- `src/game/save.test.ts` already exercises generic content validation plus late-game, defeated-enemy, latch, guardian, and core states.
- the existing Playwright journey already covers the treasury loop, the Floor 1 power-core payoff, representative reloads, and `story-complete` after reload.

HPA-21 should cite those tests instead of rebuilding them.

## Release Scenarios

### 1. Required-only fresh run

Add a second real Playwright journey in `tests/e2e/cross-floor.spec.ts`.

The shortest authored required route is:

1. talk to the village warden;
2. enter Floor 1 and defeat `floor1-west-sentry`;
3. collect `floor1-depth-sigil`;
4. descend to Floor 2;
5. bump `floor2-missing-subject` from the Central Hall to record `main-subject-returned`;
6. take the depth stair directly to Floor 3 — the paired releases are not required;
7. use the west-spine route to open `floor3-heart-shortcut` from its rear side;
8. use `floor3-heart-waystone` immediately before the guardian;
9. defeat `floor3-core-guardian`, claim `floor3-restoration-core`, and return to the warden;
10. receive the standard restoration ending and reload to `story-complete`.

The run must avoid every optional progression reward that can change the baseline or optional evidence state:

- `floor1-ledger-fragment`;
- `floor1-west-cache`;
- `floor1-power-core`;
- `floor1-future-treasury`;
- `floor2-service-cache`;
- `floor2-archive-cache`;
- `floor3-hidden-vault-cache`;
- `floor3-keeper-final-record`.

It must also avoid accepting the artisan/scout/scribe optional village leads and must not use `village-recovery`.

Do not route through the returned village subject; it is not required for main progression.

Immediately before the guardian, assert the real HUD is still at the baseline progression values:

- `HP 30/30` after the heart waystone;
- `ATK 10`;
- `DEF 2`.

This assertion makes accidental optional stat rewards visible instead of relying on route comments alone. The existing combat unit test remains the single owner of baseline guardian winnability.

The standard ending must be asserted by stable line identity, not prose.

### 2. Explorer run

Keep the existing long Playwright story journey and extend it rather than rewriting it.

Add only the missing explorer proof:

- accept the artisan, scout, and scribe optional village leads;
- keep the existing treasury loop and power-core preview payoff;
- read the Floor 2 ledger evidence already on the optional route;
- detour to `floor3-keeper-final-record` without making an optional combat mandatory;
- finish the existing boss/core/return flow;
- assert the expanded restoration ending by stable line identity;
- retain the existing representative reload checkpoints.

No second route framework or scenario DSL is added.

## Recovery and Balance Decision

The required route is already viable by construction, so HPA-21 does not need a speculative balance ladder.

At baseline stats:

- `floor1-west-sentry` costs 8 HP and is the only forced fight before the Floor 3 full heal;
- Floor 2 requires no fight and no release latch to reach the missing subject and depth stair;
- the Floor 3 west-spine route reaches the heart without another enemy;
- `floor3-heart-waystone` restores to full immediately before the guardian;
- the guardian costs 25 HP from the baseline 30 HP state.

Therefore the required-only route does not need village-heal backtracking or optional upgrades.

There is, however, an intentional release compromise on optional Floor 3 combat:

- `floor3-heart-waystone` is a free, unlimited full heal;
- `floor3-archive-sentry` costs 15 HP at baseline;
- `floor3-vault-sentry` costs 25 HP at baseline;
- with no clock, resource cost, or use limit, returning to the nearby waystone after an optional fight is always at least as good as not healing.

Accept that behavior for this MVP. It only trivializes optional side fights; it does not gate or distort the required route. Fixing it would require a recovery cost/limit or equivalent new mechanic, which is explicitly out of scope.

HPA-21 may still tighten confusing dialogue/clue copy if the two browser walks expose a usability issue. Do not change combat numbers or recovery rules without a newly demonstrated correctness defect.

## Ending Selector

`InteractionOverlay` currently renders all dialogue effects as only `data-effect="dialogue"`, so the standard and expanded endings cannot be distinguished without asserting authored prose.

Add one presentation-only attribute for dialogue effects:

```html
data-line="${effect.lineId}"
```

The browser journeys use that attribute to distinguish `warden-restoration-ending` from `warden-restoration-ending-ledger`. Dialogue selection itself remains owned by the existing dialogue tests.

## Documentation Ownership

`AGENTS.md` is a Git symlink (`120000`) to `CLAUDE.md`. Do not edit or replace the symlink.

Update `CLAUDE.md` directly:

- replace the stale focused Playwright command that names `completes the mvp story journey`;
- update the Testing note so counted navigation explicitly mentions both release journeys.

## Static Hosting Design

Use GitHub Pages only.

Keep the build host-agnostic:

- set Vite `base: './'`;
- change `ASSET_PATHS` from `/assets/...` to `assets/...`;
- keep `runtimeAssetFilePath()` mapping those values to `public/assets/...`;
- keep one normal `bun run build` artifact.

Do not create a second deployment workflow that rebuilds independently of CI.

Extend `.github/workflows/ci.yml` instead:

- `build-lint` keeps its existing build and, only on a push to `main`, uploads that exact `dist/` directory as the Pages artifact;
- add a `deploy` job that runs only on pushes to `main` and `needs: [build-lint, unit-test, playwright-test]`;
- the deploy job uses the official Pages configure/deploy actions with job-scoped `pages: write` and `id-token: write` permissions;
- checkout continues to use `persist-credentials: false` in jobs that check out source.

This guarantees a commit is never deployed when unit or Playwright CI fails, and the deployed artifact is exactly the build CI produced.

GitHub Pages must be enabled once at repository level with **Source: GitHub Actions** before the first deployment. That is repository setup, not something the workflow should try to provision with its own `GITHUB_TOKEN`.

## Pre-Merge Subpath Proof

The normal Playwright server runs at `/`, so it cannot prove project-subpath loading.

Before merge, exercise the built artifact under the same shape as GitHub Pages:

1. run `bun run build`;
2. copy `dist/` into a temporary `site/Eridanus/` directory;
3. serve the temporary `site/` root with a simple static server;
4. open `/Eridanus/` in Desktop Chrome;
5. verify the HUD boots and the browser network shows no JS/CSS/PNG 404s;
6. record PASS/FAIL in the PR release checklist.

This is a one-time release proof, not a new committed test harness.

## Release Evidence

The PR checklist should cite existing tests for the already-owned scenarios instead of adding duplicates:

- alternate Floor 2 release order: `src/game/movement.test.ts`;
- evidence before optional quest acceptance and main lead independence: `src/game/journal.test.ts` / `src/game/dialogue.test.ts`;
- exact-once rewards, enemies, latches, core, and ending fact: `src/game/actions.test.ts` / `src/game/movement.test.ts` / `src/game/journal.test.ts`;
- persistence/occupancy across representative real states: `src/game/save.test.ts` plus browser reload checkpoints;
- baseline guardian winnability: `src/game/combat.test.ts`.

The only new test coverage planned by HPA-21 is what is genuinely missing: the two explicit browser release journeys, the ending-line selector exercised by them, and relative production asset-path assertions.

## Expected File Shape

Planned implementation changes are limited to:

- `tests/e2e/cross-floor.spec.ts` — required-only journey plus explorer additions;
- `src/ui/InteractionOverlay.ts` — dialogue `data-line` selector;
- `CLAUDE.md` — current focused E2E command/testing note;
- `vite.config.ts` — `base: './'`;
- `src/phaser/assets.ts` / `src/phaser/assets.test.ts` — relative runtime asset paths;
- `.github/workflows/ci.yml` — upload the existing build artifact and deploy only after all CI jobs pass;
- `README.md` — short deployment note;
- existing content/dialogue files only if the browser walks expose a concrete copy/usability defect.

No new runtime module, save schema, release harness, or deployment workflow file is planned.

## Release Gate

Before marking the PR ready:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

Also complete the local `/Eridanus/` subpath smoke described above and confirm Pages is configured to use GitHub Actions.

After merge:

- all three existing CI jobs must pass on `main`;
- the gated Pages deploy job must succeed;
- load the live site in Desktop Chrome;
- verify boot/assets, fresh movement, one combat, reload, and the critical required-only ending path;
- only then mark HPA-21 Done.

## Non-Goals

- New floors, towns, bosses, enemy AI, or combat commands.
- XP, levels, equipment, skill trees, consumable recovery, recovery costs/limits, or a new economy.
- Quest engine, route solver, scenario DSL, generic dungeon simulator, or test-only game API.
- New save schema, migration layer, cloud save, account system, backend, or analytics.
- Mobile-specific UX work.
- New generated art, audio, music, or voice production.
- Parallel deployment providers or a separate deployment build pipeline.
- Fixing the accepted optional Floor 3 fight → waystone heal optimization in this MVP.
- Post-game content or additional ending branches.