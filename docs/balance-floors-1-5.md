# Floors 1-5 balance

How every enemy and HP reward on floors 1-5 gets its numbers. The stats in
`src/game/content/floor1.ts`–`floor5.ts` are literals, but none of them is
free-hand: each is worked out from the two tables below. To retune a floor,
change a table entry, work the stats out again and regenerate the journeys
(see "After a retune").

## Why it is built this way

Stat chests on floors 1-5 hand out +22 ATK and +30 DEF, and the shops another
+7 / +7. Enemies that are fair at base stats (ATK 10, DEF 2) are harmless a
floor later, because a blow does ATK − DEF damage: once the hero's DEF passes
an enemy's ATK, that enemy can never hurt them again. So enemies are not
priced for the base hero. Each one is priced for the hero who has just
arrived where it stands.

Two things follow:

- **The story needs side loot.** There is no loot-free route to the guardian.
  A player who only follows the main quest runs out of HP and has to go and
  open chests, which is the game.
- **Backtracking is free.** An enemy two zones behind the hero costs nothing.
  That is deliberate: it is the reward for growing.

## Zones

A zone is a stretch of the tower and the ATK / DEF a careful player has on
reaching it (the lower end of what the simulated players arrive with). Its
tier sets how wide the fights are.

| Zone | Where                                     | Hero ATK / DEF | Tier |
| ---- | ----------------------------------------- | -------------- | ---- |
| 1a   | Floor 1, front                            | 10 / 2         | 1    |
| 2a   | Floor 2, service wing                     | 11 / 4         | 2    |
| 1r   | Floor 1, rear wing                        | 12 / 6         | 2    |
| 2b   | Floor 2, hall, archive and stacks         | 12 / 6         | 2    |
| 2c   | Floor 2, the wardens and the brute        | 15 / 8         | 2    |
| 3a   | Floor 3, galleries                        | 17 / 11        | 3    |
| 3b   | Floor 3, walks and archive                | 17 / 14        | 3    |
| 3c   | Floor 3, the three sentries               | 18 / 19        | 3    |
| 4a   | Floor 4, both works wings                 | 23 / 19        | 4    |
| 4c   | Floor 4, foremen, casting floor, flues    | 27 / 24        | 4    |
| 3v   | Floor 3, the vault (reached from Floor 4) | 29 / 25        | 4    |
| 5a   | Floor 5, west and south                   | 31 / 29        | 5    |
| 5b   | Floor 5, ring, east and vaults            | 34 / 31        | 5    |
| 5g   | Floor 5, the core guardian                | 38 / 37        | 5    |
| s4   | Old shaft, Floor 4 block                  | 38 / 38        | 6    |
| s3   | Old shaft, Floor 3 crypt                  | 38 / 40        | 6    |
| s2   | Old shaft, Floor 2 reading room           | 40 / 40        | 6    |

| Tier | m: hero damage per hit on a guard | d: a guard's damage per blow | h: hits a guard takes |
| ---- | --------------------------------- | ---------------------------- | --------------------- |
| 1    | 8                                 | 4                            | 3                     |
| 2    | 9                                 | 6                            | 3                     |
| 3    | 9                                 | 7                            | 3                     |
| 4    | 10                                | 8                            | 3                     |
| 5    | 10                                | 8                            | 3                     |
| 6    | 9                                 | 8                            | 3                     |

The margins are wide on purpose. With the hero doing 8-10 a hit, a +1 ATK
chest shaves a fight by a tenth, not a third, so chests keep mattering without
flattening the floor.

## Types

A type says how the fight plays, as hits (h), hero damage per hit (m) and
enemy damage per blow (d) against the zone's hero, plus AGI and a trait.

