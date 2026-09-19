import { MAPS } from './content';
import type { GameState } from './types';

export function recordFact(state: GameState, id: string): GameState {
  if (state.factIds.includes(id)) return state;
  return { ...state, factIds: [...state.factIds, id] };
}

export function recordFacts(
  state: GameState,
  ids: readonly string[],
): GameState {
  return ids.reduce(recordFact, state);
}

export function addItem(state: GameState, id: string): GameState {
  if (state.itemIds.includes(id)) return state;
  return { ...state, itemIds: [...state.itemIds, id] };
}

export function discoverCurrentSection(state: GameState): GameState {
  const sections = MAPS[state.mapId].sections.filter(
    ({ bounds }) =>
      state.tile.x >= bounds.minX &&
      state.tile.x <= bounds.maxX &&
      state.tile.y >= bounds.minY &&
      state.tile.y <= bounds.maxY,
  );

  let next = state;
  for (const section of sections) {
    if (!next.discoveredSectionIds.includes(section.id)) {
      next = {
        ...next,
        discoveredSectionIds: [...next.discoveredSectionIds, section.id],
      };
    }
    next = recordFacts(next, section.factIds ?? []);
  }
  return next;
}
