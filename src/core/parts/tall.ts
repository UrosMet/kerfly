import type { Module, Part, Settings } from '../types';
import { doorParts } from './fronts';
import { wallParts } from './wall';

/**
 * Tall cabinet: wall carcass. With doorSplitH, two door levels (lower doorSplitH - gap,
 * upper H - doorSplitH - gap) plus a fixed shelf at the split.
 */
export function tallParts(m: Module, s: Settings): Part[] {
  const split = m.doorSplitH;
  if (!split) return wallParts(m, s);

  return [
    ...wallParts({ ...m, doors: 0 }, s),
    {
      moduleId: m.id,
      nameKey: 'part.fixedShelf',
      material: 'carcass',
      L: m.W - 2 * s.t,
      Wd: m.D,
      qty: 1,
      edges: { L1: 'thin', L2: 'none', W1: 'none', W2: 'none' },
    },
    ...doorParts(m.id, m.W, split, m.doors, s.gap),
    ...doorParts(m.id, m.W, m.H - split, m.doors, s.gap),
  ];
}
