import { describe, expect, it } from 'vitest';
import { generateParts } from '../src/core/parts';
import { validate } from '../src/core/validate';
import en from '../src/i18n/en.json';
import sr from '../src/i18n/sr.json';
import { mod, settings } from './helpers';

const has = (json: object, key: string) =>
  key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), json) !== undefined;

describe('translations cover everything the core emits', () => {
  it('every validation code the rules can emit', () => {
    const bad = [
      mod('base', { id: 'a', W: 100 }), // width
      mod('base', { id: 'b', W: 700 }), // doorTooWide
      mod('tall', { id: 'c', H: 2781, doorSplitH: 5000 }), // partTooLarge, doorSplit
      mod('drawer', { id: 'd', drawers: [100] }), // drawerHeights, drawerBoxTooLow
      mod('drawer', { id: 'e', D: 200 }), // drawerTooShallow
      mod('wall', { id: 'f', D: 900 }), // wallDeeper
    ];
    const codes = new Set(
      [...validate(bad, { ...settings, wallLength: 100 }).errors, ...validate(bad, { ...settings, wallLength: 99999 }).warnings, ...validate(bad, { ...settings, wallLength: 99999 }).errors]
        .concat(validate(bad, { ...settings, wallLength: 100 }).warnings)
        .map((i) => i.code),
    );
    expect([...codes].sort()).toEqual(
      [
        'validation.width', 'validation.doorTooWide', 'validation.partTooLarge', 'validation.rowTooLong', 'validation.rowShort',
        'validation.drawerHeights', 'validation.wallDeeper', 'validation.drawerBoxTooLow', 'validation.drawerTooShallow', 'validation.doorSplit',
      ].sort(),
    );
    for (const c of codes) {
      expect(has(sr, c), `sr ${c}`).toBe(true);
      expect(has(en, c), `en ${c}`).toBe(true);
    }
  });

  it('every part name key and edge type', () => {
    const parts = generateParts(
      [mod('base', { id: 'a' }), mod('drawer', { id: 'b' }), mod('sink', { id: 'c' }), mod('wall', { id: 'd' }), mod('tall', { id: 'e', doorSplitH: 900 })],
      settings,
    );
    const keys = new Set(parts.map((p) => p.nameKey));
    for (const e of ['none', 'thin', 'thick']) keys.add(`edge.${e}`);
    for (const k of keys) {
      expect(has(sr, k), `sr ${k}`).toBe(true);
      expect(has(en, k), `en ${k}`).toBe(true);
    }
    expect(keys.size).toBeGreaterThanOrEqual(12);
  });
});
