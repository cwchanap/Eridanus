# The Wellworks: Floors 6–10 Design

## Status

Draft for review. Design only: no code, no authored maps, no implementation plan yet. Hapadona asked to "design the dungeon for 6/F to 10/F".

Written against `main` at `fedcdcc`. The six new enemy sprites and busts are already on `claude/project-thread-dyra9d` (`2bec23f`); this spec builds on that branch so the two travel together.

Two things I could not see and have assumed, both flagged again under **Open decisions**:

- the earlier enemy-types prototype, so the three combat traits below are my reading of the art brief (ravager glass cannon, bulwark tank, darter high agility, twinblade strikes twice, ambusher strikes first, lancer armour piercing);
- who the new floors are balanced for (decided as the full-exploration hero, see **Power model**).

All numbers come from a small model that re-implements `previewCombat` (plus the three traits) and walks each floor's required route. The implementation plan must re-derive them with the real function before authoring entities.

## Context

What the repo says today, because every choice below leans on it:

- The tower is Floors 1–5, descending. Floor 5 is the heart: three wardens keep the sanctum seal, the core guardian holds the Restoration Core, and a core-powered lift runs between the sanctum and the village. Returning the core sets `main-village-restored` and the main lead reads `story-complete`.
- The village has three sealed entrances (Mine, Crypt, Barrow) that are placeholders. **They stay sealed** here.
- HP is one uncapped pool that never refills. It grows only through one-time `hp` rewards (chests, waystones) and HP wares. Waystones are sized for the required-route fights after them.
- Combat is random: hero swings first, the enemy answers every swing but the last, hit chance falls 5 points per AGI the striker lacks (floor 50%). The preview shows the _average_ HP loss. The hero's AGI is 5 and nothing raises it.
- Power comes from stat chests, three shop tiers (`runed-blade` +7 ATK, `plate-armor` +7 DEF, `life-crystal` +35 HP) and the Status Trader (30 gold plus 10 per trade bought, shared counter).
- The spread of heroes on Floor 5 is huge. The required-only route ends at **ATK 16, DEF 6, HP 4**. A full explorer ends at about **ATK 39+, DEF 39+, AGI 5, HP ≈ 650** with 1054 gold earned, 400 spent on wares and ≈ 630 on nine trades. Floor 5's ordinary enemies top out at ATK 18; its optional elites at ATK 36.

## Goal

Five more floors that feel like one dungeon with one arc and a satisfying end:

1. **A reason to go back down.** The restored core wakes something below the heart.
2. **Floors that differ in how they play**, not only in how hard they hit: each one has a signature gate or puzzle built from the existing primitives.
3. **The six new enemy types as the bestiary**, introduced on Floor 6 and combined thereafter, each one asking a different stat question.
4. **A second ending** with the same shape as the first (a fight, an item, the Warden), so the story closes properly.
5. **No new entity kinds and no scripting.** The only engine addition is a small closed enemy trait.

## Non-goals

Carried over from the earlier specs (ECS, quest engine, event scripting, inventory, save migrations, UI framework, test-only APIs), plus:

- no new entity kinds; everything below is `portal`, `latch`, `lever`, `reward`, `enemy`, `shop`, `clue`, `sealed`;
- no boss phases, no summons, no status effects;
- no more than one trait per enemy;
- no AGI growth for the hero (flagged as an open decision);
- no random loot, no respawns, no HP refill, no escort or fetch quests;
- no change to the three sealed village entrances;
- no new terrain art in the first pass (the dungeon tileset is shared).

## Premise: the Wellworks

The tower's "flow" that supplied the village is drawn from a **Wellspring** at the bottom of the tower. The keepers regulated it with the heart core on Floor 5 and a garrison below. When they isolated the guardians, the garrison stayed sealed in with the machinery and changed. Everything that crawled in, was built there or was bound to it since is the **Hollow**: the six new enemy types.

Restoring the core restarts the flow at the heart, and the flow surges down the old lift shaft. The Warden hears the machinery wake. The sanctum's lift shaft is no longer dead: a hatch below it opens. Going down, the village learns the heart was only the _regulator_. Until the Wellspring is bound again, the supply will keep failing.

