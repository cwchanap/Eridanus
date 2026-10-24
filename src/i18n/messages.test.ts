import { describe, expect, it } from 'vitest';
import { MAPS } from '../game/content';
import { FACTS, isObservationFact } from '../game/content/facts';
import { createInitialGameState } from '../game/state';
import { resolveEntityAsset } from '../phaser/assets';
import { LOCALES, type Locale } from './locale';
import { MESSAGES, pick, type Messages } from './messages';

const maps = Object.values(MAPS);
const entities = maps.flatMap((map) => map.entities);
const sorted = (ids: Iterable<string>) => [...ids].sort();

// The ids content authors, which the open-ended tables must cover exactly.
const authored = {
  sections: maps.flatMap((map) => map.sections.map(({ id }) => id)),
  npcs: entities.flatMap((e) => (e.kind === 'npc' ? [e.id] : [])),
  shops: entities.flatMap((e) => (e.kind === 'shop' ? [e.id] : [])),
  items: entities.flatMap((e) => {
    if (e.kind === 'reward' && e.grant === 'item') return [e.itemId];
    return e.kind === 'shop' ? e.wares.map((ware) => ware.itemId) : [];
  }),
  clues: entities.flatMap((e) => (e.kind === 'clue' ? [e.id] : [])),
  access: entities.flatMap((e) =>
    e.kind === 'sealed' || (e.kind === 'portal' && e.lock) ? [e.id] : [],
  ),
  notes: Object.keys(FACTS).filter(isObservationFact),
};

const TABLES = Object.keys(authored) as (keyof typeof authored)[];

describe.each(LOCALES)('%s messages', (locale: Locale) => {
  const m = MESSAGES[locale];

  it.each(TABLES)('cover exactly the authored %s', (table) => {
    expect(sorted(Object.keys(m[table]))).toEqual(sorted(authored[table]));
  });

  it('name every enemy by its art', () => {
    const state = createInitialGameState();
    for (const entity of entities) {
      if (entity.kind !== 'enemy') continue;
      const art = resolveEntityAsset(entity, state);
      expect(art && pick(m.enemies, art, ''), entity.id).not.toBe('');
    }
  });

  it('leave no text empty', () => {
    const texts: string[] = [];
    const walk = (value: unknown): void => {
      if (typeof value === 'string') texts.push(value);
      else if (typeof value === 'function')
        texts.push(String((value as (...args: unknown[]) => unknown)(1, 2, 3)));
      else if (typeof value === 'object' && value !== null)
        Object.values(value).forEach(walk);
    };
    walk(m);
    expect(texts.length).toBeGreaterThan(200);
    expect(texts.filter((text) => text.trim() === '')).toEqual([]);
  });
});

describe('English', () => {
  const { ui, effects } = MESSAGES.en;

  // The e2e journeys read these back as written.
  it('keeps the texts the journeys assert on', () => {
    expect(ui.hpLoss(8)).toBe('HP loss: 8');
    expect(MESSAGES.en.statLabels).toMatchObject({
      hp: 'HP',
      attack: 'ATK',
      defense: 'DEF',
      gold: 'Gold',
    });
  });

  it('mentions gold only when a fight drops some', () => {
    expect(effects.victory(5, 0)).not.toContain('Gold');
    expect(effects.victory(5, 3)).toContain('Gold found: 3');
  });
});

describe('CJK languages', () => {
  const CJK = /[぀-ヿ㐀-鿿]/;
  const prose: (keyof Messages)[] = [
    'leads',
    'maps',
    'sections',
    'npcs',
    'shops',
    'items',
    'clues',
    'access',
    'notes',
    'dialogue',
  ];

  it.each(['zh-Hant', 'ja'] as const)(
    '%s translates all authored prose',
    (locale) => {
      const m = MESSAGES[locale];
      for (const table of prose) {
        for (const [id, text] of Object.entries(m[table])) {
          expect(text, `${table}.${id}`).toMatch(CJK);
        }
      }
    },
  );
});

describe('pick', () => {
  it('returns the text for a known id and the fallback otherwise', () => {
    expect(pick({ a: 'A' }, 'a')).toBe('A');
    expect(pick({ a: 'A' }, 'b')).toBe('b');
    expect(pick({ a: 'A' }, 'b', 'none')).toBe('none');
  });
});
