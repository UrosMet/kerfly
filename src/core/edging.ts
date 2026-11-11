import type { EdgeType, Part, Settings } from './types';

const thickness = (e: EdgeType, s: Settings): number => (e === 'thin' ? s.edgeThin : e === 'thick' ? s.edgeThick : 0);

/**
 * subtractEdge: banding thickness is taken off the cut size of each banded edge.
 * L1/L2 run along L, so they shrink Wd; W1/W2 run along Wd, so they shrink L.
 * Returns a new part; the input is not modified.
 */
export function applySubtractEdge(p: Part, s: Settings): Part {
  if (!s.subtractEdge) return p;
  const { L1, L2, W1, W2 } = p.edges;
  return {
    ...p,
    L: p.L - thickness(W1, s) - thickness(W2, s),
    Wd: p.Wd - thickness(L1, s) - thickness(L2, s),
  };
}

export type EdgeMeters = Record<'carcass' | 'front', Record<'thin' | 'thick', number>>;

/**
 * Banding to buy, in whole meters, per material and edge type:
 * ceil(sum((edge length + 30) * qty) * 1.10 / 1000). HDF is never banded.
 * Edge lengths are taken from the parts as given (cut size if subtractEdge was applied).
 */
export function edgeMeters(parts: Part[], s: Settings): EdgeMeters {
  const mm = { carcass: { thin: 0, thick: 0 }, front: { thin: 0, thick: 0 } };
  for (const p of parts) {
    if (p.material === 'hdf') continue;
    for (const [edge, len] of [[p.edges.L1, p.L], [p.edges.L2, p.L], [p.edges.W1, p.Wd], [p.edges.W2, p.Wd]] as const) {
      if (edge !== 'none') mm[p.material][edge] += (len + 30) * p.qty;
    }
  }
  // toFixed guards float noise such as 10000 * 1.1 = 11000.000000000002
  const m = (total: number) => Math.ceil(Number((total * 1.1 / 1000).toFixed(9)));
  return {
    carcass: { thin: m(mm.carcass.thin), thick: m(mm.carcass.thick) },
    front: { thin: m(mm.front.thin), thick: m(mm.front.thick) },
  };
}
