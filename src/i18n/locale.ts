export const LOCALES = ['en', 'zh-Hant', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// Each language names itself, so a player can find theirs in any language.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  'zh-Hant': '繁體中文',
  ja: '日本語',
};

// The picker's button is too small for a full name, so it shows a short one.
export const LOCALE_CODES: Record<Locale, string> = {
  en: 'EN',
  'zh-Hant': '繁',
  ja: '日',
};

export function nextLocale(locale: Locale): Locale {
  return LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length]!;
}

// Like mute, the language is a browser preference with its own key, never
// part of the save.
const LOCALE_KEY = 'eridanus.locale';

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

export function loadLocale(storage: Storage): Locale {
  try {
    const stored = storage.getItem(LOCALE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function saveLocale(storage: Storage, locale: Locale): void {
  try {
    storage.setItem(LOCALE_KEY, locale);
  } catch {
    // Storage may be unavailable; the choice still holds for this page load.
  }
}
