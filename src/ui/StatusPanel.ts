import type { GameState } from '../game/types';
import type { Messages } from '../i18n/messages';
import { PORTRAIT_SIZE, resolvePortraitPath } from '../phaser/assets';
import { renderEquipment } from './EquipmentPanel';
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

// The menu's hero tab: the same stats, larger, then the gear worn. The stats
// here carry no data-stat, so the HUD's stay the only ones.
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
    ${renderEquipment(state, m)}
  </div>`;
}
