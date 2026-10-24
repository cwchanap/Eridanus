import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  isLocale,
  loadLocale,
  LOCALE_CODES,
  LOCALE_NAMES,
  LOCALES,
  nextLocale,
  saveLocale,
} from './locale';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const brokenStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

describe('locale', () => {
  it('defaults to English', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(loadLocale(memoryStorage())).toBe('en');
  });

  it('names every language in itself', () => {
    expect(Object.keys(LOCALE_NAMES)).toEqual([...LOCALES]);
    expect(Object.keys(LOCALE_CODES)).toEqual([...LOCALES]);
  });

  it('steps through the languages and wraps around', () => {
    expect(nextLocale('en')).toBe('zh-Hant');
    expect(nextLocale('zh-Hant')).toBe('ja');
    expect(nextLocale('ja')).toBe('en');
  });

  it('recognises only supported locales', () => {
    expect(LOCALES.every(isLocale)).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it('remembers the chosen language', () => {
    const storage = memoryStorage();
    saveLocale(storage, 'ja');
    expect(loadLocale(storage)).toBe('ja');
    saveLocale(storage, 'zh-Hant');
    expect(loadLocale(storage)).toBe('zh-Hant');
  });

  it('keeps the language out of the save', () => {
    const storage = memoryStorage();
    saveLocale(storage, 'ja');
    expect(storage.getItem('eridanus.save')).toBeNull();
  });

  it('falls back to English for an unknown stored value', () => {
    expect(loadLocale(memoryStorage({ 'eridanus.locale': 'fr' }))).toBe('en');
  });

  it('survives storage that throws', () => {
    expect(loadLocale(brokenStorage)).toBe('en');
    expect(() => saveLocale(brokenStorage, 'ja')).not.toThrow();
  });
});
