import { EQUIP_SLOTS, equippedWares } from '../game/equipment';
import type { EquipSlot, GameState } from '../game/types';
import { pick, type Messages } from '../i18n/messages';
import { ICONS } from './icons';

export const SLOT_ICONS: Readonly<Record<EquipSlot, string>> = {
  weapon: ICONS.sword,
  armor: ICONS.shield,
  accessory: ICONS.relic,
};

// The menu's gear: one row per slot, naming the ware worn there and the stat
// it adds, or showing the slot bare. A ware tints its row by the stat it
// raises; a replaced ware is gone from the sheet.
export function renderEquipment(state: GameState, m: Messages): string {
  const worn = equippedWares(state.itemIds);
  const rows = EQUIP_SLOTS.map((slot) => {
    const label = `<span class="slot-label">${m.slotLabels[slot]}</span>`;
    const ware = worn[slot];
    if (!ware)
      return `<li data-slot="${slot}" data-empty="true">${SLOT_ICONS[slot]}${label}<span class="slot-name">${m.ui.slotEmpty}</span></li>`;
    return `<li data-slot="${slot}" data-item="${ware.itemId}" data-tone="${ware.stat}">${SLOT_ICONS[slot]}${label}<span class="slot-name">${pick(m.items, ware.itemId)}</span><span class="item-bonus">${m.statLabels[ware.stat]} +${ware.amount}</span></li>`;
  });
  return `<div class="items equipment" data-testid="equipment">
    <h3>${m.ui.equipment}</h3>
    <ul>${rows.join('')}</ul>
  </div>`;
}
