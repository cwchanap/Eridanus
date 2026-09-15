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
        tile: { x: 9, y: 5 },
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
      tile: { x: 9, y: 5 },
      openedRewardIds: ['floor1-power-core'],
    };
    storage.setItem('eridanus.save', JSON.stringify(state));
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it('round-trips every durable field', () => {
    const state = {
      mapId: 'floor1' as const,
      tile: { x: 10, y: 5 },
      player: { hp: 20, maxHp: 30, attack: 12, defense: 2 },
      openedRewardIds: ['floor1-power-core'],
      defeatedEnemyIds: ['floor1-gatekeeper'],
      openedShortcutIds: ['floor1-rear-latch'],
    };
    saveGame(storage, state);
    expect(loadGame(storage)).toEqual({ kind: 'loaded', state });
  });

  it('rejects a save standing on an undefeated enemy tile', () => {
    storage.setItem(
      'eridanus.save',
      JSON.stringify({
        ...createInitialGameState(),
        mapId: 'floor1',
        tile: { x: 11, y: 5 },
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
        tile: { x: 11, y: 5 },
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
        tile: { x: 7, y: 5 },
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
        tile: { x: 7, y: 5 },
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
        tile: { x: 5, y: 4 },
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
});

describe('resetGame', () => {
  it('removes the key and returns fresh state', () => {
    saveGame(storage, createInitialGameState());
    expect(resetGame(storage)).toEqual(createInitialGameState());
    expect(loadGame(storage).kind).toBe('fresh');
  });
});
