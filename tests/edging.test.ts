import { describe, expect, it } from 'vitest';
import { applySubtractEdge, edgeMeters } from '../src/core/edging';
import { baseParts } from '../src/core/parts/base';
import { doorParts } from '../src/core/parts/fronts';
import { generateParts } from '../src/core/parts';
import type { Part } from '../src/core/types';
import { mod, settings } from './helpers';

const sub = { ...settings, edgeThick: 2, subtractEdge: true };
const part = (over: Partial<Part>): Part => ({
  moduleId: 'x', nameKey: 'part.x', material: 'carcass', L: 100, Wd: 100, qty: 1,
  edges: { L1: 'none', L2: 'none', W1: 'none', W2: 'none' }, ...over,
});

describe('applySubtractEdge', () => {
  const [door] = doorParts('m', 600, 720, 1, 3);

  it('door 597x717, 2 mm on all 4 sides -> 593x713', () => {
    expect(applySubtractEdge(door, sub)).toMatchObject({ L: 593, Wd: 713 });
  });

  it('off: unchanged', () => {
    expect(applySubtractEdge(door, { ...sub, subtractEdge: false })).toBe(door);
  });

  it('one thin edge: L1 shrinks Wd only', () => {
    const p = applySubtractEdge(part({ L: 720, Wd: 560, edges: { L1: 'thin', L2: 'none', W1: 'none', W2: 'none' } }), sub);
    expect(p.L).toBe(720);
    expect(p.Wd).toBeCloseTo(559.55, 10);
  });

  it('W1/W2 shrink L', () => {
    const p = applySubtractEdge(part({ edges: { L1: 'none', L2: 'none', W1: 'thick', W2: 'none' } }), sub);
    expect([p.L, p.Wd]).toEqual([98, 100]);
  });

  it('does not mutate the input', () => {
    applySubtractEdge(door, sub);
    expect([door.L, door.Wd]).toEqual([597, 717]);
  });

  it('generateParts applies it to the door', () => {
    const d = generateParts([mod('base')], sub).find((p) => p.nameKey === 'part.door')!;
    expect([d.L, d.Wd]).toEqual([593, 713]);
  });
});

describe('edgeMeters', () => {
  it('reference base cabinet (1 shelf, 1 door)', () => {
    // thin: sides (720+30)*2 + bottom 594 + front rail 594 + shelf 592 = 3280 -> *1.1 = 3608 mm -> 4 m
    // thick: door 2*(597+30) + 2*(717+30) = 2748 -> 3022.8 mm -> 4 m
    expect(edgeMeters(baseParts(mod('base'), settings), settings)).toEqual({
      carcass: { thin: 4, thick: 0 },
      front: { thin: 0, thick: 4 },
    });
  });

  it('no parts -> zeros', () => {
    expect(edgeMeters([], settings)).toEqual({ carcass: { thin: 0, thick: 0 }, front: { thin: 0, thick: 0 } });
  });

  it('qty multiplies, and exactly 11.000 m is not rounded up to 12 (float guard)', () => {
    // (970+30)*10 = 10000 mm * 1.1 = 11000 mm
    const p = part({ L: 970, qty: 10, edges: { L1: 'thin', L2: 'none', W1: 'none', W2: 'none' } });
    expect(edgeMeters([p], settings).carcass.thin).toBe(11);
  });

  it('hdf is ignored, front and carcass are separate', () => {
    const e = { L1: 'thin', L2: 'none', W1: 'none', W2: 'none' } as const;
    const r = edgeMeters([part({ material: 'hdf', edges: e }), part({ material: 'front', edges: e })], settings);
    expect(r.carcass.thin).toBe(0);
    expect(r.front.thin).toBe(1);
  });
});