| Type      | h     | m     | d     | AGI | Trait         | Sprite                | Plays as                                |
| --------- | ----- | ----- | ----- | --- | ------------- | --------------------- | --------------------------------------- |
| fodder    | 2     | m + 1 | d − 2 | 4   |               | `enemy-ruin-guard`    | cheap, guards small chests              |
| guard     | h     | m     | d     | 3   |               | `enemy-ruin-guard`    | the baseline                            |
| prowler   | h     | m     | d     | 7   |               | `enemy-ruin-guard`    | a guard the hero can miss               |
| elite     | h + 1 | m − 2 | d + 1 | 2   |               | `enemy-ruin-sentinel` | a gate: long and dear                   |
| keeper    | h + 2 | m − 2 | d + 2 | 1   |               | `enemy-ruin-sentinel` | sits on a vault                         |
| boss      | 8     | m − 2 | d + 2 | 2   | first strike  | `enemy-core-guardian` | the core guardian                       |
| ravager   | 2     | 2m    | 2d    | 4   |               | `enemy-ravager`       | glass cannon: DEF chests tame it        |
| bulwark   | 6     | 4     | d − 2 | 1   |               | `enemy-bulwark`       | a wall: ATK chests break it             |
| darter    | 2     | m     | d     | 10  |               | `enemy-darter`        | frail, but the hero misses 1 swing in 4 |
| twinblade | h     | m     | d − 2 | 4   | double strike | `enemy-twinblade`     | swingy: a 40% second blow each turn     |
| ambusher  | h − 1 | m     | d     | 3   | first strike  | `enemy-ambusher`      | always lands one blow before the hero   |
| lancer    | h     | m     | d     | 3   | pierce 4      | `enemy-lancer`        | ignores 4 DEF, so armor counts for less |

From a zone's hero (ATK a, DEF dz) and a type's row:

```
DEF = max(0, a − m)
m'  = a − DEF                        (the damage that really lands)
HP  = h × m' − floor(m' / 3)         (ravager: m' + 2)
ATK = dz + d − min(pierce, dz)
```

The `− floor(m' / 3)` keeps the hit count from tipping over on the last
point of HP.

## Who is what

Values in parentheses are overrides on the type's row.

**1a** (hero 10/2, tier 1)

- guard, HP 22 / ATK 6 / DEF 2 / AGI 3: `floor1-west-sentry`, `floor1-west-lurker`, `floor1-upper-lurker`
- ravager, HP 12 / ATK 10 / DEF 0 / AGI 4: `floor1-den-mite-1`, `floor1-den-mite-2`
- elite, HP 22 / ATK 7 / DEF 4 / AGI 2: `floor1-gatekeeper`
- fodder, HP 15 / ATK 4 / DEF 1 / AGI 4: `floor1-gallery-mite-1`, `floor1-gallery-mite-2`
- prowler, HP 22 / ATK 6 / DEF 2 / AGI 7: `floor1-gallery-prowler`
- bulwark, HP 23 / ATK 4 / DEF 6 / AGI 1: `floor1-sigil-warden`

**1r** (hero 12/6, tier 2)

- guard, HP 24 / ATK 12 / DEF 3 / AGI 3: `floor1-gallery-sentry`, `floor1-rear-lurker`
- elite, HP 26 / ATK 13 / DEF 5 / AGI 2: `floor1-rear-sentry`
- ravager, HP 14 / ATK 18 / DEF 0 / AGI 4: `floor1-rear-mite`
- prowler, HP 24 / ATK 12 / DEF 3 / AGI 7: `floor1-rear-prowler`

**2a** (hero 11/4, tier 2)

- guard, HP 24 / ATK 10 / DEF 2 / AGI 3: `floor2-service-guard`, `floor2-service-lurker`
- fodder, HP 17 / ATK 8 / DEF 1 / AGI 4: `floor2-nook-mite-1`, `floor2-nook-mite-2`, `floor2-stack-mite-1`, `floor2-stack-mite-2`
- darter, HP 15 / ATK 10 / DEF 2 / AGI 10: `floor2-service-prowler`
- twinblade, HP 24 / ATK 8 / DEF 2 / AGI 4, double strike: `floor2-stack-mite-3`
- elite, HP 26 / ATK 11 / DEF 4 / AGI 2: `floor2-east-sentry`

**2c** (hero 15/8, tier 2)

- elite, HP 26 / ATK 15 / DEF 8 / AGI 2: `floor2-hall-sentry`, `floor2-stair-warden`
- bulwark, HP 23 / ATK 12 / DEF 11 / AGI 1: `floor2-archive-brute`

**2b** (hero 12/6, tier 2)

- fodder, HP 17 / ATK 10 / DEF 2 / AGI 4: `floor2-hall-mite-1`, `floor2-hall-mite-2`, `floor2-stack-mite-4`, `floor2-stack-mite-5`
- twinblade, HP 24 / ATK 10 / DEF 3 / AGI 4, double strike: `floor2-hall-lurker`, `floor2-archive-lurker`, `floor2-stack-lurker`
- darter, HP 15 / ATK 12 / DEF 3 / AGI 10: `floor2-archive-prowler`, `floor2-stack-prowler`

**3a** (hero 17/11, tier 3)

