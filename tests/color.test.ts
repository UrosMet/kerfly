import { describe, expect, it } from 'vitest';
import { colorHex, COLOR_KEYS, isColorKey, PALETTE } from '../src/core/palette';
import en from '../src/i18n/en.json';
import sr from '../src/i18n/sr.json';
import { inkFor } from '../src/ui/color';

describe('palette', () => {
  it('has the basic colors, with neutrals first', () => {
    expect(COLOR_KEYS.slice(0, 7)).toEqual(['white', 'cream', 'beige', 'lightgrey', 'grey', 'anthracite', 'black']);
    expect(COLOR_KEYS).toContain('oak');
    expect(COLOR_KEYS).toContain('walnut');
  });

  it('every color has a unique key and a unique #rrggbb', () => {
    expect(new Set(COLOR_KEYS).size).toBe(PALETTE.length);
    expect(new Set(PALETTE.map((c) => c.hex)).size).toBe(PALETTE.length);
    for (const c of PALETTE) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('every color has a name in both languages, and there is a "no color" entry', () => {
    for (const k of COLOR_KEYS) {
      expect(((sr.color.names as Record<string, string>)[k] ?? '').length, `sr ${k}`).toBeGreaterThan(0);
      expect(((en.color.names as Record<string, string>)[k] ?? '').length, `en ${k}`).toBeGreaterThan(0);
    }
    expect(Object.keys(sr.color.names).sort()).toEqual([...COLOR_KEYS].sort());
    expect(sr.color.none).toBe('Bez boje');
    expect(en.color.none).toBe('No color');
  });

  it('isColorKey accepts "" and the keys, nothing else', () => {
    for (const ok of ['', ...COLOR_KEYS]) expect(isColorKey(ok)).toBe(true);
    for (const bad of ['#ffffff', 'purple', 'WHITE', ' white', undefined, null, 5]) expect(isColorKey(bad)).toBe(false);
  });

  it('colorHex maps a key to its color; no color and unknown keys give nothing', () => {
    expect(colorHex('cream')).toBe('#eadcc0');
    expect(colorHex('')).toBeUndefined();
    expect(colorHex(undefined)).toBeUndefined();
    expect(colorHex('purple')).toBeUndefined();
  });
});

describe('inkFor', () => {
  it('is light ink on dark colors and dark ink on light ones', () => {
    for (const k of ['black', 'anthracite', 'walnut', 'brown', 'red', 'blue', 'green']) expect(inkFor(colorHex(k)!), k).toBe('#ffffff');
    for (const k of ['white', 'cream', 'beige', 'lightgrey', 'oak', 'yellow']) expect(inkFor(colorHex(k)!), k).toBe('#2b2218');
  });
});
