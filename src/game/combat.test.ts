import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { findEntityById } from './content';
import {
  hitChance,
  previewCombat,
  resolveCombat,
  simulateFight,
} from './combat';
import type { Rng } from './types';

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

// The gatekeeper has AGI 3, so a hero at 3 trades blows with it on even terms.
const even = { hp: 30, attack: 10, defense: 2, agility: 3, gold: 0 };

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
    // At AGI 5 against 3 the enemy lands nine blows in ten: two answers to
    // the hero's first three hits, at 5 damage each.
    expect(
      previewCombat({ ...even, attack: 12, agility: 5 }, enemy.stats),
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

  it('previews the floor five boss on the required route', () => {
    // Base stats plus the chests the required route must open (ATK +6,
    // DEF +4); at bare base stats the guardian is lethal. The guardian is
    // slow, so it lands 85 blows in 100: five answers of 5 damage average 21.
    expect(
      previewCombat(
        { hp: 30, attack: 16, defense: 6, agility: 5, gold: 0 },
        boss.stats,
      ),
    ).toEqual({
      winnable: true,
      hitsNeeded: 6,
      hpLoss: 21,
      heroHit: 1,
      enemyHit: 0.85,
    });
    expect(previewCombat(createInitialGameState().player, boss.stats)).toEqual({
      winnable: false,
      reason: 'combat-lethal',
    });
  });

  it('keeps the required route winnable from floor 1 to the guardian', () => {
    // The required route takes no optional reward and buys nothing; it
    // only opens the chests it must (the power core, the gallery cache, both
    // foremen's chests and the west warden's) and drinks each waystone it
    // passes, once. HP never refills, so each fight must leave the hero
    // standing on what the run has gathered so far. The hero is at least as
    // agile as every enemy on it, so none of their blows miss: the fights
    // below, with every enemy blow landing, are the worst the route can be.
    const route = [
      'floor1-west-sentry',
      'floor1-sigil-warden',
      'village-waystone',
      'floor2-service-guard',
      'floor2-service-waystone',
      'floor2-stack-mite-1',
      'floor2-stack-mite-2',
      'floor2-stack-mite-3',
      'floor1-gallery-sentry',
      'floor1-rear-sentry',
      'floor1-power-core',
      'floor2-east-sentry',
      'floor2-stair-warden',
      'floor3-east-prowler',
      'floor3-spine-crawler-1',
      'floor3-spine-crawler-2',
      'floor3-gallery-cache',
      'floor3-gallery-waystone',
      'floor3-archive-guard',
      'floor3-archive-crawler-1',
      'floor3-archive-crawler-2',
      'floor3-archive-sentry',
      'floor3-heart-waystone',
      'floor3-heart-sentinel',
      'floor4-landing-waystone',
      'floor4-west-gate-guard',
      'floor4-west-waystone',
      'floor4-west-hand-1',
      'floor4-west-hand-2',
      'floor4-west-foreman',
      'floor4-west-works-cache',
      'floor4-east-gate-guard',
      'floor4-east-waystone',
      'floor4-east-hand-1',
      'floor4-east-hand-2',
      'floor4-east-foreman',
      'floor4-east-works-cache',
      'floor4-forge-warden',
      'floor4-stair-waystone',
      'floor4-stair-warden',
      'floor5-landing-waystone',
      'floor5-west-warden',
      'floor5-west-warden-cache',
      'floor5-south-gate-guard',
      'floor5-ring-waystone',
      'floor5-south-warden',
      'floor5-east-warden',
      'floor5-heart-waystone',
      'floor5-core-guardian',
    ];
    let player = createInitialGameState().player;
    for (const step of route) {
      const entity = findEntityById(step);
      if (entity?.kind === 'reward' && entity.grant === 'stat') {
        player = {
          ...player,
          [entity.stat]: player[entity.stat] + entity.amount,
        };
        continue;
      }
      if (entity?.kind !== 'enemy') throw new Error(`${step} is not an enemy`);
      const preview = previewCombat(player, entity.stats);
      expect(preview.winnable, step).toBe(true);
      if (!preview.winnable) return;
      expect(preview.heroHit, step).toBe(1);
      const { blows, won } = simulateFight(player, entity.stats, hits);
      expect(won, step).toBe(true);
      player = { ...player, hp: blows[blows.length - 1]!.heroHp };
    }
    expect(player).toMatchObject({ hp: 4, attack: 16, defense: 6 });
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
