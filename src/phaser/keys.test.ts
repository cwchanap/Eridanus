import { describe, expect, it } from 'vitest';
import { keyDirection } from './keys';

const press = (key: string, mods: Partial<KeyboardEvent> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
});

describe('keyDirection', () => {
  it('maps arrow keys and WASD to the same directions', () => {
    expect(keyDirection(press('ArrowUp'))).toBe('north');
    expect(keyDirection(press('w'))).toBe('north');
    expect(keyDirection(press('ArrowLeft'))).toBe('west');
    expect(keyDirection(press('a'))).toBe('west');
    expect(keyDirection(press('ArrowDown'))).toBe('south');
    expect(keyDirection(press('s'))).toBe('south');
    expect(keyDirection(press('ArrowRight'))).toBe('east');
    expect(keyDirection(press('d'))).toBe('east');
  });

  it('matches capital letters (Caps Lock or Shift)', () => {
    expect(keyDirection(press('W'))).toBe('north');
    expect(keyDirection(press('D', { shiftKey: true }))).toBe('east');
  });

  it('leaves browser shortcuts and other keys alone', () => {
    expect(keyDirection(press('w', { ctrlKey: true }))).toBeUndefined();
    expect(keyDirection(press('s', { metaKey: true }))).toBeUndefined();
    expect(keyDirection(press('a', { altKey: true }))).toBeUndefined();
    expect(keyDirection(press('j'))).toBeUndefined();
    expect(keyDirection(press('m'))).toBeUndefined();
    expect(keyDirection(press('Enter'))).toBeUndefined();
  });
});
