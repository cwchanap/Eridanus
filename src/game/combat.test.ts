import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { findEntityById } from './content';
import {
  hitChance,
  previewCombat,
  resolveCombat,
  simulateFight,
} from './combat';
import type { Blow, EnemyEntity, PlayerStats, Rng, Stat } from './types';

const enemy = findEntityById('floor1-gatekeeper');
if (!enemy || enemy.kind !== 'enemy') throw new Error('test enemy missing');

const boss = findEntityById('floor5-core-guardian');
if (!boss || boss.kind !== 'enemy')
  throw new Error('floor5-core-guardian missing');

// Every blow lands, the most any fight can cost the hero. A roll under a
// chance lands, so zero always does.
const hits: Rng = () => 0;
// Plays the given rolls in order, then lands everything.
const rolls =
  (...values: number[]): Rng =>
  () =>
    values.shift() ?? 0;

// The gatekeeper has AGI 2, so a hero at 2 trades blows with it on even terms.
const even = { hp: 30, attack: 10, defense: 2, agility: 2, gold: 0 };

const walkRoute = (route: readonly string[], start: PlayerStats) => {
  let player = start;
  const fights: { id: string; blows: readonly Blow[]; cost: number }[] = [];
  const grants: { id: string; stat: Stat; amount: number }[] = [];
  for (const id of route) {
    const entity = findEntityById(id);
    if (!entity) throw new Error(`${id} is not authored`);
    if (entity.kind === 'reward') {
      if (entity.grant !== 'stat') continue;
      player = {
        ...player,
        [entity.stat]: player[entity.stat] + entity.amount,
      };
      grants.push({ id, stat: entity.stat, amount: entity.amount });
      continue;
    }
    if (entity.kind !== 'enemy') continue;
    const preview = previewCombat(player, entity.stats);
    expect(preview.winnable, id).toBe(true);
    if (!preview.winnable) throw new Error(`${id} is unwinnable`);
    expect(preview.heroHit, id).toBe(1);
    const { blows, won } = simulateFight(player, entity.stats, hits);
    expect(won, id).toBe(true);
    const cost = player.hp - blows[blows.length - 1]!.heroHp;
    player = { ...player, hp: blows[blows.length - 1]!.heroHp };
    fights.push({ id, blows, cost });
  }
  return { player, fights, grants };
};

describe('hit chance', () => {
  it('lands every blow unless the target is quicker', () => {
    expect(hitChance(5, 5)).toBe(1);
    expect(hitChance(8, 5)).toBe(1);
    expect(hitChance(5, 6)).toBe(0.95);
    expect(hitChance(5, 8)).toBe(0.85);
  });

  it('never drops below half', () => {
    expect(hitChance(0, 10)).toBe(0.5);
    expect(hitChance(0, 99)).toBe(0.5);
  });
});

