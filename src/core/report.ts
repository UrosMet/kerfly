import { edgeMeters, type EdgeMeters } from './edging';
import { generateHardware, type Hardware } from './hardware';
import { packAll, type PackResult } from './packing';
import { generateParts } from './parts';
import type { EdgeType, MaterialKey, Module, Part, Settings } from './types';
import { validate, type Issue } from './validate';

export interface SheetLine {
  decor?: string; // carcass and front only
  count: number;
  utilization: number; // average % over the sheets
}
export interface CutRow {
  nameKey: string;
  L: number;
  Wd: number;
  qty: number;
  edges: Part['edges'];
  grain: boolean; // true = must not be rotated
}
export interface Report {
  shopping: {
    sheets: Record<MaterialKey, SheetLine>;
    edging: EdgeMeters;
    worktop: Hardware['worktop'];
    hardware: Omit<Hardware, 'worktop'>;
  };
  cuttingList: Record<MaterialKey, CutRow[]>;
  layouts: Record<MaterialKey, PackResult>; // placement.partRef indexes layouts[m].parts
  warnings: Issue[];
}

const MATERIALS: MaterialKey[] = ['carcass', 'front', 'hdf'];
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Throws if the project has validation errors. Sizes are cut sizes (subtractEdge applied). */
export function buildReport(modules: Module[], s: Settings): Report {
  const { errors, warnings } = validate(modules, s);
  if (errors.length) throw new Error(`Invalid project: ${errors.map((e) => e.code).join(', ')}`);

  const parts = generateParts(modules, s);
  const layouts = packAll(parts, s);
  const { worktop, ...hardware } = generateHardware(modules, s);

  const sheets = {} as Report['shopping']['sheets'];
  const cuttingList = {} as Report['cuttingList'];
  for (const m of MATERIALS) {
    const list = layouts[m].sheets;
    sheets[m] = {
      ...(m !== 'hdf' && { decor: s.decor[m] }),
      count: list.length,
      utilization: list.length ? list.reduce((a, sh) => a + sh.utilization, 0) / list.length : 0,
    };

    const rows = new Map<string, CutRow>();
    for (const p of layouts[m].parts) {
      const L = round2(p.L);
      const Wd = round2(p.Wd);
      const key = [p.nameKey, L, Wd, p.edges.L1, p.edges.L2, p.edges.W1, p.edges.W2].join('|');
      const row = rows.get(key);
      if (row) row.qty += p.qty;
      else rows.set(key, { nameKey: p.nameKey, L, Wd, qty: p.qty, edges: p.edges, grain: m !== 'hdf' && s.grain[m] });
    }
    cuttingList[m] = [...rows.values()];
  }

  return { shopping: { sheets, edging: edgeMeters(parts, s), worktop, hardware }, cuttingList, layouts, warnings };
}

const CSV_COLUMNS = ['name', 'length', 'width', 'qty', 'L1', 'L2', 'W1', 'W2', 'grain'];

const csvField = (v: string | number) => {
  const str = String(v);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/**
 * CSV of one material's cutting list: name, length, width, qty, edges L1 L2 W1 W2, grain.
 * `t` translates header keys ("csv.name"...), part names, edge types ("edge.thin") and the
 * grain flag ("csv.grainYes" / "csv.grainNo"); the default returns the keys.
 */
export function cuttingListCsv(rows: CutRow[], t: (key: string) => string = (k) => k): string {
  const edge = (e: EdgeType) => t(`edge.${e}`);
  const lines = [CSV_COLUMNS.map((c) => t(`csv.${c}`))].concat(
    rows.map((r) => [
      t(r.nameKey),
      String(r.L),
      String(r.Wd),
      String(r.qty),
      edge(r.edges.L1),
      edge(r.edges.L2),
      edge(r.edges.W1),
      edge(r.edges.W2),
      t(r.grain ? 'csv.grainYes' : 'csv.grainNo'),
    ]),
  );
  return lines.map((l) => l.map(csvField).join(',')).join('\n') + '\n';
}
