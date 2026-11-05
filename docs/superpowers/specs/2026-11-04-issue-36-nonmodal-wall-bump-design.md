# Issue #36 — Non-modal Wall-Bump Feedback Design

## Status

Planning only. GitHub issue: [#36 — Wall-bump message swallows the next movement input](https://github.com/cwchanap/Eridanus/issues/36). Implement and validate the fix on **this same PR** after reviewing the design; do not open a second implementation PR.

## Goal

Routine terrain collisions should not leave a persistent message or consume the next **Escape** press before the menu opens. Direction keys already work after a wall collision on current `main`; the goal is to remove misleading modal presentation while preserving meaningful blocking feedback and prompts.

## Code review and diagnosis (main at `fedcdcc`)

- `src/phaser/WorldScene.ts` maps arrow/WASD input to `{ kind: 'move', direction }` **before** the `hasMessage()` branch. `hasMessage()` is consulted for **Enter/Escape** only. The issue's proposed cause (movement keys always routed to `cancel` when a message exists) is not present in this revision.
- `src/game/session.ts` forwards movement with no pending interaction to `attemptMove`; pending combat/purchase/trade intentionally rejects moves as `interaction-pending`.
- `src/game/movement.ts` returns `wall` or `out-of-bounds` on terrain collisions, without changing the saved `GameState`.
- `src/main.ts` retains the failed transition's reason in `blocked`; `src/ui/InteractionOverlay.ts` then renders a persistent, dismissible blocked-reason message and `showsMessage()` reports it. That presentation makes ordinary collisions appear modal even though fresh direction keys are already forwarded.
- `src/audio/cues.ts` already maps both `wall` and `out-of-bounds` to the existing `bump` cue (`public/assets/sfx/bump.wav`). No new SFX or artwork is needed.
- `tests/e2e/sound.spec.ts` currently expects the persistent `wall` message. This assertion must be updated with the intended UX.

**Baseline browser verification (PR #38 design review, 2026-11-05 UTC):** The [reviewer ran a scratch Playwright reproduction](https://github.com/cwchanap/Eridanus/pull/38#issuecomment-6647098378) against `fedcdcc`: from the village start `(15,10)`, three ArrowLeft presses reach `(12,10)`, the fourth bumps the wall at `(11,10)`, and **one** ArrowRight immediately reaches `(13,10)` and clears the message. `a`/`d` works the same way. The reported swallowed **movement** key is therefore not reproducible on that revision. The **confirmed friction** is that Escape after a wall bump dismisses the persistent wall message instead of opening the menu. This is a UX change, not an input-routing bug fix; avoid touching `WorldScene`.

## Decision

Use **sound-only feedback** for routine terrain collisions: retain the existing bump sound and don't show a `wall`/`out-of-bounds` message. The hero still turns to face the attempted direction (`WorldScene.playerFacing`), including while muted. No toast timer, state machine, extra animation, shake effect, or new component.

### Input/feedback contract

| Scenario                                                      | Gameplay/session response            | UI feedback                                                                         | Keys                                                                                 |
| ------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Move into a wall or beyond the map                            | Reject; hero tile and save unchanged | Existing `bump` SFX (subject to mute); no interaction-log message or dismiss button | Next fresh arrow/WASD press is treated as movement immediately; Escape may open menu |
| Valid move after a collision                                  | Move once as usual                   | Standard movement SFX; no stale collision/message                                   | No preliminary cancel/dismiss press                                                  |
| Blocked by an open combat/shop/trade prompt                   | Reject as `interaction-pending`      | Existing prompt and blocked reason                                                  | Prompt remains modal until answered; no movement underneath                          |
| Denied by a latch, unwinnable combat, insufficient gold, etc. | Existing rules unchanged             | Existing blocked message                                                            | Existing dismiss/answer semantics                                                    |
| Story clue, dialogue, reward, result message                  | Existing effect                      | Existing message                                                                    | Enter/Escape dismisses; direction keys continue to use current gameplay rules        |
| Battle replay or menu open                                    | Existing input gating                | Existing battle/menu UI                                                             | No movement beneath the battle/menu                                                  |

### Minimal implementation seam

Change only the failed-transition presentation branch in `src/main.ts::handleInput`:

```ts
if (transition.ok) {
  // Existing success handling, unchanged.
} else if (
  transition.reason === 'wall' ||
  transition.reason === 'out-of-bounds'
) {
  // A routine terrain collision is sound-only. Do not leave a previous
  // clue/dialogue/effect visible as stale feedback after the collision.
  effect = null;
  blocked = null;
} else {
  blocked = transition.reason;
}
// Continue using the original transition for cuesFor(input, transition).
```

This retains the **original failed transition** for `cuesFor`, so the bump still plays. It clears both `blocked` **and** `effect` for these collisions: otherwise an earlier dialogue/reward could reappear when the collision is deliberately hidden. `redraw()` then hides the interaction log naturally.

No changes are expected in `WorldScene`, `dispatchInput`, `attemptMove`, `cuesFor`, `showsMessage`, `GameState`, or save serialization. The `input.kind` guard is unnecessary: these two blocked reasons originate only from `attemptMove`, reached only for movement without a pending interaction. Keeping the classification at the `main.ts` presentation boundary avoids duplicating it in `showsMessage` and `renderMessage`. Retain the localized `reasons.wall`/`reasons['out-of-bounds']` strings and the closed `BlockedReason` union rather than adding a second reason type or deleting strings solely because they become unreachable in normal rendering.

## Review-informed test strategy

- **Extend, do not duplicate,** `tests/e2e/sound.spec.ts`: retain its measured WebAudio-start check, assert the saved tile remains `(12,10)` after the fourth ArrowLeft (so a normal step cannot masquerade as a bump), and assert the first muted ArrowRight moves to `(13,10)`.
- **Add exactly one focused** `tests/e2e/movement.spec.ts` scenario that exposes both stale presentation fields. Boot a valid Floor 1 save built from `createInitialGameState()` with `mapId: 'floor1'` and `tile: { x: 13, y: 14 }` using the existing localStorage fixture pattern. Press `↓` into the clue `floor1-treasury-overlook` at `(13,15)` and assert a `clue` effect; press `↑` into `floor1-rear-latch` at `(13,13)` from its front side and assert `blocked-reason[data-reason="latch-closed-front"]`. This failed latch input retains the earlier clue `effect` while setting `blocked`. Then press `→` into the wall at `(14,14)`. Assert the saved tile remains `(13,14)`, effect/blocked-reason/dismiss button are absent, and the log is hidden; Escape immediately opens `menu[data-open="true"]`, a second Escape closes it, and `←` moves to `(12,14)`. Run the test before the UI change to record its failure. This single regression catches omission of **either** `effect = null` or `blocked = null`, without a second test or new game API.
- **Reuse** `savedGame` from `tests/e2e/journey.ts` and the existing WASD, repeat throttling, pending-combat and denied-purchase tests. Update `src/ui/InteractionOverlay.test.ts` to assert `showsMessage(null, 'latch-closed-front', m)` rather than testing a wall reason intentionally no longer passed to it.
- **Required documentation** alongside implementation: add a sentence to the `src/main.ts` bullet in `CLAUDE.md` stating that `wall` and `out-of-bounds` are sound-only: `handleInput` clears the message instead of setting `blocked`.

## Acceptance criteria

1. The existing sound journey proves the wall bump keeps the saved tile at `(12,10)` and **one** subsequent ArrowRight advances to `(13,10)` without a dismiss press; existing WASD coverage remains green (no duplicate `a`/`d` scenario).
2. Neither `wall` nor `out-of-bounds` creates `[data-testid="blocked-reason"]`, a message dismiss button, or a visible interaction log. The **required** clue → actionable latch denial → wall collision test begins with _both_ `effect` and `blocked` non-null. The wall must clear both fields; omitting either assignment fails the regression.
3. An unmuted collision still plays `bump`; muted remains silent. Movement and its save semantics are unaffected.
4. Escape immediately opens the menu after a plain wall collision (provided no prompt/menu/battle is open); Enter is not required.
5. Combat/shop/trade pending interactions still block movement; `interaction-pending` and actionable denial messages still display correctly.
6. Existing keyboard-repeat throttle, combat replay, and message dismissal continue to work; ordinary direction keys are never remapped to `cancel`.

## Trade-offs and non-goals

With sound muted, a blocked step still turns the hero toward the wall without adding text or animation; the unchanged position and visible wall also convey the collision. This is acceptable for this narrowly scoped hobby-game fix. If playtesting later shows a need for accessible or silent visual feedback, evaluate a short non-modal hint as a **separate follow-up**, not a timer-based system in this PR.

Do not add toast infrastructure, new SFX, camera-shake code, additional game-rule types, save migrations, input abstractions, or backward-compatibility handling.
