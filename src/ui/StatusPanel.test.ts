import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/state';
import { MESSAGES } from '../i18n/messages';
import { renderItems, renderStatus } from './StatusPanel';

// The e2e journeys read stats back as the data-stat element's text.
function statText(html: string, stat: string): string | undefined {
  const match = new RegExp(
    `data-stat="${stat}">((?:<span[^>]*>[^<]*</span>|[^<])*)</span>`,
  ).exec(html);
  return match?.[1]?.replace(/<[^>]+>/g, '');
}

const m = MESSAGES.en;

describe('renderStatus', () => {
  it('keeps each stat readable as "LABEL value" text', () => {
    const html = renderStatus(
      {
        ...createInitialGameState(),
        player: { hp: 22, maxHp: 30, attack: 12, defense: 4, gold: 17 },
      },
      m,
    );
    expect(statText(html, 'hp')).toBe('HP 22/30');
    expect(statText(html, 'attack')).toBe('ATK 12');
    expect(statText(html, 'defense')).toBe('DEF 4');
    expect(statText(html, 'gold')).toBe('Gold 17');
  });

  it('colors the HP bar by how much health is left', () => {
    const at = (hp: number) =>
      renderStatus(
        {
          ...createInitialGameState(),
          player: { hp, maxHp: 40, attack: 10, defense: 2, gold: 0 },
        },
        m,
      );
    expect(at(40)).toContain('data-level="high"');
    expect(at(20)).toContain('data-level="mid"');
    expect(at(10)).toContain('data-level="low"');
  });

  it('previews a fight cost on the bar without changing the HP text', () => {
    const html = renderStatus(createInitialGameState(), m, 8);
    expect(statText(html, 'hp')).toBe('HP 30/30');
    expect(html).toContain('<span class="hp-cost" style="width: 27%">');
    expect(html).toContain('−8');
    expect(renderStatus(createInitialGameState(), m)).not.toContain('hp-cost');
  });
});

describe('renderItems', () => {
  it('shows an empty state before anything is found', () => {
    expect(renderItems(createInitialGameState(), m)).toContain('panel-empty');
  });

  it('names carried items from the message table', () => {
    const html = renderItems(
      {
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil'],
      },
      m,
    );
    expect(html).toContain('data-item="tower-depth-sigil"');
    expect(html).toContain('Tower Sigil');
  });

  it('names bought wares from the message table', () => {
    const html = renderItems(
      {
        ...createInitialGameState(),
        itemIds: ['iron-sword'],
      },
      m,
    );
    expect(html).toContain('data-item="iron-sword"');
    expect(html).toContain('Iron Sword');
  });
});

describe('other languages', () => {
  it('relabel the stats and items without changing their markup', () => {
    const state = {
      ...createInitialGameState(),
      itemIds: ['iron-sword'],
    };
    const html = renderStatus(state, MESSAGES.ja);
    expect(statText(html, 'attack')).toBe('攻撃 10');
    expect(statText(html, 'gold')).toBe('ゴールド 0');
    expect(renderItems(state, MESSAGES['zh-Hant'])).toContain('鐵劍');
  });
});
