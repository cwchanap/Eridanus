import { describe, expect, it } from 'vitest';
import {
  addItem,
  discoverCurrentSection,
  recordFact,
  recordFacts,
} from './progress';
import { createInitialGameState } from './state';

describe('progress', () => {
  it('records facts and items once while preserving identity on repeats', () => {
    const start = createInitialGameState();
    const withFact = recordFact(start, 'optional-route-lead');
    expect(withFact.factIds).toEqual(['optional-route-lead']);
    expect(recordFact(withFact, 'optional-route-lead')).toBe(withFact);

    const withItem = addItem(withFact, 'tower-depth-sigil');
    expect(withItem.itemIds).toEqual(['tower-depth-sigil']);
    expect(addItem(withItem, 'tower-depth-sigil')).toBe(withItem);
  });

  it('records several facts in order', () => {
    const next = recordFacts(createInitialGameState(), [
      'optional-route-lead',
      'optional-ledger-lead',
    ]);
    expect(next.factIds).toEqual([
      'optional-route-lead',
      'optional-ledger-lead',
    ]);
  });

  it('discovers the section containing the current tile once', () => {
    const start = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 6, y: 5 },
    };
    const next = discoverCurrentSection(start);
    expect(next.discoveredSectionIds).toEqual([
      'village-square',
      'floor1-upper-gallery',
    ]);
    expect(discoverCurrentSection(next)).toBe(next);
  });
});