describe('combat', () => {
  it('previews baseline and upgraded HP loss', () => {
    expect(previewCombat(even, enemy.stats)).toEqual({
      winnable: true,
      hitsNeeded: 4,
      hpLoss: 15,
      heroHit: 1,
      enemyHit: 1,
    });
    expect(previewCombat({ ...even, attack: 12 }, enemy.stats)).toEqual({
      winnable: true,
      hitsNeeded: 3,
      hpLoss: 10,
      heroHit: 1,
      enemyHit: 1,
    });
  });

  it('forecasts the average cost when the hero is quicker', () => {
    // At AGI 4 against 2 the enemy lands nine blows in ten: two answers to
    // the hero's first three hits, at 5 damage each.
    expect(
      previewCombat({ ...even, attack: 12, agility: 4 }, enemy.stats),
    ).toEqual({
      winnable: true,
      hitsNeeded: 3,
      hpLoss: 9,
      heroHit: 1,
      enemyHit: 0.9,
    });
  });

  it('forecasts the extra blows a quicker enemy earns', () => {
    // The hero lands 85 swings in 100, so four hits take about 4.7 swings
    // and the enemy answers all but the last.
    const quick = { hp: 20, attack: 7, defense: 4, agility: 8 };
    expect(
      previewCombat({ ...even, hp: 100, agility: 5 }, quick),
    ).toMatchObject({ hitsNeeded: 4, hpLoss: 19, heroHit: 0.85, enemyHit: 1 });
  });

  it('rejects zero player damage before division', () => {
    expect(previewCombat({ ...even, attack: 4 }, enemy.stats)).toEqual({
      winnable: false,
      reason: 'combat-unwinnable',
    });
  });

  it('treats an average loss that reaches zero HP as lethal', () => {
    expect(previewCombat({ ...even, hp: 15 }, enemy.stats)).toEqual({
      winnable: false,
      reason: 'combat-lethal',
    });
  });

  it('previews the floor five boss for a geared-up hero', () => {
    // The guardian is priced for a hero who has cleared most of the tower
    // (about ATK 38, DEF 37). It opens the fight and is slow, landing 85
    // blows in 100: an opening blow and seven answers of 10 average 68.
    expect(
      previewCombat(
        { hp: 300, attack: 38, defense: 37, agility: 5, gold: 0 },
        boss.stats,
      ),
    ).toEqual({
      winnable: true,
      hitsNeeded: 8,
      hpLoss: 68,
      heroHit: 1,
      enemyHit: 0.85,
    });
    // The whole tower's loot (ATK 43, DEF 43) still pays for it.
    expect(
      previewCombat(
        { hp: 300, attack: 43, defense: 43, agility: 5, gold: 0 },
        boss.stats,
      ),
    ).toMatchObject({ hitsNeeded: 5, hpLoss: 17 });
    // At base stats the hero cannot scratch it.
    expect(previewCombat(createInitialGameState().player, boss.stats)).toEqual({
      winnable: false,
      reason: 'combat-unwinnable',
    });
  });

  it('keeps every story enemy no quicker than the hero', () => {
    // The fights the story cannot skip never hinge on a missed swing: the
    // hero lands every blow on them, so the worst they can cost is every
    // enemy blow landing. Whether a hero can afford that is the journeys'
    // business: tests/e2e/cross-floor.spec.ts replays the story on the rules
    // with every enemy blow landing, gearing up between stretches.
    const { agility } = createInitialGameState().player;
    for (const id of [
      'floor1-west-sentry',
      'floor1-sigil-warden',
      'floor2-service-guard',
      'floor2-stack-mite-1',
      'floor2-stack-mite-2',
      'floor2-stack-mite-3',
      'floor1-gallery-sentry',
      'floor1-rear-sentry',
      'floor2-east-sentry',
      'floor2-stair-warden',
      'floor3-east-prowler',
      'floor3-spine-crawler-1',
      'floor3-spine-crawler-2',
      'floor3-archive-guard',
      'floor3-archive-crawler-1',
      'floor3-archive-crawler-2',
      'floor3-archive-sentry',
      'floor3-heart-sentinel',
      'floor4-west-gate-guard',
      'floor4-west-hand-1',
      'floor4-west-hand-2',
      'floor4-west-foreman',
      'floor4-east-gate-guard',
      'floor4-east-hand-1',
      'floor4-east-hand-2',
      'floor4-east-foreman',
      'floor4-forge-warden',
      'floor4-stair-warden',
      'floor5-west-warden',
      'floor5-south-gate-guard',
      'floor5-south-warden',
      'floor5-east-warden',
      'floor5-core-guardian',
    ]) {
      const foe = findEntityById(id);
      if (foe?.kind !== 'enemy') throw new Error(`${id} missing`);
      expect(foe.stats.agility, id).toBeLessThanOrEqual(agility);
    }
  });

  it('keeps the required deep route winnable to the taproot at 4 HP', () => {
    const route = [
      'floor6-inlet-waystone',
      'floor6-inlet-guard',
      'floor6-inlet-east-pad',
      'floor6-settling-guard',
      'floor6-settling-south-pad',
      'floor6-south-ambusher',
      'floor6-south-east-pad',
      'floor6-pump-waystone',
      'floor6-pump-warden',
      'floor6-pump-cache',
      'floor6-pump-west-pad',
      'floor6-south-north-pad',
      'floor6-settling-bulwark',
      'floor6-settling-north-pad',
      'floor6-sluice-waystone',
      'floor6-sluice-guard',
      'floor6-sluice-east-pad',
      'floor6-outflow-sentinel',
      'floor6-to-floor7',
      'floor7-north-west-lever',
      'floor7-wing-guard',
      'floor7-south-east-door-guard',
      'floor7-south-east-lever',
      'floor7-south-east-waystone',
      'floor7-south-east-warden',
      'floor7-south-east-cache',
      'floor7-reliquary-hatch',
      'floor7-to-floor8',
      'floor8-west-waystone',
      'floor8-west-lancer',
      'floor8-stair-guard',
      'floor8-to-landing',
      'floor9-underpass-east',
      'floor8-east-waystone',
      'floor8-gallery-warden',
      'floor8-gallery-cache',
      'floor8-rift-knight',
      'floor8-rift-key',
      'floor8-gallery-guard',
      'floor8-gallery-armory',
      'floor8-bridge-gate',
      'floor8-to-floor9',
      'floor9-top-waystone',
      'floor9-top-warden',
      'floor9-top-cache',
      'floor9-top-ravager',
      'floor9-middle-waystone',
      'floor9-middle-ambusher',
      'floor9-bottom-waystone',
      'floor9-crossways-warden',
      'floor9-to-floor10',
      'floor10-root-waystone',
      'floor10-middle-guard',
      'floor10-middle-cache',
      'floor10-west-ambusher',
      'floor10-west-waystone',
      'floor10-west-warden',
      'floor10-east-lancer',
      'floor10-east-waystone',
      'floor10-east-warden',
      'floor10-heart-hatch',
      'floor10-heart-waystone',
      'floor10-taproot',
    ];
    const { player, fights, grants } = walkRoute(route, {
      hp: 4,
      attack: 43,
      defense: 43,
      agility: 5,
      gold: 134,
    });
    expect(fights.map(({ id }) => id)).toEqual([
      'floor6-inlet-guard',
      'floor6-settling-guard',
      'floor6-south-ambusher',
      'floor6-pump-warden',
      'floor6-settling-bulwark',
      'floor6-sluice-guard',
      'floor6-outflow-sentinel',
      'floor7-wing-guard',
      'floor7-south-east-door-guard',
      'floor7-south-east-warden',
      'floor8-west-lancer',
      'floor8-stair-guard',
      'floor8-gallery-warden',
      'floor8-rift-knight',
      'floor8-gallery-guard',
      'floor9-top-warden',
      'floor9-top-ravager',
      'floor9-middle-ambusher',
      'floor9-crossways-warden',
      'floor10-middle-guard',
      'floor10-west-ambusher',
      'floor10-west-warden',
      'floor10-east-lancer',
      'floor10-east-warden',
      'floor10-taproot',
    ]);
    expect(fights.map(({ cost }) => cost)).toEqual([
      30, 30, 36, 49, 36, 18, 35, 28, 28, 48, 55, 35, 64, 78, 28, 72, 0, 35, 48,
      40, 36, 56, 50, 56, 168,
    ]);
    for (const { id, blows } of fights) {
      const fought = findEntityById(id) as EnemyEntity;
      expect(blows[0]!.by, id).toBe(
        fought.stats.firstStrike ? 'enemy' : 'hero',
      );
      expect(
        blows.every((blow) => blow.hit),
        id,
      ).toBe(true);
    }
    expect(grants.map(({ stat, amount }) => [stat, amount])).toEqual([
      ['hp', 100],
      ['hp', 85],
      ['attack', 2],
      ['hp', 110],
      ['hp', 50],
      ['defense', 2],
      ['hp', 90],
      ['hp', 170],
      ['attack', 2],
      ['defense', 2],
      ['hp', 75],
      ['attack', 2],
      ['hp', 35],
      ['hp', 50],
      ['hp', 80],
      ['defense', 2],
      ['hp', 110],
      ['hp', 60],
      ['hp', 170],
    ]);
    expect(player).toMatchObject({ hp: 30, attack: 49, defense: 49 });
  });

  it('pins the taproot as the authored final boss', () => {
    const taproot = findEntityById('floor10-taproot');
    if (taproot?.kind !== 'enemy') throw new Error('floor10-taproot missing');
    expect(taproot.stats).toEqual({
      hp: 96,
      attack: 59,
      defense: 41,
      agility: 3,
      firstStrike: true,
      pierce: 4,
    });
    expect(taproot.gold).toBe(60);
  });

  it('walls a floor-five-clear hero out of the deep floors', () => {
    const spent = { hp: 4, attack: 16, defense: 6, agility: 5, gold: 0 };
    for (const id of [
      'floor6-inlet-mite',
      'floor6-inlet-guard',
      'floor6-inlet-darter',
    ]) {
      const gate = findEntityById(id);
      if (gate?.kind !== 'enemy') throw new Error(`${id} missing`);
      expect(previewCombat(spent, gate.stats), id).toEqual({
        winnable: false,
        reason: 'combat-unwinnable',
      });
    }
  });

  it('resolution commits the blows it played', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      player: { hp: 30, attack: 12, defense: 2, agility: 5, gold: 0 },
    };
    const result = resolveCombat(state, enemy, hits);
    const { blows } = simulateFight(state.player, enemy.stats, hits);
    expect(result).toEqual({
      ok: true,
      state: {
        ...state,
        player: { ...state.player, hp: 20, gold: 8 },
        defeatedEnemyIds: ['floor1-gatekeeper'],
      },
      effect: {
        kind: 'enemyDefeated',
        enemyId: 'floor1-gatekeeper',
        hpLost: 10,
        gold: 8,
        blows,
      },
    });
  });

  it('plays a fight blow by blow, hero first, until the enemy falls', () => {
    const player = { hp: 30, attack: 10, defense: 2, agility: 5, gold: 0 };
    const stats = { hp: 25, attack: 7, defense: 3, agility: 5 };
    const { blows, won } = simulateFight(player, stats, hits);
    expect(won).toBe(true);
    expect(blows).toEqual([
      { by: 'hero', hit: true, damage: 7, heroHp: 30, enemyHp: 18 },
      { by: 'enemy', hit: true, damage: 5, heroHp: 25, enemyHp: 18 },
      { by: 'hero', hit: true, damage: 7, heroHp: 25, enemyHp: 11 },
      { by: 'enemy', hit: true, damage: 5, heroHp: 20, enemyHp: 11 },
      { by: 'hero', hit: true, damage: 7, heroHp: 20, enemyHp: 4 },
      { by: 'enemy', hit: true, damage: 5, heroHp: 15, enemyHp: 4 },
      { by: 'hero', hit: true, damage: 7, heroHp: 15, enemyHp: 0 },
    ]);
  });

  it('lets a blow miss without costing anything', () => {
    // The gatekeeper (AGI 3) lands 90 blows in 100 against this hero (AGI 5),
    // so a roll of .95 misses for it; the hero lands every roll.
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      player: { hp: 30, attack: 12, defense: 2, agility: 5, gold: 0 },
    };
    const result = resolveCombat(state, enemy, rolls(0, 0.95, 0, 0.95, 0));
    expect(result.ok && result.state.player.hp).toBe(30);
    if (!result.ok || result.effect.kind !== 'enemyDefeated')
      throw new Error('expected a win');
    expect(result.effect.hpLost).toBe(0);
    expect(result.effect.blows.map((blow) => [blow.by, blow.hit])).toEqual([
      ['hero', true],
      ['enemy', false],
      ['hero', true],
      ['enemy', false],
      ['hero', true],
    ]);
    expect(result.effect.blows[1]).toMatchObject({ damage: 0, heroHp: 30 });
  });

  it('gives a hero who misses more enemy swings', () => {
    const quick = { hp: 12, attack: 7, defense: 1, agility: 8 };
    const hero = { hp: 30, attack: 10, defense: 2, agility: 5, gold: 0 };
    // Two hits kill it (9 damage each); the hero lands 85 in 100, so .9
    // misses and the enemy answers an extra time.
    const { blows } = simulateFight(hero, quick, rolls(0.9, 0, 0, 0, 0));
    expect(blows.map((blow) => [blow.by, blow.hit])).toEqual([
      ['hero', false],
      ['enemy', true],
      ['hero', true],
      ['enemy', true],
      ['hero', true],
    ]);
    expect(blows[blows.length - 1]).toMatchObject({ heroHp: 20, enemyHp: 0 });
  });

  it('beats the hero back to the village when the rolls go against them', () => {
    // The average loss (9) leaves two HP to spare, but every blow landing
    // costs 10.
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 12, y: 5 },
      player: { hp: 10, attack: 12, defense: 2, agility: 5, gold: 4 },
    };
    const result = resolveCombat(state, enemy, hits);
    expect(result.ok).toBe(true);
    if (!result.ok || result.effect.kind !== 'heroDefeated')
      throw new Error('expected a defeat');
    const home = createInitialGameState();
    expect(result.state).toEqual({
      ...state,
      mapId: home.mapId,
      tile: home.tile,
    });
    expect(result.effect.enemyId).toBe('floor1-gatekeeper');
    expect(result.effect.blows[result.effect.blows.length - 1]).toMatchObject({
      by: 'enemy',
      heroHp: 0,
    });
  });

  it('calls a fight that never ends lost instead of spinning', () => {
    // Its blows do nothing and the hero's never land.
    const harmless = { hp: 10, attack: 1, defense: 0, agility: 9 };
    const hero = { hp: 30, attack: 10, defense: 2, agility: 5, gold: 0 };
    expect(simulateFight(hero, harmless, () => 0.99).won).toBe(false);
  });
});

