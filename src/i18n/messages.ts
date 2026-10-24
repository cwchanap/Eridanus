import { en, type Messages } from './en';
import { ja } from './ja';
import type { Locale } from './locale';
import { zhHant } from './zh-Hant';

export type { Messages };

export const MESSAGES: Record<Locale, Messages> = {
  en,
  'zh-Hant': zhHant,
  ja,
};

// Looks up the text for an authored id (a section, shop, item, clue...).
// The tables are checked against the content in messages.test.ts, so a miss
// only shows the bare id.
export function pick(
  table: Readonly<Record<string, string>>,
  id: string,
  fallback = id,
): string {
  return table[id] ?? fallback;
}
