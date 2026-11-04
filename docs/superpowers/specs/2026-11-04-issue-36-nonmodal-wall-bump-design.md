# Issue #36 — Non-modal Wall-Bump Feedback Design

## Status

Planning only. GitHub issue: [#36 — Wall-bump message swallows the next movement input](https://github.com/cwchanap/Eridanus/issues/36). Implement and validate the fix on **this same PR** after reviewing the design; do not open a second implementation PR.

## Goal

Exploring a maze must not feel like **bump → dismiss → move**. Ordinary collisions with terrain should leave movement controls immediately usable without an on-screen message that asks to be dismissed. Preserve meaningful blocking feedback and prompts.

## Code review and diagnosis (main at `fedcdcc`)

- `src/phaser/WorldScene.ts` maps arrow/WASD input to `{ kind: 'move', direction }` **before** the `hasMessage()` branch. `hasMessage()` is consulted for **Enter/Escape** only. The issue's proposed cause (movement keys always routed to `cancel` when a message exists) is not present in this revision.
- `src/game/session.ts` forwards movement with no pending interaction to `attemptMove`; pending combat/purchase/trade intentionally rejects moves as `interaction-pending`.
- `src/game/movement.ts` returns `wall` or `out-of-bounds` on terrain collisions, without changing the saved `GameState`.
- `src/main.ts` retains the failed transition's reason in `blocked`; `src/ui/InteractionOverlay.ts` then renders a persistent, dismissible blocked-reason message and `showsMessage()` reports it. That presentation makes ordinary collisions appear modal even though fresh direction keys are already forwarded.
- `src/audio/cues.ts` already maps both `wall` and `out-of-bounds` to the existing `bump` cue (`public/assets/sfx/bump.wav`). No new SFX or artwork is needed.
- `tests/e2e/sound.spec.ts` currently expects the persistent `wall` message. This assertion must be updated with the intended UX.

**Verification caveat:** Static inspection does **not** prove the reported extra keypress occurs on today's `main`. First add/run an exact browser regression at a wall. If it already passes, do **not** change keyboard routing speculatively; the remaining justified change is to make wall feedback non-modal.

## Decision

Use **sound-only feedback** for routine terrain collisions. This is the smaller of the issue's proposed remedies: retain the existing bump sound, and do not show a wall/out-of-bounds message. No toast timer, state machine, animation, shake effect, or new component.

### Input/feedback contract

| Scenario | Gameplay/session response | UI feedback | Keys |
| --- | --- | --- | --- |
| Move into a wall or beyond the map | Reject; hero tile and save unchanged | Existing `bump` SFX (subject to mute); no interaction-log message or dismiss button | Next fresh arrow/WASD press is treated as movement immediately; Escape may open menu |
| Valid move after a collision | Move once as usual | Standard movement SFX; no stale collision/message | No preliminary cancel/dismiss press |
| Blocked by an open combat/shop/trade prompt | Reject as `interaction-pending` | Existing prompt and blocked reason | Prompt remains modal until answered; no movement underneath |
| Denied by a latch, unwinnable combat, insufficient gold, etc. | Existing rules unchanged | Existing blocked message | Existing dismiss/answer semantics |
| Story clue, dialogue, reward, result message | Existing effect | Existing message | Enter/Escape dismisses; direction keys continue to use current gameplay rules |
| Battle replay or menu open | Existing input gating | Existing battle/menu UI | No movement beneath the battle/menu |

### Minimal implementation seam

Change only the failed-transition presentation branch in `src/main.ts::handleInput`:

```ts
if (transition.ok) {
  // Existing success handling, unchanged.
} else if (
  input.kind === 'move' &&
  (transition.reason === 'wall' || transition.reason === 'out-of-bounds')
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

No changes are expected in `WorldScene`, `dispatchInput`, `attemptMove`, `cuesFor`, `showsMessage`, `GameState`, or save serialization. Keeping the classification at the `main.ts` presentation boundary avoids introducing a second definition of modal/non-modal reasons in the overlay.

## Acceptance criteria

1. At the village's known wall from `(12,10)`, one ArrowLeft is rejected; one subsequent ArrowRight moves to `(13,10)` without a dismiss step. Repeat with `a` / `d`.
2. Neither `wall` nor `out-of-bounds` creates `[data-testid="blocked-reason"]`, a message dismiss button, or a visible interaction log. A previously visible effect does not linger after a collision.
3. An unmuted collision still plays `bump`; muted remains silent. Movement and its save semantics are unaffected.
4. Escape immediately opens the menu after a plain wall collision (provided no prompt/menu/battle is open); Enter is not required.
5. Combat/shop/trade pending interactions still block movement; `interaction-pending` and actionable denial messages still display correctly.
6. Existing keyboard-repeat throttle, combat replay, and message dismissal continue to work; ordinary direction keys are never remapped to `cancel`.

## Trade-offs and non-goals

With sound muted, a blocked step has no additional animated/text feedback; the unchanged hero position and visible wall convey it. This is acceptable for this narrowly scoped hobby-game fix. If playtesting later shows a need for accessible or silent visual feedback, evaluate a short non-modal hint as a **separate follow-up**, not a timer-based system in this PR.

Do not add toast infrastructure, new SFX, camera-shake code, additional game-rule types, save migrations, input abstractions, or backward-compatibility handling.
