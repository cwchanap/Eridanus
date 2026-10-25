import { beforeEach, describe, expect, it } from 'vitest';
import { findEntityById } from './content';
import { createInitialGameState } from './state';
import { loadGame, resetGame, saveGame } from './save';
import type { Tile } from './types';

const tileOf = (id: string): Tile => {
  const found = findEntityById(id);
  if (!found) throw new Error(`missing entity: ${id}`);
  return found.tile;
};

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  get length(): number {
    return this.map.size;
  }
}

class ThrowingStorage implements Storage {
  getItem(): string | null {
    throw new Error('storage unavailable');
  }
  setItem(): void {
    throw new Error('storage unavailable');
  }
  removeItem(): void {
    throw new Error('storage unavailable');
  }
  clear(): void {
    throw new Error('storage unavailable');
  }
  key(): string | null {
    return null;
  }
  get length(): number {
    return 0;
  }
}

let storage: Storage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe('saveGame/loadGame', () => {
  it('starts fresh only when key is missing', () => {
    expect(loadGame(storage)).toEqual({
      kind: 'fresh',
      state: createInitialGameState(),
    });
  });

  it('round-trips ordinary movement position', () => {
    const moved = { ...createInitialGameState(), tile: { x: 14, y: 10 } };
    saveGame(storage, moved);
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state: moved });
  });

  it('rejects malformed JSON', () => {
    storage.setItem('eridanus.save', '{bad');
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'malformed-json',
    });
  });

  it('rejects invalid shape', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        tile: { x: '3', y: 5 },
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-shape',
    });
  });

  it('rejects fractional tile coordinates', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        tile: { x: 5.5, y: 5 },
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-shape',
    });
  });

  it("rejects inherited-key map ids like 'toString'", () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'toString',
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects removed entity ids', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        defeatedEnemyIds: ['removed-enemy'],
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects player standing on an uncollected reward tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor1',
        tile: tileOf('floor1-power-core'),
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('accepts player standing on a collected reward tile', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1',
      tile: tileOf('floor1-power-core'),
      openedRewardIds: ['floor1-power-core'],
    };
    storage.setItem('eridanus.save', JSON.stringify(state));
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it('round-trips a coherent late-game journey', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: tileOf('floor1-gatekeeper'),
      player: { hp: 12, attack: 12, defense: 2, gold: 0 },
      openedRewardIds: [
        'floor1-depth-sigil',
        'floor1-power-core',
        'floor1-future-treasury',
        'floor2-service-store',
      ],
      defeatedEnemyIds: [
        'floor1-west-sentry',
        'floor1-gatekeeper',
        'floor2-east-sentry',
      ],
      openedShortcutIds: [
        'floor1-rear-latch',
        'floor2-west-release',
        'floor2-east-release',
      ],
      itemIds: ['tower-depth-sigil'],
      factIds: [
        'main-missing-person-lead',
        'village-tower-stairs-used',
        'floor1-treasury-seen',
        'floor1-depth-stairs-used',
        'floor1-rear-stairs-used',
        'floor1-treasury-return-used',
        'floor2-paired-release-ledger-read',
        'main-subject-returned',
      ],
      discoveredSectionIds: [
        'village-square',
        'village-tower-road',
        'floor1-entry-court',
        'floor1-west-passages',
        'floor1-upper-gallery',
        'floor2-front-landing',
        'floor1-rear-wing',
        'floor2-central-hall',
        'floor2-west-archive',
        'floor2-east-service',
      ],
    };
    saveGame(storage, state);
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it('rejects unknown fact ids', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        factIds: ['not-a-fact'],
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects unknown item ids', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        itemIds: ['no-such-item'],
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects unknown section ids', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        discoveredSectionIds: ['no-such-section'],
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects a save standing on an undefeated enemy tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor1',
        tile: tileOf('floor1-gatekeeper'),
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('accepts a save standing on a defeated enemy tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor1',
        tile: tileOf('floor1-gatekeeper'),
        defeatedEnemyIds: ['floor1-gatekeeper'],
      }),
    );
    expect(loadGame(storage).kind).toBe('loaded');
  });

  it('rejects a save standing on a closed latch tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor1',
        tile: tileOf('floor1-rear-latch'),
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('accepts a save standing on an opened latch tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor1',
        tile: tileOf('floor1-rear-latch'),
        openedShortcutIds: ['floor1-rear-latch'],
      }),
    );
    expect(loadGame(storage).kind).toBe('loaded');
  });

  it('keeps thrown levers among the opened shortcuts and nothing else', () => {
    const thrown = {
      ...createInitialGameState(),
      openedShortcutIds: ['floor3-west-lever', 'floor4-gate-lever-2'],
    };
    storage.setItem('eridanus.save', JSON.stringify(thrown));
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state: thrown });
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        openedShortcutIds: ['floor1-gatekeeper'],
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects a save standing on a clue tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor1',
        tile: tileOf('floor1-route-mark'),
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects a save standing on an undrunk waystone', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        tile: { x: 16, y: 8 },
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects a save standing on an npc tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        tile: { x: 15, y: 9 },
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects a save standing on a shop counter or a sealed entrance', () => {
    for (const tile of [
      { x: 11, y: 13 },
      { x: 1, y: 7 },
    ]) {
      storage.setItem(
        'eridanus.save',
        JSON.stringify({ ...createInitialGameState(), tile }),
      );
      expect(loadGame(storage)).toEqual({
        kind: 'invalid',
        reason: 'invalid-content',
      });
    }
  });

  it('round-trips gold and bought wares without a matching reward', () => {
    const state = {
      ...createInitialGameState(),
      player: { hp: 30, attack: 11, defense: 2, gold: 3 },
      itemIds: ['iron-sword', 'vitality-charm'],
    };
    saveGame(storage, state);
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it('round-trips the trades made', () => {
    const state = { ...createInitialGameState(), trades: 3 };
    saveGame(storage, state);
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it.each([undefined, -1, 1.5, '2'])('rejects trades of %s', (trades) => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({ ...createInitialGameState(), trades }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-shape',
    });
  });

  it('rejects a save without gold', () => {
    const player: Record<string, number> = {
      ...createInitialGameState().player,
    };
    delete player['gold'];
    storage.setItem(
      'eridanus.save',
      JSON.stringify({ ...createInitialGameState(), player }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-shape',
    });
  });

  it('rejects a save standing on the missing subject tile before the return fact', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor2',
        tile: tileOf('floor2-missing-subject'),
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('accepts a save standing on the subject tile after the return fact', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor2',
      tile: tileOf('floor2-missing-subject'),
      factIds: ['main-subject-returned'],
    };
    storage.setItem('eridanus.save', JSON.stringify(state));
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it('rejects non-finite player stats', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify(createInitialGameState()).replace('"hp":30', '"hp":1e400'),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-shape',
    });
  });
});

