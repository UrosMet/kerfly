import { describe, expect, it } from 'vitest';
import { packAll } from '../src/core/packing';
import { generateParts } from '../src/core/parts';
import type { Module } from '../src/core/types';
import { mod, settings } from './helpers';

// 4 base (600) + sink (800) + drawer (600) + 5 wall (600) + 1 tall (600)
const kitchen: Module[] = [
  ...Array.from({ length: 4 }, (_, i) => mod('base', { id: `base${i}`, order: i })),
  mod('sink', { id: 'sink', order: 4 }),
  mod('drawer', { id: 'drawer', order: 5 }),
  ...Array.from({ length: 5 }, (_, i) => mod('wall', { id: `wall${i}`, order: i })),
  mod('tall', { id: 'tall', order: 6 }),
];
const MATERIALS = ['carcass', 'front', 'hdf'] as const;

describe('test kitchen', () => {
  const parts = generateParts(kitchen, settings);
  const packed = packAll(parts, settings);

  it('places every piece of every material', () => {
    for (const m of MATERIALS) {
      const expected = parts.filter((p) => p.material === m).reduce((a, p) => a + p.qty, 0);
      const placed = packed[m].sheets.reduce((a, sh) => a + sh.placements.length, 0);
      expect(placed).toBe(expected);
    }
  });

  it('needs at least the area lower bound of sheets, and no sheet is over 100%', () => {
    for (const m of MATERIALS) {
      const area = parts.filter((p) => p.material === m).reduce((a, p) => a + p.L * p.Wd * p.qty, 0);
      const sheets = packed[m].sheets;
      expect(sheets.length).toBeGreaterThanOrEqual(Math.ceil(area / (2800 * 2070)));
      sheets.forEach((sh) => expect(sh.utilization).toBeLessThanOrEqual(100));
    }
  });

  it.runIf(import.meta.env.VITE_KITCHEN_REPORT)('prints the report', () => {
    for (const m of MATERIALS) {
      const sheets = packed[m].sheets;
      const area = parts.filter((p) => p.material === m).reduce((a, p) => a + p.L * p.Wd * p.qty, 0);
      const list = sheets.map((sh, i) => `#${i + 1} ${sh.utilization.toFixed(1)}%`).join(', ');
      console.log(`${m}: ${sheets.length} sheets, parts area ${(area / 1e6).toFixed(2)} m2 -> ${list}`);
    }
  });
});