- ambusher, HP 15 / ATK 18 / DEF 8 / AGI 3, first strike: `floor3-east-prowler`, `floor3-west-lurker`, `floor3-east-lurker`
- fodder, HP 17 / ATK 16 / DEF 7 / AGI 4: `floor3-spine-crawler-1`, `floor3-spine-crawler-2`, `floor3-gallery-crawler-1`, `floor3-gallery-crawler-2`, `floor3-gallery-crawler-3`, `floor3-gallery-crawler-4`, `floor3-walk-crawler-1`, `floor3-walk-crawler-2`
- darter, HP 15 / ATK 18 / DEF 8 / AGI 10: `floor3-west-prowler`

**3b** (hero 17/14, tier 3)

- elite, HP 26 / ATK 22 / DEF 10 / AGI 2: `floor3-east-warden`
- guard, HP 24 / ATK 21 / DEF 8 / AGI 3: `floor3-archive-guard`
- ambusher, HP 15 / ATK 21 / DEF 8 / AGI 3, first strike: `floor3-walk-lurker`, `floor3-archive-lurker`
- fodder, HP 17 / ATK 19 / DEF 7 / AGI 4: `floor3-archive-crawler-1`, `floor3-archive-crawler-2`, `floor3-gutter-crawler-1`, `floor3-gutter-crawler-2`

**3c** (hero 18/19, tier 3)

- elite, HP 26 / ATK 27 / DEF 11 / AGI 2: `floor3-archive-sentry`, `floor3-approach-sentry`, `floor3-heart-sentinel`

**3v** (hero 29/25, tier 4)

- elite, HP 30 / ATK 34 / DEF 21 / AGI 2: `floor3-vault-sentry`

**4a** (hero 23/19, tier 4)

- guard, HP 27 / ATK 27 / DEF 13 / AGI 3: `floor4-west-gate-guard`, `floor4-east-gate-guard`, `floor4-cellar-lurker`
- ambusher, HP 17 / ATK 27 / DEF 13 / AGI 3, first strike: `floor4-west-lurker`, `floor4-east-lurker`
- darter, HP 17 / ATK 27 / DEF 13 / AGI 10: `floor4-west-prowler`, `floor4-east-prowler`
- fodder, HP 19 / ATK 25 / DEF 12 / AGI 4: `floor4-east-tooth-hand`, `floor4-west-hand-1`, `floor4-east-hand-1`
- bulwark, HP 23 / ATK 25 / DEF 19 / AGI 1: `floor4-west-store-guard`, `floor4-east-store-guard`
- lancer, HP 27 / ATK 23 / DEF 13 / AGI 3, pierce 4: `floor4-west-hand-2`, `floor4-east-hand-2`
- keeper, HP 38 / ATK 29 / DEF 15 / AGI 1: `floor4-forge-keeper`

**4c** (hero 27/24, tier 4)

- elite, HP 30 / ATK 33 / DEF 19 / AGI 2: `floor4-west-foreman`, `floor4-east-foreman`, `floor4-forge-warden`, `floor4-stair-warden`
- lancer, HP 27 / ATK 28 / DEF 17 / AGI 3, pierce 4: `floor4-casting-hand-1`, `floor4-casting-hand-2`
- fodder, HP 19 / ATK 30 / DEF 16 / AGI 4: `floor4-casting-hand-3`, `floor4-west-flue-hand-1`, `floor4-east-flue-hand-1`
- ravager, HP 22 / ATK 40 / DEF 7 / AGI 4: `floor4-west-flue-hand-2`, `floor4-east-flue-hand-2`

**5a** (hero 31/29, tier 5)

- ambusher (h=4), HP 37 / ATK 37 / DEF 21 / AGI 3, first strike: `floor5-west-warden`
- guard, HP 27 / ATK 37 / DEF 21 / AGI 3: `floor5-west-lurker`
- lancer, HP 27 / ATK 33 / DEF 21 / AGI 3, pierce 4: `floor5-south-gate-guard`
- darter, HP 17 / ATK 37 / DEF 21 / AGI 10: `floor5-ring-wisp-1`
- twinblade, HP 27 / ATK 35 / DEF 21 / AGI 4, double strike: `floor5-ring-wisp-2`

**5b** (hero 34/31, tier 5)