describe('combat traits', () => {
  const striker = {
    hp: 10,
    attack: 7,
    defense: 0,
    agility: 5,
    firstStrike: true as const,
  };
  const hero = { hp: 30, attack: 20, defense: 0, agility: 5, gold: 0 };
  const twin = {
    hp: 60,
    attack: 6,
    defense: 0,
    agility: 5,
    doubleStrike: true as const,
  };
  const strong = { hp: 100, attack: 20, defense: 0, agility: 5, gold: 0 };

  it('lets a first-strike enemy open even against a one-blow kill', () => {
    const { blows, won } = simulateFight(hero, striker, hits);
    expect(won).toBe(true);
    expect(blows).toEqual([
      { by: 'enemy', hit: true, damage: 7, heroHp: 23, enemyHp: 10 },
      { by: 'hero', hit: true, damage: 20, heroHp: 23, enemyHp: 0 },
    ]);
  });

  it('runs the opening turn once, then resumes hero-first rounds', () => {
    const { blows, won } = simulateFight({ ...hero, attack: 5 }, striker, hits);
    expect(won).toBe(true);
    expect(blows).toEqual([
      { by: 'enemy', hit: true, damage: 7, heroHp: 23, enemyHp: 10 },
      { by: 'hero', hit: true, damage: 5, heroHp: 23, enemyHp: 5 },
      { by: 'enemy', hit: true, damage: 7, heroHp: 16, enemyHp: 5 },
      { by: 'hero', hit: true, damage: 5, heroHp: 16, enemyHp: 0 },
    ]);
  });

  it('loses outright when the opening turn fells the hero', () => {
    const { blows, won } = simulateFight({ ...hero, hp: 7 }, striker, hits);
    expect(won).toBe(false);
    expect(blows).toEqual([
      { by: 'enemy', hit: true, damage: 7, heroHp: 0, enemyHp: 10 },
    ]);
  });

  it('appends a follow-up blow only when the 40% roll procs', () => {
    const noProc = simulateFight(strong, twin, rolls(0, 0, 0.5, 0, 0, 0.5, 0));
    expect(noProc.blows.map((blow) => blow.by)).toEqual([
      'hero',
      'enemy',
      'hero',
      'enemy',
      'hero',
    ]);
    const proc = simulateFight(
      strong,
      twin,
      rolls(0, 0, 0.39, 0, 0, 0, 0.39, 0, 0),
    );
    expect(proc.blows.map((blow) => blow.by)).toEqual([
      'hero',
      'enemy',
      'enemy',
      'hero',
      'enemy',
      'enemy',
      'hero',
    ]);
  });

  it('does not proc at exactly the 40% boundary', () => {
    const { blows } = simulateFight(
      strong,
      twin,
      rolls(0, 0, 0.4, 0, 0, 0.4, 0),
    );
    expect(blows.map((blow) => blow.by)).toEqual([
      'hero',
      'enemy',
      'hero',
      'enemy',
      'hero',
    ]);
  });

  it('gives the follow-up its own hit check, which can miss alone', () => {
    const quick = { hp: 100, attack: 20, defense: 0, agility: 8, gold: 0 };
    const { blows } = simulateFight(
      quick,
      twin,
      rolls(0, 0, 0.3, 0.9, 0, 0, 0.5, 0),
    );
    expect(blows.slice(0, 3).map((blow) => [blow.by, blow.hit])).toEqual([
      ['hero', true],
      ['enemy', true],
      ['enemy', false],
    ]);
    expect(blows[2]).toMatchObject({ damage: 0, heroHp: 94 });
  });

  it('still rolls the follow-up check after the first blow misses', () => {
    const quick = { hp: 100, attack: 20, defense: 0, agility: 8, gold: 0 };
    const { blows } = simulateFight(quick, twin, rolls(0, 0.9, 0.3, 0));
    expect(blows.map((blow) => [blow.by, blow.hit])).toEqual([
      ['hero', true],
      ['enemy', false],
      ['enemy', true],
      ['hero', true],
      ['enemy', true],
      ['enemy', true],
      ['hero', true],
    ]);
  });

  it('makes () => 0 the worst case: every follow-up procs and lands', () => {
    const { blows, won } = simulateFight(strong, { ...twin, hp: 30 }, hits);
    expect(won).toBe(true);
    expect(blows).toEqual([
      { by: 'hero', hit: true, damage: 20, heroHp: 100, enemyHp: 10 },
      { by: 'enemy', hit: true, damage: 6, heroHp: 94, enemyHp: 10 },
      { by: 'enemy', hit: true, damage: 6, heroHp: 88, enemyHp: 10 },
      { by: 'hero', hit: true, damage: 20, heroHp: 88, enemyHp: 0 },
    ]);
  });

  it('pierces only up to the hero DEF, never below zero', () => {
    const lancer = { hp: 40, attack: 10, defense: 0, agility: 5, pierce: 4 };
    const low = simulateFight(
      { hp: 100, attack: 10, defense: 3, agility: 5, gold: 0 },
      lancer,
      hits,
    );
    expect(low.blows[1]).toMatchObject({ by: 'enemy', damage: 10, heroHp: 90 });
    const high = simulateFight(
      { hp: 100, attack: 10, defense: 6, agility: 5, gold: 0 },
      lancer,
      hits,
    );
    expect(high.blows[1]).toMatchObject({ by: 'enemy', damage: 8, heroHp: 92 });
  });

  it('combines the taproot traits: an opening pierced turn, then answers', () => {
    const taproot = {
      hp: 96,
      attack: 59,
      defense: 41,
      agility: 3,
      firstStrike: true as const,
      pierce: 4,
    };
    const hero = { hp: 1000, attack: 43, defense: 43, agility: 3, gold: 0 };
    const { blows, won } = simulateFight(hero, taproot, hits);
    expect(won).toBe(true);
    expect(blows[0]).toEqual({
      by: 'enemy',
      hit: true,
      damage: 20,
      heroHp: 980,
      enemyHp: 96,
    });
    expect(blows[1]).toEqual({
      by: 'hero',
      hit: true,
      damage: 2,
      heroHp: 980,
      enemyHp: 94,
    });
    expect(blows).toHaveLength(96);
    expect(blows[95]).toEqual({
      by: 'hero',
      hit: true,
      damage: 2,
      heroHp: 40,
      enemyHp: 0,
    });
  });

  it('folds opening turns, follow-ups and pierce into the preview', () => {
    const hero = { hp: 100, attack: 12, defense: 4, agility: 5, gold: 0 };
    const base = { hp: 30, attack: 12, defense: 2, agility: 5 };
    expect(previewCombat(hero, base)).toEqual({
      winnable: true,
      hitsNeeded: 3,
      hpLoss: 16,
      heroHit: 1,
      enemyHit: 1,
    });
    expect(previewCombat(hero, { ...base, firstStrike: true })).toMatchObject({
      hpLoss: 24,
    });
    expect(previewCombat(hero, { ...base, doubleStrike: true })).toMatchObject({
      hpLoss: 22,
    });
    expect(previewCombat(hero, { ...base, pierce: 2 })).toMatchObject({
      hpLoss: 20,
    });
    expect(previewCombat(hero, { ...base, pierce: 9 })).toMatchObject({
      hpLoss: 24,
    });
    expect(
      previewCombat(hero, {
        ...base,
        firstStrike: true,
        doubleStrike: true,
        pierce: 4,
      }),
    ).toMatchObject({ hpLoss: 50 });
    expect(
      previewCombat({ ...hero, attack: 2 }, { ...base, pierce: 4 }),
    ).toEqual({ winnable: false, reason: 'combat-unwinnable' });
  });

  it('gates a traited forecast lethal where the plain one survives', () => {
    const hero = { hp: 20, attack: 12, defense: 4, agility: 5, gold: 0 };
    const base = { hp: 30, attack: 12, defense: 2, agility: 5 };
    expect(previewCombat(hero, base)).toMatchObject({ winnable: true });
    expect(previewCombat(hero, { ...base, firstStrike: true })).toEqual({
      winnable: false,
      reason: 'combat-lethal',
    });
    expect(previewCombat(hero, { ...base, pierce: 4 })).toEqual({
      winnable: false,
      reason: 'combat-lethal',
    });
  });

  it('prices the taproot at 48 expected blows of 20', () => {
    const taproot = {
      hp: 96,
      attack: 59,
      defense: 41,
      agility: 3,
      firstStrike: true as const,
      pierce: 4,
    };
    const hero = { hp: 961, attack: 43, defense: 43, agility: 3, gold: 0 };
    expect(previewCombat(hero, taproot)).toMatchObject({
      winnable: true,
      hitsNeeded: 48,
      hpLoss: 960,
    });
    expect(previewCombat({ ...hero, hp: 960 }, taproot)).toEqual({
      winnable: false,
      reason: 'combat-lethal',
    });
  });

  const stateAt = (player: typeof hero) => ({
    ...createInitialGameState(),
    mapId: 'floor1' as const,
    player,
  });
  const entityWith = (
    id: string,
    stats: EnemyEntity['stats'],
  ): EnemyEntity => ({
    kind: 'enemy',
    id,
    tile: { x: 0, y: 0 },
    stats,
    gold: 4,
  });

  it('commits a first-strike replay through resolveCombat', () => {
    const result = resolveCombat(stateAt(hero), entityWith('a', striker), hits);
    if (!result.ok || result.effect.kind !== 'enemyDefeated')
      throw new Error('expected a win');
    expect(result.effect.blows.map((blow) => blow.by)).toEqual([
      'enemy',
      'hero',
    ]);
    expect(result.effect.hpLost).toBe(7);
    expect(result.state.player).toMatchObject({ hp: 23, gold: 4 });
  });

  it('beats the hero back when the opening blow lands for the worst case', () => {
    const ambusher = entityWith('b', {
      hp: 10,
      attack: 20,
      defense: 0,
      agility: 5,
      firstStrike: true,
    });
    const result = resolveCombat(
      stateAt({ hp: 20, attack: 20, defense: 0, agility: 8, gold: 0 }),
      ambusher,
      hits,
    );
    if (!result.ok || result.effect.kind !== 'heroDefeated')
      throw new Error('expected a defeat');
    expect(result.effect.blows).toEqual([
      { by: 'enemy', hit: true, damage: 20, heroHp: 0, enemyHp: 10 },
    ]);
    const home = createInitialGameState();
    expect(result.state).toMatchObject({ mapId: home.mapId, tile: home.tile });
  });

  it('replays follow-up blows through resolveCombat', () => {
    const result = resolveCombat(
      stateAt({ hp: 100, attack: 10, defense: 0, agility: 5, gold: 0 }),
      entityWith('c', {
        hp: 30,
        attack: 6,
        defense: 0,
        agility: 5,
        doubleStrike: true,
      }),
      hits,
    );
    if (!result.ok || result.effect.kind !== 'enemyDefeated')
      throw new Error('expected a win');
    expect(result.effect.blows.map((blow) => blow.by)).toEqual([
      'hero',
      'enemy',
      'enemy',
      'hero',
      'enemy',
      'enemy',
      'hero',
    ]);
    expect(result.effect.hpLost).toBe(24);
  });

  it('keeps the stored defense when pierce shaves it for a fight', () => {
    const result = resolveCombat(
      stateAt({ hp: 30, attack: 20, defense: 6, agility: 5, gold: 0 }),
      entityWith('d', {
        hp: 25,
        attack: 10,
        defense: 0,
        agility: 5,
        pierce: 4,
      }),
      hits,
    );
    if (!result.ok || result.effect.kind !== 'enemyDefeated')
      throw new Error('expected a win');
    expect(result.effect.hpLost).toBe(8);
    expect(result.state.player).toMatchObject({ hp: 22, defense: 6 });
  });
});
