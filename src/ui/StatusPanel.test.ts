import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/state';
import { MESSAGES } from '../i18n/messages';
import { renderHeroSheet, renderStatus } from './StatusPanel';

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
        player: { hp: 22, attack: 12, defense: 4, agility: 5, gold: 17 },
      },
      m,
    );
    expect(statText(html, 'hp')).toBe('HP 22');
    expect(statText(html, 'attack')).toBe('ATK 12');
    expect(statText(html, 'defense')).toBe('DEF 4');
    expect(statText(html, 'gold')).toBe('Gold 17');
  });

  it('leaves items to the menu', () => {
    const html = renderStatus(
      { ...createInitialGameState(), itemIds: ['iron-sword'] },
      m,
    );
    expect(html).not.toContain('data-item=');
  });

  it('previews a fight cost beside HP without changing the HP text', () => {
    const html = renderStatus(createInitialGameState(), m, 8);
    expect(statText(html, 'hp')).toBe('HP 30');
    expect(html).toContain('−8');
    expect(renderStatus(createInitialGameState(), m)).not.toContain('hp-cost');
  });
});

describe('renderHeroSheet', () => {
  it('shows the stats and equipment without a second set of data-stat', () => {
    const html = renderHeroSheet(
      {
        ...createInitialGameState(),
        player: { hp: 22, attack: 12, defense: 4, agility: 5, gold: 17 },
        itemIds: ['tower-depth-sigil'],
      },
      m,
    );
    expect(html).toContain('<span class="sheet-value">22</span>');
    expect(html).toContain('<span class="sheet-value">17</span>');
    expect(html).toContain(
      `<span class="sheet-label">AGI</span><span class="sheet-value">5</span>`,
    );
    expect(html).toContain('data-testid="equipment"');
    // Carried items belong to the items tab.
    expect(html).not.toContain('data-item=');
    expect(html).not.toContain('data-stat=');
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
    expect(renderHeroSheet(state, MESSAGES['zh-Hant'])).toContain('鐵劍');
  });
});
