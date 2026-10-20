# Richer Village Design

## Status

Design for expanding the starting village. No Linear ticket (the workspace is at its free-issue limit); the whole change stays on one PR.

## Goal

Hapadona asked for a richer village:

1. a richer layout;
2. more NPCs;
3. a weapon shop, an armor shop, and an item shop;
4. a few entrances to different mazes: one to the existing Floor 1, the others placeholders.

## Scope decisions

- **Shops need a currency.** The game had none, so this adds the smallest gold loop that makes the shops real: enemies drop a fixed amount of gold, and each shop sells a short list of one-time stat upgrades. This lifts the cross-floor slice spec's "no shop" non-goal for this one minimal form; inventory, consumables, equipment slots, and selling stay out.
- **Placeholder mazes are sealed doors.** Each is a walkable-up-to entrance that shows a short "sealed for now" line when bumped and records nothing in the save. When a real maze ships, the entity becomes an ordinary `portal` with a new `MapId`.
- **Healing is unchanged.** The village well stays free and unlimited.

## Layout

The village grows from 14×10 to 24×15, the same width as Floor 1 so its tiles render no smaller than the tower's.

```
     012345678901234567890123
 0   ########################
 1   #######..#######.c######   the tower's foot fills the top centre
 2   #######.k#######..######
 3   ####........>.......####   Tower Road, tower stair at (12,3)
 4   ####....a...........####
 5   ####.###........###.####
 6   ####.###....+...###.####   well (12,6)
 7   ####.......W........####   Warden (11,7)
 8   ####.##....@.r...##.####   start (11,8), returned subject (13,8)
 9   #M...##........s.##...C#   sealed Mine (1,9) and Crypt (22,9)
10   ####G..............E####
11   #......................#   Market Row
12   ####1#######2######3####   Smith, Armorer, Merchant counters
13   ########################
14   ########################
```

`k` scout, `c` child, `a` artisan, `s` scribe, `G` guard, `E` elder. Sections: Village Square (contains the start), Tower Road, Mine Trail, Crypt Lane, Market Row.

Key spots stay off the screen edges the floating HUD covers: the tower stair sits below the location banner, Tower Road stops short of the hero card and journal corners, and the shop counters face the bottom row, which is always clear of the message log.

## Gold

- `PlayerStats` gains `gold` (starts at 0). The hero card shows it as a fourth chip, `data-stat="gold"` with text `Gold n`.
- `EnemyEntity` gains a required `gold`. `resolveCombat` adds it on the win and `enemyDefeated` carries it so the victory line can say how much was found.
- Drops: Floor 1 sentries 8 / 10 / 10, Floor 2 12 / 15, Floor 3 12 / 15, guardian 30 — 82 before the guardian.

## Shops

- New entity kind `shop` (`name`, ordered `wares`). A ware is `{ itemId, label, price, stat, amount }`.
- Owning a ware is having its `itemId` in `itemIds`, so no new save array is needed. The items list labels wares the same way it labels item rewards.
- Bumping a counter offers the first ware not yet owned. It opens a purchase prompt, the same two-phase gate as combat: `PendingInteraction` becomes a union of `combat` and `purchase`, and the input `fight` becomes `confirm` (Enter / Buy) beside `cancel` (Escape / Leave).
- Confirming with too little gold is refused with the new blocked reason `not-enough-gold`, and the prompt stays open. Buying spends the price and adds `amount` to `stat` (a max-HP ware also raises current HP, like a max-HP reward). Once everything is owned, the keeper says they are sold out.
- Stock (150 gold in all, so a full run cannot buy everything):

| Shop     | Wares                                                       |
| -------- | ----------------------------------------------------------- |
| Smith    | Iron Sword +1 ATK (15), Steel Sword +2 ATK (40)             |
| Armorer  | Leather Vest +1 DEF (15), Chain Mail +2 DEF (40)            |
| Merchant | Vitality Charm +5 Max HP (10), Heart Amulet +10 Max HP (30) |

## NPCs

- Three ambient villagers: Elder (by Crypt Lane), Guard (by the Mine Trail), and Child (in the nook east of the tower). Each has one static line, and the Child's line explains gold.
- `NpcEntity.introFactId` becomes optional: ambient villagers carry no lead, so talking to them records nothing and does not retire the how-to-play card.
- New sprites follow the HPA-442 recolor rule: the village guide with a terracotta (Smith), teal (Armorer), gold (Merchant), silver (Elder), or black (Guard) dress, and a pink, smaller Child, still inside one 32×32 cell. `stairs-sealed` is the down-stair darkened with a rust cast.

## Sealed entrances

New entity kind `sealed` (`text`). It blocks like a clue and reuses the `accessLocked` effect, so the message box shows it under the "Sealed" tag. It records no fact.

## Map fit on phones

A wider village on a phone held upright is limited by the window's width, which leaves vertical slack. The camera used to centre the map in the band above the log, which put the top rows under the stacked banner, hero card, and journal. Now the map rests on the log strip and the slack goes to the top, where those panels are. Maps that fill the band, which covers every desktop and short-window case today, render exactly as before.

At 683×325 the location banner still covers the village's top rows, as it already covers every tower floor's. That is a limit of the short-window HUD, not of this map.

## Testing

- Unit: the shop rules (order, prompt, buy, refusal, sold out, session confirm/cancel), sealed entrances and ambient villagers record nothing, gold on victory, saves with gold and bought wares, saves standing on a counter or sealed door are rejected, the gold chip text, distinct art for every villager, and the phone map fit.
- E2E: both release journeys re-walked on the new layout. A new `village.spec.ts` buys from the smith with the keyboard and the mouse, is refused when short, survives a reload, and bumps a sealed entrance without changing the save. The small-window HUD checks now include the gold chip.

## Non-Goals

- New maze maps behind the sealed entrances.
- Selling, consumables, an inventory screen, equipment slots, or price scaling.
- Changes to healing, combat math, or the existing floors' layouts.
- New illustrated art (recolors only).
