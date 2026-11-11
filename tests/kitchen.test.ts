import { describe, expect, it } from 'vitest';
import { packBoards } from '../src/core/packing';
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

describe('test kitchen', () => {
  const parts = generateParts(kitchen, settings);
  const packed = packBoards(parts, settings);

  it('uses the three default boards, in order', () => {
    expect(packed.map((b) => b.board.id)).toEqual(['carcass', 'front', 'hdf']);
  });

  it('places every piece of every board', () => {
    for (const { result } of packed) {
      const expected = result.parts.reduce((a, p) => a + p.qty, 0);
      expect(result.sheets.reduce((a, sh) => a + sh.placements.length, 0)).toBe(expected);
    }
    expect(packed.flatMap((b) => b.result.parts)).toHaveLength(parts.length);
  });

  it('needs at least the area lower bound of sheets, and no sheet is over 100%', () => {
    for (const { board, result } of packed) {
      const area = result.parts.reduce((a, p) => a + p.L * p.Wd * p.qty, 0);
      expect(result.sheets.length).toBeGreaterThanOrEqual(Math.ceil(area / (board.sheet.length * board.sheet.width)));
      result.sheets.forEach((sh) => expect(sh.utilization).toBeLessThanOrEqual(100));
    }
  });

  it.runIf(import.meta.env.VITE_KITCHEN_REPORT)('prints the report', () => {
    for (const { board, result } of packed) {
      const area = result.parts.reduce((a, p) => a + p.L * p.Wd * p.qty, 0);
      const list = result.sheets.map((sh, i) => `#${i + 1} ${sh.utilization.toFixed(1)}%`).join(', ');
      console.log(`${board.id}: ${result.sheets.length} sheets, parts area ${(area / 1e6).toFixed(2)} m2 -> ${list}`);
    }
  });
});
