import { findShopWareByItemId } from './content';
import type { EquipSlot, ShopWare } from './types';

export const EQUIP_SLOTS = [
  'weapon',
  'armor',
  'accessory',
] as const satisfies readonly EquipSlot[];

export type Equipment = Readonly<Partial<Record<EquipSlot, ShopWare>>>;

// A ware is worn the moment it is bought, in place of the one worn in its
// slot, so the gear on is the last ware bought for each slot. Owned wares
// are already in itemIds, in purchase order, so no extra state is saved.
export function equippedWares(itemIds: readonly string[]): Equipment {
  const worn: Partial<Record<EquipSlot, ShopWare>> = {};
  for (const id of itemIds) {
    const ware = findShopWareByItemId(id);
    if (ware) worn[ware.slot] = ware;
  }
  return worn;
}

// Owned wares a later one has replaced in their slot, in purchase order.
export function unequippedWares(
  itemIds: readonly string[],
): readonly ShopWare[] {
  const worn = new Set(
    Object.values(equippedWares(itemIds)).map((ware) => ware.itemId),
  );
  return itemIds.flatMap((id) => {
    const ware = findShopWareByItemId(id);
    return ware && !worn.has(id) ? [ware] : [];
  });
}
