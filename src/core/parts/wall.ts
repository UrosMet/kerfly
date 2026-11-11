import type { Module, Part, Settings } from '../types';
import { doorParts } from './fronts';

const NONE = { L1: 'none', L2: 'none', W1: 'none', W2: 'none' } as const;
const FRONT_THIN = { ...NONE, L1: 'thin' } as const; // L1 = front edge

/** Wall cabinet: top and bottom between sides, HDF back overlay. Nominal sizes (no subtractEdge). */
export function wallParts(m: Module, s: Settings): Part[] {
  const { W, H, D, shelves } = m;
  const t = s.t;
  const mk = (nameKey: string, material: Part['material'], L: number, Wd: number, qty: number, edges: Part['edges']): Part => ({
    moduleId: m.id,
    nameKey,
    material,
    L,
    Wd,
    qty,
    edges,
  });

  const parts: Part[] = [
    mk('part.side', 'carcass', H, D, 2, FRONT_THIN),
    mk('part.bottomTop', 'carcass', W - 2 * t, D, 2, FRONT_THIN),
  ];
  if (shelves > 0) parts.push(mk('part.shelf', 'carcass', W - 2 * t - 2, D - 20, shelves, FRONT_THIN));
  parts.push(mk('part.back', 'hdf', W - 4, H - 4, 1, NONE));
  parts.push(...doorParts(m.id, W, H, m.doors, s.gap));
  return parts;
}
