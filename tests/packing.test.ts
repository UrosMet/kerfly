import { describe, expect, it } from 'vitest';
import { packBoards, packMaterial, type PackResult } from '../src/core/packing';
import type { Board, Part } from '../src/core/types';
import { settings } from './helpers';

const sheet = settings.sheet; // 2800 x 2070
const { kerf, trim } = settings;
const EPS = 1e-6;

const part = (L: number, Wd: number, qty = 1, material: Part['material'] = 'carcass'): Part => ({
  moduleId: 'x',
  nameKey: 'part.x',
  material,
  L,
  Wd,
  qty,
  edges: { L1: 'none', L2: 'none', W1: 'none', W2: 'none' },
});

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randomParts = (seed: number, n = 40): Part[] => {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => part(50 + Math.floor(r() * 1350), 50 + Math.floor(r() * 950), 1 + Math.floor(r() * 3)));
};

function checkInvariants(res: PackResult, rotate: boolean) {
  for (const sh of res.sheets) {
    for (const p of sh.placements) {
      // inside the sheet, respecting trim
      expect(p.x).toBeGreaterThanOrEqual(trim - EPS);
      expect(p.y).toBeGreaterThanOrEqual(trim - EPS);
      expect(p.x + p.w).toBeLessThanOrEqual(sheet.length - trim + EPS);
      expect(p.y + p.h).toBeLessThanOrEqual(sheet.width - trim + EPS);
      if (!rotate) expect(p.rotated).toBe(false);
      const src = res.parts[p.partRef];
      expect([p.w, p.h]).toEqual(p.rotated ? [src.Wd, src.L] : [src.L, src.Wd]);
    }
    // no pair overlaps, and neighbours are at least one kerf apart
    const ps = sh.placements;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i];
        const b = ps[j];
        const apart =
          a.x + a.w + kerf <= b.x + EPS ||
          b.x + b.w + kerf <= a.x + EPS ||
          a.y + a.h + kerf <= b.y + EPS ||
          b.y + b.h + kerf <= a.y + EPS;
        expect(apart).toBe(true);
      }
    }
  }
  // every input piece placed exactly qty times
  const placed = res.parts.map(() => 0);
  res.sheets.forEach((sh) => sh.placements.forEach((p) => placed[p.partRef]++));
  expect(placed).toEqual(res.parts.map((p) => p.qty));
}

describe('packMaterial', () => {
  it.each([1, 2, 3, 4, 5])('invariants hold with rotation allowed (seed %i)', (seed) => {
    checkInvariants(packMaterial(randomParts(seed), sheet, settings, true), true);
  });

  it.each([1, 2, 3, 4, 5])('grain material is never rotated, invariants hold (seed %i)', (seed) => {
    checkInvariants(packMaterial(randomParts(seed), sheet, settings, false), false);
  });

  it('placed count equals input count', () => {
    const parts = [part(600, 500, 7), part(300, 200, 11)];
    const res = packMaterial(parts, sheet, settings, false);
    expect(res.sheets.flatMap((s) => s.placements)).toHaveLength(18);
  });

  it('part larger than an empty sheet throws', () => {
    expect(() => packMaterial([part(2781, 100)], sheet, settings, true)).toThrow(RangeError); // > 2800 - 2*10
    expect(() => packMaterial([part(100, 2051)], sheet, settings, false)).toThrow(RangeError); // > 2070 - 2*10
    expect(() => packMaterial([part(2790, 2790)], sheet, settings, true)).toThrow(RangeError);
  });

  it('exact fit still works (2780 x 2050)', () => {
    const res = packMaterial([part(2780, 2050)], sheet, settings, false);
    expect(res.sheets).toHaveLength(1);
    expect(res.sheets[0].placements[0]).toMatchObject({ x: 10, y: 10, w: 2780, h: 2050 });
  });

  it('rotation is used only when allowed: 2000 x 2700 needs it', () => {
    expect(packMaterial([part(2000, 2700)], sheet, settings, true).sheets[0].placements[0].rotated).toBe(true);
    expect(() => packMaterial([part(2000, 2700)], sheet, settings, false)).toThrow(RangeError);
  });

  it('known layout: 4 pieces 1380 x 1023 fit one sheet (kerf included), a 5th needs a second', () => {
    expect(packMaterial([part(1380, 1023, 4)], sheet, settings, false).sheets).toHaveLength(1);
    expect(packMaterial([part(1380, 1023, 5)], sheet, settings, false).sheets).toHaveLength(2);
  });

  it('empty input -> no sheets', () => {
    expect(packMaterial([], sheet, settings, true).sheets).toEqual([]);
  });

  it('utilization is covered area / sheet area', () => {
    const res = packMaterial([part(1000, 1000)], sheet, settings, false);
    expect(res.sheets[0].utilization).toBeCloseTo(((1000 * 1000) / (2800 * 2070)) * 100, 10);
  });
});

