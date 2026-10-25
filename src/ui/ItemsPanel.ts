import { findShopWareByItemId } from '../game/content';
import { unequippedWares } from '../game/equipment';
import type { GameState } from '../game/types';
import { pick, type Messages } from '../i18n/messages';
import { ICONS } from './icons';
import { SLOT_ICONS } from './EquipmentPanel';

// The menu's items tab: the wares a better one has replaced, then the found
// items (a sigil, a core) carried, each group left out while it is empty.
export function renderItems(state: GameState, m: Messages): string {
  const spare = unequippedWares(state.itemIds).map(
    (ware) =>
      `<li data-item="${ware.itemId}" data-tone="${ware.stat}">${SLOT_ICONS[ware.slot]}<span>${pick(m.items, ware.itemId)}</span><span class="item-bonus">${m.statLabels[ware.stat]} +${ware.amount}</span></li>`,
  );
  const key = state.itemIds
    .filter((id) => !findShopWareByItemId(id))
    .map(
      (id) =>
        `<li data-item="${id}">${ICONS.relic}<span>${pick(m.items, id)}</span></li>`,
    );
  const group = (kind: string, title: string, rows: readonly string[]) =>
    rows.length
      ? `<div class="items" data-items="${kind}"><h3>${title}</h3><ul>${rows.join('')}</ul></div>`
      : '';
  return (
    group('unequipped', m.ui.unequipped, spare) +
      group('key', m.ui.keyItems, key) ||
    `<p class="panel-empty">${m.ui.noItems}</p>`
  );
}
