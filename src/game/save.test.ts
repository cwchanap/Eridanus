import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialGameState } from './state';
import { loadGame, resetGame, saveGame } from './save';

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
    const moved = { ...createInitialGameState(), tile: { x: 3, y: 5 } };
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
        tile: { x: 13, y: 8 },
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
      tile: { x: 13, y: 8 },
      openedRewardIds: ['floor1-power-core'],
    };
    storage.setItem('eridanus.save', JSON.stringify(state));
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it('round-trips a coherent late-game journey', () => {
    const state = {
      ...createInitialGameState(),
      mapId: 'floor1' as const,
      tile: { x: 14, y: 10 },
      player: { hp: 12, maxHp: 30, attack: 12, defense: 2 },
      openedRewardIds: ['floor1-depth-sigil', 'floor1-power-core'],
      defeatedEnemyIds: ['floor1-west-sentry', 'floor1-gatekeeper'],
      openedShortcutIds: ['floor1-rear-latch'],
      itemIds: ['tower-depth-sigil'],
      factIds: [
        'main-missing-person-lead',
        'village-tower-stairs-used',
        'floor1-treasury-seen',
        'floor1-depth-stairs-used',
        'floor1-rear-stairs-used',
      ],
      discoveredSectionIds: [
        'village-square',
        'village-north-path',
        'floor1-entry-court',
        'floor1-lower-loop',
        'floor1-upper-gallery',
        'floor2-front-landing',
        'floor1-rear-wing',
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
        tile: { x: 15, y: 10 },
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
        tile: { x: 15, y: 10 },
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
        tile: { x: 11, y: 8 },
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
        tile: { x: 11, y: 8 },
        openedShortcutIds: ['floor1-rear-latch'],
      }),
    );
    expect(loadGame(storage).kind).toBe('loaded');
  });

  it('rejects a save standing on a clue tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor1',
        tile: { x: 9, y: 4 },
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
  });

  it('rejects a save standing on a recovery tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        tile: { x: 2, y: 2 },
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
        tile: { x: 3, y: 7 },
      }),
    );
    expect(loadGame(storage)).toEqual({
      kind: 'invalid',
      reason: 'invalid-content',
    });
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
