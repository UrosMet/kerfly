import type { Part } from '../types';

export const ALL_THICK = { L1: 'thick', L2: 'thick', W1: 'thick', W2: 'thick' } as const;

/**
 * Door formulas, shared by all module types:
 * width (W - k*gap) / k, height H - gap, thick edge on all 4 sides.
 * L = width, Wd = height (same convention as the reference case in CLAUDE.md).
 * Returns no parts for k = 0. For split tall doors pass the section height as H.
 */
export function doorParts(moduleId: string, W: number, H: number, k: number, gap: number): Part[] {
  if (k <= 0) return [];
  return [
    {
      moduleId,
      nameKey: 'part.door',
      material: 'front',
      L: (W - k * gap) / k,
      Wd: H - gap,
      qty: k,
      edges: { ...ALL_THICK },
    },
  ];
}
