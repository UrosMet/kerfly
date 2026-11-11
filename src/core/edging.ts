import { allBoards, boardEdge, boardOfPart } from './boards';
import type { EdgeSpec, EdgeType, MaterialKey, Part, Settings } from './types';

const thickness = (e: EdgeType, spec: EdgeSpec): number => (e === 'thin' ? spec.thin : e === 'thick' ? spec.thick : 0);

/**
 * subtractEdge: banding thickness is taken off the cut size of each banded edge, using the banding of
 * the part's own board. L1/L2 run along L, so they shrink Wd; W1/W2 run along Wd, so they shrink L.
 * Returns a new part; the input is not modified.
 */
export function applySubtractEdge(p: Part, s: Settings): Part {
  if (!s.subtractEdge) return p;
  const spec = boardEdge(s, boardOfPart(s, p));
  const { L1, L2, W1, W2 } = p.edges;
  return {
    ...p,
    L: p.L - thickness(W1, spec) - thickness(W2, spec),
    Wd: p.Wd - thickness(L1, spec) - thickness(L2, spec),
  };
}

/** Edge banding to buy: one line per kind of banding, in whole meters. */
export interface EdgeLine {
  name: string; // type and color of the banding; empty when it is only named after the carcass or the front
  boardIds: string[]; // boards that use it
  kinds: MaterialKey[]; // carcass and/or front parts it goes on
  thin: number;
  thick: number;
}

/**
 * Banding to buy, in whole meters per kind: ceil(sum((edge length + 30) * qty) * 1.10 / 1000).
 * Boards whose banding has the same name (or, without one, the same decor) share a line, so their
 * lengths are added before rounding. HDF is never banded. Edge lengths are taken from the parts as given
 * (cut size if subtractEdge was applied). Lines without any banding are left out.
 */
export function edgeMeters(parts: Part[], s: Settings): EdgeLine[] {
  const order = allBoards(s).map((b) => b.id);
  type Acc = { name: string; boardIds: Set<string>; kinds: Set<MaterialKey>; thin: number; thick: number };
  const groups = new Map<string, Acc>();

  for (const p of parts) {
    if (p.material === 'hdf') continue;
    const board = boardOfPart(s, p);
    const name = boardEdge(s, board).name.trim();
    const label = name || board.name.trim();
    const key = label ? `n:${label.toLowerCase()}` : `b:${board.id}`;
    const g = groups.get(key) ?? { name: label, boardIds: new Set(), kinds: new Set(), thin: 0, thick: 0 };
    g.boardIds.add(board.id);
    g.kinds.add(p.material);
    for (const [edge, len] of [[p.edges.L1, p.L], [p.edges.L2, p.L], [p.edges.W1, p.Wd], [p.edges.W2, p.Wd]] as const) {
      if (edge !== 'none') g[edge] += (len + 30) * p.qty;
    }
    groups.set(key, g);
  }

  // toFixed guards float noise such as 10000 * 1.1 = 11000.000000000002
  const m = (total: number) => Math.ceil(Number((total * 1.1 / 1000).toFixed(9)));
  const rank = (g: Acc) => Math.min(...[...g.boardIds].map((id) => order.indexOf(id)));
  return [...groups.values()]
    .filter((g) => g.thin > 0 || g.thick > 0)
    .sort((a, b) => rank(a) - rank(b))
    .map((g) => ({
      name: g.name,
      boardIds: [...g.boardIds],
      kinds: (['carcass', 'front'] as const).filter((k) => g.kinds.has(k)),
      thin: m(g.thin),
      thick: m(g.thick),
    }));
}
