import { findItemRewardByItemId } from '../game/content';
import type { GameState } from '../game/types';
import { ASSET_PATHS } from '../phaser/assets';
import { ICONS } from './icons';

type HpLevel = 'high' | 'mid' | 'low';

function hpLevel(hp: number, maxHp: number): HpLevel {
  const ratio = hp / maxHp;
  if (ratio > 0.5) return 'high';
  return ratio > 0.25 ? 'mid' : 'low';
}

// Each data-stat element's text stays exactly "HP x/y", "ATK n" or "DEF n":
// the e2e journeys read the player's stats back from it.
function stat(id: string, label: string, value: string): string {
  return `<span data-stat="${id}"><span class="stat-label">${label}</span> <span class="stat-value">${value}</span></span>`;
}

export function renderStatus(state: GameState): string {
  const { hp, maxHp, attack, defense } = state.player;
  const percent = Math.round((hp / maxHp) * 100);
  return `<section class="panel hud" data-testid="hud" aria-label="Player status">
    <h2 class="panel-title">Hero</h2>
    <div class="hero">
      <div class="portrait"><img src="${ASSET_PATHS['player-south']}" alt="" width="64" height="64"></div>
      <div class="vitals">
        <div class="vital">${ICONS.heart}${stat('hp', 'HP', `${hp}/${maxHp}`)}</div>
        <div class="hp-bar" data-level="${hpLevel(hp, maxHp)}"><span style="width: ${percent}%"></span></div>
      </div>
    </div>
    <div class="stat-tiles">
      <div class="stat-tile" data-tone="attack">${ICONS.sword}${stat('attack', 'ATK', String(attack))}</div>
      <div class="stat-tile" data-tone="defense">${ICONS.shield}${stat('defense', 'DEF', String(defense))}</div>
    </div>
  </section>`;
}

function itemLabel(itemId: string): string {
  const reward = findItemRewardByItemId(itemId);
  return reward?.grant === 'item' ? reward.label : itemId;
}

export function renderItems(state: GameState): string {
  const items = state.itemIds
    .map(
      (id) =>
        `<li data-item="${id}">${ICONS.relic}<span>${itemLabel(id)}</span></li>`,
    )
    .join('');
  return `<section class="panel items" aria-label="Items">
    <h2 class="panel-title">Items</h2>
    ${items ? `<ul>${items}</ul>` : '<p class="panel-empty">Nothing found yet.</p>'}
  </section>`;
}
