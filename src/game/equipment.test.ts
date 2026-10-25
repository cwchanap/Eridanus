import { describe, expect, it } from 'vitest';
import { MAPS } from './content';
import { EQUIP_SLOTS, equippedWares, unequippedWares } from './equipment';

describe('equippedWares', () => {
  it('is empty before anything is bought', () => {
    expect(equippedWares([])).toEqual({});
  });

  it('wears one ware per slot, the last bought', () => {
    const worn = equippedWares([
      'iron-sword',
      'leather-vest',
      'steel-sword',
      'vitality-charm',
    ]);
    expect(worn.weapon?.itemId).toBe('steel-sword');
    expect(worn.armor?.itemId).toBe('leather-vest');
    expect(worn.accessory?.itemId).toBe('vitality-charm');
  });

  it('ignores found items', () => {
    expect(equippedWares(['tower-depth-sigil', 'iron-sword'])).toEqual({
      weapon: expect.objectContaining({ itemId: 'iron-sword' }),
    });
  });
});

describe('unequippedWares', () => {
  it('lists the wares a later one replaced, in purchase order', () => {
    const spare = unequippedWares([
      'iron-sword',
      'leather-vest',
      'steel-sword',
      'tower-depth-sigil',
      'runed-blade',
    ]);
    expect(spare.map((ware) => ware.itemId)).toEqual([
      'iron-sword',
      'steel-sword',
    ]);
  });

  it('is empty while every ware owned is worn', () => {
    expect(unequippedWares([])).toEqual([]);
    expect(unequippedWares(['iron-sword', 'leather-vest'])).toEqual([]);
  });
});

describe('EQUIP_SLOTS', () => {
  it('covers every slot the wares use', () => {
    const used = new Set(
      Object.values(MAPS)
        .flatMap((map) => map.entities)
        .flatMap((entity) => (entity.kind === 'shop' ? entity.wares : []))
        .map((ware) => ware.slot),
    );
    expect([...used].every((slot) => EQUIP_SLOTS.includes(slot))).toBe(true);
  });
});
