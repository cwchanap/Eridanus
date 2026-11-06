# Issue #36 — Sound-only Wall-Bump UX Implementation Plan

**Issue:** [Eridanus #36](https://github.com/cwchanap/Eridanus/issues/36)

**Design:** [2026-11-04-issue-36-nonmodal-wall-bump-design.md](../specs/2026-11-04-issue-36-nonmodal-wall-bump-design.md)

**PR scope:** One PR only. Implementation and tests are on this same branch/PR. No new SFX, art, UI framework, save migration, or input abstraction.

**Baseline established by [the PR design reviewer](https://github.com/cwchanap/Eridanus/pull/38#issuecomment-6647098378):** On `main` at `fedcdcc`, the fourth ArrowLeft at the village wall does not move the hero, and one subsequent ArrowRight **already moves immediately** to `(13,10)`; WASD behaves likewise. The original issue's claim that a movement key is swallowed is not reproducible there. Escape after the bump **does** dismiss the wall message instead of opening the menu. Treat this as a **non-modal feedback UX change**, not a keyboard-routing fix.

**Architecture:** The existing pure movement/session rules and `WorldScene` are unchanged. Only the presentation boundary in `src/main.ts::handleInput` suppresses `wall` and `out-of-bounds` blocked messages while `cuesFor` still receives the original rejected transition and plays the existing `bump` sound.

## Task 1 — Extend regression coverage (tests first)

**Files:** `tests/e2e/sound.spec.ts`, `tests/e2e/movement.spec.ts`

- [x] **Extend the existing sound test**, not a separate wall-bump test. It already walks from `(15,10)` to `(12,10)` and bumps the wall at `(11,10)`. Replace its `data-reason="wall"` assertion with the conjunction: saved tile remains `(12,10)`, wall message and dismiss button are absent, and `audioStarts` increased. The unchanged position is necessary: audio increment alone would also pass for a successful step.
- [x] After the test mutes sound, assert **one** ArrowRight advances the saved tile to `(13,10)`, leaves the log hidden, and makes no new audio starts. Use the existing exported `savedGame(page)` helper from `tests/e2e/journey.ts` (e.g. `await expect.poll(() => savedGame(page)).toMatchObject({ tile: { x: 12, y: 10 } })`).
- [x] **Add one focused stale-effect + stale-denial + menu regression** to `movement.spec.ts` (a new test — `movement.spec.ts` had no suitable route to replace; do not add a second). Boot a valid saved game using `createInitialGameState()` plus `mapId: 'floor1', tile: { x: 13, y: 14 }`, set it via `localStorage.setItem('eridanus.save', JSON.stringify(save))` and reload, as in `village.spec.ts`. Confirm `map-name` is Floor 1. Press `ArrowDown` into `floor1-treasury-overlook` `(13,15)`; assert `[data-testid="effect"][data-effect="clue"]`. Press `ArrowUp` into `floor1-rear-latch` `(13,13)` from the front; assert `blocked-reason[data-reason="latch-closed-front"]`. The rejected latch leaves the earlier clue in `effect` **and** a denial in `blocked`. Press `ArrowRight` into the wall `(14,14)`; assert saved tile stays `(13,14)`, `[data-testid="effect"]`, `[data-testid="blocked-reason"]`, and `[data-action="dismiss"]` each have count 0, and `getByTestId('interaction')` is hidden. Press Escape: `menu[data-open="true"]` becomes visible; Escape again closes it. Press one `ArrowLeft` and assert tile `(12,14)`. The clue/latch/wall sequence fails if either collision clearing assignment is removed.
- [x] Run the tests against the existing baseline first; **expect** the absence/menu checks to fail. The saved Floor 1 fixture is deliberately structured so that the clue sets `effect`, the latch denial sets `blocked` without clearing `effect`, and the subsequent wall bump must clear **both**. The reviewer already established that the one-press move assertion passes before the fix. Do not add redundant `a`/`d` coverage because `src/phaser/keys.ts` maps it to the same movement command and `movement.spec.ts` already tests WASD.

## Task 2 — Make routine collisions sound-only

**File:** `src/main.ts`

- [x] In `handleInput`'s failed-transition branch, check directly for `transition.reason === 'wall' || transition.reason === 'out-of-bounds'`. For these two reasons set **both** `effect = null` and `blocked = null`; for other rejected transitions retain `blocked = transition.reason`.
- [x] Do not add an `input.kind === 'move'` guard: these two reasons only originate from `attemptMove`, which `dispatchInput` calls only for a movement without a pending interaction.
- [x] Preserve the original `transition` for `cuesFor(input, transition)`, retaining the existing `bump` SFX. Do not change `WorldScene`, `dispatchInput`, `attemptMove`, the UI overlay, save logic, or localized reason tables.

## Task 3 — Update existing tests and project guidance

**Files:** `src/ui/InteractionOverlay.test.ts`, `CLAUDE.md`

- [x] Change `showsMessage(null, 'wall', m)` to `showsMessage(null, 'latch-closed-front', m)`. The overlay helper itself is not changing; this unit assertion should describe a reason that the application still shows.
- [x] **Required:** Add one sentence to the `src/main.ts` architecture bullet in `CLAUDE.md`: `A wall or map-edge bump is sound-only: handleInput clears the message instead of setting blocked.` Do this **when the implementation lands**, not ahead of runtime behavior.
- [x] Re-run existing pending-interaction, encounter/purchase and keyboard-repeat tests. A pending combat/shop/trade interaction must remain blocking and actionable denials must still display.
- [x] Leave `reasons.wall` and `reasons['out-of-bounds']` in the three locale tables. Do not introduce a `ShownReason` union or a `Record<BlockedReason, boolean>` policy table.

## Task 4 — Verify and complete this PR

- [x] `bun run typecheck`
- [x] `bun run lint`
- [x] `bun run format:check`
- [x] `bun run test:unit`
- [x] `bun run test:e2e`
- [x] `bun run build`
- [x] Manually confirm: unmuted bump plays existing sound; muted bump still turns hero toward wall; Escape opens menu without a preliminary dismissal; mobile and desktop layouts show no routine wall message.
- [x] Update PR body with real test results, then mark ready only when this same PR includes code and tests.

## Completion criteria

The change eliminates persistent wall/map-edge messages and the Escape-to-dismiss detour, without claiming to fix a movement-key bug already disproven by baseline browser testing. One existing sound test and one new movement test capture the behavior. No additional PRs are needed.

## Review follow-ups (PR #38)

- Held-key repeats into a wall or any other move that goes nowhere now pace at a step's length: `WorldScene` stamps `bumpAt` when a dispatched move starts no step, and `canRepeat` waits for it (`src/phaser/WorldScene.ts`). A held arrow used to replay `bump` and redraw the whole scene at key-repeat speed, which the spec's repeat-throttle criterion ruled out.
- The `movement.spec.ts` wall-bump test re-denies the latch while the message is up, proving a direction key still reaches the rules rather than being swallowed as a dismissal. The held-key test pins the pacing: an instant repeat burst into the wall starts one bump, then the next landed repeat starts one more.
- `countAudioStarts`/`audioStarts` live in `tests/e2e/journey.ts`, shared by the sound and movement specs.
