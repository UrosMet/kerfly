import { edgeMeters, type EdgeLine } from './edging';
import { generateHardware, type Hardware } from './hardware';
import { packBoards, type BoardPack } from './packing';
import { generateParts } from './parts';
import type { Board, EdgeType, MaterialKey, Module, Part, Settings, SheetSize } from './types';
import { validate, type Issue } from './validate';

/** One line of the shopping list: the sheets to buy of one board. */
export interface SheetLine {
  boardId: string;
  name: string; // decor, may be empty
  color: string; // for the drawing, may be empty
  thickness: number;
  sheet: SheetSize;
  kinds: MaterialKey[]; // what is cut from it: carcass, front, hdf
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
/** The cutting list of one board. */
export interface CutTable {
  board: Board;
  kinds: MaterialKey[];
  rows: CutRow[];
}
export type WorktopLine = Hardware['worktop'] & {
  decor: string;
  thickness: number;
  length: number;
  depth: number;
};
export interface Report {
  shopping: {
    sheets: SheetLine[];
    edging: EdgeLine[];
    worktop: WorktopLine;
    hardware: Omit<Hardware, 'worktop'>;
  };
  cuttingList: CutTable[]; // same order as shopping.sheets and layouts
  layouts: BoardPack[]; // placement.partRef indexes layouts[i].result.parts
  warnings: Issue[];
}

const KIND_ORDER: MaterialKey[] = ['carcass', 'front', 'hdf'];
const round2 = (n: number) => Math.round(n * 100) / 100;
const kindsOf = (parts: Part[]) => KIND_ORDER.filter((k) => parts.some((p) => p.material === k));

/** Throws if the project has validation errors. Sizes are cut sizes (subtractEdge applied). */
export function buildReport(modules: Module[], s: Settings): Report {
  const { errors, warnings } = validate(modules, s);
  if (errors.length) throw new Error(`Invalid project: ${errors.map((e) => e.code).join(', ')}`);

  const parts = generateParts(modules, s);
  const layouts = packBoards(parts, s);
  const { worktop, ...hardware } = generateHardware(modules, s);

  const sheets: SheetLine[] = [];
  const cuttingList: CutTable[] = [];
  for (const { board, result } of layouts) {
    const kinds = kindsOf(result.parts);
    const n = result.sheets.length;
    sheets.push({
      boardId: board.id,
      name: board.name,
      color: board.color ?? '',
      thickness: board.thickness,
      sheet: board.sheet,
      kinds,
      count: n,
      utilization: n ? result.sheets.reduce((a, sh) => a + sh.utilization, 0) / n : 0,
    });

    const rows = new Map<string, CutRow>();
    for (const p of result.parts) {
      const L = round2(p.L);
      const Wd = round2(p.Wd);
      const key = [p.nameKey, L, Wd, p.edges.L1, p.edges.L2, p.edges.W1, p.edges.W2].join('|');
      const row = rows.get(key);
      if (row) row.qty += p.qty;
      else rows.set(key, { nameKey: p.nameKey, L, Wd, qty: p.qty, edges: p.edges, grain: board.grain });
    }
    cuttingList.push({ board, kinds, rows: [...rows.values()] });
  }

  return {
    shopping: {
      sheets,
      edging: edgeMeters(parts, s),
      worktop: { ...worktop, decor: s.worktopDecor, thickness: s.worktopT, length: s.worktopLength, depth: s.worktopDepth },
      hardware,
    },
    cuttingList,
    layouts,
    warnings,
  };
}

const CSV_COLUMNS = ['name', 'length', 'width', 'qty', 'L1', 'L2', 'W1', 'W2', 'grain'];

const csvField = (v: string | number) => {
  const str = String(v);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/**
 * CSV of one board's cutting list: name, length, width, qty, edges L1 L2 W1 W2, grain.
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
