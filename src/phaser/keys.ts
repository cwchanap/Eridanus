import type { Direction } from '../game/types';

// Arrow keys and WASD both move. Letters match either case (Caps Lock,
// Shift), but not with Ctrl/Cmd/Alt held, so browser shortcuts like Ctrl+W
// and Cmd+S stay the browser's.
const KEY_DIRECTIONS = new Map<string, Direction>([
  ['ArrowUp', 'north'],
  ['ArrowDown', 'south'],
  ['ArrowLeft', 'west'],
  ['ArrowRight', 'east'],
  ['w', 'north'],
  ['s', 'south'],
  ['a', 'west'],
  ['d', 'east'],
]);

export type KeyPress = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'altKey'
>;

export function keyDirection(event: KeyPress): Direction | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return KEY_DIRECTIONS.get(key);
}

// The digits 1-9 choose the first to ninth offer of a trade prompt; a digit
// with Ctrl/Cmd/Alt held stays the browser's (tab switching).
export function keyChoice(event: KeyPress): number | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  return /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : undefined;
}