- **Floor 6, the Sump:** the catch basin under the shaft; camp, bestiary, first stat checks.
- **Floor 7, the Cisterns:** the settling tanks; the lever tour.
- **Floor 8, the Garrison:** the keepers' barracks; the relay of sergeants.
- **Floor 9, the Pump Hall:** the engine room; the six-lever linkage and the sealed reliquary.
- **Floor 10, the Wellspring:** the source, two wardens and the last guardian.

The ending mirrors Floor 5: defeat the **Wellspring Warden**, take the **Wellspring Seal**, bring it to the village Warden.

**Hook.** A new portal in the Floor 5 sanctum is locked on the fact `main-village-restored` (the `fact` lock kind already exists), so the Deep is unreachable until the first story is told. Its locked text is the player's cue. The one Floor 5 edit this needs is described under **Cross-floor links**.

## Power model

### The design hero

Floors 6–10 are balanced for the **explorer line**: every optional chest on Floors 1–5 taken, every ware bought, the leftover gold in trades. That is the hero a player has after finishing the first story properly. A required-only hero cannot play the Deep, and the game says so itself: at ATK 16 and DEF 6 every Floor 6 enemy previews as _cannot damage_ or _would likely defeat you_. The fix is built in: go back up for the optional content you skipped.

| Floor | Entry ATK / DEF | Why it rises                                            |
| ----- | --------------- | ------------------------------------------------------- |
| 6     | 43 / 43         | explorer after Floor 5 and four trades each             |
| 7     | 54 / 54         | Floor 6 stat chests (+4 / +4) and Wellsteel gear (+7)   |
| 8     | 59 / 59         | Floor 7 stat chests (+5 / +5)                           |
| 9     | 73 / 73         | Floor 8 stat chests (+6 / +6) and Heartforged gear (+8) |
| 10    | 79 / 79         | Floor 9 stat chests (+6 / +6)                           |

Floor 10's own chests give +2 / +2 (the ceiling is the final fight, not more gems). AGI stays 5.

**Plan step zero:** the entry row for Floor 6 must be _measured_ from the explorer journey's end state, not trusted from this table. Re-run the model with the real numbers; everything below is relative to it.

### Enemy recipes

Enemy stats are formulas on the floor's entry hero (A for ATK, D for DEF) and an intensity `k` (1.0, 1.1, 1.2, 1.3, 1.4 for Floors 6–10) that scales damage offsets. Retuning the target hero changes two numbers, not 130 enemies.

| Type (art)                    | Trait         | ATK           | DEF    | HP  | AGI | Question it asks                                                                                                                            |
| ----------------------------- | ------------- | ------------- | ------ | --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruin Guard (grunt)            | –             | D + 5k        | A − 13 | 39  | 3   | filler, the tower's own sentries; only on Floor 6                                                                                           |
| Ruin Sentinel (elite)         | –             | D + 10k       | A − 10 | 40  | 2   | the wardens and vault keepers                                                                                                               |
| **Ravager** (glass cannon)    | –             | D + 30k       | A − 24 | 27  | 4   | **ATK threshold.** Dies to one blow once ATK is 3 above entry: free after the floor's first ATK chest, ~30 HP before                        |
| **Bulwark** (tank)            | –             | D + 6k        | A − 3  | 36  | 1   | **ATK bank.** 3 damage a hit at entry (~53 HP), ~24 after one ATK chest, ~8 once the floor's chests are in; unwinnable at ATK 3 below entry |
| **Darter** (agile)            | –             | D + 8k        | A − 16 | 32  | 15  | **AGI tax.** The hero hits 50%; a fixed cost that only kill speed reduces                                                                   |
| **Twinblade** (strikes twice) | double-strike | D + 7k        | A − 14 | 44  | 6   | **DEF bank.** Each of its two swings is small; DEF chests shrink both                                                                       |
| **Ambusher** (strikes first)  | first-strike  | D + 9k        | A − 14 | 28  | 5   | **No free kills.** One opening blow always lands, however fast you kill it                                                                  |
| **Lancer** (armour piercing)  | pierce        | ⌊D / 2⌋ + 20k | A − 12 | 36  | 4   | **DEF is not enough.** Looks harmless (ATK below your DEF) but ignores half of it                                                           |

