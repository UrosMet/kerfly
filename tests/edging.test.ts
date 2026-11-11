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
  const thin = { L1: 'thin', L2: 'none', W1: 'none', W2: 'none' } as const;
  const base = { name: '', thickness: 18, sheet: { length: 2800, width: 2070 }, grain: false } as const;

  it('reference base cabinet (1 shelf, 1 door): one line for the carcass, one for the front', () => {
    // thin: sides (720+30)*2 + bottom 594 + front rail 594 + shelf 592 = 3280 -> *1.1 = 3608 mm -> 4 m
    // thick: door 2*(597+30) + 2*(717+30) = 2748 -> 3022.8 mm -> 4 m
    expect(edgeMeters(baseParts(mod('base'), settings), settings)).toEqual([
      { name: '', boardIds: ['carcass'], kinds: ['carcass'], thin: 4, thick: 0 },
      { name: '', boardIds: ['front'], kinds: ['front'], thin: 0, thick: 4 },
    ]);
  });

  it('no parts -> no lines', () => {
    expect(edgeMeters([], settings)).toEqual([]);
  });

  it('qty multiplies, and exactly 11.000 m is not rounded up to 12 (float guard)', () => {
    // (970+30)*10 = 10000 mm * 1.1 = 11000 mm
    expect(edgeMeters([part({ L: 970, qty: 10, edges: thin })], settings)[0].thin).toBe(11);
  });

  it('hdf is ignored, and a board without any banding has no line', () => {
    const r = edgeMeters([part({ material: 'hdf', edges: thin }), part({ material: 'front', edges: thin }), part({ material: 'carcass' })], settings);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kinds: ['front'], thin: 1, thick: 0 });
  });

  it('boards whose banding has the same name share a line, and lengths are added before rounding', () => {
    // 370 + 30 = 400 mm each: 440 mm alone (1 m each, 2 in all), 880 mm together (1 m)
    const st = { ...settings, edgeName: { carcass: 'ABS bela', front: ' abs BELA ' } };
    const r = edgeMeters([part({ L: 370, edges: thin }), part({ material: 'front', L: 370, edges: thin })], st);
    expect(r).toEqual([{ name: 'ABS bela', boardIds: ['carcass', 'front'], kinds: ['carcass', 'front'], thin: 1, thick: 0 }]);
  });

  it('without a banding name the decor names it, so the same decor is one line', () => {
    const st = { ...settings, decor: { carcass: 'Bela', front: 'bela', hdf: '' } };
    const r = edgeMeters([part({ edges: thin }), part({ material: 'front', edges: thin })], st);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Bela');
  });

  it('different banding stays apart, in the order of the boards', () => {
    const st = { ...settings, edgeName: { carcass: 'ABS hrast', front: 'ABS bela' } };
    const r = edgeMeters([part({ material: 'front', edges: thin }), part({ edges: thin })], st);
    expect(r.map((l) => l.name)).toEqual(['ABS hrast', 'ABS bela']);
  });

  it('a board of its own can have its own banding', () => {
    const st = { ...settings, boards: [{ ...base, id: 'x', name: 'Hrast', edge: { name: 'ABS hrast', thin: 1, thick: 2 } }] };
    const r = edgeMeters([part({ board: 'x', edges: thin }), part({ edges: thin })], st);
    expect(r.map((l) => [l.name, l.boardIds])).toEqual([['', ['carcass']], ['ABS hrast', ['x']]]);
  });

  it('subtractEdge takes off the thickness of the banding of the part\'s own board', () => {
    const all = { L1: 'thick', L2: 'thick', W1: 'thick', W2: 'thick' } as const;
    const st = { ...settings, subtractEdge: true, edgeThick: 2, boards: [{ ...base, id: 'x', edge: { name: '', thin: 1, thick: 3 } }] };
    const own = applySubtractEdge(part({ board: 'x', L: 600, Wd: 700, edges: all }), st);
    const def = applySubtractEdge(part({ L: 600, Wd: 700, edges: all }), st);
    expect([own.L, own.Wd]).toEqual([594, 694]); // 3 mm x 2
    expect([def.L, def.Wd]).toEqual([596, 696]); // the project's 2 mm x 2
  });

  it('a board without its own banding uses the project thicknesses', () => {
    const st = { ...settings, subtractEdge: true, edgeThin: 0.5, boards: [{ ...base, id: 'x' }] };
    expect(applySubtractEdge(part({ board: 'x', L: 600, Wd: 700, edges: thin }), st).Wd).toBe(699.5);
  });
});
