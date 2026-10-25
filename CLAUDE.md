# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Eridanus is an exploration-first browser mini-game inspired by 魔塔 (Magic Tower): handcrafted grid mazes, authored clues/treasure, and fast deterministic combat used as a resource gate rather than a tactical mode.

The full design contract lives in `docs/superpowers/specs/2026-09-15-hpa-237-cross-floor-slice-design.md`, with the implementation plan alongside it. Read the spec's **Non-Goals** and **Design Principles** before adding systems — it explicitly rules out ECS, quest engines, event scripting, inventory, save migrations, UI frameworks, and test-only game APIs.

## Commands

Runtime is [Bun](https://bun.sh) (pinned to 1.4.2 via `packageManager` and CI).

```sh
bun install
bun run dev                 # vite dev server on 127.0.0.1
bun run typecheck           # tsc --noEmit
bun run lint                # eslint .
bun run format:check        # prettier --check . (CI gate; `bun run format` to fix)
bun run test:unit           # vitest run over src/**/*.test.ts
bun run test:e2e            # playwright; auto-starts dev server on :4173
bun run build
bun run sfx <cue> <take>    # turn an ElevenLabs take into public/assets/sfx/<cue>.wav (needs ffmpeg)
bun run sprite <key> <raw>  # turn a generated image into the 96×96 PNG for an ASSET_PATHS key (needs ffmpeg)
bun run sprite <key> <sheet> --frames <idle|walk> <n>  # cut a sheet of n figures into that sprite's animation frames
```

Single test runs:

```sh
bunx vitest run src/game/combat.test.ts
bunx vitest run -t 'blocks closed latch from front'
bunx playwright test tests/e2e/cross-floor.spec.ts -g 'required-only|explorer'
bunx playwright install --with-deps chromium   # first e2e run only
```

CI (`.github/workflows/ci.yml`) runs typecheck + lint + format:check + build, unit tests, and Playwright as three separate jobs. A Husky `pre-commit` hook runs lint-staged (eslint --fix + prettier).

## Architecture

Four layers with one-directional data flow. **Phaser never owns game rules; the DOM overlay never mutates state; persistence never infers gameplay decisions.**

```
keyboard (WorldScene) / button click (InteractionOverlay)
  → main.ts handleInput
  → dispatchInput (session.ts)        transient gating
  → attemptMove / interactWithEntity / resolveCombat / resolvePurchase   pure rules
  → ActionResult { ok, state, effect } | { ok: false, reason }
  → saveGame if GameState identity changed
  → sfx.play(cuesFor(...))
  → scene.refresh() + overlay.render()
```

- **`src/game/`** — pure TypeScript, zero Phaser imports. `types.ts` holds every closed union; `state.ts` the initial state; `movement.ts` → `actions.ts` → `combat.ts` / `shop.ts` the rule chain (`equipment.ts` says which ware is worn per slot); `session.ts` the pending-interaction gate; `save.ts` the localStorage boundary.
- **`src/game/content/`** — authored maps (`village`, `floor1`–`floor5`; the core guardian holds Floor 5, and a core-powered lift returns from it to the village; an old shaft climbs from a guarded hatch on Floor 5 through sealed blocks on Floors 4, 3 and 2 that nothing else reaches, the last a reading room whose latch opens only from inside), re-exported through `content.ts` as `MAPS`.
- **`src/phaser/`** — `WorldScene.refresh()` clears and redraws every child each input (and on window resize) from `SessionState` plus the transient `playerFacing` (which selects the player texture); a pending combat prompt outlines its enemy's cell. Every PNG is a 96×96 square (`ART_SIZE`, 3× so it stays sharp under zoom) and is drawn at exactly one 32-unit tile, so sprites never overlap neighbouring cells; walls are outlined where they meet floor in their terrain's `edge` colour. `bun run sprite <key> <raw.png>` turns a generated image into one (keys out the background, crops to the figure, downscales). The canvas fills the window at device-pixel resolution (`Scale.NONE` with a `1/devicePixelRatio` scale zoom, resized by hand in `createGame.ts`) so HiDPI screens stay sharp. The camera plays at 3× (`camera.ts`'s `followZoom`, zoomed out on small windows so at least 9×7 tiles show clear of every panel) and follows the hero, holding them midway between the top panels and the message log (`camera.ts`'s `hudTop` and `logStrip` mirror the CSS grid; keep them in step), even at a map's edge, where the page backdrop shows past it. The HUD floats over the map, so a panel can cover tiles, but never the hero's. The scene maps arrow keys and WASD to moves (`keys.ts`; a letter with Ctrl/Cmd/Alt held stays the browser's shortcut) and `Enter`/`Escape` to `confirm`/`cancel` (Fight/Cancel, Buy/Leave) while a combat or purchase prompt is pending; with none pending, either key closes a shown message (a `cancel` with nothing pending is a no-op that clears it); with no message either, Escape opens the menu (`onMenu`) and Enter is left alone. `assets.ts` is the art-replacement seam (`ASSET_PATHS` catalog, terrain/player/entity resolvers, `TILE_SIZE`, the optional animation frames in `SPRITE_FRAMES`, and the panel-only `PORTRAIT_PATHS`). Characters animate: `update()` poses them every frame from the scene clock (`animation.ts`, pure timing), so a `refresh()` never restarts a loop. Each one cycles its idle frames or, with none, breathes (squashing toward its feet so it stays in its cell); a one-tile move slides the hero over `STEP_MS` with the camera following, playing half a walk cycle (`walkFrame`) or a small hop. Frame files sit beside their sprite as `<stem>-<idle|walk>-<n>.png` (`docs/art/style-guide.md`, "Animation frames").
- **`src/ui/InteractionOverlay.ts`** — framework-free DOM, rendered by `innerHTML` + re-bound listeners. Location banner, message box (effects, blocked reasons, the combat encounter card; hidden when it has nothing to say), invalid-save recovery. The HUD stays small: the hero card (`StatusPanel.ts`: stats and fight-cost preview) top-left, the banner, and a quest tracker top-right (`JournalPanel.ts`'s `renderQuestTracker`: the main quest and a Menu button). Everything else lives in the menu (`MenuPanel.ts`): Hero (stats and the gear in each slot; `EquipmentPanel.ts`), Items (wares a better one replaced, then key items; `ItemsPanel.ts`), Quests (main and side leads) and Notes (notes, places found) tabs, plus the language and sound buttons. Escape opens it when nothing else takes Escape (WorldScene's `onMenu`, after a prompt or a shown message); while it is open the overlay's capture-phase keydown keeps every key from the scene, ←/→ (A/D) switch tabs and Escape closes it. All tabs stay in the DOM, hidden, so e2e can count `data-lead`/`data-note`/`data-item` without opening it. `HowToPlay.ts` shows only while `factIds` is empty (and never below 1024 px). These are pure string renderers the overlay composes. The HUD floats over the full-window map: `#ui` is a pointer-transparent CSS grid laid over `#game`, and only the panels take clicks. The menu's open flag and tab are overlay-only view state — they never reach the session or the save. Keep each `data-stat` element's text exactly `HP n` / `ATK n` / `DEF n` / `Gold n` in English — the e2e journeys read stats back from it (other languages change only the label words). DOM portraits are 64×64 busts in `public/assets/portraits/` (Codex-generated, prompt in `docs/art/style-guide.md`; keyed by the sprite they stand in for, falling back to that sprite when missing); the one-cell rule applies only to the map grid.
- **`src/audio/`** — `cues.ts` maps each `SessionTransition` (effect kind or blocked reason) to named `SfxCue`s, pure and exhaustive by `Record`; `sfx.ts` plays them through one WebAudio master gain, using a synthesized placeholder per cue unless the cue is listed in `SFX_FILES` (then `public/assets/sfx/<cue>.wav`). Mute (`M` or the menu's speaker button) is stored under its own localStorage key, never in the save.
- **`src/i18n/`** — all player-facing prose, in three languages: English (`en`, the default), Traditional Chinese (`zh-Hant`) and Japanese (`ja`). `en.ts` is the reference table and `Messages = typeof en`, so `zh-Hant.ts`/`ja.ts` fail to compile with a missing or extra key. Tables are grouped (`ui`, `effects`, `reasons`, `leads`, `dialogue`, `notes`, and one per authored id kind: `maps`, `sections`, `npcs`, `shops`, `items`, `clues`, `access`); closed id unions are `satisfies Record<…>`-checked, and `messages.test.ts` checks the open ones (sections, shops, items, clues, access) against the authored content. A message that takes values is a function (`hpLoss: (loss) => …`), so each language orders its own words. The game layer never holds prose: effects carry ids (`clueId`, `speakerId`, `shopId`, `entityId`, `itemId`) and the UI looks the text up. `locale.ts` stores the choice under its own localStorage key (never the save) and `main.ts` sets `<html lang>`, which the CSS uses to pick CJK fonts. The menu's `EN`/`繁`/`日` button steps through `LOCALES`; there is no auto-detection. Native-speaker review of `zh-Hant.ts` and `ja.ts` is still pending.
- **`src/main.ts`** — the only stateful module: holds `session`, `effect`, `blocked`, wires input, autosaves, re-renders. A fight is resolved and saved at once (`main.ts` hands `dispatchInput` `Math.random`), then replayed as a `battle` from the `blows` its effect carries (`enemyDefeated` or `heroDefeated`, built by `combat.ts`'s `simulateFight`): while it plays the map and HUD show the game from before the fight (hero HP ticking down, enemy still standing), the scene lunges the striker and floats each damage number, or `Miss` for a blow that missed (`getStrike`), and the message box shows a Skip card. Moves are ignored mid-battle; Enter/Escape skip to the outcome.

### State model

`GameState` (durable, persisted) is `mapId`, `tile`, `player` stats (including `gold`), `trades` (status points bought from traders, which prices the next one) and six id arrays: `openedRewardIds`, `defeatedEnemyIds`, `openedShortcutIds` (opened latches and thrown levers), `itemIds`, `factIds`, `discoveredSectionIds`. It is deeply `Readonly` — every rule returns a new object rather than mutating.

`PendingInteraction` (transient, never persisted) exists only for the two-phase combat, purchase and trade prompts. `SessionState = { game, pending }`. While `pending` is set, moves are rejected with `interaction-pending`; `confirm` resolves a fight or purchase (a refused purchase keeps the prompt open), `choose` (keys 1–9 or a button) resolves a trade, `cancel` clears; any other input leaves the prompt open.

HP is one uncapped number with no maximum, as in 魔塔: fights spend it and nothing refills it. It only grows through one-time `hp` rewards (chests, and the waystones, which are `reward` entities drawn with the `recovery-waystone` sprite that vanish once drunk) and HP wares. Each waystone's amount is sized for the required-route fights after it; `combat.test.ts` walks that route with every blow landing and pins the HP it ends on.

Combat is random. Every fighter has AGI (`PlayerStats.agility`, an enemy's `stats.agility`); `hitChance(striker, target)` is 100% unless the target is quicker, then loses 5 points per AGI the striker lacks, down to 50%. The hero swings first, then the two trade, each blow rolling `rng() < hitChance` (the `Rng` the rules are handed, never `Math.random` itself). `previewCombat` forecasts the _average_ HP loss and the two hit chances, so the prompt reads `HP loss: ~n`; the real fight varies around it. A fight that takes the hero to 0 HP is lost: the hero wakes at the village start with HP and gold kept and the enemy untouched (`heroDefeated`). Enemies on the required route are all no quicker than the hero, so the hero never misses them and the route's worst case (every enemy blow landing) is the pinned 4-HP ending; evasive optional enemies (the prowlers, wisps and shades, AGI above the hero's) are the gamble. Nothing raises the hero's AGI yet.

Gold comes only from defeated enemies (each `EnemyEntity` authors its drop). A shop's wares are one-time purchases that equip into a slot (`weapon`, `armor` or `accessory`): a ware replaces the one worn in its slot, so its `amount` is the bonus it gives while worn, not on top of the one it replaces (a ladder's amounts are cumulative). Owning one is having its `itemId` in `itemIds`, and the one worn per slot is the last bought (`equipment.ts`'s `equippedWares`), so the save needs no extra array. A `trader` (the village's Status Trader) is the repeatable sink for what the wares leave over: each of its `offers` sells a few points of one stat, every trade costs `basePrice + priceStep × trades`, and the one `trades` counter is shared by all traders. Its points are plain stat gains, so they stay when a ware replaces another. Adding a stat to a trader is one more offer plus its `statLabels` word.

### Closed contracts

`MapId`, `Direction`, `Stat`, `Entity` kinds (`clue`, `reward`, `enemy`, `latch`, `lever`, `npc`, `portal`, `shop`, `trader`, `sealed`), `ActionEffect`, and `BlockedReason` are small closed unions in `types.ts`. Switches over them are exhaustive with no `default` — TypeScript's strict mode catches missed cases. Adding an entity kind or blocked reason means updating `actions.ts`, `movement.ts`, `content.ts`'s `isEntityBlocking`, `InteractionOverlay`'s `effectMessage`, the `reasons` table in all three `src/i18n` languages, and `content.ts`'s validator.

### Movement is interaction

There is no separate "interact" key. Moving into an occupied tile calls `interactWithEntity` and the player normally _stays put_ (a `sealed` entrance — a maze not built yet — just shows its text and records nothing); only portals (step-on travel) and already-consumed entities (collected reward, defeated enemy, opened latch) let the player advance. A latch is a rear latch, opening only from its `rearSide` (`interactWithEntity` compares the direction from the latch back to the player's tile), a guarded latch with `guardIds`, opening from either side once every guard is defeated (bumping it earlier shows how many remain), or a wired latch with `leverIds`, opening from either side while all its levers are thrown (bumping it earlier shows how many are). Bumping a `lever` flips it along with every lever in its `links` (the Floor 4 foundry gate's four levers drag their neighbours, so only the two outer pulls throw all four); once opened, a latch stays open whatever its levers do. A `rearSide` must be reachable only through another floor; `content.test.ts` checks that from the floor's front stair.

### Content authoring

Maps are rectangular ASCII rows using only `#` (wall) and `.` (floor), plus a list of entities placed by tile. Entities, sections and maps carry ids, never prose: a new NPC, shop ware, shop or trader (a trader is named in the `shops` table), clue, sealed entrance, locked portal, section or observation fact (`observation: true` in `FACTS`) needs its text in all three `src/i18n` tables, and `messages.test.ts` fails until it has one. `validateContent()` in `content.ts` enforces rectangularity, legal glyphs, globally unique ids, one entity per tile, entities on floor, and **reciprocal portals** (every portal's target tile must hold a portal pointing back). `content.test.ts` asserts it returns no errors — a bad map fails unit tests, not the browser.

### Persistence

`save.ts` validates loaded JSON in two stages: `hasValidShape` (structural) then `hasValidContent` (ids resolve to the right entity kind in current content, tile is floor, tile isn't blocked by an unconsumed entity). Invalid saves return `{ kind: 'invalid', reason }` and `main.ts` shows the reset panel _without booting Phaser_, so keyboard input stays dead until the player explicitly resets. There is deliberately no save versioning or migration.

## Testing

Unit tests sit beside their module (`src/game/combat.test.ts`) and drive pure functions with literal `GameState` objects. Playwright tests in `tests/e2e/` drive the **real player-facing UI** — arrow keys, `Enter`/`Escape` and HUD `data-testid`/`data-stat` selectors — never an internal test API. Keep e2e assertions on stable attributes (`data-effect="clue"`, `data-line`, `data-remaining`, `data-thrown`) rather than authored prose, so content edits don't break tests.

The two release journeys in `tests/e2e/cross-floor.spec.ts` (required-only and explorer) are written as the entities they bump, never as key counts or coordinates. `tests/e2e/journey.ts`'s `Journey` plans each walk by BFS over the real rules, replays it on a pure session, presses the same keys in the page, and checks after every bump that the page shows the effect and its save equals the pure state. Each journey runs as one test per chapter, seeded with the save the earlier chapters leave (replayed without a browser), so chapters run in parallel; a `replayOnly` chapter never opens the browser. Fights are random, so a journey fixes every roll to zero (every blow lands) on both sides: the pure replay passes `() => 0`, and the page gets `fixRolls` (`Math.random` pinned only for calls from `src/game`, because Phaser draws on it too). Moving an entity or reshaping a map needs no e2e change unless it changes what a journey must bump: a new gate, a fight that now needs a waystone drunk first.
