import { describe, expect, it } from 'vitest';
import { generateParts, plinthParts } from '../src/core/parts';
import { mod, settings, summary } from './helpers';

describe('generateParts', () => {
  const modules = [mod('base', { id: 'a' }), mod('drawer', { id: 'b', order: 1 }), mod('wall', { id: 'c', row: 'upper' })];

  it('concatenates parts of all modules, each tagged with its moduleId', () => {
    const parts = generateParts(modules, settings);
    const own = (id: string) => parts.filter((p) => p.moduleId === id);
    expect(own('a').some((p) => p.nameKey === 'part.shelf')).toBe(true);
    expect(own('b').some((p) => p.nameKey === 'part.drawerFront')).toBe(true);
    expect(own('c').some((p) => p.nameKey === 'part.bottomTop')).toBe(true);
    expect(own('c').some((p) => p.nameKey === 'part.rail')).toBe(false);
  });

  it('includes plinth for the lower row only (600 + 600 = 1200, wall excluded)', () => {
    const s = summary(generateParts(modules, settings));
    expect(s['plinth 1200x100']).toBe(1);
  });

  it('empty project -> no parts', () => {
    expect(generateParts([], settings)).toEqual([]);
  });
});

describe('plinthParts', () => {
  const row = (n: number) => Array.from({ length: n }, (_, i) => mod('base', { id: `m${i}`, order: i }));

  it('splits into pieces of max sheet.length - 2*trim (2780)', () => {
    // 10 x 600 = 6000 = 2 x 2780 + 440
    expect(summary(plinthParts(row(10), settings))).toEqual({ 'plinth 2780x100': 2, 'plinth 440x100': 1 });
  });

  it('exact multiple leaves no remainder piece', () => {
    expect(plinthParts([mod('base', { W: 2780 })], settings)).toMatchObject([{ L: 2780, qty: 1 }]);
  });

  it('pvc and none produce no board parts', () => {
    expect(plinthParts(row(3), { ...settings, plinth: 'pvc' })).toEqual([]);
    expect(plinthParts(row(3), { ...settings, plinth: 'none' })).toEqual([]);
  });

  it('uses plinthHeight and sheet from settings', () => {
    const p = plinthParts(row(3), { ...settings, plinthHeight: 150, sheet: { length: 2440, width: 1220 } });
    expect(p).toMatchObject([{ L: 1800, Wd: 150, qty: 1 }]);
  });
});