Stat blocks per floor, as ATK / DEF / HP / AGI → expected HP loss for the design hero at the floor's entry:

| Floor (k) | Grunt          | Sentinel        | Ravager          | Bulwark         | Darter           | Twinblade       | Ambusher        | Lancer          |
| --------- | -------------- | --------------- | ---------------- | --------------- | ---------------- | --------------- | --------------- | --------------- |
| 6 (1.0)   | 48/30/39/3 → 9 | 53/33/40/2 → 26 | 73/19/27/4 → 28  | 49/40/36/1 → 53 | 51/27/32/15 → 24 | 50/29/44/6 → 45 | 52/29/28/5 → 18 | 41/31/36/4 → 38 |
| 7 (1.1)   | –              | 65/44/40/2 → 28 | 87/30/27/4 → 31  | 61/51/36/1 → 62 | 63/38/32/15 → 27 | 62/40/44/6 → 51 | 64/40/28/5 → 20 | 49/42/36/4 → 42 |
| 8 (1.2)   | –              | 71/49/40/2 → 31 | 95/35/27/4 → 34  | 66/56/36/1 → 62 | 69/43/32/15 → 30 | 67/45/44/6 → 51 | 70/45/28/5 → 22 | 53/47/36/4 → 46 |
| 9 (1.3)   | –              | 86/63/40/2 → 33 | 112/49/27/4 → 37 | 81/70/36/1 → 70 | 83/57/32/15 → 30 | 82/59/44/6 → 58 | 85/59/28/5 → 24 | 62/61/36/4 → 49 |
| 10 (1.4)  | –              | 93/69/40/2 → 36 | 121/55/27/4 → 40 | 87/76/36/1 → 70 | 90/63/32/15 → 33 | 89/65/44/6 → 64 | 92/65/28/5 → 26 | 67/67/36/4 → 53 |

What the design hero sees once the floor's own chests (+4 / +4 on Floor 6) are in: Bulwark 53 → 8 HP, Ravager 28 → 0, Twinblade 45 → 13, Darter 24 → 12, Ambusher 18 → 10, Lancer 38 → 34. **The Lancer is the one the stat chests do not solve**, which is its job; only the camp gear (and a clean route) brings it down. A hero 6 below the line in both stats finds every Bulwark unwinnable and the rest 3–5 times costlier. That soft wall is intended.

Floor 7+ drops the Ruin Guard: the Hollow has taken over.

### Camps, gear and gold

- **Camp Lanternfall (Floor 6)**, three counters: Wellsteel Blade (+14 ATK, 260 gold), Wellsteel Plate (+14 DEF, 260), Deepwell Charm (+80 HP, 160). They replace the tier below, as every ware does, so the real gain over `runed-blade`/`plate-armor` is +7.
- **Camp Deepwatch (Floor 8)**, three counters: Heartforged Blade (+22 ATK, 420), Heartforged Plate (+22 DEF, 420), Wellspring Locket (+160 HP, 300). Real gain +8.
- Gold is tuned to the sinks: Floor 6 ≈ 700 (a full Camp Lanternfall), Floor 7 ≈ 600, Floor 8 ≈ 900 (with Floor 7's carry-over, a full Camp Deepwatch), Floors 9–10 ≈ 400 each (only the Trader is left, so late gold is intentionally cheap).
- No new trader. The shared trade counter keeps inflating the village Trader, which is the intended long-tail sink.

### HP supply

Each floor's waystones add up to about **1.2× the required route's expected HP cost**, in 3–4 stones sized for the fights after them (the existing rule). Optional caches add about 35% on top, so a full clear nets positive and a required-only clear nets a little.

| Floor | Required fights | Expected route cost | Waystone supply |
| ----- | --------------- | ------------------- | --------------- |
| 6     | 12              | ≈ 250               | ≈ 300           |
| 7     | 11              | ≈ 390               | ≈ 470           |
| 8     | 11              | ≈ 470               | ≈ 560           |
| 9     | 12              | ≈ 490               | ≈ 580           |
| 10    | 11              | ≈ 540               | ≈ 640           |

The fight counts include the gate guards (wardens, sergeants, the Ambush Pair), which replace ordinary fights of similar cost rather than adding to them. These are budgets. The plan's pinned route test (like `combat.test.ts`'s Floor 1–5 route) sets the real waystone amounts, and every fight on it must be winnable with every enemy blow landing.