describe('floor five completion occupancy', () => {
  const boss = findEntityById('floor5-core-guardian');
  if (!boss || boss.kind !== 'enemy')
    throw new Error('floor5-core-guardian missing');
  const core = findEntityById('floor5-restoration-core');
  if (!core || core.kind !== 'reward')
    throw new Error('floor5-restoration-core missing');

  const onFloor5 = (tile: Tile) => ({
    ...createInitialGameState(),
    mapId: 'floor5' as const,
    tile,
  });

  it('rejects a save standing on the undefeated guardian', () => {
    storage.setItem('eridanus.save', JSON.stringify(onFloor5(boss.tile)));
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('accepts a save standing on the defeated guardian', () => {
    const state = {
      ...onFloor5(boss.tile),
      defeatedEnemyIds: ['floor5-core-guardian'],
    };
    storage.setItem('eridanus.save', JSON.stringify(state));
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it('rejects a save standing on the unopened restoration core', () => {
    storage.setItem('eridanus.save', JSON.stringify(onFloor5(core.tile)));
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('accepts a save standing on the opened restoration core with the item carried', () => {
    const state = {
      ...onFloor5(core.tile),
      openedRewardIds: ['floor5-restoration-core'],
      itemIds: ['tower-restoration-core'],
    };
    storage.setItem('eridanus.save', JSON.stringify(state));
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });
});

describe('storage failures', () => {
  it('starts fresh when getItem throws', () => {
    expect(loadGame(new ThrowingStorage())).toEqual({
      kind: 'fresh',
      state: createInitialGameState(),
    });
  });

  it('reports failure when setItem throws', () => {
    expect(saveGame(new ThrowingStorage(), createInitialGameState())).toBe(
      false,
    );
  });

  it('returns fresh state when removeItem throws', () => {
    expect(resetGame(new ThrowingStorage())).toEqual(createInitialGameState());
  });
});

describe('resetGame', () => {
  it('removes the key and returns fresh state', () => {
    saveGame(storage, createInitialGameState());
    expect(resetGame(storage)).toEqual(createInitialGameState());
    expect(loadGame(storage).kind).toBe('fresh');
  });
});
