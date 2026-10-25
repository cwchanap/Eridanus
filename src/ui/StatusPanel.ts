import { findShopWareByItemId } from '../game/content';
import type { GameState, Stat } from '../game/types';
import { pick, type Messages } from '../i18n/messages';
import { PORTRAIT_SIZE, resolvePortraitPath } from '../phaser/assets';
import { ICONS } from './icons';

// In English each data-stat element's text stays exactly "HP n", "ATK n",
// "DEF n" or "Gold n": the e2e journeys read the player's stats back from it.
// The labels come from the message tables, so other languages change them.
function stat(id: string, label: string, value: string): string {
  return `<span data-stat="${id}"><span class="stat-label">${label}</span> <span class="stat-value">${value}</span></span>`;
}

function heroPortrait(): string {
  return `<div class="portrait"><img src="${resolvePortraitPath('player-south')}" alt="" width="${PORTRAIT_SIZE}" height="${PORTRAIT_SIZE}"></div>`;
}

// The HUD's hero card: the four numbers a fight or a ware changes. Items
// live on the menu's hero sheet. hpLoss previews an open combat prompt's
// cost beside HP; 0 shows none.
export function renderStatus(
  state: GameState,
  m: Messages,
  hpLoss = 0,
): string {
  const { hp, attack, defense, gold } = state.player;
  const costLabel =
    hpLoss > 0 ? ` <span class="hp-cost-label">−${hpLoss}</span>` : '';
  return `<section class="panel hud" data-testid="hud" aria-label="${m.ui.playerStatus}">
    <div class="hero">
      ${heroPortrait()}
      <div class="vitals">
        <div class="vital-row">
          <h2 class="hud-name">${m.ui.hero}</h2>
          <span class="vital">${ICONS.heart}${stat('hp', m.statLabels.hp, String(hp))}${costLabel}</span>
        </div>
        <div class="stat-chips">
          <span class="stat-chip" data-tone="attack">${ICONS.sword}${stat('attack', m.statLabels.attack, String(attack))}</span>
          <span class="stat-chip" data-tone="defense">${ICONS.shield}${stat('defense', m.statLabels.defense, String(defense))}</span>
          <span class="stat-chip" data-tone="gold">${ICONS.coin}${stat('gold', m.statLabels.gold, String(gold))}</span>
        </div>
      </div>
    </div>
  </section>`;
}

// The menu's hero tab: the same stats, larger, and everything carried. A
// ware names the stat it raised; a found item (a sigil, a core) just its
// name. The stats here carry no data-stat, so the HUD's stay the only ones.
export function renderHeroSheet(state: GameState, m: Messages): string {
  const { hp, attack, defense, gold } = state.player;
  const { statLabels: label } = m;
  const row = (tone: string, icon: string, name: string, value: number) =>
    `<li class="sheet-stat" data-tone="${tone}">${icon}<span class="sheet-label">${name}</span><span class="sheet-value">${value}</span></li>`;
  return `<div class="hero-sheet">
    <div class="sheet-head">
      ${heroPortrait()}
      <ul class="sheet-stats">
        ${row('hp', ICONS.heart, label.hp, hp)}
        ${row('attack', ICONS.sword, label.attack, attack)}
        ${row('defense', ICONS.shield, label.defense, defense)}
        ${row('gold', ICONS.coin, label.gold, gold)}
      </ul>
    </div>
    ${renderItems(state, m)}
  </div>`;
}

// Wares are worn the moment they're bought, so every one is equipped and
// names the stat it raised; found items (a sigil, a core) are carried.
export function renderItems(state: GameState, m: Messages): string {
  const equipped: string[] = [];
  const carried: string[] = [];
  for (const id of state.itemIds) {
    const name = `<span>${pick(m.items, id)}</span>`;
    const ware = findShopWareByItemId(id);
    if (ware)
      equipped.push(
        `<li data-item="${id}" data-tone="${ware.stat}">${STAT_ICONS[ware.stat]}${name}<span class="item-bonus">${m.statLabels[ware.stat]} +${ware.amount}</span></li>`,
      );
    else carried.push(`<li data-item="${id}">${ICONS.relic}${name}</li>`);
  }
  const group = (kind: string, title: string, rows: readonly string[]) =>
    rows.length
      ? `<div class="item-group" data-items="${kind}"><h3>${title}</h3><ul>${rows.join('')}</ul></div>`
      : '';
  const groups =
    group('equipped', m.ui.equipped, equipped) +
    group('key', m.ui.keyItems, carried);
  return `<div class="items">
    ${groups || `<h3>${m.ui.items}</h3><p class="panel-empty">${m.ui.noItems}</p>`}
  </div>`;
}

const STAT_ICONS: Readonly<Record<Stat, string>> = {
  attack: ICONS.sword,
  defense: ICONS.shield,
  hp: ICONS.heart,
};
