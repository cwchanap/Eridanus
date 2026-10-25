import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/state';
import { MESSAGES } from '../i18n/messages';
import { renderEquipment } from './EquipmentPanel';

const m = MESSAGES.en;

function row(html: string, slot: string): string {
  const match = new RegExp(`<li data-slot="${slot}"[^>]*>.*?</li>`).exec(html);
  if (!match) throw new Error(`no ${slot} row`);
  return match[0];
}

describe('renderEquipment', () => {
  it('shows every slot bare before anything is bought', () => {
    const html = renderEquipment(createInitialGameState(), m);
    for (const slot of ['weapon', 'armor', 'accessory'])
      expect(row(html, slot)).toContain('data-empty="true"');
    expect(html).not.toContain('data-item=');
  });

  it('names the ware worn in each slot with the stat it adds', () => {
    const html = renderEquipment(
      {
        ...createInitialGameState(),
        itemIds: ['iron-sword', 'leather-vest', 'vitality-charm'],
      },
      m,
    );
    expect(row(html, 'weapon')).toContain('Iron Sword');
    expect(row(html, 'weapon')).toContain('ATK +1');
    expect(row(html, 'armor')).toContain('Leather Vest');
    expect(row(html, 'armor')).toContain('DEF +1');
    expect(row(html, 'accessory')).toContain('Vitality Charm');
    expect(row(html, 'accessory')).toContain('HP +5');
  });

  it('shows only the ware that replaced an older one', () => {
    const html = renderEquipment(
      {
        ...createInitialGameState(),
        itemIds: ['iron-sword', 'steel-sword'],
      },
      m,
    );
    expect(row(html, 'weapon')).toContain('Steel Sword');
    expect(row(html, 'weapon')).toContain('ATK +3');
    expect(html).not.toContain('iron-sword');
  });

  it('labels the slots in other languages', () => {
    const html = renderEquipment(createInitialGameState(), MESSAGES.ja);
    expect(row(html, 'weapon')).toContain('武器');
    expect(row(html, 'accessory')).toContain('アクセサリー');
  });
});
