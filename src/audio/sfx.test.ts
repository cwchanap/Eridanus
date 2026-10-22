import { afterEach, describe, expect, it, vi } from 'vitest';
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

// Just enough of WebAudio to record what starts when: a synth note as its
// time, a recording as `file@time`.
function fakeAudio(): (number | string)[] {
  const starts: (number | string)[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
  });
  const node = <T extends object>(extra: T) => ({
    ...extra,
    connect: <N>(next: N) => next,
  });
  vi.stubGlobal(
    'AudioContext',
    class {
      currentTime = 0;
      state = 'running';
      destination = node({});
      createGain = () => node({ gain: param() });
      createOscillator = () =>
        node({
          type: 'sine',
          frequency: param(),
          start: (at: number) => starts.push(at),
          stop: () => undefined,
        });
      createBufferSource = () => {
        const source = node({
          buffer: null as string | null,
          start: (at: number) => starts.push(`${source.buffer}@${at}`),
        });
        return source;
      };
      decodeAudioData = (data: string) => Promise.resolve(data);
    },
  );
  return starts;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('schedules a sequence at once and in order', () => {
    const starts = fakeAudio();
    new Sfx(memoryStorage()).play(['hit', 'win']);
    // hit's one note, then win's three, every win note after the gap.
    expect(starts).toHaveLength(4);
    expect(starts[0]).toBe(0);
    expect(starts.slice(1).every((at) => Number(at) >= 0.15)).toBe(true);
  });

  it('plays the placeholder while a recording is still loading', () => {
    const starts = fakeAudio();
    vi.stubGlobal('fetch', () => new Promise(() => undefined));
    new Sfx(memoryStorage(), new Set(['hit', 'win'])).play(['hit', 'win']);
    expect(starts).toHaveLength(4);
    expect(starts.every((at) => typeof at === 'number')).toBe(true);
  });

  it('plays a loaded recording in its place in the sequence', async () => {
    const starts = fakeAudio();
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve({
        ok: url.endsWith('win.wav'),
        arrayBuffer: () => Promise.resolve('win.wav'),
      }),
    );
    const sfx = new Sfx(memoryStorage(), new Set(['hit', 'win']));
    sfx.play(['move']);
    await new Promise((resolve) => setTimeout(resolve));
    starts.length = 0;
    sfx.play(['hit', 'win']);
    // hit's file is missing, so its synth note leads; win's file follows.
    expect(starts).toEqual([0, 'win.wav@0.15']);
  });
});