describe('packBoards', () => {
  const board = (over: Partial<Board> = {}): Board => ({ id: 'x', name: 'Bela', thickness: 19, sheet: { length: 2800, width: 2070 }, grain: false, ...over });
  const on = (p: Part, id: string): Part => ({ ...p, board: id });
  const ids = (parts: Part[], s = settings) => packBoards(parts, s).map((b) => b.board.id);

  it('one group per board, in the order carcass, front, extra boards, hdf; boards without parts are left out', () => {
    const s = { ...settings, boards: [board()] };
    const parts = [part(500, 500, 1, 'hdf'), on(part(500, 500), 'x'), part(500, 500, 1, 'front'), part(500, 500)];
    expect(ids(parts, s)).toEqual(['carcass', 'front', 'x', 'hdf']);
    expect(ids([part(500, 500, 1, 'front')], s)).toEqual(['front']);
    expect(packBoards([], s)).toEqual([]);
  });

  it('parts cut from the same board share its sheets, even carcass and front parts', () => {
    // 2 x 1400x1000 fit one sheet together only if packed together
    const carcass = part(1400, 1000, 1, 'carcass');
    const front = { ...part(1400, 1000, 1, 'front'), board: 'carcass' };
    const r = packBoards([carcass, front], settings);
    expect(r).toHaveLength(1);
    expect(r[0].result.sheets).toHaveLength(1);
    expect(r[0].result.sheets[0].placements).toHaveLength(2);
  });

  it('different boards never share a sheet', () => {
    const s = { ...settings, boards: [board()] };
    const r = packBoards([part(500, 500), on(part(500, 500), 'x')], s);
    expect(r.map((b) => b.result.sheets.length)).toEqual([1, 1]);
  });

  it('a board that no longer exists falls back to the default board of its material', () => {
    expect(ids([on(part(500, 500), 'gone'), on(part(500, 500, 1, 'front'), 'gone')])).toEqual(['carcass', 'front']);
  });

  it('every board has its own sheet size', () => {
    const s = { ...settings, boards: [board({ sheet: { length: 1000, width: 1000 } })] };
    expect(() => packBoards([on(part(1200, 100), 'x')], s)).toThrow(RangeError);
    const r = packBoards([on(part(900, 900), 'x'), part(1200, 100)], s);
    expect(r.find((b) => b.board.id === 'x')!.board.sheet).toEqual({ length: 1000, width: 1000 });
    expect(r.find((b) => b.board.id === 'carcass')!.result.sheets).toHaveLength(1);
  });

  it('grain of a board stops rotation; HDF has no grain', () => {
    const tall = part(2000, 2700); // fits only rotated
    expect(() => packBoards([on(tall, 'x')], { ...settings, boards: [board({ grain: true })] })).toThrow(RangeError);
    expect(packBoards([on(tall, 'x')], { ...settings, boards: [board({ grain: false })] })[0].result.sheets[0].placements[0].rotated).toBe(true);
    expect(packBoards([part(2000, 2700, 1, 'hdf')], settings)[0].result.sheets[0].placements[0].rotated).toBe(true);
  });

  it('the default boards take their grain from the settings', () => {
    const s = { ...settings, grain: { carcass: true, front: false } };
    expect(() => packBoards([part(2000, 2700, 1, 'carcass')], s)).toThrow(RangeError);
    expect(packBoards([part(2000, 2700, 1, 'front')], s)[0].result.sheets).toHaveLength(1);
  });

  it('HDF uses hdfSheet', () => {
    const s = { ...settings, hdfSheet: { length: 1000, width: 1000 } };
    expect(() => packBoards([part(1200, 100, 1, 'hdf')], s)).toThrow(RangeError);
  });
});
