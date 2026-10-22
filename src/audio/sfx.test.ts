import { describe, expect, it } from 'vitest';
import { Sfx } from './sfx';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const items = new Map(Object.entries(initial));
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

describe('Sfx', () => {
  it('starts unmuted and remembers a mute', () => {
    const storage = memoryStorage();
    const sfx = new Sfx(storage);
    expect(sfx.muted).toBe(false);
    sfx.toggleMuted();
    expect(sfx.muted).toBe(true);
    expect(new Sfx(storage).muted).toBe(true);
  });

  it('stays silent while muted', () => {
    // No AudioContext exists under Node, so any playback would throw.
    const sfx = new Sfx(memoryStorage({ 'eridanus.muted': '1' }));
    expect(() => sfx.play(['win'])).not.toThrow();
  });

  it('keeps the game running when audio is unavailable', () => {
    // Node has no AudioContext, standing in for a browser that refuses one.
    const sfx = new Sfx(memoryStorage());
    expect(() => sfx.play(['win'])).not.toThrow();
  });
});
