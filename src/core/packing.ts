import type { MaterialKey, Part, Settings, SheetSize } from './types';

// Guillotine packing, one material at a time. Coordinates: x runs along the sheet length,
// y along its width. A piece occupies (size + kerf) in each direction; the usable area is
// grown by one kerf so the last piece on a row/column needs none.

export interface Placement {
  x: number; // sheet coordinates, trim included
  y: number;
  w: number; // size along sheet length (L, or Wd when rotated), kerf excluded
  h: number;
  rotated: boolean;
  partRef: number; // index into PackResult.parts
}
export interface PackedSheet {
  placements: Placement[];
  utilization: number; // % of the full sheet area covered by parts
}
export interface PackResult {
  parts: Part[];
  sheets: PackedSheet[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Piece {
  ref: number;
  L: number;
  Wd: number;
}
interface OpenSheet {
  free: Rect[];
  placements: Placement[];
}

const EPS = 1e-9;
type Score = [number, number];

const SORTS: Record<string, (a: Piece, b: Piece) => number> = {
  area: (a, b) => b.L * b.Wd - a.L * a.Wd,
  longSide: (a, b) => Math.max(b.L, b.Wd) - Math.max(a.L, a.Wd),
  length: (a, b) => b.L - a.L,
};
const FITS: Record<string, (r: Rect, pw: number, ph: number) => Score> = {
  // Best Short Side Fit
  bssf: (r, pw, ph) => [Math.min(r.w - pw, r.h - ph), Math.max(r.w - pw, r.h - ph)],
  // Best Area Fit
  baf: (r, pw, ph) => [r.w * r.h - pw * ph, Math.min(r.w - pw, r.h - ph)],
};
// true = split horizontally (right rect limited to piece height, top rect full width)
const SPLITS: Record<string, (leftW: number, leftH: number) => boolean> = {
  slas: (w, h) => w <= h, // Shorter Leftover Axis
  llas: (w, h) => w > h, // Longer Leftover Axis
};

const usableOf = (sheet: SheetSize, s: Settings) => ({
  w: sheet.length - 2 * s.trim + s.kerf,
  h: sheet.width - 2 * s.trim + s.kerf,
});

/** Does the part fit an empty sheet (rotation only if allowed)? Used by validation too. */
export function fitsSheet(p: Pick<Part, 'L' | 'Wd'>, sheet: SheetSize, s: Settings, rotate: boolean): boolean {
  const u = usableOf(sheet, s);
  const ok = (a: number, b: number) => a + s.kerf <= u.w + EPS && b + s.kerf <= u.h + EPS;
  return ok(p.L, p.Wd) || (rotate && ok(p.Wd, p.L));
}

function packOnce(
  pieces: Piece[],
  sheet: SheetSize,
  s: Settings,
  rotate: boolean,
  sort: string,
  fit: string,
  split: string,
): OpenSheet[] {
  const u = usableOf(sheet, s);
  const sheets: OpenSheet[] = [];

  for (const p of [...pieces].sort(SORTS[sort])) {
    type Best = { score: Score; sheet: OpenSheet; ri: number; rotated: boolean };
    let best: Best | undefined;
    const search = (sh: OpenSheet) => {
      sh.free.forEach((r, ri) => {
        for (const rotated of rotate ? [false, true] : [false]) {
          const pw = (rotated ? p.Wd : p.L) + s.kerf;
          const ph = (rotated ? p.L : p.Wd) + s.kerf;
          if (pw > r.w + EPS || ph > r.h + EPS) continue;
          const score = FITS[fit](r, pw, ph);
          if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && score[1] < best.score[1])) {
            best = { score, sheet: sh, ri, rotated };
          }
        }
      });
    };
    sheets.forEach(search);
    if (!best) {
      sheets.push({ free: [{ x: 0, y: 0, w: u.w, h: u.h }], placements: [] });
      search(sheets[sheets.length - 1]); // fitsSheet was checked, so this always finds a spot
    }
    const { sheet: sh, ri, rotated } = best as Best;
    const r = sh.free[ri];
    const pw = (rotated ? p.Wd : p.L) + s.kerf;
    const ph = (rotated ? p.L : p.Wd) + s.kerf;
    sh.placements.push({ x: s.trim + r.x, y: s.trim + r.y, w: pw - s.kerf, h: ph - s.kerf, rotated, partRef: p.ref });

    const horizontal = SPLITS[split](r.w - pw, r.h - ph);
    const right = horizontal
      ? { x: r.x + pw, y: r.y, w: r.w - pw, h: ph }
      : { x: r.x + pw, y: r.y, w: r.w - pw, h: r.h };
    const top = horizontal
      ? { x: r.x, y: r.y + ph, w: r.w, h: r.h - ph }
      : { x: r.x, y: r.y + ph, w: pw, h: r.h - ph };
    sh.free.splice(ri, 1, ...[right, top].filter((f) => f.w > EPS && f.h > EPS));
  }
  return sheets;
}

const largestFree = (sh: OpenSheet | undefined) => Math.max(0, ...(sh?.free.map((f) => f.w * f.h) ?? []));

/**
 * Packs the parts of ONE material onto sheets, trying all 3 sorts x 2 fits x 2 splits and keeping
 * the best: fewest sheets, tie-break = largest single free rect on the last sheet.
 * Throws RangeError if a part does not fit an empty sheet.
 */
export function packMaterial(parts: Part[], sheet: SheetSize, s: Settings, rotate: boolean): PackResult {
  const pieces: Piece[] = [];
  parts.forEach((p, ref) => {
    if (!fitsSheet(p, sheet, s, rotate)) {
      throw new RangeError(`Part ${p.nameKey} (${p.L} x ${p.Wd}) does not fit the sheet ${sheet.length} x ${sheet.width}`);
    }
    for (let i = 0; i < p.qty; i++) pieces.push({ ref, L: p.L, Wd: p.Wd });
  });

  let best: OpenSheet[] | undefined;
  for (const sort of Object.keys(SORTS)) {
    for (const fit of Object.keys(FITS)) {
      for (const split of Object.keys(SPLITS)) {
        const r = packOnce(pieces, sheet, s, rotate, sort, fit, split);
        if (
          !best ||
          r.length < best.length ||
          (r.length === best.length && largestFree(r[r.length - 1]) > largestFree(best[best.length - 1]))
        ) {
          best = r;
        }
      }
    }
  }

  const sheetArea = sheet.length * sheet.width;
  return {
    parts,
    sheets: (best ?? []).map((sh) => ({
      placements: sh.placements,
      utilization: (sh.placements.reduce((a, p) => a + p.w * p.h, 0) / sheetArea) * 100,
    })),
  };
}

/** Packs every material separately: carcass and front on `sheet`, hdf on `hdfSheet`. HDF has no grain. */
export function packAll(parts: Part[], s: Settings): Record<MaterialKey, PackResult> {
  const run = (m: MaterialKey) =>
    packMaterial(
      parts.filter((p) => p.material === m),
      m === 'hdf' ? s.hdfSheet : s.sheet,
      s,
      m === 'hdf' ? true : !s.grain[m],
    );
  return { carcass: run('carcass'), front: run('front'), hdf: run('hdf') };
}
