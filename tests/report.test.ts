import { describe, expect, it } from 'vitest';
import { edgeMeters } from '../src/core/edging';
import { generateHardware } from '../src/core/hardware';
import { packBoards } from '../src/core/packing';
import { generateParts } from '../src/core/parts';
import { buildReport, cuttingListCsv, type CutRow } from '../src/core/report';
import type { Module, Settings } from '../src/core/types';
import { mod, settings } from './helpers';

const kitchen: Module[] = [
  ...Array.from({ length: 4 }, (_, i) => mod('base', { id: `base${i}`, order: i })),
  mod('sink', { id: 'sink', order: 4 }),
  mod('drawer', { id: 'drawer', order: 5 }),
  ...Array.from({ length: 5 }, (_, i) => mod('wall', { id: `wall${i}`, order: i })),
  mod('tall', { id: 'tall', order: 6 }),
];
const s: Settings = { ...settings, decor: { carcass: 'Hrast', front: 'Bela', hdf: '' }, worktopDecor: 'Beton' };

describe('buildReport', () => {
  const r = buildReport(kitchen, s);
  const parts = generateParts(kitchen, s);

  it('shopping list: sheets per board with decor, thickness, size and utilization', () => {
    const lines = r.shopping.sheets;
    expect(lines.map((l) => [l.boardId, l.name, l.count])).toEqual([['carcass', 'Hrast', 4], ['front', 'Bela', 2], ['hdf', '', 2]]);
    expect(lines.map((l) => l.thickness)).toEqual([18, 18, 3]);
    expect(lines.every((l) => l.sheet.length === 2800 && l.sheet.width === 2070)).toBe(true);
    expect(lines.map((l) => l.kinds)).toEqual([['carcass'], ['front'], ['hdf']]);
    const u = r.layouts[0].result.sheets.map((x) => x.utilization);
    expect(lines[0].utilization).toBeCloseTo(u.reduce((a, b) => a + b) / 4, 10);
  });

  it('edging, hardware and worktop come from the core functions', () => {
    expect(r.shopping.edging).toEqual(edgeMeters(parts, s));
    const { worktop, ...hw } = generateHardware(kitchen, s);
    expect(r.shopping.hardware).toEqual(hw);
    expect(r.shopping.worktop).toMatchObject({ ...worktop, decor: 'Beton', thickness: 38, length: 4100, depth: 600 });
    expect(r.shopping.worktop.pieces).toBe(1); // 3800 <= 4100, tall excluded
  });

  it('cutting list: one table per board, total qty equals the parts', () => {
    expect(r.cuttingList.map((t) => t.board.id)).toEqual(['carcass', 'front', 'hdf']);
    for (const t of r.cuttingList) {
      const expected = parts.filter((p) => (p.board ?? p.material) === t.board.id).reduce((a, p) => a + p.qty, 0);
      expect(t.rows.reduce((a, row) => a + row.qty, 0)).toBe(expected);
    }
  });

  it('cutting list merges identical parts across modules', () => {
    const sides = r.cuttingList[0].rows.filter((x) => x.nameKey === 'part.side' && x.L === 720 && x.Wd === 560);
    expect(sides).toHaveLength(1);
    expect(sides[0].qty).toBe(2 * 4 + 2 * 1 + 2 * 1); // 4 base + sink + drawer
  });

  it('layouts equal packBoards of the parts', () => {
    expect(r.layouts).toEqual(packBoards(parts, s));
  });

  it('grain flag follows the board; hdf never has grain', () => {
    const g = buildReport(kitchen, { ...s, grain: { carcass: true, front: false } });
    expect(g.cuttingList[0].rows.every((x) => x.grain)).toBe(true);
    expect(g.cuttingList[1].rows.some((x) => x.grain)).toBe(false);
    expect(g.cuttingList[2].rows.some((x) => x.grain)).toBe(false);
  });

  it('cut sizes use subtractEdge', () => {
    const b = buildReport([mod('base')], { ...s, subtractEdge: true, edgeThick: 2 });
    expect(b.cuttingList.find((t) => t.board.id === 'front')!.rows[0]).toMatchObject({ nameKey: 'part.door', L: 593, Wd: 713 });
  });

  it('carries warnings, throws on errors', () => {
    expect(buildReport([mod('base')], { ...s, wallLength: 2000 }).warnings.map((w) => w.code)).toContain('validation.rowShort');
    expect(() => buildReport([mod('base', { W: 100 })], s)).toThrow(/validation\.width/);
  });

  it('empty kitchen -> empty report', () => {
    const e = buildReport([], s);
    expect(e.shopping.sheets).toEqual([]);
    expect(e.cuttingList).toEqual([]);
    expect(e.layouts).toEqual([]);
  });

  it('a board with no parts is not in the report (wall without doors has no front)', () => {
    const w = buildReport([mod('wall', { doors: 0 })], s);
    expect(w.shopping.sheets.map((l) => l.boardId)).toEqual(['carcass', 'hdf']);
  });
});

describe('cuttingListCsv', () => {
  const row: CutRow = {
    nameKey: 'part.door',
    L: 597,
    Wd: 717,
    qty: 2,
    edges: { L1: 'thick', L2: 'thick', W1: 'thick', W2: 'none' },
    grain: true,
  };

  it('header + one line per row, keys by default', () => {
    expect(cuttingListCsv([row])).toBe(
      'csv.name,csv.length,csv.width,csv.qty,csv.L1,csv.L2,csv.W1,csv.W2,csv.grain\n' +
        'part.door,597,717,2,edge.thick,edge.thick,edge.thick,edge.none,csv.grainYes\n',
    );
  });

  it('translates through t and escapes commas and quotes', () => {
    const t = (k: string) => ({ 'part.door': 'Vrata, "front"', 'csv.grainNo': 'ne' })[k] ?? k;
    const csv = cuttingListCsv([{ ...row, grain: false }], t);
    expect(csv.split('\n')[1]).toBe('"Vrata, ""front""",597,717,2,edge.thick,edge.thick,edge.thick,edge.none,ne');
  });

  it('no rows -> header only', () => {
    expect(cuttingListCsv([])).toBe('csv.name,csv.length,csv.width,csv.qty,csv.L1,csv.L2,csv.W1,csv.W2,csv.grain\n');
  });

  it('works on a real report', () => {
    const rep = buildReport(kitchen, s);
    const csv = cuttingListCsv(rep.cuttingList[0].rows);
    expect(csv.trim().split('\n')).toHaveLength(1 + rep.cuttingList[0].rows.length);
  });
});
