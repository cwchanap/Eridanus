import type { GameState } from '../game/types';
import { pick, type Messages } from '../i18n/messages';
import { PORTRAIT_SIZE, resolvePortraitPath } from '../phaser/assets';
import { ICONS } from './icons';

// In English each data-stat element's text stays exactly "HP n", "ATK n",
// "DEF n" or "Gold n": the e2e journeys read the player's stats back from it.
// The labels come from the message tables, so other languages change them.
function stat(id: string, label: string, value: string): string {
  return `<span data-stat="${id}"><span class="stat-label">${label}</span> <span class="stat-value">${value}</span></span>`;
}

// hpLoss previews an open combat prompt's cost beside HP; 0 shows none.
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
      <div class="portrait"><img src="${resolvePortraitPath('player-south')}" alt="" width="${PORTRAIT_SIZE}" height="${PORTRAIT_SIZE}"></div>
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
    ${renderItems(state, m)}
  </section>`;
}

export function renderItems(state: GameState, m: Messages): string {
  const items = state.itemIds
    .map(
      (id) =>
        `<li data-item="${id}">${ICONS.relic}<span>${pick(m.items, id)}</span></li>`,
    )
    .join('');
  return `<div class="items">
    <h3>${m.ui.items}</h3>
    ${items ? `<ul>${items}</ul>` : `<p class="panel-empty">${m.ui.noItems}</p>`}
  </div>`;
}