### Bosses and wardens

The floor boss is one ordinary enemy entity with hand-set stats, sized so the route hero (entry plus the floor's required chests) pays:

| Floor | Boss                          | Type             | Expected cost on the route |
| ----- | ----------------------------- | ---------------- | -------------------------- |
| 6     | Sump Warden                   | Bulwark          | ≈ 45                       |
| 7     | Duelist Prime                 | Twinblade        | ≈ 70                       |
| 8     | Garrison Captain              | Lancer           | ≈ 90                       |
| 9     | The Ambush Pair (two enemies) | Ambusher ×2      | ≈ 100 together             |
| 10    | Wellspring Warden             | pierce (own art) | ≈ 160                      |

The Sump Warden is worth reading: at entry stats it costs about 170, on the route with both required chests about 45. It is the Floor 6 version of "the chest changes the fight". Exact boss stats are set in the plan against the route pin; only the costs above are fixed here.

## Combat additions

The whole engine change. `EnemyEntity` gains an optional closed `trait`:

```ts
type EnemyTrait = 'first-strike' | 'double-strike' | 'pierce';
```

| Trait         | Rule                                                      | Preview HP loss                                      |
| ------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| (none)        | hero swings first; no answer to the killing blow          | `(hits / heroHit − 1) × enemyHit × dmg`              |
| first-strike  | the enemy takes one opening swing before the hero's first | `(hits / heroHit) × enemyHit × dmg`                  |
| double-strike | each answer is two swings, each rolled on its own         | `(hits / heroHit − 1) × 2 × enemyHit × dmg`          |
| pierce        | damage uses half the hero's DEF, rounded down             | `dmg = max(0, ATK − ⌊DEF / 2⌋)`, otherwise unchanged |

Where `dmg = max(0, ATK − DEF)` except for pierce. Ravager, Bulwark and Darter need no rule: they are stat profiles of the existing combat.

Consequences worth keeping in view:

- `previewCombat` and `simulateFight` take the enemy entity (stats plus trait), not only its stats; every call site changes. The preview and the played fight must still agree, so extend the existing preview-versus-simulation test to run each trait.
- A first-strike enemy always lands at least one blow, so an Ambusher is never a free kill.
- A pierce enemy's printed ATK can sit below the hero's DEF. The encounter card already shows the real expected loss, which is the point.
- The encounter card gains a trait line and a `data-trait` attribute (so e2e stays off prose); the battle replay already iterates `blows`, so a double-strike round is simply two enemy blows in a row and a first-strike fight begins with one.
- i18n: a `traits` table in all three languages and an `enemies` entry per new art key (`Ravager`, `Bulwark`, `Darter`, `Twinblade`, `Ambusher`, `Lancer`, `Wellspring Warden`).
- Save files and the state model do not change.

## Floor designs

All maps follow the existing contract: ASCII rows of `#` and `.`, entities by tile, validated by `validateContent()`. The sketches below are block diagrams of regions and gates, not tile maps; exact rows are authored in the implementation plan. Sizes are targets in the range of Floors 4–5 (about 280–360 floor tiles).

### Floor 6: The Sump (about 29 × 25)

**Role.** Arrival, the camp, and the bestiary tour. Every one of the six types appears here, and the floor teaches the four stat questions with its own chests.

```text
 Floor 5 sanctum niche
        │  fact-locked hatch
  ┌─────┴──────────────────────────────────────┐
  │ Shaft Foot ── Camp Lanternfall             │  3 shop counters, waystone, field-notes plaque
  └─────┬──────────────────────────────────────┘
        │
   Sump Hall  (open hub, bestiary plaques)
   ┌────┼───────────────────────┐
   │    │                       │
 Pump Row            Settling Channel          Tally Hall
 (west wing)         [Gatekeeper: Bulwark]     (east wing)
 darter swarm        1-wide, no way round      ravager gallery
 ATK chest ◄ ravager                           DEF chest ◄ ravager
 [West Pump Warden]                            [East Pump Warden]
                          │
                    Sump Grate  ── guarded latch: West + East wardens
                          │
                    [Sump Warden]  ── stair ▼ to Floor 7
```

- **Required route:** Camp → both wings (each wing's chest and warden; the grate needs both wardens) → Gatekeeper → Grate → Sump Warden → stair. Twelve fights, the three gate fights included.
- **Gate.** The grate is a guarded latch (`guardIds`: both pump wardens), the same primitive as Floor 5's seal but with two guards, as a gentle first use. The Gatekeeper is a Bulwark standing in a one-tile channel: nothing forces the order, but a hero who walks straight at it pays about 53 HP, while one who first took the west ATK chest pays about 24. The floor teaches "chests change fights" by letting you feel it.
- **Teaching order.** Darter swarm on the first corridor (the AGI tax is visible at once), then the Ravager at the head of Pump Row (ATK gate, solved by the chest it guards), then the Ambusher in an alcove, then the Gatekeeper. Each is preceded by a one-line field note (`clue`) naming the trait.
- **Optional.** Two cache alcoves behind elite Sentinels; one Twinblade and one Lancer on short spurs guarding the extra +1 / +1 chests; three HP caches.
- **Enemies (≈ 26):** Ruin Guard 5, Sentinel 2 (the wardens), Darter 7, Ravager 5, Bulwark 2, Ambusher 2, Twinblade 1, Lancer 1, Sump Warden 1.
- **Gems.** +4 ATK, +4 DEF in total; three of each on the required route.
- **Down stair.** Until Floor 7 ships the stair is a `sealed` entity; it becomes a `portal` in the Floor 7 change (the project's existing practice).

### Floor 7: The Cisterns (about 31 × 27)

**Role.** The lever tour. After a floor of stat checks, a floor of routing.

```text
 Floor 6 stair ▼ ── Intake Gallery (waystone, linkage diagram)
                          │
                  Ring road (clockwise)
     ┌────────────┬───────┴────┬────────────┬────────────┐
 Cistern I    Cistern II   Cistern III   Cistern IV   Cistern V
  [lever 1]    [lever 2]    [lever 3]     [lever 4]    [lever 5]
  twin+amb     twin+amb      darters       twin+amb    lancer+twin
                          │
                    Pumphouse (centre)
                          │
                  Main Sluice ── wired latch: all five levers
                          │
                   [Duelist Prime] ── stair ▼ to Floor 8

 Drowned Vault ── wired latch on levers 1, 2, 3  (off Cistern II)
```

- **Linkage.** Five levers on a ring: each lever drags its two ring neighbours. Pulling all five once is the _only_ way to throw all five, so the Main Sluice is a tour: every cistern's pack must be beaten for its lever.
- **The trick.** The Drowned Vault hatch needs only levers 1, 2 and 3 down. Pulling lever 2 alone throws all three (levers 1 and 4, or 3 and 5, also work). The Intake Gallery diagram shows the ring; a player who reads it opens the vault from the first cistern they clear. It is an optional discovery, not a gate.
- **Enemies (≈ 27):** Twinblade 7, Ambusher 7, Darter 4, Ravager 3, Bulwark 2, Lancer 2, Sentinel 1 (vault keeper), Duelist Prime 1. The Twinblade and Ambusher packs are the floor's flavour: every cistern is a mixed trait check at DEF.
- **Gems.** +5 / +5; required: DEF at Cistern III, ATK at Cistern I.
- **Shortcut.** A rear stair, reached after the Main Sluice from the west side of the Pumphouse, climbs to Floor 6 behind a rear latch (see links), so Camp Lanternfall is two hops from the sluice.

### Floor 8: The Garrison (about 31 × 31)

**Role.** The attrition floor: the heaviest fights per step, one gate type, a camp in the middle.

```text
              Captain's Keep  ◄── Keep Gate (guard: W sergeant)
              [Captain + Seal chest]       │
                                           │
 West Barracks ◄── West Gate ◄─┐           │
 [W sgt: Ambusher] (guard: N)  │           │
                               │     PARADE GROUND ──► North Gate ──► North Barracks
                               │     Camp Deepwatch    (guard: E)     [N sgt: Twinblade]
 East Barracks ◄── East Gate ◄─┘     waystone, stair
 [E sgt: Lancer]   (guard: S)        arrival from Floor 7
                                           │
                                           └──► South Barracks (open)
                                                [S sgt: Bulwark]
```

- **The relay.** Four barracks, four sergeants (elite versions of a type), all off the Parade Ground. The South Barracks is open. Every other barracks' gate is a guarded latch whose guard is the _previous_ barracks' sergeant: S → East Gate → E → North Gate → N → West Gate → W → Keep Gate. The order is forced, each step is one elite fight followed by a walk back past the camp, and the sergeants teach one trait each (Bulwark, Lancer, Twinblade, Ambusher).
- **The key.** The Garrison Captain (a Lancer) guards a chest holding `garrison-seal`. The stair to Floor 9 is an `item`-locked portal on it (the same pattern as the Floor 1 sigil), with its locked text as the cue.
- **Camp Deepwatch** (Heartforged gear, a waystone) sits in the Parade Ground, so the player passes it between every barracks.
- **Enemies (≈ 29):** Lancer 6, Bulwark 5, Twinblade 4, Ravager 3, Ambusher 3, Darter 2, Sentinel 1, four sergeants, the Captain.
- **Gems.** +6 / +6, three of each required (the first Bulwark gate is where the floor's first ATK chest pays back).
- **Shortcut.** From Floor 9 a rear stair lands behind a rear latch on the Parade Ground.

### Floor 9: The Pump Hall (about 29 × 29)

**Role.** The engine room. Spatial and logical: a square catwalk ring around a turbine well, a puzzle that rewards reading a diagram, and the Deep's secret.

```text
        Floor 8 stair ▼ ── Catwalk landing (waystone, linkage diagram)
              │
   ┌──────────┴───────────── outer catwalk ─────────────┐
   │   L1        L2         L3                          │
   │                                                    │
   │   Turbine well (solid)        Pressure Door ── wired latch: all six levers
   │                                      │             │
   │   L4        L5         L6        [Ambush Pair] ─ stair ▼ to Floor 10
   └──────────────── inner catwalk ──────────────────────┘

   Reliquary (sealed on every side; entered only from Floor 10's up-stair)
       └─ rear latch onto the outer catwalk: opens from inside, a shortcut F10 → F9
```

- **Linkage.** Six levers with this wiring (a pull flips the lever and the ones it lists): 1 → {4}, 2 → {6}, 3 → {4}, 4 → {1, 3, 5, 6}, 5 → {4}, 6 → {2, 4}. The Pressure Door opens only while all six are down. The _unique_ solution is to pull 1, 2, 3 and 5, once each. The obvious-looking lever 4 (it touches four others) is a trap: it is not in the solution. A clue diagram on the landing shows the wiring. Content tests must prove solvability with the existing lever model.
- **The Reliquary.** A sealed block with the best optional loot on the floor (+3 / +3 and a large HP cache) held by two elite Lancers. It has no door on Floor 9's side. A stair from Floor 10 climbs into it; opening its rear latch from inside creates a shortcut between the two floors. This is the Deep's equivalent of Floor 2's reading room and uses the same cross-floor rule (a `rearSide` must be reachable only through another floor).
- **Enemies (≈ 29):** Ravager 5, Ambusher 5, Twinblade 4, Lancer 4, Bulwark 4, Darter 3, two elite Lancers (Reliquary), the Ambush Pair. The Ambush Pair are two Ambusher entities standing in the stair's two-tile mouth, so both must fall to reach it; no latch is involved.
- **Gems.** +6 / +6; three of each required.

### Floor 10: The Wellspring (about 25 × 25)

**Role.** The finale: a compact ring, two wardens, one last guardian, and the item that ends it.

```text
        Floor 9 stair ▼ ── Last Landing (waystone)
              │
       Outer gauntlet (ring, six types mixed)
        ┌─────┴─────┐
   West Warden   East Warden        (elite Twinblade, elite Ambusher)
        └─────┬─────┘
       Wellspring Door ── guarded latch: both wardens
              │
        Wellspring Chamber:  waystone, [Wellspring Warden], Wellspring Seal chest
              │
        Reliquary stair (up to Floor 9) off the gauntlet, optional
```

- **Required route:** gauntlet (eight fights) → both wardens → door → Wellspring Warden → Seal. The last waystone is before the door and sized for the Warden, as Floor 5's heart waystone is for its guardian.
- **The Wellspring Warden** needs its own art: one new 96×96 sprite and 64×64 bust. It is the one new enemy asset the design requires (open decision).
- **The Seal** is an `item` reward (`wellspring-seal`). Bringing it to the village Warden resolves the Deep lead and sets `main-wellspring-attuned`.
- **Enemies (≈ 22):** Lancer 3, Twinblade 3, Ambusher 3, Bulwark 3, Ravager 3, Darter 2, two wardens, two elite Lancers on the Reliquary stair, the Wellspring Warden.
- **Gems.** +2 / +2 only.
- **No express lift.** The return trip is the shortcut chain below. An express lift to the village would need a second village portal tile (the existing lift sits at the dead end of a one-tile corridor); it is listed as a later option.

## Cross-floor links

| From → to                                    | Kind                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| Floor 5 sanctum niche ↔ Floor 6 Shaft Foot   | portal pair; the Floor 5 end locked on `main-village-restored` |
| Floor 6 → 7, 7 → 8, 9 → 10                   | stairs                                                         |
| Floor 8 → 9                                  | stair locked on item `garrison-seal`                           |
| Floor 7 rear stair ↔ Floor 6 hub             | rear-latch shortcut (the latch opens from the Floor 7 side)    |
| Floor 9 rear stair ↔ Floor 8 Parade Ground   | rear-latch shortcut                                            |
| Floor 10 Reliquary stair ↔ Floor 9 Reliquary | stair; the Reliquary's door is a rear latch                    |

All portals are reciprocal, as the validator requires. The return trip from Floor 10 to the village is: Reliquary stair → Floor 9 shortcut → Floor 8 Parade Ground → … → Floor 6 hub → Shaft Foot → Floor 5 sanctum → lift → village.

**The one Floor 5 edit.** The hatch needs a dead-end tile in the sanctum. The lift run is a straight corridor, so a portal anywhere on it would teleport the hero mid-walk. The plan carves a one-tile niche off the run that opens no new loop and leaves every existing journey step unchanged (re-walk both release journeys afterwards, as the project requires when a map row changes).

## Story, notes and quests

- **Main lead stays `story-complete`.** The Deep is an _epilogue line_, a fifth entry in the journal beside heirloom, route and ledger, shown once `main-village-restored` is known. This keeps the existing e2e assertions on `story-complete` valid. Lead ids: `deep-find-hatch`, `deep-descend`, `deep-reach-wellspring`, `deep-claim-seal`, `deep-return-seal`, `deep-resolved`.
- **The Warden** gets two new lines (`warden-wellspring-lead`, `warden-wellspring-ending`). No new NPCs.
- **The Deep Ledger.** Five clue plaques, one per floor, each with an observation fact (they appear in the Notes tab, so no new lead): the isolation order (6), the cistern logs (7), the garrison's last muster (8), the pump engineer's warning (9), the Wellspring record (10). Together they explain what the Hollow are and why the Warden must be bound, not slain.
- **Field notes.** Six one-line plaques on Floor 6 name the traits in the keepers' voice (e.g. the Ambusher: "it strikes before you can").
- **New facts.** `floor5-deep-hatch-seen`, `floor5-deep-hatch-used`, `floor6-depth-stairs-used`, `floor7-depth-stairs-used`, `floor8-depth-seal-seen`, `floor8-depth-stairs-used`, `floor9-depth-stairs-used`, five ledger-read facts and `main-wellspring-attuned`. Section ids and names are listed in the plan; each new section, clue, item, access line, lead and dialogue line needs text in `en`, `zh-Hant` and `ja` (`messages.test.ts` fails until it has them; native review of the two non-English tables is still pending, as it is for the first story).
- **New items.** `garrison-seal`, `wellspring-seal`, and the six wares above.

## Art and audio

- **Done:** six map sprites and six busts (`2bec23f`). They land with the first content PR that consumes them (Floor 6 uses all six), per the style guide's "no spare art" rule. Add `ASSET_PATHS` and `PORTRAIT_PATHS` keys `enemy-ravager` … `enemy-lancer`.
- **Needed:** one sprite and bust for the Wellspring Warden. The mini-bosses reuse their type's art.
- **Optional later:** a darker dungeon tileset for 8–10; floor-specific SFX cues. Neither blocks anything.

## Testing

- **Unit.** Each trait: the preview's average agrees with a large seeded simulation; first-strike never previews 0 for a hero who one-shots it; pierce at DEF 1 versus 0 and at odd values; double-strike's two rolls are independent. A fresh enemy with no trait behaves exactly as before.
- **Content.** The existing validator plus: every guarded-latch guard exists on the same map; every lever puzzle is solvable and the Floor 7 and 9 solutions are the unique pull sets above; every `rearSide` is unreachable except through another floor; every shop ware's `itemId` has a name; no map exceeds its entity budget.
- **Route pins.** One test per floor in the style of `combat.test.ts`: start from the design-hero entry stats and a documented minimum entry HP, take only the required route, drink each waystone once, and assert every fight is winnable with every enemy blow landing and the hero ends above a set floor.
- **e2e.** A third journey, `deep`, written like the existing two (the entities it bumps, not coordinates), seeded from the explorer journey's final save. Chapters for Floors 7–9 may be `replayOnly` so the browser run stays short; Floors 6 and 10 run in the browser.
- **Existing journeys** must not change except for the one Floor 5 niche.

## Delivery plan

Each step leaves the game playable.

1. **Traits, art, Floor 5 hatch, Floor 6.** `trait` on enemies, the six sprites and busts, the Floor 5 niche and its locked portal, Floor 6 with a sealed down stair, the first Deep lead, Camp Lanternfall.
2. **Floor 7.** The stair becomes a portal; the ring levers; the shortcut.
3. **Floor 8.** The relay, the Seal, Camp Deepwatch.
4. **Floor 9.** The six-lever door, the Reliquary's Floor 9 half.
5. **Floor 10 and the ending.** The finale, the Wellspring Warden art, the Reliquary stair, the Seal lead and Warden lines.

## Open decisions

1. **Who the Deep is for.** Default: the explorer hero, post-story. The alternative is a gentler Floor 6 tuned for a hero with most but not all of the optional chests. The recipe table makes this two numbers; say if you want it.
2. **The three traits.** Confirm them against the enemy-types prototype. Anything different changes the **Combat additions** table and the Twinblade, Ambusher and Lancer rows only.
3. **The final boss's art.** A new sprite and bust (recommended, one image per asset), or a recolour of the Core Guardian.
4. **Hero AGI.** Darter-style enemies make the 50% floor a permanent tax. A boots ware would need `agility` added to `Stat`, the wares, the Trader and the i18n tables; deliberately left out of this design.
5. **The long way home.** Accept the shortcut chain (default) or plan an express lift, which needs a second village portal tile.
6. **Naming.** "The Wellworks", the floor names and "the Hollow" are my words. Change them freely; they live only in the i18n tables.
