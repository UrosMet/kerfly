import { describe, expect, it } from 'vitest';
import { edgeMeters } from '../src/core/edging';
import { generateHardware } from '../src/core/hardware';
import { packAll } from '../src/core/packing';
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
const s: Settings = { ...settings, decor: { carcass: 'Hrast', front: 'Bela' } };

describe('buildReport', () => {
  const r = buildReport(kitchen, s);
  const parts = generateParts(kitchen, s);

  it('shopping list: sheets per decor with utilization', () => {
    const { sheets } = r.shopping;
    expect([sheets.carcass.count, sheets.front.count, sheets.hdf.count]).toEqual([4, 2, 2]);
    expect(sheets.carcass.decor).toBe('Hrast');
    expect(sheets.front.decor).toBe('Bela');
    expect(sheets.hdf.decor).toBeUndefined();
    const u = r.layouts.carcass.sheets.map((x) => x.utilization);
    expect(sheets.carcass.utilization).toBeCloseTo(u.reduce((a, b) => a + b) / 4, 10);
  });

  it('edging, hardware and worktop come from the core functions', () => {
    expect(r.shopping.edging).toEqual(edgeMeters(parts, s));
    const { worktop, ...hw } = generateHardware(kitchen, s);
    expect(r.shopping.hardware).toEqual(hw);
    expect(r.shopping.worktop).toEqual(worktop);
    expect(r.shopping.worktop.pieces).toBe(1); // 4 x 600 + 800 + 600 = 3800 <= 4100, tall excluded
  });

  it('cutting list: total qty per material equals the parts', () => {
    for (const m of ['carcass', 'front', 'hdf'] as const) {
      const expected = parts.filter((p) => p.material === m).reduce((a, p) => a + p.qty, 0);
      expect(r.cuttingList[m].reduce((a, row) => a + row.qty, 0)).toBe(expected);
    }
  });

  it('cutting list merges identical parts across modules', () => {
    const sides = r.cuttingList.carcass.filter((x) => x.nameKey === 'part.side' && x.L === 720 && x.Wd === 560);
    expect(sides).toHaveLength(1);
    expect(sides[0].qty).toBe(2 * 4 + 2 * 1 + 2 * 1); // 4 base + sink + drawer
  });

  it('layouts equal packAll of the parts', () => {
    expect(r.layouts).toEqual(packAll(parts, s));
  });

  it('grain flag follows settings; hdf never has grain', () => {
    const g = buildReport(kitchen, { ...s, grain: { carcass: true, front: false } });
    expect(g.cuttingList.carcass.every((x) => x.grain)).toBe(true);
    expect(g.cuttingList.front.some((x) => x.grain)).toBe(false);
    expect(g.cuttingList.hdf.some((x) => x.grain)).toBe(false);
  });

  it('cut sizes use subtractEdge', () => {
    const b = buildReport([mod('base')], { ...s, subtractEdge: true, edgeThick: 2 });
    expect(b.cuttingList.front[0]).toMatchObject({ nameKey: 'part.door', L: 593, Wd: 713 });
  });

  it('carries warnings, throws on errors', () => {
    expect(buildReport([mod('base')], { ...s, wallLength: 2000 }).warnings.map((w) => w.code)).toContain('validation.rowShort');
    expect(() => buildReport([mod('base', { W: 100 })], s)).toThrow(/validation\.width/);
  });

  it('empty kitchen -> empty report', () => {
    const e = buildReport([], s);
    expect(e.shopping.sheets.carcass).toMatchObject({ count: 0, utilization: 0 });
    expect(e.cuttingList.carcass).toEqual([]);
  });
});

describe('cuttingListCsv', () => {
  const row: CutRow = {
    nameKey: 'part.door', L: 597, Wd: 717, qty: 2,
    edges: { L1: 'thick', L2: 'thick', W1: 'thick', W2: 'none' }, grain: true,
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
    const csv = cuttingListCsv(buildReport(kitchen, s).cuttingList.carcass);
    expect(csv.trim().split('\n')).toHaveLength(1 + buildReport(kitchen, s).cuttingList.carcass.length);
  });
});
