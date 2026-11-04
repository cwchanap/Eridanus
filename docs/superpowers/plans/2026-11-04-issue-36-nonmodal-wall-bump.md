# Issue #36 — Non-modal Wall-Bump Implementation Plan

**Issue:** [Eridanus #36](https://github.com/cwchanap/Eridanus/issues/36)

**Design:** [2026-11-04-issue-36-nonmodal-wall-bump-design.md](../specs/2026-11-04-issue-36-nonmodal-wall-bump-design.md)

**PR scope:** One PR only, currently **planning-only**. Implement the small fix and tests on the same branch/PR after design review. No new art or SFX tasks are needed because the existing `bump` cue is reused.

**Architecture:** Pure movement/session rules stay as they are. Suppress only the *presentation* of routine `wall` and `out-of-bounds` failures at `main.ts::handleInput` while still passing the original transition to `cuesFor`.

## Task 1 — Reproduce and pin input behavior

**File:** `tests/e2e/movement.spec.ts`

- [ ] Add a browser regression using the existing fresh-save village start and `savedTileX` helper. From `(15,10)`, three ArrowLeft presses reach `(12,10)`; a fourth hits the wall at `(11,10)` without changing the saved tile.
- [ ] Assert that one subsequent ArrowRight moves immediately to `(13,10)`, and test an equivalent `a` / `d` path. Do not insert Escape/Enter between collision and movement.
- [ ] Run the new test **before** changing implementation to establish whether the claimed swallowed movement key reproduces. Current `WorldScene.handleKeyDown` suggests it may already pass.
- [ ] If the movement assertion actually fails at baseline, diagnose the observed key event / pending / menu / repeat behavior first and amend this design rather than blindly changing `WorldScene`.

## Task 2 — Make routine terrain collisions sound-only

**File:** `src/main.ts`

- [ ] In the failed `dispatchInput` branch, when `input.kind === 'move'` and `transition.reason` is `wall` or `out-of-bounds`, set `blocked = null` and `effect = null`. Leave all other failures untouched.
- [ ] Keep `cuesFor(input, transition)` and `sfx.play(cues)` using the original rejection, preserving the existing `bump` sound.
- [ ] Keep the success path, `redraw()`, scene key bindings, session pending gate, and game save behavior unchanged.

## Task 3 — Assert presentation and avoid regressions

**Files:** `tests/e2e/movement.spec.ts`, `tests/e2e/sound.spec.ts`

- [ ] After the wall bump, assert no `blocked-reason`, dismiss control, or visible interaction log; test that one fresh movement press works.
- [ ] Update the existing sound test's `data-reason="wall"` expectation to the absent-message behavior while retaining the bump-audio increment check, mute assertions, and menu behavior.
- [ ] Assert Escape opens the menu immediately after an ordinary collision when no pending prompt is open, then close it and confirm movement still works.
- [ ] Ensure existing `tests/e2e/cross-floor.spec.ts` coverage still proves `interaction-pending` visibly blocks a move while Fight/Cancel remains reachable; existing shop denial tests in `village.spec.ts` stay green.
- [ ] Optionally cover a previous dialogue/effect followed by a wall bump if the regression is easy to express without a test-only game API. In all cases, `effect` must not reappear after the suppressed collision.
- [ ] Avoid adding new UI hooks or new `src/game` unit tests for a change confined to the application presentation boundary.

## Task 4 — Final verification on this PR

- [ ] `bun run typecheck`
- [ ] `bun run lint`
- [ ] `bun run format:check`
- [ ] `bun run test:unit`
- [ ] `bun run test:e2e`
- [ ] `bun run build`
- [ ] Manually confirm a collision and a one-press turn-away at desktop and mobile widths, both muted and unmuted.
- [ ] If the implementation changes the documented behavior, update the input/overlay guidance in `CLAUDE.md`; keep the scope to this issue.
- [ ] Update PR body with actual results and switch to ready-for-review only once the implementation (not just these docs) is complete.

## Completion criteria

The submitted fix should remove routine collision messages, keep existing bump sound, require **zero** extra dismiss presses between a wall bump and movement, and preserve all legitimate modal prompts and refusals. No additional PRs are needed.
