import type { Module, Part, Settings } from '../types';
import { baseParts } from './base';
import { ALL_THICK } from './fronts';

const SLIDE_LENGTHS = [250, 300, 350, 400, 450, 500, 550];
const SLIDE_CLEARANCE = 13; // per side, ball-bearing slides
const NONE = { L1: 'none', L2: 'none', W1: 'none', W2: 'none' } as const;
const TOP_THIN = { ...NONE, L1: 'thin' } as const; // L1 = top edge of the box

/** Largest standard slide length <= D - 10. Throws if the cabinet is too shallow for any slide. */
export function slideLength(D: number): number {
  const fit = SLIDE_LENGTHS.filter((l) => l <= D - 10);
  if (fit.length === 0) throw new RangeError(`No slide fits depth ${D}`);
  return fit[fit.length - 1];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Drawer cabinet: base carcass (no shelves, no doors) + one front and one wood box per drawer. */
export function drawerParts(m: Module, s: Settings): Part[] {
  const t = s.t;
  const Lv = slideLength(m.D);
  const bw = m.W - 2 * t - 2 * SLIDE_CLEARANCE;
  const mk = (nameKey: string, material: Part['material'], L: number, Wd: number, qty: number, edges: Part['edges']): Part => ({
    moduleId: m.id,
    nameKey,
    material,
    L,
    Wd,
    qty,
    edges,
  });

  const parts = baseParts({ ...m, doors: 0, shelves: 0 }, s);
  for (const h of m.drawers ?? []) {
    const bh = clamp(h - 40, 80, 200);
    parts.push(
      mk('part.drawerFront', 'front', m.W - s.gap, h, 1, { ...ALL_THICK }),
      mk('part.drawerSide', 'carcass', Lv, bh, 2, TOP_THIN),
      mk('part.drawerEnd', 'carcass', bw - 2 * t, bh, 2, TOP_THIN),
      mk('part.drawerBottom', 'hdf', bw, Lv, 1, NONE),
    );
  }
  return parts;
}