- elite, HP 30 / ATK 40 / DEF 26 / AGI 2: `floor5-south-warden`, `floor5-east-warden`
- guard, HP 27 / ATK 39 / DEF 24 / AGI 3: `floor5-east-sentry`, `floor5-east-lurker`, `floor5-inner-lurker`, `floor5-southeast-lurker`
- darter, HP 17 / ATK 39 / DEF 24 / AGI 10: `floor5-ring-wisp-3`, `floor5-ring-wisp-5`, `floor5-ring-wisp-8`
- twinblade, HP 27 / ATK 37 / DEF 24 / AGI 4, double strike: `floor5-ring-wisp-4`, `floor5-ring-wisp-6`, `floor5-ring-wisp-9`
- ravager, HP 22 / ATK 47 / DEF 14 / AGI 4: `floor5-ring-wisp-7`
- keeper, HP 38 / ATK 41 / DEF 26 / AGI 1: `floor5-west-vault-keeper`, `floor5-east-vault-keeper`

**5g** (hero 38/37, tier 5)

- boss, HP 62 / ATK 47 / DEF 30 / AGI 2, first strike: `floor5-core-guardian`

**s4** (hero 38/38, tier 6)

- darter, HP 15 / ATK 46 / DEF 29 / AGI 10: `floor4-slag-wisp-1`, `floor4-slag-wisp-3`
- twinblade, HP 24 / ATK 44 / DEF 29 / AGI 4, double strike: `floor4-slag-wisp-2`
- bulwark, HP 23 / ATK 44 / DEF 34 / AGI 1: `floor4-slag-brute`

**s3** (hero 38/40, tier 6)

- ambusher, HP 15 / ATK 48 / DEF 29 / AGI 3, first strike: `floor3-crypt-shade-1`, `floor3-crypt-shade-3`
- darter, HP 15 / ATK 48 / DEF 29 / AGI 10: `floor3-crypt-shade-2`
- keeper, HP 33 / ATK 50 / DEF 31 / AGI 1: `floor3-crypt-warden`

**s2** (hero 40/40, tier 6)

- twinblade, HP 24 / ATK 46 / DEF 31 / AGI 4, double strike: `floor2-reading-wisp-1`
- lancer, HP 24 / ATK 44 / DEF 31 / AGI 3, pierce 4: `floor2-reading-wisp-2`
- keeper (h=8), HP 54 / ATK 50 / DEF 33 / AGI 1: `floor2-reading-room-warden`

Gold drops, map layouts, ids and the stat chests did not change with this
table; only stats, traits, sprites and HP rewards did.

## HP rewards

HP never refills, so the HP the tower hands out is the budget for every fight
in it: 30 at the start, 900 from waystones, 627 from chests and 35 from the
accessory wares, 1,592 in all. A planner who always takes the cheapest fight
spends about 1,380 of it clearing everything.

- **Waystones** stand on the main route and carry most of the budget, weighted
  toward the early floors, where a careless player has the least room.
  Village 70; Floor 2 service 150; Floor 3 gallery 100, heart 70; Floor 4
  landing 50, east 70, west 70, stair 50; Floor 5 landing 70, ring 90,
  heart 110.
- **HP chests** pay back part of the side fight in front of them: 5-15 on
  Floor 1, 6-15 on Floor 2, 10-18 on Floor 3, 12-25 on Floor 4, 15-40 on
  Floor 5, and 60 for the crypt hoard.

## How it was checked

A simulator played the authored maps on the real rules (`dispatchInput`)
with four kinds of player, with every enemy blow landing and with random
rolls:

- **Planner** (cheapest fight first): clears all 118 fights, two of them
  free, never below 80 HP, and ends on 209. This is the order
  `tests/e2e/full-clear.ts` replays.
- **Forecast reader** (nearest fight that is not much dearer than the
  cheapest): clears everything, never below 69 HP.
- **Careless** (nearest fight unless it costs a third of their HP): finishes
  on ordinary luck in every seeded run; with every blow landing they run dry
  on Floor 5 and have to back off and gear up.
- **Story first** (main quest whenever it is affordable): restores the
  village after about 50-65 side fights.

Before the change the planner cleared the tower for 109 HP with 92 free
fights, and the other players were stuck on Floor 1.

## After a retune

Three things pin these numbers and need redoing when they move:

- `tests/e2e/full-clear.ts`: the full clear's order and the HP it ends on.
- `tests/e2e/gear-up.ts`: the side stretches the two story journeys take.
- `src/game/content.test.ts`: the HP pool, and `combat.test.ts` /
  `actions.test.ts`: the guardian's forecast.

Floors 6-10 start from the full clear's hero (ATK 43, DEF 43, 134 gold) and
were sized for one arriving with 4 HP, so they only get easier when this
table leaves more HP in hand.
