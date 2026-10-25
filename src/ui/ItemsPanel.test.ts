import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/state';
import { MESSAGES } from '../i18n/messages';
import { renderItems } from './ItemsPanel';

const m = MESSAGES.en;

describe('renderItems', () => {
  it('shows an empty state before anything is found or replaced', () => {
    expect(renderItems(createInitialGameState(), m)).toContain('panel-empty');
  });

  it('lists a replaced ware as unequipped, not the one worn', () => {
    const html = renderItems(
      {
        ...createInitialGameState(),
        itemIds: ['iron-sword', 'steel-sword', 'leather-vest'],
      },
      m,
    );
    expect(html).toContain('data-items="unequipped"');
    expect(html).toContain('data-item="iron-sword"');
    expect(html).toContain('Iron Sword');
    expect(html).toContain('ATK +1');
    expect(html).not.toContain('steel-sword');
    expect(html).not.toContain('leather-vest');
    expect(html).not.toContain('panel-empty');
  });

  it('names carried items from the message table', () => {
    const html = renderItems(
      { ...createInitialGameState(), itemIds: ['tower-depth-sigil'] },
      m,
    );
    expect(html).toContain('data-items="key"');
    expect(html).toContain('data-item="tower-depth-sigil"');
    expect(html).toContain('Tower Sigil');
    expect(html).not.toContain('data-items="unequipped"');
  });

  it('puts unequipped wares before key items', () => {
    const html = renderItems(
      {
        ...createInitialGameState(),
        itemIds: ['tower-depth-sigil', 'iron-sword', 'steel-sword'],
      },
      m,
    );
    const spare = html.indexOf('data-items="unequipped"');
    const key = html.indexOf('data-items="key"');
    expect(spare).toBeGreaterThan(-1);
    expect(key).toBeGreaterThan(spare);
  });
});
